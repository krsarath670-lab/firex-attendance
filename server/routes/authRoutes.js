import express from 'express';
import db from '../db.js';
import { signToken, comparePassword, hashPassword, requireAuth, requireRole } from '../auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please provide username/email/phone and password.' });
  }

  const rawId = String(identifier).trim();
  const lowerId = rawId.toLowerCase();
  const alphaNumId = lowerId.replace(/[^a-z0-9]/g, '');
  const digitsOnly = lowerId.replace(/[^0-9]/g, '');

  const users = db.get('users');
  let user = users.find((u) => {
    if (!u) return false;
    const uEmail = u.email ? u.email.trim().toLowerCase() : '';
    const uUsername = u.username ? u.username.trim().toLowerCase() : '';
    const uEmpId = u.employee_id ? u.employee_id.trim().toLowerCase() : '';
    const uName = u.name ? u.name.trim().toLowerCase() : '';
    const uPhone = u.phone ? u.phone.replace(/[^0-9]/g, '') : '';

    // Direct string matches
    if (uUsername && (uUsername === lowerId || uUsername.replace(/[^a-z0-9]/g, '') === alphaNumId)) return true;
    if (uEmpId && (uEmpId === lowerId || uEmpId.replace(/[^a-z0-9]/g, '') === alphaNumId)) return true;
    if (uEmail && uEmail === lowerId) return true;
    if (uName && (uName === lowerId || uName.replace(/[^a-z0-9]/g, '') === alphaNumId)) return true;

    // Phone number matches (e.g. 39027232 or +973 3902 7232)
    if (digitsOnly.length >= 6 && uPhone) {
      if (uPhone === digitsOnly || uPhone.endsWith(digitsOnly) || digitsOnly.endsWith(uPhone)) return true;
    }

    return false;
  });

  // If not found in users, check if an employee record matches
  if (!user) {
    const employees = db.get('employees');
    const emp = employees.find((e) => {
      if (!e) return false;
      const eEmpId = e.employee_id ? e.employee_id.trim().toLowerCase() : '';
      const eName = e.full_name ? e.full_name.trim().toLowerCase() : '';
      const eEmail = e.email ? e.email.trim().toLowerCase() : '';
      const eMobile = e.mobile ? e.mobile.replace(/[^0-9]/g, '') : '';

      if (eEmpId && (eEmpId === lowerId || eEmpId.replace(/[^a-z0-9]/g, '') === alphaNumId)) return true;
      if (eName && (eName === lowerId || eName.replace(/[^a-z0-9]/g, '') === alphaNumId)) return true;
      if (eEmail && eEmail === lowerId) return true;
      if (digitsOnly.length >= 6 && eMobile) {
        if (eMobile === digitsOnly || eMobile.endsWith(digitsOnly) || digitsOnly.endsWith(eMobile)) return true;
      }
      return false;
    });

    if (emp) {
      if (emp.user_id) {
        user = db.findById('users', emp.user_id);
      }
      if (!user) {
        user = users.find((u) => u.employee_id === emp.employee_id);
      }
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid username, employee ID, or password.' });
  }

  if (user.status === 'Inactive') {
    return res.status(403).json({ error: 'Your account is currently inactive. Please contact management.' });
  }

  const isMatch = comparePassword(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username, employee ID, or password.' });
  }

  const token = signToken(user);

  // Return safe user object (without password_hash)
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    employee_id: user.employee_id,
    status: user.status,
  };

  res.json({
    message: 'Login successful',
    token,
    user: safeUser,
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.findById('users', req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    employee_id: user.employee_id,
    status: user.status,
  };

  // If Labour, also attach employee profile
  let employeeProfile = null;
  if (user.role === 'LABOUR' && user.employee_id) {
    employeeProfile = db.findOne('employees', (e) => e.employee_id === user.employee_id);
  }

  res.json({
    user: safeUser,
    employee: employeeProfile,
  });
});

// POST /api/auth/change-password (Self password change)
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const user = db.findById('users', req.user.id);
  if (!comparePassword(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  db.update('users', user.id, {
    password_hash: hashPassword(newPassword),
  });

  res.json({ message: 'Password changed successfully.' });
});

// POST /api/auth/admin-reset-password (Engineer/Supervisor resets employee password)
router.post('/admin-reset-password', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const { userId, employeeId, newPassword } = req.body;
  if ((!userId && !employeeId) || !newPassword || !newPassword.trim()) {
    return res.status(400).json({ error: 'User/Employee ID and new password are required.' });
  }

  if (newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  let targetUser = null;
  if (userId) {
    targetUser = db.findById('users', userId);
  }
  if (!targetUser && employeeId) {
    targetUser = db.findOne('users', (u) => u.employee_id === employeeId || u.id === employeeId);
  }
  if (!targetUser && employeeId) {
    const emp = db.findOne('employees', (e) => e.employee_id === employeeId || e.id === employeeId);
    if (emp && emp.user_id) {
      targetUser = db.findById('users', emp.user_id);
    }
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // Supervisors cannot reset Engineer's password
  if (req.user.role === 'SUPERVISOR' && targetUser.role === 'ENGINEER') {
    return res.status(403).json({ error: 'Supervisors cannot reset Engineer passwords.' });
  }

  db.update('users', targetUser.id, {
    password_hash: hashPassword(newPassword.trim()),
  });

  db.audit({
    employee_id: targetUser.employee_id || null,
    action: 'ADMIN_PASSWORD_RESET',
    new_value: { username: targetUser.username, name: targetUser.name },
    reason: `Password reset by ${req.user.name} (${req.user.role})`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({ message: `Password reset successfully for ${targetUser.name || targetUser.username}.` });
});

// GET /api/auth/engineers-supervisors (List all Engineer & Supervisor users)
router.get('/engineers-supervisors', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const users = db.get('users');
  const list = users
    .filter((u) => u.role === 'ENGINEER' || u.role === 'SUPERVISOR')
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      phone: u.phone,
      role: u.role,
      employee_id: u.employee_id,
      status: u.status,
      created_at: u.created_at,
    }));
  res.json(list);
});

// POST /api/auth/create-engineer-supervisor (Full access for Engineer and Supervisor)
router.post('/create-engineer-supervisor', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const { name, email, username, phone, password, role = 'SUPERVISOR' } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (!['ENGINEER', 'SUPERVISOR'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either ENGINEER or SUPERVISOR.' });
  }

  const generatedUsername = (username && username.trim().toLowerCase()) || name.trim().toLowerCase().replace(/\s+/g, '.');

  const existingUser = db.findOne(
    'users',
    (u) =>
      (u.username && u.username.toLowerCase() === generatedUsername) ||
      (email && u.email && u.email.toLowerCase() === email.trim().toLowerCase())
  );
  if (existingUser) {
    return res.status(400).json({ error: `Username "${generatedUsername}" or email is already registered.` });
  }

  const countRole = db.filter('users', (u) => u.role === role).length;
  const empId = role === 'ENGINEER' ? `ENG-${String(countRole + 1).padStart(4, '0')}` : `SUP-${String(countRole + 1).padStart(4, '0')}`;

  const newUser = db.insert('users', {
    id: `usr-${role.toLowerCase().slice(0, 3)}-${Date.now()}`,
    name: name.trim(),
    email: email ? email.trim().toLowerCase() : `${generatedUsername}@firex.com`,
    username: generatedUsername,
    password_hash: hashPassword(password),
    phone: phone || '',
    role,
    employee_id: empId,
    status: 'Active',
  });

  db.audit({
    employee_id: null,
    action: `${role}_USER_CREATED`,
    new_value: { name: newUser.name, username: newUser.username, role },
    reason: `New ${role} user account created by ${req.user.name}`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.status(201).json({
    message: `${role} account created successfully!`,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      employee_id: newUser.employee_id,
    },
  });
});

// PUT /api/auth/update-user/:id (Update Engineer/Supervisor name, email, phone, password)
router.put('/update-user/:id', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const targetUser = db.findById('users', req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { name, email, username, phone, password, role } = req.body;
  const updates = {};

  if (name && name.trim()) updates.name = name.trim();
  if (email && email.trim()) updates.email = email.trim().toLowerCase();
  if (username && username.trim()) updates.username = username.trim().toLowerCase();
  if (phone !== undefined) updates.phone = phone.trim();
  if (password && password.trim()) {
    if (password.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    updates.password_hash = hashPassword(password.trim());
  }
  if (role && ['ENGINEER', 'SUPERVISOR'].includes(role)) {
    updates.role = role;
  }

  const updatedUser = db.update('users', targetUser.id, updates);

  db.audit({
    employee_id: null,
    action: 'USER_UPDATED',
    old_value: { name: targetUser.name, username: targetUser.username, role: targetUser.role },
    new_value: { name: updatedUser.name, username: updatedUser.username, role: updatedUser.role },
    reason: `User account updated by ${req.user.name}`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({
    message: 'User updated successfully.',
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role,
      phone: updatedUser.phone,
    },
  });
});

// DELETE /api/auth/user/:id (Delete Engineer/Supervisor)
router.delete('/user/:id', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const targetUser = db.findById('users', req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUser.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own logged-in account.' });
  }

  db.delete('users', targetUser.id);

  db.audit({
    employee_id: null,
    action: 'USER_DELETED',
    old_value: { name: targetUser.name, username: targetUser.username, role: targetUser.role },
    reason: `User account deleted by ${req.user.name}`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({ message: `User ${targetUser.name} deleted successfully.` });
});

export default router;
