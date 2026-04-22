import React, { useEffect, useState } from "react";
import { 
  FaSearch, 
  FaFilter, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaFileDownload,
  FaCalendarAlt,
  FaClock
} from "react-icons/fa";

// ============================================================================
// MAIN COMPONENT EXPORT: ADMIN LEAVE PAGE
// ============================================================================

export default function AdminLeavePage({ token, api }) {
  const role = localStorage.getItem("role") || "employee"; 
  
  // ============================================================================
  // 1. STATE MANAGEMENT
  // ============================================================================
  
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // ============================================================================
  // 2. DATA FETCHING LOGIC
  // ============================================================================

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await api.adminLeaves(token);
      
      // Sort chronologically (newest applied first) safely
      list.sort((a, b) => {
          const dateA = new Date(a.applied_at || a.created_at);
          const dateB = new Date(b.applied_at || b.created_at);
          return dateB - dateA;
      });
      
      setLeaves(list);
    } catch (err) {
      console.error("Failed to load leaves:", err);
      setError(err.message || "Failed to load leave requests. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // 3. ACTION HANDLERS
  // ============================================================================

  async function updateStatus(id, status) {
    if (!window.confirm(`Are you sure you want to mark this leave request as ${status}?`)) {
        return;
    }
    
    setLoading(true); 
    try {
      await api.updateLeave(id, { status }, token);
      await load();
      alert(`Leave request successfully marked as ${status}.`);
    } catch (err) {
      console.error("Status Update Error:", err);
      alert("Error updating leave request: " + (err.message || "Unknown error occurred."));
      setLoading(false);
    }
  }

  // ============================================================================
  // 4. UI HELPERS & FILTERING LOGIC
  // ============================================================================

  const getStatusClass = (status) => {
      if (!status) return "pending";
      const s = status.toLowerCase();
      if (s.includes('approved')) return "approved";
      if (s.includes('rejected')) return "rejected";
      return "pending";
  };

  // Separating Date and Time to allow vertical stacking and save horizontal space
  const formatDateTime = (dateString) => {
      if (!dateString) return { date: "N/A", time: "" };
      const d = new Date(dateString);
      return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
  };

  const filteredLeaves = leaves.filter(l => {
      const matchesSearch = l.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            l.reason?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const currentOverallStatus = l.status || 'Pending';
      const matchesStatus = statusFilter === "All" || 
                            (statusFilter === "Pending" && currentOverallStatus.includes("Pending")) ||
                            (statusFilter === "Approved" && currentOverallStatus.includes("Approved")) ||
                            (statusFilter === "Rejected" && currentOverallStatus.includes("Rejected"));
                            
      return matchesSearch && matchesStatus;
  });

  // ============================================================================
  // 5. RENDER TEMPLATE
  // ============================================================================

  return (
    <div className="card" style={{ padding: 0, border: "none", boxShadow: "none", background: "transparent" }}>
      
      <style>{`
        /* Header & Filters */
        .leave-header-bar {
          padding: 20px 20px 15px; 
          border-bottom: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .filter-container {
          background: #fff;
          padding: 15px 20px;
          display: flex;
          gap: 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        .search-wrapper { flex: 2; position: relative; }
        .filter-wrapper { flex: 1; position: relative; }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 10px;
          color: #94a3b8;
        }
        .styled-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .styled-input:focus { border-color: var(--red); }
        
        /* Status Badges - Reduced padding to save width */
        .status-badge { 
          padding: 4px 8px; 
          border-radius: 20px; 
          font-size: 11px; 
          font-weight: 700; 
          display: inline-block; 
          text-transform: capitalize; 
          min-width: 70px; 
          text-align: center; 
        }
        .status-badge.approved { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
        .status-badge.rejected { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .status-badge.pending { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
        
        /* Action Buttons - Stacked Vertically */
        .action-btn-group {
          display: flex;
          flex-direction: column; /* Stacks buttons top to bottom */
          gap: 6px;
          min-width: 90px; /* Much smaller footprint than row layout */
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 10px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          color: white;
          width: 100%;
        }
        .action-btn:active { transform: scale(0.95); }
        .action-btn:hover { opacity: 0.9; }
        .btn-approve { background: #10b981; }
        .btn-reject { background: #ef4444; }
        
        /* Table Layout - Tighter paddings and dynamic width */
        .styled-table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 13px; /* Slightly smaller base font */
          background: #fff; 
          table-layout: auto;
        }
        .styled-table thead th { 
          background-color: #f8fafc; 
          color: #334155; 
          text-align: left; 
          padding: 12px 10px; /* Reduced horizontal padding */
          font-weight: 600; 
          border-bottom: 2px solid #e2e8f0; 
          /* Removed white-space: nowrap to allow natural wrapping */
        }
        .styled-table tbody td { 
          padding: 12px 10px; /* Reduced horizontal padding */
          border-bottom: 1px solid #f1f5f9; 
          color: #475569; 
          vertical-align: top; /* Align to top looks cleaner with stacked buttons */
        }
        .styled-table tbody tr:hover { background-color: #f8fafc; }

        .muted-text {
          color: #64748b;
          font-size: 12px;
        }
      `}</style>

      {/* ---------------- HEADER ---------------- */}
      <div className="leave-header-bar">
        <div>
            <h3 style={{ color: "var(--red)", margin: 0, fontSize: "20px" }}>Leave Approvals</h3>
            <p className="small" style={{ color: '#64748b', margin: '4px 0 0 0' }}>Review and manage employee leave requests.</p>
        </div>
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="filter-container">
          <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input 
                  type="text" 
                  className="styled-input" 
                  placeholder="Search by employee name or reason..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="filter-wrapper">
              <FaFilter className="search-icon" />
              <select 
                  className="styled-input" 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
              >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
              </select>
          </div>
      </div>

      {error && (
        <div className="alert" style={{ margin: "20px", background: '#fee2e2', color: '#b91c1c', padding: 15, borderRadius: 6 }}>
          <strong>Attention: </strong> {error}
        </div>
      )}
      
      {/* ---------------- DATA TABLE ---------------- */}
      {loading ? (
          <div className="loader-container" style={{ padding: '60px 0', background: '#fff' }}>
              <div className="loader"></div>
              <p style={{textAlign: 'center', color: '#64748b', marginTop: 15}}>Fetching leave requests securely...</p>
          </div>
      ) : (
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '0 0 12px 12px' }}>
             {filteredLeaves.length === 0 && !error ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <FaCalendarAlt size={40} style={{ opacity: 0.2, marginBottom: 15 }} />
                  <p style={{ fontSize: 15, margin: 0, fontWeight: 500 }}>No leave requests found matching your criteria.</p>
                </div>
             ) : (
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th><FaClock style={{marginRight: 4, opacity: 0.7, marginBottom: -2}}/> Applied On</th>
                      <th>Leave Period</th>
                      <th>Reason & Attachments</th>
                      <th>Manager</th>
                      <th>HR</th>
                      <th>Final Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map((l) => {
                      const { date, time } = formatDateTime(l.applied_at || l.created_at);
                      
                      return (
                      <tr key={l._id}>
                        {/* Employee Name & Type */}
                        <td>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{l.employee_name}</div>
                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4, textTransform: "uppercase", fontWeight: 600 }}>
                              {l.type === 'half' ? `Half Day (${l.period || 'Any'})` : 'Full Day'}
                          </div>
                        </td>

                        {/* Applied Date & Time (Stacked) */}
                        <td style={{ fontWeight: 500, color: '#334155' }}>
                            <div>{date}</div>
                            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{time}</div>
                        </td>
                        
                        {/* Leave Target Date(s) */}
                        <td style={{ fontWeight: 500 }}>
                            {l.from_date && l.to_date && l.from_date !== l.to_date 
                               ? (<>
                                     <div>{new Date(l.from_date).toLocaleDateString('en-GB')}</div>
                                     <div style={{color: '#94a3b8', fontSize: 11}}>to</div>
                                     <div>{new Date(l.to_date).toLocaleDateString('en-GB')}</div>
                                  </>)
                               : <div>{l.date ? new Date(l.date).toLocaleDateString('en-GB') : '-'}</div>
                            }
                        </td>
                        
                        {/* Context (Reason and File) */}
                        <td style={{ maxWidth: "200px" }}>
                          <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.4, wordWrap: 'break-word', marginBottom: l.attachment_url ? 8 : 0 }}>
                              {l.reason || <span style={{fontStyle: 'italic', color: '#cbd5e1'}}>No reason</span>}
                          </div>
                          {l.attachment_url && (
                            <div>
                              <a 
                                href={l.attachment_url.startsWith('http') ? l.attachment_url : `https://gdmrconnect-backend-production.up.railway.app${l.attachment_url}`}
                                target="_blank" 
                                rel="noreferrer"
                                style={{ 
                                    display: 'inline-flex', alignItems: 'center', gap: 4, color: "var(--red)", 
                                    fontSize: "11px", textDecoration: "none", fontWeight: 600,
                                    background: '#fef2f2', padding: '4px 6px', borderRadius: 4
                                }}
                              >
                                <FaFileDownload /> View Doc
                              </a>
                            </div>
                          )}
                        </td>
                        
                        {/* Statuses */}
                        <td><span className={`status-badge ${getStatusClass(l.manager_status)}`}>{l.manager_status || 'Pending'}</span></td>
                        <td><span className={`status-badge ${getStatusClass(l.admin_status)}`}>{l.admin_status || 'Pending'}</span></td>
                        <td><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span></td>

                        {/* Administrative Actions (Stacked Vertically) */}
                        <td>
                            <div className="action-btn-group">
                                <button 
                                    className="action-btn btn-approve" 
                                    onClick={() => updateStatus(l._id, "Approved")}
                                >
                                    <FaCheckCircle /> Approve
                                </button>
                                <button 
                                    className="action-btn btn-reject" 
                                    onClick={() => updateStatus(l._id, "Rejected")}
                                >
                                    <FaTimesCircle /> Reject
                                </button>
                            </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
             )}
          </div>
      )}
    </div>
  );
}