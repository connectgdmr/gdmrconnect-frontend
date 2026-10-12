import React, { useState, useEffect, useCallback } from "react";
import {
  TbUserPlus, TbArrowsExchange, TbCalendarEvent, TbHeartHandshake, TbCircleCheck, TbFileCheck,
  TbRefresh, TbAlertTriangle, TbClockPause, TbMailForward, TbFileSearch, TbVideo, TbFileUpload,
} from "react-icons/tb";
import { API_URL as BASE } from "../api";

const TZ = "Asia/Kolkata";
const dayKey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD in IST
const timeOf = (d) => new Date(d).toLocaleTimeString("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });

function dayLabel(key) {
  const today = dayKey(new Date());
  const yest = dayKey(new Date(Date.now() - 86400000));
  if (key === today) return "Today";
  if (key === yest) return "Yesterday";
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const REASON_META = {
  offer_pending: { icon: <TbMailForward />, color: "#d97706", bg: "#fffbeb", title: "Waiting on candidate" },
  docs_review:   { icon: <TbFileSearch />,  color: "#7c3aed", bg: "#f5f3ff", title: "Documents to review" },
  unreviewed:    { icon: <TbAlertTriangle />, color: "#dc2626", bg: "#fef2f2", title: "Not reviewed yet" },
  stalled:       { icon: <TbClockPause />,  color: "#0f766e", bg: "#effdf8", title: "Stuck in a stage" },
};

const TILES = [
  { key: "new_applications", label: "New applicants", icon: <TbUserPlus />, color: "var(--brand)", bg: "var(--brand-light)" },
  { key: "status_changes", label: "Moved forward", icon: <TbArrowsExchange />, color: "#2563eb", bg: "#eff6ff" },
  { key: "interviews", label: "Interviews set", icon: <TbCalendarEvent />, color: "#7c3aed", bg: "#f5f3ff" },
  { key: "offers_released", label: "Offers sent", icon: <TbHeartHandshake />, color: "#0f766e", bg: "#effdf8" },
  { key: "joined", label: "Joined", icon: <TbCircleCheck />, color: "#16a34a", bg: "#f0fdf4" },
  { key: "documents", label: "Documents in", icon: <TbFileCheck />, color: "#d97706", bg: "#fffbeb" },
];

function Delta({ now, before }) {
  const diff = now - before;
  if (!diff) return <span style={{ fontSize: 11, color: "#94a3b8" }}>same as yesterday</span>;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: diff > 0 ? "#16a34a" : "#dc2626" }}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff)} vs yesterday
    </span>
  );
}

function EventLine({ e, statusColor }) {
  const pill = (s) => {
    const c = statusColor(s);
    return <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 4, color: c.c, background: c.b, whiteSpace: "nowrap" }}>{s}</span>;
  };
  const who = e.by ? <b>{e.by}</b> : "Someone";
  const name = <b style={{ color: "#0f172a" }}>{e.name}</b>;
  if (e.type === "applied") return <>{name} applied{e.role ? <> for <b>{e.role}</b></> : null}</>;
  if (e.type === "recording") return <>{who} added a recording ({e.to}) for {name}</>;
  if (e.type === "document") return <>{name} uploaded <b>{e.to}</b></>;
  return <>{who} moved {name} {e.from ? <>from {pill(e.from)} to {pill(e.to)}</> : <>to {pill(e.to)}</>}</>;
}

const EVENT_ICON = {
  applied: { icon: <TbUserPlus />, color: "var(--brand)", bg: "var(--brand-light)" },
  status: { icon: <TbArrowsExchange />, color: "#2563eb", bg: "#eff6ff" },
  recording: { icon: <TbVideo />, color: "#7c3aed", bg: "#f5f3ff" },
  document: { icon: <TbFileUpload />, color: "#d97706", bg: "#fffbeb" },
};

export default function ATSActivity({ token, onOpen, statusColor, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [attFilter, setAttFilter] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${BASE}/admin/ats/activity?days=14`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { setData(d); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 120000); // keep the "today" view fresh while it's open
    return () => clearInterval(id);
  }, [load, refreshKey]);

  if (error && !data) {
    return <div className="card" style={{ marginBottom: 16, color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 24 }}>
      Couldn't load today's activity. <button className="btn ghost" onClick={load} style={{ marginLeft: 8, fontSize: 12 }}>Try again</button>
    </div>;
  }
  if (!data) return <div className="card" style={{ marginBottom: 16, height: 120, opacity: 0.5 }} />;

  const { today, yesterday, week, trend, funnel, attention, attention_total: attTotal, events } = data;
  const todayStr = new Date().toLocaleDateString("en-IN", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

  const attCounts = attention.reduce((m, a) => { m[a.reason] = (m[a.reason] || 0) + 1; return m; }, {});
  const attShown = attFilter === "all" ? attention : attention.filter(a => a.reason === attFilter);

  // Group the activity feed by IST day
  const groups = [];
  (showAllEvents ? events : events.slice(0, 12)).forEach(e => {
    const k = dayKey(e.at);
    const g = groups[groups.length - 1];
    if (g && g.key === k) g.items.push(e); else groups.push({ key: k, items: [e] });
  });

  const maxTrend = Math.max(1, ...trend.map(t => Math.max(t.applications, t.moves)));
  const topFunnel = Math.max(1, funnel[0]?.count || 1);

  const sectionTitle = { margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* ── Today at a glance ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Today in Recruitment</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{todayStr} · this week: {week.new_applications} new applicants, {week.status_changes} moves, {week.joined} joined</div>
        </div>
        <button className="btn ghost" onClick={load} disabled={loading} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <TbRefresh size={13} /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        {TILES.map(t => (
          <div key={t.key} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: t.bg, color: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{t.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{today[t.key]}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{t.label}</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}><Delta now={today[t.key]} before={yesterday[t.key]} /></div>
          </div>
        ))}
      </div>

      {/* ── Needs attention + activity feed ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start", marginBottom: 16 }} className="ats-grid">
        <div className="card">
          <h4 style={sectionTitle}>
            Needs your attention
            {attTotal > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#fef2f2", color: "#dc2626", borderRadius: 10, padding: "1px 8px" }}>{attTotal}</span>}
          </h4>
          {attention.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {[["all", "All", attention.length], ...Object.entries(REASON_META).filter(([k]) => attCounts[k]).map(([k, m]) => [k, m.title, attCounts[k]])].map(([k, label, n]) => (
                <button key={k} onClick={() => setAttFilter(k)} style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 14, cursor: "pointer",
                  border: `1px solid ${attFilter === k ? "var(--brand)" : "#e2e8f0"}`,
                  background: attFilter === k ? "var(--brand-light)" : "#fff", color: attFilter === k ? "var(--brand)" : "#64748b",
                }}>{label} · {n}</button>
              ))}
            </div>
          )}
          {attShown.length === 0 ? (
            <div style={{ padding: "26px 10px", textAlign: "center", color: "#16a34a", fontSize: 13, fontWeight: 600 }}>✓ All caught up — nothing is waiting.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", maxHeight: 360, overflowY: "auto" }}>
              {attShown.map((a, i) => {
                const m = REASON_META[a.reason] || REASON_META.stalled;
                return (
                  <div key={`${a.candidate_id}-${a.reason}-${i}`} onClick={() => onOpen(a.candidate_id)}
                    style={{ display: "flex", gap: 10, padding: "9px 6px", borderTop: i ? "1px solid #f1f5f9" : "none", cursor: "pointer", alignItems: "center" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: m.bg, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{a.name} <span style={{ fontWeight: 500, color: "#94a3b8", fontSize: 11 }}>{a.role}</span></div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{a.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h4 style={sectionTitle}>What happened recently</h4>
          {events.length === 0 ? (
            <div style={{ padding: "26px 10px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No activity in the last 14 days.</div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {groups.map(g => (
                <div key={g.key}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, margin: "8px 0 4px" }}>
                    {dayLabel(g.key)}{g.key === dayKey(new Date()) && g.items.length ? ` · ${g.items.length}` : ""}
                  </div>
                  {g.items.map((e, i) => {
                    const ic = EVENT_ICON[e.type] || EVENT_ICON.status;
                    return (
                      <div key={`${e.candidate_id}-${e.at}-${i}`} onClick={() => onOpen(e.candidate_id)}
                        style={{ display: "flex", gap: 10, padding: "7px 4px", cursor: "pointer", alignItems: "flex-start" }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: ic.bg, color: ic.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, marginTop: 1 }}>{ic.icon}</div>
                        <div style={{ flex: 1, fontSize: 12.5, color: "#475569", lineHeight: 1.6 }}><EventLine e={e} statusColor={statusColor} /></div>
                        <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", marginTop: 3 }}>{timeOf(e.at)}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {events.length > 12 && (
                <button className="btn ghost" onClick={() => setShowAllEvents(v => !v)} style={{ width: "100%", fontSize: 12, marginTop: 8 }}>
                  {showAllEvents ? "Show less" : `Show all ${events.length} updates`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Trend + funnel ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }} className="ats-grid">
        <div className="card">
          <h4 style={sectionTitle}>Last 14 days</h4>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#64748b", marginBottom: 8 }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--brand)", marginRight: 5 }} />New applicants</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#2563eb", marginRight: 5 }} />Moved forward</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 130, borderBottom: "1px solid #e2e8f0" }}>
            {trend.map(t => (
              <div key={t.date} title={`${t.label}: ${t.applications} new applicants, ${t.moves} moves`}
                style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, height: "100%" }}>
                <div style={{ width: "42%", height: `${(t.applications / maxTrend) * 100}%`, minHeight: t.applications ? 3 : 0, background: "var(--brand)", borderRadius: "3px 3px 0 0" }} />
                <div style={{ width: "42%", height: `${(t.moves / maxTrend) * 100}%`, minHeight: t.moves ? 3 : 0, background: "#2563eb", borderRadius: "3px 3px 0 0" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            {trend.map((t, i) => (
              <div key={t.date} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#94a3b8" }}>{i % 2 === (trend.length - 1) % 2 ? t.label.replace(" ", " ") : ""}</div>
            ))}
          </div>
        </div>

        <div className="card">
          <h4 style={sectionTitle}>Hiring funnel <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>how far candidates got</span></h4>
          {funnel.map((f, i) => (
            <div key={f.stage} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: "#334155", fontWeight: 600 }}>{f.stage}</span>
                <span style={{ color: "#64748b" }}><b style={{ color: "#0f172a" }}>{f.count}</b>{i > 0 && <span style={{ marginLeft: 6 }}>{f.pct_of_prev}% of previous</span>}</span>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${(f.count / topFunnel) * 100}%`, background: "var(--brand)", opacity: 1 - i * 0.12, borderRadius: 4, transition: "width .3s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
