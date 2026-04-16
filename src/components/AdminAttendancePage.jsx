import React, { useEffect, useState } from "react";
import { FaSearch, FaFilter, FaTimes, FaList, FaThLarge, FaCalendarAlt } from "react-icons/fa";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to group records by date for individual employee view
function groupAttendance(records) {
  const groups = {};
  
  records.forEach(rec => {
    const date = rec.date;
    if (!groups[date]) {
      groups[date] = {
        checkin: null,
        checkout: null,
        absent: null,
      };
    }
    groups[date][rec.type] = rec;
  });
  
  return Object.entries(groups)
    .map(([date, records]) => ({
      date,
      checkin: records.checkin,
      checkout: records.checkout,
      absent: records.absent,
      sortTime: new Date(records.checkout?.time || records.checkin?.time || records.absent?.time).getTime()
    }))
    .sort((a, b) => b.sortTime - a.sortTime);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminAttendancePage({ token, api }) {
  // --- Employee Data States ---
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  // --- Master Logs States (NEW FEATURE FOR COMPLETE VISIBILITY) ---
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "logs"
  const [allAttendanceLogs, setAllAttendanceLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [logDateFilter, setLogDateFilter] = useState(""); // Filter for master logs

  // --- Modal States for Individual Details ---
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // 1. Load Employee List for Grid View
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

  // 2. Load Master Attendance Logs for Complete View Mode
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

  // 3. Load attendance for one specific employee (triggered on card click)
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
    } finally {
      setLoadingDetails(false);
    }
  }

  // ============================================================================
  // EFFECTS & FILTER LOGIC
  // ============================================================================

  // Run initial data fetch
  useEffect(() => {
    loadEmployees();
    loadCompleteLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter Logic for Grid View
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

    // Search by employee name in logs
    if (searchTerm) {
        matchesSearch = log.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    }

    // Filter by specific date
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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div>
      {/* Page Header */}
      <div className="dashboard-header-card card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                      boxShadow: viewMode === "grid" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
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
                      boxShadow: viewMode === "logs" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
              >
                  <FaList /> Complete Logs
              </button>
          </div>
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
                <div className="loader-container">
                    <div className="loader"></div>
                </div>
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
                 <div className="loader-container" style={{ padding: 40 }}><div className="loader"></div></div>
              ) : filteredLogs.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                     No attendance logs found matching the selected criteria.
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
                   <div className="loader-container" style={{ padding: 50 }}><div className="loader"></div></div>
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