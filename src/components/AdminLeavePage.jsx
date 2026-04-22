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
// This component displays a table of all leave requests.
// It allows Administrators (or Delegated Employees) to search, filter, 
// and change the status (Approve/Reject) of leave applications.
// ============================================================================

export default function AdminLeavePage({ token, api }) {
  // Note: We no longer heavily restrict the UI based solely on localStorage 'role'. 
  // If an Employee is rendering this component, it means they have been granted 
  // Delegated Access, and therefore should see the approval tools.
  const role = localStorage.getItem("role") || "employee"; 
  
  // ============================================================================
  // 1. STATE MANAGEMENT
  // ============================================================================
  
  // Core Data States
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // ============================================================================
  // 2. DATA FETCHING LOGIC
  // ============================================================================

  /**
   * load()
   * Fetches all leave requests across the organization or department.
   * Handles sorting by chronological order (newest first).
   */
  async function load() {
    setLoading(true);
    setError("");
    try {
      // The backend will check the token. If it's a standard admin, they see all.
      // If it's a delegated token, the backend allows the request to pass.
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

  // Execute load function on component mount
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // 3. ACTION HANDLERS
  // ============================================================================

  /**
   * updateStatus()
   * Updates the status of a specific leave request (Approve/Reject).
   * Prompts the user for confirmation before executing the API call.
   * * @param {string} id - The unique ID of the leave request.
   * @param {string} status - The new status to apply ("Approved" or "Rejected").
   */
  async function updateStatus(id, status) {
    // Confirm the action with the user
    if (!window.confirm(`Are you sure you want to mark this leave request as ${status}?`)) {
        return;
    }
    
    setLoading(true); // Show a loading state while processing
    try {
      // Call the API to update the status
      await api.updateLeave(id, { status }, token);
      
      // Reload the data from the server to ensure synchronization
      await load();
      
      // Provide success feedback
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

  /**
   * getStatusClass()
   * Returns a dynamic CSS class name based on the string status value.
   */
  const getStatusClass = (status) => {
      if (!status) return "pending";
      const s = status.toLowerCase();
      if (s.includes('approved')) return "approved";
      if (s.includes('rejected')) return "rejected";
      return "pending";
  };

  /**
   * formatDateTime()
   * Helper function to neatly format the "Applied Date & Time".
   */
  const formatDateTime = (dateString) => {
      if (!dateString) return "N/A";
      const d = new Date(dateString);
      return d.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
      });
  };

  /**
   * filteredLeaves
   * Derived state that filters the raw leaves array based on the current
   * searchTerm and statusFilter dropdown selections.
   */
  const filteredLeaves = leaves.filter(l => {
      // Match by Employee Name or Leave Reason
      const matchesSearch = l.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            l.reason?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Match by Status
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
      
      {/* ---------------- COMPONENT STYLING ---------------- */}
      <style>{`
        /* Header Layout */
        .leave-header-bar {
          padding: 20px 20px 15px; 
          border-bottom: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* Filter Controls */
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
        
        /* Status Badges */
        .status-badge { 
          padding: 5px 12px; 
          border-radius: 20px; 
          font-size: 11px; 
          font-weight: 700; 
          display: inline-block; 
          text-transform: capitalize; 
          min-width: 80px; 
          text-align: center; 
        }
        .status-badge.approved { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
        .status-badge.rejected { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .status-badge.pending { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
        
        /* Action Buttons & Alignment Groups */
        .action-btn-group {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: flex-start;
          flex-wrap: nowrap;
          min-width: 190px; /* Prevents awkward wrapping */
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 8px 14px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
          color: white;
          width: 100%;
        }
        .action-btn:active { transform: scale(0.95); }
        .action-btn:hover { opacity: 0.9; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .btn-approve { background: #10b981; }
        .btn-reject { background: #ef4444; }
        
        /* Table Layout */
        .styled-table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 14px; 
          background: #fff; 
        }
        .styled-table thead th { 
          background-color: #f8fafc; 
          color: #334155; 
          text-align: left; 
          padding: 14px 20px; 
          font-weight: 600; 
          border-bottom: 2px solid #e2e8f0; 
          white-space: nowrap;
        }
        .styled-table tbody td { 
          padding: 16px 20px; 
          border-bottom: 1px solid #f1f5f9; 
          color: #475569; 
          vertical-align: middle; 
        }
        .styled-table tbody tr:hover { background-color: #f8fafc; }

        /* Typography Utilities */
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

      {/* ---------------- FILTERS & SEARCH ---------------- */}
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

      {/* ---------------- NOTIFICATIONS & ERRORS ---------------- */}
      {error && (
        <div className="alert" style={{ margin: "20px", background: '#fee2e2', color: '#b91c1c', padding: 15, borderRadius: 6 }}>
          <strong>Attention: </strong> {error}
        </div>
      )}
      
      {/* ---------------- DATA RENDERING AREA ---------------- */}
      {loading ? (
          /* Loading Indicator */
          <div className="loader-container" style={{ padding: '60px 0', background: '#fff' }}>
              <div className="loader"></div>
              <p style={{textAlign: 'center', color: '#64748b', marginTop: 15}}>Fetching leave requests securely...</p>
          </div>
      ) : (
          /* Table Wrapper */
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '0 0 12px 12px' }}>
             
             {/* Empty State Handler */}
             {filteredLeaves.length === 0 && !error ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <FaCalendarAlt size={40} style={{ opacity: 0.2, marginBottom: 15 }} />
                  <p style={{ fontSize: 16, margin: 0, fontWeight: 500 }}>No leave requests found matching your criteria.</p>
                  <p className="muted-text" style={{ marginTop: 5 }}>Try adjusting your search terms or status filters.</p>
                </div>
             ) : (
                /* Data Table */
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Employee Details</th>
                      {/* NEW COLUMN FOR DATE & TIME APPLIED */}
                      <th><FaClock style={{marginRight: 4, opacity: 0.7, marginBottom: -2}}/> Applied Date & Time</th>
                      <th>Leave Period</th>
                      <th>Reason & Attachments</th>
                      <th>Manager Auth</th>
                      <th>HR Auth</th>
                      <th>Overall Status</th>
                      <th>Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map((l) => {
                      return (
                      <tr key={l._id}>
                        {/* Column 1: Employee Name & Leave Type Details */}
                        <td>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{l.employee_name}</div>
                          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                              {l.type === 'half' ? `Half Day (${l.period || 'Any'})` : 'Full Day'}
                          </div>
                        </td>

                        {/* NEW Column 2: Exact Applied Date & Time */}
                        <td style={{ fontSize: "13px", fontWeight: 500, color: '#334155' }}>
                            <div style={{background: '#f8fafc', padding: '6px 10px', borderRadius: 6, display: 'inline-block', border: '1px solid #f1f5f9'}}>
                                {formatDateTime(l.applied_at || l.created_at)}
                            </div>
                        </td>
                        
                        {/* Column 3: Leave Target Date(s) */}
                        <td style={{ fontSize: "14px", fontWeight: 500 }}>
                            {l.from_date && l.to_date && l.from_date !== l.to_date 
                               ? (<>
                                     <div>{new Date(l.from_date).toLocaleDateString('en-GB')}</div>
                                     <div style={{color: '#94a3b8', fontSize: 12}}>to</div>
                                     <div>{new Date(l.to_date).toLocaleDateString('en-GB')}</div>
                                  </>)
                               : <div>{l.date ? new Date(l.date).toLocaleDateString('en-GB') : '-'}</div>
                            }
                        </td>
                        
                        {/* Column 4: Context (Reason and Attached File) */}
                        <td style={{ maxWidth: "250px" }}>
                          <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.4, marginBottom: l.attachment_url ? 8 : 0 }}>
                              {l.reason || <span style={{fontStyle: 'italic', color: '#cbd5e1'}}>No reason provided</span>}
                          </div>
                          {l.attachment_url && (
                            <div>
                              <a 
                                href={l.attachment_url.startsWith('http') ? l.attachment_url : `https://gdmrconnect-backend-production.up.railway.app${l.attachment_url}`}
                                target="_blank" 
                                rel="noreferrer"
                                style={{ 
                                    display: 'inline-flex', alignItems: 'center', gap: 5, color: "var(--red)", 
                                    fontSize: "12px", textDecoration: "none", fontWeight: 600,
                                    background: '#fef2f2', padding: '4px 8px', borderRadius: 4
                                }}
                              >
                                <FaFileDownload /> View Document
                              </a>
                            </div>
                          )}
                        </td>
                        
                        {/* Column 5 & 6 & 7: Progressive Status Indicators */}
                        <td><span className={`status-badge ${getStatusClass(l.manager_status)}`}>{l.manager_status || 'Pending'}</span></td>
                        <td><span className={`status-badge ${getStatusClass(l.admin_status)}`}>{l.admin_status || 'Pending'}</span></td>
                        <td><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span></td>

                        {/* Column 8: Administrative Actions (Always Visible, Neatly Aligned) */}
                        <td>
                            <div className="action-btn-group">
                                <button 
                                    className="action-btn btn-approve" 
                                    onClick={() => updateStatus(l._id, "Approved")}
                                    title="Mark this request as Approved"
                                >
                                    <FaCheckCircle /> Approve
                                </button>
                                <button 
                                    className="action-btn btn-reject" 
                                    onClick={() => updateStatus(l._id, "Rejected")}
                                    title="Mark this request as Rejected"
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