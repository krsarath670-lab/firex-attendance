import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'attendance_database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Initial seed data generator
function getInitialSeed() {
  const salt = bcrypt.genSaltSync(10);
  const adminPassHash = bcrypt.hashSync('admin123', salt);
  const labourPassHash = bcrypt.hashSync('labour123', salt);

  return {
    settings: {
      id: 'settings-1',
      company_name: 'FIREX',
      country: 'Bahrain',
      timezone: 'Asia/Bahrain',
      work_start_time: '07:30',
      work_end_time: '16:30',
      saturday_start_time: '07:30',
      saturday_end_time: '13:00',
      friday_holiday: true,
      overtime_enabled: true,
      grace_period_minutes: 15,
      gps_enabled: true,
      gps_enforcement_enabled: false,
      photo_verification_enabled: false,
      default_radius: 100,
      auto_backup_enabled: true,
      backup_retention_days: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    holidays: [
      { id: 'hol-1', name: 'New Year\'s Day', date: '2026-01-01', year: 2026, is_official: true, remarks: 'Official Public Holiday' },
      { id: 'hol-2', name: 'Eid Al Fitr (Day 1)', date: '2026-03-20', year: 2026, is_official: true, remarks: 'Subject to moon sighting' },
      { id: 'hol-3', name: 'Eid Al Fitr (Day 2)', date: '2026-03-21', year: 2026, is_official: true, remarks: 'Subject to moon sighting' },
      { id: 'hol-4', name: 'Eid Al Fitr (Day 3)', date: '2026-03-22', year: 2026, is_official: true, remarks: 'Subject to moon sighting' },
      { id: 'hol-5', name: 'Labour Day', date: '2026-05-01', year: 2026, is_official: true, remarks: 'Official Public Holiday' },
      { id: 'hol-6', name: 'Arafat Day', date: '2026-05-26', year: 2026, is_official: true, remarks: 'Subject to moon sighting' },
      { id: 'hol-7', name: 'Eid Al Adha (Day 1)', date: '2026-05-27', year: 2026, is_official: true, remarks: 'Subject to moon sighting' },
      { id: 'hol-8', name: 'Eid Al Adha (Day 2)', date: '2026-05-28', year: 2026, is_official: true, remarks: 'Subject to moon sighting' },
      { id: 'hol-9', name: 'Eid Al Adha (Day 3)', date: '2026-05-29', year: 2026, is_official: true, remarks: 'Subject to moon sighting' },
      { id: 'hol-10', name: 'Islamic New Year (Hijri 1448)', date: '2026-06-16', year: 2026, is_official: true, remarks: 'Subject to moon sighting' },
      { id: 'hol-11', name: 'Ashura (Day 1)', date: '2026-06-25', year: 2026, is_official: true, remarks: 'Official Holiday' },
      { id: 'hol-12', name: 'Ashura (Day 2)', date: '2026-06-26', year: 2026, is_official: true, remarks: 'Official Holiday' },
      { id: 'hol-13', name: 'Prophet\'s Birthday (Mawlid)', date: '2026-08-25', year: 2026, is_official: true, remarks: 'Official Holiday' },
      { id: 'hol-14', name: 'Bahrain National Day', date: '2026-12-16', year: 2026, is_official: true, remarks: '55th National Day' },
      { id: 'hol-15', name: 'Bahrain National Day (Day 2)', date: '2026-12-17', year: 2026, is_official: true, remarks: 'Accession Day' },
      { id: 'hol-16', name: 'New Year\'s Day 2027', date: '2027-01-01', year: 2027, is_official: true, remarks: 'Official Public Holiday' },
    ],
    sites: [],
    daily_schedules: [],
    users: [
      {
        id: 'usr-eng',
        name: 'HASAN ZULAIKH',
        email: 'engineer@firex.com',
        username: 'engineer',
        password_hash: adminPassHash,
        phone: '38837080',
        role: 'ENGINEER',
        employee_id: 'ENG-0001',
        status: 'Active',
        created_at: '2026-01-01T08:00:00.000Z',
        updated_at: '2026-01-01T08:00:00.000Z',
      },
      {
        id: 'usr-sup',
        name: 'Sarath Kr',
        email: 'supervisor@firex.com',
        username: 'supervisor',
        password_hash: adminPassHash,
        phone: '+973 3611 7788',
        role: 'SUPERVISOR',
        employee_id: 'SUP-0001',
        status: 'Active',
        created_at: '2026-01-01T08:00:00.000Z',
        updated_at: '2026-01-01T08:00:00.000Z',
      },
    ],
    employees: [],
    attendance: [],
    leaves: [],
    attendance_corrections: [],
    attendance_audit: [],
    backup_logs: [],
  };
}

class Database {
  constructor() {
    this.memory = null;
    this.init();
    this.setupAutoBackup();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.memory = getInitialSeed();
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.memory = JSON.parse(raw);
        // Ensure all required collections exist
        const defaultSeed = getInitialSeed();
        for (const key of Object.keys(defaultSeed)) {
          if (!this.memory[key]) {
            this.memory[key] = defaultSeed[key];
          }
        }
      } catch (err) {
        console.error('Error reading database file, resetting to initial seed:', err);
        this.memory = getInitialSeed();
        this.save();
      }
    }
  }

  save() {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.memory, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Database write error:', err);
      throw new Error('Database write failure');
    }
  }

  get(collection) {
    return this.memory[collection] || [];
  }

  set(collection, data) {
    this.memory[collection] = data;
    this.save();
    return data;
  }

  findById(collection, id) {
    const list = this.get(collection);
    return list.find((item) => item.id === id) || null;
  }

  findOne(collection, predicate) {
    const list = this.get(collection);
    return list.find(predicate) || null;
  }

  filter(collection, predicate) {
    const list = this.get(collection);
    return list.filter(predicate);
  }

  insert(collection, item) {
    const list = this.get(collection);
    if (!item.id) {
      const prefix = collection.slice(0, 3);
      item.id = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
    const now = new Date().toISOString();
    item.created_at = item.created_at || now;
    item.updated_at = item.updated_at || now;
    list.push(item);
    this.set(collection, list);
    return item;
  }

  update(collection, id, updates) {
    const list = this.get(collection);
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const updated = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    this.set(collection, list);
    return updated;
  }

  delete(collection, id) {
    const list = this.get(collection);
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    this.set(collection, list);
    return true;
  }

  // Generate next unique Employee ID e.g. LAB-0005
  generateEmployeeId() {
    const employees = this.get('employees');
    let maxNum = 0;
    for (const emp of employees) {
      if (emp.employee_id && emp.employee_id.startsWith('LAB-')) {
        const num = parseInt(emp.employee_id.replace('LAB-', ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    const nextNum = maxNum + 1;
    return `LAB-${String(nextNum).padStart(4, '0')}`;
  }

  // Append audit trail safely
  audit({ attendance_id, employee_id, action, old_value, new_value, reason, changed_by, changed_by_name }) {
    const auditRecord = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      attendance_id: attendance_id || null,
      employee_id: employee_id || null,
      action,
      old_value: old_value || null,
      new_value: new_value || null,
      reason: reason || 'Action recorded',
      changed_by: changed_by || 'system',
      changed_by_name: changed_by_name || 'System',
      changed_at: new Date().toISOString(),
    };
    const audits = this.get('attendance_audit');
    audits.unshift(auditRecord);
    this.set('attendance_audit', audits);
    return auditRecord;
  }

  // Backup routines
  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_firex_${timestamp}.json`;
      const backupPath = path.join(BACKUP_DIR, filename);
      const snapshot = JSON.stringify(this.memory, null, 2);
      fs.writeFileSync(backupPath, snapshot, 'utf8');

      const stats = fs.statSync(backupPath);
      const log = {
        id: `bak-${Date.now()}`,
        filename,
        records_count:
          (this.memory.attendance?.length || 0) +
          (this.memory.employees?.length || 0) +
          (this.memory.leaves?.length || 0),
        size_bytes: stats.size,
        created_at: new Date().toISOString(),
        status: 'SUCCESS',
      };

      const logs = this.get('backup_logs');
      logs.unshift(log);
      this.set('backup_logs', logs.slice(0, 50)); // keep last 50 backup logs

      return { success: true, filename, log };
    } catch (err) {
      console.error('Backup creation error:', err);
      return { success: false, error: err.message };
    }
  }

  restoreBackup(backupJsonData) {
    if (!backupJsonData || typeof backupJsonData !== 'object') {
      throw new Error('Invalid backup data format.');
    }
    // Verify required collections
    const requiredKeys = ['users', 'employees', 'attendance', 'settings'];
    for (const key of requiredKeys) {
      if (!backupJsonData[key]) {
        throw new Error(`Corrupt backup: missing ${key} collection.`);
      }
    }

    // Save previous snapshot as safety before restoring
    this.createBackup();

    this.memory = backupJsonData;
    this.save();
    return true;
  }

  setupAutoBackup() {
    // Run automated backup every 24 hours
    setInterval(() => {
      const settings = this.get('settings') || {};
      if (settings.auto_backup_enabled !== false) {
        this.createBackup();
      }
    }, 24 * 60 * 60 * 1000);
  }
}

export const db = new Database();
export default db;
