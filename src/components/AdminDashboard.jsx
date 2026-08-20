import React, { useEffect, useState, lazy, Suspense } from "react";
import Sidebar from "./Sidebar";

// ============================================================================
// COMPONENT IMPORTS — view-specific pages are lazy-loaded on demand
// ============================================================================
const Chat                   = lazy(() => import("./Chat"));
const EmployeeForm           = lazy(() => import("./EmployeeForm"));
const EmployeeList           = lazy(() => import("./EmployeeList"));
const RegisterAdmin          = lazy(() => import("./RegisterAdmin"));
const AdminLeavePage         = lazy(() => import("./AdminLeavePage"));
const AdminAttendancePage    = lazy(() => import("./AdminAttendancePage"));
const RegisterManager        = lazy(() => import("./RegisterManager"));
const AdminAttendanceSummary = lazy(() => import("./AdminAttendanceSummary"));
const HolidayCalendar        = lazy(() => import("./HolidayCalendar"));
const AdminDepartments       = lazy(() => import("./AdminDepartments"));
const AdminAnnouncements     = lazy(() => import("./AdminAnnouncements"));
const AdminAssets            = lazy(() => import("./AdminAssets"));

// ============================================================================
// ICON IMPORTS
// ============================================================================
import {
  FaUserPlus,
  FaUsers,
  FaCalendarCheck,
  FaClock,
  FaChartPie,
  FaUserTie,
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaUserClock,
  FaUserSlash,
  FaTimes,
  FaCalendarAlt,
  FaBullhorn,
  FaUserShield,
  FaTrash,
  FaEdit,
  FaLaptop,
  FaBars,
  FaGift,
  FaBuilding,
  FaTasks,
  FaCog
} from "react-icons/fa";
import ProfilePanel from "./ProfilePanel";
import SettingsModal from "./SettingsModal";
import AdminInsights from "./AdminInsights";
import ErrorBoundary from "./ErrorBoundary";
import useChatUnread from "./useChatUnread";
import ChatBot from "./ChatBot";
import PMSWorkspace from "./PMSWorkspace";
import { SkeletonTable } from "./Skeleton";
import { ymd, ym } from "../utils/dateUtils";

const AdminAssessment = lazy(() => import("./AdminAssessment"));
const AdminLMS        = lazy(() => import("./AdminLMS"));
const AdminCareer     = lazy(() => import("./AdminCareer"));
const AdminPayroll    = lazy(() => import("./AdminPayroll"));
const WorkAndClients = lazy(() => import("./WorkAndClients"));
const AdminATS        = lazy(() => import("./AdminATS"));

// ============================================================================
// MAIN EXPORT: ADMIN DASHBOARD
// ============================================================================
function QuickLaunchItem({ icon, label, onClick, color = "var(--red)" }) {
  return (
    <button type="button" className="quick-launch-item" onClick={onClick} aria-label={label}>
      <div className="quick-launch-icon" style={{color}}>{icon}</div>
      <div className="quick-launch-label">{label}</div>
    </button>
  );
}

function KpiTile({ icon, label, value, tone = "brand", onClick }) {
  const tones = {
    brand: { color: "var(--brand)", bg: "var(--brand-light)" },
    green: { color: "#16a34a", bg: "#f0fdf4" },
    teal:  { color: "#0f766e", bg: "#effdf8" },
    amber: { color: "#d97706", bg: "#fffbeb" },
    slate: { color: "#475569", bg: "#f1f5f9" },
  };
  const t = tones[tone] || tones.brand;
  return (
    <div className={`kpi-tile${onClick ? " kpi-clickable" : ""}`} onClick={onClick}>
      <div className="kpi-icon" style={{ color: t.color, background: t.bg }}>{icon}</div>
      <div className="kpi-meta">
        <span className="kpi-value">{value ?? 0}</span>
        <span className="kpi-label">{label}</span>
      </div>
    </div>
  );
}

function empExitStatus(emp) {
  if (!emp.resignation?.notice_date) return null;
  const lwd = emp.resignation.last_working_day;
  if (!lwd) return "notice";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(lwd) < today ? "offboarded" : "notice";
}

function StatItem({ icon, label, count, colorClass, onClick }) {
  return (
    <div className="stat-row clickable-stat" onClick={onClick} title="Click to view details">
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-count">{count ?? 0}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard({ token, api, user, onLogout }) {

  const chatUnread = useChatUnread(token, api);

  // — Core States —
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("dashboard");
  const [subView, setSubView] = useState("list");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [birthdayDismissed, setBirthdayDismissed] = useState(false);

  // Stats State for Dashboard Overview Widgets
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    not_checked_in: 0,
  });

  // Modal State for Viewing Detailed Clickable Stats
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailList, setDetailList] = useState([]);
  const [detailLeaves, setDetailLeaves] = useState([]);
  const [detailType, setDetailType] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  // Pre-loaded today's leave roster (single source of truth for KPI + modal)
  const [todayLeaveRows, setTodayLeaveRows] = useState(null);

  // — Grant Access States —
  const [accessGrants, setAccessGrants] = useState([]);
  const [grantableModules, setGrantableModules] = useState([]); // [{key, label}] from backend — single source of truth
  const [grantData, setGrantData] = useState({
      employeeId: "",
      modules: [],
      accessLevel: "view_only",
      scope: "today",
      customDate: "",
      expiry: "end_of_day",
      customExpiryTime: ""
  });

  // — Notification badge counts —
  const [notifCounts, setNotifCounts] = useState({ leaves: 0, assets: 0, announcements: 0, corrections: 0 });

  // — Attendance Correction requests routed to admin (manager/admin/owner
  // self-submitted corrections — see request_correction()'s approval_target) —
  const [corrections, setCorrections] = useState([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  // — Department State — (the management UI itself now lives in
  // AdminDepartments.jsx; this stays only as the shared source for the
  // Department dropdowns on EmployeeForm/EmployeeList/AdminLMS/AdminATS)
  const [departments, setDepartments] = useState([]);

  // — Data Loaders —

  // Builds today's leave roster — same dedup logic as the modal so KPI ↔ modal are always in sync.
  async function loadTodayLeaves(empList) {
    const todayStr = ymd();
    const src = empList || employees;
    try {
      const allLeaves = await api.adminLeaves(token);
      const rawList = Array.isArray(allLeaves) ? allLeaves : (allLeaves?.leaves || []);
      const leaveList = rawList.filter(l => {
        const st = (l.status || "").toLowerCase();
        if (st === "rejected" || st === "cancelled") return false;
        if (l.from_date && l.to_date) return String(l.from_date).slice(0, 10) <= todayStr && String(l.to_date).slice(0, 10) >= todayStr;
        return String(l.date || "").slice(0, 10) === todayStr;
      });

      const leaveRows = leaveList.map(l => {
        const emp = src.find(e => String(e._id) === String(l.employee_id) || e.name === l.employee_name);
        return { ...l, department: l.department || emp?.department || "—" };
      });

      // Add employees with active extended_leaves not already captured
      const leaveEmpNames = new Set(leaveRows.map(r => r.employee_name));
      src.forEach(e => {
        if (!e.resignation?.notice_date &&
            e.extended_leaves?.some(lv => lv.from_date <= todayStr && lv.to_date >= todayStr) &&
            !leaveEmpNames.has(e.name)) {
          const lv = e.extended_leaves[e.extended_leaves.length - 1];
          leaveRows.push({
            _id: `ext_${e._id}`,
            employee_name: e.name,
            department: Array.isArray(e.department) ? e.department[0] : (e.department || "—"),
            type: lv.type,
            status: "Extended Leave",
            manager_status: "N/A",
            admin_status: "N/A",
            _extLeave: true,
          });
        }
      });

      setTodayLeaveRows(leaveRows);
    } catch { /* silent */ }
  }

  async function loadEmployees() {
    setLoading(true);
    try {
      const list = await api.listEmployees(token);
      setEmployees(list);
      // Always sync departments from fresh employee data (keeps EmployeeForm dropdown up-to-date)
      loadDepartments(list);
      // Load today's leave roster with fresh employee data so KPI and modal stay in sync
      loadTodayLeaves(list);
    } catch {
      // silent — UI shows stale data
    } finally {
      setLoading(false);
    }
  }

  async function loadTodayStats() {
    let res = null;
    try {
      res = await api.todayStats(token);
    } catch { /* today-stats failed outright — fall back below instead of leaving stats at 0 */ }

    const total = (res?.present || 0) + (res?.absent || 0) + (res?.leave || 0) + (res?.not_checked_in || 0);
    if (res && total > 0) { setStats(res); return; }

    // today-stats came back empty/falsy/threw — derive the same four
    // numbers from the monthly attendance summary instead of leaving the
    // KPI tiles stuck at 0. Same fallback AdminAttendancePage.jsx already
    // uses for delegated (non-admin) access.
    try {
      const summary = await api.getAttendanceSummary(ym(), token);
      const day = summary?.days?.[ymd()] || {};
      const cnt = (v) => Array.isArray(v) ? v.length : (Number(v) || 0);
      setStats({ present: cnt(day.present), absent: cnt(day.absent), leave: cnt(day.leave), not_checked_in: cnt(day.not_checked_in) });
    } catch { /* stats silent fail */ }
  }

  async function loadAccessGrants() {
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const [grantsRes, modulesRes] = await Promise.all([
              fetch(`${baseUrl}/api/admin/active-grants`, { headers: { 'Authorization': `Bearer ${token}` } }),
              fetch(`${baseUrl}/api/admin/grantable-modules`, { headers: { 'Authorization': `Bearer ${token}` } }),
          ]);
          if (grantsRes.ok) setAccessGrants(await grantsRes.json());
          if (modulesRes.ok) setGrantableModules(await modulesRes.json());
      } catch (err) {
          // silent fail
      }
  }

  // — Attendance Corrections (manager/admin/owner self-submitted, routed to admin) —

  async function loadCorrections() {
      setCorrectionsLoading(true);
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/corrections`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          setCorrections(res.ok ? await res.json() : []);
      } catch { setCorrections([]); }
      finally { setCorrectionsLoading(false); }
  }

  async function approveCorrection(id, action) {
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          const res = await fetch(`${baseUrl}/api/admin/approve-correction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ id, action }),
          });
          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || "Failed to process correction request.");
          }
          await loadCorrections();
      } catch (err) {
          alert(err.message || "Failed to process correction request.");
      }
  }

  // One-time repair for corrections that were already "Approved" before the
  // attendance_id bug fix — those never actually got their attendance record
  // created, so the day still reads as LOP everywhere. Safe to click more
  // than once; the backend skips anything already fixed.
  async function backfillCorrections() {
      setBackfilling(true);
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          const res = await fetch(`${baseUrl}/api/admin/corrections/backfill`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || "Failed to repair stuck corrections.");
          alert(data.message || "Done.");
      } catch (err) {
          alert(err.message || "Failed to repair stuck corrections.");
      } finally {
          setBackfilling(false);
      }
  }

  // — Department Functions —

  async function loadDepartments(empList) {
    // Use the freshest employee list available (passed-in or from state)
    const source = empList || employees;
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/admin/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // departments_col is the source of truth for names. An employee's
      // cached `department` string can briefly go stale right after a
      // rename (until the employee list itself next refreshes) — it must
      // never shadow or duplicate the real, current department record, or
      // a rename looks like it "reverts" whenever this list re-renders.
      const saved  = res.ok ? await res.json() : [];
      const byName = {};
      saved.forEach(s => { byName[s.name] = { ...s }; });

      // Also surface any department only known via employee records (not
      // yet formalized as its own departments_col document).
      source.forEach((emp) => {
        const deptVal = emp.department;
        const depts = Array.isArray(deptVal) ? deptVal : (deptVal ? [deptVal] : ["Unassigned"]);
        depts.forEach(d => {
          if (!byName[d]) byName[d] = { _id: d, name: d, description: "", head_id: null };
        });
      });
      setDepartments(Object.values(byName));
    } catch {
      // Network error — fall back to whatever employee records show so the
      // page isn't left blank.
      const map = {};
      source.forEach((emp) => {
        const deptVal = emp.department;
        const depts = Array.isArray(deptVal) ? deptVal : (deptVal ? [deptVal] : ["Unassigned"]);
        depts.forEach(d => { if (!map[d]) map[d] = { _id: d, name: d, description: "", head_id: null }; });
      });
      setDepartments(Object.values(map));
    }
  }

  // Load initial base data on mount
  useEffect(() => {
    loadEmployees();
    loadTodayStats();
  }, []);

  // Dynamically load data based on the current view to save bandwidth
  useEffect(() => {
    if (view === "grant-access") loadAccessGrants();
    if (view === "departments") loadDepartments();
    if (view === "corrections") loadCorrections();
  }, [view]);

  useEffect(() => {
    const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
    fetch(`${baseUrl}/api/notifications/birthdays`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setTodayBirthdays(data); })
      .catch(() => {});
  }, [token, api]);

  // — Notification badge counts (poll every 60s so new activity blinks live) —
  useEffect(() => {
    const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
    const loadCounts = () => {
      fetch(`${baseUrl}/api/notifications/counts`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setNotifCounts(d); })
        .catch(() => {});
    };
    loadCounts();
    const id = setInterval(loadCounts, 60000);
    return () => clearInterval(id);
  }, [token, api, view]);

  // — Employee Actions —
  
  async function addEmployee(data) {
    await api.addEmployee(data, token);
    await loadEmployees();
    setSubView("list");
  }

  function patchEmployee(id, updates) {
    setEmployees(prev => prev.map(e => e._id === id ? { ...e, ...updates } : e));
  }

  async function deleteEmployee(id) {
    if (!window.confirm("Are you sure you want to completely remove this employee?")) return;
    try {
      await api.deleteEmployee(id, token);
      await loadEmployees();
    } catch {
      alert("Failed to delete employee. Please try again.");
    }
  }

  async function promoteToManager(empId) {
      if(!window.confirm("Are you sure you want to promote this employee to Manager? They will automatically be assigned as the manager for all other employees in their department.")) return;
      
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/employees/${empId}/promote`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
              const data = await res.json();
              alert(data.message || "Employee successfully promoted to Manager!");
              await loadEmployees(); 
          } else {
              const errData = await res.json();
              alert(errData.message || "Failed to promote employee.");
          }
      } catch (err) {
          alert("Error promoting employee due to network issues.");
      }
  }

  // — Grant Access Actions —
  
  function toggleGrantModule(key) {
      setGrantData(g => ({
          ...g,
          modules: g.modules.includes(key) ? g.modules.filter(m => m !== key) : [...g.modules, key],
      }));
  }

  async function handleGrantAccessSubmit(e) {
      e.preventDefault();
      if (!grantData.employeeId) return alert("Please select an employee.");
      if (grantData.modules.length === 0) return alert("Please select at least one feature to grant access to.");
      if (grantData.scope === "custom_date" && !grantData.customDate) return alert("Please select a custom date scope.");
      if (grantData.expiry === "custom_time" && !grantData.customExpiryTime) return alert("Please select a custom expiration time.");

      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/grant-access`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(grantData)
          });
          if (res.ok) {
              alert("Temporary Access Granted Successfully!");
              setGrantData({ employeeId: "", modules: [], accessLevel: "view_only", scope: "today", customDate: "", expiry: "end_of_day", customExpiryTime: "" });
              loadAccessGrants();
          } else {
              const errData = await res.json(); alert(`Failed to grant access: ${errData.message}`);
          }
      } catch (err) { alert("Error granting access."); }
  }

  async function revokeAccess(grantId) {
      if (!window.confirm("Are you sure you want to revoke this access immediately?")) return;
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/revoke-access/${grantId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) { alert("Access revoked."); loadAccessGrants(); }
      } catch { /* silent */ }
  }

  // — Stat Click Handler —
  
  async function handleStatClick(type, title) {
    setDetailTitle(title);
    setDetailType(type);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailList([]);
    setDetailLeaves([]);

    try {
      const now     = new Date();
      const todayStr = ymd(now);

      if (type === 'leave') {
        // Use the pre-loaded roster (same source as KPI) for instant, consistent results
        if (todayLeaveRows !== null) {
          setDetailLeaves([...todayLeaveRows]);
        } else {
          // Fallback: fetch fresh (same dedup logic as loadTodayLeaves)
          const allLeaves = await api.adminLeaves(token);
          const rawList = Array.isArray(allLeaves) ? allLeaves : (allLeaves?.leaves || []);
          const todayLeaves = rawList.filter(l => {
            const st = (l.status || "").toLowerCase();
            if (st === "rejected" || st === "cancelled") return false;
            if (l.from_date && l.to_date) return String(l.from_date).slice(0, 10) <= todayStr && String(l.to_date).slice(0, 10) >= todayStr;
            return String(l.date || "").slice(0, 10) === todayStr;
          });

          const leaveRows = todayLeaves.map(l => {
            const emp = employees.find(e => String(e._id) === String(l.employee_id) || e.name === l.employee_name);
            return { ...l, department: l.department || emp?.department || "—" };
          });

          const leaveEmpNames = new Set(leaveRows.map(r => r.employee_name));
          employees.forEach(e => {
            if (!e.resignation?.notice_date &&
                e.extended_leaves?.some(lv => lv.from_date <= todayStr && lv.to_date >= todayStr) &&
                !leaveEmpNames.has(e.name)) {
              const lv = e.extended_leaves[e.extended_leaves.length - 1];
              leaveRows.push({
                _id: `ext_${e._id}`,
                employee_name: e.name,
                department: e.department || "—",
                type: lv.type,
                status: "Extended Leave",
                manager_status: "N/A",
                admin_status: "N/A",
                _extLeave: true,
              });
            }
          });

          setDetailLeaves(leaveRows);
        }
      } else {
        // For present / absent / not_checked_in — use attendance summary
        const summaryData = await api.getAttendanceSummary(now.toISOString().slice(0, 7), token);
        const todayData   = summaryData.days && summaryData.days[todayStr];
        let enrichedList  = [];

        if (todayData && todayData[type]) {
          enrichedList = todayData[type].map(item => {
            const id = String(typeof item === 'object' ? (item._id || item) : item);
            return employees.find(e => String(e._id) === id) || { name: "Unknown", _id: id };
          });
        }

        if (type === 'not_checked_in') {
          enrichedList = enrichedList.filter(e => !e.resignation?.notice_date);
        }

        setDetailList(enrichedList);
      }
    } catch { alert("Could not load details."); } finally { setDetailLoading(false); }
  }

  const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");

  // Offboarded requesters are irrelevant here (their attendance no longer
  // matters), alphabetical by requester name — same design rule applied to
  // every report table (HR Reports, Employees tab) this session.
  const offboardedIds = new Set(employees.filter(e => empExitStatus(e) === "offboarded").map(e => String(e._id)));
  const visibleCorrections = corrections
    .filter(c => !offboardedIds.has(String(c.user_id)))
    .slice()
    .sort((a, b) => (a.employee_name || "").localeCompare(b.employee_name || ""));

  return (
    <>
    <div className="app-shell">
      <Sidebar
        role="admin"
        user={user}
        view={view}
        setView={(v) => { setView(v); if (v === "employees") setSubView("list"); }}
        onLogout={onLogout}
        navBadges={{
          chat: chatUnread,
          leaves: notifCounts?.leaves || 0,
          assets: notifCounts?.assets || 0,
          announcements: notifCounts?.announcements || 0,
          corrections: notifCounts?.corrections || 0,
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
            {view === "dashboard" ? "Admin Dashboard" : view.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
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
      <Suspense fallback={<div style={{ marginTop: 16 }}><SkeletonTable rows={6} cols={4} /></div>}>
      <style>{`
        .styled-table-global { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; table-layout: auto !important; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; background: #fff; }
        .styled-table-global th { background: #f8fafc; color: #64748b; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; text-align: left; padding: 11px 16px !important; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .styled-table-global td { padding: 12px 16px !important; border-bottom: 1px solid #f8fafc; color: #334155; vertical-align: middle !important; white-space: normal !important; word-wrap: break-word !important; }
        .styled-table-global tr:last-child td { border-bottom: none; }
        .styled-table-global tbody tr:hover td { background: #f8fafc; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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

      {/* ============================================================================ */}
      {/* HEADER LOGIC */}
      {/* ============================================================================ */}
      {view === "dashboard" ? (
        <div className="dashboard-header-card card">
          <h2 style={{ color: "var(--red)", margin: 0 }}>Dashboard</h2>
          <p className="small">Welcome to the Admin Control Panel</p>
        </div>
      ) : (
        <div className="dashboard-header-card card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn ghost" onClick={() => setView("dashboard")} style={{padding: '8px 12px', display:'flex', alignItems:'center', gap:6}}>
            <FaArrowLeft /> Back
          </button>
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'uppercase' }}>{view.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</h3>
        </div>
      )}

      {/* ============================================================================ */}
      {/* DASHBOARD HOME VIEW (WIDGETS) */}
      {/* ============================================================================ */}
      {view === "dashboard" && (() => {
        const todayStr = ymd();

        // Active workforce: excludes fully offboarded employees (LWD passed), includes notice-period
        const activeEmps = employees.filter(e => empExitStatus(e) !== "offboarded");

        // Extended-leave employees (active, no offboard)
        const extLeaveEmpsAll = activeEmps.filter(e =>
          e.extended_leaves?.some(lv => lv.from_date <= todayStr && lv.to_date >= todayStr)
        );

        // On Leave: use pre-loaded deduplicated list when available (matches modal exactly)
        const leaveCount = todayLeaveRows !== null
          ? todayLeaveRows.length
          : (stats.leave ?? 0) + extLeaveEmpsAll.length;

        // Not Checked In: /admin/today-stats (and its attendance-summary fallback) already
        // exclude offboarded employees (LWD passed) and anyone on leave — including extended
        // leave — from this count. Subtracting offboardedCount/extLeaveNoRecord again here was
        // double-counting and could clamp the tile to 0 while real not-checked-in people existed.
        const adjNotCheckedIn = stats.not_checked_in ?? 0;

        return (
        <>
        {/* KPI Row */}
        <div className="kpi-row">
          <KpiTile icon={<FaUsers />}        label="Total Workforce" value={activeEmps.length}    tone="brand" />
          <KpiTile icon={<FaCheckCircle />}  label="Present Today"    value={stats.present ?? 0}  tone="green" onClick={() => handleStatClick('present', 'Present Today')} />
          <KpiTile icon={<FaUserClock />}    label="On Leave"         value={leaveCount}           tone="teal"  onClick={() => handleStatClick('leave', 'On Leave Today')} />
          <KpiTile icon={<FaUserSlash />}    label="Not Checked In"   value={adjNotCheckedIn}      tone="slate" onClick={() => handleStatClick('not_checked_in', 'Not Checked In')} />
        </div>

        {/* Quick Launch */}
        <div className="card" style={{ marginTop: 16 }}>
          <h4 className="widget-title">Quick Launch</h4>
          <div className="quick-launch-grid">
            <QuickLaunchItem icon={<FaUserPlus />} label="Add Employee" onClick={() => { setView("employees"); setSubView("add"); }} />
            <QuickLaunchItem icon={<FaUsers />} label="Employee List" onClick={() => { setView("employees"); setSubView("list"); }} />
            <QuickLaunchItem icon={<FaCalendarCheck />} label="Leave Requests" onClick={() => setView("leaves")} />
            <QuickLaunchItem icon={<FaClock />} label="Attendance Logs" onClick={() => setView("attendance")} />
            <QuickLaunchItem icon={<FaUserTie />} label="Managers" onClick={() => setView("manager")} />
            <QuickLaunchItem icon={<FaChartPie />} label="Reports" onClick={() => setView("summary")} />
            <QuickLaunchItem icon={<FaCalendarAlt />} label="Holidays" onClick={() => setView("holidays")} />
            <QuickLaunchItem icon={<FaBullhorn />} label="Announcements" onClick={() => setView("announcements")} />
            <QuickLaunchItem icon={<FaUserShield />} label="Grant Access" onClick={() => setView("grant-access")} />
            <QuickLaunchItem icon={<FaBuilding />} label="Departments" onClick={() => setView("departments")} />
            <QuickLaunchItem icon={<FaTasks />} label="Work & Clients" onClick={() => setView("work-clients")} />
            <QuickLaunchItem icon={<FaLaptop />} label="Manage Assets" onClick={() => setView("assets")} />
          </div>
        </div>

        <AdminInsights
          stats={{
            ...stats,
            leave:          leaveCount,
            not_checked_in: adjNotCheckedIn,
          }}
          employees={employees}
          api={api}
          token={token}
        />
        </>
        );
      })()}

      {/* ============================================================================ */}
      {/* DETAILS MODAL FOR DASHBOARD STATS */}
      {/* ============================================================================ */}
      {detailModalOpen && (
        <div className="detail-modal-overlay" onClick={() => setDetailModalOpen(false)}>
          <div className="detail-modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3 style={{ margin: 0, color: 'var(--red)' }}>{detailTitle}</h3>
              <button className="btn ghost" onClick={() => setDetailModalOpen(false)} style={{padding:'4px 8px'}}>
                <FaTimes />
              </button>
            </div>
            <div className="detail-list">
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}><div className="loader" style={{margin:'0 auto'}} /></div>
              ) : detailType === 'leave' ? (
                detailLeaves.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No leave applications found for today.</p>
                ) : (
                  detailLeaves.map((lv, idx) => {
                    const overallStatus = lv._extLeave ? "Extended Leave"
                      : (lv.status || "Pending");
                    const statusColor = overallStatus.toLowerCase().includes("approved") ? "#16a34a"
                      : overallStatus.toLowerCase().includes("rejected") ? "#dc2626"
                      : overallStatus.toLowerCase().includes("extended") ? "#7c3aed"
                      : "#d97706";
                    const statusBg = overallStatus.toLowerCase().includes("approved") ? "#f0fdf4"
                      : overallStatus.toLowerCase().includes("rejected") ? "#fef2f2"
                      : overallStatus.toLowerCase().includes("extended") ? "#f5f3ff"
                      : "#fffbeb";

                    const managerSt = lv.manager_status || "Pending";
                    const adminSt   = lv.admin_status   || "Pending";

                    const stBadge = (label, val) => {
                      const v = (val || "").toLowerCase();
                      const c = v.includes("approved") ? "#16a34a" : v.includes("rejected") ? "#dc2626" : "#94a3b8";
                      const b = v.includes("approved") ? "#f0fdf4" : v.includes("rejected") ? "#fef2f2" : "#f8fafc";
                      return (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: c, background: b, border: `1px solid ${c}30`, borderRadius: 4, padding: "1px 6px", marginRight: 4 }}>
                          {label}: {val || "Pending"}
                        </span>
                      );
                    };

                    return (
                      <div key={lv._id || idx} className="detail-item" style={{ alignItems: 'flex-start', gap: 12 }}>
                        <div className="detail-avatar" style={{ marginTop: 2 }}>
                          {(lv.employee_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{lv.employee_name || "Unknown"}</div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusBg, border: `1px solid ${statusColor}30`, borderRadius: 5, padding: "2px 8px", flexShrink: 0 }}>
                              {overallStatus}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            {lv.department} {lv.type ? <span style={{ color: "#475569", fontWeight: 600 }}>· {lv.type}</span> : null}
                          </div>
                          {!lv._extLeave && (
                            <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 2 }}>
                              {stBadge("Manager", managerSt)}
                              {stBadge("Admin", adminSt)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                detailList.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No employees found in this category.</p>
                ) : (
                  detailList.map((emp, idx) => (
                    <div key={emp._id || idx} className="detail-item">
                      <div className="detail-avatar">{emp.name ? emp.name.charAt(0).toUpperCase() : "?"}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{emp.name || "Unknown"}</div>
                        <div className="small">{emp.department || emp.position || emp.email || "Employee"}</div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* INNER PAGES ROUTING */}
      {/* ============================================================================ */}

      {/* 1. EMPLOYEES */}
      {view === "employees" && (
        <>
          <div className="card admin-buttons" style={{ marginTop: "12px" }}>
            <button className={`btn ${subView === "list" ? "" : "ghost"}`} onClick={() => setSubView("list")}>Employee List</button>
            <button className={`btn ${subView === "add" ? "" : "ghost"}`} onClick={() => setSubView("add")}>Add New Employee</button>
            <button className={`btn ${subView === "add-admin" ? "" : "ghost"}`} onClick={() => setSubView("add-admin")}>Add Admin</button>
          </div>
          <div style={{ marginTop: "16px" }}>
            {subView === "add-admin" ? (
              <RegisterAdmin api={api} token={token} user={user} />
            ) : subView === "add" ? (
              <EmployeeForm onAdd={addEmployee} api={api} token={token} departments={departments} />
            ) : loading ? (
              <SkeletonTable rows={8} cols={5} />
            ) : (
              <EmployeeList
                employees={employees}
                departments={departments}
                onDelete={deleteEmployee}
                onRefresh={loadEmployees}
                onPatch={patchEmployee}
                onPromote={promoteToManager}
                api={api}
                token={token}
              />
            )}
          </div>
        </>
      )}

      {/* 2. LEAVES */}
      {view === "leaves" && <div style={{ marginTop: "16px" }}><AdminLeavePage token={token} api={api} /></div>}

      {/* 3. ATTENDANCE */}
      {view === "attendance" && <div style={{ marginTop: "16px" }}><AdminAttendancePage token={token} api={api} /></div>}

      {/* 3b. ATTENDANCE CORRECTIONS — manager/admin/owner self-submitted, routed here for approval */}
      {view === "corrections" && (
        <div className="card" style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ color: "var(--red)", margin: 0 }}>Attendance Corrections</h3>
              <p className="small" style={{ margin: "4px 0 0" }}>Correction requests submitted by managers (and admins) for their own attendance — employee-submitted corrections are approved by their Reporting Manager instead.</p>
            </div>
            <button
              className="btn ghost"
              onClick={backfillCorrections}
              disabled={backfilling}
              title="One-time repair: some corrections approved before a recent bug fix never actually updated attendance, so the day still shows as LOP. Click to fix any still stuck."
              style={{ whiteSpace: "nowrap", fontSize: 12.5 }}
            >
              {backfilling ? "Fixing…" : "Fix Stuck Corrections"}
            </button>
          </div>
          <div style={{ marginBottom: 16 }} />
          <div className="table-scroll-body" style={{ maxHeight: 520 }}>
            {correctionsLoading ? <SkeletonTable rows={6} cols={5} /> : (
              <table className="styled-table-global">
                <thead><tr><th className="sticky-th">Submitted By</th><th className="sticky-th">New Time</th><th className="sticky-th">Reason</th><th className="sticky-th">Status</th><th className="sticky-th">Action</th></tr></thead>
                <tbody>
                  {visibleCorrections.length === 0 && <tr><td colSpan="5" style={{ textAlign: "center", padding: 20, color: "#999" }}>No correction requests found.</td></tr>}
                  {visibleCorrections.map(c => (
                    <tr key={c._id}>
                      <td style={{ fontWeight: "bold" }}>{c.employee_name || "—"}</td>
                      <td>{c.new_time ? new Date(c.new_time).toLocaleString() : "—"}</td>
                      <td>{c.reason}</td>
                      <td><span className={`status-badge ${getStatusClass(c.status)}`}>{c.status}</span></td>
                      <td>
                        {c.status === "Pending" ? (
                          <div style={{ display: "flex", gap: 5 }}>
                            <button className="btn-small" style={{ background: "green" }} onClick={() => approveCorrection(c._id, "Approved")}>
                              <FaCheckCircle /> Approve
                            </button>
                            <button className="btn-small" style={{ background: "#b91c1c" }} onClick={() => approveCorrection(c._id, "Rejected")}>
                              <FaTimesCircle /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#888", fontStyle: "italic", fontSize: 12 }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 4. MANAGERS */}
      {view === "manager" && <div style={{ marginTop: "16px" }}><RegisterManager token={token} api={api} /></div>}

      {/* 5. SUMMARY REPORTS */}
      {view === "summary" && <div style={{ marginTop: "16px" }}><AdminAttendanceSummary token={token} api={api} /></div>}

      {/* 6. ASSESSMENT */}
      {view === "assessment" && <ErrorBoundary label="Assessments" resetKey={view}><AdminAssessment token={token} /></ErrorBoundary>}

      {/* 7. LMS */}
      {view === "lms" && <ErrorBoundary label="LMS" resetKey={view}><AdminLMS token={token} employees={employees} departments={departments} /></ErrorBoundary>}

      {/* 8. CAREER */}
      {view === "career" && <ErrorBoundary label="Career" resetKey={view}><AdminCareer token={token} employees={employees} /></ErrorBoundary>}

      {/* 9. PAYROLL */}
      {view === "payroll" && <ErrorBoundary label="Payroll" resetKey={view}><AdminPayroll token={token} employees={employees} /></ErrorBoundary>}

      {/* 9b. PMS */}
      {view === "pms" && <ErrorBoundary label="PMS" resetKey={view}><div style={{ marginTop: 16 }}><PMSWorkspace token={token} api={api} user={user} scope="admin" assignablePool={employees} /></div></ErrorBoundary>}

      {/* 10-11. WORK BY TEAM + CLIENTS (one sidebar entry, two top tabs) */}
      {view === "work-clients" && <ErrorBoundary label="Work & Clients" resetKey={view}><WorkAndClients token={token} api={api} role="admin" /></ErrorBoundary>}

      {view === "chat" && <ErrorBoundary label="Messages" resetKey={view}><Chat token={token} api={api} user={user} /></ErrorBoundary>}

      {/* 12. RECRUITMENT / ATS */}
      {view === "ats" && <ErrorBoundary label="Recruitment" resetKey={view}><AdminATS token={token} role="admin" employees={employees} departments={departments} /></ErrorBoundary>}

      {/* 6. HOLIDAYS */}
      {view === "holidays" && <div style={{ marginTop: "16px" }}><HolidayCalendar /></div>}

      {/* ============================================================================ */}
      {/* 7. ANNOUNCEMENTS */}
      {/* ============================================================================ */}
      {view === "announcements" && (
        <ErrorBoundary label="Announcements" resetKey={view}>
          <AdminAnnouncements token={token} api={api} />
        </ErrorBoundary>
      )}

      {/* ============================================================================ */}
      {/* 8. GRANT ACCESS (DELEGATED ADMIN CONTROLS) */}
      {/* ============================================================================ */}
      {view === "grant-access" && (
        <div className="card" style={{ marginTop: "16px" }}>
            <h3>Grant Temporary Admin Access</h3>
            <p className="small" style={{marginBottom: 25}}>Assign another employee temporary permissions to view or edit specific admin features — pick any combination.</p>

            <form onSubmit={handleGrantAccessSubmit} className="grant-form-section">
                <div className="grant-form-row">
                    <div className="grant-form-col" style={{flex: 1}}>
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Select Employee</label>
                        <select className="modern-input" style={{marginTop: 8}} value={grantData.employeeId} onChange={(e) => setGrantData({...grantData, employeeId: e.target.value})} required>
                            <option value="">-- Choose Employee --</option>
                            {[...employees].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.department})</option>)}
                        </select>
                    </div>
                </div>

                <div className="grant-form-row">
                    <div className="grant-form-col" style={{flex: 1}}>
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Admin Features to Grant</label>
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 14px', marginTop: 10, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0'}}>
                            {grantableModules.length === 0 ? (
                                <span className="small" style={{color: '#94a3b8'}}>Loading features…</span>
                            ) : grantableModules.map(m => (
                                <label key={m.key} style={{display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#334155', cursor: 'pointer', fontWeight: grantData.modules.includes(m.key) ? 700 : 400}}>
                                    <input type="checkbox" checked={grantData.modules.includes(m.key)} onChange={() => toggleGrantModule(m.key)} />
                                    {m.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grant-form-row">
                    <div className="grant-form-col">
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Access Level (Permission)</label>
                        <div className="radio-group">
                            <label className="radio-label"><input type="radio" name="accessLevel" checked={grantData.accessLevel === 'view_only'} onChange={() => setGrantData({...grantData, accessLevel: 'view_only'})} /> View Only (Read)</label>
                            <label className="radio-label"><input type="radio" name="accessLevel" checked={grantData.accessLevel === 'view_edit'} onChange={() => setGrantData({...grantData, accessLevel: 'view_edit'})} /> View & Edit (Read/Write)</label>
                        </div>
                    </div>
                    <div className="grant-form-col">
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Data Scope</label>
                        <div className="radio-group">
                            <label className="radio-label"><input type="radio" name="scope" checked={grantData.scope === 'today'} onChange={() => setGrantData({...grantData, scope: 'today'})} /> Today Only</label>
                            <label className="radio-label"><input type="radio" name="scope" checked={grantData.scope === 'custom_date'} onChange={() => setGrantData({...grantData, scope: 'custom_date'})} /> Custom Date</label>
                        </div>
                        {grantData.scope === 'custom_date' && <input type="date" className="modern-input" style={{marginTop: 10}} value={grantData.customDate} onChange={(e) => setGrantData({...grantData, customDate: e.target.value})}/>}
                    </div>
                </div>

                <div className="grant-form-row" style={{borderTop: '1px solid #ddd', paddingTop: 15}}>
                    <div className="grant-form-col">
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Set Expiration</label>
                        <div className="radio-group">
                            <label className="radio-label"><input type="radio" name="expiry" checked={grantData.expiry === 'end_of_day'} onChange={() => setGrantData({...grantData, expiry: 'end_of_day'})} /> Auto (End of Day)</label>
                            <label className="radio-label"><input type="radio" name="expiry" checked={grantData.expiry === 'custom_time'} onChange={() => setGrantData({...grantData, expiry: 'custom_time'})} /> Custom Time</label>
                        </div>
                        {grantData.expiry === 'custom_time' && <input type="datetime-local" className="modern-input" style={{marginTop: 10, maxWidth: 250}} value={grantData.customExpiryTime} onChange={(e) => setGrantData({...grantData, customExpiryTime: e.target.value})}/>}
                    </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 10}}>
                    <button type="submit" className="btn" style={{backgroundColor: '#10b981'}}>Grant Permission</button>
                </div>
            </form>

            <h4 style={{marginTop: 30, color: '#333', borderBottom: '2px solid #eee', paddingBottom: 10}}>Active Access Grants</h4>
            <div style={{ overflowX: 'auto' }}>
                <table className="styled-table-global">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Features</th>
                            <th>Permission</th>
                            <th>Scope</th>
                            <th>Expires At</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accessGrants.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No active access grants.</td></tr>
                        ) : (
                            accessGrants.map(grant => {
                                const grantModules = grant.modules && grant.modules.length ? grant.modules : (grant.module ? [grant.module] : []);
                                const moduleLabels = grantModules.map(k => grantableModules.find(m => m.key === k)?.label || k).join(", ") || "—";
                                return (
                                <tr key={grant._id}>
                                    <td style={{ fontWeight: 'bold' }}>{grant.employee_name}</td>
                                    <td style={{ maxWidth: 220 }}>{moduleLabels}</td>
                                    <td><span style={{ backgroundColor: grant.access_level === 'view_edit' ? '#dcfce7' : '#e0e7ff', color: grant.access_level === 'view_edit' ? '#16a34a' : '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{grant.access_level === 'view_edit' ? 'View & Edit' : 'View Only'}</span></td>
                                    <td>{grant.scope === 'today' ? 'Today' : grant.custom_date}</td>
                                    <td style={{ color: '#666' }}>{grant.expiry === 'end_of_day' ? 'End of Day' : new Date(grant.custom_expiry_time).toLocaleString()}</td>
                                    <td><button className="btn-small ghost" style={{ color: 'var(--red)', border: '1px solid var(--red)' }} onClick={() => revokeAccess(grant._id)}><FaTrash style={{ marginRight: 5 }} /> Revoke</button></td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 9. DEPARTMENTS */}
      {/* ============================================================================ */}
      {view === "departments" && (
        <ErrorBoundary label="Departments" resetKey={view}>
          <AdminDepartments employees={employees} token={token} api={api} />
        </ErrorBoundary>
      )}

      {/* ============================================================================ */}
      {/* 10. ORGANIZATION ASSET MANAGEMENT */}
      {/* ============================================================================ */}
      {view === "assets" && (
        <ErrorBoundary label="Assets" resetKey={view}>
          <AdminAssets token={token} api={api} />
        </ErrorBoundary>
      )}

      </Suspense>
        </div>
      </div>
    </div>

    <ProfilePanel user={user} token={token} api={api} isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    {settingsOpen && <SettingsModal token={token} api={api} onClose={() => setSettingsOpen(false)} />}
    <ChatBot token={token} api={api} user={user} role="admin" onNavigate={setView} />
    </>
  );
}