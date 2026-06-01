import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

// ============================================================================
// COMPONENT IMPORTS
// ============================================================================
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";
import AdminLeavePage from "./AdminLeavePage";
import AdminAttendancePage from "./AdminAttendancePage";
import RegisterManager from "./RegisterManager";
import AdminAttendanceSummary from "./AdminAttendanceSummary";
import HolidayCalendar from "./HolidayCalendar"; 

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
  FaSave,
  FaUndo,
  FaLaptop,
  FaBars,
  FaGift,
  FaBuilding,
  FaPlus,
  FaEye,
  FaSitemap
} from "react-icons/fa";
import ProfilePanel from "./ProfilePanel";
import AdminInsights from "./AdminInsights";

// ============================================================================
// MAIN EXPORT: ADMIN DASHBOARD
// ============================================================================
function QuickLaunchItem({ icon, label, onClick, color = "var(--red)" }) {
  return (
    <div className="quick-launch-item" onClick={onClick}>
      <div className="quick-launch-icon" style={{color}}>{icon}</div>
      <div className="quick-launch-label">{label}</div>
    </div>
  );
}

function MemberRow({ emp, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#334155,#1e293b)", color: "#fff", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {emp.name?.charAt(0).toUpperCase() || "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.name}</div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 1 }}>{emp.position || emp.email || "—"}</div>
      </div>
      {badge && (
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: badge.bg, color: badge.color, flexShrink: 0 }}>
          {badge.label}
        </span>
      )}
    </div>
  );
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
  
  // — Core States —
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("dashboard");
  const [subView, setSubView] = useState("list");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
  const [detailLoading, setDetailLoading] = useState(false);

  // — Announcement States —
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  
  // Inline Editing States for Announcements
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [editAnnTitle, setEditAnnTitle] = useState("");
  const [editAnnMessage, setEditAnnMessage] = useState("");

  // — Grant Access States —
  const [accessGrants, setAccessGrants] = useState([]);
  const [grantData, setGrantData] = useState({
      employeeId: "",
      accessLevel: "view_only", 
      scope: "today",           
      customDate: "",
      expiry: "end_of_day",     
      customExpiryTime: ""
  });

  // — Asset States —
  const [allAssets, setAllAssets] = useState([]);

  // — Department States —
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptModal, setDeptModal] = useState(false);
  const [deptEditId, setDeptEditId] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", description: "", head_id: "" });
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptMembersOpen, setDeptMembersOpen] = useState(null); // dept object for quick-view

  // — Data Loaders —
  async function loadEmployees() {
    setLoading(true);
    try {
      const list = await api.listEmployees(token);
      setEmployees(list);
      // Always sync departments from fresh employee data (keeps EmployeeForm dropdown up-to-date)
      loadDepartments(list);
    } catch {
      // silent — UI shows stale data
    } finally {
      setLoading(false);
    }
  }

  async function loadTodayStats() {
    try {
      const res = await api.todayStats(token);
      setStats(res);
    } catch { /* stats silent fail */ }
  }

  async function loadAnnouncements() {
    try {
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      const res = await fetch(`${baseUrl}/api/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
          const data = await res.json();
          const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setAnnouncements(sorted);
      }
    } catch { /* silent */ }
  }

  async function loadAccessGrants() {
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/active-grants`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) setAccessGrants(await res.json());
      } catch (err) {
          // silent fail
      }
  }

  async function loadAssets() {
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/assets`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setAllAssets(data);
          }
      } catch (err) {
          // silent fail
      }
  }

  // — Department Functions —

  async function loadDepartments(empList) {
    setDeptLoading(true);
    // Use the freshest employee list available (passed-in or from state)
    const source = empList || employees;
    // Always derive base departments from employee records first
    const map = {};
    source.forEach((emp) => {
      const d = emp.department || "Unassigned";
      if (!map[d]) map[d] = { _id: d, name: d, description: "", head_id: null };
    });
    const derived = Object.values(map);

    // Try to enrich with saved metadata (description, explicit head_id) from API
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/admin/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const saved = await res.json();
        const enriched = derived.map(d => {
          const s = saved.find(s => s.name === d.name);
          return s ? { ...d, ...s } : d;
        });
        // Include any API-only departments not yet in employee records
        const names = new Set(derived.map(d => d.name));
        saved.forEach(s => { if (!names.has(s.name)) enriched.push(s); });
        setDepartments(enriched);
      } else {
        setDepartments(derived);
      }
    } catch {
      setDepartments(derived);
    } finally {
      setDeptLoading(false);
    }
  }

  async function saveDepartment(e) {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    setDeptSaving(true);
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const method = deptEditId ? "PUT" : "POST";
      const url = deptEditId
        ? `${baseUrl}/api/admin/departments/${deptEditId}`
        : `${baseUrl}/api/admin/departments`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(deptForm),
      });
      if (res.ok) {
        setDeptModal(false);
        setDeptEditId(null);
        setDeptForm({ name: "", description: "", head_id: "" });
        loadDepartments();
      } else {
        // Backend not ready yet — apply change locally
        setDepartments(prev => {
          if (deptEditId) {
            return prev.map(d => d._id === deptEditId ? { ...d, ...deptForm } : d);
          }
          return [...prev, { _id: deptForm.name, ...deptForm }];
        });
        setDeptModal(false);
        setDeptEditId(null);
        setDeptForm({ name: "", description: "", head_id: "" });
      }
    } catch {
      // Network error — apply locally
      setDepartments(prev => {
        if (deptEditId) {
          return prev.map(d => d._id === deptEditId ? { ...d, ...deptForm } : d);
        }
        return [...prev, { _id: deptForm.name, ...deptForm }];
      });
      setDeptModal(false);
      setDeptEditId(null);
      setDeptForm({ name: "", description: "", head_id: "" });
    } finally {
      setDeptSaving(false);
    }
  }

  async function deleteDepartment(id, name) {
    if (!window.confirm(`Delete department "${name}"? Employees will be unassigned from this department.`)) return;
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/admin/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { loadDepartments(); }
      else { setDepartments(prev => prev.filter(d => d._id !== id)); }
    } catch { setDepartments(prev => prev.filter(d => d._id !== id)); }
  }

  function openAddDept() {
    setDeptEditId(null);
    setDeptForm({ name: "", description: "", head_id: "" });
    setDeptModal(true);
  }

  function openEditDept(dept) {
    setDeptEditId(dept._id);
    setDeptForm({ name: dept.name, description: dept.description || "", head_id: dept.head_id || "" });
    setDeptModal(true);
  }

  // Load initial base data on mount
  useEffect(() => {
    loadEmployees();
    loadTodayStats();
  }, []);

  // Dynamically load data based on the current view to save bandwidth
  useEffect(() => {
    if (view === "announcements") loadAnnouncements();
    if (view === "grant-access") loadAccessGrants();
    if (view === "assets") loadAssets();
    if (view === "departments") loadDepartments();
  }, [view]);

  useEffect(() => {
    const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
    fetch(`${baseUrl}/api/notifications/birthdays`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setTodayBirthdays(data); })
      .catch(() => {});
  }, [token, api]);

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
    if(!window.confirm("Are you sure you want to completely remove this employee?")) return;
    await api.deleteEmployee(id, token);
    await loadEmployees();
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

  // — Announcement Actions —
  
  async function createAnnouncement() {
    if (!annTitle || !annMessage) return alert("Please fill in both title and message");
    try {
        const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
        const res = await fetch(`${baseUrl}/api/announcements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: annTitle, message: annMessage })
        });
        if (res.ok) {
            alert("Announcement Posted Successfully!");
            setAnnTitle(""); setAnnMessage(""); loadAnnouncements();
        } else { alert("Failed to post announcement"); }
    } catch (err) { alert("Error posting announcement"); }
  }

  function startEditAnnouncement(ann) {
      setEditingAnnId(ann._id); setEditAnnTitle(ann.title); setEditAnnMessage(ann.message);
  }

  function cancelEditAnnouncement() {
      setEditingAnnId(null); setEditAnnTitle(""); setEditAnnMessage("");
  }

  async function updateAnnouncement(id) {
      if (!editAnnTitle || !editAnnMessage) return alert("Title and message cannot be empty.");
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/announcements/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ title: editAnnTitle, message: editAnnMessage })
          });
          if (res.ok) {
              alert("Announcement Updated Successfully!");
              setEditingAnnId(null); loadAnnouncements();
          } else { alert("Failed to update announcement"); }
      } catch (err) { alert("Error updating announcement"); }
  }

  async function recallAnnouncement(id) {
      if (!window.confirm("Are you sure you want to recall (delete) this announcement?")) return;
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/announcements/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) { alert("Announcement Recalled."); loadAnnouncements(); } 
          else { alert("Failed to recall announcement."); }
      } catch (err) { alert("Error recalling announcement."); }
  }

  // — Grant Access Actions —
  
  async function handleGrantAccessSubmit(e) {
      e.preventDefault();
      if (!grantData.employeeId) return alert("Please select an employee.");
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
              setGrantData({ employeeId: "", accessLevel: "view_only", scope: "today", customDate: "", expiry: "end_of_day", customExpiryTime: "" });
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

  // — Asset Actions —
  async function updateAdminAssetStatus(id, status) {
      if (!window.confirm(`Are you sure you want to mark this request as ${status}?`)) return;
      
      try {
          setLoading(true);
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/assets/${id}`, {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ admin_status: status })
          });
          
          if (res.ok) {
              alert(`Asset request ${status} successfully!`);
              loadAssets(); // Refresh list to show updated status
          } else {
              const errData = await res.json();
              alert(errData.message || "Failed to update asset.");
          }
      } catch (err) {
          alert("Error updating asset: " + err.message);
      } finally {
          setLoading(false);
      }
  }

  // — Stat Click Handler —
  
  async function handleStatClick(type, title) {
    setDetailTitle(title);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailList([]);

    try {
      const now = new Date();
      const monthStr = now.toISOString().slice(0, 7);
      const summaryData = await api.getAttendanceSummary(monthStr, token);
      const todayStr = now.toISOString().slice(0, 10);
      const todayData = summaryData.days && summaryData.days[todayStr];

      let enrichedList = [];

      if (todayData && todayData[type]) {
        const listData = todayData[type];
        enrichedList = listData.map(item => {
          const id = String(typeof item === 'object' ? (item._id || item) : item);
          return employees.find(e => String(e._id) === id) || (typeof item === 'object' ? item : { name: "Unknown", _id: id });
        });
      }

      // For "leave": also include employees on active extended leave
      if (type === 'leave') {
        const extLeaveEmps = employees.filter(
          e => e.extended_leaves?.length > 0 && !e.resignation?.notice_date
        );
        const existingIds = new Set(enrichedList.map(e => String(e._id)));
        extLeaveEmps.forEach(e => { if (!existingIds.has(String(e._id))) enrichedList.push(e); });
      }

      // For "not_checked_in": remove resigned employees
      if (type === 'not_checked_in') {
        enrichedList = enrichedList.filter(e => !e.resignation?.notice_date);
      }

      setDetailList(enrichedList);
    } catch (err) { alert("Could not load details."); } finally { setDetailLoading(false); }
  }

  const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");
  return (
    <>
    <div className="app-shell">
      <Sidebar
        role="admin"
        user={user}
        view={view}
        setView={(v) => { setView(v); if (v === "employees") setSubView("list"); }}
        onLogout={onLogout}
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
            {view === "dashboard" ? "Admin Dashboard" : view.replace(/-/g, " ")}
          </span>
          <div className="topbar-right">
            <button className="topbar-profile-btn" onClick={() => setProfileOpen(true)}>
              <div className="topbar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
              <span className="topbar-user-name">{user?.name}</span>
            </button>
          </div>
        </div>
        <div className="main-content">
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
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'uppercase' }}>{view.replace(/-/g, " ")}</h3>
        </div>
      )}

      {/* ============================================================================ */}
      {/* DASHBOARD HOME VIEW (WIDGETS) */}
      {/* ============================================================================ */}
      {view === "dashboard" && (
        <>
        <div className="dashboard-grid-container">
          
          <div className="card dashboard-widget">
            <h4 className="widget-title">Today's Attendance</h4>
            {(() => {
              const resignedCount      = employees.filter(e => !!e.resignation?.notice_date).length;
              const extLeaveCount      = employees.filter(e => (e.extended_leaves?.length > 0) && !e.resignation?.notice_date).length;
              const adjNotCheckedIn    = Math.max(0, (stats.not_checked_in ?? 0) - resignedCount);
              const adjOnLeave         = (stats.leave ?? 0) + extLeaveCount;
              return (
                <div className="stats-list">
                  <StatItem icon={<FaCheckCircle />} label="Present"       count={stats.present ?? 0}  colorClass="text-green"    onClick={() => handleStatClick('present',        'Present Today')} />
                  <StatItem icon={<FaTimesCircle />} label="Absent"        count={stats.absent ?? 0}   colorClass="text-red"      onClick={() => handleStatClick('absent',         'Absent Today')} />
                  <StatItem icon={<FaUserClock />}   label="On Leave"      count={adjOnLeave}           colorClass="text-dark-red" onClick={() => handleStatClick('leave',          'On Leave Today')} />
                  <StatItem icon={<FaUserSlash />}   label="Not Checked In" count={adjNotCheckedIn}     colorClass="text-orange"   onClick={() => handleStatClick('not_checked_in', 'Not Checked In')} />
                </div>
              );
            })()}
          </div>

          <div className="card dashboard-widget">
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
              <QuickLaunchItem icon={<FaLaptop />} label="Manage Assets" onClick={() => setView("assets")} />
            </div>
          </div>

          <div className="card dashboard-widget">
              <h4 className="widget-title">Total Workforce</h4>
              <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', flexDirection:'column'}}>
                <div style={{fontSize:'48px', fontWeight:'bold', color:'var(--red)'}}>
                  {employees.length}
                </div>
                <div className="small">Active Employees</div>
              </div>
          </div>
        </div>

        <AdminInsights
          stats={{
            ...stats,
            leave:         (stats.leave ?? 0) + employees.filter(e => (e.extended_leaves?.length > 0) && !e.resignation?.notice_date).length,
            not_checked_in: Math.max(0, (stats.not_checked_in ?? 0) - employees.filter(e => !!e.resignation?.notice_date).length),
          }}
          employees={employees}
          api={api}
          token={token}
        />
        </>
      )}

      {/* ============================================================================ */}
      {/* DETAILS MODAL FOR DASHBOARD STATS */}
      {/* ============================================================================ */}
      {detailModalOpen && (
        <div className="detail-modal-overlay" onClick={() => setDetailModalOpen(false)}>
          <div className="detail-modal-card" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3 style={{ margin: 0, color: 'var(--red)' }}>{detailTitle}</h3>
              <button className="btn ghost" onClick={() => setDetailModalOpen(false)} style={{padding:'4px 8px'}}>
                <FaTimes />
              </button>
            </div>
            <div className="detail-list">
              {detailLoading ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading details...</p>
              ) : detailList.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No employees found in this category.</p>
              ) : (
                detailList.map((emp, idx) => {
                  const extLeave = emp.extended_leaves?.length > 0 ? emp.extended_leaves[emp.extended_leaves.length - 1] : null;
                  return (
                  <div key={emp._id || idx} className="detail-item">
                    <div className="detail-avatar">{emp.name ? emp.name.charAt(0).toUpperCase() : "?"}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{emp.name || "Unknown"}</div>
                      <div className="small">{emp.department || emp.position || emp.email || "Employee"}</div>
                      {extLeave && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#c2410c", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 4, padding: "1px 6px", marginTop: 3, display: "inline-block" }}>
                          {extLeave.type}
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })
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
          </div>
          <div style={{ marginTop: "16px" }}>
            {subView === "add" ? (
              <EmployeeForm onAdd={addEmployee} api={api} token={token} departments={departments} />
            ) : loading ? (
              <div className="card">Loading...</div>
            ) : (
              <EmployeeList
                employees={employees}
                departments={departments}
                onDelete={deleteEmployee}
                onRefresh={loadEmployees}
                onPatch={patchEmployee}
                onPromote={promoteToManager}
              />
            )}
          </div>
        </>
      )}

      {/* 2. LEAVES */}
      {view === "leaves" && <div style={{ marginTop: "16px" }}><AdminLeavePage token={token} api={api} /></div>}

      {/* 3. ATTENDANCE */}
      {view === "attendance" && <div style={{ marginTop: "16px" }}><AdminAttendancePage token={token} api={api} /></div>}

      {/* 4. MANAGERS */}
      {view === "manager" && <div style={{ marginTop: "16px" }}><RegisterManager token={token} api={api} /></div>}

      {/* 5. SUMMARY REPORTS */}
      {view === "summary" && <div style={{ marginTop: "16px" }}><AdminAttendanceSummary token={token} api={api} /></div>}

      {/* 6. HOLIDAYS */}
      {view === "holidays" && <div style={{ marginTop: "16px" }}><HolidayCalendar /></div>}

      {/* ============================================================================ */}
      {/* 7. ANNOUNCEMENTS */}
      {/* ============================================================================ */}
      {view === "announcements" && (
        <div className="card" style={{ marginTop: "16px", background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            <h3 style={{color: 'var(--red)'}}>Manage Announcements</h3>
            <p style={{color: '#64748b', marginBottom: 20}}>Broadcast messages to all employee dashboards.</p>
            
            <div className="card" style={{ marginBottom: 30 }}>
                <h4 style={{marginTop: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: 10}}>Create New Announcement</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                    <input className="modern-input" placeholder="Title (e.g. Office Closed on Friday)" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
                    <textarea className="modern-input" placeholder="Message details..." style={{ minHeight: 80, resize:'vertical' }} value={annMessage} onChange={(e) => setAnnMessage(e.target.value)} />
                    <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                        <button className="btn" onClick={createAnnouncement} style={{padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8}}>
                            <FaBullhorn /> Post Announcement
                        </button>
                    </div>
                </div>
            </div>

            <h4 style={{marginBottom: 15, color: '#334155'}}>Announcement History & Management</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {announcements.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                        <FaBullhorn size={40} style={{opacity: 0.2, marginBottom: 15}}/>
                        <p style={{margin: 0}}>No announcements currently active.</p>
                    </div>
                ) : (
                    announcements.map((ann) => (
                        <div key={ann._id}>
                            {editingAnnId === ann._id ? (
                                <div className="edit-mode-card">
                                    <h4 style={{marginTop: 0, color: '#3b82f6'}}>Editing Announcement</h4>
                                    <input className="modern-input" style={{marginBottom: 10}} value={editAnnTitle} onChange={(e) => setEditAnnTitle(e.target.value)} />
                                    <textarea className="modern-input" style={{ minHeight: 100, resize:'vertical', marginBottom: 15 }} value={editAnnMessage} onChange={(e) => setEditAnnMessage(e.target.value)} />
                                    <div style={{display: 'flex', gap: 10}}>
                                        <button className="btn" style={{background: '#3b82f6', display: 'flex', alignItems: 'center', gap: 5}} onClick={() => updateAnnouncement(ann._id)}><FaSave /> Save Changes</button>
                                        <button className="btn ghost" onClick={cancelEditAnnouncement}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="announcement-card">
                                    <div className="announcement-header">
                                        <h4 className="announcement-title">{ann.title}</h4>
                                        <span className="announcement-date">{new Date(ann.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="announcement-body">{ann.message}</div>
                                    <div className="announcement-actions">
                                        <button className="btn-action-edit" onClick={() => startEditAnnouncement(ann)}><FaEdit /> Edit</button>
                                        <button className="btn-action-recall" onClick={() => recallAnnouncement(ann._id)}><FaUndo /> Recall / Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 8. GRANT ACCESS (DELEGATED ADMIN CONTROLS) */}
      {/* ============================================================================ */}
      {view === "grant-access" && (
        <div className="card" style={{ marginTop: "16px" }}>
            <h3>Grant Temporary Admin Access</h3>
            <p className="small" style={{marginBottom: 25}}>Assign another employee temporary permissions to view or edit attendance data.</p>
            
            <form onSubmit={handleGrantAccessSubmit} className="grant-form-section">
                <div className="grant-form-row">
                    <div className="grant-form-col">
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Select Employee</label>
                        <select className="modern-input" style={{marginTop: 8}} value={grantData.employeeId} onChange={(e) => setGrantData({...grantData, employeeId: e.target.value})} required>
                            <option value="">-- Choose Employee --</option>
                            {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.department})</option>)}
                        </select>
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
                            <th>Permission</th>
                            <th>Scope</th>
                            <th>Expires At</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accessGrants.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No active access grants.</td></tr>
                        ) : (
                            accessGrants.map(grant => (
                                <tr key={grant._id}>
                                    <td style={{ fontWeight: 'bold' }}>{grant.employee_name}</td>
                                    <td><span style={{ backgroundColor: grant.access_level === 'view_edit' ? '#dcfce7' : '#e0e7ff', color: grant.access_level === 'view_edit' ? '#16a34a' : '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{grant.access_level === 'view_edit' ? 'View & Edit' : 'View Only'}</span></td>
                                    <td>{grant.scope === 'today' ? 'Today' : grant.custom_date}</td>
                                    <td style={{ color: '#666' }}>{grant.expiry === 'end_of_day' ? 'End of Day' : new Date(grant.custom_expiry_time).toLocaleString()}</td>
                                    <td><button className="btn-small ghost" style={{ color: 'var(--red)', border: '1px solid var(--red)' }} onClick={() => revokeAccess(grant._id)}><FaTrash style={{ marginRight: 5 }} /> Revoke</button></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 9. DEPARTMENTS */}
      {/* ============================================================================ */}
      {view === "departments" && (() => {
        // Derive per-dept employee lists from loaded employees array
        const deptEmployeeMap = {};
        employees.forEach(emp => {
          const key = emp.department || "Unassigned";
          if (!deptEmployeeMap[key]) deptEmployeeMap[key] = [];
          deptEmployeeMap[key].push(emp);
        });

        // Enrich departments with live employee data
        const enriched = departments.map(d => ({
          ...d,
          members: deptEmployeeMap[d.name] || [],
          manager: employees.find(e => e._id === d.head_id || (e.role === "manager" && e.department === d.name)) || null,
        }));

        // Summary stats
        const totalEmployees = employees.length;
        const noManager = enriched.filter(d => !d.manager).length;

        // Color palette per department — professional, controlled
        const PALETTE = [
          { bg: "#EBF3FB", text: "#1264A3", border: "#D0E8F7", accent: "#1264A3" },
          { bg: "#E8F5E9", text: "#2E7D32", border: "#C8E6C9", accent: "#388E3C" },
          { bg: "#FFF3E0", text: "#BF5A00", border: "#FFDDB5", accent: "#F57C00" },
          { bg: "#F3E5F5", text: "#6A1B9A", border: "#E1BEE7", accent: "#7B1FA2" },
          { bg: "#E0F2F1", text: "#00695C", border: "#B2DFDB", accent: "#00796B" },
          { bg: "#FBE9E7", text: "#BF360C", border: "#FFCCBC", accent: "#D84315" },
          { bg: "#EDE7F6", text: "#4527A0", border: "#D1C4E9", accent: "#512DA8" },
          { bg: "#ECEFF1", text: "#37474F", border: "#CFD8DC", accent: "#546E7A" },
        ];
        const getColor = name => PALETTE[(name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

        return (
          <div style={{ marginTop: 16 }}>
            {/* Page header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
                  <FaSitemap style={{ color: "var(--red)" }} /> Departments
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Manage your organisation's departments, assign heads, and view team composition.</p>
              </div>
              <button className="btn" onClick={openAddDept} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px" }}>
                <FaPlus size={11} /> Add Department
              </button>
            </div>

            {/* Stats strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total Departments", value: enriched.length, color: "#6366f1", bg: "#eef2ff" },
                { label: "Total Employees", value: totalEmployees, color: "#16a34a", bg: "#dcfce7" },
                { label: "Needs a Manager", value: noManager, color: "#d97706", bg: "#fef9c3" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Department cards grid */}
            {deptLoading ? (
              <div className="loader-container"><div className="loader" /></div>
            ) : enriched.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                <FaBuilding size={40} style={{ color: "#cbd5e1", marginBottom: 16 }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: "#94a3b8", margin: 0 }}>No departments yet</p>
                <p style={{ fontSize: 13, color: "#cbd5e1", marginTop: 6 }}>Click "Add Department" to create your first one.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
                {enriched.map(dept => {
                  const clr = getColor(dept.name);
                  return (
                    <div key={dept._id} style={{ background: "#fff", border: `1px solid ${clr.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "box-shadow 0.2s, transform 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}>

                      {/* Card color bar */}
                      <div style={{ height: 5, background: `linear-gradient(90deg, ${clr.accent}, ${clr.accent}88)` }} />

                      <div style={{ padding: "18px 20px" }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: clr.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20, fontWeight: 800, color: clr.text }}>
                            {dept.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dept.name}</div>
                            {dept.description ? (
                              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{dept.description}</div>
                            ) : (
                              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 3, fontStyle: "italic" }}>No description</div>
                            )}
                          </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                          <div style={{ flex: 1, background: clr.bg, borderRadius: 9, padding: "8px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: clr.text }}>{dept.members.length}</div>
                            <div style={{ fontSize: 10, color: clr.text, opacity: 0.75, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Employees</div>
                          </div>
                          <div style={{ flex: 2, background: "#f8fafc", borderRadius: 9, padding: "8px 12px" }}>
                            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 3 }}>Department Head</div>
                            {dept.manager ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#dc2626,#991b1b)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  {dept.manager.name.charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dept.manager.name}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>⚠ Not assigned</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 7 }}>
                          <button
                            onClick={() => setDeptMembersOpen(dept)}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${clr.border}`, background: clr.bg, color: clr.text, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}
                          >
                            <FaEye size={11} /> View Members
                          </button>
                          <button
                            onClick={() => openEditDept(dept)}
                            style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}
                          >
                            <FaEdit size={11} />
                          </button>
                          <button
                            onClick={() => deleteDepartment(dept._id, dept.name)}
                            style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}
                          >
                            <FaTrash size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── ADD / EDIT DEPARTMENT MODAL ──────────────────────────────── */}
            {deptModal && (
              <div className="modal-overlay" style={{ zIndex: 5000 }}>
                <div className="modal-card" style={{ padding: 0, width: 480 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                        {deptEditId ? "Edit Department" : "Add Department"}
                      </h3>
                      <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#64748b" }}>
                        {deptEditId ? "Update department details." : "Create a new department for your organisation."}
                      </p>
                    </div>
                    <button onClick={() => setDeptModal(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", flexShrink: 0 }}>
                      <FaTimes size={13} />
                    </button>
                  </div>
                  <form onSubmit={saveDepartment} style={{ padding: "20px 24px 24px" }}>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Department Name *</label>
                      <input
                        className="modern-input"
                        required
                        placeholder="e.g. Engineering, Marketing, Finance"
                        value={deptForm.name}
                        onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                      />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Description <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
                      <textarea
                        className="modern-input"
                        style={{ minHeight: 80, resize: "vertical" }}
                        placeholder="Brief description of this department's role..."
                        value={deptForm.description}
                        onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                      />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Department Head <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
                      <select
                        className="modern-input"
                        value={deptForm.head_id}
                        onChange={e => setDeptForm({ ...deptForm, head_id: e.target.value })}
                      >
                        <option value="">— Select a manager —</option>
                        {employees.filter(e => e.role === "manager").map(m => (
                          <option key={m._id} value={m._id}>{m.name} · {m.department}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="submit" className="btn" style={{ flex: 1 }} disabled={deptSaving}>
                        {deptSaving ? "Saving..." : deptEditId ? "Save Changes" : "Create Department"}
                      </button>
                      <button type="button" className="btn ghost" onClick={() => setDeptModal(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── MEMBERS QUICK-VIEW DRAWER ─────────────────────────────────── */}
            {deptMembersOpen && (() => {
              const d = deptMembersOpen;
              const clr = getColor(d.name);
              const managers = d.members.filter(m => m.role === "manager");
              const regulars = d.members.filter(m => m.role !== "manager");
              return (
                <>
                  <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 6000, backdropFilter: "blur(2px)" }} onClick={() => setDeptMembersOpen(null)} />
                  <div style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 400, maxWidth: "95vw", background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)", zIndex: 6001, display: "flex", flexDirection: "column", animation: "slideFromRight 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
                    {/* Drawer header */}
                    <div style={{ background: `linear-gradient(135deg, #0d1520, #1e293b)`, padding: "20px 20px 18px", flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: clr.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: clr.text, flexShrink: 0 }}>
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{d.name}</div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                              {d.members.length} {d.members.length === 1 ? "member" : "members"}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setDeptMembersOpen(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                          <FaTimes size={13} />
                        </button>
                      </div>
                      {d.description && <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5 }}>{d.description}</p>}
                    </div>

                    {/* Members list */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                      {d.members.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 16px" }}>
                          <FaUsers size={36} style={{ color: "#cbd5e1", marginBottom: 12 }} />
                          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>No employees in this department</p>
                        </div>
                      ) : (
                        <>
                          {managers.length > 0 && (
                            <>
                              <p style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px", margin: "0 0 10px" }}>Management</p>
                              {managers.map(emp => (
                                <MemberRow key={emp._id} emp={emp} badge={{ label: "Manager", bg: "#fde8e8", color: "#b91c1c" }} />
                              ))}
                              {regulars.length > 0 && <div style={{ height: 1, background: "#f1f5f9", margin: "14px 0" }} />}
                            </>
                          )}
                          {regulars.length > 0 && (
                            <>
                              <p style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px", margin: "0 0 10px" }}>Team Members</p>
                              {regulars.map(emp => (
                                <MemberRow key={emp._id} emp={emp} />
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Drawer footer */}
                    <div style={{ padding: "14px 20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10 }}>
                      <button className="btn" style={{ flex: 1 }} onClick={() => { openEditDept(d); setDeptMembersOpen(null); }}>
                        <FaEdit size={12} /> Edit Department
                      </button>
                      <button className="btn ghost" onClick={() => setDeptMembersOpen(null)}>Close</button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        );
      })()}

      {/* ============================================================================ */}
      {/* 10. ORGANIZATION ASSET MANAGEMENT */}
      {/* ============================================================================ */}
      {view === "assets" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Manage Organization Assets</h3>
              <p className="small" style={{marginBottom: 20}}>Review and provide final authorization for all hardware and equipment requests across the company. Requests must be approved by the Department Manager before final Admin processing.</p>
              
              <div style={{overflowX: 'auto'}}>
                <table className="styled-table-global">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Employee (Dept)</th>
                            <th>Requested Asset</th>
                            <th>Reason</th>
                            <th style={{textAlign:'center'}}>Manager Status</th>
                            <th style={{textAlign:'center'}}>Admin Status</th>
                            <th>Final Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allAssets.length === 0 ? (
                            <tr><td colSpan="7" style={{textAlign:'center', padding:40, color:'#999'}}>No asset requests found in the system.</td></tr>
                        ) : (
                            allAssets.map(asset => (
                            <tr key={asset._id}>
                                <td>{new Date(asset.created_at).toLocaleDateString('en-GB')}</td>
                                <td>
                                    <div style={{fontWeight:700, color: "#0f172a", fontSize: 13}}>{asset.employee_name}</div>
                                    <div style={{fontSize:10, color:'#64748b', marginTop: 4}}>{asset.department || "No Dept"}</div>
                                </td>
                                <td style={{ fontWeight: 600, color: '#334155' }}>
                                    {asset.asset_name}
                                </td>
                                <td style={{maxWidth:'200px'}}>
                                    <div style={{fontSize:11, color:'#475569', lineHeight:'1.4'}}>
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
                                            onClick={() => updateAdminAssetStatus(asset._id, "Approved")}
                                        >
                                            <FaCheckCircle /> Approve
                                        </button>
                                        <button 
                                            className="action-btn btn-reject" 
                                            onClick={() => updateAdminAssetStatus(asset._id, "Rejected")}
                                        >
                                            <FaTimesCircle /> Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

        </div>
      </div>
    </div>

    <ProfilePanel user={user} token={token} api={api} isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}