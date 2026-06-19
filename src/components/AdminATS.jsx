import React, { useState, useEffect } from "react";
import {
  FaUserPlus, FaSearch, FaTimes, FaUsers, FaCheckCircle, FaHandshake, FaPercent,
  FaFilePdf, FaLink, FaVideo, FaFolderOpen, FaPaperPlane, FaTrash, FaPlus, FaHistory,
  FaBriefcase, FaEnvelopeOpenText, FaIdBadge,
} from "react-icons/fa";
import { BarChart, DonutChart } from "./Charts";
import { SkeletonStats, SkeletonTable } from "./Skeleton";

const BASE = "https://gdmrconnect-backend-production.up.railway.app/api";

// Recruitment lifecycle statuses (ordered) with grouped colors
const STATUSES = [
  "New Application", "Resume Screening", "Screening Call Scheduled", "Screening Call Completed",
  "Technical Assessment", "Technical Interview", "HR Interview", "Management Interview",
  "Shortlisted", "Documentation Pending", "Offer Discussion", "Offer Released",
  "Offer Accepted", "Joined", "Rejected", "On Hold", "Withdrawn",
];
const STATUS_COLOR = (s) => {
  if (["Joined", "Offer Accepted"].includes(s)) return { c: "#16a34a", b: "#f0fdf4" };
  if (["Offer Released", "Offer Discussion", "Shortlisted"].includes(s)) return { c: "#0f766e", b: "#effdf8" };
  if (["Rejected", "Withdrawn"].includes(s)) return { c: "#dc2626", b: "#fef2f2" };
  if (["On Hold"].includes(s)) return { c: "#d97706", b: "#fffbeb" };
  return { c: "#2563eb", b: "#eff6ff" };
};
const RECORDING_TYPES = ["Screening Call", "Technical Interview", "HR Interview", "Assessment File", "Evaluation Form"];
const DOC_TYPES = ["Educational Certificate", "Passport Copy", "Visa Copy", "Photograph", "Experience Certificate", "Salary Certificate", "Reference Document", "Medical Report"];

const blankCandidate = () => ({
  name: "", email: "", phone: "", source: "", job_role: "", skills: "", department: "", campaign: "",
  education: "", experience: "", current_company: "", current_ctc: "", expected_ctc: "",
  current_location: "", preferred_location: "", notice_period: "", resume_url: "", remarks: "", status: "New Application",
});

export default function AdminATS({ token, role = "admin", employees = [] }) {
  const [tab, setTab] = useState("dashboard");
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [deptF, setDeptF] = useState("all");

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blankCandidate());
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null); // selected candidate
  const [msg, setMsg] = useState({ text: "", type: "" });

  const flash = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3500); };
  const toArr = (d) => Array.isArray(d) ? d : (d?.candidates || d?.data || []);

  function loadCandidates() {
    setLoading(true);
    fetch(`${BASE}/admin/ats/candidates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(d => setCandidates(toArr(d))).catch(() => setCandidates([])).finally(() => setLoading(false));
  }
  function loadStats() {
    fetch(`${BASE}/admin/ats/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => setStats(d)).catch(() => {});
  }
  useEffect(() => { loadCandidates(); loadStats(); }, []);

  const safe = Array.isArray(candidates) ? candidates : [];
  const depts = [...new Set(safe.map(c => c.department).filter(Boolean))];

  const filtered = safe.filter(c => {
    const q = search.toLowerCase();
    const mS = !q || [c.name, c.email, c.job_role, c.skills, c.current_location, c.current_company].some(v => (v || "").toLowerCase().includes(q));
    const mSt = statusF === "all" || c.status === statusF;
    const mD = deptF === "all" || c.department === deptF;
    return mS && mSt && mD;
  });

  // Dashboard aggregates (fallback from candidate list if no stats endpoint)
  const agg = (key) => {
    const m = {}; safe.forEach(c => { const k = c[key] || "—"; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  };
  const count = (s) => safe.filter(c => c.status === s).length;
  const offersReleased = count("Offer Released") + count("Offer Accepted") + count("Joined");
  const offersAccepted = count("Offer Accepted") + count("Joined");
  const joined = count("Joined");
  const joiningRatio = offersAccepted > 0 ? Math.round((joined / offersAccepted) * 100) : 0;

  async function addCandidate(e) {
    e.preventDefault();
    if (!form.name.trim()) return flash("Candidate name is required.", "error");
    setSaving(true);
    try {
      const payload = { ...form, skills: form.skills.split(",").map(s => s.trim()).filter(Boolean) };
      const r = await fetch(`${BASE}/admin/ats/candidates`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      });
      if (r.ok) { flash("Candidate added."); setShowAdd(false); setForm(blankCandidate()); loadCandidates(); loadStats(); }
      else { const d = await r.json().catch(() => ({})); flash(d.message || "Failed to add.", "error"); }
    } catch { flash("Network error.", "error"); } finally { setSaving(false); }
  }

  const tabBtn = (k, l) => <button key={k} onClick={() => setTab(k)} style={{ padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, background: tab === k ? "var(--brand)" : "transparent", color: tab === k ? "#fff" : "#64748b" }}>{l}</button>;

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)" }}>Recruitment — Applicant Tracking</h3>
          <p className="small">Source, screen, interview and hire — all in one place</p>
        </div>
        <button className="btn" onClick={() => { setForm(blankCandidate()); setShowAdd(true); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FaUserPlus size={12} /> Add Candidate
        </button>
      </div>

      {msg.text && <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: msg.type === "error" ? "#fef2f2" : "#f0fdf4", color: msg.type === "error" ? "#b91c1c" : "#16a34a", border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>{msg.text}</div>}

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
        {tabBtn("dashboard", "Dashboard")}
        {tabBtn("candidates", "Candidates")}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && (
        loading && !safe.length ? <><SkeletonStats count={4} /><div style={{ marginTop: 14 }}><SkeletonTable rows={5} cols={3} /></div></> : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 16 }}>
            {[
              { icon: <FaUsers />, label: "Total Candidates", value: stats?.total ?? safe.length, color: "var(--brand)", bg: "var(--brand-light)" },
              { icon: <FaHandshake />, label: "Offers Released", value: stats?.offers_released ?? offersReleased, color: "#0f766e", bg: "#effdf8" },
              { icon: <FaCheckCircle />, label: "Offers Accepted", value: stats?.offers_accepted ?? offersAccepted, color: "#16a34a", bg: "#f0fdf4" },
              { icon: <FaPercent />, label: "Joining Ratio", value: `${stats?.joining_ratio ?? joiningRatio}%`, color: "#7c3aed", bg: "#f5f3ff" },
            ].map(s => (
              <div key={s.label} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
                <div><div style={{ fontSize: 23, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{s.label}</div></div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }} className="ats-grid">
            <div className="card"><h4 className="widget-title">Candidates by Status</h4><BarChart data={agg("status")} /></div>
            <div className="card"><h4 className="widget-title">Candidates by Source</h4>{agg("source").length ? <DonutChart segments={agg("source")} centerLabel={safe.length} centerSub="total" /> : <div style={{ padding: 28, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No source data yet.</div>}</div>
            <div className="card"><h4 className="widget-title">Candidates by Department</h4><BarChart data={agg("department")} /></div>
            <div className="card"><h4 className="widget-title">Candidates by Job Role</h4>{agg("job_role").length ? <DonutChart segments={agg("job_role")} centerLabel={safe.length} centerSub="total" /> : <div style={{ padding: 28, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No role data yet.</div>}</div>
          </div>
          <style>{`@media (max-width: 820px){ .ats-grid { grid-template-columns: 1fr !important; } }`}</style>
        </div>
        )
      )}

      {/* ── CANDIDATES ── */}
      {tab === "candidates" && (
        <div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
              <input className="modern-input" placeholder="Search name, role, skill, company, location…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
            </div>
            <select className="modern-input" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ margin: 0, maxWidth: 200 }}>
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="modern-input" value={deptF} onChange={e => setDeptF(e.target.value)} style={{ margin: 0, maxWidth: 180 }}>
              <option value="all">All Departments</option>
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {loading ? <SkeletonTable rows={7} cols={5} />
          : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
              <FaIdBadge size={34} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ margin: 0 }}>No candidates found. Add your first one.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="styled-table-global">
                  <thead><tr><th>Candidate</th><th>Role / Skills</th><th>Experience</th><th>Location</th><th>Status</th></tr></thead>
                  <tbody>
                    {filtered.map(c => {
                      const sc = STATUS_COLOR(c.status);
                      return (
                        <tr key={c._id} style={{ cursor: "pointer" }} onClick={() => setDetail(c)}>
                          <td><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 12, color: "#64748b" }}>{c.email}</div></td>
                          <td style={{ fontSize: 13 }}>{c.job_role || "—"}<div style={{ fontSize: 11, color: "#94a3b8" }}>{Array.isArray(c.skills) ? c.skills.join(", ") : c.skills}</div></td>
                          <td style={{ fontSize: 13 }}>{c.experience ? `${c.experience} yrs` : "—"}</td>
                          <td style={{ fontSize: 13 }}>{c.current_location || "—"}</td>
                          <td><span style={{ fontSize: 11, fontWeight: 700, color: sc.c, background: sc.b, padding: "3px 9px", borderRadius: 99 }}>{c.status || "New Application"}</span></td>
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

      {/* ── ADD CANDIDATE MODAL ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
              <h3 style={{ margin: 0, color: "var(--brand)", fontSize: 16 }}>Add Candidate</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "#64748b" }}><FaTimes size={13} /></button>
            </div>
            <form onSubmit={addCandidate}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  ["Full Name *", "name", "text"], ["Email", "email", "email"], ["Phone", "phone", "tel"],
                  ["Source", "source", "text"], ["Job Role", "job_role", "text"], ["Skills (comma-separated)", "skills", "text"],
                  ["Department", "department", "text"], ["Recruitment Campaign", "campaign", "text"], ["Highest Education", "education", "text"],
                  ["Years of Experience", "experience", "number"], ["Current / Last Company", "current_company", "text"], ["Current / Last CTC", "current_ctc", "text"],
                  ["Expected CTC", "expected_ctc", "text"], ["Current Location", "current_location", "text"], ["Preferred Location", "preferred_location", "text"],
                  ["Notice Period", "notice_period", "text"], ["Resume URL", "resume_url", "url"],
                ].map(([label, key, type]) => (
                  <div key={key} style={{ gridColumn: key === "skills" || key === "resume_url" ? "span 2" : "auto" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>{label}</label>
                    <input className="modern-input" type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ margin: 0 }} required={key === "name"} />
                  </div>
                ))}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Remarks</label>
                  <textarea className="modern-input" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} style={{ minHeight: 60 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Add Candidate"}</button>
                <button className="btn ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CANDIDATE DETAIL DRAWER ── */}
      {detail && <CandidateDetail candidate={detail} token={token} onClose={() => setDetail(null)} onChanged={() => { loadCandidates(); loadStats(); }} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
function CandidateDetail({ candidate, token, onClose, onChanged }) {
  const [c, setC] = useState(candidate);
  const [recType, setRecType] = useState(RECORDING_TYPES[0]);
  const [recUrl, setRecUrl] = useState("");
  const [portUrl, setPortUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const sc = STATUS_COLOR(c.status);
  const skills = Array.isArray(c.skills) ? c.skills : (c.skills ? String(c.skills).split(",").map(s => s.trim()) : []);

  async function api(path, method, body) {
    setBusy(true);
    try {
      const r = await fetch(`${BASE}/admin/ats/candidates/${c._id}${path}`, {
        method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined,
      });
      if (r.ok) { const d = await r.json().catch(() => null); if (d && d._id) setC(d); onChanged?.(); return d || true; }
      return false;
    } catch { return false; } finally { setBusy(false); }
  }

  async function changeStatus(ns) {
    const updated = await api(`/status`, "PUT", { status: ns });
    if (updated && updated._id) return;
    // optimistic if backend returns just ok
    setC(prev => ({ ...prev, status: ns, status_history: [...(prev.status_history || []), { status: ns, at: new Date().toISOString(), by: "You" }] }));
  }
  async function addRecording() { if (!recUrl.trim()) return; const u = await api(`/recording`, "POST", { type: recType, url: recUrl.trim() }); if (!(u && u._id)) setC(p => ({ ...p, recordings: [...(p.recordings || []), { type: recType, url: recUrl.trim() }] })); setRecUrl(""); }
  async function addPortfolio() { if (!portUrl.trim()) return; const u = await api(`/portfolio`, "POST", { url: portUrl.trim() }); if (!(u && u._id)) setC(p => ({ ...p, portfolio_links: [...(p.portfolio_links || []), portUrl.trim()] })); setPortUrl(""); }
  async function requestDocs() { const u = await api(`/doc-request`, "POST", {}); if (u) alert("Document submission link sent to the candidate's email."); }

  const Field = ({ label, value }) => (
    <div><div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div><div style={{ fontSize: 13.5, color: "#0f172a", marginTop: 2 }}>{value || "—"}</div></div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(135deg,var(--brand),var(--teal-800))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{c.name?.[0]?.toUpperCase() || "?"}</div>
            <div>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>{c.name}</h3>
              <div style={{ fontSize: 13, color: "#64748b" }}>{c.job_role || "—"} {c.department && `· ${c.department}`}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#64748b", flexShrink: 0 }}><FaTimes size={14} /></button>
        </div>

        {/* Status pipeline */}
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Current Status</span>
            <select value={c.status || "New Application"} onChange={e => changeStatus(e.target.value)} disabled={busy}
              style={{ fontSize: 12.5, fontWeight: 700, color: sc.c, background: sc.b, border: `1px solid ${sc.c}33`, borderRadius: 99, padding: "6px 12px", cursor: "pointer" }}>
              {STATUSES.map(s => <option key={s} value={s} style={{ color: "#334155", background: "#fff" }}>{s}</option>)}
            </select>
          </div>
          {c.status_history?.length > 0 && (
            <div style={{ marginTop: 10, borderTop: "1px solid #eef1f5", paddingTop: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><FaHistory size={9} /> Audit Trail</div>
              {c.status_history.slice().reverse().slice(0, 6).map((h, i) => (
                <div key={i} style={{ fontSize: 12, color: "#475569", padding: "2px 0" }}>
                  <b>{h.status}</b> <span style={{ color: "#94a3b8" }}>— {h.at ? new Date(h.at).toLocaleString("en-GB") : ""}{h.by ? ` · ${h.by}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile fields */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 18 }}>
          <Field label="Email" value={c.email} /><Field label="Phone" value={c.phone} />
          <Field label="Source" value={c.source} /><Field label="Education" value={c.education} />
          <Field label="Experience" value={c.experience ? `${c.experience} yrs` : ""} /><Field label="Current Company" value={c.current_company} />
          <Field label="Current CTC" value={c.current_ctc} /><Field label="Expected CTC" value={c.expected_ctc} />
          <Field label="Current Location" value={c.current_location} /><Field label="Preferred Location" value={c.preferred_location} />
          <Field label="Notice Period" value={c.notice_period} /><Field label="Campaign" value={c.campaign} />
        </div>
        {skills.length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Skills</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{skills.map((s, i) => <span key={i} style={{ fontSize: 12, padding: "3px 10px", background: "var(--brand-light)", color: "var(--brand)", borderRadius: 99, fontWeight: 600 }}>{s}</span>)}</div></div>}
        {c.remarks && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#475569" }}><b>Remarks:</b> {c.remarks}</div>}
        {c.resume_url && <a href={c.resume_url} target="_blank" rel="noreferrer" className="btn ghost" style={{ fontSize: 12.5, marginBottom: 16, display: "inline-flex" }}><FaFilePdf /> View Resume</a>}

        {/* Recordings */}
        <Section title="Interview & Assessment Recordings" icon={<FaVideo />}>
          {(c.recordings || []).map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", padding: "6px 0", textDecoration: "none" }}>
              <FaVideo size={12} color="#0f766e" /> <b>{r.type}</b> <FaLink size={10} color="#3b82f6" style={{ marginLeft: "auto" }} />
            </a>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <select className="modern-input" value={recType} onChange={e => setRecType(e.target.value)} style={{ margin: 0, maxWidth: 180, fontSize: 12.5 }}>{RECORDING_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            <input className="modern-input" placeholder="Recording / file URL" value={recUrl} onChange={e => setRecUrl(e.target.value)} style={{ margin: 0, flex: 1, minWidth: 160 }} />
            <button className="btn ghost" type="button" onClick={addRecording} disabled={busy} style={{ fontSize: 12.5 }}><FaPlus size={10} /> Add</button>
          </div>
        </Section>

        {/* Portfolio */}
        <Section title="Portfolio & Links" icon={<FaFolderOpen />}>
          {(c.portfolio_links || []).map((p, i) => (
            <a key={i} href={p} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 13, color: "#3b82f6", padding: "4px 0", wordBreak: "break-all" }}>{p}</a>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input className="modern-input" placeholder="Portfolio link (Behance, GitHub, Drive…)" value={portUrl} onChange={e => setPortUrl(e.target.value)} style={{ margin: 0, flex: 1 }} />
            <button className="btn ghost" type="button" onClick={addPortfolio} disabled={busy} style={{ fontSize: 12.5 }}><FaPlus size={10} /> Add</button>
          </div>
        </Section>

        {/* Documents */}
        <Section title="Documents" icon={<FaEnvelopeOpenText />}>
          {(c.documents || []).length === 0 && <div style={{ fontSize: 12.5, color: "#94a3b8", marginBottom: 8 }}>No documents submitted yet.</div>}
          {(c.documents || []).map((d, i) => {
            const dc = (d.status || "Pending");
            const col = dc === "Approved" ? "#16a34a" : dc === "Rejected" ? "#dc2626" : "#d97706";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #f8fafc" }}>
                <span style={{ fontSize: 13, flex: 1 }}>{d.name}</span>
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6" }}>View</a>}
                <span style={{ fontSize: 10.5, fontWeight: 700, color: col }}>{dc}</span>
              </div>
            );
          })}
          <button className="btn" type="button" onClick={requestDocs} disabled={busy} style={{ marginTop: 10, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
            <FaPaperPlane size={11} /> Send Document Request Link
          </button>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Required: {DOC_TYPES.join(", ")}</div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <span style={{ color: "var(--brand)" }}>{icon}</span> {title}
      </div>
      {children}
    </div>
  );
}
