import db from './db.js';

// Bahrain is UTC+3 with no Daylight Saving Time
const BAHRAIN_TIMEZONE_OFFSET_HOURS = 3;

/**
 * Get current date & time in Bahrain Timezone (Asia/Bahrain, UTC+3)
 */
export function getBahrainNow() {
  const now = new Date();
  // Compute UTC time
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  // Add Bahrain +3 hours
  const bahrainTime = new Date(utc + (3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS));
  return bahrainTime;
}

/**
 * Format Date to YYYY-MM-DD in Bahrain Timezone
 */
export function getBahrainDateString(date = new Date()) {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const bDate = new Date(utc + (3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS));
  
  const year = bDate.getFullYear();
  const month = String(bDate.getMonth() + 1).padStart(2, '0');
  const day = String(bDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format Date or ISO timestamp to Bahrain 12-hour Time String e.g. "07:58 AM"
 */
export function formatBahrainTime(isoStringOrDate) {
  if (!isoStringOrDate) return null;
  const d = new Date(isoStringOrDate);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const bDate = new Date(utc + (3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS));

  let hours = bDate.getHours();
  const minutes = String(bDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' should be '12'
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
 * Calculate attendance status based on dynamic settings
 */
export function determineAttendanceStatus(punchInIso, punchOutIso, settings = null) {
  if (!settings) {
    settings = db.get('settings') || {};
  }
  const workStartMinutes = timeToMinutes(settings.work_start_time || '07:00');
  const workEndMinutes = timeToMinutes(settings.work_end_time || '17:00');
  const graceMinutes = Number(settings.grace_period_minutes ?? 15);

  if (!punchInIso) {
    return 'Absent';
  }

  // Get punch in minutes in Bahrain time
  const dIn = new Date(punchInIso);
  const utcIn = dIn.getTime() + (dIn.getTimezoneOffset() * 60000);
  const bIn = new Date(utcIn + (3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS));
  const punchInMinutes = bIn.getHours() * 60 + bIn.getMinutes();

  let isLate = punchInMinutes > (workStartMinutes + graceMinutes);

  let isEarlyCheckout = false;
  if (punchOutIso) {
    const dOut = new Date(punchOutIso);
    const utcOut = dOut.getTime() + (dOut.getTimezoneOffset() * 60000);
    const bOut = new Date(utcOut + (3600000 * BAHRAIN_TIMEZONE_OFFSET_HOURS));
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
 * Calculate total working minutes and human formatted string
 */
export function calculateWorkingTime(punchInIso, punchOutIso) {
  if (!punchInIso || !punchOutIso) {
    return { total_minutes: 0, total_hours_formatted: '0h 00m' };
  }
  const tIn = new Date(punchInIso).getTime();
  const tOut = new Date(punchOutIso).getTime();
  const diffMs = Math.max(0, tOut - tIn);
  const total_minutes = Math.floor(diffMs / 60000);

  const hours = Math.floor(total_minutes / 60);
  const minutes = total_minutes % 60;
  const total_hours_formatted = `${hours}h ${String(minutes).padStart(2, '0')}m`;

  return { total_minutes, total_hours_formatted };
}

/**
 * Haversine formula to compute distance in meters between two GPS coordinates
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // Earth radius in meters
  const toRad = (x) => (x * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance in meters
}
