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

// GET /api/backup/logs (Returns all real-life backups synced with disk and database)
router.get('/logs', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR']), (req, res) => {
  if (db.syncBackupLogs) {
    db.syncBackupLogs();
  }
  const logs = db.get('backup_logs') || [];
  res.json(logs);
});

// POST /api/backup/create (Trigger instant manual backup)
router.post('/create', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR']), (req, res) => {
  const result = db.createBackup();
  if (result.success) {
    if (db.syncBackupLogs) {
      db.syncBackupLogs();
    }
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

// GET /api/backup/download (Download live database JSON snapshot)
router.get('/download', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR']), (req, res) => {
  const snapshot = db.memory;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `FIREX_Attendance_Backup_${timestamp}.json`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(snapshot, null, 2));
});

// GET /api/backup/download-file/:filename (Download any specific real-life backup file from disk)
router.get('/download-file/:filename', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR']), (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  if (!safeFilename.endsWith('.json')) {
    return res.status(400).json({ error: 'Invalid backup file format.' });
  }

  const filePath = path.join(BACKUP_DIR, safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Backup file "${safeFilename}" not found on server.` });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Type', 'application/json');
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// POST /api/backup/restore-file/:filename (Restore database directly from a listed backup file on disk)
router.post('/restore-file/:filename', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN']), (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  if (!safeFilename.endsWith('.json')) {
    return res.status(400).json({ error: 'Invalid backup file format.' });
  }

  const filePath = path.join(BACKUP_DIR, safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Backup file "${safeFilename}" not found on server.` });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const backupData = JSON.parse(raw);

    db.restoreBackup(backupData);
    if (db.syncBackupLogs) {
      db.syncBackupLogs();
    }

    db.audit({
      action: 'DATABASE_RESTORED',
      reason: `Database restored from server backup file "${safeFilename}" by ${req.user.name}`,
      changed_by: req.user.id,
      changed_by_name: req.user.name,
    });

    res.json({ message: `Database successfully restored from "${safeFilename}".` });
  } catch (err) {
    console.error(`[Backup] Error restoring file ${safeFilename}:`, err);
    res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

// POST /api/backup/restore (Restore database from uploaded JSON payload)
router.post('/restore', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN']), (req, res) => {
  const { backupData } = req.body;
  if (!backupData) {
    return res.status(400).json({ error: 'No backup data provided.' });
  }

  try {
    db.restoreBackup(backupData);
    if (db.syncBackupLogs) {
      db.syncBackupLogs();
    }

    db.audit({
      action: 'DATABASE_RESTORED',
      reason: `Database restored from uploaded backup by ${req.user.name}`,
      changed_by: req.user.id,
      changed_by_name: req.user.name,
    });
    res.json({ message: 'Database restored successfully from backup.' });
  } catch (err) {
    res.status(400).json({ error: 'Restore failed: ' + err.message });
  }
});

export default router;
