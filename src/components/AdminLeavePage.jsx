import React, { useEffect, useState } from "react";
import { 
  FaSearch, 
  FaFilter, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaFileDownload,
  FaCalendarAlt
} from "react-icons/fa";

// ============================================================================
// MAIN COMPONENT EXPORT
// ============================================================================

export default function AdminLeavePage({ token, api }) {
  // Note: We no longer heavily restrict the UI based solely on localStorage 'role'. 
  // If an Employee is rendering this component, it means they have been granted 
  // Delegated Access, and therefore should see the approval tools.
  const role = localStorage.getItem("role") || "employee"; 
  
  // --- Core States ---
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Search & Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Loads all leave requests across the organization or department.
   */
  async function load() {
    setLoading(true);
    setError("");
    try {
      // The backend will check the token. If it's a standard admin, they see all.
      // If it's a delegated token, the backend allows the request to pass.
      const list = await api.adminLeaves(token);
      
      // Sort chronologically (newest applied first)
      list.sort((a, b) => new Date(b.applied_at || b.created_at) - new Date(a.applied_at || a.created_at));
      
      setLeaves(list);
    } catch (err) {
      console.error("Failed to load leaves:", err);
      setError(err.message || "Failed to load leave requests. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  /**
   * Updates the status of a specific leave request.
   */
  async function updateStatus(id, status) {
    if (!window.confirm(`Are you sure you want to mark this leave request as ${status}?`)) {
        return;
    }
    
    setLoading(true); // Optional UI feedback during update
    try {
      await api.updateLeave(id, { status }, token);
      
      // Reload the data to reflect changes
      await load();
      alert(`Leave request successfully marked as ${status}.`);
    } catch (err) {
      alert("Error updating leave request: " + (err.message || "Unknown error occurred."));
      setLoading(false);
    }
  }

  // ============================================================================
  // UI HELPERS & FILTERING
  // ============================================================================

  const getStatusClass = (status) => {
      if (!status) return "pending";
      const s = status.toLowerCase();
      if (s.includes('approved')) return "approved";
      if (s.includes('rejected')) return "rejected";
      return "pending";
  };

  // Filter leaves based on search input and dropdown
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
  // RENDER
  // ============================================================================

  return (
    <div className="card" style={{ padding: 0, border: "none", boxShadow: "none", background: "transparent" }}>
      
      {/* ---------------- STYLING ---------------- */}
      <style>{`
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
        .search-wrapper {
          flex: 2;
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 10px;
          color: #94a3b8;
        }
        .filter-wrapper {
          flex: 1;
          position: relative;
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
        
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          color: white;
        }
        .action-btn:active { transform: scale(0.95); }
        .action-btn:hover { opacity: 0.9; }
        .btn-approve { background: #10b981; }
        .btn-reject { background: #ef4444; }
        
        .styled-table { width: 100%; border-collapse: collapse; font-size: 14px; background: #fff; }
        .styled-table thead th { background-color: #f8fafc; color: #334155; text-align: left; padding: 14px 20px; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
        .styled-table tbody td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; color: #475569; vertical-align: middle; }
        .styled-table tbody tr:hover { background-color: #f8fafc; }
      `}</style>

      {/* Header */}
      <div className="leave-header-bar">
        <div>
            <h3 style={{ color: "var(--red)", margin: 0, fontSize: "20px" }}>Leave Approvals</h3>
            <p className="small" style={{ color: '#64748b', margin: '4px 0 0 0' }}>Review and manage employee leave requests.</p>
        </div>
      </div>

      {/* Filters & Search */}
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

      {/* Error Message */}
      {error && <div className="alert" style={{ margin: "20px", background: '#fee2e2', color: '#b91c1c', padding: 15, borderRadius: 6 }}>{error}</div>}
      
      {/* Loading State */}
      {loading ? (
          <div className="loader-container" style={{ padding: '60px 0', background: '#fff' }}>
              <div className="loader"></div>
              <p style={{textAlign: 'center', color: '#64748b', marginTop: 15}}>Fetching leave requests...</p>
          </div>
      ) : (
          /* Data Rendering */
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '0 0 12px 12px' }}>
             {filteredLeaves.length === 0 && !error ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <FaCalendarAlt size={40} style={{ opacity: 0.2, marginBottom: 15 }} />
                  <p style={{ fontSize: 16, margin: 0 }}>No leave requests found matching your criteria.</p>
                </div>
             ) : (
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Employee Details</th>
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
                      // Determine if the action buttons should be shown based on current overall status
                      // We show them if the overall status isn't definitively resolved yet.
                      const isResolved = l.status === "Approved" || l.status === "Rejected";

                      return (
                      <tr key={l._id}>
                        {/* Employee Column */}
                        <td>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{l.employee_name}</div>
                          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                              {l.type === 'half' ? `Half Day (${l.period || 'Any'})` : 'Full Day'}
                          </div>
                        </td>
                        
                        {/* Date Column */}
                        <td style={{ fontSize: "14px", fontWeight: 500 }}>
                            {l.from_date && l.to_date && l.from_date !== l.to_date 
                               ? (<>
                                     <div>{new Date(l.from_date).toLocaleDateString()}</div>
                                     <div style={{color: '#94a3b8', fontSize: 12}}>to</div>
                                     <div>{new Date(l.to_date).toLocaleDateString()}</div>
                                  </>)
                               : <div>{l.date ? new Date(l.date).toLocaleDateString() : '-'}</div>
                            }
                        </td>
                        
                        {/* Reason & Attachment Column */}
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
                        
                        {/* Status Columns */}
                        <td><span className={`status-badge ${getStatusClass(l.manager_status)}`}>{l.manager_status || 'Pending'}</span></td>
                        <td><span className={`status-badge ${getStatusClass(l.admin_status)}`}>{l.admin_status || 'Pending'}</span></td>
                        <td><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span></td>

                        {/* Action Buttons Column */}
                        {/* FIX: Universally show action buttons for unresolved leaves regardless of direct localStorage role */}
                        <td>
                            {!isResolved ? (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button className="action-btn btn-approve" onClick={() => updateStatus(l._id, "Approved")}>
                                        <FaCheckCircle /> Approve
                                    </button>
                                    <button className="action-btn btn-reject" onClick={() => updateStatus(l._id, "Rejected")}>
                                        <FaTimesCircle /> Reject
                                    </button>
                                </div>
                            ) : (
                                <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <FaCheckCircle style={{ opacity: 0.5 }}/> Processed
                                </div>
                            )}
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