import React, { useState, useEffect } from "react";
import { FaTasks, FaCheckCircle, FaPercentage, FaChartLine, FaProjectDiagram } from "react-icons/fa";
import { LineChart, BarChart, DonutChart, ProgressRing } from "./Charts";
import { SkeletonStats, SkeletonTable } from "./Skeleton";

const BASE = "https://gdmrconnect-backend-production.up.railway.app/api";
const RANGES = [
  { k: "today", label: "Today" },
  { k: "week",  label: "This Week" },
  { k: "month", label: "This Month" },
];

export default function WorkAnalytics({ token }) {
  const [range, setRange]   = useState("week");
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/my/work-analytics?range=${range}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d || {}))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [range, token]);

  const submitted = data?.tasks_submitted ?? 0;
  const completed = data?.tasks_completed ?? 0;
  const pct = submitted > 0 ? Math.round((completed / submitted) * 100) : 0;
  const daily   = data?.daily_trend   || [];   // [{label, value}]
  const weekly  = data?.weekly_trend  || [];   // [{label, value}]
  const projects = (data?.projects || []).map(p => ({ label: p.name || p.label, value: p.count ?? p.value })); // [{name,count}]

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)" }}>My Work Analytics</h3>
          <p className="small">Track your tasks, completion rate and productivity trends</p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 99, padding: 4 }}>
          {RANGES.map(r => (
            <button key={r.k} onClick={() => setRange(r.k)} style={{
              padding: "6px 16px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
              background: range === r.k ? "var(--brand)" : "transparent", color: range === r.k ? "#fff" : "#64748b",
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      {loading ? <><SkeletonStats count={4} /><div style={{ marginTop: 14 }}><SkeletonTable rows={6} cols={3} /></div></> : (
      <>
        {/* KPI tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
          {[
            { icon: <FaTasks />,       label: "Tasks Submitted", value: submitted, color: "var(--brand)", bg: "var(--brand-light)" },
            { icon: <FaCheckCircle />, label: "Tasks Completed", value: completed, color: "#16a34a", bg: "#f0fdf4" },
            { icon: <FaPercentage />,  label: "Completion Rate", value: `${pct}%`,  color: "#0f766e", bg: "#effdf8" },
            { icon: <FaChartLine />,   label: "Active Days",     value: data?.active_days ?? daily.filter(d => d.value > 0).length, color: "#7c3aed", bg: "#f5f3ff" },
          ].map(s => (
            <div key={s.label} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
              <div><div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{s.label}</div></div>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start" }} className="wa-grid">
          <div className="card">
            <h4 className="widget-title">Daily Activity Trend</h4>
            <LineChart data={daily} valueLabel="tasks" />
          </div>
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <h4 className="widget-title" style={{ alignSelf: "flex-start" }}>Completion</h4>
            <ProgressRing percent={pct} size={150} label={`${completed} of ${submitted}`} />
          </div>
          <div className="card">
            <h4 className="widget-title">Weekly Productivity</h4>
            <BarChart data={weekly.length ? weekly : daily} />
          </div>
          <div className="card">
            <h4 className="widget-title"><FaProjectDiagram size={12} /> Project Contribution</h4>
            {projects.length ? <DonutChart segments={projects} centerLabel={projects.reduce((s,p)=>s+p.value,0)} centerSub="tasks" /> : <div style={{ padding: "30px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No project data yet.</div>}
          </div>
        </div>
      </>
      )}
      <style>{`@media (max-width: 820px){ .wa-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
