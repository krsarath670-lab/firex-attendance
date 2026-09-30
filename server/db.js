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
        name: 'David Chen, PE',
        email: 'engineer@firex.com',
        username: 'engineer',
        password_hash: adminPassHash,
        phone: '+973 3822 3344',
        role: 'ENGINEER',
        employee_id: 'ENG-0001',
        status: 'Active',
        created_at: '2026-01-01T08:00:00.000Z',
        updated_at: '2026-01-01T08:00:00.000Z',
      },
      {
        id: 'usr-sup',
        name: 'Tariq Mahmoud',
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
      {
        id: 'usr-admin-hr',
        name: 'Fatima Al-Sayed',
        email: 'hr@firex.com',
        username: 'admin.hr',
        password_hash: adminPassHash,
        phone: '+973 3944 5566',
        role: 'ADMIN',
        employee_id: 'ADM-0001',
        status: 'Active',
        created_at: '2026-01-01T08:00:00.000Z',
        updated_at: '2026-01-01T08:00:00.000Z',
      },
      {
        id: 'usr-lab-1',
        name: 'Mohammed Ali',
        email: 'labour1@firex.com',
        username: 'labour1',
        password_hash: labourPassHash,
        phone: '+973 3501 2233',
        role: 'LABOUR',
        employee_id: 'LAB-0001',
        status: 'Active',
        created_at: '2026-01-10T08:00:00.000Z',
        updated_at: '2026-01-10T08:00:00.000Z',
      },
      {
        id: 'usr-lab-2',
        name: 'Rajesh Kumar',
        email: 'labour2@firex.com',
        username: 'labour2',
        password_hash: labourPassHash,
        phone: '+973 3502 4455',
        role: 'LABOUR',
        employee_id: 'LAB-0002',
        status: 'Active',
        created_at: '2026-01-12T08:00:00.000Z',
        updated_at: '2026-01-12T08:00:00.000Z',
      },
      {
        id: 'usr-lab-3',
        name: 'Suresh Patel',
        email: 'labour3@firex.com',
        username: 'labour3',
        password_hash: labourPassHash,
        phone: '+973 3503 6677',
        role: 'LABOUR',
        employee_id: 'LAB-0003',
        status: 'Active',
        created_at: '2026-01-15T08:00:00.000Z',
        updated_at: '2026-01-15T08:00:00.000Z',
      },
      {
        id: 'usr-lab-4',
        name: 'Bilal Hussain',
        email: 'labour4@firex.com',
        username: 'labour4',
        password_hash: labourPassHash,
        phone: '+973 3504 8899',
        role: 'LABOUR',
        employee_id: 'LAB-0004',
        status: 'Active',
        created_at: '2026-02-01T08:00:00.000Z',
        updated_at: '2026-02-01T08:00:00.000Z',
      },
    ],
    employees: [
      {
        id: 'emp-1',
        user_id: 'usr-lab-1',
        employee_id: 'LAB-0001',
        full_name: 'Mohammed Ali',
        mobile: '+973 3501 2233',
        email: 'labour1@firex.com',
        department: 'Field Operations',
        designation: 'Piping & Fitting Labour',
        supervisor_id: 'usr-sup',
        supervisor_name: 'Tariq Mahmoud',
        site_id: 'site-1',
        site_name: 'FIREX Main Workshop & HQ',
        joining_date: '2026-01-10',
        status: 'Active',
        remarks: 'Senior piping technician assistant',
        created_at: '2026-01-10T08:00:00.000Z',
        updated_at: '2026-01-10T08:00:00.000Z',
      },
      {
        id: 'emp-2',
        user_id: 'usr-lab-2',
        employee_id: 'LAB-0002',
        full_name: 'Rajesh Kumar',
        mobile: '+973 3502 4455',
        email: 'labour2@firex.com',
        department: 'Field Operations',
        designation: 'Welding & Fabrication Labour',
        supervisor_id: 'usr-sup',
        supervisor_name: 'Tariq Mahmoud',
        site_id: 'site-2',
        site_name: 'Project ABC - Commercial Tower',
        joining_date: '2026-01-12',
        status: 'Active',
        remarks: 'Welding assistant on project ABC',
        created_at: '2026-01-12T08:00:00.000Z',
        updated_at: '2026-01-12T08:00:00.000Z',
      },
      {
        id: 'emp-3',
        user_id: 'usr-lab-3',
        employee_id: 'LAB-0003',
        full_name: 'Suresh Patel',
        mobile: '+973 3503 6677',
        email: 'labour3@firex.com',
        department: 'Maintenance & Service',
        designation: 'Extinguisher Refilling Labour',
        supervisor_id: 'usr-sup',
        supervisor_name: 'Tariq Mahmoud',
        site_id: 'site-1',
        site_name: 'FIREX Main Workshop & HQ',
        joining_date: '2026-01-15',
        status: 'Active',
        remarks: 'Workshop helper',
        created_at: '2026-01-15T08:00:00.000Z',
        updated_at: '2026-01-15T08:00:00.000Z',
      },
      {
        id: 'emp-4',
        user_id: 'usr-lab-4',
        employee_id: 'LAB-0004',
        full_name: 'Bilal Hussain',
        mobile: '+973 3504 8899',
        email: 'labour4@firex.com',
        department: 'Field Operations',
        designation: 'Electrical Conduit Labour',
        supervisor_id: 'usr-sup',
        supervisor_name: 'Tariq Mahmoud',
        site_id: 'site-3',
        site_name: 'Customer XYZ Industrial Plant',
        joining_date: '2026-02-01',
        status: 'Active',
        remarks: 'Industrial fire alarm cable puller',
        created_at: '2026-02-01T08:00:00.000Z',
        updated_at: '2026-02-01T08:00:00.000Z',
      },
    ],
    attendance: [
      {
        id: 'att-sample-1',
        employee_id: 'LAB-0001',
        user_id: 'usr-lab-1',
        employee_name: 'Mohammed Ali',
        site_id: 'site-1',
        site_name: 'FIREX Main Workshop & HQ',
        supervisor_id: 'usr-sup',
        supervisor_name: 'Tariq Mahmoud',
        attendance_date: '2026-09-27',
        punch_in: '2026-09-27T04:00:00.000Z',
        punch_out: '2026-09-27T14:05:00.000Z',
        punch_in_display: '07:00 AM',
        punch_out_display: '05:05 PM',
        status: 'Present',
        total_minutes: 605,
        total_hours_formatted: '10h 05m',
        punch_in_latitude: 26.2415,
        punch_in_longitude: 50.5368,
        punch_in_accuracy: 12.5,
        punch_out_latitude: 26.2416,
        punch_out_longitude: 50.5369,
        punch_out_accuracy: 15.0,
        device_info: 'Chrome Mobile / Android 14',
        client_event_id: 'evt-init-001',
        is_manual: false,
        sync_status: 'SYNCED',
        tamper_flag: false,
        created_at: '2026-09-27T04:00:00.000Z',
        updated_at: '2026-09-27T14:05:00.000Z',
      },
      {
        id: 'att-sample-2',
        employee_id: 'LAB-0002',
        user_id: 'usr-lab-2',
        employee_name: 'Rajesh Kumar',
        site_id: 'site-2',
        site_name: 'Project ABC - Commercial Tower',
        supervisor_id: 'usr-sup',
        supervisor_name: 'Tariq Mahmoud',
        attendance_date: '2026-09-27',
        punch_in: '2026-09-27T04:25:00.000Z',
        punch_out: '2026-09-27T14:00:00.000Z',
        punch_in_display: '07:25 AM',
        punch_out_display: '05:00 PM',
        status: 'Present - Late',
        total_minutes: 575,
        total_hours_formatted: '9h 35m',
        punch_in_latitude: 26.2361,
        punch_in_longitude: 50.5831,
        punch_in_accuracy: 10.0,
        punch_out_latitude: 26.2360,
        punch_out_longitude: 50.5830,
        punch_out_accuracy: 11.0,
        device_info: 'Safari / iPhone 15',
        client_event_id: 'evt-init-002',
        is_manual: false,
        sync_status: 'SYNCED',
        tamper_flag: false,
        created_at: '2026-09-27T04:25:00.000Z',
        updated_at: '2026-09-27T14:00:00.000Z',
      },
    ],
    leaves: [
      {
        id: 'leave-sample-1',
        employee_id: 'LAB-0003',
        employee_name: 'Suresh Patel',
        user_id: 'usr-lab-3',
        leave_type: 'Annual Leave',
        start_date: '2026-10-05',
        end_date: '2026-10-09',
        total_days: 5,
        reason: 'Annual family vacation',
        status: 'Pending',
        reviewed_by: null,
        reviewed_by_name: null,
        reviewed_at: null,
        rejection_reason: null,
        created_at: '2026-09-28T09:00:00.000Z',
        updated_at: '2026-09-28T09:00:00.000Z',
      },
    ],
    attendance_corrections: [],
    attendance_audit: [
      {
        id: 'aud-1',
        attendance_id: 'att-sample-1',
        employee_id: 'LAB-0001',
        action: 'ATTENDANCE_CREATED',
        old_value: null,
        new_value: { punch_in: '07:00 AM', status: 'Present' },
        reason: 'Initial punch in on mobile',
        changed_by: 'usr-lab-1',
        changed_by_name: 'Mohammed Ali (Labour)',
        changed_at: '2026-09-27T04:00:00.000Z',
      },
    ],
    backup_logs: [
      {
        id: 'bak-init',
        filename: 'attendance_database_init.json',
        records_count: 7,
        size_bytes: 4096,
        created_at: '2026-01-01T00:00:00.000Z',
        status: 'SUCCESS',
      },
    ],
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
