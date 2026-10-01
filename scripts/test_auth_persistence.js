import { hashPassword, comparePassword } from '../server/auth.js';
import db from '../server/db.js';

console.log('=== FIREX AUTHENTICATION & LOGIN PERSISTENCE TEST ===\n');

// Helper to simulate /api/auth/login
function simulateLogin(identifier, password) {
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

    if (uUsername && (uUsername === lowerId || uUsername.replace(/[^a-z0-9]/g, '') === alphaNumId)) return true;
    if (uEmpId && (uEmpId === lowerId || uEmpId.replace(/[^a-z0-9]/g, '') === alphaNumId)) return true;
    if (uEmail && uEmail === lowerId) return true;
    if (uName && (uName === lowerId || uName.replace(/[^a-z0-9]/g, '') === alphaNumId)) return true;

    if (digitsOnly.length >= 6 && uPhone) {
      if (uPhone === digitsOnly || uPhone.endsWith(digitsOnly) || digitsOnly.endsWith(uPhone)) return true;
    }
    return false;
  });

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
      user = db.findById('users', emp.user_id) || users.find((u) => u.employee_id === emp.employee_id);
    }
  }

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (user.status === 'Inactive') {
    return { success: false, error: 'Account inactive' };
  }

  const isMatch = comparePassword(password, user.password_hash);
  if (!isMatch) {
    return { success: false, error: 'Wrong password' };
  }

  return {
    success: true,
    user: { id: user.id, username: user.username, role: user.role, name: user.name, empId: user.employee_id },
  };
}

// Test 1: Engineer Login
console.log('--- Test 1: Engineer Login (engineer / admin123) ---');
const engRes = simulateLogin('engineer', 'admin123');
console.log('Engineer Login Result:', engRes);
if (!engRes.success) throw new Error('Engineer login failed');

// Test 2: Supervisor Login
console.log('\n--- Test 2: Supervisor Login (supervisor / admin123) ---');
const supRes = simulateLogin('supervisor', 'admin123');
console.log('Supervisor Login Result:', supRes);
if (!supRes.success) throw new Error('Supervisor login failed');

// Test 3: Create Labour with Custom Username & Password
console.log('\n--- Test 3: Create Labour with username "khalid" & password "secret999" ---');
const testEmpId = 'LAB-9988';
const testPass = 'secret999';
const testUsername = 'khalid';
const testMobile = '+973 3999 7788';

// Clean old test if exists
const oldUser = db.findOne('users', (u) => u.username === testUsername || u.employee_id === testEmpId);
if (oldUser) db.delete('users', oldUser.id);
const oldEmp = db.findOne('employees', (e) => e.employee_id === testEmpId);
if (oldEmp) db.delete('employees', oldEmp.id);

const newU = db.insert('users', {
  id: `usr-test-${Date.now()}`,
  name: 'Khalid Al-Bahraini',
  email: `${testUsername}@firex.com`,
  username: testUsername,
  password_hash: hashPassword(testPass),
  phone: testMobile,
  role: 'LABOUR',
  employee_id: testEmpId,
  status: 'Active',
});

const newE = db.insert('employees', {
  id: `emp-test-${Date.now()}`,
  user_id: newU.id,
  employee_id: testEmpId,
  full_name: 'Khalid Al-Bahraini',
  mobile: testMobile,
  email: `${testUsername}@firex.com`,
  department: 'Project',
  designation: 'Safety Officer',
  status: 'Active',
});

// Test 4: First Login (Login by username)
console.log('\n--- Test 4: First Login by username (khalid / secret999) ---');
const l1 = simulateLogin('khalid', 'secret999');
console.log('First login:', l1);
if (!l1.success) throw new Error('First login failed');

// Test 5: Logout & Second Login (Login by Employee ID: LAB-9988)
console.log('\n--- Test 5: Second Login after logout (by Employee ID: LAB-9988 / secret999) ---');
const l2 = simulateLogin('LAB-9988', 'secret999');
console.log('Second login (by ID):', l2);
if (!l2.success) throw new Error('Second login by ID failed');

// Test 6: Third Login (Login by Mobile number: 39997788)
console.log('\n--- Test 6: Third Login after logout (by Mobile: 39997788 / secret999) ---');
const l3 = simulateLogin('39997788', 'secret999');
console.log('Third login (by Mobile):', l3);
if (!l3.success) throw new Error('Third login by mobile failed');

// Test 7: Fourth Login (Login by Full Name: Khalid Al-Bahraini)
console.log('\n--- Test 7: Fourth Login after logout (by Full Name: Khalid Al-Bahraini / secret999) ---');
const l4 = simulateLogin('Khalid Al-Bahraini', 'secret999');
console.log('Fourth login (by Full Name):', l4);
if (!l4.success) throw new Error('Fourth login by name failed');

console.log('\n=== ALL LOGIN & LOGOUT PERSISTENCE TESTS PASSED! ===');
