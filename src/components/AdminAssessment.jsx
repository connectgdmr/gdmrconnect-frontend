import React, { useState, useEffect } from "react";
import {
  FaPlus, FaTimes, FaPaperPlane, FaEdit, FaTrash,
  FaCheckCircle, FaTimesCircle, FaClipboardList, FaUserGraduate,
  FaClock, FaChartBar, FaSearch,
} from "react-icons/fa";

const BASE = "https://gdmrconnect-backend-production.up.railway.app/api";

const STATUS_STYLE = {
  pending:   { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  started:   { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  completed: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  expired:   { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status?.toLowerCase()] || STATUS_STYLE.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
      color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {status || "Pending"}
    </span>
  );
}

function QuestionCard({ q, idx, onChange, onRemove }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 12, background: "#fafafa" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, color: "#64748b", fontSize: 12 }}>Q{idx + 1}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={q.type}
            onChange={e => onChange(idx, { ...q, type: e.target.value })}
            style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff" }}
          >
            <option value="mcq">Multiple Choice</option>
            <option value="text">Text Answer</option>
          </select>
          <button onClick={() => onRemove(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
            <FaTimes size={13} />
          </button>
        </div>
      </div>

      <input
        className="modern-input"
        placeholder="Question text…"
        value={q.text}
        onChange={e => onChange(idx, { ...q, text: e.target.value })}
        style={{ marginBottom: 10 }}
      />

      {q.type === "mcq" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {q.options.map((opt, oi) => (
            <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="radio"
                name={`correct-${idx}`}
                checked={q.correctIndex === oi}
                onChange={() => onChange(idx, { ...q, correctIndex: oi })}
                title="Mark as correct answer"
              />
              <input
                className="modern-input"
                placeholder={`Option ${oi + 1}`}
                value={opt}
                onChange={e => {
                  const opts = [...q.options];
                  opts[oi] = e.target.value;
                  onChange(idx, { ...q, options: opts });
                }}
                style={{ margin: 0, flex: 1 }}
              />
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Select radio button to mark correct answer</div>
        </div>
      ) : (
        <textarea
          className="modern-input"
          placeholder="Expected answer / keywords (for reference during manual grading)…"
          value={q.expectedAnswer || ""}
          onChange={e => onChange(idx, { ...q, expectedAnswer: e.target.value })}
          style={{ minHeight: 70, resize: "vertical" }}
        />
      )}
    </div>
  );
}

const blankAssessForm = () => ({ title: "", description: "", duration: 30, passingScore: 60 });
const blankQuestion   = () => ({ type: "mcq", text: "", options: ["", "", "", ""], correctIndex: 0, expectedAnswer: "" });
const blankInviteForm = () => ({ name: "", email: "", phone: "", assessmentId: "" });

export default function AdminAssessment({ token }) {
  const [tab, setTab]           = useState("assessments");
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]   = useState(false);

  const [builderMode, setBuilderMode] = useState("create");
  const [editId, setEditId]     = useState(null);
  const [assessForm, setAssessForm] = useState(blankAssessForm());
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [saving, setSaving]     = useState(false);

  const [inviteForm, setInviteForm] = useState(blankInviteForm());
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const [candidates, setCandidates] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const [candSearch, setCandSearch] = useState("");

  const [selectedResult, setSelectedResult] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);

  const [msg, setMsg] = useState({ text: "", type: "" });

  const flash = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3500); };

  const toArr = (d) => Array.isArray(d) ? d : (d?.assessments || d?.candidates || d?.data || []);

  async function loadAssessments() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/assessments`, { headers: { Authorization: `Bearer ${token}` } });
      setAssessments(r.ok ? toArr(await r.json()) : []);
    } catch { setAssessments([]); } finally { setLoading(false); }
  }

  async function loadCandidates() {
    setCandLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/assessments/candidates`, { headers: { Authorization: `Bearer ${token}` } });
      setCandidates(r.ok ? toArr(await r.json()) : []);
    } catch { setCandidates([]); } finally { setCandLoading(false); }
  }

  useEffect(() => { loadAssessments(); }, []);
  useEffect(() => { if (tab === "candidates") loadCandidates(); }, [tab]);

  function startEdit(a) {
    setBuilderMode("edit"); setEditId(a._id);
    setAssessForm({ title: a.title, description: a.description || "", duration: a.duration || 30, passingScore: a.passing_score || 60 });
    setQuestions(a.questions?.length ? a.questions : [blankQuestion()]);
    setTab("builder");
  }

  function startCreate() {
    setBuilderMode("create"); setEditId(null);
    setAssessForm(blankAssessForm()); setQuestions([blankQuestion()]);
    setTab("builder");
  }

  async function saveAssessment(e) {
    e.preventDefault();
    if (!assessForm.title) return flash("Title is required.", "error");
    if (!questions.some(q => q.text.trim())) return flash("Add at least one question.", "error");
    setSaving(true);
    const payload = { ...assessForm, passing_score: assessForm.passingScore, questions };
    try {
      const r = await fetch(
        `${BASE}/admin/assessments${editId ? `/${editId}` : ""}`,
        { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }
      );
      if (r.ok) { flash(editId ? "Assessment updated." : "Assessment created."); loadAssessments(); setTab("assessments"); }
      else { const d = await r.json(); flash(d.message || "Failed to save.", "error"); }
    } catch { flash("Network error.", "error"); } finally { setSaving(false); }
  }

  async function deleteAssessment(id) {
    if (!window.confirm("Delete this assessment?")) return;
    await fetch(`${BASE}/admin/assessments/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadAssessments();
  }

  async function sendInvite(e) {
    e.preventDefault();
    if (!inviteForm.assessmentId) return setInviteMsg("Select an assessment first.");
    setInviteSaving(true); setInviteMsg("");
    try {
      const r = await fetch(`${BASE}/admin/assessments/invite`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(inviteForm),
      });
      if (r.ok) { setInviteMsg("Invitation sent successfully!"); setInviteForm(blankInviteForm()); }
      else { const d = await r.json(); setInviteMsg(d.message || "Failed to send invitation."); }
    } catch { setInviteMsg("Network error."); } finally { setInviteSaving(false); }
  }

  async function loadResult(candidateId) {
    setSelectedResult(null); setResultLoading(true); setTab("results");
    try {
      const r = await fetch(`${BASE}/admin/assessments/candidates/${candidateId}/result`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setSelectedResult(await r.json());
    } catch { } finally { setResultLoading(false); }
  }

  const TABS = [
    { key: "assessments", label: "Assessments" },
    { key: "builder",     label: builderMode === "edit" ? "Edit Assessment" : "Create" },
    { key: "invite",      label: "Invite Candidate" },
    { key: "candidates",  label: "Candidates" },
    { key: "results",     label: "Results" },
  ];

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{
      padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
      background: tab === key ? "var(--red)" : "transparent",
      color: tab === key ? "#fff" : "#64748b",
      transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--red)" }}>Assessments</h3>
          <p className="small">Create and manage pre-employment and onboarding assessments</p>
        </div>
        <button className="btn" onClick={startCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FaPlus size={11} /> New Assessment
        </button>
      </div>

      {/* Flash message */}
      {msg.text && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: msg.type === "error" ? "#fef2f2" : "#f0fdf4",
          color: msg.type === "error" ? "#b91c1c" : "#16a34a",
          border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>
          {msg.text}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
        {TABS.map(t => tabBtn(t.key, t.label))}
      </div>

      {/* ── Assessments list ── */}
      {tab === "assessments" && (
        loading ? <div className="loader-container"><div className="loader" /></div>
        : assessments.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <FaClipboardList size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ margin: 0 }}>No assessments yet. Create one to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {assessments.map(a => (
              <div key={a._id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h4 style={{ margin: 0, color: "#0f172a", fontSize: 15 }}>{a.title}</h4>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-action btn-edit" onClick={() => startEdit(a)} title="Edit"><FaEdit /></button>
                    <button className="btn-action btn-remove" onClick={() => deleteAssessment(a._id)} title="Delete"><FaTrash /></button>
                  </div>
                </div>
                {a.description && <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{a.description.slice(0, 80)}{a.description.length > 80 ? "…" : ""}</p>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                    <FaClock size={11} color="#94a3b8" /> {a.duration || 30} min
                  </span>
                  <span style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                    <FaClipboardList size={11} color="#94a3b8" /> {a.questions?.length || 0} questions
                  </span>
                  <span style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                    <FaChartBar size={11} color="#94a3b8" /> Pass: {a.passing_score || 60}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Question Builder ── */}
      {tab === "builder" && (
        <form onSubmit={saveAssessment}>
          <div className="card" style={{ marginBottom: 14 }}>
            <h4 style={{ margin: "0 0 16px", color: "#0f172a" }}>Assessment Details</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Title *</label>
                <input className="modern-input" value={assessForm.title} onChange={e => setAssessForm({ ...assessForm, title: e.target.value })} placeholder="e.g. Frontend Developer Screening" required />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Description</label>
                <textarea className="modern-input" value={assessForm.description} onChange={e => setAssessForm({ ...assessForm, description: e.target.value })} placeholder="Brief description shown to candidates…" style={{ minHeight: 70 }} />
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Duration (minutes)</label>
                <input className="modern-input" type="number" min={5} max={180} value={assessForm.duration} onChange={e => setAssessForm({ ...assessForm, duration: +e.target.value })} />
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Passing Score (%)</label>
                <input className="modern-input" type="number" min={0} max={100} value={assessForm.passingScore} onChange={e => setAssessForm({ ...assessForm, passingScore: +e.target.value })} />
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h4 style={{ margin: 0, color: "#0f172a" }}>Questions ({questions.length})</h4>
              <button type="button" className="btn ghost" onClick={() => setQuestions([...questions, blankQuestion()])} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <FaPlus size={10} /> Add Question
              </button>
            </div>
            {questions.map((q, i) => (
              <QuestionCard key={i} q={q} idx={i}
                onChange={(i, updated) => setQuestions(prev => prev.map((x, j) => j === i ? updated : x))}
                onRemove={i => setQuestions(prev => prev.filter((_, j) => j !== i))}
              />
            ))}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 14, marginTop: 4 }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : builderMode === "edit" ? "Save Changes" : "Create Assessment"}</button>
              <button className="btn ghost" type="button" onClick={() => setTab("assessments")}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {/* ── Invite Candidate ── */}
      {tab === "invite" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h4 style={{ margin: "0 0 18px", color: "#0f172a" }}>Invite a Candidate</h4>
          {inviteMsg && (
            <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: inviteMsg.includes("success") ? "#f0fdf4" : "#fef2f2",
              color: inviteMsg.includes("success") ? "#16a34a" : "#b91c1c",
              border: `1px solid ${inviteMsg.includes("success") ? "#bbf7d0" : "#fecaca"}` }}>
              {inviteMsg}
            </div>
          )}
          <form onSubmit={sendInvite}>
            {[{ label: "Full Name", key: "name", type: "text" }, { label: "Email Address", key: "email", type: "email" }, { label: "Phone Number", key: "phone", type: "tel" }].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>{label}</label>
                <input className="modern-input" type={type} value={inviteForm[key]} onChange={e => setInviteForm({ ...inviteForm, [key]: e.target.value })} required />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Select Assessment</label>
              <select className="modern-input" value={inviteForm.assessmentId} onChange={e => setInviteForm({ ...inviteForm, assessmentId: e.target.value })} required>
                <option value="">-- Choose Assessment --</option>
                {assessments.map(a => <option key={a._id} value={a._id}>{a.title} ({a.duration} min)</option>)}
              </select>
            </div>
            <button className="btn" type="submit" disabled={inviteSaving} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", justifyContent: "center" }}>
              <FaPaperPlane size={12} /> {inviteSaving ? "Sending…" : "Send Assessment Link"}
            </button>
          </form>
        </div>
      )}

      {/* ── Candidates ── */}
      {tab === "candidates" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "center" }}>
            <FaSearch color="#94a3b8" />
            <input style={{ border: "none", outline: "none", flex: 1, fontSize: 14, background: "transparent" }}
              placeholder="Search candidate name or email…" value={candSearch} onChange={e => setCandSearch(e.target.value)} />
          </div>
          {candLoading ? <div className="loader-container"><div className="loader" /></div>
          : candidates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>
              <FaUserGraduate size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p>No candidates invited yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="styled-table-global">
                <thead><tr><th>Candidate</th><th>Assessment</th><th>Status</th><th>Invited</th><th>Action</th></tr></thead>
                <tbody>
                  {candidates.filter(c => !candSearch || c.name?.toLowerCase().includes(candSearch.toLowerCase()) || c.email?.toLowerCase().includes(candSearch.toLowerCase())).map(c => (
                    <tr key={c._id}>
                      <td><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 12, color: "#64748b" }}>{c.email}</div></td>
                      <td style={{ fontSize: 13 }}>{c.assessment_title || "—"}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td style={{ fontSize: 12, color: "#94a3b8" }}>{c.invited_at ? new Date(c.invited_at).toLocaleDateString("en-GB") : "—"}</td>
                      <td>
                        {c.status === "completed" && (
                          <button className="btn ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => loadResult(c._id)}>
                            <FaChartBar size={11} /> View Results
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {tab === "results" && (
        resultLoading ? <div className="loader-container"><div className="loader" /></div>
        : !selectedResult ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <FaChartBar size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p>Select a completed candidate from the Candidates tab to view results.</p>
          </div>
        ) : (
          <div>
            <div className="card" style={{ marginBottom: 14, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{selectedResult.candidate_name}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>{selectedResult.assessment_title}</div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center", padding: "10px 18px", borderRadius: 10, background: "#f8fafc" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--red)" }}>{selectedResult.score}%</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Score</div>
                </div>
                <div style={{ textAlign: "center", padding: "10px 18px", borderRadius: 10, background: "#f8fafc" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#334155" }}>{selectedResult.time_taken || "—"}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Minutes</div>
                </div>
                <div style={{ textAlign: "center", padding: "10px 18px", borderRadius: 10,
                  background: selectedResult.passed ? "#f0fdf4" : "#fef2f2" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: selectedResult.passed ? "#16a34a" : "#dc2626" }}>
                    {selectedResult.passed ? "PASSED" : "FAILED"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Result</div>
                </div>
              </div>
            </div>

            {selectedResult.answers?.length > 0 && (
              <div className="card">
                <h4 style={{ margin: "0 0 14px" }}>Answer Review</h4>
                {selectedResult.answers.map((a, i) => (
                  <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      {a.correct ? <FaCheckCircle color="#16a34a" style={{ marginTop: 2, flexShrink: 0 }} /> : <FaTimesCircle color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>Q{i + 1}: {a.question}</div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Answer: <span style={{ fontWeight: 600 }}>{a.given_answer}</span></div>
                        {!a.correct && a.correct_answer && <div style={{ fontSize: 12, color: "#16a34a" }}>Correct: {a.correct_answer}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
