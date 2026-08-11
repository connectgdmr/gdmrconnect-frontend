import React, { useState, useEffect, useCallback } from "react";
import { escHtml } from "../utils/security";
import {
  FaUserPlus, FaSearch, FaTimes, FaUsers, FaCheckCircle, FaHandshake, FaPercent,
  FaFilePdf, FaLink, FaVideo, FaFolderOpen, FaPaperPlane, FaTrash, FaPlus, FaHistory,
  FaBriefcase, FaEnvelopeOpenText, FaIdBadge, FaEye, FaDownload, FaEnvelope, FaFileExport,
  FaCloudUploadAlt,
} from "react-icons/fa";
import { BarChart, DonutChart } from "./Charts";
import { SkeletonStats, SkeletonTable } from "./Skeleton";

import { API_URL as BASE } from "../api";

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
const DOC_TYPES = ["Educational Certificate", "Passport Copy", "Visa Copy", "Aadhaar Card", "PAN Card", "Photograph", "Experience Certificate", "Salary Certificate", "Payslip - Last Month", "Payslip - 2nd Last Month", "Payslip - 3rd Last Month", "Reference Document", "Medical Report"];
const SOURCE_OPTIONS = ["LinkedIn", "Job Board", "References", "Internal", "Other"];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^(?:\+?\d{1,3}[\s-]?)?\d{10}$/;

const blankCandidate = () => ({
  name: "", email: "", phone: "", source: "", source_other: "", sourced_by: "", job_role: "", job_role_other: "", skills: "", department: "", campaign: "",
  education: "", experience: "", current_company: "", current_ctc: "", expected_ctc: "",
  current_location: "", preferred_location: "", notice_period: "", resume_url: "", remarks: "", status: "New Application",
  employment_type: "Permanent", contract_months: "",
});

// ── Module-level export helpers (used by both list and detail) ──────────────
function exportCandidateCSV(cand) {
  const headers = ["Name","Email","Phone","Source","Job Role","Department","Status","Experience (yrs)","Current Company","Current CTC","Expected CTC","Current Location","Preferred Location","Notice Period","Skills","Campaign","Education","Resume URL","Remarks","Employment Type","Contract Duration (months)"];
  const vals = [cand.name,cand.email,cand.phone,cand.source,cand.job_role,cand.department,cand.status,cand.experience,cand.current_company,cand.current_ctc,cand.expected_ctc,cand.current_location,cand.preferred_location,cand.notice_period,Array.isArray(cand.skills)?cand.skills.join("; "):(cand.skills||""),cand.campaign,cand.education,cand.resume_url,cand.remarks,cand.employment_type||"Permanent",cand.employment_type==="Contract"?(cand.contract_months||""):""];
  const csv = [headers, vals].map(r => r.map(v => `"${String(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv],{type:"text/csv"})), download: `${(cand.name||"candidate").replace(/\s+/g,"_")}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

// Images and PDFs render natively in a new tab. Everything else — Office
// docs, or an older Cloudinary "raw" upload with no file extension at all —
// gets routed through Google's document viewer instead of just handing the
// browser a file it can only download.
function cloudinaryViewUrl(url) {
  if (!url) return url;
  if (/\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(url)) return url;
  if (/\.pdf(\?|$)/i.test(url)) return url;
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

// Forces a real download instead of opening in a new tab — a plain
// `<a download>` on a cross-origin (Cloudinary) URL just navigates to it in
// most browsers rather than saving it, so fetch the bytes and save as a blob.
async function downloadFile(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename || "document" });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank"); // fallback — at least gets them to the file
  }
}

function exportCandidatePDF(cand) {
  const skills = Array.isArray(cand.skills) ? cand.skills.map(escHtml).join(", ") : escHtml(cand.skills||"");
  const w = window.open("","_blank","width=800,height=900"); if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${escHtml(cand.name)} — Candidate Profile</title>
  <style>body{font-family:Arial,sans-serif;padding:40px;color:#0f172a}h1{color:#34a06a;margin:0 0 4px}h2{margin:0 0 20px;font-size:16px;color:#334155}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}td{padding:7px 10px;border-bottom:1px solid #e6eaef;font-size:13px}td:first-child{color:#64748b;font-weight:600;width:42%}</style>
  </head><body><h1>GDMR CONNECT</h1><h2>Candidate Profile</h2><table>
  <tr><td>Full Name</td><td><b>${escHtml(cand.name||"—")}</b></td></tr>
  <tr><td>Email</td><td>${escHtml(cand.email||"—")}</td></tr>
  <tr><td>Phone</td><td>${escHtml(cand.phone||"—")}</td></tr>
  <tr><td>Job Role</td><td>${escHtml(cand.job_role||"—")}</td></tr>
  <tr><td>Department</td><td>${escHtml(cand.department||"—")}</td></tr>
  <tr><td>Status</td><td>${escHtml(cand.status||"—")}</td></tr>
  <tr><td>Source</td><td>${escHtml(cand.source||"—")}</td></tr>
  <tr><td>Experience</td><td>${cand.experience?escHtml(cand.experience)+" years":"—"}</td></tr>
  <tr><td>Highest Education</td><td>${escHtml(cand.education||"—")}</td></tr>
  <tr><td>Current Company</td><td>${escHtml(cand.current_company||"—")}</td></tr>
  <tr><td>Current / Last CTC</td><td>${escHtml(cand.current_ctc||"—")}</td></tr>
  <tr><td>Expected CTC</td><td>${escHtml(cand.expected_ctc||"—")}</td></tr>
  <tr><td>Current Location</td><td>${escHtml(cand.current_location||"—")}</td></tr>
  <tr><td>Preferred Location</td><td>${escHtml(cand.preferred_location||"—")}</td></tr>
  <tr><td>Notice Period</td><td>${escHtml(cand.notice_period||"—")}</td></tr>
  <tr><td>Employment Type</td><td>${escHtml(cand.employment_type||"Permanent")}${cand.employment_type==="Contract"&&cand.contract_months?` (${escHtml(String(cand.contract_months))} months)`:""}</td></tr>
  ${skills?`<tr><td>Skills</td><td>${skills}</td></tr>`:""}
  ${cand.remarks?`<tr><td>Remarks</td><td>${escHtml(cand.remarks)}</td></tr>`:""}
  </table><p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:40px">Generated by GDMR Connect — ${new Date().toLocaleDateString()}</p>
  </body></html>`);
  w.document.close(); setTimeout(()=>w.print(),300);
}

export default function AdminATS({ token, role = "admin", employees = [], departments = [] }) {
  const [tab, setTab] = useState("dashboard");
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [deptF, setDeptF] = useState("all");

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blankCandidate());
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [detail, setDetail] = useState(null); // selected candidate
  const [pendingDelete, setPendingDelete] = useState(null); // candidate awaiting delete confirmation
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [openJobs, setOpenJobs] = useState([]); // open postings from Jobs — feeds the Job Role picker

  const flash = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3500); };
  const toArr = (d) => Array.isArray(d) ? d : (d?.candidates || d?.data || []);

  function exportAllCSV() {
    const data = filtered.length ? filtered : safe;
    const headers = ["Name","Email","Phone","Source","Job Role","Department","Status","Experience (yrs)","Current Company","Current CTC","Expected CTC","Current Location","Notice Period","Skills","Employment Type","Contract Duration (months)"];
    const rows = data.map(c => [c.name,c.email,c.phone,c.source,c.job_role,c.department,c.status,c.experience,c.current_company,c.current_ctc,c.expected_ctc,c.current_location,c.notice_period,Array.isArray(c.skills)?c.skills.join("; "):(c.skills||""),c.employment_type||"Permanent",c.employment_type==="Contract"?(c.contract_months||""):""]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:`recruitment-${new Date().toISOString().slice(0,10)}.csv`});
    a.click(); URL.revokeObjectURL(a.href);
  }

  function loadCandidates() {
    setLoading(true);
    fetch(`${BASE}/admin/ats/candidates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(d => setCandidates(toArr(d))).catch(() => setCandidates([])).finally(() => setLoading(false));
  }
  function loadStats() {
    fetch(`${BASE}/admin/ats/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => setStats(d)).catch(() => {});
  }
  function loadOpenJobs() {
    // Public endpoint (no auth) — same one the careers page uses — so this
    // works regardless of whether this user has "career" module access too.
    fetch(`${BASE}/career/jobs`)
      .then(r => r.ok ? r.json() : []).then(d => setOpenJobs(Array.isArray(d) ? d : [])).catch(() => {});
  }
  useEffect(() => { loadCandidates(); loadStats(); loadOpenJobs(); }, []);

  const safe = Array.isArray(candidates) ? candidates : [];
  const depts = [...new Set(safe.map(c => c.department).filter(Boolean))];
  // Job Role options for the Add Candidate form — open postings from Jobs
  // plus whatever roles have been used on existing candidates, so the list
  // stays useful even before any job postings exist.
  const jobRoles = [...new Set([
    ...openJobs.map(j => j.title).filter(Boolean),
    ...safe.map(c => c.job_role).filter(Boolean),
  ])].sort();
  // Company departments for the form's Department dropdown — falls back to
  // whatever's shown up on candidates so far if the company list isn't loaded.
  const formDepartments = departments.length
    ? [...new Set(departments.map(d => d.name).filter(Boolean))].sort()
    : depts.slice().sort();
  // "Sourced By" only makes sense as an HR team member — recruiters, not
  // whoever happens to be granted Recruitment access for other reasons.
  const hrEmployees = [...employees]
    .filter(e => { const d = (e.department || "").toLowerCase(); return d.includes("hr") || d.includes("human resource"); })
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

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

  function validateForm() {
    const errs = {};
    if (form.email && !EMAIL_RE.test(form.email.trim())) errs.email = "Enter a valid email address.";
    if (form.phone && !PHONE_RE.test(form.phone.trim().replace(/\s/g, ""))) errs.phone = "Enter a valid 10-digit phone number.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function addCandidate(e) {
    e.preventDefault();
    if (!form.name.trim()) return flash("Candidate name is required.", "error");
    if (form.employment_type === "Contract" && !form.contract_months) return flash("Please enter the contract duration in months.", "error");
    if (!validateForm()) return flash("Please fix the highlighted fields.", "error");
    setSaving(true);
    try {
      const resolvedSource = form.source === "Other" ? (form.source_other || "Other") : form.source;
      const resolvedJobRole = form.job_role === "Other" ? (form.job_role_other || "") : form.job_role;
      const { source_other, job_role_other, ...rest } = form;
      const payload = { ...rest, source: resolvedSource, job_role: resolvedJobRole, skills: form.skills.split(",").map(s => s.trim()).filter(Boolean) };
      const r = await fetch(`${BASE}/admin/ats/candidates`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      });
      if (r.ok) { flash("Candidate added."); setShowAdd(false); setForm(blankCandidate()); setFormErrors({}); loadCandidates(); loadStats(); }
      else { const d = await r.json().catch(() => ({})); flash(d.message || "Failed to add.", "error"); }
    } catch { flash("Network error.", "error"); } finally { setSaving(false); }
  }

  // Upload a resume file straight from the Add Candidate form — populates
  // resume_url (and fills in name/email/phone if the admin hasn't typed
  // them yet) so admins don't have to paste an external URL by hand.
  async function uploadResumeFile(file) {
    if (!file) return;
    setUploadingResume(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${BASE}/admin/ats/candidates/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.resume_url) {
        setForm(f => ({
          ...f,
          resume_url: d.resume_url,
          name:  f.name  || d.parsed?.name  || f.name,
          email: f.email || d.parsed?.email || f.email,
          phone: f.phone || d.parsed?.phone || f.phone,
        }));
        flash("Resume uploaded.");
      } else {
        flash(d.message || "Resume upload failed.", "error");
      }
    } catch { flash("Network error during upload.", "error"); }
    finally { setUploadingResume(false); }
  }

  async function sendDocRequest(c) {
    try {
      const r = await fetch(`${BASE}/admin/ats/candidates/${c._id}/doc-request`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (r.ok) flash(`Document request link sent to ${c.name || "candidate"}.`);
      else { const d = await r.json().catch(() => ({})); flash(d.message || "Failed to send document link.", "error"); }
    } catch { flash("Network error.", "error"); }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { _id: id, name } = pendingDelete;
    setDeleting(true);
    try {
      const r = await fetch(`${BASE}/admin/ats/candidates/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        setCandidates(prev => (Array.isArray(prev) ? prev : []).filter(c => c._id !== id));
        setDetail(d => (d && d._id === id ? null : d));
        setPendingDelete(null);
        flash(`${name || "Candidate"} deleted.`);
        loadStats();
      } else if (r.status === 404) {
        // Already gone — reconcile local state and inform the user.
        setCandidates(prev => (Array.isArray(prev) ? prev : []).filter(c => c._id !== id));
        setDetail(d => (d && d._id === id ? null : d));
        setPendingDelete(null);
        flash("Candidate not found.", "error");
      } else {
        const d = await r.json().catch(() => ({}));
        flash(d.message || "Failed to delete candidate.", "error");
      }
    } catch { flash("Network error.", "error"); } finally { setDeleting(false); }
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
            <button className="btn ghost" onClick={exportAllCSV} title="Export all filtered candidates as CSV / Excel" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
              <FaFileExport size={12} /> Export All (CSV)
            </button>
          </div>

          {loading ? <SkeletonTable rows={7} cols={6} />
          : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
              <FaIdBadge size={34} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ margin: 0 }}>No candidates found. Add your first one.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="styled-table-global">
                  <thead><tr><th>Candidate</th><th>Role / Skills</th><th>Experience</th><th>Location</th><th>Employment</th><th>Status</th><th style={{ textAlign: "center" }}>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(c => {
                      const sc = STATUS_COLOR(c.status);
                      return (
                        <tr key={c._id} style={{ cursor: "pointer" }} onClick={() => setDetail(c)}>
                          <td><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 12, color: "#64748b" }}>{c.email}</div></td>
                          <td style={{ fontSize: 13 }}>{c.job_role || "—"}<div style={{ fontSize: 11, color: "#94a3b8" }}>{Array.isArray(c.skills) ? c.skills.join(", ") : c.skills}</div></td>
                          <td style={{ fontSize: 13 }}>{c.experience ? `${c.experience} yrs` : "—"}</td>
                          <td style={{ fontSize: 13 }}>{c.current_location || "—"}</td>
                          <td style={{ fontSize: 13 }}>{(c.employment_type || "Permanent") === "Contract" ? `Contract${c.contract_months ? ` (${c.contract_months}m)` : ""}` : "Permanent"}</td>
                          <td><span style={{ fontSize: 11, fontWeight: 700, color: sc.c, background: sc.b, padding: "3px 9px", borderRadius: 99 }}>{c.status || "New Application"}</span></td>
                          <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button title="View profile" onClick={() => setDetail(c)}
                                style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                <FaEye size={12} />
                              </button>
                              <button title="Export as CSV / Excel" onClick={() => exportCandidateCSV(c)}
                                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                <FaDownload size={11} />
                              </button>
                              <button title="Export as PDF" onClick={() => exportCandidatePDF(c)}
                                style={{ background: "#fef9f0", border: "1px solid #fed7aa", color: "#ea580c", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                <FaFilePdf size={11} />
                              </button>
                              <button title="Send document request link" onClick={() => sendDocRequest(c)}
                                style={{ background: "var(--brand-light)", border: "1px solid #bbf7d0", color: "var(--brand)", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                <FaPaperPlane size={11} />
                              </button>
                              <button title="Delete candidate" onClick={() => setPendingDelete(c)}
                                style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                <FaTrash size={12} />
                              </button>
                            </div>
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

      {/* ── ADD CANDIDATE MODAL ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
              <h3 style={{ margin: 0, color: "var(--brand)", fontSize: 16 }}>Add Candidate</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "#64748b" }}><FaTimes size={13} /></button>
            </div>
            <form onSubmit={addCandidate}>
              {(() => {
                const lbl = { fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 };
                const errStyle = { fontSize: 11, color: "#dc2626", marginTop: 3 };
                const inp = (key, type = "text", req = false) => (
                  <input
                    className="modern-input" type={type} value={form[key] || ""}
                    onChange={e => { setForm({ ...form, [key]: e.target.value }); if (formErrors[key]) setFormErrors({ ...formErrors, [key]: undefined }); }}
                    style={{ margin: 0, borderColor: formErrors[key] ? "#dc2626" : undefined }} required={req}
                  />
                );
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={lbl}>Full Name *</label>{inp("name","text",true)}</div>
                    <div>
                      <label style={lbl}>Email</label>{inp("email","email")}
                      {formErrors.email && <div style={errStyle}>{formErrors.email}</div>}
                    </div>
                    <div>
                      <label style={lbl}>Phone</label>{inp("phone","tel")}
                      {formErrors.phone && <div style={errStyle}>{formErrors.phone}</div>}
                    </div>

                    {/* Source — dropdown */}
                    <div>
                      <label style={lbl}>Source</label>
                      <select className="modern-input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={{ margin: 0 }}>
                        <option value="">— Select Source —</option>
                        {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* "Other" free-text only when Other is chosen */}
                    {form.source === "Other" && (
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={lbl}>Specify Source (Other)</label>
                        <input className="modern-input" placeholder="Please specify…" value={form.source_other || ""} onChange={e => setForm({ ...form, source_other: e.target.value })} style={{ margin: 0 }} />
                      </div>
                    )}

                    {/* Sourced By — HR team members only */}
                    <div>
                      <label style={lbl}>Sourced By</label>
                      <select className="modern-input" value={form.sourced_by} onChange={e => setForm({ ...form, sourced_by: e.target.value })} style={{ margin: 0 }}>
                        <option value="">— Select Employee —</option>
                        {hrEmployees.map(e => <option key={e._id} value={e._id}>{e.name}{e.department ? ` (${e.department})` : ""}</option>)}
                      </select>
                    </div>

                    {/* Department — dropdown of the company's actual departments */}
                    <div>
                      <label style={lbl}>Department</label>
                      <select className="modern-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} style={{ margin: 0 }}>
                        <option value="">— Select Department —</option>
                        {formDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    {/* Job Role — open postings from Jobs, or Other + type your own */}
                    <div>
                      <label style={lbl}>Job Role</label>
                      <select className="modern-input" value={form.job_role || ""} onChange={e => setForm({ ...form, job_role: e.target.value })} style={{ margin: 0 }}>
                        <option value="">— Select Job Role —</option>
                        {jobRoles.map(r => <option key={r} value={r}>{r}</option>)}
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* "Other" free-text only when Other is chosen */}
                    {form.job_role === "Other" && (
                      <div>
                        <label style={lbl}>Specify Job Role (Other)</label>
                        <input className="modern-input" placeholder="e.g. Frontend Developer" value={form.job_role_other || ""} onChange={e => setForm({ ...form, job_role_other: e.target.value })} style={{ margin: 0 }} />
                      </div>
                    )}

                    <div style={{ gridColumn: "span 2" }}><label style={lbl}>Skills (comma-separated)</label>{inp("skills")}</div>
                    <div><label style={lbl}>Recruitment Campaign</label>{inp("campaign")}</div>
                    <div><label style={lbl}>Highest Education</label>{inp("education")}</div>
                    <div><label style={lbl}>Years of Experience</label>{inp("experience","number")}</div>
                    <div><label style={lbl}>Current / Last Company</label>{inp("current_company")}</div>
                    <div><label style={lbl}>Current / Last CTC</label>{inp("current_ctc")}</div>
                    <div><label style={lbl}>Expected CTC</label>{inp("expected_ctc")}</div>
                    <div><label style={lbl}>Current Location</label>{inp("current_location")}</div>
                    <div><label style={lbl}>Preferred Location</label>{inp("preferred_location")}</div>
                    <div><label style={lbl}>Notice Period</label>{inp("notice_period")}</div>

                    {/* Employment Type — Permanent gets a portal login; Contract is data-only */}
                    <div>
                      <label style={lbl}>Employment Type</label>
                      <select className="modern-input" value={form.employment_type || "Permanent"} onChange={e => setForm({ ...form, employment_type: e.target.value })} style={{ margin: 0 }}>
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>
                    {form.employment_type === "Contract" && (
                      <div>
                        <label style={lbl}>Contract Duration (months)</label>
                        <input className="modern-input" type="number" min="1" placeholder="e.g. 6" value={form.contract_months || ""} onChange={e => setForm({ ...form, contract_months: e.target.value })} style={{ margin: 0 }} />
                      </div>
                    )}

                    {/* Resume — upload a file OR paste a URL, either fills resume_url */}
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={lbl}>Resume</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <label style={{
                          display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
                          background: "var(--brand-light)", color: "var(--brand)", border: "1px solid #bbf7d0",
                          borderRadius: 8, padding: "8px 14px", cursor: uploadingResume ? "default" : "pointer", flexShrink: 0,
                        }}>
                          <FaCloudUploadAlt size={13} /> {uploadingResume ? "Uploading…" : "Upload Resume"}
                          <input type="file" accept=".pdf,.doc,.docx" hidden disabled={uploadingResume}
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadResumeFile(f); e.target.value = ""; }} />
                        </label>
                        <input
                          className="modern-input" type="url" placeholder="…or paste a resume URL"
                          value={form.resume_url || ""} onChange={e => setForm({ ...form, resume_url: e.target.value })}
                          style={{ margin: 0, flex: 1, minWidth: 160 }}
                        />
                      </div>
                      {form.resume_url && (
                        <a href={form.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "var(--brand)", marginTop: 5, display: "inline-block" }}>
                          View current resume
                        </a>
                      )}
                    </div>

                    <div style={{ gridColumn: "span 2" }}>
                      <label style={lbl}>Remarks</label>
                      <textarea className="modern-input" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} style={{ minHeight: 60 }} />
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Add Candidate"}</button>
                <button className="btn ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CANDIDATE DETAIL DRAWER ── */}
      {detail && <CandidateDetail candidate={detail} token={token} onClose={() => setDetail(null)} onChanged={() => { loadCandidates(); loadStats(); }} onDelete={() => setPendingDelete(detail)} />}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {pendingDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setPendingDelete(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FaTrash size={16} /></div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#0f172a" }}>Delete candidate?</h3>
                <p style={{ margin: 0, fontSize: 13.5, color: "#64748b", lineHeight: 1.5 }}>
                  This will permanently delete all data for <b style={{ color: "#0f172a" }}>{pendingDelete.name || "this candidate"}</b> — profile, status history and documents. Continue?
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn ghost" type="button" onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={deleting}
                style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: deleting ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <FaTrash size={11} /> {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
function CandidateDetail({ candidate, token, onClose, onChanged, onDelete }) {
  const [c, setC] = useState(candidate);
  const [recType, setRecType] = useState(RECORDING_TYPES[0]);
  const [recUrl, setRecUrl] = useState("");
  const [portUrl, setPortUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const sc = STATUS_COLOR(c.status);
  const skills = Array.isArray(c.skills) ? c.skills : (c.skills ? String(c.skills).split(",").map(s => s.trim()) : []);

  // Fetch the FULL candidate record on open (and after mutations) so every saved
  // field, recording, portfolio link and the audit trail show — the list row that
  // opened this drawer may only carry a summary. Merge so we never lose data.
  const loadDetail = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/admin/ats/candidates/${candidate._id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json().catch(() => null); if (d && (d._id || d.name)) setC(prev => ({ ...prev, ...d })); }
    } catch { /* keep current data on transient errors */ }
  }, [candidate._id, token]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

  // Fire a mutation; returns true/false. Never overwrites local state with a
  // partial response — callers do an optimistic update, then loadDetail() resyncs.
  async function apiCall(path, method, body) {
    setBusy(true);
    try {
      const r = await fetch(`${BASE}/admin/ats/candidates/${c._id}${path}`, {
        method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined,
      });
      if (r.ok) { onChanged?.(); return true; }
      return false;
    } catch { return false; } finally { setBusy(false); }
  }

  async function changeStatus(ns) {
    const prevStatus = c.status;
    // optimistic
    setC(p => ({ ...p, status: ns, status_history: [...(p.status_history || []), { status: ns, at: new Date().toISOString(), by: "You" }] }));
    const ok = await apiCall(`/status`, "PUT", { status: ns });
    if (!ok) { setC(p => ({ ...p, status: prevStatus })); alert("Could not update status. Please try again."); return; }
    loadDetail(); // resync (audit trail / persisted state)
  }
  async function addRecording() {
    if (!recUrl.trim()) return;
    const entry = { type: recType, url: recUrl.trim() };
    setC(p => ({ ...p, recordings: [...(p.recordings || []), entry] })); // optimistic
    setRecUrl("");
    const ok = await apiCall(`/recording`, "POST", entry);
    if (ok) loadDetail(); else alert("Could not save the recording. Please try again.");
  }
  async function addPortfolio() {
    if (!portUrl.trim()) return;
    const url = portUrl.trim();
    setC(p => ({ ...p, portfolio_links: [...(p.portfolio_links || []), url] })); // optimistic
    setPortUrl("");
    const ok = await apiCall(`/portfolio`, "POST", { url });
    if (ok) loadDetail(); else alert("Could not save the portfolio link. Please try again.");
  }
  async function requestDocs() { const ok = await apiCall(`/doc-request`, "POST", {}); if (ok) alert("Document submission link sent to the candidate's email."); else alert("Could not send the document link. Please try again."); }

  async function sendStatusEmail() {
    setBusy(true);
    try {
      const r = await fetch(`${BASE}/admin/ats/candidates/${c._id}/send-status-email`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: c.status }),
      });
      if (r.ok) alert(`Status email sent to ${c.email || "candidate"} for status: ${c.status}`);
      else { const d = await r.json().catch(() => ({})); alert(d.message || "Could not send email."); }
    } catch { alert("Network error."); } finally { setBusy(false); }
  }

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
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => exportCandidateCSV(c)} title="Export as CSV / Excel" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#16a34a", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><FaDownload size={11} /> CSV</button>
            <button onClick={() => exportCandidatePDF(c)} title="Export as PDF" style={{ background: "#fef9f0", border: "1px solid #fed7aa", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#ea580c", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><FaFilePdf size={11} /> PDF</button>
            <button onClick={onDelete} title="Delete candidate" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#dc2626" }}><FaTrash size={13} /></button>
            <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#64748b" }}><FaTimes size={14} /></button>
          </div>
        </div>

        {/* Status pipeline */}
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Current Status</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={c.status || "New Application"} onChange={e => changeStatus(e.target.value)} disabled={busy}
                style={{ fontSize: 12.5, fontWeight: 700, color: sc.c, background: sc.b, border: `1px solid ${sc.c}33`, borderRadius: 99, padding: "6px 12px", cursor: "pointer" }}>
                {STATUSES.map(s => <option key={s} value={s} style={{ color: "#334155", background: "#fff" }}>{s}</option>)}
              </select>
              <button onClick={sendStatusEmail} disabled={busy} title="Manually send status update email to candidate"
                style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <FaEnvelope size={11} /> Send Email
              </button>
            </div>
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
          <Field label="Source" value={c.source} /><Field label="Sourced By" value={c.sourced_by_name || c.sourced_by || ""} />
          <Field label="Education" value={c.education} />
          <Field label="Experience" value={c.experience ? `${c.experience} yrs` : ""} /><Field label="Current Company" value={c.current_company} />
          <Field label="Current CTC" value={c.current_ctc} /><Field label="Expected CTC" value={c.expected_ctc} />
          <Field label="Current Location" value={c.current_location} /><Field label="Preferred Location" value={c.preferred_location} />
          <Field label="Notice Period" value={c.notice_period} /><Field label="Campaign" value={c.campaign} />
          <Field label="Employment Type" value={c.employment_type || "Permanent"} />
          {(c.employment_type || "Permanent") === "Contract" && <Field label="Contract Duration" value={c.contract_months ? `${c.contract_months} months` : ""} />}
        </div>
        {skills.length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Skills</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{skills.map((s, i) => <span key={i} style={{ fontSize: 12, padding: "3px 10px", background: "var(--brand-light)", color: "var(--brand)", borderRadius: 99, fontWeight: 600 }}>{s}</span>)}</div></div>}
        {c.remarks && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#475569" }}><b>Remarks:</b> {c.remarks}</div>}
        {c.resume_url && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <a href={cloudinaryViewUrl(c.resume_url)} target="_blank" rel="noreferrer" className="btn ghost" style={{ fontSize: 12.5, display: "inline-flex" }}><FaFilePdf /> View Resume</a>
            <button type="button" onClick={() => downloadFile(c.resume_url, `${(c.name || "candidate").replace(/\s+/g, "_")}_Resume.pdf`)}
              className="btn ghost" style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FaDownload size={11} /> Download
            </button>
          </div>
        )}

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
                {d.url && (
                  <>
                    <a href={cloudinaryViewUrl(d.url)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6" }}>View</a>
                    <button type="button" onClick={() => downloadFile(d.url, `${d.name || "document"}.pdf`)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand)", padding: 0, display: "flex", alignItems: "center" }} title="Download">
                      <FaDownload size={12} />
                    </button>
                  </>
                )}
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
