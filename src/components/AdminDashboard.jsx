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
  FaGift
} from "react-icons/fa";
import ProfilePanel from "./ProfilePanel";

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

function StatItem({ icon, label, count, colorClass, onClick }) {
  return (
    <div className="stat-row clickable-stat" onClick={onClick} title="Click to view details">
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-count">{count}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard({ token, api, user, onLogout }) {
  
  // ============================================================================
  // 1. CORE STATES
  // ============================================================================
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

  // ============================================================================
  // 2. ANNOUNCEMENT STATES 
  // ============================================================================
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  
  // Inline Editing States for Announcements
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [editAnnTitle, setEditAnnTitle] = useState("");
  const [editAnnMessage, setEditAnnMessage] = useState("");

  // ============================================================================
  // 3. GRANT ACCESS STATES (DELEGATED ADMIN)
  // ============================================================================
  const [accessGrants, setAccessGrants] = useState([]);
  const [grantData, setGrantData] = useState({
      employeeId: "",
      accessLevel: "view_only", 
      scope: "today",           
      customDate: "",
      expiry: "end_of_day",     
      customExpiryTime: ""
  });

  // ============================================================================
  // 4. ASSET MANAGEMENT STATES (NEW)
  // ============================================================================
  const [allAssets, setAllAssets] = useState([]);

  // ============================================================================
  // 5. DATA LOADING FUNCTIONS
  // ============================================================================
  
  /**
   * Fetches the complete organizational directory.
   */
  async function loadEmployees() {
    setLoading(true);
    try {
      const list = await api.listEmployees(token);
      setEmployees(list);
    } catch (err) {
      console.error("Error loading employees:", err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fetches today's holistic attendance breakdown.
   */
  async function loadTodayStats() {
    try {
      const res = await api.todayStats(token);
      setStats(res);
    } catch (err) {
      console.error("Stats load error:", err);
    }
  }

  /**
   * Fetches active company announcements.
   */
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
    } catch (err) {
      console.error("Announcements load error:", err);
    }
  }

  /**
   * Fetches the active temporary delegation grants.
   */
  async function loadAccessGrants() {
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/active-grants`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) setAccessGrants(await res.json());
      } catch (err) {
          console.error("Error loading access grants:", err);
      }
  }

  /**
   * NEW: Fetches all asset requests from across the entire organization.
   * This allows the Admin to see the dual-approval status (Manager -> Admin).
   */
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
          console.error("Error loading organization assets:", err);
      }
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
  }, [view]);

  useEffect(() => {
    const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
    fetch(`${baseUrl}/api/notifications/birthdays`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setTodayBirthdays(data); })
      .catch(() => {});
  }, [token, api]);

  // ============================================================================
  // 6. EMPLOYEE ACTIONS (ADD, PROMOTE, DELETE)
  // ============================================================================
  
  async function addEmployee(data) {
    await api.addEmployee(data, token);
    await loadEmployees();
    setSubView("list");
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
          console.error(err);
          alert("Error promoting employee due to network issues.");
      }
  }

  // ============================================================================
  // 7. ANNOUNCEMENT ACTIONS (CREATE, EDIT, RECALL)
  // ============================================================================
  
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

  // ============================================================================
  // 8. GRANT ACCESS ACTIONS (DELEGATED ADMIN)
  // ============================================================================
  
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
      } catch (err) { console.error("Error revoking access", err); }
  }

  // ============================================================================
  // 9. ASSET MANAGEMENT ACTIONS (FINAL APPROVAL)
  // ============================================================================
  
  /**
   * Updates the final Admin status of an asset request.
   * This is the final step in the dual-approval workflow.
   */
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

  // ============================================================================
  // 10. DASHBOARD STAT CLICK HANDLER
  // ============================================================================
  
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

      if (todayData && todayData[type]) {
        const listData = todayData[type];
        const enrichedList = listData.map(item => {
            const id = typeof item === 'object' ? item._id : item;
            const empDef = employees.find(e => e._id === id);
            return empDef || (typeof item === 'object' ? item : { name: "Unknown", _id: id });
        });
        setDetailList(enrichedList);
      } else { setDetailList([]); }
    } catch (err) { alert("Could not load details."); } finally { setDetailLoading(false); }
  }

  // Status Badge Helper
  const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");

  // QuickLaunchItem and StatItem are defined above the component for performance

  // ============================================================================
  // MAIN RENDER TEMPLATE
  // ============================================================================
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
        <div className="dashboard-grid-container">
          
          <div className="card dashboard-widget">
            <h4 className="widget-title">Today's Attendance</h4>
            <div className="stats-list">
              <StatItem icon={<FaCheckCircle />} label="Present" count={stats.present} colorClass="text-green" onClick={() => handleStatClick('present', 'Present Today')} />
              <StatItem icon={<FaTimesCircle />} label="Absent" count={stats.absent} colorClass="text-red" onClick={() => handleStatClick('absent', 'Absent Today')} />
              <StatItem icon={<FaUserClock />} label="On Leave" count={stats.leave} colorClass="text-dark-red" onClick={() => handleStatClick('leave', 'On Leave Today')} />
              <StatItem icon={<FaUserSlash />} label="Not Checked In" count={stats.not_checked_in} colorClass="text-orange" onClick={() => handleStatClick('not_checked_in', 'Not Checked In')} />
            </div>
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
              
              {/* NEW: Asset Management Icon for Admin */}
              <QuickLaunchItem icon={<FaLaptop />} label="Manage Assets" onClick={() => setView("assets")} color="#0284c7" />
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
                detailList.map((emp, idx) => (
                  <div key={emp._id || idx} className="detail-item">
                    <div className="detail-avatar">{emp.name ? emp.name.charAt(0).toUpperCase() : "?"}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{emp.name || "Unknown"}</div>
                      <div className="small">{emp.email || emp.position || "Employee"}</div>
                    </div>
                  </div>
                ))
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
              <EmployeeForm onAdd={addEmployee} api={api} token={token} />
            ) : loading ? (
              <div className="card">Loading...</div>
            ) : (
              <EmployeeList 
                employees={employees} 
                onDelete={deleteEmployee} 
                onRefresh={loadEmployees} 
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
      {/* 9. ORGANIZATION ASSET MANAGEMENT (NEW ADMIN FEATURE) */}
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