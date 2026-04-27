import React, { useEffect, useState } from "react";
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";
import AdminLeavePage from "./AdminLeavePage";
import AdminAttendancePage from "./AdminAttendancePage";
import RegisterManager from "./RegisterManager";
import AdminAttendanceSummary from "./AdminAttendanceSummary";
import HolidayCalendar from "./HolidayCalendar"; 
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
  FaEdit,      // <-- ADDED for Announcement Edit
  FaSave,      // <-- ADDED for Announcement Save
  FaUndo       // <-- ADDED for Announcement Recall
} from "react-icons/fa";

export default function AdminDashboard({ token, api }) {
  // ============================================================================
  // CORE STATES
  // ============================================================================
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("dashboard"); 
  const [subView, setSubView] = useState("list");

  // Stats State
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    not_checked_in: 0,
  });

  // Modal State for Details
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailList, setDetailList] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ============================================================================
  // ANNOUNCEMENT STATES (EXPANDED)
  // ============================================================================
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  
  // New states to handle Editing Announcements
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [editAnnTitle, setEditAnnTitle] = useState("");
  const [editAnnMessage, setEditAnnMessage] = useState("");

  // ============================================================================
  // GRANT ACCESS STATES 
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
  // DATA LOADING FUNCTIONS
  // ============================================================================
  async function loadEmployees() {
    setLoading(true);
    try {
      const list = await api.listEmployees(token);
      setEmployees(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTodayStats() {
    try {
      const res = await api.todayStats(token);
      setStats(res);
    } catch (err) {
      console.error("Stats load error:", err);
    }
  }

  async function loadAnnouncements() {
    try {
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      const res = await fetch(`${baseUrl}/api/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
          const data = await res.json();
          // Sort newest first
          const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setAnnouncements(sorted);
      }
    } catch (err) {
      console.error("Announcements load error:", err);
    }
  }

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

  useEffect(() => {
    loadEmployees();
    loadTodayStats();
  }, []);

  useEffect(() => {
    if (view === "announcements") loadAnnouncements();
    if (view === "grant-access") loadAccessGrants();
  }, [view]);

  // ============================================================================
  // EMPLOYEE ACTIONS (INCLUDING NEW PROMOTE ACTION)
  // ============================================================================
  async function addEmployee(data) {
    await api.addEmployee(data, token);
    await loadEmployees();
    setSubView("list");
  }

  async function deleteEmployee(id) {
    if(!window.confirm("Are you sure you want to delete this employee?")) return;
    await api.deleteEmployee(id, token);
    await loadEmployees();
  }

  // --- NEW: PROMOTE TO MANAGER ---
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
              await loadEmployees(); // Refresh the list to show new roles and managers
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
  // ANNOUNCEMENT ACTIONS (CREATE, EDIT, RECALL/DELETE)
  // ============================================================================
  
  // CREATE
  async function createAnnouncement() {
    if (!annTitle || !annMessage) return alert("Please fill in both title and message");
    
    try {
        const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
        const res = await fetch(`${baseUrl}/api/announcements`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ title: annTitle, message: annMessage })
        });

        if (res.ok) {
            alert("Announcement Posted Successfully!");
            setAnnTitle("");
            setAnnMessage("");
            loadAnnouncements();
        } else {
            alert("Failed to post announcement");
        }
    } catch (err) {
        console.error(err);
        alert("Error posting announcement");
    }
  }

  // INITIATE EDIT
  function startEditAnnouncement(ann) {
      setEditingAnnId(ann._id);
      setEditAnnTitle(ann.title);
      setEditAnnMessage(ann.message);
  }

  // CANCEL EDIT
  function cancelEditAnnouncement() {
      setEditingAnnId(null);
      setEditAnnTitle("");
      setEditAnnMessage("");
  }

  // SAVE EDIT (UPDATE)
  async function updateAnnouncement(id) {
      if (!editAnnTitle || !editAnnMessage) return alert("Title and message cannot be empty.");
      
      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/announcements/${id}`, {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ title: editAnnTitle, message: editAnnMessage })
          });

          if (res.ok) {
              alert("Announcement Updated Successfully!");
              setEditingAnnId(null);
              loadAnnouncements();
          } else {
              alert("Failed to update announcement");
          }
      } catch (err) {
          console.error(err);
          alert("Error updating announcement");
      }
  }

  // RECALL / DELETE
  async function recallAnnouncement(id) {
      if (!window.confirm("Are you sure you want to recall (delete) this announcement? This will remove it from all employee views immediately.")) return;

      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/announcements/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });

          if (res.ok) {
              alert("Announcement Recalled Successfully.");
              loadAnnouncements();
          } else {
              alert("Failed to recall announcement.");
          }
      } catch (err) {
          console.error(err);
          alert("Error recalling announcement.");
      }
  }

  // ============================================================================
  // GRANT ACCESS ACTIONS 
  // ============================================================================
  async function handleGrantAccessSubmit(e) {
      e.preventDefault();
      if (!grantData.employeeId) return alert("Please select an employee.");
      
      if (grantData.scope === "custom_date" && !grantData.customDate) {
          return alert("Please select a custom date scope.");
      }
      if (grantData.expiry === "custom_time" && !grantData.customExpiryTime) {
          return alert("Please select a custom expiration time.");
      }

      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/grant-access`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify(grantData)
          });

          if (res.ok) {
              alert("Temporary Access Granted Successfully!");
              setGrantData({
                  employeeId: "",
                  accessLevel: "view_only",
                  scope: "today",
                  customDate: "",
                  expiry: "end_of_day",
                  customExpiryTime: ""
              });
              loadAccessGrants(); 
          } else {
              const errData = await res.json();
              alert(`Failed to grant access: ${errData.message}`);
          }
      } catch (err) {
          console.error(err);
          alert("Error granting access.");
      }
  }

  async function revokeAccess(grantId) {
      if (!window.confirm("Are you sure you want to revoke this access immediately?")) return;

      try {
          const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/revoke-access/${grantId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });

          if (res.ok) {
              alert("Access revoked.");
              loadAccessGrants();
          }
      } catch (err) {
          console.error("Error revoking access", err);
      }
  }

  // ============================================================================
  // DASHBOARD STAT CLICK HANDLER
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
      } else {
        setDetailList([]); 
      }
    } catch (err) {
      console.error("Error fetching details", err);
      alert("Could not load details.");
    } finally {
      setDetailLoading(false);
    }
  }

  // ============================================================================
  // REUSABLE COMPONENTS
  // ============================================================================
  const QuickLaunchItem = ({ icon, label, onClick }) => (
    <div className="quick-launch-item" onClick={onClick}>
      <div className="quick-launch-icon">{icon}</div>
      <div className="quick-launch-label">{label}</div>
    </div>
  );

  const StatItem = ({ icon, label, count, colorClass, onClick }) => (
    <div 
      className="stat-row clickable-stat" 
      onClick={onClick}
      title="Click to view details"
    >
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-count">{count}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div>
      {/* ---------------- COMPONENT CSS ---------------- */}
      <style>{`
        .clickable-stat {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .clickable-stat:hover {
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          background: #fff;
          border-color: #e5e5e5;
        }
        .detail-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.5); z-index: 3000;
          display: flex; justify-content: center; align-items: center;
          animation: fadeIn 0.2s;
        }
        .detail-modal-card {
          background: white; width: 400px; max-width: 90%;
          border-radius: 12px; padding: 20px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          display: flex; flex-direction: column; max-height: 80vh;
        }
        .detail-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;
        }
        .detail-list {
          overflow-y: auto; flex: 1;
        }
        .detail-item {
          padding: 8px 10px; border-bottom: 1px solid #f9f9f9;
          display: flex; align-items: center; gap: 10px;
        }
        .detail-avatar {
          width: 32px; height: 32px; background: #eee; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; color: #666; font-weight: bold;
        }
        .modern-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: #fff; color: #333; }
        .grant-form-section { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px; }
        .grant-form-row { display: flex; gap: 20px; margin-bottom: 15px; }
        .grant-form-col { flex: 1; }
        .radio-group { display: flex; gap: 15px; align-items: center; margin-top: 8px; }
        .radio-label { display: flex; align-items: center; gap: 5px; font-size: 14px; cursor: pointer; color: #444; }
        
        /* New Announcement Styles */
        .announcement-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-left: 4px solid var(--red);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            transition: box-shadow 0.2s;
        }
        .announcement-card:hover {
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .announcement-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        .announcement-title {
            margin: 0;
            color: #1e293b;
            font-size: 18px;
            font-weight: 700;
        }
        .announcement-date {
            font-size: 12px;
            color: #64748b;
            background: #f1f5f9;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .announcement-body {
            color: #475569;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
            margin-bottom: 15px;
        }
        .announcement-actions {
            display: flex;
            gap: 10px;
            border-top: 1px solid #f1f5f9;
            padding-top: 15px;
        }
        .btn-action-edit {
            background: #f8fafc;
            color: #3b82f6;
            border: 1px solid #bfdbfe;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-weight: 600;
        }
        .btn-action-edit:hover { background: #eff6ff; }
        
        .btn-action-recall {
            background: #fef2f2;
            color: #ef4444;
            border: 1px solid #fecaca;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-weight: 600;
        }
        .btn-action-recall:hover { background: #fee2e2; }

        .edit-mode-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* ---------------- HEADER AREA ---------------- */}
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
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'uppercase' }}>{view.replace("-", " ")}</h3>
        </div>
      )}

      {/* ---------------- DASHBOARD WIDGETS ---------------- */}
      {view === "dashboard" && (
        <div className="dashboard-grid-container">
          
          <div className="card dashboard-widget">
            <h4 className="widget-title">Today's Attendance</h4>
            <div className="stats-list">
              <StatItem 
                icon={<FaCheckCircle />} 
                label="Present" 
                count={stats.present} 
                colorClass="text-green"
                onClick={() => handleStatClick('present', 'Present Today')}
              />
              <StatItem 
                icon={<FaTimesCircle />} 
                label="Absent" 
                count={stats.absent} 
                colorClass="text-red"
                onClick={() => handleStatClick('absent', 'Absent Today')}
              />
              <StatItem 
                icon={<FaUserClock />} 
                label="On Leave" 
                count={stats.leave} 
                colorClass="text-dark-red"
                onClick={() => handleStatClick('leave', 'On Leave Today')}
              />
              <StatItem 
                icon={<FaUserSlash />} 
                label="Not Checked In" 
                count={stats.not_checked_in} 
                colorClass="text-orange"
                onClick={() => handleStatClick('not_checked_in', 'Not Checked In')}
              />
            </div>
          </div>

          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Launch</h4>
            <div className="quick-launch-grid">
              <QuickLaunchItem 
                icon={<FaUserPlus />} 
                label="Add Employee" 
                onClick={() => { setView("employees"); setSubView("add"); }} 
              />
              <QuickLaunchItem 
                icon={<FaUsers />} 
                label="Employee List" 
                onClick={() => { setView("employees"); setSubView("list"); }} 
              />
              <QuickLaunchItem 
                icon={<FaCalendarCheck />} 
                label="Leave Requests" 
                onClick={() => setView("leaves")} 
              />
              <QuickLaunchItem 
                icon={<FaClock />} 
                label="Attendance Logs" 
                onClick={() => setView("attendance")} 
              />
              <QuickLaunchItem 
                icon={<FaUserTie />} 
                label="Managers" 
                onClick={() => setView("manager")} 
              />
              <QuickLaunchItem 
                icon={<FaChartPie />} 
                label="Reports" 
                onClick={() => setView("summary")} 
              />
              <QuickLaunchItem 
                icon={<FaCalendarAlt />} 
                label="Holidays" 
                onClick={() => setView("holidays")} 
              />
              <QuickLaunchItem 
                icon={<FaBullhorn />} 
                label="Announcements" 
                onClick={() => setView("announcements")} 
              />
              <QuickLaunchItem 
                icon={<FaUserShield />} 
                label="Grant Access" 
                onClick={() => setView("grant-access")} 
              />
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

      {/* ---------------- DETAILS MODAL ---------------- */}
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
                    <div className="detail-avatar">
                      {emp.name ? emp.name.charAt(0).toUpperCase() : "?"}
                    </div>
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

      {/* ---------------- INNER PAGES ---------------- */}

      {/* 1. EMPLOYEES */}
      {view === "employees" && (
        <>
          <div className="card admin-buttons" style={{ marginTop: "12px" }}>
            <button
              className={`btn ${subView === "list" ? "" : "ghost"}`}
              onClick={() => setSubView("list")}
            >
              Employee List
            </button>
            <button
              className={`btn ${subView === "add" ? "" : "ghost"}`}
              onClick={() => setSubView("add")}
            >
              Add New Employee
            </button>
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
                onPromote={promoteToManager}  // <-- FIX: Passing the promote function down here!
              />
            )}
          </div>
        </>
      )}

      {/* 2. LEAVES */}
      {view === "leaves" && (
        <div style={{ marginTop: "16px" }}>
          <AdminLeavePage token={token} api={api} />
        </div>
      )}

      {/* 3. ATTENDANCE */}
      {view === "attendance" && (
        <div style={{ marginTop: "16px" }}>
          <AdminAttendancePage token={token} api={api} />
        </div>
      )}

      {/* 4. MANAGERS */}
      {view === "manager" && (
        <div style={{ marginTop: "16px" }}>
          <RegisterManager token={token} api={api} />
        </div>
      )}

      {/* 5. SUMMARY */}
      {view === "summary" && (
        <div style={{ marginTop: "16px" }}>
          <AdminAttendanceSummary token={token} api={api} />
        </div>
      )}

      {/* 6. HOLIDAYS */}
      {view === "holidays" && (
        <div style={{ marginTop: "16px" }}>
          <HolidayCalendar />
        </div>
      )}

      {/* 7. ANNOUNCEMENTS */}
      {view === "announcements" && (
        <div className="card" style={{ marginTop: "16px", background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            <h3 style={{color: 'var(--red)'}}>Manage Announcements</h3>
            <p style={{color: '#64748b', marginBottom: 20}}>Broadcast messages to all employee dashboards.</p>
            
            {/* Create Form */}
            <div className="card" style={{ marginBottom: 30 }}>
                <h4 style={{marginTop: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: 10}}>Create New Announcement</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                    <input 
                        className="modern-input" 
                        placeholder="Announcement Title (e.g. Office Closed on Friday)" 
                        value={annTitle} 
                        onChange={(e) => setAnnTitle(e.target.value)} 
                    />
                    <textarea 
                        className="modern-input" 
                        placeholder="Detailed message..." 
                        style={{ minHeight: 100, resize:'vertical' }}
                        value={annMessage} 
                        onChange={(e) => setAnnMessage(e.target.value)} 
                    />
                    <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                        <button className="btn" onClick={createAnnouncement} style={{padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8}}>
                            <FaBullhorn /> Post Announcement
                        </button>
                    </div>
                </div>
            </div>

            <h4 style={{marginBottom: 15, color: '#334155'}}>Announcement History & Management</h4>
            
            {/* Announcement List */}
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
                                /* EDIT MODE */
                                <div className="edit-mode-card">
                                    <h4 style={{marginTop: 0, color: '#3b82f6'}}>Editing Announcement</h4>
                                    <input 
                                        className="modern-input" 
                                        style={{marginBottom: 10}}
                                        value={editAnnTitle} 
                                        onChange={(e) => setEditAnnTitle(e.target.value)} 
                                    />
                                    <textarea 
                                        className="modern-input" 
                                        style={{ minHeight: 100, resize:'vertical', marginBottom: 15 }}
                                        value={editAnnMessage} 
                                        onChange={(e) => setEditAnnMessage(e.target.value)} 
                                    />
                                    <div style={{display: 'flex', gap: 10}}>
                                        <button className="btn" style={{background: '#3b82f6', display: 'flex', alignItems: 'center', gap: 5}} onClick={() => updateAnnouncement(ann._id)}>
                                            <FaSave /> Save Changes
                                        </button>
                                        <button className="btn ghost" onClick={cancelEditAnnouncement}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* DISPLAY MODE (Employee View Style) */
                                <div className="announcement-card">
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
                                    
                                    <div className="announcement-actions">
                                        <button className="btn-action-edit" onClick={() => startEditAnnouncement(ann)}>
                                            <FaEdit /> Edit
                                        </button>
                                        <button className="btn-action-recall" onClick={() => recallAnnouncement(ann._id)}>
                                            <FaUndo /> Recall / Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
      )}

      {/* 8. GRANT ACCESS (NEW FEATURE) */}
      {view === "grant-access" && (
        <div className="card" style={{ marginTop: "16px" }}>
            <h3>Grant Temporary Admin Access</h3>
            <p className="small" style={{marginBottom: 25}}>Assign another employee temporary permissions to view or edit attendance data.</p>
            
            <form onSubmit={handleGrantAccessSubmit} className="grant-form-section">
                
                {/* Row 1: Employee Selection */}
                <div className="grant-form-row">
                    <div className="grant-form-col">
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Select Employee</label>
                        <select 
                            className="modern-input" 
                            style={{marginTop: 8}}
                            value={grantData.employeeId}
                            onChange={(e) => setGrantData({...grantData, employeeId: e.target.value})}
                            required
                        >
                            <option value="">-- Choose Employee --</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.name} ({emp.department})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Row 2: Permissions and Scope */}
                <div className="grant-form-row">
                    <div className="grant-form-col">
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Access Level (Permission)</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input 
                                    type="radio" 
                                    name="accessLevel" 
                                    checked={grantData.accessLevel === 'view_only'} 
                                    onChange={() => setGrantData({...grantData, accessLevel: 'view_only'})} 
                                /> 
                                View Only (Read)
                            </label>
                            <label className="radio-label">
                                <input 
                                    type="radio" 
                                    name="accessLevel" 
                                    checked={grantData.accessLevel === 'view_edit'} 
                                    onChange={() => setGrantData({...grantData, accessLevel: 'view_edit'})} 
                                /> 
                                View & Edit (Read/Write)
                            </label>
                        </div>
                    </div>

                    <div className="grant-form-col">
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Data Scope</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input 
                                    type="radio" 
                                    name="scope" 
                                    checked={grantData.scope === 'today'} 
                                    onChange={() => setGrantData({...grantData, scope: 'today'})} 
                                /> 
                                Today Only
                            </label>
                            <label className="radio-label">
                                <input 
                                    type="radio" 
                                    name="scope" 
                                    checked={grantData.scope === 'custom_date'} 
                                    onChange={() => setGrantData({...grantData, scope: 'custom_date'})} 
                                /> 
                                Custom Date
                            </label>
                        </div>
                        {grantData.scope === 'custom_date' && (
                            <input 
                                type="date" 
                                className="modern-input" 
                                style={{marginTop: 10}}
                                value={grantData.customDate}
                                onChange={(e) => setGrantData({...grantData, customDate: e.target.value})}
                            />
                        )}
                    </div>
                </div>

                {/* Row 3: Expiration */}
                <div className="grant-form-row" style={{borderTop: '1px solid #ddd', paddingTop: 15}}>
                    <div className="grant-form-col">
                        <label style={{fontWeight: 600, fontSize: '14px', color: '#333'}}>Set Expiration</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input 
                                    type="radio" 
                                    name="expiry" 
                                    checked={grantData.expiry === 'end_of_day'} 
                                    onChange={() => setGrantData({...grantData, expiry: 'end_of_day'})} 
                                /> 
                                Auto (End of Day)
                            </label>
                            <label className="radio-label">
                                <input 
                                    type="radio" 
                                    name="expiry" 
                                    checked={grantData.expiry === 'custom_time'} 
                                    onChange={() => setGrantData({...grantData, expiry: 'custom_time'})} 
                                /> 
                                Custom Time
                            </label>
                        </div>
                        {grantData.expiry === 'custom_time' && (
                            <input 
                                type="datetime-local" 
                                className="modern-input" 
                                style={{marginTop: 10, maxWidth: 250}}
                                value={grantData.customExpiryTime}
                                onChange={(e) => setGrantData({...grantData, customExpiryTime: e.target.value})}
                            />
                        )}
                    </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 10}}>
                    <button type="submit" className="btn" style={{backgroundColor: '#10b981'}}>Grant Permission</button>
                </div>
            </form>

            <h4 style={{marginTop: 30, color: '#333', borderBottom: '2px solid #eee', paddingBottom: 10}}>Active Access Grants</h4>
            <div style={{ overflowX: 'auto' }}>
                <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#fdf2f2', color: 'var(--red)', borderBottom: '2px solid #fee2e2' }}>
                            <th style={{ padding: '12px' }}>Employee</th>
                            <th style={{ padding: '12px' }}>Permission</th>
                            <th style={{ padding: '12px' }}>Scope</th>
                            <th style={{ padding: '12px' }}>Expires At</th>
                            <th style={{ padding: '12px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accessGrants.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No active access grants.</td>
                            </tr>
                        ) : (
                            accessGrants.map(grant => (
                                <tr key={grant._id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{grant.employee_name}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ backgroundColor: grant.access_level === 'view_edit' ? '#dcfce7' : '#e0e7ff', color: grant.access_level === 'view_edit' ? '#16a34a' : '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                            {grant.access_level === 'view_edit' ? 'View & Edit' : 'View Only'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>{grant.scope === 'today' ? 'Today' : grant.custom_date}</td>
                                    <td style={{ padding: '12px', color: '#666' }}>
                                        {grant.expiry === 'end_of_day' ? 'End of Day' : new Date(grant.custom_expiry_time).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <button 
                                            className="btn-small ghost" 
                                            style={{ color: 'var(--red)', border: '1px solid var(--red)', padding: '4px 8px' }}
                                            onClick={() => revokeAccess(grant._id)}
                                        >
                                            <FaTrash style={{ marginRight: 5 }} /> Revoke
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

    </div>
  );
}