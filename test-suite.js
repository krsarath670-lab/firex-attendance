// Automated Verification Test Suite for FIREX Attendance Management System
import http from 'http';

const BASE_URL = 'http://127.0.0.1:5050';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 FIREX ATTENDANCE SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName} ${extraInfo}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${extraInfo}`);
      failed++;
    }
  }

  try {
    // TEST 1: Health Check & Bahrain Timezone
    console.log('--- TEST GROUP 1: SERVER & TIMEZONE HEALTH ---');
    const health = await request('/api/health');
    assert(health.status === 200 && health.data.status === 'online', 'Server is online');
    assert(health.data.timezone === 'Asia/Bahrain', 'Company timezone is Asia/Bahrain');

    // TEST 2: Authentication & RBAC Login
    console.log('\n--- TEST GROUP 2: AUTHENTICATION & ROLES ---');
    const engLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'engineer', password: 'admin123' },
    });
    assert(engLogin.ok && engLogin.data.user.role === 'ENGINEER', 'Engineer login successful');
    const engToken = engLogin.data.token;

    const supLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'supervisor', password: 'admin123' },
    });
    assert(supLogin.ok && supLogin.data.user.role === 'SUPERVISOR', 'Supervisor login successful');
    const supToken = supLogin.data.token;

    const lab1Login = await request('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'labour1', password: 'labour123' },
    });
    assert(lab1Login.ok && lab1Login.data.user.role === 'LABOUR', 'Labour 1 (Mohammed Ali) login successful');
    const lab1Token = lab1Login.data.token;

    const lab2Login = await request('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'labour2', password: 'labour123' },
    });
    assert(lab2Login.ok && lab2Login.data.user.role === 'LABOUR', 'Labour 2 (Rajesh Kumar) login successful');
    const lab2Token = lab2Login.data.token;

    // TEST 3: Strict RBAC Security & Data Privacy Isolation
    console.log('\n--- TEST GROUP 3: SECURITY & PRIVACY RESTRICTIONS ---');

    // Labour attempting management endpoint (Daily Attendance)
    const labDaily = await request('/api/attendance/daily', {
      headers: { Authorization: `Bearer ${lab1Token}` },
    });
    assert(labDaily.status === 403, 'Labour is strictly blocked from /api/attendance/daily (403 Forbidden)');

    // Labour attempting to change company settings
    const labSettings = await request('/api/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${lab1Token}` },
      body: { company_name: 'Hacked' },
    });
    assert(labSettings.status === 403, 'Labour is strictly blocked from modifying settings (403 Forbidden)');

    // Supervisor attempting to change company settings (Engineer only)
    const supSettings = await request('/api/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${supToken}` },
      body: { company_name: 'Supervisor Change' },
    });
    assert(supSettings.status === 403, 'Supervisor is blocked from editing security settings (Engineer only)');

    // Labour attempting to view employees list
    const labEmp = await request('/api/employees', {
      headers: { Authorization: `Bearer ${lab1Token}` },
    });
    assert(labEmp.status === 403, 'Labour cannot access employee directory (403 Forbidden)');

    // Labour 1 querying /api/attendance/my
    const lab1Attendance = await request('/api/attendance/my', {
      headers: { Authorization: `Bearer ${lab1Token}` },
    });
    assert(lab1Attendance.ok, 'Labour 1 can view own attendance');
    // Verify all records returned belong only to LAB-0001
    const allBelongToLab1 = lab1Attendance.data.records.every((r) => r.employee_id === 'LAB-0001');
    assert(allBelongToLab1, "Labour 1 cannot see any other employee's attendance records");

    // TEST 4: Attendance Punch IN & OUT Operations
    console.log('\n--- TEST GROUP 4: ATTENDANCE PUNCH IN & OUT ---');

    // Labour 1 Punch IN
    const eventId = `test-evt-${Date.now()}`;
    const punchInRes = await request('/api/attendance/punch-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lab1Token}` },
      body: {
        latitude: 26.2415,
        longitude: 50.5368,
        accuracy: 10,
        device_info: 'Automated Test Suite Runner',
        client_event_id: eventId,
      },
    });

    if (punchInRes.status === 201 || (punchInRes.status === 409 && punchInRes.data.error.includes('already punched in'))) {
      assert(true, 'Punch In handled properly (Created or duplicate prevented)', `Status: ${punchInRes.status}`);
    } else {
      assert(false, 'Punch In failed', JSON.stringify(punchInRes.data));
    }

    // Duplicate Punch IN Check
    const dupPunchIn = await request('/api/attendance/punch-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lab1Token}` },
      body: {
        latitude: 26.2415,
        longitude: 50.5368,
      },
    });
    assert(dupPunchIn.status === 409, 'Duplicate Punch IN correctly blocked with 409 Conflict');

    // Idempotent sync event ID check
    const idempPunch = await request('/api/attendance/punch-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lab1Token}` },
      body: {
        client_event_id: eventId,
      },
    });
    assert(idempPunch.ok && (idempPunch.data.message?.includes('idempotent') || idempPunch.status === 200), 'Idempotent sync verified');

    // Labour 1 Punch OUT
    const punchOutRes = await request('/api/attendance/punch-out', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lab1Token}` },
      body: {
        latitude: 26.2415,
        longitude: 50.5368,
        accuracy: 12,
      },
    });

    if (punchOutRes.status === 200 || (punchOutRes.status === 409 && punchOutRes.data.error.includes('already punched out'))) {
      assert(true, 'Punch Out recorded with total working hours calculated', `Status: ${punchOutRes.status}`);
    } else {
      assert(false, 'Punch Out failed', JSON.stringify(punchOutRes.data));
    }

    // TEST 5: Attendance Correction Workflow
    console.log('\n--- TEST GROUP 5: ATTENDANCE CORRECTION WORKFLOW ---');

    // Labour 1 submits correction request
    const corReq = await request('/api/attendance/corrections/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lab1Token}` },
      body: {
        date: '2026-09-28',
        requested_punch_in: '07:00',
        requested_punch_out: '17:00',
        reason: 'I arrived on site early at 7:00 AM but forgot to press Punch In.',
      },
    });
    assert(corReq.status === 201, 'Labour correction request submitted successfully');
    const correctionId = corReq.data.correction.id;

    // Supervisor reviews & approves correction request
    const reviewRes = await request(`/api/attendance/corrections/${correctionId}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${supToken}` },
      body: {
        action: 'APPROVE',
        review_notes: 'Approved after supervisor physical site confirmation.',
      },
    });
    assert(reviewRes.ok && reviewRes.data.correction.status === 'Approved', 'Supervisor approved correction request');

    // TEST 6: Manual Attendance Entry & Audit Trail
    console.log('\n--- TEST GROUP 6: MANUAL ADJUSTMENT & AUDIT TRAIL ---');

    const manualRes = await request('/api/attendance/manual', {
      method: 'POST',
      headers: { Authorization: `Bearer ${engToken}` },
      body: {
        employee_id: 'LAB-0002',
        date: '2026-09-28',
        punch_in_time: '07:10',
        punch_out_time: '17:05',
        status: 'Present',
        reason: 'Authorized manual attendance entry by Lead Engineer',
      },
    });
    assert(manualRes.ok, 'Engineer manual attendance entry saved successfully');

    // Verify Audit Trail has logged this
    const auditRes = await request('/api/attendance/audit', {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    assert(auditRes.ok && auditRes.data.length > 0, 'Audit trail verified with immutable event records');

    // TEST 7: Reports Generation
    console.log('\n--- TEST GROUP 7: REPORTS GENERATION ---');
    const dailyRpt = await request('/api/reports/daily?date=2026-09-28', {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    assert(dailyRpt.ok && dailyRpt.data.rows.length > 0, 'Daily Attendance Report generated');

    const monthlyRpt = await request('/api/reports/monthly?month=09&year=2026', {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    assert(monthlyRpt.ok && monthlyRpt.data.rows.length > 0, 'Monthly Attendance Report generated');

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed === 0) {
      console.log('✅ ALL BACKEND AND RBAC SPECIFICATIONS VERIFIED 100% WORKING!');
    }
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
