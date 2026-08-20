import React, { useState, useEffect, useRef } from "react";
import { FaEdit, FaTrash, FaCrown, FaChevronDown } from "react-icons/fa";

import { BASE_URL as BASE } from "../api";

// Collapsed multi-select dropdown — a single-column checklist that opens
// on click instead of an always-expanded box, so the field reads like a
// normal compact form control until you actually need to pick departments.
function DeptCheckboxList({ departments, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onOutsideClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const toggle = (d) =>
    onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d]);

  const label = selected.length === 0
    ? "Select departments…"
    : selected.length <= 2
      ? selected.join(", ")
      : `${selected.length} departments selected`;

  return (
    <div ref={wrapRef} style={{ position: "relative", maxWidth: 420 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="modern-input"
        style={{
          margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, cursor: "pointer", textAlign: "left",
          color: selected.length === 0 ? "#94a3b8" : "#1e293b",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <FaChevronDown size={11} style={{ flexShrink: 0, color: "#94a3b8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(15,23,42,0.12)", maxHeight: 220, overflowY: "auto",
        }}>
          {departments.length === 0 && (
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, padding: "10px 12px" }}>Loading departments…</p>
          )}
          {departments.map(d => (
            <label key={d} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#1e293b",
            }}>
              <input type="checkbox" checked={selected.includes(d)} onChange={() => toggle(d)} />
              {d}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegisterManager({ token, api }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState(null);

  async function loadManagers() {
    try {
      setLoading(true);
      const list = await api.getManagers(token);
      setManagers(list);
    } catch (err) {
      console.error("Error loading managers:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const baseUrl = api?.baseUrl || BASE;
      const headers = { Authorization: `Bearer ${token}` };
      const nameSet = new Set();

      const empRes = await fetch(`${baseUrl}/api/admin/employees`, { headers });
      if (empRes.ok) {
        const emps = await empRes.json();
        const list = Array.isArray(emps) ? emps : (emps?.employees || []);
        list.forEach(e => { if (e.department) nameSet.add(e.department); });
      }

      const deptRes = await fetch(`${baseUrl}/api/admin/departments`, { headers });
      if (deptRes.ok) {
        const saved = await deptRes.json();
        if (Array.isArray(saved)) saved.forEach(d => { if (d.name) nameSet.add(d.name); });
      }

      const names = [...nameSet].sort();
      if (names.length) setDepartments(names);
    } catch {}
  }

  useEffect(() => {
    loadManagers();
    loadDepartments();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    if (password !== confirmPassword) {
      setMsg("❌ Passwords do not match!");
      setShowModal(true);
      return;
    }

    if (department.length === 0) {
      setMsg("❌ Please select at least one department.");
      setShowModal(true);
      return;
    }

    try {
      await api.registerManager({ name, email, password, department }, token);
      setMsg("✅ Manager registered successfully!");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setDepartment([]);
      loadManagers();
    } catch (err) {
      setMsg("❌ " + (err.message || "Error registering manager"));
    }

    setShowModal(true);
  }

  async function toggleOwner(m) {
    const newRole = m.role === "owner" ? "manager" : "owner";
    const label = newRole === "owner" ? "Make Business Owner" : "Remove Business Owner";
    if (!window.confirm(`${label} for ${m.name}?`)) return;
    setTogglingId(m._id);
    try {
      await api.setManagerRole(m._id, newRole, token);
      loadManagers();
    } catch {
      alert("Failed to update role. Please try again.");
    }
    setTogglingId(null);
  }

  async function deleteManager(id) {
    if (!window.confirm("Delete this manager?")) return;
    try {
      await api.deleteManager(id, token);
      loadManagers();
    } catch (err) {
      alert("Error deleting manager");
    }
  }

  const handleEditClick = (manager) => {
    const raw = manager.department;
    const normalized = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    setEditingManager({ ...manager, department: normalized });
    setEditModalOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingManager.department || editingManager.department.length === 0) {
      alert("Please select at least one department.");
      return;
    }
    try {
      await api.editManager(editingManager._id, editingManager, token);
      setEditModalOpen(false);
      setEditingManager(null);
      loadManagers();
      alert("Manager updated successfully");
    } catch (err) {
      alert("Failed to update manager");
    }
  };

  const displayDept = (d) => {
    if (Array.isArray(d)) return d.join(", ");
    return d || "—";
  };

  return (
    <div className="card">
      <style>{`
        .icon-btn {
          border: none; background: none; cursor: pointer; font-size: 16px;
          padding: 6px; border-radius: 4px; transition: background 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .icon-btn.edit { color: #16a34a; }
        .icon-btn.edit:hover { background: #dcfce7; }
        .icon-btn.delete { color: #dc2626; }
        .icon-btn.delete:hover { background: #fee2e2; }
      `}</style>

      <h3 style={{ color: "var(--brand)" }}>Register Manager</h3>

      <form onSubmit={submit}>
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>
              Departments
              {department.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--brand)", fontWeight: 600 }}>
                  {department.length} selected
                </span>
              )}
            </label>
            <DeptCheckboxList
              departments={departments}
              selected={department}
              onChange={setDepartment}
            />
          </div>
          <div style={{ flex: 1 }} />
        </div>

        <div className="form-row">
          <div style={{ flex: 1, position: "relative" }}>
            <label>Password</label>
            <input
              className="input" type={showPassword ? "text" : "password"}
              value={password} onChange={e => setPassword(e.target.value)}
              required style={{ paddingRight: "42px" }}
            />
            <span className="material-icons" onClick={() => setShowPassword(!showPassword)}
              style={{ position:"absolute", right:10, top:"53%", transform:"translateY(-50%)", cursor:"pointer", color:"var(--brand)" }}>
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <label>Confirm Password</label>
            <input
              className="input" type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              required style={{ paddingRight: "42px" }}
            />
            <span className="material-icons" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ position:"absolute", right:10, top:"53%", transform:"translateY(-50%)", cursor:"pointer", color:"var(--brand)" }}>
              {showConfirmPassword ? "visibility_off" : "visibility"}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "end" }}>
          <button className="btn" type="submit">Create Manager</button>
        </div>
      </form>

      <h3 style={{ color: "var(--brand)", marginTop: "20px" }}>Manager List</h3>

      {loading && <p>Loading managers...</p>}
      {!loading && managers.length === 0 && <p>No managers found.</p>}

      {!loading && managers.length > 0 && (
        <table className="leave-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department(s)</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>

          </thead>
          <tbody>
            {[...managers].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(m => (
              <tr key={m._id}>
                <td>
                  {m.name}
                  {m.role === "owner" && (
                    <span style={{
                      marginLeft: 8, background: "#fef3c7", color: "#b45309",
                      fontSize: 11, fontWeight: 600, borderRadius: 4,
                      padding: "2px 7px", verticalAlign: "middle",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      <FaCrown style={{ fontSize: 10 }} /> Business Owner
                    </span>
                  )}
                </td>
                <td>{m.email}</td>
                <td>{displayDept(m.department)}</td>
                <td style={{ textAlign:"center", display:"flex", gap:"5px", justifyContent:"center", alignItems:"center" }}>
                  <button
                    onClick={() => toggleOwner(m)}
                    disabled={togglingId === m._id}
                    title={m.role === "owner" ? "Remove Business Owner" : "Make Business Owner"}
                    style={{
                      border: "none", cursor: "pointer", borderRadius: 4,
                      padding: "5px 10px", fontSize: 12, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 4,
                      background: m.role === "owner" ? "#f1f5f9" : "#fef3c7",
                      color: m.role === "owner" ? "#64748b" : "#b45309",
                    }}
                  >
                    <FaCrown style={{ fontSize: 11 }} />
                    {togglingId === m._id ? "..." : m.role === "owner" ? "Remove Owner" : "Make Owner"}
                  </button>
                  <button className="icon-btn edit" onClick={() => handleEditClick(m)} title="Edit">
                    <FaEdit />
                  </button>
                  <button className="icon-btn delete" onClick={() => deleteManager(m._id)} title="Delete">
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Message Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h4 style={{ color: "#b91c1c" }}>Message</h4>
            <p style={{ color: msg.includes("✅") ? "green" : "red" }}>{msg}</p>
            <button className="btn" onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Edit Manager Modal */}
      {editModalOpen && editingManager && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 420 }}>
            <h3 style={{ color: "var(--brand)" }}>Edit Manager</h3>
            <form onSubmit={handleEditSave}>
              <div style={{ textAlign: "left", marginBottom: 10 }}>
                <label>Name</label>
                <input className="input" value={editingManager.name}
                  onChange={e => setEditingManager({...editingManager, name: e.target.value})} required />
              </div>
              <div style={{ textAlign: "left", marginBottom: 10 }}>
                <label>Email</label>
                <input className="input" type="email" value={editingManager.email}
                  onChange={e => setEditingManager({...editingManager, email: e.target.value})} required />
              </div>
              <div style={{ textAlign: "left", marginBottom: 15 }}>
                <label>
                  Departments
                  {editingManager.department?.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "var(--brand)", fontWeight: 600 }}>
                      {editingManager.department.length} selected
                    </span>
                  )}
                </label>
                <DeptCheckboxList
                  departments={departments}
                  selected={editingManager.department || []}
                  onChange={selected => setEditingManager({...editingManager, department: selected})}
                />
              </div>
              <div className="modal-actions">
                <button className="btn" type="submit">Save Changes</button>
                <button className="btn ghost" type="button" onClick={() => setEditModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
