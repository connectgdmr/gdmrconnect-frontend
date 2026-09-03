// Canonical "has this person left / is leaving" rules for an employee doc.
//
// Mirrors the backend's single source of truth, helpers.py::is_offboarded():
// off-boarded == resignation notice recorded AND a last working day recorded
// AND that last working day is already in the past.
//
// This module replaces the identical `isOffboarded()` / `empExitStatus()`
// helpers that were copy-pasted into ~9 components — import from here instead
// so the rule can only ever be changed in one place.

// True once an employee's notice + last working day are both recorded and the
// last working day has already passed (compared at local midnight).
export function isOffboarded(emp) {
  const lwd = emp?.resignation?.last_working_day;
  if (!emp?.resignation?.notice_date || !lwd) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(lwd) < today;
}

// Resignation recorded but the last working day hasn't passed yet.
export function isInNotice(emp) {
  return !!emp?.resignation?.notice_date && !isOffboarded(emp);
}

// "offboarded" | "notice" | null — drop-in for the old empExitStatus().
export function exitStatus(emp) {
  if (!emp?.resignation?.notice_date) return null;
  return isOffboarded(emp) ? "offboarded" : "notice";
}

// Convenience: keep only the currently-active people in a roster array.
export const filterActive = (list = []) => list.filter((e) => !isOffboarded(e));
