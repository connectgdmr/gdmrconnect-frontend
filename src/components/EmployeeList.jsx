import React, { useState, useEffect } from "react";
import api from "../api";
import { FaTrash, FaUserShield, FaSearch, FaFilter, FaUserTie, FaUser, FaEdit } from "react-icons/fa";

export default function EmployeeList({ employees, onDelete, onRefresh, onPromote, departments = [] }) {
  const [searchTerm, setSearchTerm]       = useState("");
  const [roleFilter, setRoleFilter]       = useState("All");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedId, setSelectedId]       = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [managers, setManagers]           = useState([]);

  useEffect(() => {
    if (!showEditModal) return;
    const token = localStorage.getItem("token");
    api.getManagers(token).then(setManagers).catch(() => {});
  }, [showEditModal]);

  const handleDeleteClick = (id) => { setSelectedId(id); setShowDeleteModal(true); };
  const confirmDelete     = () => { onDelete(selectedId); setShowDeleteModal(false); setSelectedId(null); };
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
              <th>Manager Auth</th>
              <th>Administrative Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  No employees found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <div className="emp-name">{emp.name}</div>
                    <div className="emp-email">{emp.email}</div>
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
