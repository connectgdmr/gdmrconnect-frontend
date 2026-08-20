import React, { useState, useEffect, useCallback } from "react";
import {
  TbEdit, TbCircleCheck, TbSquareCheck, TbSquare, TbClipboardList,
  TbPlus, TbTrash, TbX, TbChartLine, TbEye, TbShare, TbDownload, TbBuilding,
} from "react-icons/tb";
import { RATING_SCALE, OVERALL_RATINGS, getRatingInfo } from "../constants";

const TABS = [
  { key: "reviews",     label: "Reviews" },
  { key: "builder",     label: "Build PMS" },
  { key: "calibration", label: "Calibration" },
];

// Same "offboarded" rule used elsewhere in the app (AdminPayroll, AdminInsights, etc.):
// notice given + last working day already passed.
function isOffboarded(emp) {
  const lwd = emp?.resignation?.last_working_day;
  if (!emp?.resignation?.notice_date || !lwd) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(lwd) < today;
}

/**
 * Unified PMS workspace — Build / Review / Calibrate in one page, shared between
 * ManagerDashboard (scope="manager") and AdminDashboard (scope="admin").
 *
 * Ownership & sharing model (see backend prompt / app.py changes):
 *   - A review's visibility to admin is governed by `shared_with_admin`.
 *   - Reviews from a manager-built template start private to that manager;
 *     the "Share with Admin" button in the review modal flips that flag.
 *   - Reviews from an admin-built template are auto-shared (visible to admin
 *     immediately) AND still visible to the employee's manager via the normal
 *     department-scoped /api/manager/pms query — dual visibility, no bypass.
 *   - Manager scope always calls /api/manager/pms (department-scoped, unchanged).
 *   - Admin scope calls /api/admin/pms (shared_with_admin: true only), grouped
 *     into department boxes here on the client.
 */
export default function PMSWorkspace({ token, api, scope, assignablePool = [] }) {
  const isAdmin = scope === "admin";
  const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
  const activePool = assignablePool.filter(e => !isOffboarded(e)); // never assign PMS to off-boarded staff
  const empDept = (e) => Array.isArray(e.department) ? e.department[0] : (e.department || "");
  const [tab, setTab] = useState("reviews");

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [openDept, setOpenDept] = useState(null); // admin scope: which department box is expanded

  // ── Builder state ──────────────────────────────────────────────────────
  const [templateSessions, setTemplateSessions] = useState([]);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [assignDeptFilter, setAssignDeptFilter] = useState("all");
  const [assignSearch, setAssignSearch] = useState("");
  const [cycleName, setCycleName] = useState("");
  const [cycleDueDate, setCycleDueDate] = useState("");

  // ── Review/scoring modal state ─────────────────────────────────────────
  const [managerScores, setManagerScores] = useState({});
  const [managerFeedback, setManagerFeedback] = useState("");
  const [overallRating, setOverallRating] = useState("");
  const [developmentPlan, setDevelopmentPlan] = useState("");
  const [managerQuestionComments, setManagerQuestionComments] = useState({});
  const [viewPMSModalOpen, setViewPMSModalOpen] = useState(false);
  const [selectedPMS, setSelectedPMS] = useState(null);
  const [sharing, setSharing] = useState(false);

  // ── Calibration + export state ─────────────────────────────────────────
  const [calibrationData, setCalibrationData] = useState([]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const endpoint = isAdmin ? "/api/admin/pms" : "/api/manager/pms";
      const res = await fetch(`${baseUrl}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      setReviews(res.ok ? await res.json() : []);
    } catch { setReviews([]); }
    finally { setLoadingReviews(false); }
  }, [baseUrl, token, isAdmin]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  useEffect(() => {
    if (tab !== "calibration") return;
    fetch(`${baseUrl}/api/manager/pms-calibration?month=${reportMonth}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setCalibrationData)
      .catch(() => setCalibrationData([]));
  }, [tab, reportMonth, baseUrl, token]);

  // ============================================================================
  // BUILDER LOGIC
  // ============================================================================
  const handleAddSession = () => setTemplateSessions([...templateSessions, { name: "", weight: 20, questions: [{ text: "", type: "scale" }] }]);
  const handleRemoveSession = (sIdx) => setTemplateSessions(templateSessions.filter((_, i) => i !== sIdx));
  const handleSessionNameChange = (sIdx, name) => { const s = [...templateSessions]; s[sIdx].name = name; setTemplateSessions(s); };
  const handleSessionWeightChange = (sIdx, weight) => { const s = [...templateSessions]; s[sIdx].weight = parseInt(weight) || 0; setTemplateSessions(s); };
  const handleAddQuestion = (sIdx) => { const s = [...templateSessions]; s[sIdx].questions.push({ text: "", type: "scale" }); setTemplateSessions(s); };
  const handleRemoveQuestion = (sIdx, qIdx) => { const s = [...templateSessions]; s[sIdx].questions = s[sIdx].questions.filter((_, i) => i !== qIdx); setTemplateSessions(s); };
  const handleQuestionChange = (sIdx, qIdx, field, val) => { const s = [...templateSessions]; s[sIdx].questions[qIdx][field] = val; setTemplateSessions(s); };

  const toggleEmployeeAssignment = (empId) => setAssignedEmployees(a => a.includes(empId) ? a.filter(id => id !== empId) : [...a, empId]);
  // "All" / "Clear" act on whatever the department + search filters currently show,
  // so e.g. picking a department then "All" assigns just that department.
  const selectAllEmployees = (visible) => setAssignedEmployees(a => [...new Set([...a, ...visible.map(e => e._id)])]);
  const clearAllEmployees = (visible) => { const ids = new Set(visible.map(e => e._id)); setAssignedEmployees(a => a.filter(id => !ids.has(id))); };

  async function savePmsTemplate(e) {
    e.preventDefault();
    if (assignedEmployees.length === 0) { alert("Action Required: Please select at least one employee to assign this evaluation form to."); return; }
    if (templateSessions.length === 0) { alert("Action Required: Please create at least one session with questions."); return; }
    try {
      const res = await fetch(`${baseUrl}/api/admin/pms-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessions: templateSessions, assigned_to: assignedEmployees, cycle_name: cycleName, due_date: cycleDueDate }),
      });
      if (res.ok) {
        alert("Success! PMS Evaluation Form has been assigned and saved.");
        setTemplateSessions([]); setAssignedEmployees([]); setCycleName(""); setCycleDueDate("");
        setTab("reviews");
        loadReviews();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to save template: ${errData.message || "Unknown error"}`);
      }
    } catch { alert("Network error saving PMS template."); }
  }

  // ============================================================================
  // REVIEW & GRADING LOGIC
  // ============================================================================
  function handleViewPMS(pms) {
    setSelectedPMS(pms);
    setManagerFeedback(pms.manager_feedback || "");
    setOverallRating(pms.overall_rating || "");
    setDevelopmentPlan(pms.development_plan || "");
    const scores = {}; const comments = {};
    (pms.manager_scores || []).forEach(m => { scores[m.question] = m.score; });
    (pms.manager_comments || []).forEach(m => { comments[m.question] = m.comment; });
    setManagerScores(scores);
    setManagerQuestionComments(comments);
    setViewPMSModalOpen(true);
  }

  async function finalizePMS(id) {
    const scoresArr = Object.keys(managerScores).map(q => ({ question: q, score: managerScores[q] }));
    if (!managerFeedback.trim()) { alert("Please provide overall remarks and feedback before finalizing."); return; }
    try {
      const res = await fetch(`${baseUrl}/api/manager/finalize-pms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          review_id: id, manager_scores: scoresArr, manager_feedback: managerFeedback,
          overall_rating: overallRating, development_plan: developmentPlan,
          manager_comments: Object.keys(managerQuestionComments).map(q => ({ question: q, comment: managerQuestionComments[q] })),
        }),
      });
      if (res.ok) {
        alert("PMS Review Finalized Successfully!");
        setManagerScores({}); setManagerFeedback(""); setOverallRating(""); setDevelopmentPlan(""); setManagerQuestionComments({});
        setViewPMSModalOpen(false); setSelectedPMS(null);
        loadReviews();
      } else { alert("Failed to finalize review."); }
    } catch (err) { alert(err.message); }
  }

  async function shareWithAdmin(id) {
    setSharing(true);
    try {
      const res = await fetch(`${baseUrl}/api/manager/pms/${id}/share`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSelectedPMS(p => p ? { ...p, shared_with_admin: true } : p);
        setReviews(rs => rs.map(r => r._id === id ? { ...r, shared_with_admin: true } : r));
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || "Could not share this review — that endpoint may not be set up on the backend yet.");
      }
    } catch { alert("Network error while sharing."); }
    finally { setSharing(false); }
  }

  async function shareWithManager(id) {
    setSharing(true);
    try {
      const res = await fetch(`${baseUrl}/api/manager/pms/${id}/share-with-manager`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSelectedPMS(p => p ? { ...p, shared_with_manager: true } : p);
        setReviews(rs => rs.map(r => r._id === id ? { ...r, shared_with_manager: true } : r));
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || "Could not share this review — that endpoint may not be set up on the backend yet.");
      }
    } catch { alert("Network error while sharing."); }
    finally { setSharing(false); }
  }

  async function exportReport() {
    try {
      const res = await fetch(`${baseUrl}/api/admin/export-pms?month=${reportMonth}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to download report data from server.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `PMS_Report_${reportMonth}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert("Export failed: " + err.message); }
  }

  const getGroupedResponses = () => {
    if (!selectedPMS || !selectedPMS.responses) return {};
    const groups = {};
    selectedPMS.responses.forEach(resp => {
      const sName = resp.session_name || "General Evaluation";
      (groups[sName] = groups[sName] || []).push(resp);
    });
    return groups;
  };

  // Admin scope — group the (already share-filtered) review list by department
  const reviewsByDept = {};
  if (isAdmin) {
    reviews.forEach(r => {
      const d = r.department || "Unassigned";
      (reviewsByDept[d] = reviewsByDept[d] || []).push(r);
    });
  }

  const tabBtn = (t) => (
    <button key={t.key} onClick={() => setTab(t.key)} style={{
      padding: "7px 16px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
      background: tab === t.key ? "var(--brand)" : "transparent", color: tab === t.key ? "#fff" : "#64748b",
    }}>{t.label}</button>
  );

  const ReviewRow = ({ p }) => (
    <tr>
      <td style={{ fontWeight: 600 }}>{p.employee_name}</td>
      <td>{p.cycle_name ? `${p.cycle_name} · ${p.month}` : p.month}</td>
      <td>
        {p.overall_rating
          ? <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", fontWeight: 600 }}>{p.overall_rating}</span>
          : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
      </td>
      <td>
        {isAdmin ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: p.owner_role === "manager" ? "#0f766e" : "#7c3aed" }}>
            {p.owner_role === "manager" ? "Shared by manager" : "Built by admin"}
          </span>
        ) : p.shared_with_admin ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>✓ Shared with Admin</span>
        ) : (
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Not shared</span>
        )}
      </td>
      <td>
        <button className="btn-small ghost" style={{ border: "1px solid #e2e8f0", color: "#475569", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => handleViewPMS(p)}>
          <TbEye /> View
        </button>
      </td>
    </tr>
  );

  return (
    <div>
      {/* Header + tabs + export */}
      <div className="card" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)" }}>PMS</h3>
          <p className="small" style={{ margin: "3px 0 0" }}>
            {isAdmin ? "Department-wide performance reviews — shared by managers, or built directly here" : "Build evaluations, review your team, and calibrate scores — all in one place"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 99, padding: 4 }}>
            {TABS.map(tabBtn)}
          </div>
          <input type="month" className="modern-input" style={{ margin: 0, width: "auto" }} value={reportMonth} onChange={e => setReportMonth(e.target.value)} />
          <button className="btn ghost" onClick={exportReport} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, whiteSpace: "nowrap" }}>
            <TbDownload size={11} /> Export
          </button>
        </div>
      </div>

      {/* ── REVIEWS TAB ── */}
      {tab === "reviews" && (
        loadingReviews ? (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading reviews…</div>
        ) : isAdmin ? (
          Object.keys(reviewsByDept).length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
              <TbBuilding size={34} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ margin: 0 }}>No reviews have been shared with admin yet.</p>
              <p style={{ margin: "4px 0 0", fontSize: 12.5 }}>Reviews appear here once a manager clicks "Share with Admin", or once you build a PMS directly.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
              {Object.entries(reviewsByDept).sort(([a], [b]) => a.localeCompare(b)).map(([dept, rows]) => {
                const completed = rows.filter(r => r.status === "Manager Review Completed").length;
                const isOpen = openDept === dept;
                return (
                  <div key={dept} className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <button onClick={() => setOpenDept(isOpen ? null : dept)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--brand-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <TbBuilding color="var(--brand)" size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{dept}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{rows.length} review{rows.length !== 1 ? "s" : ""} · {completed} completed</div>
                      </div>
                    </button>
                    {isOpen && (
                      <div style={{ borderTop: "1px solid #f1f5f9", padding: "8px 16px 14px" }}>
                        {rows.map(p => (
                          <div key={p._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: "1px solid #f8fafc" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{p.employee_name}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.cycle_name ? `${p.cycle_name} · ` : ""}{p.month} · {p.owner_role === "manager" ? "Shared by manager" : "Built by admin"}</div>
                            </div>
                            <button className="btn-small ghost" style={{ border: "1px solid #e2e8f0", color: "#475569", padding: "5px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }} onClick={() => handleViewPMS(p)}>
                              <TbEye size={11} /> View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
              {[
                { count: reviews.filter(p => p.status === "Pending Review").length, label: "Awaiting Review", color: "#f59e0b", bg: "#fffbeb" },
                { count: reviews.filter(p => p.status === "Manager Review Completed").length, label: "Completed", color: "#22c55e", bg: "#f0fdf4" },
                { count: reviews.length, label: "Total Submissions", color: "var(--brand)", bg: "var(--brand-light)" },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: "center", padding: "18px 16px", background: s.bg, border: `1px solid ${s.color}22` }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {reviews.filter(p => p.status === "Pending Review").length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <h4 style={{ margin: "0 0 14px", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }}></span>
                  Awaiting Your Review
                </h4>
                <div style={{ display: "grid", gap: 10 }}>
                  {reviews.filter(p => p.status === "Pending Review").map(p => (
                    <div key={p._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f59e0b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                          {p.employee_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 15 }}>{p.employee_name}</div>
                          <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>{p.cycle_name ? `${p.cycle_name} · ` : ""}{p.month}</div>
                        </div>
                      </div>
                      <button className="btn" style={{ padding: "9px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={() => handleViewPMS(p)}>
                        <TbChartLine /> Review Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <h4 style={{ margin: "0 0 14px", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                Completed Reviews
              </h4>
              {reviews.filter(p => p.status === "Manager Review Completed").length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No completed reviews yet.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="styled-table-global">
                    <thead><tr><th>Employee</th><th>Cycle / Month</th><th>Overall Rating</th><th>Shared</th><th>Action</th></tr></thead>
                    <tbody>
                      {reviews.filter(p => p.status === "Manager Review Completed").map(p => <ReviewRow key={p._id} p={p} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ── BUILD PMS TAB ── */}
      {tab === "builder" && (() => {
        const totalWeight = templateSessions.reduce((sum, s) => sum + (parseInt(s.weight) || 0), 0);
        return (
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg, var(--brand), var(--teal-800))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TbEdit color="#fff" size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>PMS Template Builder</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Design performance evaluation forms with weighted sections and assign them to {isAdmin ? "any employee" : "your team"}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 20, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div>
                  <label className="modern-label">Review Cycle Name</label>
                  <input className="modern-input" placeholder="e.g., Q1 2025, H1 2025, Annual Review 2025" value={cycleName} onChange={e => setCycleName(e.target.value)} />
                </div>
                <div>
                  <label className="modern-label">Submission Due Date</label>
                  <input className="modern-input" type="date" value={cycleDueDate} onChange={e => setCycleDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            {(() => {
              const deptOptions = [...new Set(activePool.map(empDept).filter(Boolean))].sort();
              const visiblePool = activePool
                .filter(e => assignDeptFilter === "all" || empDept(e) === assignDeptFilter)
                .filter(e => !assignSearch || (e.name || "").toLowerCase().includes(assignSearch.toLowerCase()))
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

              // Department is already isolated once a specific filter is picked —
              // grouping only earns its keep across the full "All Departments" list.
              const groupedVisiblePool = assignDeptFilter === "all"
                ? Object.entries(visiblePool.reduce((acc, e) => {
                    const d = empDept(e) || "Unassigned";
                    (acc[d] = acc[d] || []).push(e);
                    return acc;
                  }, {})).sort(([a], [b]) => a.localeCompare(b))
                : [[assignDeptFilter, visiblePool]];

              return (
                <form onSubmit={savePmsTemplate}>
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <h4 style={{ margin: 0, color: "#0f172a" }}>Assign to Employees</h4>
                        <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>Select who should complete this evaluation</p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }} onClick={() => selectAllEmployees(visiblePool)}>
                          <TbSquareCheck size={11} /> {assignDeptFilter === "all" && !assignSearch ? "All" : "Select Shown"}
                        </button>
                        <button type="button" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }} onClick={() => clearAllEmployees(visiblePool)}>
                          <TbSquare size={11} /> {assignDeptFilter === "all" && !assignSearch ? "Clear" : "Clear Shown"}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                      <select className="modern-input" style={{ margin: 0, maxWidth: 220 }} value={assignDeptFilter} onChange={e => setAssignDeptFilter(e.target.value)}>
                        <option value="all">All Departments</option>
                        {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input className="modern-input" style={{ margin: 0, flex: 1, minWidth: 180 }} placeholder="Search employees…" value={assignSearch} onChange={e => setAssignSearch(e.target.value)} />
                    </div>

                    {activePool.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: 8 }}>No employees found.</div>
                    ) : visiblePool.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: 8 }}>No employees match this filter.</div>
                    ) : (
                      // Grouped by department (only when a single department isn't
                      // already isolated via the filter above) and capped to a
                      // scrollable box — a flat wall of 40+ name-pills was the
                      // reported "cluttered" look, this reads as a real list instead.
                      <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fafbfc" }}>
                        {groupedVisiblePool.map(([dept, emps]) => (
                          <div key={dept} style={{ marginBottom: 14 }}>
                            {assignDeptFilter === "all" && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 6 }}>
                                <TbBuilding size={10} /> {dept} <span style={{ fontWeight: 500, color: "#cbd5e1", textTransform: "none" }}>({emps.length})</span>
                              </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                              {emps.map(emp => {
                                const selected = assignedEmployees.includes(emp._id);
                                return (
                                  <label key={emp._id} className={`employee-row-check ${selected ? "selected" : ""}`}>
                                    <input type="checkbox" style={{ display: "none" }} checked={selected} onChange={() => toggleEmployeeAssignment(emp._id)} />
                                    <span className="row-check-avatar">{emp.name?.[0]?.toUpperCase() || "?"}</span>
                                    <span className="row-check-name">{emp.name}</span>
                                    {selected && <TbCircleCheck size={12} style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.9 }} />}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {assignedEmployees.length > 0 && (
                      <div style={{ marginTop: 12, padding: "8px 14px", background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0", fontSize: 13, color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
                        <TbCircleCheck />{assignedEmployees.length} employee{assignedEmployees.length !== 1 ? "s" : ""} selected
                      </div>
                    )}
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: 0, color: "#0f172a" }}>Evaluation Sections</h4>
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>Build weighted sections — total must equal 100%</p>
                  </div>
                  {templateSessions.length > 0 && (
                    <div style={{
                      padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
                      background: totalWeight === 100 ? "#dcfce7" : totalWeight > 100 ? "#fee2e2" : "#fff7ed",
                      color: totalWeight === 100 ? "#166534" : totalWeight > 100 ? "#991b1b" : "#92400e",
                      border: `1px solid ${totalWeight === 100 ? "#86efac" : totalWeight > 100 ? "#fca5a5" : "#fcd34d"}`,
                    }}>
                      {totalWeight}% / 100%
                    </div>
                  )}
                </div>

                {templateSessions.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10, color: "#94a3b8", marginBottom: 16 }}>
                    <TbClipboardList size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
                    <div style={{ fontSize: 15, fontWeight: 500 }}>No sections yet</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Click "Add Section" below to start building</div>
                  </div>
                )}

                {templateSessions.map((session, sIdx) => (
                  <div key={sIdx} style={{ marginBottom: 14, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--red)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {sIdx + 1}
                      </div>
                      <input className="modern-input" style={{ flex: 2, background: "#fff" }}
                        placeholder="Section Title (e.g., Work Quality, Communication Skills)"
                        value={session.name} onChange={e => handleSessionNameChange(sIdx, e.target.value)} required />
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>Weight %</span>
                        <input type="number" min="0" max="100" className="modern-input" style={{ width: 72, textAlign: "center", background: "#fff" }}
                          value={session.weight ?? ""} onChange={e => handleSessionWeightChange(sIdx, e.target.value)} placeholder="20" />
                      </div>
                      <button type="button" style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 6, padding: "7px 10px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center" }} onClick={() => handleRemoveSession(sIdx)}>
                        <TbTrash size={12} />
                      </button>
                    </div>
                    <div style={{ padding: 14 }}>
                      {session.questions.map((q, qIdx) => (
                        <div key={qIdx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                          <div style={{ width: 20, height: 20, borderRadius: 4, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#64748b", fontWeight: 600, flexShrink: 0 }}>
                            {qIdx + 1}
                          </div>
                          <input className="modern-input" style={{ flex: 2 }}
                            placeholder="Question text..." value={q.text}
                            onChange={e => handleQuestionChange(sIdx, qIdx, "text", e.target.value)} required />
                          <select className="modern-input" style={{ flex: 1 }}
                            value={q.type} onChange={e => handleQuestionChange(sIdx, qIdx, "type", e.target.value)}>
                            <option value="scale">Rating Scale (1–5)</option>
                            <option value="descriptive">Descriptive Answer</option>
                            <option value="goals">Goals & Objectives</option>
                          </select>
                          <button type="button" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "8px 6px", flexShrink: 0 }} onClick={() => handleRemoveQuestion(sIdx, qIdx)}>
                            <TbX />
                          </button>
                        </div>
                      ))}
                      <button type="button" style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#f0fdf4", color: "#166534", border: "1px dashed #86efac", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 6 }} onClick={() => handleAddQuestion(sIdx)}>
                        <TbPlus size={10} /> Add Question
                      </button>
                    </div>
                  </div>
                ))}

                <button type="button" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", background: "#f8fafc", color: "#475569", border: "2px dashed #cbd5e1", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", marginTop: templateSessions.length > 0 ? 8 : 0 }} onClick={handleAddSession}>
                  <TbPlus /> Add Section
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button type="button" className="btn ghost" onClick={() => setTab("reviews")}>Cancel</button>
                <button type="submit" className="btn" style={{ padding: "12px 28px", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                  <TbCircleCheck /> Assign & Save Template
                </button>
              </div>
                </form>
              );
            })()}
          </div>
        );
      })()}

      {/* ── CALIBRATION TAB ── */}
      {tab === "calibration" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: "#0f172a" }}>{isAdmin ? "Org-wide" : "Team"} Performance Calibration</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Compare self-assessments vs manager ratings side-by-side</p>
            </div>
          </div>

          {calibrationData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: 10 }}>
              <TbChartLine size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 15, fontWeight: 500 }}>No calibration data for this period</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Complete PMS reviews to see calibration data here</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="styled-table-global">
                <thead>
                  <tr><th>Employee</th><th style={{ textAlign: "center" }}>Self Avg</th><th style={{ textAlign: "center" }}>Manager Avg</th><th style={{ textAlign: "center" }}>Variance</th><th>Overall Rating</th></tr>
                </thead>
                <tbody>
                  {calibrationData.map((row, idx) => {
                    const variance = row.manager_avg != null ? (row.manager_avg - row.self_avg).toFixed(1) : null;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{row.employee_name}</td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: 13 }}>{row.self_avg?.toFixed(1)}/5</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {row.manager_avg != null
                            ? <span style={{ padding: "3px 10px", borderRadius: 20, background: "#fdf4ff", color: "#7e22ce", fontWeight: 700, fontSize: 13 }}>{row.manager_avg?.toFixed(1)}/5</span>
                            : <span style={{ color: "#94a3b8", fontSize: 12 }}>Pending</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {variance != null
                            ? <span style={{ fontWeight: 700, color: parseFloat(variance) >= 0 ? "#22c55e" : "#ef4444" }}>{parseFloat(variance) >= 0 ? "+" : ""}{variance}</span>
                            : "—"}
                        </td>
                        <td>
                          {row.overall_rating
                            ? <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontWeight: 600 }}>{row.overall_rating}</span>
                            : <span style={{ color: "#94a3b8", fontSize: 12 }}>Not Set</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SCORING / VIEW MODAL ── */}
      {viewPMSModalOpen && selectedPMS && (() => {
        const isPending = selectedPMS.status === "Pending Review";
        const grouped = getGroupedResponses();
        const scaleResponses = selectedPMS.responses?.filter(r => r.self_score) || [];
        const selfAvg = scaleResponses.length > 0
          ? (scaleResponses.reduce((s, r) => s + parseFloat(r.self_score || 0), 0) / scaleResponses.length).toFixed(1)
          : null;
        const mgrScores = selectedPMS.manager_scores || [];
        const mgrAvg = mgrScores.length > 0
          ? (mgrScores.reduce((s, m) => s + parseFloat(m.score || 0), 0) / mgrScores.length).toFixed(1)
          : null;

        return (
          <div className="modal-overlay" style={{ zIndex: 4000 }} onClick={() => setViewPMSModalOpen(false)}>
            <div className="modal-card large" onClick={e => e.stopPropagation()} style={{ padding: 0, display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: isPending ? "#fffbeb" : "#f0fdf4", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isPending ? "#92400e" : "#166534", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      {isPending ? "Pending Review" : "Review Completed"}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>{selectedPMS.employee_name}</h3>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                      {selectedPMS.cycle_name ? `${selectedPMS.cycle_name} · ` : ""}{selectedPMS.month}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {!isAdmin && !["admin", "owner"].includes(selectedPMS.owner_role) && (
                      selectedPMS.shared_with_admin ? (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 99, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5 }}>
                          <TbCircleCheck size={10} /> Shared with Admin
                        </span>
                      ) : (
                        <button disabled={sharing} onClick={() => shareWithAdmin(selectedPMS._id)}
                          style={{ fontSize: 11.5, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", border: "1px solid #bbf7d0", borderRadius: 99, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <TbShare size={10} /> {sharing ? "Sharing…" : "Share with Admin"}
                        </button>
                      )
                    )}
                    {isAdmin && ["admin", "owner"].includes(selectedPMS.owner_role) && (
                      selectedPMS.shared_with_manager ? (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 99, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5 }}>
                          <TbCircleCheck size={10} /> Shared with Manager
                        </span>
                      ) : (
                        <button disabled={sharing} onClick={() => shareWithManager(selectedPMS._id)}
                          style={{ fontSize: 11.5, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", border: "1px solid #bbf7d0", borderRadius: 99, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <TbShare size={10} /> {sharing ? "Sharing…" : "Share with Manager"}
                        </button>
                      )
                    )}
                    <button style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569", flexShrink: 0 }} onClick={() => setViewPMSModalOpen(false)}>
                      <TbX size={15} />
                    </button>
                  </div>
                </div>

                {(selfAvg || mgrAvg) && (
                  <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
                    {selfAvg && (
                      <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 14px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Self Average</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#1d4ed8" }}>{selfAvg}<span style={{ fontSize: 12, color: "#94a3b8" }}>/5</span></div>
                      </div>
                    )}
                    {mgrAvg && (
                      <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 14px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Manager Average</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#7e22ce" }}>{mgrAvg}<span style={{ fontSize: 12, color: "#94a3b8" }}>/5</span></div>
                      </div>
                    )}
                    {selectedPMS.overall_rating && (
                      <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 14px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Overall Rating</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>{selectedPMS.overall_rating}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
                {(!selectedPMS.responses || selectedPMS.responses.length === 0) ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No responses in this submission.</div>
                ) : (
                  Object.entries(grouped).map(([sessionName, responsesInSession], sessionIndex) => {
                    const sessionTemplate = selectedPMS.sessions?.find(s => s.name === sessionName);
                    return (
                      <div key={sessionIndex} style={{ marginBottom: 28 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #fecaca" }}>
                          <h5 style={{ margin: 0, color: "var(--red)", fontSize: 15, textTransform: "uppercase", letterSpacing: "0.04em", flex: 1 }}>{sessionName}</h5>
                          {sessionTemplate?.weight && (
                            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#fef2f2", color: "var(--red)", border: "1px solid #fecaca", fontWeight: 700 }}>
                              {sessionTemplate.weight}% weight
                            </span>
                          )}
                        </div>

                        {responsesInSession.map((resp, idx) => {
                          const existingMgrScore = selectedPMS.manager_scores?.find(m => m.question === resp.question);
                          const existingMgrComment = selectedPMS.manager_comments?.find(m => m.question === resp.question);
                          const selfScoreNum = parseInt(resp.self_score);
                          const selfRating = getRatingInfo(selfScoreNum);
                          const isGoalsType = !resp.self_score && !resp.descriptive_answer && resp.goals_text;

                          return (
                            <div key={idx} style={{ marginBottom: 16, background: "#fff", padding: 18, borderRadius: 10, border: "1px solid #e2e8f0", borderLeft: "4px solid var(--red)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 14, marginBottom: 14 }}>{resp.question}</div>

                              {resp.self_score && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: isPending ? 16 : 0 }}>
                                    <div style={{ minWidth: 130 }}>
                                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>SELF RATING</div>
                                      {selfScoreNum > 5 ? (
                                        <div style={{ background: "#f1f5f9", padding: "8px 14px", borderRadius: 8 }}>
                                          <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{resp.self_score}</span>
                                          <span style={{ fontSize: 13, color: "#94a3b8" }}>/10</span>
                                        </div>
                                      ) : (
                                        <div>
                                          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                                            {RATING_SCALE.map(r => (
                                              <div key={r.value} style={{ width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: r.value <= selfScoreNum ? r.color : "#f1f5f9", color: r.value <= selfScoreNum ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 700 }}>{r.value}</div>
                                            ))}
                                          </div>
                                          {selfRating && <div style={{ fontSize: 11, color: selfRating.color, fontWeight: 600 }}>{selfRating.label}</div>}
                                        </div>
                                      )}
                                    </div>

                                    {!isPending && existingMgrScore && (
                                      <div style={{ minWidth: 130 }}>
                                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>MANAGER RATING</div>
                                        {parseInt(existingMgrScore.score) > 5 ? (
                                          <div style={{ background: "#fef2f2", padding: "8px 14px", borderRadius: 8 }}>
                                            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--red)" }}>{existingMgrScore.score}</span>
                                            <span style={{ fontSize: 13, color: "#f87171" }}>/10</span>
                                          </div>
                                        ) : (
                                          <div>
                                            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                                              {RATING_SCALE.map(r => (
                                                <div key={r.value} style={{ width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: r.value <= parseInt(existingMgrScore.score) ? r.color : "#f1f5f9", color: r.value <= parseInt(existingMgrScore.score) ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 700 }}>{r.value}</div>
                                              ))}
                                            </div>
                                            {getRatingInfo(parseInt(existingMgrScore.score)) && (
                                              <div style={{ fontSize: 11, color: getRatingInfo(parseInt(existingMgrScore.score)).color, fontWeight: 600 }}>
                                                {getRatingInfo(parseInt(existingMgrScore.score)).label}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {isPending && (
                                    <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                      <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600, marginBottom: 10 }}>Assign Manager Rating</div>
                                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                                        {RATING_SCALE.map(r => (
                                          <button key={r.value} type="button"
                                            onClick={() => setManagerScores({ ...managerScores, [resp.question]: r.value })}
                                            style={{
                                              padding: "8px 12px", borderRadius: 8, border: "2px solid",
                                              borderColor: managerScores[resp.question] === r.value ? r.color : "#e2e8f0",
                                              background: managerScores[resp.question] === r.value ? r.color : "#fff",
                                              color: managerScores[resp.question] === r.value ? "#fff" : "#475569",
                                              cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", minWidth: 36,
                                            }}>{r.value}</button>
                                        ))}
                                      </div>
                                      {managerScores[resp.question] && (
                                        <div style={{ fontSize: 12, color: getRatingInfo(managerScores[resp.question])?.color, fontWeight: 600 }}>
                                          Selected: {getRatingInfo(managerScores[resp.question])?.label}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {(resp.descriptive_answer || isGoalsType) && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>EMPLOYEE ANSWER</div>
                                  <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                    {resp.descriptive_answer || resp.goals_text}
                                  </div>
                                </div>
                              )}

                              {resp.remarks && (
                                <div style={{ fontSize: 12, color: "#475569", background: "#f1f5f9", padding: "8px 12px", borderRadius: 6, borderLeft: "3px solid #94a3b8", marginBottom: 12 }}>
                                  <strong>Remarks:</strong> {resp.remarks}
                                </div>
                              )}

                              {isPending ? (
                                <div style={{ marginTop: 10 }}>
                                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 6 }}>MANAGER COMMENT (optional)</label>
                                  <textarea
                                    className="modern-input" style={{ minHeight: 60, resize: "vertical", fontSize: 13 }}
                                    placeholder="Add specific feedback for this question..."
                                    value={managerQuestionComments[resp.question] || ""}
                                    onChange={e => setManagerQuestionComments({ ...managerQuestionComments, [resp.question]: e.target.value })}
                                  />
                                </div>
                              ) : (existingMgrComment?.comment && (
                                <div style={{ marginTop: 10, background: "#fdf4ff", padding: "8px 12px", borderRadius: 6, border: "1px solid #e9d5ff", fontSize: 12, color: "#6b21a8", borderLeft: "3px solid #a855f7" }}>
                                  <strong>Manager's Note:</strong> {existingMgrComment.comment}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}

                {isPending && (
                  <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: 24, marginTop: 8 }}>
                    <h4 style={{ margin: "0 0 16px", color: "#0f172a", fontSize: 16 }}>Finalize Evaluation</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div>
                        <label className="modern-label">Overall Performance Rating</label>
                        <select className="modern-input" value={overallRating} onChange={e => setOverallRating(e.target.value)}>
                          <option value="">— Select Rating —</option>
                          {OVERALL_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label className="modern-label">Overall Remarks & Feedback</label>
                      <textarea className="modern-input" style={{ minHeight: 100, resize: "vertical" }}
                        placeholder="Provide constructive, specific feedback summarizing the employee's performance..."
                        value={managerFeedback} onChange={e => setManagerFeedback(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label className="modern-label">Development Plan & Action Items</label>
                      <textarea className="modern-input" style={{ minHeight: 90, resize: "vertical" }}
                        placeholder="Outline key areas for growth and specific action items to improve performance..."
                        value={developmentPlan} onChange={e => setDevelopmentPlan(e.target.value)} />
                    </div>
                    <button className="btn" style={{ width: "100%", fontSize: 16, padding: 16, background: "linear-gradient(135deg, var(--brand), var(--brand-dark))", border: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                      onClick={() => finalizePMS(selectedPMS._id)}>
                      <TbCircleCheck /> Submit Scores & Finalize Review
                    </button>
                  </div>
                )}

                {!isPending && (
                  <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: 20, marginTop: 8 }}>
                    {selectedPMS.overall_rating && (
                      <div style={{ marginBottom: 14, padding: "10px 16px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 10 }}>
                        <TbCircleCheck color="#22c55e" />
                        <div><span style={{ fontSize: 12, color: "#64748b" }}>Overall Rating: </span><strong style={{ color: "#166534" }}>{selectedPMS.overall_rating}</strong></div>
                      </div>
                    )}
                    {selectedPMS.manager_feedback && (
                      <div style={{ marginBottom: 14, padding: 16, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>MANAGER FEEDBACK</div>
                        <p style={{ margin: 0, fontSize: 13, color: "#450a0a", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selectedPMS.manager_feedback}</p>
                      </div>
                    )}
                    {selectedPMS.development_plan && (
                      <div style={{ padding: 16, background: "#f5f3ff", borderRadius: 8, border: "1px solid #e9d5ff" }}>
                        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>DEVELOPMENT PLAN</div>
                        <p style={{ margin: 0, fontSize: 13, color: "#3b0764", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selectedPMS.development_plan}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
