import React, { useState, useEffect } from "react";
import api from "../api";
import {
  FaTrash, FaUserShield, FaSearch, FaFilter, FaUserTie, FaUser,
  FaEdit, FaUserClock, FaTimes, FaPlus, FaExclamationTriangle,
  FaSun, FaMoon,
} from "react-icons/fa";

const SHIFTS = [
  { key: "morning", label: "Morning Shift", hours: "9 AM – 6 PM",  icon: <FaSun  size={11} />, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { key: "night",   label: "Night Shift",   hours: "7 PM – 4 AM",  icon: <FaMoon size={11} />, color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
];

function ShiftBadge({ shift }) {
  const s = SHIFTS.find((x) => x.key === (shift || "morning")) || SHIFTS[0];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600, borderRadius: 4,
      padding: "2px 7px", lineHeight: "18px", marginTop: 4,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.icon} {s.label}
    </span>
  );
}

const EXTENDED_LEAVE_TYPES = [
  "Maternity Leave",
  "Paternity Leave",
  "Medical / Long-Term Sick",
  "Sabbatical",
  "Study / Educational",
  "Unpaid Extended Leave",
  "Other",
];

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function EmploymentStatusBadge({ emp }) {
  const hasResignation   = !!emp.resignation?.notice_date;
  const hasExtendedLeave = emp.extended_leaves?.length > 0;
  if (!hasResignation && !hasExtendedLeave) return null;

  const label = hasResignation ? "Serving Notice" : "On Extended Leave";
  const style = hasResignation
    ? { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" }
    : { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };

  return (
    <span style={{
      display: "inline-block", marginTop: 4,
      fontSize: 11, fontWeight: 600, borderRadius: 4,
      padding: "2px 7px", lineHeight: "18px",
      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
    }}>
      {label}
    </span>
  );
}

function StatusModal({ employee, onClose, onRefresh }) {
  const [tab, setTab]       = useState("leave");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const [leaveType,  setLeaveType]  = useState(EXTENDED_LEAVE_TYPES[0]);
  const [leaveFrom,  setLeaveFrom]  = useState("");
  const [leaveTo,    setLeaveTo]    = useState("");
  const [leaveNotes, setLeaveNotes] = useState("");

  const [noticeDate,   setNoticeDate]   = useState("");
  const [lastDay,      setLastDay]      = useState("");
  const [resignReason, setResignReason] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    api.getEmployeeStatus(employee._id, token)
      .then(setStatus)
      .catch(() => setStatus({ extended_leaves: [], resignation: null }))
      .finally(() => setLoading(false));
  }, [employee._id]);

  const addLeave = async (e) => {
    e.preventDefault();
    if (new Date(leaveTo) < new Date(leaveFrom)) return setError("End date must be after start date.");
    setSaving(true); setError("");
    try {
      const updated = await api.addExtendedLeave(employee._id, {
        type: leaveType, from_date: leaveFrom, to_date: leaveTo, notes: leaveNotes,
      }, token);
      setStatus(updated);
      setLeaveFrom(""); setLeaveTo(""); setLeaveNotes("");
      onRefresh?.();
    } catch { setError("Failed to save. Please try again."); }
    finally   { setSaving(false); }
  };

  const removeLeave = async (leaveId) => {
    setSaving(true); setError("");
    try {
      const updated = await api.removeExtendedLeave(employee._id, leaveId, token);
      setStatus(updated);
      onRefresh?.();
    } catch { setError("Failed to remove record."); }
    finally   { setSaving(false); }
  };

  const saveResignation = async (e) => {
    e.preventDefault();
    if (new Date(lastDay) < new Date(noticeDate)) return setError("Last working day must be after notice date.");
    setSaving(true); setError("");
    try {
      const updated = await api.setResignation(employee._id, {
        notice_date: noticeDate, last_working_day: lastDay, reason: resignReason,
      }, token);
      setStatus(updated);
      setNoticeDate(""); setLastDay(""); setResignReason("");
      onRefresh?.();
    } catch { setError("Failed to save. Please try again."); }
    finally   { setSaving(false); }
  };

  const clearResignation = async () => {
    setSaving(true); setError("");
    try {
      const updated = await api.clearResignation(employee._id, token);
      setStatus(updated);
      onRefresh?.();
    } catch { setError("Failed to clear record."); }
    finally   { setSaving(false); }
  };

  const tabStyle = (key) => ({
    flex: 1, padding: "8px 0", border: "none", borderRadius: 6, cursor: "pointer",
    fontSize: 13, fontWeight: 600, transition: "all 0.15s",
    background: tab === key ? "#fff"       : "transparent",
    color:      tab === key ? "var(--red)" : "#64748b",
    boxShadow:  tab === key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 540, width: "100%" }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          marginBottom: 18, borderBottom: "1px solid #e2e8f0", paddingBottom: 14,
        }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--red)", fontSize: 15, fontWeight: 700 }}>
              Employment Status
            </h3>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
              {employee.name}
              {employee.department && <span style={{ color: "#94a3b8" }}> · {employee.department}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, lineHeight: 1 }}
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f1f5f9", borderRadius: 8, padding: 4 }}>
          <button style={tabStyle("leave")}      onClick={() => { setTab("leave");      setError(""); }}>Extended Leave</button>
          <button style={tabStyle("resignation")} onClick={() => { setTab("resignation"); setError(""); }}>Resignation</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
                borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* — Extended Leave — */}
            {tab === "leave" && (
              <div>
                {status?.extended_leaves?.length > 0 && (
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                      Active Records
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {status.extended_leaves.map((lv) => (
                        <div key={lv._id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px",
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "#c2410c", fontSize: 13 }}>{lv.type}</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                              {fmt(lv.from_date)} → {fmt(lv.to_date)}
                              {lv.notes && <span style={{ marginLeft: 8 }}>· {lv.notes}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => removeLeave(lv._id)}
                            disabled={saving}
                            title="Remove record"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, lineHeight: 1 }}
                          >
                            <FaTimes size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={addLeave}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                    Record New Extended Leave
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600, color: "#334155", fontSize: 12, marginBottom: 5 }}>Leave Type</label>
                    <select className="modern-input" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                      {EXTENDED_LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontWeight: 600, color: "#334155", fontSize: 12, marginBottom: 5 }}>From Date</label>
                      <input className="modern-input" type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} required />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontWeight: 600, color: "#334155", fontSize: 12, marginBottom: 5 }}>To Date</label>
                      <input className="modern-input" type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} required />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 600, color: "#334155", fontSize: 12, marginBottom: 5 }}>
                      Notes <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      className="modern-input"
                      type="text"
                      value={leaveNotes}
                      onChange={(e) => setLeaveNotes(e.target.value)}
                      placeholder="e.g. Expected return date, medical notes..."
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                    <button className="btn" type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <FaPlus size={11} />
                      {saving ? "Saving…" : "Record Leave"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* — Resignation — */}
            {tab === "resignation" && (
              <div>
                {status?.resignation ? (
                  <>
                    <div style={{
                      background: "#fef2f2", border: "1px solid #fecaca",
                      borderRadius: 10, padding: "16px 20px", marginBottom: 20,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <FaExclamationTriangle color="#dc2626" size={14} />
                        <span style={{ fontWeight: 700, color: "#b91c1c", fontSize: 14 }}>Resignation on Record</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notice Given</div>
                          <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 3 }}>{fmt(status.resignation.notice_date)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Working Day</div>
                          <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 3 }}>{fmt(status.resignation.last_working_day)}</div>
                        </div>
                      </div>
                      {status.resignation.reason && (
                        <div style={{ marginTop: 12, padding: "10px 12px", background: "#fff", borderRadius: 6, fontSize: 13, color: "#475569" }}>
                          <span style={{ fontWeight: 600 }}>Reason: </span>{status.resignation.reason}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn ghost"
                        onClick={clearResignation}
                        disabled={saving}
                        style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                      >
                        {saving ? "Clearing…" : "Clear Resignation Record"}
                      </button>
                    </div>
                  </>
                ) : (
                  <form onSubmit={saveResignation}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                      Record Resignation
                    </div>

                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "#334155", fontSize: 12, marginBottom: 5 }}>Notice Date</label>
                        <input className="modern-input" type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} required />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "#334155", fontSize: 12, marginBottom: 5 }}>Last Working Day</label>
                        <input className="modern-input" type="date" value={lastDay} onChange={(e) => setLastDay(e.target.value)} required />
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontWeight: 600, color: "#334155", fontSize: 12, marginBottom: 5 }}>
                        Reason <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                      </label>
                      <textarea
                        className="modern-input"
                        style={{ minHeight: 80, resize: "vertical" }}
                        value={resignReason}
                        onChange={(e) => setResignReason(e.target.value)}
                        placeholder="e.g. Better opportunity, personal reasons, relocation..."
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                      <button className="btn" type="submit" disabled={saving} style={{ background: "#dc2626" }}>
                        {saving ? "Saving…" : "Save Resignation Record"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function EmployeeList({ employees, onDelete, onRefresh, onPromote, departments = [] }) {
  const [searchTerm, setSearchTerm]         = useState("");
  const [roleFilter, setRoleFilter]         = useState("All");
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [selectedId, setSelectedId]         = useState(null);
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [managers, setManagers]             = useState([]);
  const [statusEmployee, setStatusEmployee] = useState(null);

  useEffect(() => {
    if (!showEditModal) return;
    const token = localStorage.getItem("token");
    api.getManagers(token).then(setManagers).catch(() => {});
  }, [showEditModal]);

  const handleDeleteClick = (id)  => { setSelectedId(id); setShowDeleteModal(true); };
  const confirmDelete     = ()    => { onDelete(selectedId); setShowDeleteModal(false); setSelectedId(null); };
  const handleEditClick   = (emp) => { setEditingEmployee({ ...emp }); setShowEditModal(true); };

  const handleEditSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await api.editEmployee(editingEmployee._id, editingEmployee, token);
      onRefresh?.();
      setShowEditModal(false);
      setEditingEmployee(null);
    } catch {
      alert("Error updating employee profile.");
    }
  };

  if (!employees) return <div className="loader-container"><div className="loader" /></div>;

  const filtered = employees.filter((emp) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      emp.name?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q);
    const matchesRole = roleFilter === "All" || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Search & filter header */}
      <div className="list-header">
        <div className="search-bar">
          <FaSearch color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FaFilter color="#94a3b8" />
          <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="All">All Roles</option>
            <option value="employee">Employees Only</option>
            <option value="manager">Managers Only</option>
          </select>
        </div>
      </div>

      {/* Data table */}
      <div style={{ overflowX: "auto" }}>
        <table className="styled-table-global">
          <thead>
            <tr>
              <th>Employee Details</th>
              <th>Role &amp; Position</th>
              <th>Shift</th>
              <th>Manager Auth</th>
              <th>Administrative Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  No employees found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <div className="emp-name">{emp.name}</div>
                    <div className="emp-email">{emp.email}</div>
                    <EmploymentStatusBadge emp={emp} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#334155", fontSize: 14 }}>
                      {emp.department || "No Department"}
                    </div>
                    <span className={`role-badge ${emp.role === "manager" ? "role-manager" : "role-employee"}`}>
                      {emp.role === "manager" ? <FaUserTie /> : <FaUser />} {emp.role}
                    </span>
                  </td>
                  <td>
                    <ShiftBadge shift={emp.shift} />
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                      {(SHIFTS.find(s => s.key === (emp.shift || "morning")) || SHIFTS[0]).hours}
                    </div>
                  </td>
                  <td>
                    {emp.role === "manager" ? (
                      <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 13 }}>Department Head</span>
                    ) : (
                      <span style={{ color: "#475569", fontSize: 14, fontWeight: 500 }}>
                        {emp.manager_name || "Unassigned"}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="action-btn-group">
                      <button className="btn-action btn-edit" onClick={() => handleEditClick(emp)} title="Edit employee details">
                        <FaEdit />
                      </button>
                      <button className="btn-action btn-status" onClick={() => setStatusEmployee(emp)} title="Employment status">
                        <FaUserClock />
                      </button>
                      {emp.role === "employee" && (
                        <button className="btn-action btn-promote" onClick={() => onPromote(emp._id)} title="Promote to Manager">
                          <FaUserShield />
                        </button>
                      )}
                      <button className="btn-action btn-remove" onClick={() => handleDeleteClick(emp._id)} title="Remove employee">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Employment Status Modal */}
      {statusEmployee && (
        <StatusModal
          employee={statusEmployee}
          onClose={() => setStatusEmployee(null)}
          onRefresh={onRefresh}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
            <FaTrash size={38} color="#dc2626" style={{ marginBottom: 14 }} />
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Delete Employee?</h3>
            <p style={{ color: "#64748b" }}>This action cannot be undone and will erase all historical attendance data.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button className="btn danger" onClick={confirmDelete}>Yes, Delete Permanently</button>
              <button className="btn ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit employee modal */}
      {showEditModal && editingEmployee && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "var(--red)", marginTop: 0, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
              Edit Employee Profile
            </h3>
            <form onSubmit={handleEditSave}>
              {[
                { label: "Full Name",      key: "name",     type: "text",  required: true },
                { label: "Email Address",  key: "email",    type: "email", required: true },
                { label: "Position Title", key: "position", type: "text",  required: false },
              ].map(({ label, key, type, required }) => (
                <div key={key} style={{ textAlign: "left", marginBottom: 14 }}>
                  <label style={{ fontWeight: 600, color: "#334155", fontSize: 13 }}>{label}</label>
                  <input
                    className="modern-input"
                    type={type}
                    value={editingEmployee[key] || ""}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, [key]: e.target.value })}
                    required={required}
                  />
                </div>
              ))}

              <div style={{ textAlign: "left", marginBottom: 14 }}>
                <label style={{ fontWeight: 600, color: "#334155", fontSize: 13 }}>Department</label>
                <select
                  className="modern-input"
                  value={editingEmployee.department || ""}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d._id || d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ textAlign: "left", marginBottom: 14 }}>
                <label style={{ fontWeight: 600, color: "#334155", fontSize: 13 }}>Shift</label>
                <select
                  className="modern-input"
                  value={editingEmployee.shift || "morning"}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, shift: e.target.value })}
                >
                  {SHIFTS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label} ({s.hours})</option>
                  ))}
                </select>
              </div>

              <div style={{ textAlign: "left", marginBottom: 24 }}>
                <label style={{ fontWeight: 600, color: "#334155", fontSize: 13 }}>Assigned Manager</label>
                <select
                  className="modern-input"
                  value={editingEmployee.manager_id || ""}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, manager_id: e.target.value || null })}
                >
                  <option value="">No Manager / Self-Managed</option>
                  {managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                <button className="btn" type="submit" style={{ background: "#16a34a" }}>Save Changes</button>
                <button className="btn ghost" type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
