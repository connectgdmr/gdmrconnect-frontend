import React, { useState, useEffect } from "react";
import {
  FaPlus, FaTimes, FaEdit, FaTrash, FaGraduationCap,
  FaBook, FaVideo, FaFileAlt, FaLink, FaUsers,
  FaChevronDown, FaChevronRight, FaCheckCircle, FaSearch,
} from "react-icons/fa";

const BASE = "https://gdmrconnect-backend-production.up.railway.app/api";

const CATEGORIES = ["Technical", "Soft Skills", "Compliance", "Leadership", "Product", "Other"];
const LESSON_TYPES = ["Video", "Document", "Article"];
const LESSON_ICON = { Video: <FaVideo />, Document: <FaFileAlt />, Article: <FaLink /> };

const CAT_COLORS = {
  Technical:   { color: "#2563eb", bg: "#eff6ff" },
  "Soft Skills": { color: "#7c3aed", bg: "#f5f3ff" },
  Compliance:  { color: "#dc2626", bg: "#fef2f2" },
  Leadership:  { color: "#d97706", bg: "#fffbeb" },
  Product:     { color: "#0891b2", bg: "#ecfeff" },
  Other:       { color: "#64748b", bg: "#f8fafc" },
};

function ProgressBar({ pct }) {
  return (
    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", minWidth: 80 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#16a34a" : "#3b82f6", borderRadius: 99, transition: "width 0.5s" }} />
    </div>
  );
}

const blankCourse  = () => ({ title: "", description: "", category: "Technical", thumbnailUrl: "" });
const blankModule  = () => ({ title: "", lessons: [blankLesson()] });
const blankLesson  = () => ({ title: "", type: "Video", url: "", content: "" });

export default function AdminLMS({ token, employees = [], departments = [] }) {
  const [tab, setTab]           = useState("courses");
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(false);

  const [builderMode, setBuilderMode] = useState("create");
  const [editCourseId, setEditCourseId] = useState(null);
  const [courseForm, setCourseForm]   = useState(blankCourse());
  const [modules, setModules]         = useState([blankModule()]);
  const [expandedMod, setExpandedMod] = useState(0);
  const [saving, setSaving]           = useState(false);

  const [assignCourseId, setAssignCourseId]   = useState("");
  const [assignTarget, setAssignTarget]       = useState("department");
  const [assignDept, setAssignDept]           = useState("");
  const [assignEmpIds, setAssignEmpIds]       = useState([]);
  const [assignSaving, setAssignSaving]       = useState(false);
  const [assignMsg, setAssignMsg]             = useState("");

  const [progress, setProgress]     = useState([]);
  const [progLoading, setProgLoading] = useState(false);
  const [progCourse, setProgCourse] = useState("all");
  const [progDept, setProgDept]     = useState("all");
  const [progSearch, setProgSearch] = useState("");

  const [msg, setMsg] = useState({ text: "", type: "" });
  const flash = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3500); };

  const toArr = (d) => Array.isArray(d) ? d : (d?.courses || d?.progress || d?.data || []);

  // Normalize whatever shape the backend returns into the builder's expected structure
  const normalizeModules = (raw) => {
    const mods = Array.isArray(raw) ? raw : [];
    if (mods.length === 0) return [blankModule()];
    return mods.map(m => ({
      title: m.title || m.name || m.module_title || "",
      lessons: (Array.isArray(m.lessons) ? m.lessons : (m.module_lessons || [])).map(l => ({
        title:   l.title || l.name || l.lesson_title || "",
        type:    l.type || l.lesson_type || "Video",
        url:     l.url || l.resource_url || l.link || "",
        content: l.content || l.text || "",
        _id:     l._id || l.id,
      })),
    })).map(m => m.lessons.length ? m : { ...m, lessons: [blankLesson()] });
  };

  async function loadCourses() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/lms/courses`, { headers: { Authorization: `Bearer ${token}` } });
      setCourses(r.ok ? toArr(await r.json()) : []);
    } catch { setCourses([]); } finally { setLoading(false); }
  }

  async function loadProgress() {
    setProgLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/lms/progress`, { headers: { Authorization: `Bearer ${token}` } });
      setProgress(r.ok ? toArr(await r.json()) : []);
    } catch { setProgress([]); } finally { setProgLoading(false); }
  }

  useEffect(() => { loadCourses(); }, []);
  useEffect(() => { if (tab === "progress") loadProgress(); }, [tab]);

  function startCreate() {
    setBuilderMode("create"); setEditCourseId(null);
    setCourseForm(blankCourse()); setModules([blankModule()]); setExpandedMod(0);
    setTab("builder");
  }

  function startEdit(c) {
    setBuilderMode("edit"); setEditCourseId(c._id);
    setCourseForm({
      title: c.title || "",
      description: c.description || "",
      category: c.category || "Technical",
      thumbnailUrl: c.thumbnail_url || c.thumbnailUrl || "",
    });
    setModules(normalizeModules(c.modules || c.course_modules));
    setExpandedMod(0);
    setTab("builder");
  }

  async function saveCourse(e) {
    e.preventDefault();
    if (!courseForm.title) return flash("Course title required.", "error");
    setSaving(true);

    // Build a clean modules array — drop blank lessons, keep explicit field names
    const cleanModules = modules
      .map(m => ({
        title: (m.title || "").trim(),
        lessons: (m.lessons || [])
          .filter(l => (l.title || "").trim() || (l.url || "").trim())
          .map(l => ({
            title:   (l.title || "").trim(),
            type:    l.type || "Video",
            url:     (l.url || "").trim(),
            content: (l.content || "").trim(),
          })),
      }))
      .filter(m => m.title || m.lessons.length);

    const payload = {
      title: courseForm.title.trim(),
      description: courseForm.description || "",
      category: courseForm.category || "Technical",
      thumbnail_url: courseForm.thumbnailUrl || "",
      modules: cleanModules,
    };
    try {
      const r = await fetch(
        `${BASE}/admin/lms/courses${editCourseId ? `/${editCourseId}` : ""}`,
        { method: editCourseId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }
      );
      if (r.ok) { flash(editCourseId ? "Course updated." : "Course created."); loadCourses(); setTab("courses"); }
      else { const d = await r.json(); flash(d.message || "Save failed.", "error"); }
    } catch { flash("Network error.", "error"); } finally { setSaving(false); }
  }

  async function deleteCourse(id) {
    if (!window.confirm("Delete this course?")) return;
    await fetch(`${BASE}/admin/lms/courses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadCourses();
  }

  async function assignCourse(e) {
    e.preventDefault();
    if (!assignCourseId) return setAssignMsg("Select a course.");
    setAssignSaving(true); setAssignMsg("");
    const body = assignTarget === "department"
      ? { department: assignDept }
      : { employee_ids: assignEmpIds };
    try {
      const r = await fetch(`${BASE}/admin/lms/courses/${assignCourseId}/assign`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
      });
      if (r.ok) { setAssignMsg("Course assigned successfully!"); setAssignCourseId(""); setAssignEmpIds([]); }
      else { const d = await r.json(); setAssignMsg(d.message || "Assignment failed."); }
    } catch { setAssignMsg("Network error."); } finally { setAssignSaving(false); }
  }

  // Module helpers
  const updateModule = (mi, data) => setModules(prev => prev.map((m, i) => i === mi ? { ...m, ...data } : m));
  const addLesson    = (mi) => updateModule(mi, { lessons: [...modules[mi].lessons, blankLesson()] });
  const updateLesson = (mi, li, data) => updateModule(mi, { lessons: modules[mi].lessons.map((l, i) => i === li ? { ...l, ...data } : l) });
  const removeLesson = (mi, li) => updateModule(mi, { lessons: modules[mi].lessons.filter((_, i) => i !== li) });

  const TABS = [
    { key: "courses",  label: "Courses" },
    { key: "builder",  label: builderMode === "edit" ? "Edit Course" : "Create Course" },
    { key: "assign",   label: "Assign Courses" },
    { key: "progress", label: "Employee Progress" },
  ];

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{
      padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
      background: tab === key ? "var(--red)" : "transparent",
      color: tab === key ? "#fff" : "#64748b", transition: "all 0.15s",
    }}>{label}</button>
  );

  const filteredProgress = progress.filter(p => {
    const matchCourse = progCourse === "all" || p.course_id === progCourse;
    const matchDept   = progDept   === "all" || p.department === progDept;
    const matchSearch = !progSearch || p.employee_name?.toLowerCase().includes(progSearch.toLowerCase());
    return matchCourse && matchDept && matchSearch;
  });

  const uniqueDepts = [...new Set(progress.map(p => p.department).filter(Boolean))];

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--red)" }}>Learning Management System</h3>
          <p className="small">Create courses, track employee learning journeys</p>
        </div>
        <button className="btn" onClick={startCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FaPlus size={11} /> New Course
        </button>
      </div>

      {msg.text && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: msg.type === "error" ? "#fef2f2" : "#f0fdf4",
          color: msg.type === "error" ? "#b91c1c" : "#16a34a",
          border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
        {TABS.map(t => tabBtn(t.key, t.label))}
      </div>

      {/* ── Courses list ── */}
      {tab === "courses" && (
        loading ? <div className="loader-container"><div className="loader" /></div>
        : courses.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <FaGraduationCap size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ margin: 0 }}>No courses yet. Create the first one.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {courses.map(c => {
              const cat = CAT_COLORS[c.category] || CAT_COLORS.Other;
              return (
                <div key={c._id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 0, overflow: "hidden" }}>
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} />
                  ) : (
                    <div style={{ height: 80, background: `linear-gradient(135deg, ${cat.bg}, #fff)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FaBook size={28} color={cat.color} />
                    </div>
                  )}
                  <div style={{ padding: "0 16px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, background: cat.bg, padding: "2px 8px", borderRadius: 4 }}>{c.category}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn-action btn-edit" onClick={() => startEdit(c)} title="Edit"><FaEdit /></button>
                        <button className="btn-action btn-remove" onClick={() => deleteCourse(c._id)} title="Delete"><FaTrash /></button>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{c.title}</div>
                    {c.description && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{c.description.slice(0, 70)}{c.description.length > 70 ? "…" : ""}</p>}
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.modules?.length || 0} modules · {c.modules?.reduce((s, m) => s + (m.lessons?.length || 0), 0) || 0} lessons</div>
                    <button className="btn ghost" style={{ marginTop: 10, fontSize: 12, width: "100%" }} onClick={() => { setAssignCourseId(c._id); setTab("assign"); }}>
                      <FaUsers size={11} /> Assign to Employees
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Course Builder ── */}
      {tab === "builder" && (
        <form onSubmit={saveCourse}>
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "flex-start" }}>
            {/* Left: course meta */}
            <div className="card">
              <h4 style={{ margin: "0 0 16px", color: "#0f172a" }}>Course Details</h4>
              <div style={{ marginBottom: 13 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Title *</label>
                <input className="modern-input" value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g. React Fundamentals" required />
              </div>
              <div style={{ marginBottom: 13 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Description</label>
                <textarea className="modern-input" value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="What will employees learn?" style={{ minHeight: 90 }} />
              </div>
              <div style={{ marginBottom: 13 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Category</label>
                <select className="modern-input" value={courseForm.category} onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Thumbnail URL <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
                <input className="modern-input" type="url" value={courseForm.thumbnailUrl} onChange={e => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })} placeholder="https://…" />
              </div>
              <button className="btn" type="submit" disabled={saving} style={{ width: "100%" }}>
                {saving ? "Saving…" : builderMode === "edit" ? "Save Changes" : "Create Course"}
              </button>
              <button className="btn ghost" type="button" style={{ width: "100%", marginTop: 8 }} onClick={() => setTab("courses")}>Cancel</button>
            </div>

            {/* Right: modules */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ margin: 0, color: "#0f172a" }}>Modules ({modules.length})</h4>
                <button type="button" className="btn ghost" onClick={() => { setModules([...modules, blankModule()]); setExpandedMod(modules.length); }} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <FaPlus size={10} /> Add Module
                </button>
              </div>

              {modules.map((mod, mi) => (
                <div key={mi} className="card" style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", background: "#fafafa" }}
                    onClick={() => setExpandedMod(expandedMod === mi ? null : mi)}
                  >
                    {expandedMod === mi ? <FaChevronDown size={12} color="#94a3b8" /> : <FaChevronRight size={12} color="#94a3b8" />}
                    <input
                      className="modern-input"
                      value={mod.title}
                      onChange={e => { e.stopPropagation(); updateModule(mi, { title: e.target.value }); }}
                      onClick={e => e.stopPropagation()}
                      placeholder={`Module ${mi + 1} title`}
                      style={{ flex: 1, margin: 0, fontWeight: 600 }}
                    />
                    <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>{mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}</span>
                    {modules.length > 1 && (
                      <button type="button" onClick={e => { e.stopPropagation(); setModules(prev => prev.filter((_, i) => i !== mi)); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                        <FaTimes size={12} />
                      </button>
                    )}
                  </div>

                  {expandedMod === mi && (
                    <div style={{ padding: "0 16px 16px" }}>
                      {mod.lessons.map((ls, li) => (
                        <div key={li} style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr auto", gap: 8, alignItems: "center", marginTop: 10 }}>
                          <input className="modern-input" value={ls.title} onChange={e => updateLesson(mi, li, { title: e.target.value })} placeholder={`Lesson ${li + 1} title`} style={{ margin: 0 }} />
                          <select className="modern-input" value={ls.type} onChange={e => updateLesson(mi, li, { type: e.target.value })} style={{ margin: 0 }}>
                            {LESSON_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <input className="modern-input" value={ls.url} onChange={e => updateLesson(mi, li, { url: e.target.value })} placeholder={ls.type === "Article" ? "URL or text" : "Resource URL"} style={{ margin: 0 }} />
                          {mod.lessons.length > 1 && (
                            <button type="button" onClick={() => removeLesson(mi, li)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }}>
                              <FaTimes size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addLesson(mi)} style={{ marginTop: 10, background: "none", border: "1px dashed #cbd5e1", borderRadius: 7, padding: "6px 14px", cursor: "pointer", color: "#64748b", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                        <FaPlus size={9} /> Add Lesson
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      )}

      {/* ── Assign Courses ── */}
      {tab === "assign" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h4 style={{ margin: "0 0 18px", color: "#0f172a" }}>Assign a Course</h4>
          {assignMsg && (
            <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: assignMsg.includes("success") ? "#f0fdf4" : "#fef2f2",
              color: assignMsg.includes("success") ? "#16a34a" : "#b91c1c",
              border: `1px solid ${assignMsg.includes("success") ? "#bbf7d0" : "#fecaca"}` }}>
              {assignMsg}
            </div>
          )}
          <form onSubmit={assignCourse}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Course</label>
              <select className="modern-input" value={assignCourseId} onChange={e => setAssignCourseId(e.target.value)} required>
                <option value="">-- Select Course --</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 8 }}>Assign To</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["department", "employees"].map(t => (
                  <button key={t} type="button" onClick={() => setAssignTarget(t)} style={{
                    flex: 1, padding: "8px 0", borderRadius: 7, border: `1.5px solid ${assignTarget === t ? "var(--red)" : "#e2e8f0"}`,
                    background: assignTarget === t ? "#fef2f2" : "#fff", color: assignTarget === t ? "var(--red)" : "#475569",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}>
                    {t === "department" ? "Whole Department" : "Specific Employees"}
                  </button>
                ))}
              </div>
            </div>

            {assignTarget === "department" ? (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Department</label>
                <select className="modern-input" value={assignDept} onChange={e => setAssignDept(e.target.value)} required>
                  <option value="">-- Select Department --</option>
                  {[...new Set(employees.map(e => e.department).filter(Boolean))].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Employees</label>
                <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
                  {employees.map(emp => (
                    <label key={emp._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", cursor: "pointer" }}>
                      <input type="checkbox" checked={assignEmpIds.includes(emp._id)} onChange={e => setAssignEmpIds(e.target.checked ? [...assignEmpIds, emp._id] : assignEmpIds.filter(id => id !== emp._id))} />
                      <span style={{ fontSize: 13 }}>{emp.name}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{emp.department}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button className="btn" type="submit" disabled={assignSaving} style={{ width: "100%" }}>
              {assignSaving ? "Assigning…" : "Assign Course"}
            </button>
          </form>
        </div>
      )}

      {/* ── Employee Progress ── */}
      {tab === "progress" && (
        <div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
              <input className="modern-input" placeholder="Search employee…" value={progSearch} onChange={e => setProgSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
            </div>
            <select className="modern-input" value={progCourse} onChange={e => setProgCourse(e.target.value)} style={{ margin: 0, flex: 1, minWidth: 160 }}>
              <option value="all">All Courses</option>
              {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
            <select className="modern-input" value={progDept} onChange={e => setProgDept(e.target.value)} style={{ margin: 0, flex: 1, minWidth: 140 }}>
              <option value="all">All Departments</option>
              {uniqueDepts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {progLoading ? <div className="loader-container"><div className="loader" /></div>
          : filteredProgress.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <FaGraduationCap size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p>No progress data yet. Assign courses to employees to see their journey.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="styled-table-global">
                  <thead>
                    <tr><th>Employee</th><th>Department</th><th>Course</th><th>Progress</th><th>Last Activity</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {filteredProgress.map((row, i) => {
                      const rawPct = row.percent_complete ?? row.percentComplete ?? row.progress ?? row.completion ?? row.percent;
                      const total  = row.total_lessons ?? row.totalLessons;
                      const done   = row.completed_lessons ?? row.completedLessons ?? (Array.isArray(row.completed_lessons) ? row.completed_lessons.length : undefined);
                      const pct = Math.round(
                        rawPct != null ? rawPct
                        : (total ? (done || 0) / total * 100 : 0)
                      );
                      const statusLabel = pct >= 100 ? "Completed" : pct > 0 ? "In Progress" : "Not Started";
                      const statusColor = pct >= 100 ? "#16a34a" : pct > 0 ? "#2563eb" : "#94a3b8";
                      return (
                        <tr key={i}>
                          <td><div style={{ fontWeight: 600 }}>{row.employee_name}</div></td>
                          <td style={{ fontSize: 13, color: "#64748b" }}>{row.department || "—"}</td>
                          <td style={{ fontSize: 13 }}>{row.course_title}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <ProgressBar pct={pct} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", minWidth: 32 }}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: "#94a3b8" }}>{row.last_activity ? new Date(row.last_activity).toLocaleDateString("en-GB") : "—"}</td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, display: "flex", alignItems: "center", gap: 4 }}>
                              {pct >= 100 && <FaCheckCircle size={11} />} {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
