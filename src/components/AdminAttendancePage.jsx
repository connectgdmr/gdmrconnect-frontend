import React, { useEffect, useState } from "react";
import { FaSearch, FaFilter, FaTimes } from "react-icons/fa";

// Helper function to group records by date
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

export default function AdminAttendancePage({ token, api }) {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  // Modal for Details
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Load employees
  async function loadEmployees() {
    setLoading(true);
    try {
      const list = await api.listEmployees(token); 
      setEmployees(list);
      setFilteredEmployees(list);
      
      // Extract unique departments for filter
      const depts = ["All", ...new Set(list.map(e => e.department).filter(Boolean))];
      setDepartments(depts);
    } catch (err) {
      console.error("Error loading employees", err);
    } finally {
      setLoading(false);
    }
  }

  // Load attendance for one employee (triggered on card click)
  async function openEmployeeDetails(emp) {
    setSelectedEmp(emp);
    setShowModal(true);
    setLoadingDetails(true);
    setAttendance([]); // clear previous
    try {
      const records = await api.employeeAttendance(emp._id, token);
      setAttendance(groupAttendance(records));
    } catch (err) {
      console.error("Error loading attendance", err);
    } finally {
      setLoadingDetails(false);
    }
  }

  // Filter Logic (Change #2)
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

  useEffect(() => {
    loadEmployees();
  }, []);
  
  // Helper to display time
  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Helper for status badge
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
  }

  return (
    <div>
      <div className="dashboard-header-card card">
          <h2 style={{ color: "var(--red)", margin: 0 }}>Attendance Logs</h2>
          <p className="small">Monitor employee check-ins and check-outs</p>
      </div>

      {/* Filter Bar (Change #2) */}
      <div className="filter-bar">
        <div style={{flex: 1, position: 'relative'}}>
           <FaSearch style={{position: 'absolute', left: 12, top: 13, color: '#999'}} />
           <input 
              className="input" 
              placeholder="Search Employee..." 
              style={{marginBottom:0, paddingLeft: 38}}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
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
      </div>

      {/* Grid Layout (Change #1) & Loader (Change #4) */}
      {loading ? (
        <div className="loader-container">
            <div className="loader"></div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="card" style={{textAlign:'center', color:'#888', marginTop: 20}}>No employees found matching criteria.</div>
      ) : (
        <div className="emp-grid">
          {filteredEmployees.map(emp => (
            <div key={emp._id} className="emp-card" onClick={() => openEmployeeDetails(emp)}>
               <div className="emp-avatar">
                  {emp.name.charAt(0).toUpperCase()}
               </div>
               <h4>{emp.name}</h4>
               <div className="emp-role">{emp.position || "Employee"}</div>
               <div className="emp-dept">{emp.department || "General"}</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Attendance Details */}
      {showModal && selectedEmp && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="card" style={{width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'hidden', display:'flex', flexDirection:'column', padding:0}} onClick={e => e.stopPropagation()}>
             
             <div style={{padding: '20px', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <h3 style={{color: "var(--red)", margin:0}}>{selectedEmp.name}</h3>
                  <span className="small">{selectedEmp.department} - {selectedEmp.position}</span>
                </div>
                <button className="btn ghost" onClick={() => setShowModal(false)} style={{border:'none'}}><FaTimes size={20}/></button>
             </div>

             <div style={{overflowY: 'auto', padding: '20px', flex: 1}}>
                {loadingDetails ? (
                   <div className="loader-container"><div className="loader"></div></div>
                ) : attendance.length === 0 ? (
                   <p style={{textAlign:'center', color:'#999'}}>No attendance records found.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>In Time</th>
                        <th>Out Time</th>
                        <th>Status</th>
                        <th>Photos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((rec) => (
                        <tr key={rec.date}>
                          <td>{rec.date}</td>
                          <td style={{ color: rec.checkin?.status_indicator === 'Late' ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                              {formatTime(rec.checkin?.time)}
                          </td>
                          <td style={{ color: rec.checkout?.status_indicator === 'Early' ? '#dc2626' : '#333', fontWeight: 600 }}>
                              {formatTime(rec.checkout?.time)}
                          </td>
                          <td>{getStatusDisplay(rec)}</td>
                          <td>
                            <div style={{display:'flex', gap:8}}>
                                {rec.checkin?.photo_url && (
                                  <a href={rec.checkin.photo_url.startsWith('http') ? rec.checkin.photo_url : `https://erp-backend-production-d377.up.railway.app${rec.checkin.photo_url}`} target="_blank" rel="noreferrer" style={{fontSize:12, color:'blue', textDecoration:'underline'}}>In</a>
                                )}
                                {rec.checkout?.photo_url && (
                                  <a href={rec.checkout.photo_url.startsWith('http') ? rec.checkout.photo_url : `https://erp-backend-production-d377.up.railway.app${rec.checkout.photo_url}`} target="_blank" rel="noreferrer" style={{fontSize:12, color:'blue', textDecoration:'underline'}}>Out</a>
                                )}
                                {!rec.checkin?.photo_url && !rec.checkout?.photo_url && "-"}
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