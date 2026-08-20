import React, { useState, useEffect, useRef, useCallback } from "react";
import Logo from "../assets/GDMR-LOGO-unit.png";
import { FaClock, FaCheckCircle, FaExclamationTriangle, FaLock } from "react-icons/fa";

import { API_URL as BASE } from "../api";

function pad(n) { return String(n).padStart(2, "0"); }

export default function TakeAssessment({ assessmentToken }) {
  const [phase, setPhase] = useState("loading"); // loading | info | taking | submitted | error
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [tabWarnings, setTabWarnings] = useState(0);
  const [starting, setStarting] = useState(false);

  const timerRef   = useRef(null);
  const startedRef = useRef(false);

  // ── Load assessment ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${BASE}/assessment/${assessmentToken}`)
      .then(async r => {
        if (!r.ok) { const d = await r.json(); throw new Error(d.message || "Link is invalid or has expired."); }
        return r.json();
      })
      .then(data => {
        setAssessment(data);
        setTimeLeft((data.duration || 30) * 60);
        setPhase("info");
      })
      .catch(err => { setErrorMsg(err.message); setPhase("error"); });
  }, [assessmentToken]);

  // ── Tab-visibility guard ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "taking") return;
    const handleVisibility = () => {
      if (document.hidden) {
        setTabWarnings(w => {
          const next = w + 1;
          if (next >= 3) { submitAnswers(true); }
          return next;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase]);

  // ── Fullscreen request ────────────────────────────────────────────────────────
  function requestFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  // ── Countdown timer ───────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); submitAnswers(false, true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // The actual question text/options are only ever fetched here, via the
  // one-shot POST .../start — the initial page-load GET (above) only ever
  // returns a safe title/description/count preview and never marks the
  // invite "started", precisely so that closing this tab and reopening the
  // same link can't hand back a second fresh look at the questions (see
  // routes/assessment.py's get_assessment_by_token()/start_assessment_by_token()
  // for why the GET had to stop mutating status).
  async function startAssessment() {
    if (starting) return;
    setStarting(true);
    try {
      const r = await fetch(`${BASE}/assessment/${assessmentToken}/start`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) { setErrorMsg(data.message || "This assessment can no longer be started."); setPhase("error"); return; }
      setAssessment(a => ({ ...a, ...data }));
      requestFullscreen();
      setPhase("taking");
      startTimer();
    } catch {
      setErrorMsg("Network error — please check your connection and try again.");
      setPhase("error");
    } finally {
      setStarting(false);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function submitAnswers(forcedByTab = false, timedOut = false) {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true);

    const payload = {
      token: assessmentToken,
      answers: Object.entries(answers).map(([qIdx, ans]) => ({ question_index: +qIdx, answer: ans })),
      forced: forcedByTab,
      timed_out: timedOut,
    };

    try {
      const r = await fetch(`${BASE}/assessment/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      setResult(data);
      setPhase("submitted");
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch {
      setResult({ message: "Your responses have been recorded." });
      setPhase("submitted");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to submit? You cannot change your answers after this.")) return;
    submitAnswers();
  }

  // ── Renders ───────────────────────────────────────────────────────────────────

  // #root is globally height:100vh + overflow:hidden (the dashboard shell's
  // fixed-viewport layout — see App.css) — this page renders standalone,
  // outside that shell's own scrollable content area, so it must give
  // itself an explicit scroll container or anything taller than one
  // viewport (e.g. many stacked questions) just gets silently clipped with
  // no way to reach the rest of the page.
  const Shell = ({ children }) => (
    <div style={{ height: "100vh", overflowY: "auto", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <img src={Logo} alt="GDMR" style={{ height: 44, marginBottom: 24, opacity: 0.9 }} />
      {children}
    </div>
  );

  if (phase === "loading") return (
    <Shell>
      <div className="loader" style={{ margin: "0 auto 16px" }} />
      <p style={{ color: "#64748b", fontSize: 14 }}>Loading your assessment…</p>
    </Shell>
  );

  if (phase === "error") return (
    <Shell>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", textAlign: "center", maxWidth: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <FaExclamationTriangle size={36} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 10px", color: "#0f172a" }}>Link Not Found</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>{errorMsg}</p>
      </div>
    </Shell>
  );

  if (phase === "submitted") return (
    <Shell>
      <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", textAlign: "center", maxWidth: 440, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <FaCheckCircle size={52} color="#16a34a" style={{ marginBottom: 18 }} />
        <h2 style={{ margin: "0 0 12px", color: "#0f172a", fontSize: 22 }}>Assessment Submitted</h2>
        <p style={{ color: "#64748b", fontSize: 15, margin: "0 0 6px", lineHeight: 1.6 }}>
          Thank you for completing the assessment.
        </p>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
          The GDMR Connect team will review your responses and be in touch with you shortly.
        </p>
      </div>
    </Shell>
  );

  if (phase === "info" && assessment) return (
    <Shell>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", maxWidth: 500, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <h2 style={{ margin: "0 0 6px", color: "var(--red, #b91c1c)", fontSize: 22 }}>{assessment.title}</h2>
        {assessment.description && <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>{assessment.description}</p>}

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
          {[
            { icon: <FaClock size={14} />, label: `${assessment.duration || 30} minutes` },
            { icon: <FaLock size={14} />, label: `${assessment.question_count ?? assessment.questions?.length ?? 0} questions` },
            { icon: <FaCheckCircle size={14} color="#16a34a" />, label: `Pass: ${assessment.passing_score || 60}%` },
          ].map(({ icon, label }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#475569" }}>
              <span style={{ color: "#94a3b8" }}>{icon}</span> {label}
            </div>
          ))}
        </div>

        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>Important Rules</div>
          <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, color: "#64748b", lineHeight: 2 }}>
            <li>Do not switch tabs or minimize the window — it will be recorded.</li>
            <li>3 tab switches will auto-submit your assessment.</li>
            <li>The timer starts as soon as you click Begin.</li>
            <li>You cannot go back once submitted.</li>
          </ul>
        </div>

        <button
          onClick={startAssessment}
          disabled={starting}
          style={{ width: "100%", padding: "14px", background: "var(--red, #b91c1c)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: starting ? "not-allowed" : "pointer", letterSpacing: "0.02em", opacity: starting ? 0.7 : 1 }}
        >
          {starting ? "Starting…" : "Begin Assessment"}
        </button>
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: "10px 0 0" }}>By clicking Begin you agree to follow the assessment rules.</p>
      </div>
    </Shell>
  );

  if (phase === "taking" && assessment) {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const urgent = timeLeft < 300;

    return (
      <div style={{ height: "100vh", overflowY: "auto", background: "#f8fafc", paddingBottom: 80 }}>
        {/* Sticky header */}
        <div style={{ position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #e2e8f0", zIndex: 100, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={Logo} alt="GDMR" style={{ height: 30 }} />
            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{assessment.title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {tabWarnings > 0 && (
              <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, background: "#fef2f2", padding: "3px 8px", borderRadius: 6 }}>
                <FaExclamationTriangle size={10} style={{ marginRight: 4 }} />
                {tabWarnings}/3 tab switch{tabWarnings > 1 ? "es" : ""}
              </span>
            )}
            <div style={{
              display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 16,
              color: urgent ? "#dc2626" : "#0f172a",
              background: urgent ? "#fef2f2" : "#f8fafc",
              padding: "6px 14px", borderRadius: 8,
            }}>
              <FaClock size={14} /> {pad(mins)}:{pad(secs)}
            </div>
          </div>
        </div>

        {/* Questions */}
        <div style={{ maxWidth: 720, margin: "32px auto", padding: "0 20px" }}>
          <form onSubmit={handleSubmit}>
            {assessment.questions?.map((q, qi) => (
              <div key={qi} style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red, #b91c1c)", background: "#fef2f2", padding: "2px 8px", borderRadius: 4, flexShrink: 0, alignSelf: "flex-start" }}>Q{qi + 1}</span>
                  <p style={{ margin: 0, fontWeight: 600, color: "#0f172a", fontSize: 15, lineHeight: 1.5 }}>{q.text}</p>
                </div>

                {q.type === "mcq" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {q.options?.map((opt, oi) => {
                      const selected = answers[qi] === String(oi);
                      return (
                        <label key={oi} style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 9, cursor: "pointer",
                          border: `1.5px solid ${selected ? "var(--red, #b91c1c)" : "#e2e8f0"}`,
                          background: selected ? "#fef2f2" : "#fff", transition: "all 0.12s",
                        }}>
                          <input
                            type="radio"
                            name={`q_${qi}`}
                            value={String(oi)}
                            checked={selected}
                            onChange={() => setAnswers(a => ({ ...a, [qi]: String(oi) }))}
                            style={{ flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 14, color: selected ? "var(--red, #b91c1c)" : "#334155", fontWeight: selected ? 600 : 400 }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    placeholder="Type your answer here…"
                    value={answers[qi] || ""}
                    onChange={e => setAnswers(a => ({ ...a, [qi]: e.target.value }))}
                    style={{ width: "100%", minHeight: 100, borderRadius: 9, border: "1.5px solid #e2e8f0", padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                  />
                )}
              </div>
            ))}

            <div style={{ background: "#fff", borderRadius: 14, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                {Object.keys(answers).length} of {assessment.questions?.length || 0} answered
              </span>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: "12px 28px", background: "var(--red, #b91c1c)", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 15, cursor: submitting ? "not-allowed" : "pointer" }}
              >
                {submitting ? "Submitting…" : "Submit Assessment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
