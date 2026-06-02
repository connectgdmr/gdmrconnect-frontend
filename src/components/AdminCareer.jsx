import React, { useState, useEffect } from "react";
import {
  FaPlus, FaTimes, FaEdit, FaBriefcase, FaMapMarkerAlt,
  FaClock, FaUsers, FaLink, FaSearch, FaCheckCircle,
  FaTimesCircle, FaRegClock, FaStar,
} from "react-icons/fa";

const BASE = "https://gdmrconnect-backend-production.up.railway.app/api";

const JOB_TYPES   = ["Full-time", "Part-time", "Contract", "Internship"];
const REF_STATUSES = ["New", "Shortlisted", "Interview", "Hired", "Rejected"];

const TYPE_COLORS = {
  "Full-time":  { color: "#2563eb", bg: "#eff6ff" },
  "Part-time":  { color: "#7c3aed", bg: "#f5f3ff" },
  "Contract":   { color: "#d97706", bg: "#fffbeb" },
  "Internship": { color: "#16a34a", bg: "#f0fdf4" },
};

const STATUS_COLORS = {
  New:          { color: "#2563eb", bg: "#eff6ff" },
  Shortlisted:  { color: "#7c3aed", bg: "#f5f3ff" },
  Interview:    { color: "#d97706", bg: "#fffbeb" },
  Hired:        { color: "#16a34a", bg: "#f0fdf4" },
  Rejected:     { color: "#dc2626", bg: "#fef2f2" },
};

const blankJob = () => ({
  title: "", department: "", location: "", employment_type: "Full-time",
  description: "", requirements: [], salary_min: "", salary_max: "", status: "active",
});

export default function AdminCareer({ token, employees = [] }) {
  const [tab, setTab]       = useState("board");
  const [jobs, setJobs]     = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [boardFilter, setBoardFilter] = useState("all");

  const [postMode, setPostMode]   = useState("create");
  const [editJobId, setEditJobId] = useState(null);
  const [jobForm, setJobForm]     = useState(blankJob());
  const [newReq, setNewReq]       = useState("");
  const [postSaving, setPostSaving] = useState(false);

  const [referrals, setReferrals]   = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refSearch, setRefSearch]   = useState("");
  const [refJobFilter, setRefJobFilter]   = useState("all");
  const [refStatusFilter, setRefStatusFilter] = useState("All");

  const [msg, setMsg] = useState({ text: "", type: "" });
  const flash = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3500); };

  const toArr = (d) => {
    if (Array.isArray(d)) return d;
    const c = d?.jobs || d?.referrals || d?.data || d?.results || [];
    return Array.isArray(c) ? c : [];
  };

  async function loadJobs() {
    setJobsLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/career/jobs`, { headers: { Authorization: `Bearer ${token}` } });
      setJobs(r.ok ? toArr(await r.json()) : []);
    } catch { setJobs([]); } finally { setJobsLoading(false); }
  }

  async function loadReferrals() {
    setRefLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/career/referrals`, { headers: { Authorization: `Bearer ${token}` } });
      setReferrals(r.ok ? toArr(await r.json()) : []);
    } catch { setReferrals([]); } finally { setRefLoading(false); }
  }

  useEffect(() => { loadJobs(); }, []);
  useEffect(() => { if (tab === "referrals") loadReferrals(); }, [tab]);

  function startCreate() {
    setPostMode("create"); setEditJobId(null); setJobForm(blankJob()); setNewReq(""); setTab("post");
  }

  function startEdit(j) {
    setPostMode("edit"); setEditJobId(j._id);
    const reqs = Array.isArray(j.requirements)
      ? j.requirements
      : (typeof j.requirements === "string" && j.requirements ? j.requirements.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : []);
    setJobForm({ title: j.title, department: j.department || "", location: j.location || "", employment_type: j.employment_type || "Full-time",
      description: j.description || "", requirements: reqs, salary_min: j.salary_min || "", salary_max: j.salary_max || "", status: j.status || "active" });
    setNewReq(""); setTab("post");
  }

  async function saveJob(e) {
    e.preventDefault();
    if (!jobForm.title) return flash("Job title is required.", "error");
    setPostSaving(true);
    try {
      const r = await fetch(
        `${BASE}/admin/career/jobs${editJobId ? `/${editJobId}` : ""}`,
        { method: editJobId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(jobForm) }
      );
      if (r.ok) { flash(editJobId ? "Job updated." : "Job posted successfully."); loadJobs(); setTab("board"); }
      else { const d = await r.json(); flash(d.message || "Failed to save.", "error"); }
    } catch { flash("Network error.", "error"); } finally { setPostSaving(false); }
  }

  async function toggleJobStatus(j) {
    const newStatus = j.status === "active" ? "closed" : "active";
    await fetch(`${BASE}/admin/career/jobs/${j._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...j, status: newStatus }),
    });
    loadJobs();
  }

  async function deleteJob(id) {
    if (!window.confirm("Delete this job posting?")) return;
    await fetch(`${BASE}/admin/career/jobs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadJobs();
  }

  async function updateReferralStatus(id, status) {
    await fetch(`${BASE}/admin/career/referrals/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadReferrals();
  }

  const addReq = () => {
    if (!newReq.trim()) return;
    setJobForm(f => ({ ...f, requirements: [...f.requirements, newReq.trim()] }));
    setNewReq("");
  };

  const safeJobs      = Array.isArray(jobs)      ? jobs      : [];
  const safeReferrals = Array.isArray(referrals)  ? referrals : [];

  const filteredJobs = safeJobs.filter(j => boardFilter === "all" || j.status === boardFilter);

  const filteredReferrals = safeReferrals.filter(r => {
    const matchSearch = !refSearch || r.candidate_name?.toLowerCase().includes(refSearch.toLowerCase()) || r.referred_by_name?.toLowerCase().includes(refSearch.toLowerCase());
    const matchJob    = refJobFilter === "all" || r.job_id === refJobFilter;
    const matchStatus = refStatusFilter === "All" || r.status === refStatusFilter;
    return matchSearch && matchJob && matchStatus;
  });

  const TABS = [
    { key: "board",     label: "Job Board" },
    { key: "post",      label: postMode === "edit" ? "Edit Job" : "Post a Job" },
    { key: "referrals", label: "Referrals" },
  ];

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{
      padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
      background: tab === key ? "var(--red)" : "transparent",
      color: tab === key ? "#fff" : "#64748b", transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--red)" }}>Career & Referrals</h3>
          <p className="small">Post job openings and manage employee referrals</p>
        </div>
        <button className="btn" onClick={startCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FaPlus size={11} /> Post a Job
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

      {/* ── Job Board ── */}
      {tab === "board" && (
        <div>
          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total Postings", value: safeJobs.length, color: "#334155", bg: "#f8fafc" },
              { label: "Active",  value: safeJobs.filter(j => j.status === "active").length,  color: "#16a34a", bg: "#f0fdf4" },
              { label: "Closed",  value: safeJobs.filter(j => j.status === "closed").length,  color: "#64748b", bg: "#f8fafc" },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: "center", padding: "16px", background: s.bg }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[["all", "All"], ["active", "Active"], ["closed", "Closed"]].map(([v, l]) => (
              <button key={v} onClick={() => setBoardFilter(v)} style={{
                padding: "6px 16px", borderRadius: 99, border: "1.5px solid", fontSize: 13, fontWeight: 600, cursor: "pointer",
                borderColor: boardFilter === v ? "var(--red)" : "#e2e8f0",
                background: boardFilter === v ? "#fef2f2" : "#fff",
                color: boardFilter === v ? "var(--red)" : "#64748b",
              }}>{l}</button>
            ))}
          </div>

          {jobsLoading ? <div className="loader-container"><div className="loader" /></div>
          : filteredJobs.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <FaBriefcase size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ margin: 0 }}>No job postings yet. Post the first one!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredJobs.map(j => {
                const tc = TYPE_COLORS[j.employment_type] || TYPE_COLORS["Full-time"];
                const reqs = Array.isArray(j.requirements)
                  ? j.requirements
                  : (typeof j.requirements === "string" && j.requirements ? j.requirements.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : []);
                return (
                  <div key={j._id} className="card" style={{ borderLeft: `4px solid ${tc.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{j.title}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: tc.color, background: tc.bg, padding: "2px 8px", borderRadius: 4 }}>{j.employment_type}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: j.status === "active" ? "#16a34a" : "#94a3b8",
                            background: j.status === "active" ? "#f0fdf4" : "#f8fafc", padding: "2px 8px", borderRadius: 4 }}>
                            {j.status === "active" ? "● Active" : "Closed"}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
                          {j.department && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FaUsers size={10} />{j.department}</span>}
                          {j.location   && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FaMapMarkerAlt size={10} />{j.location}</span>}
                          {(j.salary_min || j.salary_max) && <span style={{ display: "flex", alignItems: "center", gap: 4 }}>₹{j.salary_min || "—"} – ₹{j.salary_max || "—"}/mo</span>}
                          {j.created_at && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FaClock size={10} />Posted {new Date(j.created_at).toLocaleDateString("en-GB")}</span>}
                        </div>
                        {reqs.length > 0 && (
                          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {reqs.slice(0, 4).map((r, i) => (
                              <span key={i} style={{ fontSize: 11, padding: "2px 8px", background: "#f1f5f9", borderRadius: 4, color: "#475569" }}>{r}</span>
                            ))}
                            {reqs.length > 4 && <span style={{ fontSize: 11, color: "#94a3b8" }}>+{reqs.length - 4} more</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button className="btn-action btn-edit" onClick={() => startEdit(j)} title="Edit"><FaEdit /></button>
                        <button
                          className="btn ghost"
                          onClick={() => toggleJobStatus(j)}
                          style={{ fontSize: 11, padding: "4px 10px", color: j.status === "active" ? "#dc2626" : "#16a34a", borderColor: j.status === "active" ? "#fca5a5" : "#bbf7d0" }}
                        >
                          {j.status === "active" ? "Close" : "Reopen"}
                        </button>
                        <button className="btn-action btn-remove" onClick={() => deleteJob(j._id)} title="Delete"><FaTimes /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Post / Edit Job ── */}
      {tab === "post" && (
        <form onSubmit={saveJob}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Row 1 */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Job Title *</label>
              <input className="modern-input" value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior React Developer" required />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Department</label>
              <input className="modern-input" value={jobForm.department} onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Engineering" />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Location</label>
              <input className="modern-input" value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Remote / Kochi" />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Employment Type</label>
              <select className="modern-input" value={jobForm.employment_type} onChange={e => setJobForm(f => ({ ...f, employment_type: e.target.value }))}>
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Status</label>
              <select className="modern-input" value={jobForm.status} onChange={e => setJobForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active (Visible)</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Salary Min (₹/mo)</label>
              <input className="modern-input" type="number" value={jobForm.salary_min} onChange={e => setJobForm(f => ({ ...f, salary_min: e.target.value }))} placeholder="e.g. 30000" />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Salary Max (₹/mo)</label>
              <input className="modern-input" type="number" value={jobForm.salary_max} onChange={e => setJobForm(f => ({ ...f, salary_max: e.target.value }))} placeholder="e.g. 60000" />
            </div>

            {/* Description */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Job Description</label>
              <textarea className="modern-input" value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the role, responsibilities, and team…" style={{ minHeight: 120 }} />
            </div>

            {/* Requirements */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Requirements</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input className="modern-input" value={newReq} onChange={e => setNewReq(e.target.value)} placeholder="e.g. 3+ years React experience" style={{ flex: 1, margin: 0 }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addReq(); } }} />
                <button type="button" className="btn ghost" onClick={addReq} style={{ whiteSpace: "nowrap" }}>Add</button>
              </div>
              {jobForm.requirements.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {jobForm.requirements.map((r, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, padding: "4px 10px", background: "#f1f5f9", borderRadius: 6, color: "#334155" }}>
                      {r}
                      <button type="button" onClick={() => setJobForm(f => ({ ...f, requirements: f.requirements.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}>
                        <FaTimes size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ gridColumn: "span 2", display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
              <button className="btn" type="submit" disabled={postSaving}>{postSaving ? "Saving…" : postMode === "edit" ? "Save Changes" : "Post Job"}</button>
              <button className="btn ghost" type="button" onClick={() => setTab("board")}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {/* ── Referrals ── */}
      {tab === "referrals" && (
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 14 }}>
            {REF_STATUSES.map(s => {
              const sc = STATUS_COLORS[s] || {};
              return (
                <div key={s} className="card" style={{ textAlign: "center", padding: "12px 8px", background: sc.bg }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: sc.color }}>{safeReferrals.filter(r => r.status === s).length}</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{s}</div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
              <input className="modern-input" placeholder="Search candidate or referrer…" value={refSearch} onChange={e => setRefSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
            </div>
            <select className="modern-input" value={refJobFilter} onChange={e => setRefJobFilter(e.target.value)} style={{ margin: 0, flex: 1, minWidth: 160 }}>
              <option value="all">All Jobs</option>
              {safeJobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
            <select className="modern-input" value={refStatusFilter} onChange={e => setRefStatusFilter(e.target.value)} style={{ margin: 0, flex: 1, minWidth: 130 }}>
              <option value="All">All Statuses</option>
              {REF_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {refLoading ? <div className="loader-container"><div className="loader" /></div>
          : filteredReferrals.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <FaUsers size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ margin: 0 }}>No referrals yet.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="styled-table-global">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Referred By</th>
                      <th>Job</th>
                      <th>Resume</th>
                      <th>Notes</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferrals.map(r => {
                      const sc = STATUS_COLORS[r.status] || STATUS_COLORS.New;
                      return (
                        <tr key={r._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.candidate_name}</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{r.candidate_email}</div>
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.candidate_phone}</div>
                          </td>
                          <td style={{ fontSize: 13, color: "#475569" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <FaStar size={11} color="#f59e0b" />
                              {r.referred_by_name || "—"}
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>{r.job_title || "—"}</td>
                          <td>
                            {r.resume_url ? (
                              <a href={r.resume_url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                                <FaLink size={10} /> View
                              </a>
                            ) : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ fontSize: 12, color: "#64748b", maxWidth: 150 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes || "—"}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, padding: "2px 8px", borderRadius: 4 }}>
                              {r.status || "New"}
                            </span>
                          </td>
                          <td>
                            <select
                              value={r.status || "New"}
                              onChange={e => updateReferralStatus(r._id, e.target.value)}
                              style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
                            >
                              {REF_STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>
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
