import React, { useEffect, useState } from "react";
import { resolveAttachmentUrl } from "../utils/security";
import { ymd } from "../utils/dateUtils";
import { SkeletonTable } from "./Skeleton";
import {
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaFileDownload,
  FaCalendarAlt,
  FaClock,
  FaSortAmountDown,
  FaTimes
} from "react-icons/fa";

// ============================================================================
// MAIN COMPONENT EXPORT: ADMIN LEAVE PAGE
// ============================================================================

export default function AdminLeavePage({ token, api }) {
  // ============================================================================
  // 1. STATE MANAGEMENT
  // ============================================================================
  
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("applied_desc");
  const [dateFilter, setDateFilter] = useState(""); // "YYYY-MM-DD" — show only leaves covering this date

  // ============================================================================
  // 2. DATA FETCHING LOGIC
  // ============================================================================

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await api.adminLeaves(token);
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
    if (saving) return;
    if (!window.confirm(`Are you sure you want to mark this leave request as ${status}?`)) {
        return;
    }
    setSaving(true);
    try {
      await api.updateLeave(id, { status }, token);
      await load();
      alert(`Leave request successfully marked as ${status}.`);
    } catch (err) {
      console.error("Status Update Error:", err);
      alert("Error updating leave request: " + (err.message || "Unknown error occurred."));
    } finally {
      setSaving(false);
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

  // Leave-period start date used for date-wise sorting — falls back to the
  // legacy single "date" field when from_date isn't set.
  const leaveStartDate = (l) => new Date(l.from_date || l.date || l.applied_at || l.created_at || 0);
  const appliedDate    = (l) => new Date(l.applied_at || l.created_at || 0);

  // Does this leave's period cover the given "YYYY-MM-DD" date?
  const coversDate = (l, dateStr) => {
    if (l.from_date && l.to_date) {
      return String(l.from_date).slice(0, 10) <= dateStr && String(l.to_date).slice(0, 10) >= dateStr;
    }
    return String(l.date || "").slice(0, 10) === dateStr;
  };

  const filteredLeaves = leaves
    .filter(l => {
      const matchesSearch = l.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            l.reason?.toLowerCase().includes(searchTerm.toLowerCase());

      const currentOverallStatus = l.status || 'Pending';
      const matchesStatus = statusFilter === "All" ||
                            (statusFilter === "Pending" && currentOverallStatus.includes("Pending")) ||
                            (statusFilter === "Approved" && currentOverallStatus.includes("Approved")) ||
                            (statusFilter === "Rejected" && currentOverallStatus.includes("Rejected"));

      const matchesDate = !dateFilter || coversDate(l, dateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "applied_asc":  return appliedDate(a) - appliedDate(b);
        case "leave_asc":    return leaveStartDate(a) - leaveStartDate(b);
        case "leave_desc":   return leaveStartDate(b) - leaveStartDate(a);
        case "applied_desc":
        default:             return appliedDate(b) - appliedDate(a);
      }
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

        .date-filter-wrapper { display: flex; align-items: center; gap: 6px; }
        .date-filter-wrapper .styled-input { width: auto; flex: 1; }
        .date-filter-clear {
          flex-shrink: 0;
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          padding: 0;
        }
        .date-filter-clear:hover { background: #e2e8f0; color: #334155; }

        .today-quick-btn {
          flex-shrink: 0;
          padding: 8px 16px;
          border: 1px solid var(--red);
          background: #fff;
          color: var(--red);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s, color 0.2s;
        }
        .today-quick-btn:hover { background: var(--red); color: #fff; }

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
        .status-badge.approved { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .status-badge.rejected { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .status-badge.pending { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        
        /* Action Buttons - side by side, compact */
        .action-btn-group {
          display: flex;
          flex-direction: row;
          gap: 8px;
          align-items: center;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 14px;
          border: none;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          color: white;
          white-space: nowrap;
        }
        .action-btn:active { transform: scale(0.95); }
        .action-btn:hover { opacity: 0.9; }
        .btn-approve { background: var(--brand); }
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

        /* ---------------- MOBILE CARD LAYOUT ---------------- */
        .leave-cards { display: none; }

        @media (max-width: 768px) {
          .leave-header-bar { padding: 16px; border-radius: 12px 12px 0 0; }
          .filter-container { flex-direction: column; gap: 10px; padding: 12px 16px; }
          .search-wrapper, .filter-wrapper { flex: 1 1 auto; }
          .today-quick-btn { width: 100%; }

          /* Hide the desktop table entirely on mobile */
          .styled-table-wrap { display: none; }

          .leave-cards {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
            background: #f8fafc;
            border-radius: 0 0 12px 12px;
          }
          .leave-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
          }
          .leave-card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 10px;
          }
          .leave-card-name { font-weight: 700; color: #0f172a; font-size: 15px; }
          .leave-card-type { color: #64748b; font-size: 11px; margin-top: 2px; text-transform: uppercase; font-weight: 600; }
          .leave-card-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            padding: 7px 0;
            border-top: 1px solid #f1f5f9;
            font-size: 13px;
          }
          .leave-card-row:first-of-type { border-top: none; }
          .leave-card-label { color: #94a3b8; font-weight: 600; font-size: 11.5px; text-transform: uppercase; flex-shrink: 0; }
          .leave-card-value { color: #334155; text-align: right; }
          .leave-card-statuses {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin: 10px 0;
          }
          .leave-card-statuses .status-badge { flex: 1; min-width: 0; }
          .leave-card .action-btn-group { margin-top: 10px; }
          .leave-card .action-btn { flex: 1; padding: 10px 8px; }
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
          <div className="filter-wrapper">
              <FaSortAmountDown className="search-icon" />
              <select
                  className="styled-input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
              >
                  <option value="applied_desc">Applied: Newest First</option>
                  <option value="applied_asc">Applied: Oldest First</option>
                  <option value="leave_asc">Leave Date: Earliest First</option>
                  <option value="leave_desc">Leave Date: Latest First</option>
              </select>
          </div>
          <div className="filter-wrapper date-filter-wrapper">
              <FaCalendarAlt className="search-icon" />
              <input
                  type="date"
                  className="styled-input"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  title="Show only leaves covering this date"
              />
              {dateFilter && (
                  <button
                      type="button"
                      className="date-filter-clear"
                      onClick={() => setDateFilter("")}
                      title="Clear date filter"
                  >
                      <FaTimes size={11} />
                  </button>
              )}
          </div>
          <button
              type="button"
              className="today-quick-btn"
              onClick={() => setDateFilter(ymd())}
              title="Show leave requests covering today"
          >
              Today
          </button>
      </div>

      {error && (
        <div className="alert" style={{ margin: "20px", background: '#fee2e2', color: '#b91c1c', padding: 15, borderRadius: 6 }}>
          <strong>Attention: </strong> {error}
        </div>
      )}
      
      {/* ---------------- DATA TABLE ---------------- */}
      {loading ? (
          <SkeletonTable rows={7} cols={6} />
      ) : (
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '0 0 12px 12px' }}>
             {filteredLeaves.length === 0 && !error ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <FaCalendarAlt size={40} style={{ opacity: 0.2, marginBottom: 15 }} />
                  <p style={{ fontSize: 15, margin: 0, fontWeight: 500 }}>No leave requests found matching your criteria.</p>
                </div>
             ) : (
              <>
                <div className="styled-table-wrap">
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
                          {resolveAttachmentUrl(l.attachment_url, api.baseUrl) && (
                            <div>
                              <a
                                href={resolveAttachmentUrl(l.attachment_url, api.baseUrl)}
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
                                    disabled={saving || (l.status || "").toLowerCase().includes("approved")}
                                >
                                    <FaCheckCircle /> Approve
                                </button>
                                <button
                                    className="action-btn btn-reject"
                                    onClick={() => updateStatus(l._id, "Rejected")}
                                    disabled={saving || (l.status || "").toLowerCase().includes("rejected")}
                                >
                                    <FaTimesCircle /> Reject
                                </button>
                            </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
                </div>

                {/* ---------------- MOBILE CARD LIST ---------------- */}
                <div className="leave-cards">
                  {filteredLeaves.map((l) => {
                    const { date, time } = formatDateTime(l.applied_at || l.created_at);
                    const attachUrl = resolveAttachmentUrl(l.attachment_url, api.baseUrl);
                    return (
                      <div className="leave-card" key={l._id}>
                        <div className="leave-card-top">
                          <div>
                            <div className="leave-card-name">{l.employee_name}</div>
                            <div className="leave-card-type">
                              {l.type === 'half' ? `Half Day (${l.period || 'Any'})` : 'Full Day'}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{date}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{time}</div>
                          </div>
                        </div>

                        <div className="leave-card-row">
                          <span className="leave-card-label">Leave Period</span>
                          <span className="leave-card-value">
                            {l.from_date && l.to_date && l.from_date !== l.to_date
                              ? `${new Date(l.from_date).toLocaleDateString('en-GB')} → ${new Date(l.to_date).toLocaleDateString('en-GB')}`
                              : (l.date ? new Date(l.date).toLocaleDateString('en-GB') : '-')}
                          </span>
                        </div>

                        <div className="leave-card-row">
                          <span className="leave-card-label">Reason</span>
                          <span className="leave-card-value">
                            {l.reason || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>No reason</span>}
                          </span>
                        </div>

                        {attachUrl && (
                          <div className="leave-card-row">
                            <span className="leave-card-label">Attachment</span>
                            <a
                              href={attachUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4, color: "var(--red)",
                                fontSize: "12px", textDecoration: "none", fontWeight: 600,
                              }}
                            >
                              <FaFileDownload /> View Doc
                            </a>
                          </div>
                        )}

                        <div className="leave-card-statuses">
                          <span className={`status-badge ${getStatusClass(l.manager_status)}`}>Mgr: {l.manager_status || 'Pending'}</span>
                          <span className={`status-badge ${getStatusClass(l.admin_status)}`}>HR: {l.admin_status || 'Pending'}</span>
                          <span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span>
                        </div>

                        <div className="action-btn-group">
                          <button
                            className="action-btn btn-approve"
                            onClick={() => updateStatus(l._id, "Approved")}
                            disabled={saving || (l.status || "").toLowerCase().includes("approved")}
                          >
                            <FaCheckCircle /> Approve
                          </button>
                          <button
                            className="action-btn btn-reject"
                            onClick={() => updateStatus(l._id, "Rejected")}
                            disabled={saving || (l.status || "").toLowerCase().includes("rejected")}
                          >
                            <FaTimesCircle /> Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
             )}
          </div>
      )}
    </div>
  );
}