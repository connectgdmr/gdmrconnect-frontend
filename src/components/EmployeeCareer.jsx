import React, { useState, useEffect, useRef } from "react";
import {
  FaBriefcase, FaMapMarkerAlt, FaClock, FaUsers,
  FaPlus, FaTimes, FaCheckCircle, FaStar, FaFileUpload, FaFilePdf,
} from "react-icons/fa";
import { SkeletonList } from "./Skeleton";

import { API_URL as BASE } from "../api";

const TYPE_COLORS = {
  "Full-time":  { color: "#34a06a", bg: "#f0fdf4" },
  "Part-time":  { color: "#0f766e", bg: "#effdf8" },
  "Contract":   { color: "#15803d", bg: "#ecfdf5" },
  "Internship": { color: "#4d7c5f", bg: "#f3f8f4" },
};

const blankRef = () => ({ candidate_name: "", candidate_email: "", candidate_phone: "", resume_url: "", notes: "" });

export default function EmployeeCareer({ token, user }) {
  const [tab, setTab]         = useState("board");
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(false);

  const [refJobId, setRefJobId]   = useState("");
  const [refForm, setRefForm]     = useState(blankRef());
  const [resumeFile, setResumeFile] = useState(null);
  const [refSaving, setRefSaving] = useState(false);
  const [refMsg, setRefMsg]       = useState("");
  const fileInputRef = useRef(null);

  const [myRefs, setMyRefs]       = useState([]);
  const [refsLoading, setRefsLoading] = useState(false);

  const toArr = (d) => {
    if (Array.isArray(d)) return d;
    const c = d?.jobs || d?.referrals || d?.data || d?.results || [];
    return Array.isArray(c) ? c : [];
  };

  async function loadJobs() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/career/jobs`, { headers: { Authorization: `Bearer ${token}` } });
      setJobs(r.ok ? toArr(await r.json()) : []);
    } catch { setJobs([]); } finally { setLoading(false); }
  }

  async function loadMyRefs() {
    setRefsLoading(true);
    try {
      const r = await fetch(`${BASE}/my/referrals`, { headers: { Authorization: `Bearer ${token}` } });
      setMyRefs(r.ok ? toArr(await r.json()) : []);
    } catch { setMyRefs([]); } finally { setRefsLoading(false); }
  }

  useEffect(() => { loadJobs(); }, []);
  useEffect(() => { if (tab === "my-referrals") loadMyRefs(); }, [tab]);

  // Strict PDF-only validation (extension + MIME + magic bytes)
  async function handleResumeSelect(file) {
    setRefMsg("");
    if (!file) { setResumeFile(null); return; }
    const clear = () => { if (fileInputRef.current) fileInputRef.current.value = ""; setResumeFile(null); };

    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      clear(); return setRefMsg("Only PDF files are allowed.");
    }
    if (file.size > 5 * 1024 * 1024) {
      clear(); return setRefMsg("Resume must be under 5 MB.");
    }
    // Verify the real content is a PDF — genuine PDFs begin with "%PDF-"
    try {
      const header = await file.slice(0, 5).text();
      if (!header.startsWith("%PDF-")) { clear(); return setRefMsg("This file is not a valid PDF."); }
    } catch { clear(); return setRefMsg("Could not read the file. Please try again."); }

    setResumeFile(file);
  }

  async function submitReferral(e) {
    e.preventDefault();
    if (!refJobId) return setRefMsg("Please select a job.");
    if (resumeFile && resumeFile.size > 5 * 1024 * 1024) return setRefMsg("Resume must be under 5 MB.");
    setRefSaving(true); setRefMsg("");
    try {
      // Send as multipart so the optional resume file can ride along.
      const fd = new FormData();
      fd.append("job_id", refJobId);
      Object.entries(refForm).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (resumeFile) fd.append("resume", resumeFile);

      const r = await fetch(`${BASE}/career/referrals`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets multipart boundary
        body: fd,
      });
      if (r.ok) {
        setRefMsg("Referral submitted! Thank you for referring.");
        setRefForm(blankRef()); setRefJobId(""); setResumeFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const d = await r.json().catch(() => ({}));
        setRefMsg(d.message || "Failed to submit referral.");
      }
    } catch { setRefMsg("Network error. Please try again."); } finally { setRefSaving(false); }
  }

  const safeJobs   = Array.isArray(jobs)   ? jobs   : [];
  const safeMyRefs = Array.isArray(myRefs) ? myRefs : [];

  const TABS = [
    { key: "board",        label: "Job Board" },
    { key: "refer",        label: "Refer Someone" },
    { key: "my-referrals", label: "My Referrals" },
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
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "var(--red)" }}>Career & Opportunities</h3>
        <p className="small">Browse open positions and refer people you know</p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
        {TABS.map(t => tabBtn(t.key, t.label))}
      </div>

      {/* ── Job Board ── */}
      {tab === "board" && (
        loading ? <SkeletonList count={4} />
        : safeJobs.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <FaBriefcase size={40} style={{ opacity: 0.15, marginBottom: 12 }} />
            <h4 style={{ margin: "0 0 8px", color: "#64748b" }}>No open positions right now</h4>
            <p style={{ margin: 0, fontSize: 13 }}>Check back later for new opportunities.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {safeJobs.map(j => {
              const tc = TYPE_COLORS[j.employment_type] || TYPE_COLORS["Full-time"];
              const reqs = Array.isArray(j.requirements)
                ? j.requirements
                : (typeof j.requirements === "string" && j.requirements ? j.requirements.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : []);
              return (
                <div key={j._id} className="card" style={{ borderLeft: `4px solid ${tc.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{j.title}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: tc.color, background: tc.bg, padding: "2px 8px", borderRadius: 4 }}>{j.employment_type}</span>
                      </div>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                        {j.department && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FaUsers size={10} /> {j.department}</span>}
                        {j.location   && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FaMapMarkerAlt size={10} /> {j.location}</span>}
                        {(j.salary_min || j.salary_max) && <span>₹{j.salary_min || "—"} – ₹{j.salary_max || "—"}/mo</span>}
                      </div>
                      {j.description && <p style={{ margin: "0 0 8px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{j.description.slice(0, 120)}{j.description.length > 120 ? "…" : ""}</p>}
                      {reqs.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {reqs.slice(0, 5).map((r, i) => (
                            <span key={i} style={{ fontSize: 11, padding: "2px 8px", background: "#f1f5f9", borderRadius: 4, color: "#475569" }}>{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn"
                      style={{ flexShrink: 0, fontSize: 12 }}
                      onClick={() => { setRefJobId(j._id); setTab("refer"); }}
                    >
                      <FaStar size={10} /> Refer Someone
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Refer Someone ── */}
      {tab === "refer" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h4 style={{ margin: "0 0 4px", color: "#0f172a" }}>Refer a Candidate</h4>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#64748b" }}>Know someone great? Submit their details and we'll reach out.</p>

          {refMsg && (
            <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: refMsg.includes("Thank") ? "#f0fdf4" : "#fef2f2",
              color:      refMsg.includes("Thank") ? "#16a34a"  : "#b91c1c",
              border: `1px solid ${refMsg.includes("Thank") ? "#bbf7d0" : "#fecaca"}` }}>
              {refMsg.includes("Thank") && <FaCheckCircle style={{ marginRight: 6 }} />}{refMsg}
            </div>
          )}

          <form onSubmit={submitReferral}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Job Position *</label>
              <select className="modern-input" value={refJobId} onChange={e => setRefJobId(e.target.value)} required>
                <option value="">-- Select Job --</option>
                {safeJobs.map(j => <option key={j._id} value={j._id}>{j.title} {j.department ? `· ${j.department}` : ""}</option>)}
              </select>
            </div>

            {[
              { label: "Candidate Full Name *",  key: "candidate_name",  type: "text",  req: true  },
              { label: "Candidate Email *",       key: "candidate_email", type: "email", req: true  },
              { label: "Candidate Phone",         key: "candidate_phone", type: "tel",   req: false },
              { label: "LinkedIn / Portfolio URL (optional)", key: "resume_url", type: "url", req: false },
            ].map(({ label, key, type, req }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>{label}</label>
                <input className="modern-input" type={type} value={refForm[key]} required={req}
                  onChange={e => setRefForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}

            {/* Resume file upload (optional) */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>
                Upload Resume <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional · PDF only, max 5 MB)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={e => handleResumeSelect(e.target.files?.[0] || null)}
                style={{ display: "none" }}
                id="resume-upload-input"
              />
              {resumeFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
                  <FaFilePdf color="#dc2626" />
                  <span style={{ flex: 1, fontSize: 13, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resumeFile.name}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{(resumeFile.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                    <FaTimes size={13} />
                  </button>
                </div>
              ) : (
                <label htmlFor="resume-upload-input" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px", border: "1.5px dashed #cbd5e1", borderRadius: 8, cursor: "pointer",
                  color: "#64748b", fontSize: 13, fontWeight: 500, transition: "border-color 0.15s",
                }}>
                  <FaFileUpload /> Click to upload PDF resume
                </label>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>
                Notes <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea className="modern-input" value={refForm.notes} onChange={e => setRefForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Why are you recommending this person?" style={{ minHeight: 80 }} />
            </div>

            <button className="btn" type="submit" disabled={refSaving} style={{ width: "100%", justifyContent: "center" }}>
              {refSaving ? "Submitting…" : "Submit Referral"}
            </button>
          </form>
        </div>
      )}

      {/* ── My Referrals ── */}
      {tab === "my-referrals" && (
        refsLoading ? <SkeletonList count={3} />
        : safeMyRefs.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
            <FaStar size={36} style={{ opacity: 0.15, marginBottom: 12 }} />
            <p style={{ margin: 0 }}>You haven't referred anyone yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {safeMyRefs.map(r => {
              const sc = { New: "#2563eb", Shortlisted: "#7c3aed", Interview: "#d97706", Hired: "#16a34a", Rejected: "#dc2626" }[r.status] || "#64748b";
              return (
                <div key={r._id} className="card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{r.candidate_name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{r.job_title || "—"}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sc, background: `${sc}18`, padding: "3px 10px", borderRadius: 4 }}>{r.status || "New"}</span>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
