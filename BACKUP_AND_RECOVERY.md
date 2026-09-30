# 🛡️ FIREX Attendance — Backup & Disaster Recovery Plan

This document outlines the backup policies, retention schedules, and disaster recovery procedures for the **FIREX Attendance Management System**.

---

## 📅 Backup Strategy & Frequency

| Backup Type | Frequency | Storage Location | Retention Period |
| :--- | :--- | :--- | :--- |
| **Automatic Cloud Snapshots** | Daily (Every 24h at midnight) | `/server/data/backups/` | Rolling 30 Days (auto-pruned) |
| **Manual Instant Snapshots** | On-Demand (via Admin Dashboard) | Cloud Storage & Downloadable | Permanent until deleted |
| **Pre-Restore Safety Snapshots** | Triggered immediately before any restore | `/server/data/backups/` | Preserved permanently |

---

## 💾 How to Export / Download Backups

1. Log in as an **Engineer**, **Admin**, or **Supervisor**.
2. Navigate to the **"Backups & Cloud"** tab in the management sidebar.
3. Click **"Download JSON Snapshot"** to instantly save a timestamped backup copy to your local device.
4. Click **"Create Instant Backup"** to create a fresh snapshot in the server backup vault.

---

## 🔄 Disaster Recovery & Restore Procedure

In the event of accidental data corruption or catastrophic server migration:

### Method 1: Web Interface Restore (Recommended)
1. Go to the **"Backups & Cloud"** page.
2. Under the **"Disaster Recovery / Restore from File"** section, click **"Select Backup File (.json)"**.
3. Select your verified backup file.
4. The system automatically creates a pre-restore safety snapshot of the current state before overwriting.
5. Once complete, a success confirmation is displayed and all records, audit logs, leaves, and sites are immediately restored.

### Method 2: Manual CLI / Docker Restore
If the web UI is inaccessible:
1. Copy your backup JSON file to `server/data/attendance_database.json`.
2. Restart the Node process or Docker container:
   ```bash
   docker restart firex-attendance-prod
   # or
   pm2 restart firex-attendance
   ```
3. The database engine will automatically validate schemas, generate missing indexes, and resume normal operations.
