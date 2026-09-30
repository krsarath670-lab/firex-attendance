import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { getBahrainDateString } from '../attendanceEngine.js';

const router = express.Router();
const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ENGINEER', 'SUPERVISOR', 'ADMIN'];

// Helper to get tomorrow's date string in Bahrain timezone
function getBahrainTomorrowDateString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bahrainTime = new Date(utc + 3600000 * 3);
  bahrainTime.setDate(bahrainTime.getDate() + 1);
  return bahrainTime.toISOString().substring(0, 10);
}

// GET /api/schedule
// Returns workers and their scheduled site for a specific date (defaults to tomorrow)
router.get('/', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const targetDate = req.query.date || getBahrainTomorrowDateString();
  const departmentFilter = req.query.department; // 'Project', 'Maintenance', or undefined
  const search = req.query.search ? req.query.search.toLowerCase() : '';

  const allEmployees = db.filter('employees', (e) => e.status === 'Active');
  const allSchedules = db.get('daily_schedules') || [];
  const schedulesOnDate = allSchedules.filter((s) => s.date === targetDate);

  // Filter employees
  let filtered = allEmployees;
  if (departmentFilter && departmentFilter !== 'ALL') {
    filtered = filtered.filter((e) => e.department === departmentFilter);
  }
  if (search) {
    filtered = filtered.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(search) ||
        e.employee_id?.toLowerCase().includes(search) ||
        e.designation?.toLowerCase().includes(search)
    );
  }

  // Combine employee info with their schedule on the target date
  const workers = filtered.map((emp) => {
    const sch = schedulesOnDate.find((s) => s.employee_id === emp.employee_id);
    return {
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      mobile: emp.mobile,
      department: emp.department || 'Project',
      designation: emp.designation || 'Labour Worker',
      supervisor_name: emp.supervisor_name || 'Unassigned',
      scheduled_site: sch ? sch.site_name : null,
      scheduled_by: sch ? sch.scheduled_by_name : null,
      scheduled_at: sch ? sch.updated_at : null,
      schedule_id: sch ? sch.id : null,
      is_scheduled: Boolean(sch && sch.site_name),
    };
  });

  // Calculate summary metrics
  const totalWorkers = allEmployees.length;
  const scheduledCount = allEmployees.filter((emp) =>
    schedulesOnDate.some((s) => s.employee_id === emp.employee_id && s.site_name)
  ).length;
  const pendingCount = totalWorkers - scheduledCount;
  const projectWorkers = allEmployees.filter((e) => e.department === 'Project').length;
  const maintenanceWorkers = allEmployees.filter((e) => e.department === 'Maintenance').length;

  // Retrieve list of unique recent site names
  const recentSitesSet = new Set();
  // Add preset common Bahrain sites
  ['Al Seef Commercial Tower', 'BAPCO Modernization Site', 'Diplomatic Area Office', 'Hidd Industrial Facility', 'Reef Island Luxury Villa', 'Amwaj Islands Maintenance'].forEach((s) => recentSitesSet.add(s));
  // Add sites from DB sites table
  (db.get('sites') || []).forEach((s) => {
    if (s.site_name) recentSitesSet.add(s.site_name);
  });
  // Add sites from schedules
  allSchedules.forEach((s) => {
    if (s.site_name) recentSitesSet.add(s.site_name);
  });

  res.json({
    date: targetDate,
    today_date: getBahrainDateString(),
    tomorrow_date: getBahrainTomorrowDateString(),
    summary: {
      total_workers: totalWorkers,
      scheduled_count: scheduledCount,
      pending_count: pendingCount,
      project_workers: projectWorkers,
      maintenance_workers: maintenanceWorkers,
    },
    recent_sites: Array.from(recentSitesSet).slice(0, 15),
    workers,
  });
});

// POST /api/schedule/bulk-assign
// Assign a site to multiple workers for a given date
router.post('/bulk-assign', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const { date, employee_ids, site_name } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Target schedule date is required.' });
  }
  if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
    return res.status(400).json({ error: 'Please select at least one employee to assign.' });
  }
  if (!site_name || !site_name.trim()) {
    return res.status(400).json({ error: 'Site name cannot be empty.' });
  }

  const cleanSiteName = site_name.trim();
  const allSchedules = db.get('daily_schedules') || [];
  const allEmployees = db.get('employees') || [];
  const now = new Date().toISOString();

  let assignedCount = 0;

  for (const empId of employee_ids) {
    const employee = allEmployees.find((e) => e.employee_id === empId);
    if (!employee) continue;

    const existingIndex = allSchedules.findIndex(
      (s) => s.date === date && s.employee_id === empId
    );

    if (existingIndex >= 0) {
      allSchedules[existingIndex] = {
        ...allSchedules[existingIndex],
        site_name: cleanSiteName,
        scheduled_by: req.user.id,
        scheduled_by_name: `${req.user.name} (${req.user.role})`,
        updated_at: now,
      };
    } else {
      allSchedules.push({
        id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date: date,
        employee_id: empId,
        employee_name: employee.full_name,
        department: employee.department || 'Project',
        site_name: cleanSiteName,
        scheduled_by: req.user.id,
        scheduled_by_name: `${req.user.name} (${req.user.role})`,
        created_at: now,
        updated_at: now,
      });
    }
    assignedCount++;
  }

  db.set('daily_schedules', allSchedules);

  db.audit({
    action: 'BULK_SITE_SCHEDULED',
    reason: `Assigned site "${cleanSiteName}" to ${assignedCount} worker(s) for ${date}`,
    changed_by: req.user.id,
    changed_by_name: `${req.user.name} (${req.user.role})`,
  });

  res.json({
    message: `Successfully scheduled ${assignedCount} worker(s) to "${cleanSiteName}" for ${date}.`,
    assignedCount,
    date,
    site_name: cleanSiteName,
  });
});

// PUT /api/schedule/assign
// Assign or update single worker's scheduled site
router.put('/assign', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const { date, employee_id, site_name } = req.body;

  if (!date || !employee_id) {
    return res.status(400).json({ error: 'Date and employee_id are required.' });
  }
  if (!site_name || !site_name.trim()) {
    return res.status(400).json({ error: 'Site name cannot be empty.' });
  }

  const cleanSiteName = site_name.trim();
  const allSchedules = db.get('daily_schedules') || [];
  const employee = db.findOne('employees', (e) => e.employee_id === employee_id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  const now = new Date().toISOString();
  const existingIndex = allSchedules.findIndex(
    (s) => s.date === date && s.employee_id === employee_id
  );

  let updatedSchedule = null;
  if (existingIndex >= 0) {
    allSchedules[existingIndex] = {
      ...allSchedules[existingIndex],
      site_name: cleanSiteName,
      scheduled_by: req.user.id,
      scheduled_by_name: `${req.user.name} (${req.user.role})`,
      updated_at: now,
    };
    updatedSchedule = allSchedules[existingIndex];
  } else {
    updatedSchedule = {
      id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: date,
      employee_id: employee_id,
      employee_name: employee.full_name,
      department: employee.department || 'Project',
      site_name: cleanSiteName,
      scheduled_by: req.user.id,
      scheduled_by_name: `${req.user.name} (${req.user.role})`,
      created_at: now,
      updated_at: now,
    };
    allSchedules.push(updatedSchedule);
  }

  db.set('daily_schedules', allSchedules);

  db.audit({
    employee_id,
    action: 'DAILY_SITE_SCHEDULED',
    reason: `Scheduled ${employee.full_name} to "${cleanSiteName}" for ${date}`,
    changed_by: req.user.id,
    changed_by_name: `${req.user.name} (${req.user.role})`,
  });

  res.json({
    message: `Scheduled ${employee.full_name} to "${cleanSiteName}" for ${date}.`,
    schedule: updatedSchedule,
  });
});

// DELETE /api/schedule/assign
// Clear site schedule for an employee on a specific date
router.delete('/assign', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const { date, employee_id } = req.query;

  if (!date || !employee_id) {
    return res.status(400).json({ error: 'Date and employee_id are required.' });
  }

  let allSchedules = db.get('daily_schedules') || [];
  const initialLen = allSchedules.length;
  allSchedules = allSchedules.filter((s) => !(s.date === date && s.employee_id === employee_id));

  db.set('daily_schedules', allSchedules);

  res.json({
    message: `Site assignment cleared for employee ${employee_id} on ${date}.`,
    cleared: initialLen !== allSchedules.length,
  });
});

export default router;
