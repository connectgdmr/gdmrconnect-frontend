import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { resolveAttachmentUrl } from "../utils/security";
import Sidebar from "./Sidebar";
import AnnouncementNotifications from "./AnnouncementNotifications";
import InsightsBanner from "./InsightsBanner";
import DailyQuote from "./DailyQuote";
import DailyWorkPlan from "./DailyWorkPlan";
import ChatBot from "./ChatBot";

const Chat            = lazy(() => import("./Chat"));
const WorkAnalytics  = lazy(() => import("./WorkAnalytics"));
const AdminWorkByTeam = lazy(() => import("./AdminWorkByTeam"));
const AdminClients    = lazy(() => import("./AdminClients"));
const AdminATS        = lazy(() => import("./AdminATS"));
import ErrorBoundary from "./ErrorBoundary";
import { SkeletonTable } from "./Skeleton";
import useChatUnread from "./useChatUnread";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { getCurrentLocation } from "../utils/geolocation";
import LeaveCalendar from "./LeaveCalendar";

const EmployeeLMS         = lazy(() => import("./EmployeeLMS"));
const ManagerLMS          = lazy(() => import("./ManagerLMS"));
const EmployeeCareer      = lazy(() => import("./EmployeeCareer"));
const EmployeePayroll     = lazy(() => import("./EmployeePayroll"));
const AdminPayroll        = lazy(() => import("./AdminPayroll"));
const AdminLeavePage      = lazy(() => import("./AdminLeavePage"));
const AdminAttendancePage = lazy(() => import("./AdminAttendancePage"));
const HolidayCalendar     = lazy(() => import("./HolidayCalendar"));
const AdminLMS               = lazy(() => import("./AdminLMS"));
const AdminCareer            = lazy(() => import("./AdminCareer"));
const AdminAssessment        = lazy(() => import("./AdminAssessment"));
const AdminAttendanceSummary = lazy(() => import("./AdminAttendanceSummary"));
const EmployeeList           = lazy(() => import("./EmployeeList"));
const RegisterManager        = lazy(() => import("./RegisterManager"));
const AttendanceCalendar     = lazy(() => import("./AttendanceCalendar"));
import {
  FaCamera, 
  FaSignOutAlt, 
  FaCalendarPlus,
  FaCalendarCheck,
  FaCalendarWeek,
  FaHistory,
  FaArrowLeft, 
  FaCheckCircle, 
  FaHourglassHalf, 
  FaTimesCircle, 
  FaUserCheck, 
  FaTimes, 
  FaCloudUploadAlt, 
  FaCalendarAlt, 
  FaUsers,
  FaChartLine, 
  FaClipboardCheck, 
  FaBullhorn, 
  FaEye,
  FaEyeSlash, 
  FaLock,
  FaDownload,
  FaPlus,
  FaTrash,
  FaEdit,
  FaUserShield, 
  FaClipboardList,
  FaCheckSquare,
  FaRegSquare,
  FaClock,
  FaFileDownload,
  FaLaptop,
  FaBars,
  FaGift,
  FaSave,
  FaCog,
  FaTags,
  FaMoneyBillWave,
  FaUserTag,
  FaFolderOpen,
  FaTasks,
  FaGraduationCap,
  FaBriefcase,
  FaChartPie,
} from "react-icons/fa";
import ProfilePanel from "./ProfilePanel";
import SettingsModal from "./SettingsModal";
import WorkTypesManager from "./WorkTypesManager";
import PMSWorkspace from "./PMSWorkspace";

function QuickLaunchItem({ icon, label, onClick, color = "var(--red)", badgeCount = 0 }) {
  return (
    <div className="quick-launch-item" onClick={onClick} style={{position:'relative'}}>
      <div className="quick-launch-icon" style={{ color }}>{icon}</div>
      <div className="quick-launch-label">{label}</div>
      {badgeCount > 0 && <span className="icon-badge">{badgeCount}</span>}
    </div>
  );
}

function StatItem({ icon, label, count, colorClass, onClick }) {
  return (
    <div className="stat-row clickable-stat" onClick={onClick}>
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-count">{count}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

// ── Delegated (Grant Access) admin sub-views ─────────────────────────────────
// Same config as EmployeeDashboard.jsx — module keys match backend's
// GRANTABLE_MODULES (helpers.py) and Sidebar.jsx's admin view keys.
const DELEGATED_MODULES = [
  { key: "attendance", label: "Manage Daily Attendance", Icon: FaHistory,
    alert: "You are viewing the Daily Attendance Logs using temporary Delegated Access.",
    render: (ctx) => <AdminAttendancePage token={ctx.token} api={ctx.api} delegated /> },
  { key: "leaves", label: "Manage Leave Approvals", Icon: FaClipboardList,
    alert: "You are viewing the Leave Approval interface using temporary Delegated Access.",
    render: (ctx) => <AdminLeavePage token={ctx.token} api={ctx.api} /> },
  { key: "lms", label: "Manage LMS Courses", Icon: FaGraduationCap,
    alert: "You are managing LMS Courses using temporary Delegated Access — you can create courses and assign them.",
    render: (ctx) => <AdminLMS token={ctx.token} employees={[]} departments={[]} /> },
  { key: "payroll", label: "Manage Payroll", Icon: FaMoneyBillWave,
    alert: "You are managing Payroll using temporary Delegated Access.",
    render: (ctx) => <AdminPayroll token={ctx.token} employees={[]} /> },
  { key: "ats", label: "Manage Recruitment", Icon: FaUserTag,
    alert: "You are managing Recruitment using temporary Delegated Access.",
    render: (ctx) => <AdminATS token={ctx.token} role={ctx.user?.role || "manager"} employees={[]} departments={[]} /> },
  { key: "career", label: "Manage Jobs", Icon: FaBriefcase,
    alert: "You are managing Job Postings using temporary Delegated Access.",
    render: (ctx) => <AdminCareer token={ctx.token} employees={[]} /> },
  { key: "clients", label: "Manage Clients", Icon: FaFolderOpen,
    alert: "You are managing Clients using temporary Delegated Access.",
    render: (ctx) => <AdminClients token={ctx.token} /> },
  { key: "work-by-team", label: "Work by Team (All Depts)", Icon: FaTasks,
    alert: "You are viewing Work by Team (all departments) using temporary Delegated Access.",
    render: (ctx) => <AdminWorkByTeam token={ctx.token} role="admin" /> },
  { key: "assessment", label: "Manage Assessments", Icon: FaClipboardList,
    alert: "You are managing Assessments using temporary Delegated Access.",
    render: (ctx) => <AdminAssessment token={ctx.token} /> },
  { key: "pms", label: "Manage PMS (All Depts)", Icon: FaChartLine,
    alert: "You are viewing PMS (all departments) using temporary Delegated Access.",
    render: (ctx) => <PMSWorkspace token={ctx.token} api={ctx.api} user={ctx.user} scope="admin" assignablePool={[]} /> },
  { key: "summary", label: "View Reports", Icon: FaChartPie,
    alert: "You are viewing company Reports using temporary Delegated Access.",
    render: (ctx) => <AdminAttendanceSummary token={ctx.token} api={ctx.api} /> },
  { key: "employees", label: "Manage Employees", Icon: FaUsers,
    alert: "You are managing Employees using temporary Delegated Access.",
    render: (ctx) => (
      <EmployeeList
        employees={ctx.delegatedEmployees}
        departments={[]}
        onDelete={ctx.deleteDelegatedEmployee}
        onRefresh={ctx.loadDelegatedEmployees}
        onPatch={ctx.patchDelegatedEmployee}
        onPromote={ctx.promoteDelegatedEmployee}
        api={ctx.api}
        token={ctx.token}
      />
    ) },
  { key: "manager", label: "Manage Managers", Icon: FaUserShield,
    alert: "You are managing Managers using temporary Delegated Access.",
    render: (ctx) => <RegisterManager token={ctx.token} api={ctx.api} /> },
];

export default function ManagerDashboard({ token, api, user, onLogout, passwordChanged = true }) {

  const chatUnread = useChatUnread(token, api);

  // ============================================================================
  // 1. CORE DATA STATES
  // ============================================================================

  /**
   * Stores the attendance records for the current user
   */
  const [attendance, setAttendance] = useState([]);
  
  /** 
   * Stores the leave requests submitted by the current user 
   */
  const [myLeaves, setMyLeaves] = useState([]);
  
  /** 
   * Stores the profile details of employees assigned to this manager 
   */
  const [teamMembers, setTeamMembers] = useState([]);

  /**
   * Company-wide employee list, loaded on demand for HR/Accounts managers'
   * Payroll tab (Salary Setup + Loans & Advances need every employee, not just this manager's team).
   */
  const [payrollEmployees, setPayrollEmployees] = useState([]);

  /** 
   * Stores the leave requests submitted by the team members 
   */
  const [teamLeaves, setTeamLeaves] = useState([]); 
  
  /** 
   * NEW: Stores hardware/equipment requests submitted by the team 
   */
  const [teamAssets, setTeamAssets] = useState([]);

  /**
   * Asset assignment-to-email state (manager now owns the final provisioning step).
   * The manager sends an email with the request details to the office admin / procurement.
   */
  const [assignAsset, setAssignAsset]     = useState(null);   // asset being assigned
  const [assignEmails, setAssignEmails]   = useState("");      // comma-sep email input
  const [assignSending, setAssignSending] = useState(false);
  const [assignMsg, setAssignMsg]         = useState("");

  /** 
   * Stores dynamic badge counts for dashboard quick launch icons 
   */
  const [notificationCounts, setNotificationCounts] = useState({ 
      leaves: 0, 
      pms: 0, 
      corrections: 0, 
      announcements: 0,
      assets: 0 
  });
  
  /** 
   * Stores active system-wide announcements 
   */
  const [announcements, setAnnouncements] = useState([]);

  /**
   * Stores pending attendance time-correction requests 
   */
  const [pendingCorrections, setPendingCorrections] = useState([]);

  // ============================================================================
  // 2. PASSWORD MANAGEMENT STATES
  // ============================================================================
  
  /** 
   * Manages the visibility of the mandatory password change modal 
   */
  const [showPasswordModal, setShowPasswordModal] = useState(!passwordChanged);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");

  // Visibility toggles for the 3 password fields to show/hide plaintext
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // ============================================================================
  // 3. PMS — now handled entirely by the shared <PMSWorkspace scope="manager" />
  //    component (Build/Review/Calibrate merged into one "PMS" page). See there
  //    for templateSessions/assignedEmployees/managerScores/etc.
  // ============================================================================

  // ============================================================================
  // 4. DELEGATED ADMIN & DASHBOARD STATES
  // ============================================================================
  
  /**
   * Stores temporary access permissions granted by the master admin
   */
  const [delegatedGrants, setDelegatedGrants] = useState([]);
  // Employee directory, fetched on-demand only when the delegated "Employees"
  // sub-view is opened — mirrors AdminDashboard's own loadEmployees/patch/
  // delete/promote so the reused EmployeeList component behaves identically.
  const [delegatedEmployees, setDelegatedEmployees] = useState([]);
  const [delegatedEmployeesLoading, setDelegatedEmployeesLoading] = useState(false);
  
  /** 
   * Stores aggregated performance metrics for the department 
   */
  const [deptDashboard, setDeptDashboard] = useState([]);
  const [dashboardMonth, setDashboardMonth] = useState(new Date().toISOString().slice(0, 7));

  /** 
   * Primary routing state for conditional rendering of sub-views 
   */
  const [view, setView] = useState("dashboard");
  // Attendance (Log + Team Calendar) and Leave (My Leaves + Apply Leave) each
  // consolidate two former sidebar entries into one, tabbed in-page — same
  // reasoning as EmployeeDashboard.jsx's attendanceSubView/leaveSubView.
  const [attendanceSubView, setAttendanceSubView] = useState("attendance-log");
  const [leaveSubView, setLeaveSubView] = useState("my-leaves");
  const [loadError, setLoadError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [birthdayDismissed, setBirthdayDismissed] = useState(false);

  // Leave Form State Variables
  const [leaveDuration, setLeaveDuration] = useState("single");
  const [startDate, setStartDate] = useState("");
  const [selectedDates, setSelectedDates] = useState([]); // multi-day leave — individually clicked calendar days
  const toggleLeaveDate = (dateStr) => {
    setSelectedDates(prev => (prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr].sort()));
  };
  const [reason, setReason] = useState("");
  const [type, setType] = useState("full");
  const [period, setPeriod] = useState("First Half");
  const [file, setFile] = useState(null);

  // Manager's own attendance correction form
  const [correctionData, setCorrectionData] = useState({ newTime: "", reason: "" });

  // Modal display states
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState([]);
  const [viewLeave, setViewLeave] = useState(null); // full-detail modal for a single row in "My Leaves"

  // ============================================================================
  // 5. CAMERA & HARDWARE STATES
  // ============================================================================
  
  /** 
   * Hardware interaction states for photo-verified check-ins 
   */
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const [employmentEnded, setEmploymentEnded] = useState(false); // offboarded — blocks attendance actions

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); 

  // ============================================================================
  // 6. DERIVED STATES & CONSTANTS
  // ============================================================================
  const pendingLeaves = myLeaves.filter(l => l.status === 'Pending');
  const approvedLeaves = myLeaves.filter(l => l.status === 'Approved');
  const rejectedLeaves = myLeaves.filter(l => l.status === 'Rejected');

  // Always filter team leaves by CURRENT team members so that when an employee
  // transfers to another department the old manager stops seeing their leaves and
  // (once the backend is fixed) the new manager sees them immediately.
  const teamMemberIds = new Set(teamMembers.map(m => String(m._id || m.id || "")));
  const visibleTeamLeaves = teamMemberIds.size > 0
    ? teamLeaves.filter(l => teamMemberIds.has(String(l.employee_id || l.user_id || "")))
    : teamLeaves; // fall back to all if teamMembers hasn't loaded yet

  const MAX_WORDS = 30;
  const MAX_FILE_SIZE_MB = 5;

  // ============================================================================
  // INITIAL DATA LOADING FUNCTION
  // ============================================================================
  
  /**
   * Main data loading function. Fetches all required information for the 
   * manager dashboard in parallel to optimize rendering times.
   */
  const load = useCallback(async (isAction = false) => {
    if (!isAction) setLoadError(false);

    const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // Parallelize all fetch requests to significantly speed up dashboard load times
      const results = await Promise.allSettled([
        api?.myAttendance ? api.myAttendance(token) : Promise.resolve([]),
        api?.myLeaves ? api.myLeaves(token) : Promise.resolve([]),
        api?.getManagerEmployees ? api.getManagerEmployees(token) : Promise.resolve([]),
        fetch(`${baseUrl}/api/manager/corrections`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(`${baseUrl}/api/admin/leaves`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(`${baseUrl}/api/notifications/counts`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(`${baseUrl}/api/announcements`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(`${baseUrl}/api/admin/pms-dashboard?month=${dashboardMonth}`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(`${baseUrl}/api/my/delegated-access`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(`${baseUrl}/api/manager/assets`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(`${baseUrl}/api/my/profile`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r.status))
      ]);

      // Map results to state safely avoiding any undefined crashes
      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) {
          setAttendance(results[0].value);
      }
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
          setMyLeaves(results[1].value);
      }
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) {
          setTeamMembers(results[2].value);
      }
      if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) {
          setPendingCorrections(results[3].value);
      }
      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value)) {
          setTeamLeaves(results[4].value);
      }
      if (results[5].status === 'fulfilled' && results[5].value) {
          setNotificationCounts(results[5].value);
      }

      // Map Announcements & Sort Newest First
      if (results[6].status === 'fulfilled' && Array.isArray(results[6].value)) {
          const sortedAnns = results[6].value.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setAnnouncements(sortedAnns);
      }

      // Map Dept Dashboard
      if (results[7].status === 'fulfilled' && Array.isArray(results[7].value)) {
          setDeptDashboard(results[7].value);
      }

      // Map Delegated Admin Grants
      if (results[8].status === 'fulfilled' && Array.isArray(results[8].value)) {
          setDelegatedGrants(results[8].value);
      }

      // Map Team Asset Requests
      if (results[9].status === 'fulfilled' && Array.isArray(results[9].value)) {
          setTeamAssets(results[9].value);
      }

      // Employment status — offboarded managers can't clock in/out
      if (results[10].status === 'fulfilled' && results[10].value) {
          setEmploymentEnded(!!results[10].value.offboarded);
      }

    } catch (err) {
      // silent fail
      if (!isAction) setLoadError(true);
    }
  }, [token, dashboardMonth, api]);

  // Trigger load on component mount
  useEffect(() => {
      load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (view !== "payroll" || payrollEmployees.length || !api?.listEmployees) return;
    const depts = Array.isArray(user?.department) ? user.department : (user?.department ? [user.department] : []);
    const hasPayrollAccess = depts.some(d => {
      const lower = (d || "").toLowerCase();
      return lower.includes("account") || lower.includes("hr") || lower.includes("human resource");
    });
    if (!hasPayrollAccess) return;
    api.listEmployees(token).then(list => { if (Array.isArray(list)) setPayrollEmployees(list); }).catch(() => {});
  }, [view, user, api, token, payrollEmployees.length]);

  useEffect(() => {
    const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
    fetch(`${baseUrl}/api/notifications/birthdays`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setTodayBirthdays(data); })
      .catch(() => {});
  }, [token, api]);

  // Fetch the employee directory only when the delegated "Employees" sub-view
  // is actually opened, not eagerly on every dashboard load.
  useEffect(() => {
    if (view === "delegated-employees" && delegatedEmployees.length === 0 && !delegatedEmployeesLoading) {
      loadDelegatedEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Which modules has this manager been granted, and with what access level?
  const grantModulesOf = (g) => (g.modules && g.modules.length ? g.modules : (g.module ? [g.module] : ["attendance"]));
  const grantedModule = (mod) => Array.isArray(delegatedGrants) && delegatedGrants.some(g => grantModulesOf(g).includes(mod));
  const grantedModuleWrite = (mod) => Array.isArray(delegatedGrants) && delegatedGrants.some(g => grantModulesOf(g).includes(mod) && g.access_level === "view_edit");

  // — Delegated "Employees" sub-view — mirrors AdminDashboard's own
  // loadEmployees/patchEmployee/deleteEmployee/promoteToManager.
  async function loadDelegatedEmployees() {
      setDelegatedEmployeesLoading(true);
      try { setDelegatedEmployees(await api.listEmployees(token)); }
      catch { /* silent — UI shows stale/empty data */ }
      finally { setDelegatedEmployeesLoading(false); }
  }
  function patchDelegatedEmployee(id, updates) {
      setDelegatedEmployees(prev => prev.map(e => e._id === id ? { ...e, ...updates } : e));
  }
  async function deleteDelegatedEmployee(id) {
      if (!window.confirm("Are you sure you want to completely remove this employee?")) return;
      try { await api.deleteEmployee(id, token); await loadDelegatedEmployees(); }
      catch { alert("Failed to delete employee. Please try again."); }
  }
  async function promoteDelegatedEmployee(empId) {
      if (!window.confirm("Are you sure you want to promote this employee to Manager?")) return;
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/employees/${empId}/promote`, {
              method: 'PUT', headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) await loadDelegatedEmployees();
          else alert("Failed to promote employee.");
      } catch { alert("Failed to promote employee."); }
  }

  // ============================================================================
  // PASSWORD MANAGEMENT
  // ============================================================================
  
  /**
   * Handles the submission of the password change form.
   * Validates matching inputs and enforces strong password regex requirements.
   */
  async function handleSetPassword(e) {
      e.preventDefault();
      setPassError("");

      if (newPassword !== confirmPassword) {
          setPassError("New Password and Confirm Password do not match.");
          return;
      }

      // Requirement: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
      const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      
      if (!strongRegex.test(newPassword)) {
          setPassError("Password must be at least 8 characters long, and include an uppercase letter, a lowercase letter, a number, and a special character (@, $, !, %, *, ?, &).");
          return;
      }

      try {
          const res = await fetch(`${api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app'}/api/my/set-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ oldPassword: oldPassword, password: newPassword })
          });
          
          const data = await res.json();
          if(!res.ok) {
              throw new Error(data.message);
          }
          
          alert("Password updated successfully!");
          setShowPasswordModal(false);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setShowOldPass(false);
          setShowNewPass(false);
          setShowConfirmPass(false);
      } catch (err) {
          setPassError(err.message);
      }
  }

  // ============================================================================
  // CAMERA & ATTENDANCE LOGIC
  // ============================================================================
  
  /**
   * Requests permission to open the user's webcam device.
   * Renders the video feed inline inside the application modal.
   */
  async function openCamera(type) {
    if (employmentEnded) {
      alert("Your employment has ended. Attendance is no longer available.");
      return;
    }
    setActionType(type);
    setCameraOpen(true);
    setPreviewImage(null);
    setSubmittingPhoto(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream; 
      if (videoRef.current) {
          videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Camera access denied or unavailable. Please check your browser permissions.");
      setCameraOpen(false);
    }
  }

  /**
   * Captures the current frame from the webcam feed and 
   * converts it to a Base64 string for preview/upload.
   */
  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreviewImage(canvas.toDataURL("image/jpeg"));
  }

  /**
   * Submits the Base64 image payload to the backend API for
   * Cloudinary storage and database logging.
   */
  async function submitAttendance(imageData) {
    setSubmittingPhoto(true);
    try {
      const location = await getCurrentLocation();
      if (actionType === "checkin") {
          await api.checkinWithPhoto(token, imageData, location);
      } else {
          await api.checkoutWithPhoto(token, imageData, location);
      }
      
      setSubmittingPhoto(false); 
      closeCamera(); 
      alert(`${actionType === "checkin" ? "Checked in" : "Checked out"} successfully!`);
      
      await load(true);
    } catch (err) {
      alert("Error submitting attendance: " + (err.message || ""));
      setSubmittingPhoto(false); 
    }
  }

  /**
   * Terminates the webcam media tracks and destroys the stream context
   * to ensure the camera light turns off.
   */
  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setPreviewImage(null);
    setSubmittingPhoto(false);
  }

  // ============================================================================
  // EXPORT CSV & CORRECTIONS & LEAVES & ASSETS
  // (PMS builder/review/calibration logic now lives in <PMSWorkspace scope="manager" />)
  // ============================================================================
  
  /**
   * Communicates with the backend aggregation pipeline to fetch
   * a dynamically generated CSV file containing the department's scores.
   */
  async function downloadReport() {
      try {
          const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/export-pms?month=${dashboardMonth}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(!res.ok) {
              throw new Error("Failed to download report data from server.");
          }
          
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Dept_PMS_Report_${dashboardMonth}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
      } catch(err) {
          alert("Export failed: " + err.message);
      }
  }

  /**
   * Approves or Rejects a manual attendance correction request.
   */
  async function approveCorrection(id, action) {
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          const res = await fetch(`${baseUrl}/api/manager/approve-correction`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ id, action })
          });
          if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.message || "Failed to process correction request.");
          }
          await load(true);
          alert(`Correction Request ${action} successfully.`);
      } catch(err) {
          alert(err.message);
      }
  }
  
  /**
   * Manager submits their own attendance correction — routed to admin for approval.
   */
  async function submitCorrection(e) {
    e.preventDefault();
    const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
    try {
      const res = await fetch(`${baseUrl}/api/attendance/request-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          new_time: correctionData.newTime,
          reason: correctionData.reason,
          // No attendance_id — see EmployeeDashboard.jsx's submitCorrection for
          // why the old "manual_entry" placeholder here silently broke approval.
          employee_name: user?.name || user?.employee_name || "",
          employee_id: user?._id || user?.id || user?.employee_id || "",
          submitted_by_role: "manager",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit correction.");
      alert("Correction request sent to Admin for approval.");
      setCorrectionData({ newTime: "", reason: "" });
      setAttendanceSubView("attendance-log");
      setView("attendance");
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  /**
   * Pushes leave status updates to the dual-tier approval system.
   */
  async function updateLeaveStatus(id, status) {
       const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
       try {
          const res = await fetch(`${baseUrl}/api/admin/leaves/${id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ status })
          });
          if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.message || "Failed to update leave status.");
          }
          await load(true);
          alert(`Leave ${status} Successfully`);
       } catch(err) {
          alert(err.message);
       }
  }

  async function handleRevokeLeave(leaveId) {
    if (!window.confirm("Revoke this leave request? This cannot be undone.")) return;
    try {
      await api.revokeLeave(leaveId, token);
      alert("Leave revoked.");
      await load(true);
    } catch (err) {
      alert("Error revoking leave: " + (err.message || "An unknown error occurred."));
    }
  }

  /**
   * Submits a new leave request. If an attachment is present,
   * the underlying api object will use FormData instead of standard JSON.
   */
  // Mirrors the backend's overlap rule (routes/leaves.py::apply_leave) — the
  // only two records allowed to share a date are a half-day "First Half"
  // and a half-day "Second Half" leave on that exact day; anything else
  // overlapping an existing Pending/Approved request is a duplicate.
  function findLeaveConflict(fromDate, toDate, leaveType, leavePeriod) {
    return (myLeaves || []).find(l => {
      if (l.status === "Rejected" || l.status === "Cancelled") return false;
      const exFrom = l.from_date || l.date;
      const exTo = l.to_date || l.date;
      if (!exFrom || !exTo) return false;
      if (exFrom > toDate || exTo < fromDate) return false; // no date overlap
      const sameSingleDay = fromDate === toDate && exFrom === exTo && exFrom === fromDate;
      const distinctHalfDayPair = sameSingleDay && leaveType === "half" && l.type === "half" && leavePeriod && l.period && leavePeriod !== l.period;
      return !distinctHalfDayPair;
    });
  }
  function conflictMessage(conflict) {
    const exFrom = conflict.from_date || conflict.date;
    const exTo = conflict.to_date || conflict.date;
    const range = exTo && exTo !== exFrom ? `${exFrom} to ${exTo}` : exFrom;
    return `You already have a ${(conflict.status || "Pending").toLowerCase()} leave request covering ${range}.`;
  }

  async function applyLeave(e) {
    e.preventDefault();

    if (leaveDuration === 'multiple') {
      if (selectedDates.length === 0) { alert("Click at least one day on the calendar."); return; }
      const conflictDates = selectedDates.filter(d => findLeaveConflict(d, d, 'full', null));
      const datesToSubmit = selectedDates.filter(d => !conflictDates.includes(d));
      if (datesToSubmit.length === 0) { alert("All selected days already have a leave request."); return; }

      let failed = 0;
      for (const dateStr of datesToSubmit) {
        try {
          await api.applyLeaveWithFile({ type: 'full', reason, period: null, from_date: dateStr, to_date: dateStr }, file, token);
        } catch { failed++; }
      }
      setSelectedDates([]);
      setReason("");
      setFile(null);

      await load(true);
      const skippedMsg = conflictDates.length ? ` (${conflictDates.length} day${conflictDates.length > 1 ? "s" : ""} skipped — already requested.)` : "";
      if (failed === 0) alert(`Leave applied for ${datesToSubmit.length} day${datesToSubmit.length > 1 ? "s" : ""}.${skippedMsg}`);
      else alert(`${datesToSubmit.length - failed} of ${datesToSubmit.length} days applied. ${failed} failed — please retry those days.${skippedMsg}`);
      setLeaveSubView("my-leaves");
      setView("leave");
      return;
    }

    const conflict = findLeaveConflict(startDate, startDate, type, type === 'half' ? period : null);
    if (conflict) { alert(conflictMessage(conflict)); return; }

    try {
      let payload = {
          type,
          reason,
          period: type === 'half' ? period : null,
          from_date: startDate,
          to_date: startDate
      };

      await api.applyLeaveWithFile(payload, file, token);

      setStartDate("");
      setReason("");
      setFile(null);

      await load(true);
      alert("Leave Applied Successfully!");
      setLeaveSubView("my-leaves");
      setView("leave");
    } catch (err) {
        alert(err.message);
    }
  }

  /**
   * NEW: Updates the status of an Employee's Asset Request
   * This is the Manager's tier of the Dual-Approval system.
   */
  async function updateAssetStatus(id, status) {
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          const res = await fetch(`${baseUrl}/api/manager/assets/${id}`, {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ manager_status: status })
          });
          
          if(!res.ok) {
              const errData = await res.json();
              throw new Error(errData.message || "Failed to update asset status");
          }
          
          await load(true);
          alert(`Asset Request ${status} successfully. It will now pend Admin approval.`);
      } catch (err) {
          alert("Error updating asset: " + err.message);
      }
  }

  /**
   * NEW: Manager assigns an approved asset by emailing the office admin / procurement.
   * (This step was previously done by Admin — ownership moved to the Manager.)
   */
  async function sendAssetAssignment(e) {
    e.preventDefault();
    const emails = assignEmails.split(/[,\s]+/).map(x => x.trim()).filter(x => x.includes("@"));
    if (emails.length === 0) return setAssignMsg("Enter at least one valid email address.");
    setAssignSending(true); setAssignMsg("");
    try {
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      const res = await fetch(`${baseUrl}/api/manager/assets/${assignAsset._id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          emails,
          asset: {
            employee_name: assignAsset.employee_name,
            department:    assignAsset.department,
            asset_name:    assignAsset.asset_name,
            reason:        assignAsset.reason,
          },
        }),
      });
      if (res.ok) {
        setAssignMsg("Email sent successfully!");
        await load(true);
        setTimeout(() => { setAssignAsset(null); setAssignEmails(""); setAssignMsg(""); }, 1500);
      } else {
        const d = await res.json().catch(() => ({}));
        setAssignMsg(d.message || "Failed to send email.");
      }
    } catch { setAssignMsg("Network error. Please try again."); }
    finally { setAssignSending(false); }
  }

  // ============================================================================
  // UTILITY HELPERS (SAFELY UPDATED FOR DATE PARSING)
  // ============================================================================
  
  /**
   * Forcefully safe Date Formatter that handles null, undefined, or invalid dates
   * to prevent catastrophic React runtime errors in tables.
   */
  const formatDateTime = (dateString) => {
      if (!dateString) return { date: "N/A", time: "" };
      
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return { date: "N/A", time: "" }; 
      
      return {
          date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
  };

  /**
   * Validates file uploads to enforce maximum size limits before submission.
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert("File too large. Max 5MB allowed."); 
        e.target.value = null; 
        setFile(null);
    } else { 
        setFile(selectedFile); 
    }
  };

  /**
   * Enforces a strict word count limit on text areas to maintain clean database records.
   */
  const handleReasonChange = (e) => {
    const val = e.target.value;
    const words = val.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length <= MAX_WORDS) {
        setReason(val);
    }
  };
  
  const getWordCount = () => {
      return reason.trim() === "" ? 0 : reason.trim().split(/\s+/).filter(w => w.length > 0).length;
  };
  
  /**
   * Handles opening detailed statistical views in modal overlays.
   */
  const handleStatClick = (title, list) => { 
      setModalTitle(title); 
      setModalList(list); 
      setLeaveModalOpen(true); 
  };
  
  const getStatusClass = (status) => {
      return status ? status.toLowerCase() : "pending";
  };

  // ============================================================================
  // REUSABLE UI COMPONENTS
  // ============================================================================
  
  // QuickLaunchItem and StatItem are defined above the component for performance

  /**
   * UI Component to render a quick directory of the manager's assigned team.
   */
  const TeamMembersList = () => (
    <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
        <div style={{overflowX: 'auto'}}>
            <table className="styled-table-global">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Dept</th>
                        <th>Position</th>
                    </tr>
                </thead>
                <tbody>
                    {teamMembers.length === 0 && (
                        <tr>
                            <td colSpan="4" style={{textAlign:'center', padding:20}}>
                                No team members found in your department.
                            </td>
                        </tr>
                    )}
                    {[...teamMembers].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(m => (
                        <tr key={m._id}>
                            <td>{m.name}</td>
                            <td>{m.email}</td>
                            <td>{m.department}</td>
                            <td>{m.position}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  // ============================================================================
  // RENDER TEMPLATE
  // ============================================================================
  return (
    <>
    <div className="app-shell">
      <Sidebar
        role="manager"
        user={user}
        view={view}
        setView={setView}
        onLogout={onLogout}
        navBadges={{
          "chat": chatUnread,
          "team-leaves": notificationCounts?.leaves || 0,
          "pms": notificationCounts?.pms || 0,
          "corrections": notificationCounts?.corrections || 0,
          "announcements": notificationCounts?.announcements || 0,
          "team-assets": notificationCounts?.assets || 0,
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-area">
        <div className="main-topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)}><FaBars /></button>
          {view !== "dashboard" && (
            <button className="topbar-back" onClick={() => setView("dashboard")}><FaArrowLeft /></button>
          )}
          <span className="topbar-title">
            {view === "dashboard" ? "Manager Dashboard" : view.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </span>
          <div className="topbar-right">
            <button className="topbar-action-btn" title="Settings" onClick={() => setSettingsOpen(true)} style={{ padding: "7px 10px" }}>
              <FaCog size={14} />
            </button>
            <button className="topbar-profile-btn" onClick={() => setProfileOpen(true)}>
              <div className="topbar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
              <span className="topbar-user-name">{user?.name}</span>
            </button>
          </div>
        </div>
        <div className="main-content">
      <Suspense fallback={<div style={{ marginTop: 16 }}><SkeletonTable rows={6} cols={3} /></div>}>
      {/*
        -----------------------------------------------------------------------
        COMPONENT SCOPED CSS STYLING
        Expanded to multi-line format for superior readability and maintenance.
        The visual loader class has been entirely removed from this stylesheet.
        -----------------------------------------------------------------------
      */}
      <style>{`
        .qa-box { margin-bottom: 12px; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid var(--brand); transition: background 0.15s; }
        .qa-box:hover { background: #fff; }
        .inline-loader { display: flex; justify-content: center; align-items: center; padding: 40px; color: #64748b; font-weight: 500; gap: 10px; flex-direction: column; }
        .password-input-wrapper { position: relative; display: flex; align-items: center; margin-bottom: 15px; }
        .styled-table-global { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; table-layout: auto !important; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; background: #fff; }
        .styled-table-global th { background: #f8fafc; color: #64748b; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; text-align: left; padding: 11px 16px !important; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .styled-table-global td { padding: 12px 16px !important; border-bottom: 1px solid #f8fafc; color: #334155; vertical-align: middle !important; white-space: normal !important; word-wrap: break-word !important; }
        .styled-table-global tr:last-child td { border-bottom: none; }
        .styled-table-global tbody tr:hover td { background: #f8fafc; }
      `}</style>

      {/* Birthday Notification Banner */}
      {!birthdayDismissed && todayBirthdays.length > 0 && (
        <div className={`birthday-banner ${todayBirthdays.some(b => b.is_self) ? 'birthday-banner-self' : 'birthday-banner-others'}`}>
          <div className="birthday-banner-icon"><FaGift /></div>
          <div className="birthday-banner-text">
            {todayBirthdays.some(b => b.is_self) ? (
              <>
                <div className="birthday-banner-title">Happy Birthday, {user?.name?.split(' ')[0]}!</div>
                <div className="birthday-banner-sub">Wishing you a wonderful day filled with joy and success!</div>
              </>
            ) : (
              <>
                <div className="birthday-banner-title">
                  {todayBirthdays.slice(0, 3).map(b => b.name).join(', ')}{todayBirthdays.length > 3 ? ` +${todayBirthdays.length - 3} more` : ''} {todayBirthdays.length === 1 ? 'has' : 'have'} a birthday today!
                </div>
                <div className="birthday-banner-sub">Don't forget to wish them a great day!</div>
              </>
            )}
          </div>
          <button className="birthday-banner-dismiss" onClick={() => setBirthdayDismissed(true)}><FaTimes size={12} /></button>
        </div>
      )}

      {/* — Password Reset Modal — */}
      {showPasswordModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-card" style={{padding: 0}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid #f1f5f9'}}>
                  <div>
                    <h3 style={{color:'var(--red)', margin:0, fontSize:18, fontWeight:700}}>Set Secure Password</h3>
                    <p style={{margin:'4px 0 0', fontSize:13, color:'#64748b'}}>Please set a strong password to secure your account.</p>
                  </div>
                  <button
                    onClick={() => { setShowPasswordModal(false); setPassError(""); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                    style={{background:'#f1f5f9', border:'none', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#64748b', flexShrink:0}}
                  ><FaTimes size={13} /></button>
                </div>
                <div style={{padding:'20px 24px 24px'}}>
                {passError && <div className="alert" style={{marginBottom: 15, color: '#dc2626', background: '#fee2e2', padding: '10px', borderRadius: '8px'}}>{passError}</div>}
                
                <form onSubmit={handleSetPassword}>
                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                        <label className="modern-label">Current Password</label>
                        <input 
                            type={showOldPass ? "text" : "password"} 
                            className="modern-input" 
                            style={{ paddingRight: '40px' }}
                            placeholder="Enter current password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                        />
                        <span className="password-toggle-icon" onClick={() => setShowOldPass(!showOldPass)}>
                            {showOldPass ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                        <label className="modern-label">New Password</label>
                        <input 
                            type={showNewPass ? "text" : "password"} 
                            className="modern-input" 
                            style={{ paddingRight: '40px' }}
                            placeholder="1 Uppercase, 1 Lowercase, 1 Number, 1 Special Char"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <span className="password-toggle-icon" onClick={() => setShowNewPass(!showNewPass)}>
                            {showNewPass ? <FaEyeSlash /> : <FaEye />}
                        </span>
                        <PasswordStrengthMeter password={newPassword} />
                    </div>

                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                        <label className="modern-label">Confirm New Password</label>
                        <input 
                            type={showConfirmPass ? "text" : "password"} 
                            className="modern-input" 
                            style={{ paddingRight: '40px' }}
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <span className="password-toggle-icon" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                            {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    <button className="btn" style={{width: '100%', marginTop: 20, padding: 12}}>Save Password</button>
                </form>
                </div>
            </div>
        </div>
      )}

      {/* — Header — */}
      {view === "dashboard" ? (
        <div className="dashboard-header-card card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: "var(--red)", margin: 0 }}>Manager Dashboard</h2>
            <p className="small">Manage your team and your own attendance</p>
            {delegatedGrants.length > 0 && (
               <div style={{ marginTop: 10, display: 'inline-block', background: 'var(--brand-light)', color: 'var(--brand)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                You have special Admin privileges active.
               </div>
            )}
          </div>
          <button 
            onClick={() => {
              setPassError(""); 
              setOldPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setShowPasswordModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <FaLock /> Change Password
          </button>
        </div>
      ) : (
        <div className="dashboard-header-card card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn ghost" onClick={() => setView("dashboard")} style={{padding: '8px 12px', display:'flex', alignItems:'center', gap:6}}>
            <FaArrowLeft /> Back
          </button>
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'uppercase' }}>{view.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</h3>
        </div>
      )}
      
      {/* — Network Error — */}
      {loadError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '20px', marginTop: '16px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>Failed to load your data</div>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            This usually happens on a slow or new network. The server may be starting up.
          </div>
          <button className="btn" onClick={() => load()} style={{ padding: '10px 28px' }}>
            Retry
          </button>
        </div>
      )}

      {/* — Insights — */}
      {view === "dashboard" && <InsightsBanner leaves={myLeaves} />}

      {/* — Announcement Notifications — */}
      {view === "dashboard" && (
        <AnnouncementNotifications announcements={announcements} userId={user?._id} />
      )}

      {/* — Daily Quote — */}
      {view === "dashboard" && <DailyQuote />}

      {/* — Daily Work Plan — */}
      {view === "dashboard" && <DailyWorkPlan token={token} user={user} />}

      {/* — Dashboard Home — */}
      {view === "dashboard" && (
        <div className="dashboard-grid-container">
          
          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Actions</h4>
            <div className="quick-launch-grid">
              <QuickLaunchItem icon={<FaCamera />} label="Check In" onClick={() => openCamera("checkin")} />
              <QuickLaunchItem icon={<FaSignOutAlt />} label="Check Out" onClick={() => openCamera("checkout")} />
              <QuickLaunchItem icon={<FaUserCheck />} label="Team Leaves" onClick={() => setView("team-leaves")} badgeCount={notificationCounts?.leaves || 0} />
              <QuickLaunchItem icon={<FaChartLine />} label="PMS" onClick={() => setView("pms")} badgeCount={notificationCounts?.pms || 0} />
              <QuickLaunchItem icon={<FaUsers />} label="Dept Dashboard" onClick={() => setView("dept-dashboard")} />
              <QuickLaunchItem icon={<FaTags />} label="Work Types" onClick={() => setView("work-types")} />
              <QuickLaunchItem icon={<FaClipboardCheck />} label="Corrections" onClick={() => setView("corrections")} badgeCount={notificationCounts?.corrections || 0} />
              <QuickLaunchItem icon={<FaCalendarPlus />} label="Apply Leave" onClick={() => { setLeaveSubView("apply-leave"); setView("leave"); }} />
              <QuickLaunchItem icon={<FaCalendarCheck />} label="My Leaves" onClick={() => { setLeaveSubView("my-leaves"); setView("leave"); }} />
              <QuickLaunchItem icon={<FaHistory />} label="Attendance Log" onClick={() => { setAttendanceSubView("attendance-log"); setView("attendance"); }} />
              <QuickLaunchItem icon={<FaCalendarWeek />} label="Team Calendar" onClick={() => { setAttendanceSubView("team-calendar"); setView("attendance"); }} />
              <QuickLaunchItem icon={<FaBullhorn />} label="Announcements" onClick={() => setView("announcements")} badgeCount={notificationCounts?.announcements || 0} />
              <QuickLaunchItem icon={<FaLaptop />} label="Team Assets" onClick={() => setView("team-assets")} badgeCount={notificationCounts?.assets || 0} />
              {delegatedGrants.length > 0 && (
                <QuickLaunchItem icon={<FaUserShield />} label="Admin Portal (Special Access)" onClick={() => setView("special-access")} badgeCount={delegatedGrants.length} />
              )}
            </div>
          </div>

          <div className="card dashboard-widget">
            <h4 className="widget-title">My Leave Status</h4>
            <div className="stats-list">
              <StatItem icon={<FaHourglassHalf />} label="Pending" count={pendingLeaves.length} colorClass="text-orange" onClick={() => handleStatClick("My Pending", pendingLeaves)} />
              <StatItem icon={<FaCheckCircle />} label="Approved" count={approvedLeaves.length} colorClass="text-green" onClick={() => handleStatClick("My Approved", approvedLeaves)} />
              <StatItem icon={<FaTimesCircle />} label="Rejected" count={rejectedLeaves.length} colorClass="text-red" onClick={() => handleStatClick("My Rejected", rejectedLeaves)} />
            </div>
          </div>
        </div>
      )}

      {/* — Delegated Admin Portal — */}
      {view === "special-access" && (
         <div className="card" style={{ marginTop: "16px" }}>
            <h2 style={{ color: 'var(--red)', marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaUserShield /> Temporary Admin Portal
            </h2>
            <p style={{ color: '#666', marginBottom: 30 }}>
                You have been granted temporary administrative permissions. Select an action below to proceed.
            </p>

            <div className="quick-launch-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {DELEGATED_MODULES.filter(m => grantedModule(m.key)).map(m => (
                    <QuickLaunchItem key={m.key} icon={<m.Icon />} label={m.label} onClick={() => setView(`delegated-${m.key}`)} />
                ))}
            </div>
         </div>
      )}

      {/* --- SUB-VIEWS FOR DELEGATED ADMIN --- */}
      {DELEGATED_MODULES.filter(m => view === `delegated-${m.key}`).map(m => {
          const ctx = {
              token, api, user, delegatedEmployees,
              loadDelegatedEmployees, patchDelegatedEmployee, deleteDelegatedEmployee, promoteDelegatedEmployee,
          };
          return (
              <div key={m.key} style={{ marginTop: "16px" }}>
                  <div className="delegation-alert">
                      🛡️ {m.alert}{!grantedModuleWrite(m.key) ? " (View Only)" : ""}
                  </div>
                  <ErrorBoundary label={m.label} resetKey={view}>
                      <Suspense fallback={<SkeletonTable rows={6} cols={4} />}>
                          {m.render(ctx)}
                      </Suspense>
                  </ErrorBoundary>
              </div>
          );
      })}

      {/* — Announcements — */}
      {view === "announcements" && (
         <div className="card" style={{ marginTop: "16px", background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            <h3 style={{color: 'var(--red)'}}>Company Announcements</h3>
            <p style={{color: '#64748b', marginBottom: 20}}>View the latest news and updates from the administration.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {announcements.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                        <FaBullhorn size={40} style={{opacity: 0.2, marginBottom: 15}}/>
                        <p style={{margin: 0}}>No announcements currently active.</p>
                    </div>
                ) : (
                    announcements.map((ann) => (
                        <div key={ann._id} className="announcement-card">
                            <div className="announcement-header">
                                <h4 className="announcement-title">{ann.title}</h4>
                                <span className="announcement-date">
                                    {new Date(ann.created_at).toLocaleString('en-US', { 
                                        month: 'short', day: 'numeric', year: 'numeric', 
                                        hour: '2-digit', minute: '2-digit' 
                                    })}
                                </span>
                            </div>
                            
                            <div className="announcement-body">
                                {ann.message}
                            </div>
                        </div>
                    ))
                )}
            </div>
         </div>
      )}

      {/* — PMS (Build / Review / Calibrate, merged into one page) — */}
      {view === "pms" && (
        <div style={{ marginTop: 16 }}>
          <PMSWorkspace token={token} api={api} user={user} scope="manager" assignablePool={teamMembers} />
        </div>
      )}

      {/* — Work Types Setup — */}
      {view === "work-types" && (
        <div className="card" style={{ marginTop: 16, maxWidth: 560 }}>
          <WorkTypesManager
            token={token}
            department={Array.isArray(user?.department) ? user.department[0] : user?.department}
            canEdit={true}
          />
        </div>
      )}

      {/* — Dept Performance Dashboard — */}
      {view === "dept-dashboard" && (
          <div className="card">
              <div style={{display:'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: 20}}>
                  <h3 style={{margin:0}}>Department Performance Dashboard</h3>
                  <div style={{display:'flex', gap: 10}}>
                      <input 
                          type="month" 
                          className="modern-input" 
                          value={dashboardMonth} 
                          onChange={(e) => setDashboardMonth(e.target.value)} 
                      />
                      <button className="btn" style={{background: '#10b981', display:'flex', alignItems:'center', gap:5}} onClick={downloadReport}>
                          <FaDownload /> Export CSV
                      </button>
                  </div>
              </div>

              <div style={{overflowX:'auto'}}>
                <table className="styled-table-global">
                    <thead>
                        <tr>
                            <th>Department</th>
                            <th style={{textAlign:'center'}}>Total Employees</th>
                            <th style={{textAlign:'center'}}>Completed Reviews</th>
                            <th style={{textAlign:'center'}}>Avg Department Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deptDashboard.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:20}}>No data available for this month.</td></tr>}
                        {deptDashboard.map((row, idx) => (
                            <tr key={idx}>
                                <td style={{fontWeight: 'bold'}}>{row.department}</td>
                                <td style={{textAlign:'center'}}>{row.total_employees}</td>
                                <td style={{textAlign:'center'}}>{row.completed_pms}</td>
                                <td style={{textAlign:'center'}}>
                                    <span style={{fontSize: 16, fontWeight: 'bold', color: row.average_score >= 7 ? 'green' : row.average_score >= 5 ? 'orange' : 'red'}}>
                                        {row.average_score} / 10
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* — Corrections — */}
      {view === "corrections" && (
          <div className="card">
              <h3>Pending Attendance Corrections</h3>
              <div style={{overflowX:'auto'}}>
                <table className="styled-table-global">
                    <thead><tr><th>Employee</th><th>New Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingCorrections.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:20, color:'#999'}}>No pending corrections found.</td></tr>}
                        {pendingCorrections.map(c => {
                          const resolvedName = (c.employee_name && c.employee_name !== "Unknown")
                            ? c.employee_name
                            : (teamMembers.find(m => String(m._id) === String(c.employee_id || c.user_id || ""))?.name || c.employee_name || "—");
                          return (
                            <tr key={c._id}>
                                <td style={{fontWeight: 'bold'}}>{resolvedName}</td>
                                <td>{new Date(c.new_time).toLocaleString()}</td>
                                <td>{c.reason}</td>
                                <td><span className={`status-badge ${getStatusClass(c.status)}`}>{c.status}</span></td>
                                <td>
                                    {c.status === 'Pending' ? (
                                      <div style={{display:'flex', gap:5}}>
                                        <button className="btn-small" style={{background:'green'}} onClick={() => approveCorrection(c._id, 'Approved')}>
                                          <FaCheckCircle /> Approve
                                        </button>
                                        <button className="btn-small" style={{background:'#b91c1c'}} onClick={() => approveCorrection(c._id, 'Rejected')}>
                                          <FaTimesCircle /> Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span style={{color:'#888', fontStyle:'italic', fontSize:12}}>Processed</span>
                                    )}
                                </td>
                            </tr>
                          );
                        })}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* — Team Leaves — */}
      {view === "team-leaves" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Team Leave Requests</h3>
              <div style={{overflowX: 'auto'}}>
                <table className="styled-table-global">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th style={{minWidth: '95px'}}><FaClock style={{marginRight: 4, opacity: 0.7, marginBottom: -2}}/> Applied On</th>
                            <th>Period</th>
                            <th>Reason</th>
                            <th style={{textAlign:'center'}}>Manager</th>
                            <th style={{textAlign:'center'}}>HR</th>
                            <th style={{textAlign:'center'}}>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleTeamLeaves.length === 0 && <tr><td colSpan="8" style={{textAlign:'center', padding:20, color:'#999'}}>No leave requests found.</td></tr>}
                        {visibleTeamLeaves.map(l => {
                            const { date, time } = formatDateTime(l.applied_at || l.created_at);
                            return (
                            <tr key={l._id}>
                                {/* Employee Name & Type */}
                                <td>
                                    <div style={{fontWeight:700, color: "#0f172a", fontSize: 13}}>{l.employee_name}</div>
                                    <div style={{fontSize:10, color:'#64748b', marginTop: 4, textTransform: "uppercase", fontWeight: 600}}>
                                      {l.type === 'half' ? `Half Day` : 'Full Day'}
                                    </div>
                                </td>

                                {/* Applied Date & Time (Stacked safely) */}
                                <td style={{ fontWeight: 500, color: '#334155' }}>
                                    <div>{date}</div>
                                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{time}</div>
                                </td>

                                {/* Leave Target Date(s) */}
                                <td style={{ fontWeight: 500, fontSize: 12 }}>
                                    {l.from_date && l.to_date && l.from_date !== l.to_date 
                                       ? (<>
                                             <div>{new Date(l.from_date).toLocaleDateString('en-GB')}</div>
                                             <div style={{color: '#94a3b8', fontSize: 10}}>to</div>
                                             <div>{new Date(l.to_date).toLocaleDateString('en-GB')}</div>
                                          </>)
                                       : <div>{l.date ? new Date(l.date).toLocaleDateString('en-GB') : '-'}</div>
                                    }
                                </td>

                                {/* Context (Reason and File) */}
                                <td style={{maxWidth:'180px'}}>
                                    <div style={{fontSize:11, color:'#475569', lineHeight:'1.4', marginBottom: l.attachment_url ? 6 : 0}}>
                                      {l.reason || <span style={{fontStyle:'italic', color:'#cbd5e1'}}>No reason</span>}
                                    </div>
                                    {resolveAttachmentUrl(l.attachment_url, api.baseUrl) && (
                                      <div>
                                        <a
                                          href={resolveAttachmentUrl(l.attachment_url, api.baseUrl)}
                                          target="_blank" 
                                          rel="noreferrer"
                                          style={{ 
                                              display: 'inline-flex', alignItems: 'center', gap: 4, color: "var(--red)", 
                                              fontSize: "10px", textDecoration: "none", fontWeight: 600,
                                              background: '#fef2f2', padding: '4px 6px', borderRadius: 4
                                          }}
                                        >
                                          <FaFileDownload /> View
                                        </a>
                                      </div>
                                    )}
                                </td>

                                {/* Statuses */}
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(l.manager_status || 'Pending')}`}>
                                      {l.manager_status || 'Pending'}
                                    </span>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(l.admin_status || 'Pending')}`}>
                                      {l.admin_status || 'Pending'}
                                    </span>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span>
                                </td>

                                {/* Action Buttons - Always Visible & Forced Stacked */}
                                <td>
                                    <div className="action-btn-group">
                                        <button
                                            className="action-btn btn-approve"
                                            onClick={() => updateLeaveStatus(l._id, "Approved")}
                                        >
                                            <FaCheckCircle /> Approve
                                        </button>
                                        <button
                                            className="action-btn btn-reject"
                                            onClick={() => updateLeaveStatus(l._id, "Rejected")}
                                        >
                                            <FaTimesCircle /> Reject
                                        </button>
                                        {(l.status === "Pending" || l.status === "Approved") && (
                                            <button
                                                className="action-btn"
                                                style={{ color: "#dc2626", borderColor: "#fecaca" }}
                                                onClick={() => handleRevokeLeave(l._id)}
                                            >
                                                Revoke
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* — Team Assets — */}
      {view === "team-assets" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Team Hardware & Asset Requests</h3>
              <p className="small" style={{marginBottom: 20}}>Review and approve equipment requests from your department employees. Approved requests will be forwarded to Administration for final provisioning.</p>
              
              <div style={{overflowX: 'auto'}}>
                <table className="styled-table-global">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Requested Asset</th>
                            <th>Justification / Reason</th>
                            <th style={{textAlign:'center'}}>Manager Status</th>
                            <th style={{textAlign:'center'}}>Admin Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamAssets.length === 0 ? (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:40, color:'#999'}}>No pending asset requests from your team.</td></tr>
                        ) : (
                            teamAssets.map(asset => (
                            <tr key={asset._id}>
                                <td>
                                    <div style={{fontWeight:700, color: "#0f172a", fontSize: 13}}>{asset.employee_name}</div>
                                    <div style={{fontSize:10, color:'#64748b', marginTop: 4}}>{new Date(asset.created_at).toLocaleDateString('en-GB')}</div>
                                </td>
                                <td style={{ fontWeight: 600, color: '#334155' }}>
                                    {asset.asset_name}
                                </td>
                                <td style={{maxWidth:'250px'}}>
                                    <div style={{fontSize:12, color:'#475569', lineHeight:'1.4'}}>
                                      {asset.reason}
                                    </div>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(asset.manager_status || 'Pending')}`}>
                                      {asset.manager_status || 'Pending'}
                                    </span>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(asset.admin_status || 'Pending')}`}>
                                      {asset.admin_status || 'Pending'}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-btn-group">
                                        <button 
                                            className="action-btn btn-approve" 
                                            onClick={async () => {
                                                try {
                                                    const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
                                                    await fetch(`${baseUrl}/api/manager/assets/${asset._id}`, {
                                                        method: 'PUT',
                                                        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                                                        body: JSON.stringify({ manager_status: 'Approved' })
                                                    });
                                                    await load(true);
                                                    alert('Asset Request Approved');
                                                } catch(e) { alert(e.message); }
                                            }}
                                        >
                                            <FaCheckCircle /> Approve
                                        </button>
                                        <button 
                                            className="action-btn btn-reject" 
                                            onClick={async () => {
                                                try {
                                                    const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
                                                    await fetch(`${baseUrl}/api/manager/assets/${asset._id}`, {
                                                        method: 'PUT',
                                                        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                                                        body: JSON.stringify({ manager_status: 'Rejected' })
                                                    });
                                                    await load(true);
                                                    alert('Asset Request Rejected');
                                                } catch(e) { alert(e.message); }
                                            }}
                                        >
                                            <FaTimesCircle /> Reject
                                        </button>
                                        {(asset.manager_status || "").toLowerCase() === "approved" && (
                                            <button
                                                onClick={() => { setAssignAsset(asset); setAssignEmails(""); setAssignMsg(""); }}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: 5,
                                                    padding: "5px 10px", borderRadius: 6, border: "none",
                                                    background: "#0f766e", color: "#fff",
                                                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                <FaSave size={10} /> Assign to Mail
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* ── Assign to Mail Modal (Manager-owned provisioning step) ── */}
      {assignAsset && (
        <div className="modal-overlay" onClick={() => setAssignAsset(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, color: "#0f766e", fontSize: 16 }}>Assign Asset by Email</h3>
                <p style={{ margin: "5px 0 0", fontSize: 12, color: "#64748b" }}>
                  An email with the request details will be sent to the entered addresses.
                </p>
              </div>
              <button onClick={() => setAssignAsset(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <FaTimes />
              </button>
            </div>

            {/* Asset summary */}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontSize: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Employee",   value: assignAsset.employee_name },
                  { label: "Department", value: assignAsset.department || "—" },
                  { label: "Asset",      value: assignAsset.asset_name },
                  { label: "Reason",     value: assignAsset.reason },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                    <div style={{ fontWeight: 600, color: "#0c4a6e", marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {assignMsg && (
              <div style={{
                marginBottom: 14, padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: assignMsg.includes("success") ? "#f0fdf4" : "#fef2f2",
                color:      assignMsg.includes("success") ? "#16a34a"  : "#b91c1c",
                border: `1px solid ${assignMsg.includes("success") ? "#bbf7d0" : "#fecaca"}`,
              }}>
                {assignMsg}
              </div>
            )}

            <form onSubmit={sendAssetAssignment}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 6 }}>
                Recipient Email(s)
                <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 6 }}>separate multiple with comma</span>
              </label>
              <textarea
                className="modern-input"
                rows={3}
                placeholder="admin@company.com, procure@company.com"
                value={assignEmails}
                onChange={e => setAssignEmails(e.target.value)}
                required
                style={{ resize: "none" }}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button className="btn" type="submit" disabled={assignSending}
                  style={{ background: "#0f766e", display: "flex", alignItems: "center", gap: 6 }}>
                  <FaSave size={11} /> {assignSending ? "Sending…" : "Send Email"}
                </button>
                <button className="btn ghost" type="button" onClick={() => setAssignAsset(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* — Team Directory — */}
      {view === "team-members" && <TeamMembersList />}

      {/* — Leave (Apply + My Leaves, tabbed) — */}
      {view === "leave" && (
        <>
          <div style={{ display: "flex", gap: 4, marginTop: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
            <button onClick={() => setLeaveSubView("apply-leave")} style={{
              padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: leaveSubView === "apply-leave" ? "var(--red)" : "transparent", color: leaveSubView === "apply-leave" ? "#fff" : "#64748b", transition: "all 0.15s",
            }}>Apply Leave</button>
            <button onClick={() => setLeaveSubView("my-leaves")} style={{
              padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: leaveSubView === "my-leaves" ? "var(--red)" : "transparent", color: leaveSubView === "my-leaves" ? "#fff" : "#64748b", transition: "all 0.15s",
            }}>My Leaves</button>
          </div>

      {leaveSubView === "apply-leave" && (
        <div className="card" style={{ marginTop: 16 }}>
          <form onSubmit={applyLeave}>
             <h3 style={{marginTop:0}}>Apply for Leave</h3>
             <div style={{display:'flex', gap:20, marginBottom:15}}>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                    <input type="radio" name="duration" checked={leaveDuration === 'single'} onChange={() => setLeaveDuration('single')} />
                    <FaCalendarAlt style={{color: "var(--red)"}} /><span style={{fontWeight:500}}>Single Day</span>
                </label>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                    <input type="radio" name="duration" checked={leaveDuration === 'multiple'} onChange={() => setLeaveDuration('multiple')} />
                    <FaCalendarAlt style={{color: "var(--red)"}} /><span style={{fontWeight:500}}>Multiple Days</span>
                </label>
            </div>
            {leaveDuration === 'single' && (
              <div className="form-row">
                <div style={{flex:1}}>
                  <label className="modern-label">Date</label>
                  <input className="modern-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div style={{flex:1}}>
                  <label className="modern-label">Leave Type</label>
                  <select className="modern-input" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="full">Full Day</option>
                    <option value="half">Half Day</option>
                  </select>
                </div>
                {type === 'half' && (
                  <div style={{flex:1}}>
                    <label className="modern-label">Period</label>
                    <select className="modern-input" value={period} onChange={(e) => setPeriod(e.target.value)}>
                      <option value="First Half">First Half</option>
                      <option value="Second Half">Second Half</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {leaveDuration === 'multiple' && (
              <div style={{ marginBottom: 15 }}>
                <label className="modern-label">Select Days</label>
                <LeaveCalendar selected={selectedDates} onToggle={toggleLeaveDate} />
                {selectedDates.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {selectedDates.map(d => (
                      <span key={d} style={{
                        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                        background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 20, padding: "4px 10px",
                      }}>
                        {new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        <button type="button" onClick={() => toggleLeaveDate(d)} style={{ border: "none", background: "none", cursor: "pointer", color: "#16a34a", fontWeight: 800, padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                    <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>{selectedDates.length} day{selectedDates.length > 1 ? "s" : ""} selected</span>
                  </div>
                )}
              </div>
            )}
            <div style={{marginTop: 15}}>
              <label className="modern-label">Reason for Leave</label>
              <textarea className="modern-input" style={{minHeight: "100px", resize: "vertical"}} value={reason} onChange={handleReasonChange} required placeholder="Reason (Max 30 words)..." />
              <div className="small" style={{textAlign:'right', marginTop:4, color: getWordCount() === MAX_WORDS ? 'red' : '#777'}}>{getWordCount()}/{MAX_WORDS} words</div>
            </div>
            <div style={{marginTop: 15}}>
              <label className="modern-label">Attachment (Optional)</label>
              <label className="file-upload-label">
                <FaCloudUploadAlt size={24} />
                <span>{file ? file.name : "Click to upload a document (Max 5MB)"}</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={{display: "none"}} />
              </label>
            </div>
            <div style={{ marginTop: 25, display:'flex', justifyContent:'flex-end' }}>
              <button className="btn" type="submit" style={{padding: "10px 24px"}}>Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {leaveSubView === "my-leaves" && (
        <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
          <div style={{overflowX: 'auto'}}>
            <table className="styled-table">
              <thead><tr><th>Date</th><th>Type</th><th style={{textAlign:'center'}}>Manager</th><th style={{textAlign:'center'}}>HR</th><th style={{textAlign:'center'}}>Overall</th><th>Attachment</th><th>Action</th></tr></thead>
              <tbody>
                {myLeaves.length === 0 ? (
                  <tr><td colSpan="7" style={{textAlign:"center", padding:20, color:"#999"}}>No leaves found.</td></tr>
                ) : (
                  myLeaves.map((l) => (
                    <tr key={l._id} onClick={() => setViewLeave(l)} style={{cursor:'pointer'}} title="Click for full details">
                      <td style={{fontWeight:500}}>{l.from_date && l.to_date && l.from_date !== l.to_date ? `${l.from_date} to ${l.to_date}` : l.date}</td>
                      <td style={{textTransform:"capitalize"}}>{l.type === 'half' ? `Half (${l.period || '-'})` : l.type}</td>
                      <td style={{textAlign:'center'}}><span className={`status-badge ${getStatusClass(l.manager_status)}`}>{l.manager_status || 'Pending'}</span></td>
                      <td style={{textAlign:'center'}}><span className={`status-badge ${getStatusClass(l.admin_status)}`}>{l.admin_status || 'Pending'}</span></td>
                      <td style={{textAlign:'center'}}><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span></td>
                      <td onClick={e => e.stopPropagation()}>{resolveAttachmentUrl(l.attachment_url, api.baseUrl) ? <a href={resolveAttachmentUrl(l.attachment_url, api.baseUrl)} target="_blank" rel="noreferrer" style={{color:"var(--red)", fontSize:13}}>View</a> : "-"}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {(l.status === "Pending" || l.status === "Approved") && (
                          <button className="btn ghost" style={{fontSize:12, padding:'5px 12px', color:'#dc2626', borderColor:'#fecaca'}} onClick={() => handleRevokeLeave(l._id)}>
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* — Attendance Correction Form — */}
      {view === "correction" && (
        <div className="card" style={{marginTop: 16}}>
          <h3>Request Attendance Correction</h3>
          <p className="small" style={{marginBottom:20}}>Your correction request will be sent to Admin for approval.</p>
          <form onSubmit={submitCorrection}>
            <div style={{marginBottom:15}}>
              <label className="modern-label">Correct Date &amp; Time</label>
              <input className="modern-input" type="datetime-local" required
                value={correctionData.newTime}
                onChange={e => setCorrectionData({...correctionData, newTime: e.target.value})} />
            </div>
            <div style={{marginBottom:15}}>
              <label className="modern-label">Reason</label>
              <input className="modern-input" type="text" required placeholder="e.g. Forgot to punch out due to meeting..."
                value={correctionData.reason}
                onChange={e => setCorrectionData({...correctionData, reason: e.target.value})} />
            </div>
            <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
              <button type="button" className="btn ghost" onClick={() => { setAttendanceSubView("attendance-log"); setView("attendance"); }}>Cancel</button>
              <button type="submit" className="btn">Send Request</button>
            </div>
          </form>
        </div>
      )}

      {/* — Attendance (Log + Team Calendar, tabbed) — */}
      {view === "attendance" && (
        <>
          <div style={{ display: "flex", gap: 4, marginTop: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
            <button onClick={() => setAttendanceSubView("attendance-log")} style={{
              padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: attendanceSubView === "attendance-log" ? "var(--red)" : "transparent", color: attendanceSubView === "attendance-log" ? "#fff" : "#64748b", transition: "all 0.15s",
            }}>Attendance Log</button>
            <button onClick={() => setAttendanceSubView("team-calendar")} style={{
              padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: attendanceSubView === "team-calendar" ? "var(--red)" : "transparent", color: attendanceSubView === "team-calendar" ? "#fff" : "#64748b", transition: "all 0.15s",
            }}>Team Calendar</button>
          </div>

      {attendanceSubView === "attendance-log" && (
        <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px'}}>
                <h3 style={{margin:0, color:'var(--red)'}}>My Attendance Log</h3>
                <button className="btn" style={{fontSize:'13px'}} onClick={() => { setCorrectionData({newTime:'',reason:''}); setView("correction"); }}>
                  <FaEdit style={{marginRight:5}}/> Attendance Correction Request
                </button>
            </div>
            <div style={{overflowX: 'auto'}}>
                <table className="styled-table-global">
                  <thead><tr><th>Type</th><th>Date / Time</th><th>Photo</th></tr></thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr><td colSpan="3" style={{textAlign:'center', padding:20}}>No attendance records.</td></tr>
                    ) : (
                      attendance.map((a) => (
                        <tr key={a._id}>
                          <td style={{fontWeight: 600}}><span className={`status-badge ${a.type}`}>{a.type === 'checkin' ? 'Check In' : 'Check Out'}</span></td>
                          <td>{new Date(a.time).toLocaleString()}</td>
                          <td>{resolveAttachmentUrl(a.photo_url, api.baseUrl) ? <a href={resolveAttachmentUrl(a.photo_url, api.baseUrl)} target="_blank" rel="noreferrer" style={{color:"var(--red)", fontSize:13}}>View</a> : "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
            </div>
        </div>
      )}

      {attendanceSubView === "team-calendar" && (
        <div style={{ marginTop: 16 }}>
          <ErrorBoundary label="Team Calendar" resetKey={view}>
            <Suspense fallback={<div />}>
              <AttendanceCalendar token={token} api={api} mode="manager" employees={teamMembers} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
        </>
      )}

      {/* — Holidays & Modals — */}
      {view === "holidays" && <div style={{ marginTop: "16px" }}><HolidayCalendar /></div>}
      {view === "chat"    && <ErrorBoundary label="Messages" resetKey={view}><Chat token={token} api={api} user={user} /></ErrorBoundary>}
      {view === "lms"     && <ErrorBoundary label="LMS" resetKey={view}><Suspense fallback={<div />}><ManagerLMS token={token} user={user} myEmployees={teamMembers} /></Suspense></ErrorBoundary>}
      {view === "career"  && <ErrorBoundary label="Career" resetKey={view}><EmployeeCareer token={token} user={user} /></ErrorBoundary>}
      {view === "work-analytics" && <ErrorBoundary label="My Work" resetKey={view}><WorkAnalytics token={token} user={user} /></ErrorBoundary>}
      {view === "work-by-team"   && <ErrorBoundary label="Work by Team" resetKey={view}><AdminWorkByTeam token={token} role="manager" /></ErrorBoundary>}
      {view === "clients"        && <ErrorBoundary label="Clients" resetKey={view}><AdminClients token={token} /></ErrorBoundary>}
      {view === "ats"            && <ErrorBoundary label="Recruitment" resetKey={view}><AdminATS token={token} role="manager" /></ErrorBoundary>}
      {view === "payroll" && <ErrorBoundary label="Payroll" resetKey={view}>
        {(() => {
          const depts = Array.isArray(user?.department) ? user.department : (user?.department ? [user.department] : []);
          const hasPayrollAccess = depts.some(d => {
            const lower = (d || "").toLowerCase();
            return lower.includes("account") || lower.includes("hr") || lower.includes("human resource");
          });
          return hasPayrollAccess ? <AdminPayroll token={token} employees={payrollEmployees} /> : <EmployeePayroll token={token} />;
        })()}
      </ErrorBoundary>}

      {leaveModalOpen && (
        <div className="modal-overlay" onClick={() => setLeaveModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{padding:0, display:'flex', flexDirection:'column', maxHeight:'85vh'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:'1px solid #e2e8f0', flexShrink:0}}>
              <h3 style={{ margin: 0, fontSize:19, color: '#0f172a' }}>{modalTitle}</h3>
              <button
                onClick={() => setLeaveModalOpen(false)}
                style={{ background:'#f1f5f9', border:'none', cursor:'pointer', color:'#475569', width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
              ><FaTimes size={15} /></button>
            </div>
            <div style={{overflowY:'auto', flex:1, padding:'8px 24px 20px'}}>
               {modalList.length === 0 ? (
                  <div style={{textAlign:'center', padding:'30px 0', color:'#94a3b8', fontSize:13}}>No records found.</div>
               ) : modalList.map((l) => (
                  <div key={l._id} style={{padding:'12px 4px', borderBottom:'1px solid #f4f6f8'}}>
                    <div style={{fontWeight:600, color:'#0f172a'}}>{l.date || l.from_date}</div>
                    <div style={{fontSize:13, color:'#64748b', margin:'3px 0 6px'}}>"{l.reason || "No reason"}"</div>
                    <span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* — Leave Full-Detail Modal (click a row in "My Leaves") — */}
      {viewLeave && (
        <div className="modal-overlay" onClick={() => setViewLeave(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{padding:0, display:'flex', flexDirection:'column', maxHeight:'85vh', width:480}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:'1px solid #e2e8f0', flexShrink:0}}>
              <h3 style={{ margin: 0, fontSize:19, color: '#0f172a' }}>Leave Details</h3>
              <button
                onClick={() => setViewLeave(null)}
                style={{ background:'#f1f5f9', border:'none', cursor:'pointer', color:'#475569', width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
              ><FaTimes size={15} /></button>
            </div>
            <div style={{overflowY:'auto', flex:1, padding:'20px 24px 24px', display:'flex', flexDirection:'column', gap:16}}>
              <div>
                <div style={{fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.4, marginBottom:4}}>Leave Period</div>
                <div style={{fontSize:15, fontWeight:600, color:'#0f172a'}}>
                  {viewLeave.from_date && viewLeave.to_date && viewLeave.from_date !== viewLeave.to_date
                    ? `${viewLeave.from_date} → ${viewLeave.to_date}`
                    : (viewLeave.from_date || viewLeave.date)}
                </div>
                <div style={{fontSize:13, color:'#64748b', marginTop:2, textTransform:'capitalize'}}>
                  {viewLeave.type === 'half' ? `Half Day (${viewLeave.period || 'Any'})` : 'Full Day'}
                </div>
              </div>

              <div>
                <div style={{fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.4, marginBottom:4}}>Reason</div>
                <div style={{fontSize:14, color:'#334155', lineHeight:1.5}}>
                  {viewLeave.reason || <span style={{fontStyle:'italic', color:'#cbd5e1'}}>No reason provided</span>}
                </div>
              </div>

              <div>
                <div style={{fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.4, marginBottom:4}}>Applied On</div>
                <div style={{fontSize:14, color:'#334155'}}>
                  {viewLeave.applied_at ? new Date(viewLeave.applied_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                </div>
              </div>

              {viewLeave.attachment_url && (
                <div>
                  <div style={{fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.4, marginBottom:4}}>Attachment</div>
                  {resolveAttachmentUrl(viewLeave.attachment_url, api.baseUrl) ? (
                    <a href={resolveAttachmentUrl(viewLeave.attachment_url, api.baseUrl)} target="_blank" rel="noreferrer" style={{color:'var(--red)', fontSize:13, fontWeight:600}}>View Document</a>
                  ) : <span style={{fontSize:13, color:'#94a3b8'}}>—</span>}
                </div>
              )}

              <div>
                <div style={{fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.4, marginBottom:8}}>Approval Status</div>
                <div style={{display:'flex', gap:20}}>
                  <div>
                    <div style={{fontSize:11, color:'#94a3b8', marginBottom:4}}>Manager</div>
                    <span className={`status-badge ${getStatusClass(viewLeave.manager_status)}`}>{viewLeave.manager_status || 'Pending'}</span>
                  </div>
                  <div>
                    <div style={{fontSize:11, color:'#94a3b8', marginBottom:4}}>HR</div>
                    <span className={`status-badge ${getStatusClass(viewLeave.admin_status)}`}>{viewLeave.admin_status || 'Pending'}</span>
                  </div>
                  <div>
                    <div style={{fontSize:11, color:'#94a3b8', marginBottom:4}}>Overall</div>
                    <span className={`status-badge ${getStatusClass(viewLeave.status)}`}>{viewLeave.status || 'Pending'}</span>
                  </div>
                </div>
              </div>

              {viewLeave.status === "Cancelled" && viewLeave.cancelled_at && (
                <div style={{fontSize:12.5, color:'#64748b', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px'}}>
                  Revoked on {new Date(viewLeave.cancelled_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  {viewLeave.cancelled_by_role ? ` by ${viewLeave.cancelled_by_role}` : ''}.
                </div>
              )}

              {(viewLeave.status === "Pending" || viewLeave.status === "Approved") && (
                <button
                  className="btn ghost"
                  style={{alignSelf:'flex-start', fontSize:13, padding:'8px 16px', color:'#dc2626', borderColor:'#fecaca'}}
                  onClick={() => { handleRevokeLeave(viewLeave._id); setViewLeave(null); }}
                >
                  Revoke This Leave
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* — Camera Modal — */}
      {cameraOpen && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
          <div className="camera-box" style={{position: 'relative', background:'#fff', padding:20, borderRadius:8, width:400, maxWidth:'90%', textAlign:'center'}}>
            
            <button 
                className="btn ghost" 
                style={{ position: 'absolute', top: 10, right: 10, padding: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px' }} 
                onClick={closeCamera}
            >
                <FaTimes />
            </button>

            {submittingPhoto ? (
                <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div className="loader"></div>
                    <p style={{ marginTop: 15, fontWeight: 500, color: "#555", fontSize: "18px" }}>Submitting attendance...</p>
                    <p style={{ fontSize: 14, color: "#888" }}>Please wait...</p>
                </div>
            ) : (
                <>
                    <h4 style={{marginBottom: 10, color: '#333'}}>{actionType === 'checkin' ? 'Check In' : 'Check Out'}</h4>
                    <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: "8px", background:'#000', display: previewImage ? 'none' : 'block' }}></video>
                    {previewImage && <img src={previewImage} style={{ width: "100%", borderRadius: "8px", display: 'block' }} alt="Preview" />}
                    <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
                    <div style={{ marginTop: 15, display:'flex', justifyContent:'center', gap: 10 }}>
                        {!previewImage ? (
                            <>
                                <button className="btn" onClick={capturePhoto}>Capture</button>
                                <button className="btn ghost" onClick={closeCamera}>Cancel</button>
                            </>
                        ) : (
                            <>
                                <button className="btn" onClick={() => submitAttendance(previewImage)}>Submit</button>
                                <button className="btn ghost" onClick={() => setPreviewImage(null)}>Retake</button>
                            </>
                        )}
                    </div>
                </>
            )}
          </div>
        </div>
      )}
      </Suspense>
        </div>
      </div>
    </div>

    <ProfilePanel user={user} token={token} api={api} isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    {settingsOpen && <SettingsModal token={token} api={api} onClose={() => setSettingsOpen(false)} />}
    <ChatBot token={token} api={api} user={user} role="manager" onNavigate={(v, subView) => {
      if (v === "leave" && subView) setLeaveSubView(subView);
      if (v === "attendance" && subView) setAttendanceSubView(subView);
      setView(v);
    }} />
    </>
  );
}
