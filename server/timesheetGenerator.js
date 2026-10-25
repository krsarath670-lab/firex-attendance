import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import db from './db.js';
import { getScheduleForDate, calculateWorkingTime, formatBahrainTime } from './attendanceEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Convert time string HH:MM:SS or Date/ISO into { hours, minutes, seconds }
 */
function parseTimeComponents(isoOrDisplay) {
  if (!isoOrDisplay) return null;
  // If ISO string like "2026-09-01T07:30:00.000Z"
  if (typeof isoOrDisplay === 'string' && isoOrDisplay.includes('T')) {
    const d = new Date(isoOrDisplay);
    // Convert to Bahrain time (UTC+3)
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const bDate = new Date(utc + 3600000 * 3);
    return {
      hours: bDate.getHours(),
      minutes: bDate.getMinutes(),
      seconds: bDate.getSeconds()
    };
  }
  // If display format like "07:30 AM" or "4:30 PM"
  if (typeof isoOrDisplay === 'string' && (isoOrDisplay.includes('AM') || isoOrDisplay.includes('PM'))) {
    const [time, modifier] = isoOrDisplay.trim().split(/\s+/);
    let [h, m] = time.split(':').map(Number);
    if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
    if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
    return { hours: h, minutes: m || 0, seconds: 0 };
  }
  return null;
}

/**
 * Create Excel time Date object (1899-12-30THH:MM:SS) for native Excel time display & formulas
 */
function toExcelTimeDate(hours, minutes, seconds = 0) {
  const d = new Date(1899, 11, 30, hours, minutes, seconds);
  return d;
}

/**
 * Generate Individual Monthly Employee Timesheet matching "Attendance Sheet.xlsx"
 *
 * @param {Object} params
 * @param {Object} params.employee - Employee record from database
 * @param {number} params.month - 1 to 12
 * @param {number} params.year - e.g. 2026
 * @param {Array} [params.attendanceRecords] - Optional preloaded attendance records
 * @returns {Promise<{ workbook: ExcelJS.Workbook, filename: string, buffer: Buffer }>}
 */
export async function generateMonthlyTimesheet({ employee, month, year, attendanceRecords = null }) {
  if (!employee) throw new Error('Employee record is required');
  const targetYear = parseInt(year, 10);
  const targetMonth = parseInt(month, 10);
  if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
    throw new Error('Valid month (1-12) and year are required');
  }

  const monthName = MONTH_NAMES[targetMonth - 1];
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  const settings = db.get('settings') || {};

  // Fetch actual attendance records from database if not provided
  let records = attendanceRecords;
  if (!records) {
    const allAttendance = db.filter('attendance', (a) =>
      a.employee_id === employee.employee_id && a.attendance_date?.startsWith(monthPrefix)
    );
    records = allAttendance;
  }

  // Load template from server/templates/Attendance Sheet.xlsx
  const templatePath = path.join(__dirname, 'templates', 'Attendance Sheet.xlsx');
  const wb = new ExcelJS.Workbook();

  let usedTemplate = false;
  if (fs.existsSync(templatePath)) {
    try {
      await wb.xlsx.readFile(templatePath);
      usedTemplate = true;
    } catch (err) {
      console.warn('[Timesheet] Could not load template file directly, constructing from layout spec:', err.message);
    }
  }

  const ws = usedTemplate ? wb.worksheets[0] : wb.addWorksheet('Timesheet');

  // Sheet name: Employee full name (Excel max 31 chars, no special chars)
  const safeSheetName = (employee.full_name || 'Timesheet')
    .replace(/[\\/?*\[\]:]/g, '')
    .trim()
    .substring(0, 31);
  try {
    ws.name = safeSheetName;
  } catch (e) {
    ws.name = 'Timesheet';
  }

  // If using template, adjust rows for the selected month's length
  // Original template has 30 days (Sept 2026: rows 13 to 42)
  if (usedTemplate) {
    // 1. Unmerge all old template Friday / data row merges between rows 13 and 45
    const existingMerges = [...(ws.model.merges || [])];
    for (const mergeRange of existingMerges) {
      const match = mergeRange.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      if (match) {
        const startR = parseInt(match[2], 10);
        const endR = parseInt(match[4], 10);
        if (startR >= 13 && endR <= 43 && match[1] === 'C' && match[3] === 'G') {
          try {
            ws.unMergeCells(mergeRange);
          } catch (e) {
            // Ignore if already unmerged
          }
        }
      }
    }

    // 2. Adjust row count to match daysInMonth
    if (daysInMonth === 31) {
      // Need 1 extra row after row 42 (Day 31 will be row 43)
      ws.spliceRows(43, 0, []);
      const r42 = ws.getRow(42);
      const r43 = ws.getRow(43);
      r43.height = r42.height || 28.5;
      for (let c = 1; c <= 15; c++) {
        const src = r42.getCell(c);
        const dst = r43.getCell(c);
        dst.style = JSON.parse(JSON.stringify(src.style));
      }
    } else if (daysInMonth === 28) {
      // Remove 2 rows (days 29 and 30)
      ws.spliceRows(41, 2);
    } else if (daysInMonth === 29) {
      // Remove 1 row (day 30)
      ws.spliceRows(42, 1);
    }
  }

  // ----------------------------------------------------
  // POPULATE HEADER (Rows 6, 8, 10, 12)
  // ----------------------------------------------------
  // Title in B6
  const titleCell = ws.getCell('B6');
  titleCell.value = '                          Monthly Employee  Timesheet';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF296487' }, name: 'Verdana' };
  titleCell.alignment = { vertical: 'middle' };

  // Employee Name & ID in C8
  ws.getCell('B8').value = 'EMPLOYEE:';
  ws.getCell('B8').font = { bold: true, size: 9, color: { argb: 'FF495057' }, name: 'Verdana' };

  const empDisplay = `${(employee.full_name || '').toUpperCase()} (${employee.employee_id})`;
  ws.getCell('C8').value = empDisplay;
  ws.getCell('C8').font = { size: 10, bold: true, color: { argb: 'FF212529' }, name: 'Times New Roman' };

  // Month date in G8 (first day of the month)
  const monthStartObj = new Date(targetYear, targetMonth - 1, 1);
  ws.getCell('G8').value = monthStartObj;
  ws.getCell('G8').numFmt = 'm/d/yy';
  ws.getCell('G8').font = { bold: true, size: 10, color: { argb: 'FF212529' }, name: 'Verdana' };

  // Supervisor in C10
  ws.getCell('B10').value = 'SUPERVISOR:';
  ws.getCell('B10').font = { bold: true, size: 9, color: { argb: 'FF495057' }, name: 'Verdana' };
  ws.getCell('C10').value = employee.supervisor_name || 'Unassigned';
  ws.getCell('C10').font = { size: 10, bold: true, color: { argb: 'FF212529' }, name: 'Verdana' };

  // Regular Hours in F10 & G10
  ws.getCell('F10').value = 'REGULAR HRS';
  ws.getCell('F10').font = { bold: true, size: 9, color: { argb: 'FF495057' }, name: 'Verdana' };
  ws.getCell('G10').value = 9;
  ws.getCell('G10').numFmt = '#,##0.00';
  ws.getCell('G10').font = { bold: true, size: 10, color: { argb: 'FF212529' }, name: 'Verdana' };

  // Table Column Headers in Row 12
  const headers = [
    { col: 'B', text: 'Date' },
    { col: 'C', text: 'Start time' },
    { col: 'D', text: 'Finish time' },
    { col: 'E', text: 'Overtime' },
    { col: 'F', text: 'Project Name ' },
    { col: 'G', text: 'Total Hours' },
  ];
  headers.forEach((h) => {
    const cell = ws.getCell(`${h.col}12`);
    cell.value = h.text;
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' }, name: 'Verdana' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B8FC2' },
      bgColor: { argb: 'FF3B8FC2' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // ----------------------------------------------------
  // POPULATE ATTENDANCE TABLE (Row 13 to 12 + daysInMonth)
  // ----------------------------------------------------
  let totalWorkingDays = 0;
  let totalOvertimeMinutes = 0;
  let totalAbsenceDays = 0;
  let missingPunchRecords = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const rowIdx = 12 + d;
    const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(targetYear, targetMonth - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat

    const schedule = getScheduleForDate(dateStr, settings);
    const isFriday = dayOfWeek === 5;

    // Check actual attendance record from database
    const attRecord = records.find((r) => r.attendance_date === dateStr);

    const cellB = ws.getCell(`B${rowIdx}`);
    const cellC = ws.getCell(`C${rowIdx}`);
    const cellD = ws.getCell(`D${rowIdx}`);
    const cellE = ws.getCell(`E${rowIdx}`);
    const cellF = ws.getCell(`F${rowIdx}`);
    const cellG = ws.getCell(`G${rowIdx}`);
    const cellI = ws.getCell(`I${rowIdx}`);

    // Set Date in column B
    cellB.value = dateObj;
    cellB.numFmt = 'ddd", "d" "mmm" "';
    cellB.font = { bold: true, size: 10, color: { argb: 'FF495057' }, name: 'Verdana' };
    cellB.alignment = { horizontal: 'right', vertical: 'middle' };

    // Standard Shift in Helper Column I
    // Sunday - Thursday = 9:00:00 (0.375), Saturday = 5:30:00 (0.22916667), Friday = 0
    let standardFraction = 0.375;
    if (isFriday) {
      standardFraction = 0;
    } else if (dayOfWeek === 6) {
      standardFraction = 5.5 / 24;
    }
    cellI.value = {
      formula: `IF(WEEKDAY(B${rowIdx},2)=5,0,IF(WEEKDAY(B${rowIdx},2)=6,TIME(5,30,0),TIME(9,0,0)))`,
      result: toExcelTimeDate(
        Math.floor(standardFraction * 24),
        Math.round((standardFraction * 24 - Math.floor(standardFraction * 24)) * 60)
      ),
    };
    cellI.numFmt = '[$-14C09]hh:mm:ss;@';

    // 1. Case: Friday Weekly Off & NOT Worked
    if (isFriday && (!attRecord || (!attRecord.punch_in && !attRecord.punch_out))) {
      // Merge C to G and display "FRIDAY"
      try {
        ws.mergeCells(`C${rowIdx}:G${rowIdx}`);
      } catch (e) {}

      const masterCell = ws.getCell(`C${rowIdx}`);
      masterCell.value = 'FRIDAY';
      masterCell.font = { bold: true, size: 10, color: { argb: 'FFFF0000' }, name: 'Verdana' };
      masterCell.alignment = { horizontal: 'center', vertical: 'middle' };
      masterCell.fill = { type: 'pattern', pattern: 'none' };
      continue;
    }

    // If previously merged (from template), make sure it's unmerged for data entry
    try {
      ws.unMergeCells(`C${rowIdx}:G${rowIdx}`);
    } catch (e) {}

    // 2. Case: Worked Day (Punched in)
    if (attRecord && attRecord.punch_in) {
      const inTime = parseTimeComponents(attRecord.punch_in) || parseTimeComponents(attRecord.punch_in_display);
      const outTime = attRecord.punch_out
        ? parseTimeComponents(attRecord.punch_out) || parseTimeComponents(attRecord.punch_out_display)
        : null;

      // Start Time (Column C)
      if (inTime) {
        cellC.value = toExcelTimeDate(inTime.hours, inTime.minutes, inTime.seconds);
        cellC.numFmt = '[$-10409]h:mm AM/PM;@';
        cellC.font = { bold: true, size: 10, color: { argb: 'FF1F497D' }, name: 'Verdana' };
        cellC.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cellC.value = attRecord.punch_in_display || null;
      }

      // Finish Time (Column D)
      if (outTime) {
        cellD.value = toExcelTimeDate(outTime.hours, outTime.minutes, outTime.seconds);
        cellD.numFmt = '[$-10409]h:mm AM/PM;@';
        cellD.font = { bold: true, size: 10, color: { argb: 'FF1F497D' }, name: 'Verdana' };
        cellD.alignment = { horizontal: 'center', vertical: 'middle' };

        // Both punched in and punched out -> calculate total hours
        totalWorkingDays += 1;

        // Calculate hours and overtime using company rules
        const calc = calculateWorkingTime(attRecord.punch_in, attRecord.punch_out, dateStr, settings);
        const totalMins = calc.total_minutes || attRecord.total_minutes || 0;
        const otMins = calc.ot_minutes !== undefined ? calc.ot_minutes : (attRecord.ot_minutes || 0);

        totalOvertimeMinutes += otMins;

        const totalHoursFraction = totalMins / 1440;
        const otFraction = otMins / 1440;

        // Total Hours (Column G)
        cellG.value = {
          formula: `D${rowIdx}-C${rowIdx}`,
          result: toExcelTimeDate(Math.floor(totalMins / 60), totalMins % 60),
        };
        cellG.numFmt = '[$-14C09]hh:mm;@';
        cellG.font = { bold: true, size: 10, color: { argb: 'FF0070C0' }, name: 'Verdana' };
        cellG.alignment = { horizontal: 'center', vertical: 'middle' };
        cellG.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCEEFA' },
          bgColor: { argb: 'FFDCEEFA' },
        };

        // Overtime (Column E)
        if (isFriday || schedule.is_holiday) {
          // On Friday or Holiday, 100% of working time is overtime
          cellE.value = {
            formula: `G${rowIdx}`,
            result: toExcelTimeDate(Math.floor(otMins / 60), otMins % 60),
          };
        } else {
          cellE.value = {
            formula: `MAX(0,G${rowIdx}-I${rowIdx})`,
            result: toExcelTimeDate(Math.floor(otMins / 60), otMins % 60),
          };
        }
        cellE.numFmt = '[$-14C09]hh:mm:ss;@';
        cellE.font = { bold: true, size: 10, color: { argb: 'FF0070C0' }, name: 'Verdana' };
        cellE.alignment = { horizontal: 'center', vertical: 'middle' };
        cellE.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F3F3' },
          bgColor: { argb: 'FFF3F3F3' },
        };
      } else {
        // Missing check-out!
        missingPunchRecords += 1;
        cellD.value = null; // Do not invent checkout time!
        cellG.value = null; // Do not count missing check-outs as completed working hours!
        cellE.value = 0;
        cellE.numFmt = '[$-14C09]hh:mm:ss;@';
        cellE.font = { bold: true, size: 10, color: { argb: 'FF6C757D' }, name: 'Verdana' };
        cellE.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Project Name (Column F)
      cellF.value = attRecord.site_name || employee.site_name || 'Maintenance';
      cellF.font = { bold: true, size: 8, color: { argb: 'FF212529' }, name: 'Verdana' };
      cellF.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      // 3. Case: Absent on regular workday
      if (!isFriday && !schedule.is_holiday) {
        totalAbsenceDays += 1;
      }
      cellC.value = null;
      cellD.value = null;
      cellE.value = 0;
      cellE.numFmt = '[$-14C09]hh:mm:ss;@';
      cellE.font = { bold: true, size: 10, color: { argb: 'FF6C757D' }, name: 'Verdana' };
      cellE.alignment = { horizontal: 'center', vertical: 'middle' };
      cellF.value = null;
      cellG.value = null;
    }
  }

  // ----------------------------------------------------
  // SUMMARY SECTION (Below Day Rows)
  // ----------------------------------------------------
  const endDataRow = 12 + daysInMonth;
  const sumRow1 = endDataRow + 1; // Total Working DAYS
  const sumRow2 = endDataRow + 2; // TOTAL WORKING OVERTIME HOURS
  const sumRow3 = endDataRow + 3; // TOTAL ABSENCE DAYS
  const sumRow4 = endDataRow + 4; // TOTAL NATIONAL DAYS (PAID)
  const sumRow5 = endDataRow + 5; // Total Approved Sick leave
  const sumRow7 = endDataRow + 7; // Signatures

  // Total Working Days
  const cellSumDaysB = ws.getCell(`B${sumRow1}`);
  cellSumDaysB.value = 'Total Working DAYS ';
  cellSumDaysB.font = { bold: true, size: 9, name: 'Verdana' };
  cellSumDaysB.alignment = { horizontal: 'right', vertical: 'middle' };
  cellSumDaysB.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDCEEFA' },
    bgColor: { argb: 'FFDCEEFA' },
  };

  const cellSumDaysC = ws.getCell(`C${sumRow1}`);
  cellSumDaysC.value = {
    formula: `COUNT(D13:D${endDataRow})`,
    result: totalWorkingDays,
  };
  cellSumDaysC.font = { bold: true, size: 10, color: { argb: 'FF495057' }, name: 'Verdana' };
  cellSumDaysC.alignment = { horizontal: 'center', vertical: 'middle' };

  // Total Working Overtime Hours
  const cellSumOtB = ws.getCell(`B${sumRow2}`);
  cellSumOtB.value = 'TOTAL WORKING  OVERTIME HOURS  ';
  cellSumOtB.font = { bold: true, size: 9, name: 'Verdana' };
  cellSumOtB.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  const cellSumOtC = ws.getCell(`C${sumRow2}`);
  const totalOtHours = Math.floor(totalOvertimeMinutes / 60);
  const totalOtRemainingMinutes = totalOvertimeMinutes % 60;
  cellSumOtC.value = {
    formula: `SUM(E13:E${endDataRow})`,
    result: toExcelTimeDate(totalOtHours % 24, totalOtRemainingMinutes),
  };
  cellSumOtC.numFmt = '[h]:mm:ss';
  cellSumOtC.font = { bold: true, size: 10, color: { argb: 'FF1F497D' }, name: 'Verdana' };
  cellSumOtC.alignment = { horizontal: 'center', vertical: 'middle' };

  // Remarks / Approval in D(sumRow2)
  const cellSumRemD = ws.getCell(`D${sumRow2}`);
  cellSumRemD.value = 'Final Approval & Remarks';
  cellSumRemD.font = { bold: true, size: 9, color: { argb: 'FF495057' }, name: 'Verdana' };
  cellSumRemD.alignment = { horizontal: 'center', vertical: 'middle' };

  // Total Absence Days
  const cellSumAbsB = ws.getCell(`B${sumRow3}`);
  cellSumAbsB.value = 'TOTAL ABSENCE DAYS ';
  cellSumAbsB.font = { bold: true, size: 9, name: 'Verdana' };
  cellSumAbsB.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellSumAbsC = ws.getCell(`C${sumRow3}`);
  cellSumAbsC.value = totalAbsenceDays;
  cellSumAbsC.font = { bold: true, size: 10, color: { argb: 'FF495057' }, name: 'Verdana' };
  cellSumAbsC.alignment = { horizontal: 'center', vertical: 'middle' };

  // Total National Days (Paid)
  const cellSumNatB = ws.getCell(`B${sumRow4}`);
  cellSumNatB.value = 'TOTAL NATIONAL DAYS (PAID)';
  cellSumNatB.font = { bold: true, size: 9, name: 'Verdana' };
  cellSumNatB.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellSumNatC = ws.getCell(`C${sumRow4}`);
  cellSumNatC.value = 0;
  cellSumNatC.font = { bold: true, size: 10, color: { argb: 'FF495057' }, name: 'Verdana' };
  cellSumNatC.alignment = { horizontal: 'center', vertical: 'middle' };

  // Total Approved Sick Leave
  const cellSumSickB = ws.getCell(`B${sumRow5}`);
  cellSumSickB.value = 'Total Approved Sick leave ';
  cellSumSickB.font = { bold: true, size: 9, name: 'Verdana' };
  cellSumSickB.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellSumSickC = ws.getCell(`C${sumRow5}`);
  cellSumSickC.value = 0;
  cellSumSickC.font = { bold: true, size: 10, color: { argb: 'FF495057' }, name: 'Verdana' };
  cellSumSickC.alignment = { horizontal: 'center', vertical: 'middle' };

  // Signatures
  const cellSigEmp = ws.getCell(`B${sumRow7}`);
  cellSigEmp.value = 'Employee Signature ';
  cellSigEmp.font = { bold: true, size: 9, color: { argb: 'FF495057' }, name: 'Verdana' };

  const cellSigEng = ws.getCell(`E${sumRow7}`);
  cellSigEng.value = 'Project Engineer Signature';
  cellSigEng.font = { bold: true, size: 9, color: { argb: 'FF495057' }, name: 'Verdana' };

  // Safe filename format: FIREX_[Employee_Name]_[Month]_[Year].xlsx
  const safeEmpName = (employee.full_name || 'Employee')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
  const filename = `FIREX_${safeEmpName}_${monthName}_${targetYear}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  return { workbook: wb, filename, buffer, daysInMonth, totalWorkingDays, totalOvertimeMinutes, totalAbsenceDays };
}
