import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { getBahrainDateString } from '../attendanceEngine.js';

const router = express.Router();

// GET /api/reports/daily (Engineer/Supervisor)
router.get('/daily', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const { date, site_id, supervisor_id, department } = req.query;
  const targetDate = date || getBahrainDateString();
  const settings = db.get('settings') || {};

  let employees = db.filter('employees', (e) => e.status === 'Active');
  if (site_id) employees = employees.filter((e) => e.site_id === site_id);
  if (supervisor_id) employees = employees.filter((e) => e.supervisor_id === supervisor_id);
  if (department) employees = employees.filter((e) => e.department === department);

  const attendanceList = db.filter('attendance', (a) => a.attendance_date === targetDate);

  const rows = employees.map((emp) => {
    const att = attendanceList.find((a) => a.employee_id === emp.employee_id);
    return {
      company: settings.company_name || 'FIREX',
      date: targetDate,
      employee_id: emp.employee_id,
      employee_name: emp.full_name,
      department: emp.department,
      designation: emp.designation,
      site_name: (att && att.site_name) || emp.site_name,
      supervisor_name: (att && att.supervisor_name) || emp.supervisor_name,
      punch_in: (att && att.punch_in_display) || 'Absent',
      punch_out: (att && att.punch_out_display) || '--:--',
      working_hours: (att && att.total_hours_formatted) || '0h 00m',
      status: (att && att.status) || 'Absent',
      is_manual: (att && att.is_manual) || false,
    };
  });

  res.json({
    report_type: 'DAILY_ATTENDANCE',
    date: targetDate,
    company: settings.company_name || 'FIREX',
    total_records: rows.length,
    rows,
  });
});

// GET /api/reports/monthly (Engineer/Supervisor)
router.get('/monthly', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const { month, year, site_id, supervisor_id, department } = req.query;
  const today = getBahrainDateString();
  const targetYear = year || today.substring(0, 4);
  const targetMonth = month || today.substring(5, 7);
  const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
  const settings = db.get('settings') || {};

  let employees = db.filter('employees', (e) => e.status === 'Active');
  if (site_id) employees = employees.filter((e) => e.site_id === site_id);
  if (supervisor_id) employees = employees.filter((e) => e.supervisor_id === supervisor_id);
  if (department) employees = employees.filter((e) => e.department === department);

  const monthAttendance = db.filter('attendance', (a) => a.attendance_date?.startsWith(monthPrefix));

  const rows = employees.map((emp) => {
    const empRecords = monthAttendance.filter((a) => a.employee_id === emp.employee_id);
    const presentCount = empRecords.filter((a) => a.status === 'Present' || a.status === 'Present - Late').length;
    const lateCount = empRecords.filter((a) => a.status === 'Present - Late' || a.status === 'Late').length;
    const totalMinutes = empRecords.reduce((sum, r) => sum + (r.total_minutes || 0), 0);
    const avgMinutes = presentCount > 0 ? Math.round(totalMinutes / presentCount) : 0;

    return {
      company: settings.company_name || 'FIREX',
      month: monthPrefix,
      employee_id: emp.employee_id,
      employee_name: emp.full_name,
      department: emp.department,
      site_name: emp.site_name,
      supervisor_name: emp.supervisor_name,
      days_present: presentCount,
      days_late: lateCount,
      days_absent: Math.max(0, 26 - presentCount),
      total_hours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      avg_daily_hours: `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`,
    };
  });

  res.json({
    report_type: 'MONTHLY_ATTENDANCE',
    month: monthPrefix,
    company: settings.company_name || 'FIREX',
    total_records: rows.length,
    rows,
  });
});

// GET /api/reports/employee (Engineer/Supervisor or Labour for own id)
router.get('/employee', requireAuth, (req, res) => {
  const { employee_id, start_date, end_date } = req.query;

  // Security check: if Labour, enforce own employee_id
  let targetEmpId = employee_id;
  if (req.user.role === 'LABOUR') {
    targetEmpId = req.user.employee_id;
  }

  if (!targetEmpId) {
    return res.status(400).json({ error: 'Employee ID is required.' });
  }

  const employee = db.findOne('employees', (e) => e.employee_id === targetEmpId);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  let records = db.filter('attendance', (a) => a.employee_id === targetEmpId);
  if (start_date && end_date) {
    records = records.filter((r) => r.attendance_date >= start_date && r.attendance_date <= end_date);
  }

  records.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

  const totalMinutes = records.reduce((sum, r) => sum + (r.total_minutes || 0), 0);
  const presentCount = records.filter((r) => r.status === 'Present' || r.status === 'Present - Late').length;
  const lateCount = records.filter((r) => r.status === 'Present - Late' || r.status === 'Late').length;

  res.json({
    report_type: 'EMPLOYEE_ATTENDANCE',
    employee,
    date_range: { start_date, end_date },
    summary: {
      total_records: records.length,
      present_days: presentCount,
      late_days: lateCount,
      total_hours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
    },
    records,
  });
});

export default router;
