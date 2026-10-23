import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow configurable DATA_DIR (e.g. for Render Persistent Disks mounted at /var/data)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'attendance_database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Initial seed data generator (Only permanent management accounts)
function getInitialSeed() {
  const salt = bcrypt.genSaltSync(10);
  const adminPassHash = bcrypt.hashSync('admin123', salt);

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
    sites: [
      {
        id: 'site-ho',
        site_code: 'SITE-HO',
        site_name: 'FIREX Main Workshop & HQ',
        status: 'Active',
        remarks: 'Main Central Workshop',
      },
      {
        id: 'site-bapco',
        site_code: 'SITE-BAPCO',
        site_name: 'BAPCO Modernization Site',
        status: 'Active',
        remarks: 'Industrial Site',
      },
    ],
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
        phone: '+973 39027232',
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
    this.pool = null;
    this.isPostgresConnected = false;
    this.postgresError = null;
    this.init();
    this.setupPostgres();
    this.setupAutoBackup();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.memory = getInitialSeed();
      this.saveLocal();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.memory = JSON.parse(raw);
        const defaultSeed = getInitialSeed();
        for (const key of Object.keys(defaultSeed)) {
          if (!this.memory[key]) {
            this.memory[key] = defaultSeed[key];
          }
        }
      } catch (err) {
        console.error('[DB] Error reading database file, using safe seed:', err);
        this.memory = getInitialSeed();
        this.saveLocal();
      }
    }
  }

  // Setup PostgreSQL connection pool if DATABASE_URL is configured
  async setupPostgres() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('[DB] No DATABASE_URL set. Running in local JSON storage mode.');
      return;
    }

    try {
      console.log('[DB] Connecting to Cloud PostgreSQL database...');
      const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });

      // Test connection
      const client = await this.pool.connect();
      try {
        // Create table for permanent key-value collection storage
        await client.query(`
          CREATE TABLE IF NOT EXISTS firex_production_store (
            collection VARCHAR(64) PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // Load all collections from PostgreSQL into memory
        const res = await client.query('SELECT collection, data FROM firex_production_store');
        if (res.rows.length > 0) {
          console.log(`[DB] Successfully loaded ${res.rows.length} collections from PostgreSQL Cloud Database!`);
          for (const row of res.rows) {
            this.memory[row.collection] = row.data;
          }
          // Also save local backup snapshot of cloud data
          this.saveLocal();
        } else {
          console.log('[DB] PostgreSQL store is empty. Migrating initial seed to PostgreSQL...');
          for (const [col, data] of Object.entries(this.memory)) {
            await client.query(
              `INSERT INTO firex_production_store (collection, data, updated_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (collection) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
              [col, JSON.stringify(data)]
            );
          }
          console.log('[DB] Initial seed successfully persisted to Cloud PostgreSQL!');
        }

        this.isPostgresConnected = true;
        this.postgresError = null;
        console.log('✅ [DB] Cloud PostgreSQL Database is ACTIVE and 100% PERSISTENT.');
      } finally {
        client.release();
      }
    } catch (err) {
      this.isPostgresConnected = false;
      this.postgresError = err.message;
      console.error('❌ [DB] PostgreSQL Connection Error:', err.message);
      console.log('[DB] Operating in resilient fallback mode using local storage.');
    }
  }

  saveLocal() {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.memory, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[DB] Local write error:', err);
    }
  }

  // Persist collection asynchronously to PostgreSQL if connected
  async persistToPostgres(collection, data) {
    if (!this.pool || !this.isPostgresConnected) return;
    try {
      await this.pool.query(
        `INSERT INTO firex_production_store (collection, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (collection) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [collection, JSON.stringify(data)]
      );
    } catch (err) {
      console.error(`[DB] Failed to persist collection "${collection}" to PostgreSQL:`, err.message);
    }
  }

  get(collection) {
    return this.memory[collection] || [];
  }

  set(collection, data) {
    this.memory[collection] = data;
    this.saveLocal();
    this.persistToPostgres(collection, data);
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

  // Generate next unique Employee ID e.g. LAB-0001
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
      this.set('backup_logs', logs.slice(0, 50));

      return { success: true, filename, log };
    } catch (err) {
      console.error('[DB] Backup creation error:', err);
      return { success: false, error: err.message };
    }
  }

  restoreBackup(backupJsonData) {
    if (!backupJsonData || typeof backupJsonData !== 'object') {
      throw new Error('Invalid backup data format.');
    }
    const requiredKeys = ['users', 'employees', 'attendance', 'settings'];
    for (const key of requiredKeys) {
      if (!backupJsonData[key]) {
        throw new Error(`Corrupt backup: missing ${key} collection.`);
      }
    }

    // Save previous snapshot as safety before restoring
    this.createBackup();

    for (const [key, data] of Object.entries(backupJsonData)) {
      this.set(key, data);
    }
    return true;
  }

  setupAutoBackup() {
    setInterval(() => {
      const settings = this.get('settings') || {};
      if (settings.auto_backup_enabled !== false) {
        this.createBackup();
      }
    }, 24 * 60 * 60 * 1000);
  }

  getStatus() {
    const hasDbUrl = Boolean(process.env.DATABASE_URL);
    return {
      storage_type: this.isPostgresConnected ? 'PostgreSQL Cloud Database' : 'Local Container Storage',
      is_persistent: this.isPostgresConnected || Boolean(process.env.DATA_DIR),
      is_postgres_connected: this.isPostgresConnected,
      has_database_url: hasDbUrl,
      postgres_error: this.postgresError,
      data_dir: DATA_DIR,
      counts: {
        users: (this.memory.users || []).length,
        employees: (this.memory.employees || []).length,
        attendance: (this.memory.attendance || []).length,
        sites: (this.memory.sites || []).length,
        daily_schedules: (this.memory.daily_schedules || []).length,
        leaves: (this.memory.leaves || []).length,
        backups: (this.memory.backup_logs || []).length,
      },
    };
  }
}

export const db = new Database();
export default db;
