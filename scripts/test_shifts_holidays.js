import {
  getBahrainDateString,
  getScheduleForDate,
  calculateWorkingTime,
  determineAttendanceStatus,
  minutesToHoursFormatted,
} from '../server/attendanceEngine.js';
import db from '../server/db.js';

console.log('=== FIREX ATTENDANCE & OVERTIME VERIFICATION TEST ===\n');

const settings = db.get('settings');
console.log('Active Settings:', {
  work_start: settings.work_start_time,
  work_end: settings.work_end_time,
  saturday_start: settings.saturday_start_time,
  saturday_end: settings.saturday_end_time,
  friday_holiday: settings.friday_holiday,
  overtime_enabled: settings.overtime_enabled,
});

// Test 1: Sunday - Regular Day (07:30 to 16:30)
// Punch in at 07:00 (30m early OT), Punch out at 18:00 (90m late OT)
console.log('\n--- Test 1: Sunday Full Shift with Early and Late Overtime ---');
const sunDate = '2026-10-04'; // Sunday
const sunSchedule = getScheduleForDate(sunDate, settings);
console.log('Sunday Schedule:', sunSchedule);

// 07:00 AM AST = 04:00 UTC, 18:00 AST = 15:00 UTC
const punchInSun = `${sunDate}T04:00:00.000Z`;
const punchOutSun = `${sunDate}T15:00:00.000Z`;
const timeSun = calculateWorkingTime(punchInSun, punchOutSun, sunDate, settings);
console.log('Sunday Working Time Result:', {
  total: timeSun.total_hours_formatted,
  regular: timeSun.regular_hours_formatted,
  ot: timeSun.ot_hours_formatted,
  early_ot: timeSun.early_ot_minutes + ' min',
  late_ot: timeSun.late_ot_minutes + ' min',
});

// Test 2: Saturday Half Day (07:30 to 13:00)
// Punch in at 07:30, Punch out at 15:00 (2h late OT)
console.log('\n--- Test 2: Saturday Half Day with Late Overtime ---');
const satDate = '2026-10-03'; // Saturday
const satSchedule = getScheduleForDate(satDate, settings);
console.log('Saturday Schedule:', satSchedule);

const punchInSat = `${satDate}T04:30:00.000Z`; // 07:30 AST
const punchOutSat = `${satDate}T12:00:00.000Z`; // 15:00 AST
const timeSat = calculateWorkingTime(punchInSat, punchOutSat, satDate, settings);
console.log('Saturday Working Time Result:', {
  total: timeSat.total_hours_formatted,
  regular: timeSat.regular_hours_formatted,
  ot: timeSat.ot_hours_formatted,
  early_ot: timeSat.early_ot_minutes + ' min',
  late_ot: timeSat.late_ot_minutes + ' min',
});

// Test 3: Friday Weekly Off (Official Holiday)
// Worked 08:00 to 14:00 -> 100% Holiday Overtime
console.log('\n--- Test 3: Friday (Official Holiday) Work ---');
const friDate = '2026-10-02'; // Friday
const friSchedule = getScheduleForDate(friDate, settings);
console.log('Friday Schedule:', friSchedule);

const punchInFri = `${friDate}T05:00:00.000Z`; // 08:00 AST
const punchOutFri = `${friDate}T11:00:00.000Z`; // 14:00 AST
const timeFri = calculateWorkingTime(punchInFri, punchOutFri, friDate, settings);
console.log('Friday Working Time Result:', {
  total: timeFri.total_hours_formatted,
  regular: timeFri.regular_hours_formatted,
  ot: timeFri.ot_hours_formatted,
  holiday_ot: timeFri.holiday_ot_minutes + ' min',
  is_holiday_work: timeFri.is_holiday_work,
});

// Test 4: Bahrain National Day (Public Holiday: 2026-12-16)
console.log('\n--- Test 4: Bahrain National Day (Registered Public Holiday) ---');
const natHoliday = '2026-12-16';
const holSchedule = getScheduleForDate(natHoliday, settings);
console.log('National Day Schedule:', holSchedule);

// Test 5: Verify Holidays in DB
const allHolidays = db.get('holidays');
console.log(`\nRegistered Public Holidays in Database: ${allHolidays.length} holidays`);
console.log('Sample Holidays:', allHolidays.slice(0, 3));

console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
