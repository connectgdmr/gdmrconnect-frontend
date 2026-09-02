// LMS assignment lifecycle badge colours — shared by AdminLMS, ManagerLMS
// and the employee course list. State strings come from the backend
// (routes/lms.py::_assignment_state): Completed / In Progress / Overdue /
// Scheduled / Not Started.
export const LMS_STATE_STYLE = {
  "Completed":   { color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
  "In Progress": { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  "Overdue":     { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  "Scheduled":   { color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  "Not Started": { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
};
