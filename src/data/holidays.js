// Single source of truth for the company holiday calendar.
// Used by HolidayCalendar (table view) and InsightsBanner (upcoming-holiday nudge).
const YEAR = 2026;

export const HOLIDAYS = [
  { id: 1, date: "January 1", day: "Thursday", name: "New Year" },
  { id: 2, date: "January 26", day: "Monday", name: "Republic Day" },
  { id: 3, date: "February 15", day: "Sunday", name: "Shivaratri" },
  { id: 4, date: "March 4", day: "Wednesday", name: "Holi" },
  { id: 5, date: "March 21", day: "Saturday", name: "Eid-ul-Fitr" },
  { id: 6, date: "April 3", day: "Friday", name: "Good Friday" },
  { id: 7, date: "April 5", day: "Sunday", name: "Easter" },
  { id: 8, date: "May 1", day: "Friday", name: "Labour Day" },
  { id: 9, date: "May 27", day: "Wednesday", name: "Bakrid" },
  { id: 10, date: "June 26", day: "Friday", name: "Muharram" },
  { id: 11, date: "August 15", day: "Saturday", name: "Independence Day" },
  { id: 12, date: "August 26", day: "Wednesday", name: "Thiruvonam" },
  { id: 13, date: "September 4", day: "Friday", name: "Janmashtami" },
  { id: 14, date: "October 2", day: "Friday", name: "Gandhi Jayanti" },
  { id: 15, date: "October 20", day: "Tuesday", name: "Vijayadashami" },
  { id: 16, date: "November 8", day: "Sunday", name: "Diwali" },
  { id: 17, date: "December 25", day: "Friday", name: "Christmas" },
];

/** Returns the nearest holiday on/after `referenceDate`, with `daysAway`, or null if the year is over. */
export function getNextHoliday(referenceDate = new Date()) {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  let next = null;
  for (const h of HOLIDAYS) {
    const d = new Date(`${h.date} ${YEAR}`);
    if (d >= today && (!next || d < next.dateObj)) {
      next = { ...h, dateObj: d };
    }
  }
  if (!next) return null;
  const daysAway = Math.round((next.dateObj - today) / 86400000);
  return { name: next.name, date: next.date, day: next.day, daysAway };
}
