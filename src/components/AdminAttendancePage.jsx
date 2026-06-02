import React, { useEffect, useState } from "react";
import { SkeletonCards, SkeletonTable } from "./Skeleton";
import {
  FaSearch,
  FaFilter,
  FaTimes,
  FaList,
  FaThLarge, 
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaUserClock,
  FaUserSlash
} from "react-icons/fa";

// ============================================================================
// HELPER FUNCTIONS & DATA FORMATTING
// ============================================================================

/**
 * Groups a flat array of attendance records by date for an individual employee.
 * This is used to display a clean table of Check-in vs Check-out times per day.
 * @param {Array} records - The raw attendance records from the API.
 * @returns {Array} - The grouped and chronologically sorted attendance array.
 */
function groupAttendance(records) {
  const groups = {};
  
  // Iterate through records and bucket them by their calendar date
  records.forEach(rec => {
    const date = rec.date;
    if (!groups[date]) {
      groups[date] = {
        checkin: null,
        checkout: null,
        absent: null,
      };
    }
    // Assign the record to the correct type slot (checkin, checkout, or absent)
    groups[date][rec.type] = rec;
  });
  
  // Convert the grouped object back into an array for rendering
  return Object.entries(groups)
    .map(([date, records]) => ({
      date,
      checkin: records.checkin,
      checkout: records.checkout,
      absent: records.absent,
      // Use the latest available time for accurate sorting
      sortTime: new Date(records.checkout?.time || records.checkin?.time || records.absent?.time).getTime()
    }))
    .sort((a, b) => b.sortTime - a.sortTime); // Sort descending (newest first)
}

// ============================================================================
// MAIN COMPONENT EXPORT
// ============================================================================

function StatItem({ icon, label, count, colorClass, onClick, statsLoading }) {
  return (
    <div className="stat-row clickable-stat" style={{ flex: 1, minWidth: '200px' }} onClick={onClick}>
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-count">{statsLoading ? "..." : count}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function AdminAttendancePage({ token, api }) {
  // --- Employee Data States ---
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  // --- Master Logs States (COMPLETE VISIBILITY FEATURE) ---
  const [viewMode, setViewMode] = useState("grid"); // Toggles between "grid" or "logs"
  const [allAttendanceLogs, setAllAttendanceLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [logDateFilter, setLogDateFilter] = useState(""); // Filter for master logs

  // --- Modal States for Individual Employee Details ---
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // --- Today's Stats States ---
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    not_checked_in: 0,
  });

  // --- Modal State for Clickable Stats (NEWLY ADDED) ---
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailList, setDetailList] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ============================================================================
  // API DATA FETCHING
  // ============================================================================

  /**
   * 1. Load the overall summary statistics for today.
   */
  async function loadTodayStats() {
    setStatsLoading(true);
    try {
      if (api.todayStats) {
          const res = await api.todayStats(token);
          setStats(res);
      } else {
          // Fallback if todayStats isn't directly bound to the api prop
          const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/today-stats`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) setStats(await res.json());
      }
    } catch (err) {
      console.error("Stats load error:", err);
    } finally {
      setStatsLoading(false);
    }
  }

  /**
   * 2. Load Employee List for the Grid View.
   */
  async function loadEmployees() {
    setLoading(true);
    try {
      const list = await api.listEmployees(token); 
      setEmployees(list);
      setFilteredEmployees(list);
      
      // Extract unique departments for the dropdown filter dynamically
      const depts = ["All", ...new Set(list.map(e => e.department).filter(Boolean))];
      setDepartments(depts);
    } catch (err) {
      console.error("Error loading employees", err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * 3. Load Master Attendance Logs for the Complete View Mode.
   */
  async function loadCompleteLogs() {
    setLoadingLogs(true);
    try {
      // Fetch all attendance records from the admin endpoint
      const logs = await api.adminAttendance(token);
      
      // Sort chronologically (newest first)
      const sortedLogs = logs.sort((a, b) => new Date(b.time) - new Date(a.time));
      setAllAttendanceLogs(sortedLogs);
    } catch (err) {
      console.error("Error loading complete logs", err);
    } finally {
      setLoadingLogs(false);
    }
  }

  /**
   * 4. Load attendance for one specific employee (triggered on card click).
   */
  async function openEmployeeDetails(emp) {
    setSelectedEmp(emp);
    setShowModal(true);
    setLoadingDetails(true);
    setAttendance([]); // clear previous state to avoid flashing old data
    
    try {
      const records = await api.employeeAttendance(emp._id, token);
      setAttendance(groupAttendance(records));
    } catch (err) {
      console.error("Error loading attendance", err);
      alert("Failed to load employee attendance records.");
    } finally {
      setLoadingDetails(false);
    }
  }

  // ============================================================================
  // CLICKABLE STATS LOGIC (NEWLY ADDED)
  // ============================================================================
  
  /**
   * Handles clicks on the Today's Stats widgets to show who is Present/Absent/etc.
   */
  async function handleStatClick(type, title) {
    setDetailTitle(title);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailList([]);

    try {
      const now = new Date();
      const monthStr = now.toISOString().slice(0, 7); 
      
      // Fetch the detailed summary for the current month
      const summaryData = await api.getAttendanceSummary(monthStr, token);
      const todayStr = now.toISOString().slice(0, 10); 
      const todayData = summaryData.days && summaryData.days[todayStr];

      if (todayData && todayData[type]) {
        const listData = todayData[type];
        
        // Enrich the IDs with actual employee details from our loaded employees list
        const enrichedList = listData.map(item => {
            const id = typeof item === 'object' ? item._id : item;
            const empDef = employees.find(e => e._id === id);
            return empDef || (typeof item === 'object' ? item : { name: "Unknown", _id: id, email: "N/A" });
        });
        
        setDetailList(enrichedList);
      } else {
        setDetailList([]); 
      }
    } catch (err) {
      console.error("Error fetching details", err);
      alert("Could not load stat details. Ensure you have the required permissions.");
    } finally {
      setDetailLoading(false);
    }
  }

  // ============================================================================
  // EFFECTS & FILTER LOGIC
  // ============================================================================

  // Run initial data fetch on component mount
  useEffect(() => {
    loadTodayStats();
    loadEmployees();
    loadCompleteLogs();
    
    // Auto-set the date filter to today's date for convenience in the logs view
    const today = new Date().toISOString().split('T')[0];
    setLogDateFilter(today);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter Logic for Employee Grid View
  useEffect(() => {
    let result = employees;

    if (selectedDept !== "All") {
      result = result.filter(e => e.department === selectedDept);
    }

    if (searchTerm) {
      result = result.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEmployees(result);
  }, [searchTerm, selectedDept, employees]);

  // Filter Logic for Complete Logs View
  const filteredLogs = allAttendanceLogs.filter(log => {
    let matchesSearch = true;
    let matchesDate = true;

    if (searchTerm) {
        matchesSearch = log.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    }

    if (logDateFilter) {
        const logDateStr = new Date(log.time).toISOString().split('T')[0];
        matchesDate = logDateStr === logDateFilter;
    }

    return matchesSearch && matchesDate;
  });

  // ============================================================================
  // UI FORMATTING HELPERS
  // ============================================================================

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timeStr) => {
    if (!timeStr) return "-";
    return new Date(timeStr).toLocaleDateString();
  };
  
  const getStatusDisplay = (rec) => {
      if (rec.absent) return <span className="attendance-indicator leave" style={{color:'red', background:'#fee2e2', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Absent</span>;
      if (rec.checkin && rec.checkout) {
          if (rec.checkin.status_indicator === "Late") return <span style={{color:'#d97706', background:'#fef3c7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Late Check-in</span>;
          if (rec.checkout.status_indicator === "Early") return <span style={{color:'#dc2626', background:'#fee2e2', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Early Checkout</span>;
          return <span style={{color:'#16a34a', background:'#dcfce7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Full Day</span>;
      }
      if (rec.checkin) {
           if (rec.checkin.day_type === "half-day") return <span style={{color:'#16a34a', background:'#dcfce7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Half Day (In)</span>;
           if (rec.checkin.status_indicator === "Late") return <span style={{color:'#d97706', background:'#fef3c7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Late Check-in</span>;
           return <span style={{color:'#16a34a', background:'#dcfce7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Checked In</span>;
      }
      return "-";
  };

  // StatItem is defined above the component for performance

  // ============================================================================
  // COMPONENT RENDER
  // ============================================================================

  return (
    <div>
      <style>{`
        .clickable-stat {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          background: #fff;
          border: 1px solid #eee;
          padding: 15px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .clickable-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-color: #e5e5e5;
        }
        .stat-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 20px;
        }
        .text-green { background: #dcfce7; color: #16a34a; }
        .text-red { background: #fee2e2; color: #dc2626; }
        .text-dark-red { background: #fce8e8; color: #991b1b; }
        .text-orange { background: #fef3c7; color: #d97706; }
        .stat-info { display: flex; flex-direction: column; }
        .stat-count { font-size: 24px; font-weight: bold; color: #333; line-height: 1; }
        .stat-label { font-size: 13px; color: #666; margin-top: 4px; }
        .stats-grid-container {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        /* Modals for Clickable Stats Details */
        .detail-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.6); z-index: 5000;
          display: flex; justify-content: center; align-items: center;
          animation: fadeIn 0.2s;
        }
        .detail-modal-card {
          background: white; width: 450px; max-width: 90%;
          border-radius: 12px; padding: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          display: flex; flex-direction: column; max-height: 80vh;
        }
        .detail-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 15px; border-bottom: 2px solid #fee2e2; padding-bottom: 15px;
        }
        .detail-list {
          overflow-y: auto; flex: 1; padding-right: 5px;
        }
        .detail-item {
          padding: 12px 10px; border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; gap: 15px;
          transition: background 0.2s;
        }
        .detail-item:hover { background: #f8fafc; border-radius: 6px; }
        .detail-avatar {
          width: 36px; height: 36px; background: var(--red); color: white; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: bold;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Page Header */}
      <div className="dashboard-header-card card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
              <h2 style={{ color: "var(--red)", margin: 0 }}>Attendance Logs</h2>
              <p className="small">Monitor complete employee check-ins and check-outs</p>
          </div>
          
          {/* View Mode Toggle Switch */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
              <button 
                  onClick={() => setViewMode("grid")}
                  style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', 
                      borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                      background: viewMode === "grid" ? '#fff' : 'transparent',
                      color: viewMode === "grid" ? 'var(--red)' : '#64748b',
                      boxShadow: viewMode === "grid" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s ease'
                  }}
              >
                  <FaThLarge /> Employee Grid
              </button>
              <button 
                  onClick={() => setViewMode("logs")}
                  style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', 
                      borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                      background: viewMode === "logs" ? '#fff' : 'transparent',
                      color: viewMode === "logs" ? 'var(--red)' : '#64748b',
                      boxShadow: viewMode === "logs" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s ease'
                  }}
              >
                  <FaList /> Complete Logs
              </button>
          </div>
      </div>

      {/* ========================================================= */}
      {/* TODAY'S STATS WIDGETS (NOW FULLY CLICKABLE)               */}
      {/* ========================================================= */}
      <div className="stats-grid-container">
          <StatItem statsLoading={statsLoading} icon={<FaCheckCircle />} label="Present Today"    count={stats.present}        colorClass="text-green"    onClick={() => handleStatClick('present',        'Present Today')} />
          <StatItem statsLoading={statsLoading} icon={<FaTimesCircle />} label="Absent Today"     count={stats.absent}         colorClass="text-red"      onClick={() => handleStatClick('absent',         'Absent Today')} />
          <StatItem statsLoading={statsLoading} icon={<FaUserClock />}   label="On Leave Today"   count={stats.leave}          colorClass="text-dark-red" onClick={() => handleStatClick('leave',          'On Leave Today')} />
          <StatItem statsLoading={statsLoading} icon={<FaUserSlash />}   label="Not Checked In"   count={stats.not_checked_in} colorClass="text-orange"   onClick={() => handleStatClick('not_checked_in', 'Not Checked In')} />
      </div>

      {/* Global Filter Bar */}
      <div className="filter-bar" style={{ marginTop: '15px' }}>
        {/* Search Input */}
        <div style={{flex: 1, position: 'relative'}}>
           <FaSearch style={{position: 'absolute', left: 12, top: 13, color: '#999'}} />
           <input 
              className="input" 
              placeholder={viewMode === "grid" ? "Search Employee..." : "Search Logs by Name..."} 
              style={{marginBottom:0, paddingLeft: 38}}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
           />
        </div>

        {/* Dynamic Second Filter based on View Mode */}
        {viewMode === "grid" ? (
            <div style={{flex: 1, position: 'relative'}}>
               <FaFilter style={{position: 'absolute', left: 12, top: 13, color: '#999'}} />
               <select 
                  className="input" 
                  style={{marginBottom:0, paddingLeft: 38}}
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
               >
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
            </div>
        ) : (
            <div style={{flex: 1, position: 'relative'}}>
               <FaCalendarAlt style={{position: 'absolute', left: 12, top: 13, color: '#999'}} />
               <input 
                  type="date"
                  className="input" 
                  style={{marginBottom:0, paddingLeft: 38}}
                  value={logDateFilter}
                  onChange={e => setLogDateFilter(e.target.value)}
               />
            </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* VIEW MODE: EMPLOYEE GRID                                  */}
      {/* ========================================================= */}
      {viewMode === "grid" && (
          <>
              {loading ? (
                <div style={{ marginTop: 20 }}><SkeletonCards count={8} minWidth={200} /></div>
              ) : filteredEmployees.length === 0 ? (
                <div className="card" style={{textAlign:'center', color:'#888', marginTop: 20, padding: 40}}>
                    No employees found matching your filter criteria.
                </div>
              ) : (
                <div className="emp-grid" style={{ marginTop: 20 }}>
                  {filteredEmployees.map(emp => (
                    <div key={emp._id} className="emp-card" onClick={() => openEmployeeDetails(emp)} style={{ cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid #eaeaea' }}>
                       <div className="emp-avatar" style={{ background: 'var(--red)', color: 'white' }}>
                          {emp.name.charAt(0).toUpperCase()}
                       </div>
                       <h4 style={{ marginBottom: 5 }}>{emp.name}</h4>
                       <div className="emp-role" style={{ color: '#555', fontSize: 13 }}>{emp.position || "Employee"}</div>
                       <div className="emp-dept" style={{ color: '#888', fontSize: 12 }}>{emp.department || "General"}</div>
                    </div>
                  ))}
                </div>
              )}
          </>
      )}

      {/* ========================================================= */}
      {/* VIEW MODE: COMPLETE MASTER LOGS                           */}
      {/* ========================================================= */}
      {viewMode === "logs" && (
          <div className="card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
              {loadingLogs ? (
                 <SkeletonTable rows={6} cols={5} />
              ) : filteredLogs.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                     No attendance logs found matching the selected criteria. Try adjusting the date filter.
                 </div>
              ) : (
                 <div style={{ overflowX: 'auto' }}>
                     <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                         <thead>
                             <tr style={{ background: '#f8f9fa', color: 'var(--red)' }}>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Employee</th>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Date</th>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Time</th>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Action Type</th>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Location/Photo</th>
                             </tr>
                         </thead>
                         <tbody>
                             {filteredLogs.map((log) => (
                                 <tr key={log._id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                                     <td style={{ padding: '12px 15px', fontWeight: 600 }}>{log.employee_name || "Unknown"}</td>
                                     <td style={{ padding: '12px 15px' }}>{formatDate(log.time)}</td>
                                     <td style={{ padding: '12px 15px', color: '#555' }}>{formatTime(log.time)}</td>
                                     <td style={{ padding: '12px 15px' }}>
                                         <span style={{
                                             padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                             background: log.type === 'checkin' ? '#dcfce7' : '#fee2e2',
                                             color: log.type === 'checkin' ? '#16a34a' : '#dc2626'
                                         }}>
                                             {log.type === 'checkin' ? 'Check In' : 'Check Out'}
                                         </span>
                                     </td>
                                     <td style={{ padding: '12px 15px' }}>
                                         {log.photo_url ? (
                                             <a 
                                                href={log.photo_url.startsWith('http') ? log.photo_url : `https://gdmrconnect-backend-production.up.railway.app${log.photo_url}`} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}
                                             >
                                                 View Photo
                                             </a>
                                         ) : (
                                             <span style={{ color: '#aaa', fontSize: 13 }}>Manual / No Photo</span>
                                         )}
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
              )}
          </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CLICKABLE STATS DETAILS (NEW UI)                   */}
      {/* ========================================================= */}
      {detailModalOpen && (
        <div className="detail-modal-overlay" onClick={() => setDetailModalOpen(false)}>
          <div className="detail-modal-card" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3 style={{ margin: 0, color: 'var(--red)' }}>{detailTitle}</h3>
              <button className="btn ghost" onClick={() => setDetailModalOpen(false)} style={{padding:'6px', background: '#f1f5f9', borderRadius: '50%'}}>
                <FaTimes size={14} color="#64748b"/>
              </button>
            </div>
            
            <div className="detail-list">
              {detailLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                   <div className="loader" style={{margin: '0 auto'}}></div>
                   <p style={{color: '#64748b', marginTop: 15}}>Loading details...</p>
                </div>
              ) : detailList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                   <FaUserSlash size={30} style={{opacity: 0.2, marginBottom: 10}}/>
                   <p style={{margin: 0}}>No employees found in this category for today.</p>
                </div>
              ) : (
                detailList.map((emp, idx) => (
                  <div key={emp._id || idx} className="detail-item">
                    <div className="detail-avatar">
                      {emp.name ? emp.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>{emp.name || "Unknown Employee"}</div>
                      <div className="small" style={{color: '#64748b'}}>{emp.email || emp.position || emp.department || "General"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: INDIVIDUAL ATTENDANCE DETAILS                      */}
      {/* ========================================================= */}
      {showModal && selectedEmp && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 4000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '850px', maxHeight: '90vh', overflow: 'hidden', display:'flex', flexDirection:'column', padding:0, borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
             
             <div style={{ padding: '20px', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', background: '#fafafa' }}>
                <div>
                  <h3 style={{color: "var(--red)", margin:0, fontSize: 20}}>{selectedEmp.name}</h3>
                  <span className="small" style={{ color: '#666' }}>{selectedEmp.department} | {selectedEmp.position}</span>
                </div>
                <button className="btn ghost" onClick={() => setShowModal(false)} style={{ border:'none', background: '#fff', padding: 8, borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <FaTimes size={18} color="#555" />
                </button>
             </div>

             <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
                {loadingDetails ? (
                   <div style={{ display: "flex", justifyContent: "center", padding: 50 }}><div className="loader"></div></div>
                ) : attendance.length === 0 ? (
                   <div style={{ textAlign:'center', color:'#999', padding: 40, border: '1px dashed #ccc', borderRadius: 8 }}>
                       No historical attendance records found for this employee.
                   </div>
                ) : (
                  <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: '#555', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: 12 }}>Date</th>
                        <th style={{ padding: 12 }}>In Time</th>
                        <th style={{ padding: 12 }}>Out Time</th>
                        <th style={{ padding: 12 }}>Status</th>
                        <th style={{ padding: 12 }}>Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((rec) => (
                        <tr key={rec.date} style={{ borderBottom: '1px solid #f2f2f2' }}>
                          <td style={{ padding: 12, fontWeight: 500 }}>{rec.date}</td>
                          <td style={{ padding: 12, color: rec.checkin?.status_indicator === 'Late' ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                              {formatTime(rec.checkin?.time)}
                          </td>
                          <td style={{ padding: 12, color: rec.checkout?.status_indicator === 'Early' ? '#dc2626' : '#333', fontWeight: 600 }}>
                              {formatTime(rec.checkout?.time)}
                          </td>
                          <td style={{ padding: 12 }}>{getStatusDisplay(rec)}</td>
                          <td style={{ padding: 12 }}>
                            <div style={{display:'flex', gap:10}}>
                                {rec.checkin?.photo_url && (
                                  <a href={rec.checkin.photo_url.startsWith('http') ? rec.checkin.photo_url : `https://gdmrconnect-backend-production.up.railway.app${rec.checkin.photo_url}`} target="_blank" rel="noreferrer" style={{fontSize:12, color:'#3b82f6', textDecoration:'none', fontWeight: 'bold', background: '#eff6ff', padding: '4px 8px', borderRadius: 4}}>Check-In Photo</a>
                                )}
                                {rec.checkout?.photo_url && (
                                  <a href={rec.checkout.photo_url.startsWith('http') ? rec.checkout.photo_url : `https://gdmrconnect-backend-production.up.railway.app${rec.checkout.photo_url}`} target="_blank" rel="noreferrer" style={{fontSize:12, color:'#dc2626', textDecoration:'none', fontWeight: 'bold', background: '#fef2f2', padding: '4px 8px', borderRadius: 4}}>Check-Out Photo</a>
                                )}
                                {!rec.checkin?.photo_url && !rec.checkout?.photo_url && <span style={{color: '#aaa', fontSize: 12}}>N/A</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}