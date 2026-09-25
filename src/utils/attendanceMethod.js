// How an attendance punch was recorded — mirrors the backend's `method`
// field (helpers.py::record_attendance_punch(), stamped "photo" by the
// selfie check-in flow and "fingerprint"/"face" by a biometric device push,
// routes/biometric.py). Missing/undefined on any record predates this
// field entirely, which only ever meant the photo flow — default to that.
//
// Shared by every attendance list view (AdminAttendancePage, Employee/
// ManagerDashboard's Attendance Log, AttendanceCalendar, AdminAttendanceSummary)
// so the icon/label can't drift between them.

const METHOD_INFO = {
  photo:       { icon: "📷", label: "Photo" },
  fingerprint: { icon: "🔒", label: "Fingerprint" },
  face:        { icon: "🙂", label: "Face" },
};

export function methodIcon(method) {
  return (METHOD_INFO[method] || METHOD_INFO.photo).icon;
}

export function methodLabel(method) {
  return (METHOD_INFO[method] || METHOD_INFO.photo).label;
}
