import React, { useState, useEffect } from "react";
import { TbRobot, TbRefresh } from "react-icons/tb";
import DailyWorkPlan from "./DailyWorkPlan";
import WorkHistory from "./WorkHistory";

import { API_URL as BASE } from "../api";
const RANGES = [
  { k: "week",  label: "This Week" },
  { k: "month", label: "This Month" },
];

/** AI-written summary of work history — replaces the old chart grid. Backend
 * endpoint (GET /api/my/work-analytics-ai?range=) doesn't exist yet; this
 * degrades gracefully to a "not available yet" note until it does. */
function AIAnalytics({ token }) {
  const [range, setRange] = useState("week");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  function load() {
    setLoading(true);
    fetch(`${BASE}/my/work-analytics-ai?range=${range}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.status === 404) { setAvailable(false); return null; } return r.ok ? r.json() : null; })
      .then(d => { if (d?.summary) { setSummary(d.summary); setAvailable(true); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [range, token]);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, var(--brand), var(--teal-800))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TbRobot color="#fff" size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>AI Work Insights</h4>
            <p className="small" style={{ margin: "2px 0 0" }}>A short, plain-language read on your recent work</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
            {RANGES.map(r => (
              <button key={r.k} onClick={() => setRange(r.k)} style={{ padding: "5px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: range === r.k ? "var(--brand)" : "transparent", color: range === r.k ? "#fff" : "#64748b" }}>{r.label}</button>
            ))}
          </div>
          <button onClick={load} title="Refresh" style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
            <TbRefresh size={12} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Thinking…</div>
      ) : !available ? (
        <div style={{ padding: "24px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13, background: "#f8fafc", borderRadius: 10 }}>
          AI insights aren't available yet — this needs a backend endpoint that hasn't been added.
        </div>
      ) : summary ? (
        <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{summary}</div>
      ) : (
        <div style={{ padding: "24px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Not enough logged work in this period yet to summarize.
        </div>
      )}
    </div>
  );
}

export default function WorkAnalytics({ token, user }) {
  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Today's status — same widget as the dashboard, also reachable from here */}
      <DailyWorkPlan token={token} user={user} />

      {/* Work history — filterable table with export */}
      <div className="card">
        <WorkHistory token={token} user={user} />
      </div>

      {/* AI-generated analytics — replaces the old chart grid */}
      <AIAnalytics token={token} />
    </div>
  );
}
