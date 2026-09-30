import db from './db.js';

// Bahrain is UTC+3 with no Daylight Saving Time
const BAHRAIN_TIMEZONE_OFFSET_HOURS = 3;

/**
 * Get current date & time in Bahrain Timezone (Asia/Bahrain, UTC+3)
 */
export function getBahrainNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS);
}

/**
 * Format Date to YYYY-MM-DD in Bahrain Timezone
 */
export function getBahrainDateString(date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const bDate = new Date(utc + 3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS);

  const year = bDate.getFullYear();
  const month = String(bDate.getMonth() + 1).padStart(2, '0');
  const day = String(bDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format Date or ISO timestamp to Bahrain 12-hour Time String e.g. "07:30 AM"
 */
export function formatBahrainTime(isoStringOrDate) {
  if (!isoStringOrDate) return null;
  const d = new Date(isoStringOrDate);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const bDate = new Date(utc + 3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS);

  let hours = bDate.getHours();
  const minutes = String(bDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
}

/**
 * Convert HH:MM 24h string to minutes from midnight
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Format minutes into "Xh YYm"
 */
export function minutesToHoursFormatted(minutes) {
  if (!minutes || minutes <= 0) return '0h 00m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Get shift schedule rules for a specific date (Bahrain work schedule)
 * - Sunday - Thursday: 07:30 AM to 04:30 PM (9 hours)
 * - Saturday: 07:30 AM to 01:00 PM (5.5 hours)
 * - Friday: Weekly Holiday
 * - Public Holidays: Holiday
 */
export function getScheduleForDate(dateStr, settings = null) {
  if (!settings) {
    settings = db.get('settings') || {};
  }

  const [y, m, d] = (dateStr || getBahrainDateString()).split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

  // Check public holidays table
  const publicHolidays = db.get('public_holidays') || [];
  const publicHoliday = publicHolidays.find((h) => h.date === dateStr);

  if (publicHoliday) {
    return {
      is_holiday: true,
      is_public_holiday: true,
      holiday_name: publicHoliday.name,
      is_friday: false,
      is_saturday: false,
      work_start_time: null,
      work_end_time: null,
      work_start_minutes: null,
      work_end_minutes: null,
      standard_working_minutes: 0,
    };
  }

  // Friday is Weekly Holiday
  if (dayOfWeek === 5) {
    return {
      is_holiday: true,
      is_public_holiday: false,
      holiday_name: 'Friday Weekly Off',
      is_friday: true,
      is_saturday: false,
      work_start_time: null,
      work_end_time: null,
      work_start_minutes: null,
      work_end_minutes: null,
      standard_working_minutes: 0,
    };
  }

  // Saturday: 07:30 AM to 01:00 PM (Half Day)
  if (dayOfWeek === 6) {
    const startTime = settings.saturday_start_time || '07:30';
    const endTime = settings.saturday_end_time || '13:00';
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    return {
      is_holiday: false,
      is_public_holiday: false,
      holiday_name: null,
      is_friday: false,
      is_saturday: true,
      work_start_time: startTime,
      work_end_time: endTime,
      work_start_minutes: startMins,
      work_end_minutes: endMins,
      standard_working_minutes: Math.max(0, endMins - startMins),
    };
  }

  // Sunday through Thursday: 07:30 AM to 04:30 PM (Full Day)
  const startTime = settings.work_start_time || '07:30';
  const endTime = settings.work_end_time || '16:30';
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);

  return {
    is_holiday: false,
    is_public_holiday: false,
    holiday_name: null,
    is_friday: false,
    is_saturday: false,
    work_start_time: startTime,
    work_end_time: endTime,
    work_start_minutes: startMins,
    work_end_minutes: endMins,
    standard_working_minutes: Math.max(0, endMins - startMins),
  };
}

/**
 * Calculate working time, regular hours, and overtime hours (before/after official shift)
 */
export function calculateWorkingTime(punchInIso, punchOutIso, dateStr = null, settings = null) {
  if (!punchInIso) {
    return {
      total_minutes: 0,
      total_hours_formatted: '0h 00m',
      regular_minutes: 0,
      regular_hours_formatted: '0h 00m',
      ot_minutes: 0,
      ot_hours_formatted: '0h 00m',
      early_ot_minutes: 0,
      late_ot_minutes: 0,
      holiday_ot_minutes: 0,
      is_holiday_work: false,
    };
  }

  const effectiveDate = dateStr || punchInIso.substring(0, 10);
  const schedule = getScheduleForDate(effectiveDate, settings);

  if (!punchOutIso) {
    return {
      total_minutes: 0,
      total_hours_formatted: '0h 00m',
      regular_minutes: 0,
      regular_hours_formatted: '0h 00m',
      ot_minutes: 0,
      ot_hours_formatted: '0h 00m',
      early_ot_minutes: 0,
      late_ot_minutes: 0,
      holiday_ot_minutes: 0,
      is_holiday_work: schedule.is_holiday,
    };
  }

  const tIn = new Date(punchInIso).getTime();
  const tOut = new Date(punchOutIso).getTime();
  const diffMs = Math.max(0, tOut - tIn);
  const total_minutes = Math.floor(diffMs / 60000);

  // If worked on Friday or Public Holiday, 100% of working time is Holiday Overtime
  if (schedule.is_holiday) {
    return {
      total_minutes,
      total_hours_formatted: minutesToHoursFormatted(total_minutes),
      regular_minutes: 0,
      regular_hours_formatted: '0h 00m',
      ot_minutes: total_minutes,
      ot_hours_formatted: minutesToHoursFormatted(total_minutes),
      early_ot_minutes: 0,
      late_ot_minutes: 0,
      holiday_ot_minutes: total_minutes,
      is_holiday_work: true,
    };
  }

  // Workday: Calculate minutes from midnight for punch in & out in Bahrain time (UTC+3)
  const dIn = new Date(tIn + 3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS);
  const dOut = new Date(tOut + 3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS);

  const punchInMinutes = dIn.getUTCHours() * 60 + dIn.getUTCMinutes();
  const punchOutMinutes = dOut.getUTCHours() * 60 + dOut.getUTCMinutes();

  const shiftStart = schedule.work_start_minutes; // e.g. 07:30 -> 450
  const shiftEnd = schedule.work_end_minutes;     // e.g. 16:30 -> 990 or 13:00 -> 780

  // 1. Early Overtime (worked before official start time)
  let early_ot_minutes = 0;
  if (punchInMinutes < shiftStart) {
    const earlyEnd = Math.min(punchOutMinutes, shiftStart);
    early_ot_minutes = Math.max(0, earlyEnd - punchInMinutes);
  }

  // 2. Late Overtime (worked after official end time)
  let late_ot_minutes = 0;
  if (punchOutMinutes > shiftEnd) {
    const lateStart = Math.max(punchInMinutes, shiftEnd);
    late_ot_minutes = Math.max(0, punchOutMinutes - lateStart);
  }

  // 3. Regular Shift Hours (worked within official start to end window)
  const regularStart = Math.max(punchInMinutes, shiftStart);
  const regularEnd = Math.min(punchOutMinutes, shiftEnd);
  const regular_minutes = Math.max(0, regularEnd - regularStart);

  const ot_minutes = early_ot_minutes + late_ot_minutes;

  return {
    total_minutes,
    total_hours_formatted: minutesToHoursFormatted(total_minutes),
    regular_minutes,
    regular_hours_formatted: minutesToHoursFormatted(regular_minutes),
    ot_minutes,
    ot_hours_formatted: minutesToHoursFormatted(ot_minutes),
    early_ot_minutes,
    late_ot_minutes,
    holiday_ot_minutes: 0,
    is_holiday_work: false,
  };
}

/**
 * Calculate attendance status based on date, punch in, punch out, and shift rules
 */
export function determineAttendanceStatus(punchInIso, punchOutIso, settings = null, dateStr = null) {
  if (!settings) {
    settings = db.get('settings') || {};
  }

  const effectiveDate = dateStr || (punchInIso ? punchInIso.substring(0, 10) : getBahrainDateString());
  const schedule = getScheduleForDate(effectiveDate, settings);

  if (!punchInIso) {
    if (schedule.is_holiday) {
      return schedule.holiday_name || 'Holiday / Off';
    }
    return 'Absent';
  }

  if (schedule.is_holiday) {
    return `Holiday Work (OT)`;
  }

  const graceMinutes = Number(settings.grace_period_minutes ?? 15);
  const workStartMinutes = schedule.work_start_minutes; // e.g. 450 (07:30)
  const workEndMinutes = schedule.work_end_minutes;     // e.g. 990 (16:30) or 780 (13:00)

  // Get punch in minutes in Bahrain time
  const dIn = new Date(punchInIso);
  const utcIn = dIn.getTime() + dIn.getTimezoneOffset() * 60000;
  const bIn = new Date(utcIn + 3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS);
  const punchInMinutes = bIn.getHours() * 60 + bIn.getMinutes();

  const isLate = punchInMinutes > workStartMinutes + graceMinutes;

  let isEarlyCheckout = false;
  if (punchOutIso) {
    const dOut = new Date(punchOutIso);
    const utcOut = dOut.getTime() + dOut.getTimezoneOffset() * 60000;
    const bOut = new Date(utcOut + 3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS);
    const punchOutMinutes = bOut.getHours() * 60 + bOut.getMinutes();
    isEarlyCheckout = punchOutMinutes < workEndMinutes;
  }

  if (isLate && isEarlyCheckout) {
    return 'Late / Early Checkout';
  } else if (isLate) {
    return 'Present - Late';
  } else if (isEarlyCheckout && punchOutIso) {
    return 'Early Checkout';
  } else {
    return 'Present';
  }
}

/**
 * Haversine formula to compute distance in meters between two GPS coordinates
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
