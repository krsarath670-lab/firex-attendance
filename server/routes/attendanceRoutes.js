import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import {
  getBahrainDateString,
  formatBahrainTime,
  determineAttendanceStatus,
  calculateWorkingTime,
  calculateDistanceMeters,
} from '../attendanceEngine.js';

const router = express.Router();
const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR'];

// GET /api/attendance/today-status (Get today's punch state for current user)
router.get('/today-status', requireAuth, (req, res) => {
  const employeeId = req.user.employee_id;
  if (!employeeId) {
    return res.status(400).json({ error: 'No employee ID associated with this account.' });
  }

  const today = getBahrainDateString();
  const record = db.findOne(
    'attendance',
    (a) => a.employee_id === employeeId && a.attendance_date === today
  );

  const employee = db.findOne('employees', (e) => e.employee_id === employeeId);
  const settings = db.get('settings') || {};

  // Check if today is an approved leave
  const activeLeave = db.findOne(
    'leaves',
    (l) =>
      l.employee_id === employeeId &&
      l.status === 'Approved' &&
      today >= l.start_date &&
      today <= l.end_date
  );

  let punchState = 'NOT_PUNCHED_IN';
  if (record) {
    if (record.punch_in && !record.punch_out) {
      punchState = 'PUNCHED_IN';
    } else if (record.punch_in && record.punch_out) {
      punchState = 'PUNCHED_OUT';
    }
  }

  res.json({
    today,
    serverTime: new Date().toISOString(),
    punchState,
    record,
    employee,
    leave: activeLeave,
    settings: {
      work_start_time: settings.work_start_time,
      work_end_time: settings.work_end_time,
      grace_period_minutes: settings.grace_period_minutes,
      gps_enabled: settings.gps_enabled,
      gps_enforcement_enabled: settings.gps_enforcement_enabled,
      photo_verification_enabled: settings.photo_verification_enabled,
    },
  });
});

// Helper to evaluate device clock tamper
function evaluateClockTamper(clientTimestamp, serverTimestamp) {
  if (!clientTimestamp) return { isTampered: false, skewSeconds: 0 };
  const clientMs = new Date(clientTimestamp).getTime();
  const serverMs = new Date(serverTimestamp).getTime();
  const diffSeconds = Math.abs(Math.round((clientMs - serverMs) / 1000));
  // Flag as tampered if client device clock differs by more than 15 minutes (900 seconds)
  return {
    isTampered: diffSeconds > 900,
    skewSeconds: diffSeconds,
  };
}

// POST /api/attendance/punch-in (Labour punch-in)
router.post('/punch-in', requireAuth, (req, res) => {
  const employeeId = req.user.employee_id;
  if (!employeeId) {
    return res.status(400).json({ error: 'No employee ID associated with user.' });
  }

  const employee = db.findOne('employees', (e) => e.employee_id === employeeId);
  if (!employee || employee.status === 'Inactive') {
    return res.status(403).json({ error: 'Inactive employees cannot punch attendance.' });
  }

  const today = getBahrainDateString();
  const existing = db.findOne(
    'attendance',
    (a) => a.employee_id === employeeId && a.attendance_date === today
  );

  const {
    latitude,
    longitude,
    accuracy,
    device_info,
    client_event_id,
    client_timestamp,
    selfie_image,
  } = req.body;

  // Idempotent sync check: if client_event_id already processed, return existing
  if (client_event_id) {
    const byEvent = db.findOne('attendance', (a) => a.client_event_id === client_event_id);
    if (byEvent) {
      return res.json({
        message: 'Punch-in already recorded (idempotent)',
        attendance: byEvent,
      });
    }
  }

  // Duplicate punch in protection
  if (existing && existing.punch_in) {
    return res.status(409).json({
      error: 'You are already punched in today.',
      punch_in_time: existing.punch_in_display,
      attendance: existing,
    });
  }

  const settings = db.get('settings') || {};

  // GPS Geofence Verification if enforcement is active
  let siteDistance = null;
  if (settings.gps_enforcement_enabled && employee.site_id) {
    const site = db.findById('sites', employee.site_id);
    if (site && site.latitude && site.longitude) {
      if (!latitude || !longitude) {
        return res.status(400).json({
          error: 'GPS location is required for punch-in by company policy.',
        });
      }
      siteDistance = calculateDistanceMeters(latitude, longitude, site.latitude, site.longitude);
      const allowedRadius = site.allowed_radius || settings.default_radius || 100;
      if (siteDistance > allowedRadius) {
        return res.status(403).json({
          error: `Punch-in rejected: You are ${siteDistance}m away from ${site.site_name} (Allowed radius: ${allowedRadius}m).`,
          site_name: site.site_name,
          distance_meters: siteDistance,
          allowed_radius: allowedRadius,
        });
      }
    }
  } else if (latitude && longitude && employee.site_id) {
    const site = db.findById('sites', employee.site_id);
    if (site && site.latitude && site.longitude) {
      siteDistance = calculateDistanceMeters(latitude, longitude, site.latitude, site.longitude);
    }
  }

  const nowIso = new Date().toISOString();
  const punchInDisplay = formatBahrainTime(nowIso);
  const status = determineAttendanceStatus(nowIso, null, settings);
  const tamperCheck = evaluateClockTamper(client_timestamp, nowIso);

  const newAttendance = db.insert('attendance', {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    employee_id: employee.employee_id,
    user_id: req.user.id,
    employee_name: employee.full_name,
    site_id: employee.site_id || null,
    site_name: employee.site_name || 'Unassigned',
    supervisor_id: employee.supervisor_id || null,
    supervisor_name: employee.supervisor_name || 'Unassigned',
    attendance_date: today,
    punch_in: nowIso,
    punch_out: null,
    punch_in_display: punchInDisplay,
    punch_out_display: null,
    status: status,
    total_minutes: 0,
    total_hours_formatted: '0h 00m',
    punch_in_latitude: latitude || null,
    punch_in_longitude: longitude || null,
    punch_in_accuracy: accuracy || null,
    punch_in_distance_meters: siteDistance,
    punch_out_latitude: null,
    punch_out_longitude: null,
    punch_out_accuracy: null,
    punch_in_selfie: selfie_image || null,
    punch_out_selfie: null,
    device_info: device_info || 'Web Browser',
    client_event_id: client_event_id || null,
    client_timestamp: client_timestamp || nowIso,
    server_timestamp: nowIso,
    tamper_flag: tamperCheck.isTampered,
    clock_skew_seconds: tamperCheck.skewSeconds,
    sync_status: client_event_id ? 'OFFLINE_SYNCED' : 'SYNCED',
    is_manual: false,
  });

  db.audit({
    attendance_id: newAttendance.id,
    employee_id: employee.employee_id,
    action: tamperCheck.isTampered ? 'PUNCH_IN_TAMPER_FLAGGED' : 'PUNCH_IN',
    new_value: { punch_in: punchInDisplay, status, date: today, tamper: tamperCheck.isTampered },
    reason: tamperCheck.isTampered
      ? `Mobile punch in with clock skew (${tamperCheck.skewSeconds}s diff)`
      : 'Labour mobile punch in',
    changed_by: req.user.id,
    changed_by_name: `${req.user.name} (${req.user.role})`,
  });

  res.status(201).json({
    message: 'Punched in successfully!',
    punch_in_time: punchInDisplay,
    status: newAttendance.status,
    attendance: newAttendance,
  });
});

// POST /api/attendance/punch-out (Labour punch-out)
router.post('/punch-out', requireAuth, (req, res) => {
  const employeeId = req.user.employee_id;
  if (!employeeId) {
    return res.status(400).json({ error: 'No employee ID associated with user.' });
  }

  const today = getBahrainDateString();
  const existing = db.findOne(
    'attendance',
    (a) => a.employee_id === employeeId && a.attendance_date === today
  );

  if (!existing || !existing.punch_in) {
    return res.status(400).json({
      error: 'You cannot punch out because you have not punched in today.',
    });
  }

  if (existing.punch_out) {
    return res.status(409).json({
      error: 'You are already punched out today.',
      punch_out_time: existing.punch_out_display,
      attendance: existing,
    });
  }

  const {
    latitude,
    longitude,
    accuracy,
    device_info,
    client_event_id,
    client_timestamp,
    selfie_image,
  } = req.body;

  const nowIso = new Date().toISOString();
  const punchOutDisplay = formatBahrainTime(nowIso);
  const settings = db.get('settings') || {};

  const { total_minutes, total_hours_formatted } = calculateWorkingTime(existing.punch_in, nowIso);
  const finalStatus = determineAttendanceStatus(existing.punch_in, nowIso, settings);
  const tamperCheck = evaluateClockTamper(client_timestamp, nowIso);

  let siteDistance = null;
  if (latitude && longitude && existing.site_id) {
    const site = db.findById('sites', existing.site_id);
    if (site && site.latitude && site.longitude) {
      siteDistance = calculateDistanceMeters(latitude, longitude, site.latitude, site.longitude);
    }
  }

  const updatedAttendance = db.update('attendance', existing.id, {
    punch_out: nowIso,
    punch_out_display: punchOutDisplay,
    status: finalStatus,
    total_minutes,
    total_hours_formatted,
    punch_out_latitude: latitude || null,
    punch_out_longitude: longitude || null,
    punch_out_accuracy: accuracy || null,
    punch_out_distance_meters: siteDistance,
    punch_out_selfie: selfie_image || null,
    tamper_flag: existing.tamper_flag || tamperCheck.isTampered,
    sync_status: client_event_id ? 'OFFLINE_SYNCED' : 'SYNCED',
  });

  db.audit({
    attendance_id: updatedAttendance.id,
    employee_id: employeeId,
    action: 'PUNCH_OUT',
    old_value: { punch_out: null, status: existing.status },
    new_value: { punch_out: punchOutDisplay, total_hours: total_hours_formatted, status: finalStatus },
    reason: 'Labour mobile punch out',
    changed_by: req.user.id,
    changed_by_name: `${req.user.name} (${req.user.role})`,
  });

  res.json({
    message: 'Punched out successfully!',
    punch_out_time: punchOutDisplay,
    total_hours: total_hours_formatted,
    status: finalStatus,
    attendance: updatedAttendance,
  });
});

// POST /api/attendance/sync-batch (Batch synchronization for offline queues)
router.post('/sync-batch', requireAuth, (req, res) => {
  const { queue } = req.body;
  if (!Array.isArray(queue) || !queue.length) {
    return res.json({ synced: 0, failed: 0, results: [] });
  }

  const results = [];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const { actionType, payload, client_event_id } = item;
      const employeeId = req.user.employee_id;
      const today = payload?.attendance_date || getBahrainDateString();

      if (actionType === 'PUNCH_IN') {
        const existing = db.findOne('attendance', (a) => a.client_event_id === client_event_id || (a.employee_id === employeeId && a.attendance_date === today));
        if (existing) {
          results.push({ id: client_event_id, status: 'ALREADY_EXISTS', attendance_id: existing.id });
          synced++;
        } else {
          const emp = db.findOne('employees', (e) => e.employee_id === employeeId);
          const serverNow = new Date().toISOString();
          const pInDisplay = formatBahrainTime(serverNow);
          const status = determineAttendanceStatus(serverNow, null);

          const inserted = db.insert('attendance', {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            employee_id: employeeId,
            user_id: req.user.id,
            employee_name: emp ? emp.full_name : req.user.name,
            site_id: emp?.site_id || null,
            site_name: emp?.site_name || 'Unassigned',
            supervisor_id: emp?.supervisor_id || null,
            supervisor_name: emp?.supervisor_name || 'Unassigned',
            attendance_date: today,
            punch_in: payload.timestamp || serverNow,
            punch_out: null,
            punch_in_display: pInDisplay,
            punch_out_display: null,
            status: status,
            total_minutes: 0,
            total_hours_formatted: '0h 00m',
            punch_in_latitude: payload.latitude || null,
            punch_in_longitude: payload.longitude || null,
            punch_in_accuracy: payload.accuracy || null,
            client_event_id,
            client_timestamp: payload.timestamp || serverNow,
            server_timestamp: serverNow,
            sync_status: 'OFFLINE_SYNCED',
            is_manual: false,
          });
          results.push({ id: client_event_id, status: 'SYNCED', attendance_id: inserted.id });
          synced++;
        }
      } else if (actionType === 'PUNCH_OUT') {
        const existing = db.findOne('attendance', (a) => a.employee_id === employeeId && a.attendance_date === today);
        if (existing && !existing.punch_out) {
          const serverNow = new Date().toISOString();
          const pOutDisplay = formatBahrainTime(serverNow);
          const { total_minutes, total_hours_formatted } = calculateWorkingTime(existing.punch_in, serverNow);
          const finalStatus = determineAttendanceStatus(existing.punch_in, serverNow);

          db.update('attendance', existing.id, {
            punch_out: serverNow,
            punch_out_display: pOutDisplay,
            status: finalStatus,
            total_minutes,
            total_hours_formatted,
            punch_out_latitude: payload.latitude || null,
            punch_out_longitude: payload.longitude || null,
            sync_status: 'OFFLINE_SYNCED',
          });
          results.push({ id: client_event_id, status: 'SYNCED', attendance_id: existing.id });
          synced++;
        } else {
          results.push({ id: client_event_id, status: 'NO_PUNCH_IN_OR_ALREADY_OUT' });
          failed++;
        }
      }
    } catch (err) {
      console.error('Offline batch sync error:', err);
      results.push({ id: item.client_event_id, status: 'ERROR', error: err.message });
      failed++;
    }
  }

  res.json({ synced, failed, results });
});

// GET /api/attendance/my (Labour view own attendance only)
router.get('/my', requireAuth, (req, res) => {
  const employeeId = req.user.employee_id;
  if (!employeeId) {
    return res.status(400).json({ error: 'No employee ID associated with user.' });
  }

  const { filter, start_date, end_date } = req.query;
  let records = db.filter('attendance', (a) => a.employee_id === employeeId);

  const today = getBahrainDateString();
  const dToday = new Date(today);

  if (filter === 'week') {
    const d7 = new Date(dToday);
    d7.setDate(d7.getDate() - 7);
    const minDate = d7.toISOString().substring(0, 10);
    records = records.filter((r) => r.attendance_date >= minDate && r.attendance_date <= today);
  } else if (filter === 'month') {
    const currentMonth = today.substring(0, 7);
    records = records.filter((r) => r.attendance_date?.startsWith(currentMonth));
  } else if (start_date && end_date) {
    records = records.filter((r) => r.attendance_date >= start_date && r.attendance_date <= end_date);
  }

  records.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

  const totalMinutes = records.reduce((sum, r) => sum + (r.total_minutes || 0), 0);
  const presentDays = records.filter((r) => r.status === 'Present' || r.status === 'Present - Late').length;
  const lateDays = records.filter((r) => r.status === 'Present - Late' || r.status === 'Late').length;

  res.json({
    records,
    summary: {
      total_records: records.length,
      present_days: presentDays,
      late_days: lateDays,
      total_minutes: totalMinutes,
      total_hours_formatted: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
    },
  });
});

// GET /api/attendance/daily (Management daily attendance dashboard)
router.get('/daily', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const { date, site_id, supervisor_id, department, status, search } = req.query;
  const targetDate = date || getBahrainDateString();

  const allEmployees = db.filter('employees', (e) => e.status === 'Active');
  let filteredEmployees = [...allEmployees];

  if (site_id) {
    filteredEmployees = filteredEmployees.filter((e) => e.site_id === site_id);
  }
  if (supervisor_id) {
    filteredEmployees = filteredEmployees.filter((e) => e.supervisor_id === supervisor_id);
  }
  if (department) {
    filteredEmployees = filteredEmployees.filter((e) => e.department === department);
  }
  if (search) {
    const q = search.toLowerCase();
    filteredEmployees = filteredEmployees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.employee_id?.toLowerCase().includes(q) ||
        e.site_name?.toLowerCase().includes(q)
    );
  }

  const attendanceOnDate = db.filter('attendance', (a) => a.attendance_date === targetDate);
  const corrections = db.filter('attendance_corrections', (c) => c.status === 'Pending');
  const leavesOnDate = db.filter(
    'leaves',
    (l) => l.status === 'Approved' && targetDate >= l.start_date && targetDate <= l.end_date
  );

  // Build composite table with all active employees
  const records = filteredEmployees.map((emp) => {
    const att = attendanceOnDate.find((a) => a.employee_id === emp.employee_id);
    const leave = leavesOnDate.find((l) => l.employee_id === emp.employee_id);

    if (att) {
      return {
        ...att,
        employee_name: emp.full_name,
        department: emp.department,
        designation: emp.designation,
        site_name: att.site_name || emp.site_name,
        supervisor_name: att.supervisor_name || emp.supervisor_name,
      };
    } else if (leave) {
      return {
        id: `leave-${emp.employee_id}-${targetDate}`,
        employee_id: emp.employee_id,
        user_id: emp.user_id,
        employee_name: emp.full_name,
        department: emp.department,
        designation: emp.designation,
        site_id: emp.site_id,
        site_name: emp.site_name,
        supervisor_id: emp.supervisor_id,
        supervisor_name: emp.supervisor_name,
        attendance_date: targetDate,
        punch_in: null,
        punch_out: null,
        punch_in_display: '—',
        punch_out_display: '—',
        status: `Leave (${leave.leave_type})`,
        total_minutes: 0,
        total_hours_formatted: '0h 00m',
        is_leave: true,
        leave_reason: leave.reason,
      };
    } else {
      return {
        id: `absent-${emp.employee_id}-${targetDate}`,
        employee_id: emp.employee_id,
        user_id: emp.user_id,
        employee_name: emp.full_name,
        department: emp.department,
        designation: emp.designation,
        site_id: emp.site_id,
        site_name: emp.site_name,
        supervisor_id: emp.supervisor_id,
        supervisor_name: emp.supervisor_name,
        attendance_date: targetDate,
        punch_in: null,
        punch_out: null,
        punch_in_display: '—',
        punch_out_display: '—',
        status: 'Absent',
        total_minutes: 0,
        total_hours_formatted: '0h 00m',
        is_absent: true,
      };
    }
  });

  let finalRecords = records;
  if (status && status !== 'ALL') {
    finalRecords = records.filter((r) => r.status.toLowerCase().includes(status.toLowerCase()));
  }

  // Calculate summary cards
  const totalLabour = allEmployees.length;
  const presentCount = records.filter((r) => r.status === 'Present' || r.status.startsWith('Present -') || r.status === 'Corrected').length;
  const lateCount = records.filter((r) => r.status.includes('Late')).length;
  const absentCount = records.filter((r) => r.status === 'Absent').length;
  const currentlyWorking = records.filter((r) => r.punch_in && !r.punch_out).length;
  const checkedOut = records.filter((r) => r.punch_in && r.punch_out).length;
  const leaveCount = records.filter((r) => r.is_leave || r.status.startsWith('Leave')).length;

  res.json({
    date: targetDate,
    summary: {
      total_labour: totalLabour,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      currently_working: currentlyWorking,
      checked_out: checkedOut,
      leave_count: leaveCount,
      correction_requests: corrections.length,
    },
    records: finalRecords,
  });
});

// GET /api/attendance/monthly (Monthly Attendance Matrix)
router.get('/monthly', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const { month, year, employee_id, site_id, supervisor_id, department } = req.query;

  const now = new Date();
  const targetYear = year ? parseInt(year, 10) : now.getFullYear();
  const targetMonth = month ? String(month).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${targetYear}-${targetMonth}`;

  let employees = db.filter('employees', (e) => e.status === 'Active');

  if (employee_id && employee_id !== 'ALL') {
    employees = employees.filter((e) => e.employee_id === employee_id);
  }
  if (site_id && site_id !== 'ALL') {
    employees = employees.filter((e) => e.site_id === site_id);
  }
  if (supervisor_id && supervisor_id !== 'ALL') {
    employees = employees.filter((e) => e.supervisor_id === supervisor_id);
  }
  if (department && department !== 'ALL') {
    employees = employees.filter((e) => e.department === department);
  }

  const allMonthlyAttendance = db.filter('attendance', (a) => a.attendance_date?.startsWith(monthPrefix));
  const allCorrections = db.get('attendance_corrections') || [];
  const allLeaves = db.filter('leaves', (l) => l.status === 'Approved');

  const daysInMonth = new Date(targetYear, parseInt(targetMonth, 10), 0).getDate();

  const matrix = employees.map((emp) => {
    const empAtt = allMonthlyAttendance.filter((a) => a.employee_id === emp.employee_id);
    const empCorr = allCorrections.filter(
      (c) => c.employee_id === emp.employee_id && c.attendance_date?.startsWith(monthPrefix)
    );
    const empLeaves = allLeaves.filter(
      (l) => l.employee_id === emp.employee_id && (l.start_date.startsWith(monthPrefix) || l.end_date.startsWith(monthPrefix))
    );

    const presentDays = empAtt.filter((a) => a.punch_in && (a.status === 'Present' || a.status.startsWith('Present -') || a.status === 'Corrected')).length;
    const lateDays = empAtt.filter((a) => a.status.includes('Late')).length;
    const leaveDays = empLeaves.reduce((sum, l) => sum + (l.total_days || 0), 0);

    const totalMinutes = empAtt.reduce((sum, a) => sum + (a.total_minutes || 0), 0);
    const totalHoursFormatted = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
    const avgMinutesPerPresentDay = presentDays > 0 ? Math.round(totalMinutes / presentDays) : 0;
    const avgHoursFormatted = `${Math.floor(avgMinutesPerPresentDay / 60)}h ${avgMinutesPerPresentDay % 60}m`;

    const assumedWorkingDays = 26;
    const calculatedAbsent = Math.max(0, assumedWorkingDays - presentDays - leaveDays);

    return {
      employee_id: emp.employee_id,
      employee_name: emp.full_name,
      department: emp.department,
      designation: emp.designation,
      site_name: emp.site_name,
      supervisor_name: emp.supervisor_name,
      total_working_days: assumedWorkingDays,
      present_days: presentDays,
      late_days: lateDays,
      absent_days: calculatedAbsent,
      leave_days: leaveDays,
      total_hours_formatted: totalHoursFormatted,
      total_minutes: totalMinutes,
      avg_hours_formatted: avgHoursFormatted,
      correction_count: empCorr.length,
      records: empAtt,
    };
  });

  res.json({
    month: targetMonth,
    year: targetYear,
    days_in_month: daysInMonth,
    summary: {
      total_employees: employees.length,
      total_records: allMonthlyAttendance.length,
    },
    data: matrix,
  });
});

// POST /api/attendance/manual (Management creates or edits manual attendance)
router.post('/manual', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const { employee_id, date, punch_in, punch_out, status, reason } = req.body;

  if (!employee_id || !date || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'Employee, Date, and Reason for manual change are required.' });
  }

  const employee = db.findOne('employees', (e) => e.employee_id === employee_id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  const existing = db.findOne('attendance', (a) => a.employee_id === employee_id && a.attendance_date === date);

  let punchInIso = null;
  let punchInDisplay = null;
  if (punch_in) {
    const [h, m] = punch_in.split(':').map(Number);
    const utcHours = h - 3;
    punchInIso = new Date(`${date}T${String(utcHours).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`).toISOString();
    punchInDisplay = formatBahrainTime(punchInIso);
  }

  let punchOutIso = null;
  let punchOutDisplay = null;
  if (punch_out) {
    const [h, m] = punch_out.split(':').map(Number);
    const utcHours = h - 3;
    punchOutIso = new Date(`${date}T${String(utcHours).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`).toISOString();
    punchOutDisplay = formatBahrainTime(punchOutIso);
  }

  const { total_minutes, total_hours_formatted } = calculateWorkingTime(punchInIso, punchOutIso);
  const finalStatus = status || determineAttendanceStatus(punchInIso, punchOutIso);

  let record = null;
  if (existing) {
    const oldVal = { ...existing };
    record = db.update('attendance', existing.id, {
      punch_in: punchInIso || existing.punch_in,
      punch_out: punchOutIso || existing.punch_out,
      punch_in_display: punchInDisplay || existing.punch_in_display,
      punch_out_display: punchOutDisplay || existing.punch_out_display,
      status: finalStatus,
      total_minutes,
      total_hours_formatted,
      is_manual: true,
      manual_reason: reason,
      manual_by: req.user.id,
    });

    db.audit({
      attendance_id: record.id,
      employee_id,
      action: 'MANUAL_CORRECTION',
      old_value: oldVal,
      new_value: record,
      reason: reason,
      changed_by: req.user.id,
      changed_by_name: `${req.user.name} (${req.user.role})`,
    });
  } else {
    record = db.insert('attendance', {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employee_id: employee.employee_id,
      user_id: employee.user_id,
      employee_name: employee.full_name,
      site_id: employee.site_id,
      site_name: employee.site_name,
      supervisor_id: employee.supervisor_id,
      supervisor_name: employee.supervisor_name,
      attendance_date: date,
      punch_in: punchInIso,
      punch_out: punchOutIso,
      punch_in_display: punchInDisplay,
      punch_out_display: punchOutDisplay,
      status: finalStatus,
      total_minutes,
      total_hours_formatted,
      is_manual: true,
      manual_reason: reason,
      manual_by: req.user.id,
    });

    db.audit({
      attendance_id: record.id,
      employee_id,
      action: 'MANUAL_ENTRY_CREATED',
      new_value: record,
      reason: reason,
      changed_by: req.user.id,
      changed_by_name: `${req.user.name} (${req.user.role})`,
    });
  }

  res.json({
    message: 'Manual attendance saved successfully.',
    attendance: record,
  });
});

// POST /api/attendance/corrections/request (Labour requests attendance correction)
router.post('/corrections/request', requireAuth, (req, res) => {
  const employeeId = req.user.employee_id;
  if (!employeeId) {
    return res.status(400).json({ error: 'No employee ID associated with user.' });
  }

  const { date, requested_punch_in, requested_punch_out, reason } = req.body;

  if (!date || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'Date and reason for correction are required.' });
  }

  const existingRecord = db.findOne(
    'attendance',
    (a) => a.employee_id === employeeId && a.attendance_date === date
  );

  const employee = db.findOne('employees', (e) => e.employee_id === employeeId);

  const newCorrection = db.insert('attendance_corrections', {
    id: `cor-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    attendance_id: existingRecord ? existingRecord.id : null,
    employee_id: employeeId,
    employee_name: employee ? employee.full_name : req.user.name,
    attendance_date: date,
    original_punch_in: existingRecord ? existingRecord.punch_in_display : 'Missing',
    original_punch_out: existingRecord ? existingRecord.punch_out_display : 'Missing',
    requested_punch_in: requested_punch_in || null,
    requested_punch_out: requested_punch_out || null,
    reason: reason.trim(),
    status: 'Pending',
    requested_by: req.user.id,
    requested_by_name: req.user.name,
    reviewed_by: null,
    reviewed_by_name: null,
    reviewed_at: null,
    review_notes: null,
  });

  db.audit({
    attendance_id: existingRecord ? existingRecord.id : null,
    employee_id: employeeId,
    action: 'CORRECTION_REQUESTED',
    new_value: newCorrection,
    reason: reason,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.status(201).json({
    message: 'Correction request submitted for review.',
    correction: newCorrection,
  });
});

// GET /api/attendance/corrections (List corrections)
router.get('/corrections', requireAuth, (req, res) => {
  const isLabour = req.user.role === 'LABOUR';
  let corrections = db.get('attendance_corrections');

  if (isLabour) {
    corrections = corrections.filter((c) => c.employee_id === req.user.employee_id);
  }

  corrections.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(corrections);
});

// PATCH /api/attendance/corrections/:id/review (Review correction)
router.patch('/corrections/:id/review', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const { action, review_notes } = req.body;
  if (!['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'Action must be either "APPROVE" or "REJECT".' });
  }

  const correction = db.findById('attendance_corrections', req.params.id);
  if (!correction) {
    return res.status(404).json({ error: 'Correction request not found.' });
  }

  if (correction.status !== 'Pending') {
    return res.status(400).json({ error: `This request has already been ${correction.status.toLowerCase()}.` });
  }

  const updatedStatus = action === 'APPROVE' ? 'Approved' : 'Rejected';
  const nowIso = new Date().toISOString();

  let updatedAttendance = null;
  if (action === 'APPROVE') {
    const settings = db.get('settings') || {};
    const date = correction.attendance_date;
    const employee = db.findOne('employees', (e) => e.employee_id === correction.employee_id);

    let punchInIso = null;
    let punchInDisplay = null;
    if (correction.requested_punch_in) {
      const [h, m] = correction.requested_punch_in.split(':').map(Number);
      const utcHours = h - 3;
      punchInIso = new Date(`${date}T${String(utcHours).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`).toISOString();
      punchInDisplay = formatBahrainTime(punchInIso);
    }

    let punchOutIso = null;
    let punchOutDisplay = null;
    if (correction.requested_punch_out) {
      const [h, m] = correction.requested_punch_out.split(':').map(Number);
      const utcHours = h - 3;
      punchOutIso = new Date(`${date}T${String(utcHours).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`).toISOString();
      punchOutDisplay = formatBahrainTime(punchOutIso);
    }

    const { total_minutes, total_hours_formatted } = calculateWorkingTime(punchInIso, punchOutIso);
    const finalStatus = determineAttendanceStatus(punchInIso, punchOutIso, settings);

    if (correction.attendance_id) {
      const existing = db.findById('attendance', correction.attendance_id);
      if (existing) {
        updatedAttendance = db.update('attendance', existing.id, {
          punch_in: punchInIso || existing.punch_in,
          punch_out: punchOutIso || existing.punch_out,
          punch_in_display: punchInDisplay || existing.punch_in_display,
          punch_out_display: punchOutDisplay || existing.punch_out_display,
          status: 'Corrected',
          total_minutes,
          total_hours_formatted,
        });
      }
    } else {
      updatedAttendance = db.insert('attendance', {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        employee_id: correction.employee_id,
        user_id: employee ? employee.user_id : null,
        employee_name: correction.employee_name,
        site_id: employee ? employee.site_id : null,
        site_name: employee ? employee.site_name : 'Unassigned',
        supervisor_id: employee ? employee.supervisor_id : null,
        supervisor_name: employee ? employee.supervisor_name : 'Unassigned',
        attendance_date: date,
        punch_in: punchInIso,
        punch_out: punchOutIso,
        punch_in_display: punchInDisplay,
        punch_out_display: punchOutDisplay,
        status: 'Corrected',
        total_minutes,
        total_hours_formatted,
        is_manual: true,
      });
    }
  }

  const updatedCorrection = db.update('attendance_corrections', correction.id, {
    status: updatedStatus,
    reviewed_by: req.user.id,
    reviewed_by_name: `${req.user.name} (${req.user.role})`,
    reviewed_at: nowIso,
    review_notes: review_notes || null,
  });

  db.audit({
    attendance_id: correction.attendance_id,
    employee_id: correction.employee_id,
    action: action === 'APPROVE' ? 'CORRECTION_APPROVED' : 'CORRECTION_REJECTED',
    old_value: { status: 'Pending' },
    new_value: updatedCorrection,
    reason: review_notes || `Correction request ${updatedStatus.toLowerCase()}`,
    changed_by: req.user.id,
    changed_by_name: `${req.user.name} (${req.user.role})`,
  });

  res.json({
    message: `Correction request ${updatedStatus.toLowerCase()} successfully.`,
    correction: updatedCorrection,
    attendance: updatedAttendance,
  });
});

// GET /api/attendance/audit (Management view audit trail)
router.get('/audit', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const { employee_id, action, limit = 150 } = req.query;
  let audits = db.get('attendance_audit');

  if (employee_id) {
    audits = audits.filter((a) => a.employee_id === employee_id);
  }
  if (action) {
    audits = audits.filter((a) => a.action === action);
  }

  res.json(audits.slice(0, Number(limit)));
});

export default router;
