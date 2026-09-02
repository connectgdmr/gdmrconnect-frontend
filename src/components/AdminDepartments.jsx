import React, { useState, useEffect } from "react";
import {
  TbSitemap, TbPlus, TbEye, TbTags, TbEdit, TbTrash, TbX, TbUsers,
} from "react-icons/tb";
import { SkeletonCards } from "./Skeleton";
import WorkTypesManager from "./WorkTypesManager";

// Full "Departments" management UI — cards grid, stats strip, Add/Edit modal,
// members quick-view drawer, and the per-department Work Types modal.
// Originally AdminDashboard.jsx's `view === "departments"` block; extracted
// so a "departments" delegated-access grant gets the *real* thing instead of
// a stripped-down copy (same rationale as every other DELEGATED_MODULES
// entry in EmployeeDashboard.jsx/ManagerDashboard.jsx). AdminDashboard.jsx
// now renders this exact component for its own Departments tab too, so the
// two can never drift apart.
//
// `canWrite` gates Add/Edit/rename and Work Types editing (mirrors the
// grant's access_level — "view_only" delegates get a read-only version of
// this same UI). `canDelete` gates the Delete action specifically — the
// backend's DELETE /api/admin/departments/<id> is hard-restricted to real
// admins regardless of grant access_level (routes/employees.py::
// delete_department), so a delegate — even with view_edit — never gets it.

function empExitStatus(emp) {
  if (!emp.resignation?.notice_date) return null;
  const lwd = emp.resignation.last_working_day;
  if (!lwd) return "notice";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(lwd) < today ? "offboarded" : "notice";
}

function MemberRow({ emp, badge, exitLabel }) {
  const isFormer = !!exitLabel;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f8fafc",
      opacity: isFormer ? 0.45 : 1,
      filter: isFormer ? "grayscale(60%)" : "none",
    }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: emp.photo_url ? "transparent" : (isFormer ? "#94a3b8" : "linear-gradient(135deg,#334155,#1e293b)"), color: "#fff", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
        {emp.photo_url
          ? <img src={emp.photo_url} alt={emp.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : (emp.name?.charAt(0).toUpperCase() || "?")}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: isFormer ? "line-through" : "none" }}>{emp.name}</div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 1 }}>{emp.position || emp.email || "—"}</div>
      </div>
      {exitLabel ? (
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1", flexShrink: 0 }}>
          {exitLabel}
        </span>
      ) : badge ? (
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: badge.bg, color: badge.color, flexShrink: 0 }}>
          {badge.label}
        </span>
      ) : null}
    </div>
  );
}

const PALETTE = [
  { bg: "#f0fdf4", text: "#226e48", border: "#bbf7d0", accent: "#34a06a" },
  { bg: "#effdf8", text: "#0f766e", border: "#b6e6d6", accent: "#0f766e" },
  { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0", accent: "#059669" },
  { bg: "#e7f6f1", text: "#1c5249", border: "#c5e8dc", accent: "#1c5249" },
  { bg: "#eef7f0", text: "#2f6b4f", border: "#cfe8d8", accent: "#2b885a" },
  { bg: "#e9f5ee", text: "#14532d", border: "#bbf0cd", accent: "#15803d" },
  { bg: "#f3f8f4", text: "#3f6b52", border: "#d6e7db", accent: "#4d7c5f" },
  { bg: "#effcf6", text: "#0f5132", border: "#b8ead0", accent: "#198754" },
];
const getColor = name => PALETTE[(name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export default function AdminDepartments({ employees = [], token, api, canWrite = true, canDelete = true, onRefresh }) {
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptModal, setDeptModal] = useState(false);
  const [deptEditId, setDeptEditId] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", description: "", head_ids: [] });
  const [headPickerOpen, setHeadPickerOpen] = useState(false);
  const [headPickerSearch, setHeadPickerSearch] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptMembersOpen, setDeptMembersOpen] = useState(null); // dept object for quick-view
  const [workTypesDept, setWorkTypesDept] = useState(null); // department name for Work Types modal

  const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";

  // Kept separate from the roster merge below: the `employees` prop can
  // still be mid-fetch (empty) on first mount for a delegate — a delegated
  // view loads its own roster asynchronously (see EmployeeDashboard.jsx's/
  // ManagerDashboard.jsx's loadDelegatedEmployees()). If the merge only ran
  // once on mount inside this same fetch, it would permanently freeze on
  // whatever `employees` happened to be at that instant (often still []),
  // so the page would forever show just the formal departments_col rows
  // even after the roster finished loading a moment later. Doing the merge
  // in a memo keyed on `employees` instead means it recomputes every time
  // the roster prop actually changes, with no extra network round-trip.
  const [savedDepartments, setSavedDepartments] = useState([]);

  async function loadDepartments() {
    setDeptLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedDepartments(res.ok ? await res.json() : []);
    } catch {
      setSavedDepartments([]);
    } finally {
      setDeptLoading(false);
    }
  }

  useEffect(() => { loadDepartments(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // departments_col is the source of truth for names. An employee's
    // cached `department` string can briefly go stale right after a
    // rename — it must never shadow or duplicate the real, current
    // department record, or a rename looks like it "reverts" whenever
    // this list re-renders.
    const byName = {};
    savedDepartments.forEach(s => { byName[s.name] = { ...s }; });

    // Also surface any department only known via employee records (not
    // yet formalized as its own departments_col document).
    employees.forEach((emp) => {
      const deptVal = emp.department;
      const depts = Array.isArray(deptVal) ? deptVal : (deptVal ? [deptVal] : ["Unassigned"]);
      depts.forEach(d => {
        if (!byName[d]) byName[d] = { _id: d, name: d, description: "", head_id: null, head_ids: [] };
      });
    });
    setDepartments(Object.values(byName));
  }, [savedDepartments, employees]);

  async function saveDepartment(e) {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    setDeptSaving(true);
    try {
      // A department only ever known via employee records (never formalized
      // as its own departments_col document) gets a synthetic card whose
      // _id is just its name string, not a real ObjectId (see the byName
      // merge above) — PUTing that straight to /departments/<id> 500s with
      // "Invalid department ID" since it isn't one. Editing one of these
      // needs to CREATE the real record instead, and tell the backend what
      // legacy name to move existing employees off of.
      const isRealId = /^[0-9a-f]{24}$/i.test(deptEditId || "");
      const method = deptEditId && isRealId ? "PUT" : "POST";
      const url = deptEditId && isRealId
        ? `${baseUrl}/api/admin/departments/${deptEditId}`
        : `${baseUrl}/api/admin/departments`;
      const body = deptEditId && !isRealId
        ? { ...deptForm, legacy_name: deptEditId }
        : deptForm;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDeptModal(false);
        setDeptEditId(null);
        setDeptForm({ name: "", description: "", head_ids: [] });
        loadDepartments();
        // Renaming/formalizing a department moves employees onto the new
        // name server-side, but this component only owns departments_col
        // data — the `employees` prop it renders counts/heads from comes
        // from the parent dashboard and goes stale the moment that happens
        // (the old and new department cards showed wrong counts/heads until
        // a full page reload, even though the rename itself worked fine).
        onRefresh?.();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to save department.");
      }
    } catch {
      alert("Network error — failed to save department.");
    } finally {
      setDeptSaving(false);
    }
  }

  async function deleteDepartment(id, name) {
    if (!window.confirm(`Delete department "${name}"? Employees will be unassigned from this department.`)) return;
    try {
      const res = await fetch(`${baseUrl}/api/admin/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { loadDepartments(); onRefresh?.(); }
      else { const data = await res.json().catch(() => ({})); alert(data.message || "Failed to delete department."); }
    } catch { alert("Network error — failed to delete department."); }
  }

  function openAddDept() {
    setDeptEditId(null);
    setDeptForm({ name: "", description: "", head_ids: [] });
    setHeadPickerOpen(false); setHeadPickerSearch("");
    setDeptModal(true);
  }

  function openEditDept(dept) {
    setDeptEditId(dept._id);
    // A legacy (never-formalized) department always has head_id: null by
    // construction (see the byName merge above) even when the card is
    // visibly showing a head — that head was resolved separately, from a
    // manager whose own department field happens to match this department's
    // name. Falling back to dept.manager._id here means editing one of
    // these doesn't silently blank out the head it was already showing.
    setHeadPickerOpen(false); setHeadPickerSearch("");
    setDeptForm({ name: dept.name, description: dept.description || "", head_ids: (dept.head_ids && dept.head_ids.length) ? [...dept.head_ids] : (dept.head_id ? [dept.head_id] : (dept.manager?._id ? [dept.manager._id] : [])) });
    setDeptModal(true);
  }

  // Derive per-dept employee lists from the employee roster
  const deptEmployeeMap = {};
  employees.forEach(emp => {
    const deptVal = emp.department;
    const depts = Array.isArray(deptVal) ? deptVal : (deptVal ? [deptVal] : ["Unassigned"]);
    depts.forEach(key => {
      if (!deptEmployeeMap[key]) deptEmployeeMap[key] = [];
      deptEmployeeMap[key].push(emp);
    });
  });

  const enriched = departments.map(d => {
    const members = (deptEmployeeMap[d.name] || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return {
      ...d,
      members, // full roster including former staff — the member drawer deliberately still shows them, grayed out
      // Card headcount excludes offboarded staff, per the standing
      // "offboarded employees don't count toward current totals" rule
      // (they were still inflating this number even though the drawer
      // correctly grays them out as "Former").
      activeCount: members.filter(e => empExitStatus(e) !== "offboarded").length,
      manager: employees.find(e => e._id === d.head_id || (e.role === "manager" && (
        Array.isArray(e.department) ? e.department.includes(d.name) : e.department === d.name
      ))) || null,
    };
  }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const totalEmployees = employees.filter(e => empExitStatus(e) !== "offboarded").length;
  const noManager = enriched.filter(d => !d.manager).length;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <TbSitemap style={{ color: "var(--red)" }} /> Departments
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Manage your organisation's departments, assign heads, and view team composition.</p>
        </div>
        {canWrite && (
          <button className="btn" onClick={openAddDept} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px" }}>
            <TbPlus size={11} /> Add Department
          </button>
        )}
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Departments", value: enriched.length, color: "var(--brand)", bg: "var(--brand-light)" },
          { label: "Total Employees", value: totalEmployees, color: "#16a34a", bg: "#dcfce7" },
          { label: "Needs a Manager", value: noManager, color: "#d97706", bg: "#fef9c3" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Department cards grid */}
      {deptLoading ? (
        <SkeletonCards count={6} />
      ) : enriched.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0" }}>
          <TbSitemap size={40} style={{ color: "#cbd5e1", marginBottom: 16 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#94a3b8", margin: 0 }}>No departments yet</p>
          {canWrite && <p style={{ fontSize: 13, color: "#cbd5e1", marginTop: 6 }}>Click "Add Department" to create your first one.</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
          {enriched.map(dept => {
            const clr = getColor(dept.name);
            return (
              <div key={dept._id} style={{ background: "#fff", border: `1px solid ${clr.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "box-shadow 0.2s, transform 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}>

                <div style={{ height: 5, background: `linear-gradient(90deg, ${clr.accent}, ${clr.accent}88)` }} />

                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: clr.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20, fontWeight: 800, color: clr.text }}>
                      {dept.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dept.name}</div>
                      {dept.description ? (
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{dept.description}</div>
                      ) : (
                        <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 3, fontStyle: "italic" }}>No description</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, background: clr.bg, borderRadius: 9, padding: "8px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: clr.text }}>{dept.activeCount}</div>
                      <div style={{ fontSize: 10, color: clr.text, opacity: 0.75, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Employees</div>
                    </div>
                    <div style={{ flex: 2, background: "#f8fafc", borderRadius: 9, padding: "8px 12px" }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 3 }}>Department Head</div>
                      {dept.manager ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,var(--brand),var(--brand-dark))", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {dept.manager.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dept.manager.name}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>⚠ Not assigned</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 7 }}>
                    <button
                      onClick={() => setDeptMembersOpen(dept)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${clr.border}`, background: clr.bg, color: clr.text, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}
                    >
                      <TbEye size={11} /> View Members
                    </button>
                    {canWrite && (
                      <button
                        onClick={() => setWorkTypesDept(dept.name)}
                        title="Configure work types"
                        style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <TbTags size={11} />
                      </button>
                    )}
                    {canWrite && (
                      <button
                        onClick={() => openEditDept(dept)}
                        style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <TbEdit size={11} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => deleteDepartment(dept._id, dept.name)}
                        style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <TbTrash size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD / EDIT DEPARTMENT MODAL ──────────────────────────────── */}
      {deptModal && (
        <div className="modal-overlay" style={{ zIndex: 5000 }}>
          <div className="modal-card" style={{ padding: 0, width: 480 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                  {deptEditId ? "Edit Department" : "Add Department"}
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#64748b" }}>
                  {deptEditId ? "Update department details." : "Create a new department for your organisation."}
                </p>
              </div>
              <button onClick={() => setDeptModal(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", flexShrink: 0 }}>
                <TbX size={13} />
              </button>
            </div>
            <form onSubmit={saveDepartment} style={{ padding: "20px 24px 24px" }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Department Name *</label>
                <input
                  className="modern-input"
                  required
                  placeholder="e.g. Engineering, Marketing, Finance"
                  value={deptForm.name}
                  onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Description <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
                <textarea
                  className="modern-input"
                  style={{ minHeight: 80, resize: "vertical" }}
                  placeholder="Brief description of this department's role..."
                  value={deptForm.description}
                  onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>
                  Department Head(s) <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional — pick one or more; each is treated as a manager of this department)</span>
                </label>
                {(() => {
                  const eligible = (employees || []).filter(e => !e.exit_status && !e.resignation?.last_working_day);
                  const picked = deptForm.head_ids || [];
                  const pickedNames = eligible.filter(e => picked.includes(e._id)).map(e => e.name);
                  const q = headPickerSearch.trim().toLowerCase();
                  const shown = q ? eligible.filter(e => (e.name || "").toLowerCase().includes(q)) : eligible;
                  const toggle = (id) => setDeptForm(f => ({ ...f, head_ids: (f.head_ids || []).includes(id) ? f.head_ids.filter(x => x !== id) : [...(f.head_ids || []), id] }));
                  return (
                    <div style={{ position: "relative" }}>
                      <button type="button" onClick={() => setHeadPickerOpen(o => !o)}
                        style={{ width: "100%", textAlign: "left", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 13px", cursor: "pointer", fontSize: 13.5, color: picked.length ? "#0f172a" : "#94a3b8" }}>
                        {picked.length === 0 ? "— Select department head(s) —"
                          : picked.length <= 3 ? pickedNames.join(", ")
                          : `${picked.length} selected`}
                      </button>
                      {headPickerOpen && (
                        <div style={{ position: "absolute", zIndex: 30, top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 10px 28px rgba(0,0,0,0.15)", maxHeight: 260, display: "flex", flexDirection: "column" }}>
                          <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                            <input autoFocus className="modern-input" style={{ margin: 0 }} placeholder="Search people…" value={headPickerSearch} onChange={e => setHeadPickerSearch(e.target.value)} />
                          </div>
                          <div style={{ overflowY: "auto", padding: 4 }}>
                            {shown.length === 0 ? (
                              <div style={{ padding: 14, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No matches.</div>
                            ) : shown.map(e => (
                              <label key={e._id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                                <input type="checkbox" checked={picked.includes(e._id)} onChange={() => toggle(e._id)} />
                                <span style={{ flex: 1 }}>{e.name}
                                  <span style={{ color: "#94a3b8" }}> · {Array.isArray(e.department) ? e.department.join(", ") : (e.department || e.role || "—")}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                          <div style={{ padding: 8, borderTop: "1px solid #f1f5f9", textAlign: "right" }}>
                            <button type="button" className="btn ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => setHeadPickerOpen(false)}>Done</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn" style={{ flex: 1 }} disabled={deptSaving}>
                  {deptSaving ? "Saving..." : deptEditId ? "Save Changes" : "Create Department"}
                </button>
                <button type="button" className="btn ghost" onClick={() => setDeptModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MEMBERS QUICK-VIEW DRAWER ─────────────────────────────────── */}
      {deptMembersOpen && (() => {
        const d = deptMembersOpen;
        const clr = getColor(d.name);
        const activeMembers = d.members.filter(m => !empExitStatus(m));
        const formerMembers = d.members.filter(m => !!empExitStatus(m));
        const managers = activeMembers.filter(m => m.role === "manager");
        const regulars = activeMembers.filter(m => m.role !== "manager");
        return (
          <>
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 6000, backdropFilter: "blur(2px)" }} onClick={() => setDeptMembersOpen(null)} />
            <div style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 400, maxWidth: "95vw", background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)", zIndex: 6001, display: "flex", flexDirection: "column", animation: "slideFromRight 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
              <div style={{ background: `linear-gradient(135deg, #0d1520, #1e293b)`, padding: "20px 20px 18px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: clr.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: clr.text, flexShrink: 0 }}>
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                        {activeMembers.length} active{formerMembers.length > 0 ? `, ${formerMembers.length} former` : ""}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setDeptMembersOpen(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                    <TbX size={13} />
                  </button>
                </div>
                {d.description && <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5 }}>{d.description}</p>}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                {d.members.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 16px" }}>
                    <TbUsers size={36} style={{ color: "#cbd5e1", marginBottom: 12 }} />
                    <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>No employees in this department</p>
                  </div>
                ) : (
                  <>
                    {managers.length > 0 && (
                      <>
                        <p style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px", margin: "0 0 10px" }}>Management</p>
                        {managers.map(emp => (
                          <MemberRow key={emp._id} emp={emp} badge={{ label: "Manager", bg: "var(--brand-light)", color: "var(--brand)" }} />
                        ))}
                        {regulars.length > 0 && <div style={{ height: 1, background: "#f1f5f9", margin: "14px 0" }} />}
                      </>
                    )}
                    {regulars.length > 0 && (
                      <>
                        <p style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px", margin: "0 0 10px" }}>Team Members</p>
                        {regulars.map(emp => (
                          <MemberRow key={emp._id} emp={emp} />
                        ))}
                      </>
                    )}
                    {formerMembers.length > 0 && (
                      <>
                        <div style={{ height: 1, background: "#f1f5f9", margin: "14px 0" }} />
                        <p style={{ fontSize: 10.5, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.7px", margin: "0 0 10px" }}>Former / Off-boarded</p>
                        {formerMembers.map(emp => {
                          const st = empExitStatus(emp);
                          return (
                            <MemberRow
                              key={emp._id}
                              emp={emp}
                              exitLabel={st === "offboarded" ? "Off-boarded" : "Serving Notice"}
                            />
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </div>

              <div style={{ padding: "14px 20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10 }}>
                {canWrite && (
                  <button className="btn" style={{ flex: 1 }} onClick={() => { openEditDept(d); setDeptMembersOpen(null); }}>
                    <TbEdit size={12} /> Edit Department
                  </button>
                )}
                <button className="btn ghost" onClick={() => setDeptMembersOpen(null)}>Close</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── WORK TYPES MODAL ─────────────────────────────────────────── */}
      {workTypesDept && (
        <div className="modal-overlay" onClick={() => setWorkTypesDept(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ padding: 24, width: 480 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
              <button onClick={() => setWorkTypesDept(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><TbX size={15} /></button>
            </div>
            <WorkTypesManager token={token} department={workTypesDept} canEdit={canWrite} />
          </div>
        </div>
      )}
    </div>
  );
}
