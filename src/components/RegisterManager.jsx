import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";

import { BASE_URL as BASE } from "../api";

function DeptCheckboxList({ departments, selected, onChange }) {
  const toggle = (d) =>
    onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d]);
  return (
    <div style={{
      maxHeight: 160, overflowY: "auto", border: "1px solid #e2e8f0",
      borderRadius: 6, padding: "6px 10px", background: "#f8fafc",
    }}>
      {departments.length === 0 && (
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Loading departments…</p>
      )}
      {departments.map(d => (
        <label key={d} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "4px 0", cursor: "pointer", fontSize: 13, color: "#1e293b",
        }}>
          <input type="checkbox" checked={selected.includes(d)} onChange={() => toggle(d)} />
          {d}
        </label>
      ))}
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
            {managers.map(m => (
              <tr key={m._id}>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td>{displayDept(m.department)}</td>
                <td style={{ textAlign:"center", display:"flex", gap:"5px", justifyContent:"center" }}>
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
