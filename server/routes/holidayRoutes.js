import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = express.Router();
const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ENGINEER', 'SUPERVISOR', 'ADMIN'];

// Standard Bahrain Public Holidays Seed (2026 / 2027)
export const DEFAULT_BAHRAIN_HOLIDAYS = [
  { name: "New Year's Day", date: '2026-01-01', remarks: 'Official National Holiday' },
  { name: 'Eid Al Fitr (Day 1)', date: '2026-03-20', remarks: 'Islamic Holiday' },
  { name: 'Eid Al Fitr (Day 2)', date: '2026-03-21', remarks: 'Islamic Holiday' },
  { name: 'Eid Al Fitr (Day 3)', date: '2026-03-22', remarks: 'Islamic Holiday' },
  { name: 'Labour Day', date: '2026-05-01', remarks: 'International Workers Day' },
  { name: 'Arafah Day', date: '2026-05-26', remarks: 'Hajj Pilgrimage Holiday' },
  { name: 'Eid Al Adha (Day 1)', date: '2026-05-27', remarks: 'Feast of Sacrifice' },
  { name: 'Eid Al Adha (Day 2)', date: '2026-05-28', remarks: 'Feast of Sacrifice' },
  { name: 'Eid Al Adha (Day 3)', date: '2026-05-29', remarks: 'Feast of Sacrifice' },
  { name: 'Islamic New Year (Hijri)', date: '2026-06-16', remarks: 'Muharram 1st' },
  { name: 'Ashura (Day 1)', date: '2026-06-25', remarks: 'Muharram 9th' },
  { name: 'Ashura (Day 2)', date: '2026-06-26', remarks: 'Muharram 10th' },
  { name: "Prophet's Birthday (Mawlid)", date: '2026-08-25', remarks: 'Mawlid Al-Nabi' },
  { name: 'Bahrain National Day', date: '2026-12-16', remarks: 'National Day Celebration' },
  { name: 'Bahrain Accession Day', date: '2026-12-17', remarks: "His Majesty King's Accession Day" },
  { name: "New Year's Day", date: '2027-01-01', remarks: 'Official National Holiday' },
];

// GET /api/holidays (All authenticated users)
router.get('/', requireAuth, (req, res) => {
  const holidays = db.get('public_holidays') || [];
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  res.json(holidays);
});

// POST /api/holidays (Engineer/Supervisor/Admin adds public holiday)
router.post('/', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const { name, date, remarks } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Holiday Name is required.' });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Valid Holiday Date (YYYY-MM-DD) is required.' });
  }

  const holidays = db.get('public_holidays') || [];
  const existing = holidays.find((h) => h.date === date);
  if (existing) {
    return res.status(400).json({
      error: `A public holiday "${existing.name}" is already registered on ${date}.`,
    });
  }

  const newHoliday = db.insert('public_holidays', {
    id: `hol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    date: date,
    year: parseInt(date.substring(0, 4), 10),
    remarks: remarks ? remarks.trim() : '',
    created_by: req.user.id,
    created_by_name: `${req.user.name} (${req.user.role})`,
  });

  db.audit({
    action: 'PUBLIC_HOLIDAY_ADDED',
    new_value: newHoliday,
    reason: `Added public holiday "${newHoliday.name}" on ${date}`,
    changed_by: req.user.id,
    changed_by_name: `${req.user.name} (${req.user.role})`,
  });

  res.status(201).json({
    message: `Public Holiday "${newHoliday.name}" added successfully.`,
    holiday: newHoliday,
  });
});

// PUT /api/holidays/:id (Update public holiday)
router.put('/:id', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const holiday = db.findById('public_holidays', req.params.id);
  if (!holiday) {
    return res.status(404).json({ error: 'Public holiday not found.' });
  }

  const { name, date, remarks } = req.body;
  const updatedHoliday = db.update('public_holidays', holiday.id, {
    name: name !== undefined ? name.trim() : holiday.name,
    date: date !== undefined ? date : holiday.date,
    year: date ? parseInt(date.substring(0, 4), 10) : holiday.year,
    remarks: remarks !== undefined ? remarks.trim() : holiday.remarks,
    updated_at: new Date().toISOString(),
  });

  db.audit({
    action: 'PUBLIC_HOLIDAY_UPDATED',
    old_value: holiday,
    new_value: updatedHoliday,
    reason: `Updated public holiday "${updatedHoliday.name}"`,
    changed_by: req.user.id,
    changed_by_name: `${req.user.name} (${req.user.role})`,
  });

  res.json({
    message: 'Public holiday updated successfully.',
    holiday: updatedHoliday,
  });
});

// DELETE /api/holidays/:id (Delete public holiday)
router.delete('/:id', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  const holiday = db.findById('public_holidays', req.params.id);
  if (!holiday) {
    return res.status(404).json({ error: 'Public holiday not found.' });
  }

  db.delete('public_holidays', holiday.id);

  db.audit({
    action: 'PUBLIC_HOLIDAY_DELETED',
    old_value: holiday,
    reason: `Removed public holiday "${holiday.name}" (${holiday.date})`,
    changed_by: req.user.id,
    changed_by_name: `${req.user.name} (${req.user.role})`,
  });

  res.json({
    message: `Public holiday "${holiday.name}" removed successfully.`,
  });
});

// POST /api/holidays/seed-default (Seed default Bahrain public holidays)
router.post('/seed-default', requireAuth, requireRole(MANAGEMENT_ROLES), (req, res) => {
  let holidays = db.get('public_holidays') || [];
  let added = 0;

  for (const item of DEFAULT_BAHRAIN_HOLIDAYS) {
    if (!holidays.some((h) => h.date === item.date)) {
      holidays.push({
        id: `hol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: item.name,
        date: item.date,
        year: parseInt(item.date.substring(0, 4), 10),
        remarks: item.remarks,
        created_by: req.user.id,
        created_by_name: `${req.user.name} (${req.user.role})`,
        created_at: new Date().toISOString(),
      });
      added++;
    }
  }

  db.set('public_holidays', holidays);

  res.json({
    message: `Seeded ${added} Bahrain standard public holidays.`,
    total: holidays.length,
  });
});

export default router;
