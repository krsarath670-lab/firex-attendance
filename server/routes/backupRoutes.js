import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const router = express.Router();

// GET /api/backup/logs
router.get('/logs', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR']), (req, res) => {
  const logs = db.get('backup_logs') || [];
  res.json(logs);
});

// POST /api/backup/create (Trigger instant manual backup)
router.post('/create', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR']), (req, res) => {
  const result = db.createBackup();
  if (result.success) {
    db.audit({
      action: 'DATABASE_BACKUP_CREATED',
      new_value: { filename: result.filename },
      reason: `Manual cloud backup created by ${req.user.name}`,
      changed_by: req.user.id,
      changed_by_name: req.user.name,
    });
    res.json({ message: 'Backup created successfully!', backup: result.log });
  } else {
    res.status(500).json({ error: 'Failed to create backup: ' + result.error });
  }
});

// GET /api/backup/download (Download database JSON snapshot)
router.get('/download', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR']), (req, res) => {
  const snapshot = db.memory;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `FIREX_Attendance_Backup_${timestamp}.json`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(snapshot, null, 2));
});

// POST /api/backup/restore (Restore database from JSON payload)
router.post('/restore', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN']), (req, res) => {
  const { backupData } = req.body;
  if (!backupData) {
    return res.status(400).json({ error: 'No backup data provided.' });
  }

  try {
    db.restoreBackup(backupData);
    db.audit({
      action: 'DATABASE_RESTORED',
      reason: `Database restored from backup by ${req.user.name}`,
      changed_by: req.user.id,
      changed_by_name: req.user.name,
    });
    res.json({ message: 'Database restored successfully from backup.' });
  } catch (err) {
    res.status(400).json({ error: 'Restore failed: ' + err.message });
  }
});

export default router;
