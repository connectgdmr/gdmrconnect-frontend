import React, { useState, useEffect } from "react";
import { TbSparkles, TbRefresh, TbSend, TbCircleCheck, TbAlertTriangle, TbBulb } from "react-icons/tb";
import { API_URL as BASE } from "../api";

const SUGGESTIONS = [
  "Why are candidates getting stuck?",
  "Which source brings the best candidates?",
  "Who should we interview next?",
  "Which roles have the most applicants?",
];

const SECTIONS = [
  { key: "highlights", title: "What's going well", icon: <TbCircleCheck />, color: "#16a34a", bg: "#f0fdf4" },
  { key: "risks", title: "Watch out for", icon: <TbAlertTriangle />, color: "#d97706", bg: "#fffbeb" },
  { key: "actions", title: "Suggested next steps", icon: <TbBulb />, color: "#2563eb", bg: "#eff6ff" },
];

const CACHE_KEY = "ats_ai_overview_v1";

function ago(iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

export default function ATSAIOverview({ token }) {
  const [overview, setOverview] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chat, setChat] = useState([]); // [{q, a?, error?}]

  async function post(body) {
    const r = await fetch(`${BASE}/admin/ats/ai-overview`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || "Something went wrong. Please try again.");
    return d;
  }

  async function generate(refresh = false) {
    setLoading(true); setError("");
    try {
      const d = await post({ refresh });
      setOverview(d);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch { /* private mode */ }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function ask(q) {
    const text = (q ?? question).trim();
    if (!text || asking) return;
    setQuestion(""); setAsking(true);
    setChat(c => [...c, { q: text }]);
    try {
      const d = await post({ question: text });
      setChat(c => c.map((x, i) => (i === c.length - 1 ? { ...x, a: d.answer } : x)));
    } catch (e) {
      setChat(c => c.map((x, i) => (i === c.length - 1 ? { ...x, error: e.message } : x)));
    } finally { setAsking(false); }
  }

  // re-render the "x min ago" label occasionally
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 60000); return () => clearInterval(id); }, []);

  const hasContent = overview && (overview.headline || overview.highlights?.length || overview.risks?.length || overview.actions?.length);

  return (
    <div className="card" style={{ padding: 18, marginBottom: 16, border: "1px solid #e6efe9", background: "linear-gradient(135deg, #fbfefc 0%, #ffffff 60%)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}><TbSparkles /></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>AI Overview</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
              {overview?.as_of ? `Updated ${ago(overview.as_of)}` : "A plain-English read of your recruitment data"}
            </div>
          </div>
        </div>
        <button className="btn" onClick={() => generate(!!hasContent)} disabled={loading}
          style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          {hasContent ? <TbRefresh size={13} /> : <TbSparkles size={13} />}
          {loading ? "Analysing…" : hasContent ? "Refresh insights" : "Generate overview"}
        </button>
      </div>

      {error && <div style={{ padding: "9px 12px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

      {loading && !hasContent && (
        <div style={{ padding: "22px 6px", color: "#94a3b8", fontSize: 13 }}>Reading today's numbers and candidate records… this takes a few seconds.</div>
      )}

      {hasContent && (
        <div style={{ opacity: loading ? 0.5 : 1, transition: "opacity .2s" }}>
          {overview.headline && <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.5, marginBottom: 12 }}>{overview.headline}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {SECTIONS.filter(s => overview[s.key]?.length).map(s => (
              <div key={s.key} style={{ background: s.bg, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: s.color, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.icon}{s.title}</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: "#334155", lineHeight: 1.6 }}>
                  {overview[s.key].map((t, i) => <li key={i} style={{ marginBottom: 3 }}>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ask your data ── */}
      <div style={{ marginTop: hasContent ? 16 : 6, paddingTop: 14, borderTop: hasContent ? "1px solid #eef2f6" : "none" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Ask about your candidates</div>
        {chat.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{m.q}</div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: m.error ? "#b91c1c" : "#334155", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {m.a ?? m.error ?? "Thinking…"}
            </div>
          </div>
        ))}
        {chat.length === 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => ask(s)} disabled={asking}
                style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer" }}>{s}</button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); ask(); }} style={{ display: "flex", gap: 8 }}>
          <input className="modern-input" value={question} onChange={e => setQuestion(e.target.value)} maxLength={400}
            placeholder="e.g. Which Intern - HR candidates are from Ernakulam?" style={{ margin: 0, flex: 1 }} />
          <button className="btn" type="submit" disabled={asking || !question.trim()} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <TbSend size={13} /> {asking ? "Thinking…" : "Ask"}
          </button>
        </form>
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 8 }}>
          AI-generated from your recruitment data — check important decisions. Names, roles, skills and stages are sent to the AI provider (Groq); phone numbers, emails and resumes are not.
        </div>
      </div>
    </div>
  );
}
