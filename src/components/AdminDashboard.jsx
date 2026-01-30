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
  FaBullhorn // Added for Announcements
} from "react-icons/fa";

export default function AdminDashboard({ token, api }) {
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

  // --- Announcement States (New Fix #8) ---
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");

  // Load Initial Data
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

  // Load Announcements
  async function loadAnnouncements() {
    try {
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      const res = await fetch(`${baseUrl}/api/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAnnouncements(await res.json());
    } catch (err) {
      console.error("Announcements load error:", err);
    }
  }

  useEffect(() => {
    loadEmployees();
    loadTodayStats();
  }, []);

  useEffect(() => {
    if (view === "announcements") loadAnnouncements();
  }, [view]);

  // --- Actions ---
  async function addEmployee(data) {
    await api.addEmployee(data, token);
    await loadEmployees();
    setSubView("list");
  }

  async function deleteEmployee(id) {
    await api.deleteEmployee(id, token);
    await loadEmployees();
  }

  // --- Create Announcement (New Fix #8) ---
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

  // --- Handle Click on Stat Item ---
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

  // --- Sub-Components ---

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

  // --- Main Render ---

  return (
    <div>
      {/* ---------------- CSS for Modal & Clickable Stats ---------------- */}
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
        /* New Styles for Announcement Form */
        .modern-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: #fff; color: #333; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Header Area */}
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

      {/* DASHBOARD HOME VIEW (Widgets) */}
      {view === "dashboard" && (
        <div className="dashboard-grid-container">
          
          {/* Widget 1: Attendance Overview */}
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

          {/* Widget 2: Quick Launch */}
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
              {/* NEW: Announcement Button */}
              <QuickLaunchItem 
                icon={<FaBullhorn />} 
                label="Announcements" 
                onClick={() => setView("announcements")} 
              />
            </div>
          </div>

          {/* Widget 3: Employee Summary */}
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

      {/* --- Details Modal --- */}
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

      {/* --- INNER PAGES --- */}

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

      {/* 7. ANNOUNCEMENTS (NEW) */}
      {view === "announcements" && (
        <div className="card" style={{ marginTop: "16px" }}>
            <h3>Manage Announcements</h3>
            
            <div style={{ marginBottom: 30, borderBottom:'1px solid #eee', paddingBottom: 20 }}>
                <h4>Create New Announcement</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                    <input 
                        className="modern-input" 
                        placeholder="Title (e.g. Office Closed on Friday)" 
                        value={annTitle} 
                        onChange={(e) => setAnnTitle(e.target.value)} 
                    />
                    <textarea 
                        className="modern-input" 
                        placeholder="Message details..." 
                        style={{ minHeight: 80, resize:'vertical' }}
                        value={annMessage} 
                        onChange={(e) => setAnnMessage(e.target.value)} 
                    />
                    <div>
                        <button className="btn" onClick={createAnnouncement}>Post Announcement</button>
                    </div>
                </div>
            </div>

            <h4>Announcement History</h4>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {announcements.length === 0 ? (
                    <p style={{ color: '#999', fontStyle: 'italic' }}>No announcements posted yet.</p>
                ) : (
                    announcements.map((ann) => (
                        <div key={ann._id} style={{ padding: '15px', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                <h4 style={{ margin: '0 0 5px 0', color: 'var(--red)' }}>{ann.title}</h4>
                                <span style={{ fontSize: '12px', color: '#999' }}>
                                    {new Date(ann.created_at).toLocaleString()}
                                </span>
                            </div>
                            <p style={{ margin: 0, color: '#555', whiteSpace: 'pre-wrap' }}>{ann.message}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}

    </div>
  );
}