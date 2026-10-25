import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import db from '../server/db.js';
import { generateMonthlyTimesheet } from '../server/timesheetGenerator.js';

const JWT_SECRET = process.env.JWT_SECRET || 'firex-attendance-secret-key-2026';

async function runTest() {
  console.log('--- STARTING TIMESHEET EXPORT VERIFICATION TEST ---');

  // 1. Create a test employee in memory or check existing
  const testEmployee = {
    id: 'emp-test-bala',
    employee_id: 'LAB-0888',
    full_name: 'Balaraju D',
    username: 'bala0888',
    department: 'Maintenance',
    designation: 'Maintenance Technician',
    site_id: 'site-ho',
    site_name: 'FIREX Main Workshop & HQ',
    supervisor_id: 'usr-eng',
    supervisor_name: 'HASAN ZULAIKH',
    status: 'Active',
    joining_date: '2026-01-01',
  };

  // 2. Prepare realistic attendance records for September 2026 (30 days)
  // Let's create:
  // - Day 1 (Tue): 07:30 to 16:30 (9 hrs, 0 OT)
  // - Day 2 (Wed): 07:30 to 18:30 (11 hrs, 2 hrs OT)
  // - Day 4 (Fri): Friday weekly off (no punch)
  // - Day 5 (Sat): 07:30 to 13:00 (5.5 hrs, Saturday shift)
  // - Day 8 (Tue): Punched in at 07:30, NO punch out (Missing checkout!)
  // - Day 11 (Fri): Worked Friday! 08:00 to 12:00 (4 hrs OT)
  const testAttendance = [
    {
      attendance_date: '2026-09-01',
      employee_id: testEmployee.employee_id,
      punch_in: '2026-09-01T04:30:00.000Z',
      punch_out: '2026-09-01T13:30:00.000Z',
      punch_in_display: '07:30 AM',
      punch_out_display: '04:30 PM',
      total_minutes: 540,
      regular_minutes: 540,
      ot_minutes: 0,
      site_name: 'Maintenance',
      status: 'Present',
    },
    {
      attendance_date: '2026-09-02',
      employee_id: testEmployee.employee_id,
      punch_in: '2026-09-02T04:30:00.000Z',
      punch_out: '2026-09-02T15:30:00.000Z',
      punch_in_display: '07:30 AM',
      punch_out_display: '06:30 PM',
      total_minutes: 660,
      regular_minutes: 540,
      ot_minutes: 120,
      site_name: 'Maintenance',
      status: 'Present',
    },
    {
      attendance_date: '2026-09-05', // Saturday
      employee_id: testEmployee.employee_id,
      punch_in: '2026-09-05T04:30:00.000Z',
      punch_out: '2026-09-05T10:00:00.000Z',
      punch_in_display: '07:30 AM',
      punch_out_display: '01:00 PM',
      total_minutes: 330,
      regular_minutes: 330,
      ot_minutes: 0,
      site_name: 'Maintenance',
      status: 'Present',
    },
    {
      attendance_date: '2026-09-08', // Missing checkout
      employee_id: testEmployee.employee_id,
      punch_in: '2026-09-08T04:30:00.000Z',
      punch_out: null,
      punch_in_display: '07:30 AM',
      punch_out_display: null,
      total_minutes: 0,
      regular_minutes: 0,
      ot_minutes: 0,
      site_name: 'Maintenance',
      status: 'Punched In',
    },
    {
      attendance_date: '2026-09-11', // Friday worked!
      employee_id: testEmployee.employee_id,
      punch_in: '2026-09-11T05:00:00.000Z',
      punch_out: '2026-09-11T09:00:00.000Z',
      punch_in_display: '08:00 AM',
      punch_out_display: '12:00 PM',
      total_minutes: 240,
      regular_minutes: 0,
      ot_minutes: 240,
      site_name: 'Maintenance',
      status: 'Present',
    },
  ];

  // 3. Generate Timesheet for September 2026
  const resultSept = await generateMonthlyTimesheet({
    employee: testEmployee,
    month: 9,
    year: 2026,
    attendanceRecords: testAttendance,
  });

  console.log('✓ Timesheet generated successfully:');
  console.log('  Filename:', resultSept.filename);
  console.log('  Buffer size:', resultSept.buffer.length, 'bytes');

  // Verify filename
  if (resultSept.filename !== 'FIREX_Balaraju_D_September_2026.xlsx') {
    throw new Error(`Unexpected filename: ${resultSept.filename}`);
  }
  console.log('✓ Filename matches format: FIREX_Balaraju_D_September_2026.xlsx');

  // 4. Inspect generated workbook contents
  const verifyWb = new ExcelJS.Workbook();
  await verifyWb.xlsx.load(resultSept.buffer);
  const ws = verifyWb.worksheets[0];

  console.log('✓ Sheet name:', ws.name);

  // Check Title
  const title = ws.getCell('B6').value;
  console.log('✓ Title (B6):', JSON.stringify(title));
  if (!String(title).includes('Monthly Employee  Timesheet')) {
    throw new Error(`Title mismatch in B6: ${title}`);
  }

  // Check Employee Name & ID
  const empCell = ws.getCell('C8').value;
  console.log('✓ Employee (C8):', JSON.stringify(empCell));
  if (!String(empCell).includes('BALARAJU D') || !String(empCell).includes('LAB-0888')) {
    throw new Error(`Employee info mismatch in C8: ${empCell}`);
  }

  // Check Month in G8
  const monthCell = ws.getCell('G8').value;
  console.log('✓ Month date (G8):', monthCell);

  // Check Supervisor in C10
  const supCell = ws.getCell('C10').value;
  console.log('✓ Supervisor (C10):', JSON.stringify(supCell));
  if (supCell !== 'HASAN ZULAIKH') {
    throw new Error(`Supervisor mismatch in C10: ${supCell}`);
  }

  // Check Regular Hours in G10
  const regHrsCell = ws.getCell('G10').value;
  console.log('✓ Regular Hours (G10):', regHrsCell);
  if (regHrsCell !== 9) {
    throw new Error(`Regular hours mismatch in G10: ${regHrsCell}`);
  }

  // Check Table Headers in Row 12
  const headers = ['B12', 'C12', 'D12', 'E12', 'F12', 'G12'].map((addr) => ws.getCell(addr).value);
  console.log('✓ Table Headers (Row 12):', headers.join(' | '));

  // Check Day 1 (Row 13: 2026-09-01)
  console.log('✓ Day 1 (Row 13):');
  console.log('  Date (B13):', ws.getCell('B13').value);
  console.log('  Start Time (C13):', ws.getCell('C13').value);
  console.log('  Finish Time (D13):', ws.getCell('D13').value);
  console.log('  Overtime (E13):', ws.getCell('E13').value);
  console.log('  Project (F13):', ws.getCell('F13').value);
  console.log('  Total Hours (G13):', ws.getCell('G13').value);

  // Check Day 4 (Row 16: Friday Off)
  const friVal = ws.getCell('C16').value;
  console.log('✓ Day 4 Friday Off (C16):', friVal);
  if (friVal !== 'FRIDAY') {
    throw new Error(`Expected Friday off cell to be 'FRIDAY', got: ${friVal}`);
  }

  // Check Day 8 (Row 20: Missing Checkout)
  console.log('✓ Day 8 Missing Checkout (Row 20):');
  console.log('  Start Time (C20):', ws.getCell('C20').value);
  console.log('  Finish Time (D20):', ws.getCell('D20').value);
  console.log('  Total Hours (G20):', ws.getCell('G20').value);
  if (ws.getCell('D20').value !== null) {
    throw new Error(`Expected Finish Time to be null for missing checkout, got: ${ws.getCell('D20').value}`);
  }
  if (ws.getCell('G20').value !== null) {
    throw new Error(`Expected Total Hours to be null for missing checkout, got: ${ws.getCell('G20').value}`);
  }

  // Check Day 11 (Row 23: Friday Worked)
  console.log('✓ Day 11 Friday Worked (Row 23):');
  console.log('  Start Time (C23):', ws.getCell('C23').value);
  console.log('  Finish Time (D23):', ws.getCell('D23').value);
  console.log('  Total Hours (G23):', ws.getCell('G23').value);
  console.log('  Overtime (E23):', ws.getCell('E23').value);

  // Check Summary Rows (Row 43 onwards)
  console.log('✓ Summary Section:');
  console.log('  B43:', ws.getCell('B43').value, 'C43:', ws.getCell('C43').value);
  console.log('  B44:', ws.getCell('B44').value, 'C44:', ws.getCell('C44').value);
  console.log('  B45:', ws.getCell('B45').value, 'C45:', ws.getCell('C45').value);
  console.log('  B49:', ws.getCell('B49').value, 'E49:', ws.getCell('E49').value);

  // 5. Test 31-day month (October 2026)
  const resultOct = await generateMonthlyTimesheet({
    employee: testEmployee,
    month: 10,
    year: 2026,
    attendanceRecords: [],
  });
  console.log('✓ October 2026 (31 days):', resultOct.filename, 'Days in month:', resultOct.daysInMonth);
  if (resultOct.filename !== 'FIREX_Balaraju_D_October_2026.xlsx') {
    throw new Error(`Unexpected filename for Oct: ${resultOct.filename}`);
  }

  console.log('\n========================================');
  console.log('ALL TIMESHEET EXPORT VERIFICATION TESTS PASSED!');
  console.log('========================================');
}

runTest().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
