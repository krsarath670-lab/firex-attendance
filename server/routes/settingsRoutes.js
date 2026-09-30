import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = express.Router();

// GET /api/settings (All authenticated users can read settings for shift hours & GPS status)
router.get('/', requireAuth, (req, res) => {
  const settings = db.get('settings') || {};
  res.json(settings);
});

// PUT /api/settings (Full access for Engineer and Supervisor)
router.put('/', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const {
    company_name,
    country,
    timezone,
    work_start_time,
    work_end_time,
    saturday_start_time,
    saturday_end_time,
    friday_holiday,
    overtime_enabled,
    grace_period_minutes,
    gps_enabled,
    gps_enforcement_enabled,
    default_radius,
  } = req.body;

  const currentSettings = db.get('settings') || {};
  const oldSettings = { ...currentSettings };

  const updatedSettings = {
    ...currentSettings,
    company_name: company_name || currentSettings.company_name || 'FIREX',
    country: country || currentSettings.country || 'Bahrain',
    timezone: timezone || currentSettings.timezone || 'Asia/Bahrain',
    work_start_time: work_start_time || currentSettings.work_start_time || '07:30',
    work_end_time: work_end_time || currentSettings.work_end_time || '16:30',
    saturday_start_time: saturday_start_time || currentSettings.saturday_start_time || '07:30',
    saturday_end_time: saturday_end_time || currentSettings.saturday_end_time || '13:00',
    friday_holiday: friday_holiday !== undefined ? Boolean(friday_holiday) : true,
    overtime_enabled: overtime_enabled !== undefined ? Boolean(overtime_enabled) : true,
    grace_period_minutes:
      grace_period_minutes !== undefined ? parseInt(grace_period_minutes, 10) : (currentSettings.grace_period_minutes ?? 15),
    gps_enabled: gps_enabled !== undefined ? Boolean(gps_enabled) : currentSettings.gps_enabled,
    gps_enforcement_enabled:
      gps_enforcement_enabled !== undefined ? Boolean(gps_enforcement_enabled) : currentSettings.gps_enforcement_enabled,
    default_radius: default_radius !== undefined ? parseInt(default_radius, 10) : currentSettings.default_radius,
    updated_at: new Date().toISOString(),
  };

  db.set('settings', updatedSettings);

  db.audit({
    employee_id: null,
    action: 'SETTINGS_UPDATED',
    old_value: oldSettings,
    new_value: updatedSettings,
    reason: 'Company attendance rules and settings updated by Engineer',
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({
    message: 'Settings updated successfully.',
    settings: updatedSettings,
  });
});

export default router;
