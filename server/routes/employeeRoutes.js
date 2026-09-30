import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole, hashPassword } from '../auth.js';
import { getBahrainDateString } from '../attendanceEngine.js';

const router = express.Router();

// GET /api/employees (Engineer/Supervisor only)
router.get('/', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const { search, site_id, supervisor_id, department, status } = req.query;
  let employees = db.get('employees');

  if (search) {
    const q = search.toLowerCase();
    employees = employees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.employee_id?.toLowerCase().includes(q) ||
        e.mobile?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q)
    );
  }

  if (site_id) {
    employees = employees.filter((e) => e.site_id === site_id);
  }

  if (supervisor_id) {
    employees = employees.filter((e) => e.supervisor_id === supervisor_id);
  }

  if (department) {
    employees = employees.filter((e) => e.department === department);
  }

  if (status) {
    employees = employees.filter((e) => e.status === status);
  }

  res.json(employees);
});

// GET /api/employees/supervisors-list (List all supervisors for assignment)
router.get('/supervisors-list', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const users = db.get('users');
  const supervisors = users
    .filter((u) => u.role === 'SUPERVISOR' || u.role === 'ENGINEER')
    .map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      phone: u.phone,
    }));
  res.json(supervisors);
});

// GET /api/employees/next-id (Get next suggested Employee ID)
router.get('/next-id', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const nextId = db.generateEmployeeId();
  res.json({ nextId });
});

// GET /api/employees/:id (Get single employee details with attendance summary)
router.get('/:id', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const employee = db.findById('employees', req.params.id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const user = db.findById('users', employee.user_id);
  const attendanceList = db.filter('attendance', (a) => a.employee_id === employee.employee_id);

  // Calculate current month metrics
  const today = getBahrainDateString();
  const currentMonth = today.substring(0, 7); // YYYY-MM
  const monthAttendance = attendanceList.filter((a) => a.attendance_date?.startsWith(currentMonth));

  const presentCount = monthAttendance.filter((a) => a.status === 'Present' || a.status === 'Present - Late').length;
  const lateCount = monthAttendance.filter((a) => a.status === 'Present - Late' || a.status === 'Late').length;
  const totalMinutes = monthAttendance.reduce((acc, a) => acc + (a.total_minutes || 0), 0);
  const totalHoursFormatted = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

  res.json({
    employee,
    user: user
      ? {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
        }
      : null,
    summary: {
      current_month: currentMonth,
      total_records: monthAttendance.length,
      present_count: presentCount,
      late_count: lateCount,
      total_minutes: totalMinutes,
      total_hours_formatted: totalHoursFormatted,
    },
    recent_attendance: attendanceList.slice(-15).reverse(),
  });
});

// POST /api/employees (Add new employee)
router.post('/', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const {
    full_name,
    mobile,
    email,
    username,
    password,
    role = 'LABOUR',
    department,
    designation,
    supervisor_id,
    site_id,
    joining_date,
    remarks,
    employee_id: requestedEmployeeId,
  } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Full Name is required.' });
  }

  // Security constraint: role must be LABOUR unless Engineer is explicitly creating a supervisor
  if (role !== 'LABOUR' && req.user.role !== 'ENGINEER') {
    return res.status(403).json({ error: 'Supervisors can only create Labour employee profiles.' });
  }

  // Determine Employee ID
  const employee_id = (requestedEmployeeId && requestedEmployeeId.trim()) || db.generateEmployeeId();

  // Check unique constraints
  const existingEmp = db.findOne('employees', (e) => e.employee_id === employee_id);
  if (existingEmp) {
    return res.status(400).json({ error: `Employee ID ${employee_id} is already in use.` });
  }

  const generatedUsername = (username && username.trim()) || employee_id.toLowerCase().replace(/[^a-z0-9]/g, '');
  const existingUser = db.findOne(
    'users',
    (u) =>
      (u.username && u.username.toLowerCase() === generatedUsername.toLowerCase()) ||
      (email && u.email && u.email.toLowerCase() === email.trim().toLowerCase())
  );
  if (existingUser) {
    return res.status(400).json({ error: `Username "${generatedUsername}" or email is already registered.` });
  }

  const validDepartment = department === 'Maintenance' ? 'Maintenance' : 'Project';

  let supervisor_name = 'Unassigned';
  if (supervisor_id) {
    const sup = db.findById('users', supervisor_id);
    if (sup) supervisor_name = sup.name;
  }

  const defaultPassword = password || 'labour123';
  const newUser = db.insert('users', {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: full_name.trim(),
    email: email ? email.trim().toLowerCase() : `${generatedUsername}@firex.com`,
    username: generatedUsername,
    password_hash: hashPassword(defaultPassword),
    phone: mobile || '',
    role: role || 'LABOUR',
    employee_id: employee_id,
    status: 'Active',
  });

  const newEmployee = db.insert('employees', {
    id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: newUser.id,
    employee_id: employee_id,
    full_name: full_name.trim(),
    mobile: mobile || '',
    email: email || `${generatedUsername}@firex.com`,
    department: validDepartment,
    designation: designation || (validDepartment === 'Maintenance' ? 'Maintenance Technician' : 'Project Site Worker'),
    supervisor_id: supervisor_id || null,
    supervisor_name: supervisor_name,
    site_id: null,
    site_name: 'Scheduled Daily',
    joining_date: joining_date || getBahrainDateString(),
    status: 'Active',
    remarks: remarks || '',
  });

  db.audit({
    employee_id: newEmployee.employee_id,
    action: 'EMPLOYEE_CREATED',
    new_value: { full_name, employee_id, department: validDepartment, role },
    reason: 'New employee onboarded',
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.status(201).json({
    message: 'Employee created successfully.',
    employee: newEmployee,
    userCredentials: {
      username: generatedUsername,
      employee_id: employee_id,
      temporaryPassword: defaultPassword,
    },
  });
});

// PUT /api/employees/:id (Update employee)
router.put('/:id', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const employee = db.findById('employees', req.params.id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const {
    full_name,
    mobile,
    email,
    department,
    designation,
    supervisor_id,
    site_id,
    custom_site_name,
    joining_date,
    remarks,
  } = req.body;

  let resolvedSiteId = employee.site_id;
  let site_name = employee.site_name;

  const typedSiteName = (custom_site_name || req.body.site_name || '').trim();
  if (typedSiteName) {
    const existingSite = db.findOne('sites', (s) => s.site_name.toLowerCase() === typedSiteName.toLowerCase());
    if (existingSite) {
      resolvedSiteId = existingSite.id;
      site_name = existingSite.site_name;
    } else {
      const newSite = db.insert('sites', {
        id: `site-${Date.now()}`,
        site_code: `SITE-${Date.now().toString().slice(-4)}`,
        site_name: typedSiteName,
        address: 'Bahrain',
        area: 'Bahrain',
        latitude: 26.2415,
        longitude: 50.5368,
        allowed_radius: 150,
        status: 'Active',
        remarks: 'Auto-created during employee update',
      });
      resolvedSiteId = newSite.id;
      site_name = newSite.site_name;
    }
  } else if (site_id !== undefined) {
    const site = site_id ? db.findById('sites', site_id) : null;
    resolvedSiteId = site ? site.id : null;
    site_name = site ? site.site_name : 'Unassigned';
  }

  let supervisor_name = employee.supervisor_name;
  if (supervisor_id !== undefined && supervisor_id !== employee.supervisor_id) {
    const sup = supervisor_id ? db.findById('users', supervisor_id) : null;
    supervisor_name = sup ? sup.name : 'Unassigned';
  }

  const { password, username } = req.body;
  const oldValues = { ...employee };

  let normalizedDepartment = employee.department;
  if (department !== undefined) {
    normalizedDepartment = department === 'Maintenance' ? 'Maintenance' : 'Project';
  }

  const updatedEmployee = db.update('employees', employee.id, {
    full_name: full_name !== undefined ? full_name.trim() : employee.full_name,
    mobile: mobile !== undefined ? mobile.trim() : employee.mobile,
    email: email !== undefined ? email.trim() : employee.email,
    department: normalizedDepartment,
    designation: designation !== undefined ? designation : employee.designation,
    supervisor_id: supervisor_id !== undefined ? supervisor_id : employee.supervisor_id,
    supervisor_name,
    site_id: site_id !== undefined ? site_id : employee.site_id,
    site_name,
    joining_date: joining_date !== undefined ? joining_date : employee.joining_date,
    remarks: remarks !== undefined ? remarks : employee.remarks,
  });

  // Sync user profile name/phone/email/password
  if (employee.user_id) {
    const userUpdates = {
      name: updatedEmployee.full_name,
      phone: updatedEmployee.mobile,
      email: updatedEmployee.email,
    };
    if (username && username.trim()) {
      userUpdates.username = username.trim().toLowerCase();
    }
    if (password && password.trim()) {
      userUpdates.password_hash = hashPassword(password.trim());
    }
    db.update('users', employee.user_id, userUpdates);
  }

  db.audit({
    employee_id: employee.employee_id,
    action: 'EMPLOYEE_UPDATED',
    old_value: oldValues,
    new_value: updatedEmployee,
    reason: 'Employee details and credentials updated by management',
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({
    message: 'Employee updated successfully.',
    employee: updatedEmployee,
  });
});

// DELETE /api/employees/:id (Delete individual employee)
router.delete('/:id', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const employee = db.findById('employees', req.params.id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  // Remove corresponding user account
  if (employee.user_id) {
    db.delete('users', employee.user_id);
  }

  // Remove employee attendance records and correction requests
  const attendances = db.get('attendance').filter((a) => a.employee_id !== employee.employee_id);
  db.set('attendance', attendances);

  const corrections = db.get('attendance_corrections').filter((c) => c.employee_id !== employee.employee_id);
  db.set('attendance_corrections', corrections);

  // Remove employee record
  db.delete('employees', employee.id);

  db.audit({
    employee_id: employee.employee_id,
    action: 'EMPLOYEE_DELETED',
    old_value: employee,
    reason: `Employee ${employee.full_name} (${employee.employee_id}) removed from system`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({ message: `Employee ${employee.full_name} deleted successfully.` });
});

// POST /api/employees/delete-all (Delete ALL Labour employees to start fresh)
router.post('/delete-all', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const allEmployees = db.get('employees');
  const count = allEmployees.length;

  // Keep only Engineer and Supervisor users
  const adminUsers = db.get('users').filter((u) => u.role === 'ENGINEER' || u.role === 'SUPERVISOR');
  db.set('users', adminUsers);

  // Clear employees
  db.set('employees', []);

  // Clear attendance records & corrections
  db.set('attendance', []);
  db.set('attendance_corrections', []);

  db.audit({
    employee_id: null,
    action: 'ALL_EMPLOYEES_PURGED',
    reason: `All ${count} labour employee records and past attendance wiped for fresh onboarding`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({
    message: `All ${count} employee records and attendance history have been cleared. Ready for fresh employee entry!`,
  });
});

// PATCH /api/employees/:id/status (Activate/Deactivate employee)
router.patch('/:id/status', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const { status } = req.body;
  if (!['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status must be either "Active" or "Inactive".' });
  }

  const employee = db.findById('employees', req.params.id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  db.update('employees', employee.id, { status });

  if (employee.user_id) {
    db.update('users', employee.user_id, { status });
  }

  db.audit({
    employee_id: employee.employee_id,
    action: status === 'Active' ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
    old_value: { status: employee.status },
    new_value: { status },
    reason: `Employee status changed to ${status}`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({
    message: `Employee ${status === 'Active' ? 'activated' : 'deactivated'} successfully.`,
    employee: { ...employee, status },
  });
});

export default router;
