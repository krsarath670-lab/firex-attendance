const BASE_URL = 'http://localhost:5050';

async function runTests() {
  console.log('=== STARTING FIREX DAILY SCHEDULING & LOCATION TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  let engineerToken = '';
  let supervisorToken = '';
  let labourToken = '';
  let testEmpId = 'LAB-TEST-' + Date.now().toString().slice(-4);
  let testUsername = 'labtest' + Date.now().toString().slice(-4);
  let testPassword = 'pass' + Date.now().toString().slice(-4);

  // 1. Health check
  await test('Health check endpoint returns status online', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (data.status !== 'online') throw new Error('Status is not online');
  });

  // 2. Engineer login
  await test('Engineer login succeeds with default credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'engineer', password: 'admin123' }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || 'Login failed');
    engineerToken = data.token;
  });

  // 3. Supervisor login
  await test('Supervisor login succeeds with default credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'supervisor', password: 'admin123' }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || 'Login failed');
    supervisorToken = data.token;
  });

  // 4. Create Labour employee with Department 'Project'
  await test('Add Labour employee with Project department (no static site required)', async () => {
    const res = await fetch(`${BASE_URL}/api/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineerToken}`,
      },
      body: JSON.stringify({
        employee_id: testEmpId,
        full_name: 'Test Project Worker',
        username: testUsername,
        password: testPassword,
        department: 'Project',
        designation: 'Piping Assistant',
        mobile: '+973 3999 1122',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create employee');
    if (data.employee.department !== 'Project') throw new Error('Department mismatch');
  });

  // 5. Supervisor schedules next day's site for the worker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().substring(0, 10);

  await test('Supervisor schedules site for tomorrow evening workflow', async () => {
    const res = await fetch(`${BASE_URL}/api/schedule/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        date: tomorrowStr,
        employee_id: testEmpId,
        site_name: 'Al Seef Commercial Tower - Block 428',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to assign site');
  });

  // 6. Schedule today's site for immediate punch test
  const today = new Date();
  const todayStr = today.toISOString().substring(0, 10);

  await test('Bulk assign site for today to test worker', async () => {
    const res = await fetch(`${BASE_URL}/api/schedule/bulk-assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineerToken}`,
      },
      body: JSON.stringify({
        date: todayStr,
        employee_ids: [testEmpId],
        site_name: 'BAPCO Modernization Site',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Bulk assign failed');
  });

  // 7. Labour login
  await test('Labour login with credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testUsername, password: testPassword }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || 'Labour login failed');
    labourToken = data.token;
  });

  // 8. Labour today-status returns scheduled site
  await test('Labour today-status returns today scheduled site', async () => {
    const res = await fetch(`${BASE_URL}/api/attendance/today-status`, {
      headers: { Authorization: `Bearer ${labourToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to get status');
    if (data.scheduled_site_name !== 'BAPCO Modernization Site') {
      throw new Error(`Expected scheduled site "BAPCO Modernization Site", got "${data.scheduled_site_name}"`);
    }
  });

  // 9. Labour Punch In with GPS coordinates
  await test('Labour Punch In captures GPS coordinates and scheduled site', async () => {
    const res = await fetch(`${BASE_URL}/api/attendance/punch-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${labourToken}`,
      },
      body: JSON.stringify({
        latitude: 26.2415,
        longitude: 50.5368,
        accuracy: 12.5,
        device_info: 'Chrome Mobile / Android 14',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Punch in failed');
    if (data.attendance.site_name !== 'BAPCO Modernization Site') {
      throw new Error('Recorded site does not match scheduled site');
    }
    if (data.attendance.punch_in_latitude !== 26.2415) {
      throw new Error('GPS latitude not recorded');
    }
  });

  // 10. Labour Punch Out with GPS coordinates
  await test('Labour Punch Out captures GPS coordinates and records shift hours', async () => {
    const res = await fetch(`${BASE_URL}/api/attendance/punch-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${labourToken}`,
      },
      body: JSON.stringify({
        latitude: 26.2416,
        longitude: 50.5369,
        accuracy: 10.0,
        device_info: 'Chrome Mobile / Android 14',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Punch out failed');
    if (data.attendance.punch_out_latitude !== 26.2416) {
      throw new Error('GPS punch out latitude not recorded');
    }
  });

  // 11. Engineer & Supervisor view Daily Attendance with GPS Location
  await test('Engineer queries daily attendance and sees GPS coordinates for punch in and out', async () => {
    const res = await fetch(`${BASE_URL}/api/attendance/daily?date=${todayStr}`, {
      headers: { Authorization: `Bearer ${engineerToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to fetch daily attendance');
    const workerRecord = data.records.find((r) => r.employee_id === testEmpId);
    if (!workerRecord) throw new Error('Worker record not found in daily attendance');
    if (!workerRecord.punch_in_latitude || !workerRecord.punch_out_latitude) {
      throw new Error('GPS coordinates missing from daily attendance response');
    }
    console.log(`   📍 Punch In GPS: ${workerRecord.punch_in_latitude}, ${workerRecord.punch_in_longitude}`);
    console.log(`   📍 Punch Out GPS: ${workerRecord.punch_out_latitude}, ${workerRecord.punch_out_longitude}`);
  });

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests();
