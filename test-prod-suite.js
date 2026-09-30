// Automated Test Suite for FIREX Production Attendance System
const API_URL = 'http://127.0.0.1:5050';

async function runTests() {
  console.log('🧪 Starting FIREX Attendance Production Verification Tests...\n');
  let passCount = 0;
  let failCount = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passCount++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failCount++;
    }
  }

  // 1. Health check
  await test('Server Health Check', async () => {
    const res = await fetch(`${API_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'online') throw new Error('Status not online');
  });

  // 2. Engineer Login
  let engineerToken = '';
  await test('Admin / Engineer Authentication', async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'engineer', password: 'admin123' }),
    });
    if (!res.ok) throw new Error(`Login failed with status ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error('No token returned');
    engineerToken = data.token;
  });

  // 3. Supervisor Login
  let supervisorToken = '';
  await test('Supervisor Authentication', async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'supervisor', password: 'admin123' }),
    });
    if (!res.ok) throw new Error(`Supervisor login failed: ${res.status}`);
    const data = await res.json();
    supervisorToken = data.token;
  });

  // 4. Create Employee dynamically
  let testEmployeeId = '';
  let testUsername = 'test.labour';
  let testPassword = 'password123';
  await test('Admin Create Labour Employee with Password', async () => {
    const res = await fetch(`${API_URL}/api/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineerToken}`,
      },
      body: JSON.stringify({
        full_name: 'Test Labour Worker',
        mobile: '+973 3999 8888',
        username: testUsername,
        password: testPassword,
        department: 'Field Operations',
        designation: 'Safety Technician',
        custom_site_name: 'Project Bahrain Bay Tower',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create employee');
    }
    const data = await res.json();
    testEmployeeId = data.employee.employee_id;
  });

  // 5. Labour Login
  let labourToken = '';
  await test('Labour Employee Login with Custom Password', async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testUsername, password: testPassword }),
    });
    if (!res.ok) throw new Error(`Labour login failed: ${res.status}`);
    const data = await res.json();
    labourToken = data.token;
  });

  // 6. Today Status
  await test('Labour Today Status Endpoint', async () => {
    const res = await fetch(`${API_URL}/api/attendance/today-status`, {
      headers: { Authorization: `Bearer ${labourToken}` },
    });
    if (!res.ok) throw new Error(`Failed today-status: ${res.status}`);
    const data = await res.json();
    if (!data.today) throw new Error('No today date in response');
  });

  // 7. Check In
  await test('Labour Check-In with GPS Coordinates', async () => {
    const res = await fetch(`${API_URL}/api/attendance/punch-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${labourToken}`,
      },
      body: JSON.stringify({
        latitude: 26.2415,
        longitude: 50.5368,
        accuracy: 10,
        device_info: 'Node Test Client',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Check-in failed');
    }
    const data = await res.json();
    if (!data.punch_in_time) throw new Error('No punch_in_time in response');
  });

  // 8. Check Out
  await test('Labour Check-Out and Total Hours Calculation', async () => {
    const res = await fetch(`${API_URL}/api/attendance/punch-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${labourToken}`,
      },
      body: JSON.stringify({
        latitude: 26.2415,
        longitude: 50.5368,
        accuracy: 10,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Check-out failed');
    }
    const data = await res.json();
    if (!data.total_hours) throw new Error('No total_hours in response');
  });

  // 9. Leave Application Flow
  let leaveId = '';
  await test('Labour Apply Leave Request', async () => {
    const res = await fetch(`${API_URL}/api/leaves/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${labourToken}`,
      },
      body: JSON.stringify({
        leave_type: 'Annual Leave',
        start_date: '2026-11-01',
        end_date: '2026-11-05',
        reason: 'Automated test vacation leave request',
      }),
    });
    if (!res.ok) throw new Error(`Apply leave failed: ${res.status}`);
    const data = await res.json();
    if (!data.leave?.id) throw new Error('No leave ID created');
    leaveId = data.leave.id;
  });

  // 10. Management Leave Approval
  await test('Management Leave Review & Approval', async () => {
    const res = await fetch(`${API_URL}/api/leaves/${leaveId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineerToken}`,
      },
      body: JSON.stringify({ status: 'Approved' }),
    });
    if (!res.ok) throw new Error(`Approve leave failed: ${res.status}`);
    const data = await res.json();
    if (data.leave?.status !== 'Approved') throw new Error('Status not updated to Approved');
  });

  // 11. Backup Snapshot Creation
  await test('Database Instant Cloud Backup Snapshot', async () => {
    const res = await fetch(`${API_URL}/api/backup/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
    });
    if (!res.ok) throw new Error(`Backup creation failed: ${res.status}`);
    const data = await res.json();
    if (!data.backup?.filename) throw new Error('No backup filename returned');
  });

  // 12. Daily Attendance Dashboard
  await test('Daily Attendance Roster & Summary', async () => {
    const res = await fetch(`${API_URL}/api/attendance/daily`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    if (!res.ok) throw new Error(`Daily attendance fetch failed: ${res.status}`);
    const data = await res.json();
    if (!data.summary) throw new Error('No summary metrics returned');
  });

  // 13. Monthly Attendance Matrix
  await test('Monthly Attendance Matrix Calculation', async () => {
    const res = await fetch(`${API_URL}/api/attendance/monthly?year=2026&month=09`, {
      headers: { Authorization: `Bearer ${engineerToken}` },
    });
    if (!res.ok) throw new Error(`Monthly attendance fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.data)) throw new Error('No matrix data array returned');
  });

  // 14. Audit Trail Endpoint
  await test('Audit Trail Verification', async () => {
    const res = await fetch(`${API_URL}/api/attendance/audit`, {
      headers: { Authorization: `Bearer ${engineerToken}` },
    });
    if (!res.ok) throw new Error(`Audit log fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Audit logs empty');
  });

  console.log(`\n========================================`);
  console.log(`📊 Total Tests: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
  console.log(`========================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
