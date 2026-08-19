import React, { useState, useEffect } from "react";
import { FaEdit, FaBuilding } from "react-icons/fa";
import { BASE_URL as BASE } from "../api";

// Lightweight "Manage Departments" for a delegate with only the "departments"
// grant. AdminDashboard.jsx's own Departments tab (cards grid, manager
// assignment, employee-count stats) is deeply wired into that component's own
// state (its full employee list, SkeletonCards, color palette, etc.) — not
// worth extracting for delegated use. This talks to the same
// GET/POST/PUT /api/admin/departments endpoints directly, same pattern
// RegisterManager.jsx already uses for its own department lookups. Delete is
// intentionally left out — DELETE /api/admin/departments/<id> is admin-only
// (see routes/employees.py::delete_department), not grantable, so a delegate
// would just get a 403.
export default function DelegatedDepartments({ token, api, canWrite = true }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingDept, setEditingDept] = useState(null);

  const baseUrl = api?.baseUrl || BASE;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // departments_col is the source of truth for formal department records,
  // but (same as AdminDashboard.jsx's own loadDepartments()) an employee's
  // `department` string can be set without ever being formalized as its own
  // departments_col document — merge those in too, or this list only shows
  // the handful of "official" rows instead of every department actually in
  // use across the roster. Entries only known via the roster (no `_formal`
  // flag) can't be PUT to (no real _id) so their Edit action is hidden.
  async function loadDepartments() {
    setLoading(true);
    try {
      const [deptRes, empRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/departments`, { headers }),
        fetch(`${baseUrl}/api/admin/employees`, { headers }),
      ]);
      const saved = deptRes.ok ? await deptRes.json() : [];
      const byName = {};
      saved.forEach(s => { byName[s.name] = { ...s, _formal: true }; });

      if (empRes.ok) {
        const emps = await empRes.json();
        const list = Array.isArray(emps) ? emps : (emps?.employees || []);
        list.forEach((emp) => {
          const deptVal = emp.department;
          const depts = Array.isArray(deptVal) ? deptVal : (deptVal ? [deptVal] : ["Unassigned"]);
          depts.forEach(d => { if (!byName[d]) byName[d] = { _id: d, name: d, description: "", head_id: null, _formal: false }; });
        });
      }
      setDepartments(Object.values(byName));
    } catch { setDepartments([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadDepartments(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${baseUrl}/api/admin/departments`, {
        method: "POST", headers, body: JSON.stringify({ name, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to add department.");
      setName(""); setDescription("");
      setMsg("✅ Department added.");
      loadDepartments();
    } catch (err) {
      setMsg("❌ " + (err.message || "Failed to add department."));
    } finally { setSaving(false); }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/departments/${editingDept._id}`, {
        method: "PUT", headers,
        body: JSON.stringify({ name: editingDept.name, description: editingDept.description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update department.");
      setEditingDept(null);
      loadDepartments();
    } catch (err) {
      alert(err.message || "Failed to update department.");
    } finally { setSaving(false); }
  }

  const sorted = [...departments].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="card">
      <h3 style={{ color: "var(--brand)", display: "flex", alignItems: "center", gap: 8 }}>
        <FaBuilding /> Departments
      </h3>

      {canWrite && (
        <form onSubmit={submit} className="form-row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label>Department Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Description (optional)</label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Adding…" : "Add Department"}</button>
          </div>
        </form>
      )}
      {msg && <p style={{ color: msg.startsWith("✅") ? "green" : "red", marginTop: 8 }}>{msg}</p>}

      <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Department List</h3>
      {loading && <p>Loading departments...</p>}
      {!loading && sorted.length === 0 && <p>No departments found.</p>}
      {!loading && sorted.length > 0 && (
        <table className="leave-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              {canWrite && <th style={{ textAlign: "center" }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => (
              <tr key={d._id}>
                <td>
                  {d.name}
                  {!d._formal && (
                    <span title="Seen on employee records but not yet a formal department entry" style={{
                      marginLeft: 8, fontSize: 10.5, fontWeight: 600, color: "#b45309",
                      background: "#fef3c7", borderRadius: 4, padding: "2px 6px",
                    }}>Not formalized</span>
                  )}
                </td>
                <td>{d.description || "—"}</td>
                {canWrite && (
                  <td style={{ textAlign: "center" }}>
                    {d._formal && (
                      <button
                        onClick={() => setEditingDept({ ...d })}
                        title="Edit"
                        style={{ border: "none", background: "none", cursor: "pointer", color: "#16a34a", padding: 6, borderRadius: 4 }}
                      >
                        <FaEdit />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingDept && (
        <div className="modal-overlay" onClick={() => setEditingDept(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 380 }}>
            <h3 style={{ color: "var(--brand)" }}>Edit Department</h3>
            <form onSubmit={saveEdit}>
              <div style={{ textAlign: "left", marginBottom: 10 }}>
                <label>Name</label>
                <input className="input" value={editingDept.name}
                  onChange={e => setEditingDept({ ...editingDept, name: e.target.value })} required />
              </div>
              <div style={{ textAlign: "left", marginBottom: 15 }}>
                <label>Description</label>
                <input className="input" value={editingDept.description || ""}
                  onChange={e => setEditingDept({ ...editingDept, description: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
                <button className="btn ghost" type="button" onClick={() => setEditingDept(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
