// Build a "YYYY-MM-DD" string from a Date's LOCAL calendar date.
//
// Do NOT use `date.toISOString().slice(0, 10)` for "today" comparisons —
// toISOString() converts to UTC first, which silently shifts the date back
// a day for any timezone ahead of UTC (e.g. India, UTC+5:30) during the
// UTC-previous-day window (00:00–05:29 IST). That makes "today" resolve to
// yesterday and drops any leave/attendance record whose date is genuinely
// today from date-range comparisons like `from_date <= todayStr <= to_date`.
// (Same bug already fixed once in LeaveCalendar.jsx — this is the shared
// version so every "today" computation uses the same safe logic.)
export function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Same idea for "YYYY-MM" (used by month pickers / monthly summary lookups).
export function ym(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
