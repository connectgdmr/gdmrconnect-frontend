import React, { useState, useEffect, useCallback } from "react";
import {
  TbUserPlus, TbArrowsExchange, TbCalendarEvent, TbHeartHandshake, TbCircleCheck, TbFileCheck,
  TbRefresh, TbAlertTriangle, TbClockPause, TbMailForward, TbFileSearch, TbVideo, TbFileUpload,
  TbChevronDown, TbChevronRight,
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

// Order = priority. `text` builds the one-line summary for a group of n candidates.
const REASONS = [
  { key: "offer_pending", icon: <TbMailForward />,   color: "#d97706", bg: "#fffbeb", text: (n) => `${n} offer${n > 1 ? "s" : ""} sent, waiting for a reply` },
  { key: "docs_review",   icon: <TbFileSearch />,    color: "#7c3aed", bg: "#f5f3ff", text: (n) => `${n} candidate${n > 1 ? "s have" : " has"} documents to review` },
  { key: "unreviewed",    icon: <TbAlertTriangle />, color: "#dc2626", bg: "#fef2f2", text: (n) => `${n} new application${n > 1 ? "s" : ""} not reviewed yet` },
  { key: "stalled",       icon: <TbClockPause />,    color: "#0f766e", bg: "#effdf8", text: (n) => `${n} candidate${n > 1 ? "s" : ""} stuck in a stage` },
];

const TILES = [
  { key: "new_applications", label: "New applicants", icon: <TbUserPlus />, color: "var(--brand)", bg: "var(--brand-light)" },
  { key: "status_changes", label: "Moved forward", icon: <TbArrowsExchange />, color: "#2563eb", bg: "#eff6ff" },
  { key: "interviews", label: "Interviews set", icon: <TbCalendarEvent />, color: "#7c3aed", bg: "#f5f3ff" },
  { key: "offers_released", label: "Offers sent", icon: <TbHeartHandshake />, color: "#0f766e", bg: "#effdf8" },
  { key: "joined", label: "Joined", icon: <TbCircleCheck />, color: "#16a34a", bg: "#f0fdf4" },
  { key: "documents", label: "Documents in", icon: <TbFileCheck />, color: "#d97706", bg: "#fffbeb" },
];

const EVENT_ICON = {
  applied: { icon: <TbUserPlus />, color: "var(--brand)", bg: "var(--brand-light)" },
  status: { icon: <TbArrowsExchange />, color: "#2563eb", bg: "#eff6ff" },
  recording: { icon: <TbVideo />, color: "#7c3aed", bg: "#f5f3ff" },
  document: { icon: <TbFileUpload />, color: "#d97706", bg: "#fffbeb" },
};

const titleCase = (s) => String(s || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function Delta({ now, before }) {
  const diff = now - before;
  if (!diff) return null; // no change — say nothing rather than add noise
  return (
    <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: diff > 0 ? "#16a34a" : "#dc2626" }}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff)} vs yesterday
    </div>
  );
}

function statusPill(statusColor, s) {
  const c = statusColor(s);
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 4, color: c.c, background: c.b, whiteSpace: "nowrap" }}>{s}</span>;
}

function EventLine({ e, statusColor }) {
  const pill = (s) => {
    const c = statusColor(s);
    return <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 4, color: c.c, background: c.b, whiteSpace: "nowrap" }}>{s}</span>;
  };
  const who = e.by ? <b>{e.by}</b> : "Someone";
  const name = <b style={{ color: "#0f172a" }}>{titleCase(e.name)}</b>;
  if (e.type === "applied") return <>{name} applied{e.role ? <> for <b>{e.role}</b></> : null}</>;
  if (e.type === "recording") return <>{who} added a recording ({e.to}) for {name}</>;
  if (e.type === "document") return <>{name} uploaded <b>{e.to}</b></>;
  return <>{who} moved {name} {e.from ? <>from {pill(e.from)} to {pill(e.to)}</> : <>to {pill(e.to)}</>}</>;
}

const cardTitle = { margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 };
const mutedNote = { padding: "28px 10px", textAlign: "center", color: "#94a3b8", fontSize: 13 };
const PREVIEW = 5; // rows shown per expanded attention group before "show more"

const INTERVIEW_STAGES = ["Screening Call Scheduled", "Technical Interview", "HR Interview", "Management Interview"];
// Which activity events sit behind each tile — mirrors summarise() in routes/ats.py.
const TILE_MATCH = {
  new_applications: (e) => e.type === "applied",
  status_changes:   (e) => e.type === "status",
  interviews:       (e) => e.type === "status" && INTERVIEW_STAGES.includes(e.to),
  offers_released:  (e) => e.type === "status" && e.to === "Offer Released",
  joined:           (e) => e.type === "status" && ["Joined", "Hired"].includes(e.to),
  documents:        (e) => e.type === "document",
};
const TILE_HELP = {
  new_applications: "People who applied",
  status_changes:   "Candidates moved to a new stage",
  interviews:       "Candidates moved into a call or interview stage",
  offers_released:  "Candidates who were sent an offer",
  joined:           "Candidates who joined",
  documents:        "Documents uploaded by candidates",
};
const RANGES = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "Past 7 days" },
  { key: "all", label: "Past 14 days" },
];
function inRange(at, range) {
  const k = dayKey(at);
  const today = dayKey(new Date());
  if (range === "today") return k === today;
  if (range === "yesterday") return k === dayKey(new Date(Date.now() - 86400000));
  if (range === "week") return k >= dayKey(new Date(Date.now() - 6 * 86400000));
  return true;
}

export default function ATSActivity({ token, onOpen, statusColor, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);       // which attention group is expanded
  const [fullGroups, setFullGroups] = useState({});       // groups showing every row, not just PREVIEW
  const [popup, setPopup] = useState(null);               // tile key whose details popup is open
  const [popRange, setPopRange] = useState("today");

  useEffect(() => {
    if (!popup) return;
    const onKey = (e) => { if (e.key === "Escape") setPopup(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popup]);

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
    const id = setInterval(load, 120000); // keep "today" fresh while the dashboard is open
    return () => clearInterval(id);
  }, [load, refreshKey]);

  if (error && !data) {
    return <div className="card" style={{ marginBottom: 16, ...mutedNote }}>
      Couldn't load today's activity. <button className="btn ghost" onClick={load} style={{ marginLeft: 8, fontSize: 12 }}>Try again</button>
    </div>;
  }
  if (!data) return <div className="card" style={{ marginBottom: 16, height: 120, opacity: 0.5 }} />;

  const { today, yesterday, week, trend, funnel, attention, attention_total: attTotal, events } = data;
  const todayStr = new Date().toLocaleDateString("en-IN", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

  const groupsAtt = REASONS
    .map(r => ({ ...r, items: attention.filter(a => a.reason === r.key) }))
    .filter(g => g.items.length);

  // Activity feed grouped by IST day
  const shownEvents = showAllEvents ? events : events.slice(0, 10);
  const feed = [];
  shownEvents.forEach(e => {
    const k = dayKey(e.at);
    const g = feed[feed.length - 1];
    if (g && g.key === k) g.items.push(e); else feed.push({ key: k, items: [e] });
  });

  const maxTrend = Math.max(1, ...trend.map(t => Math.max(t.applications, t.moves)));
  const trendEmpty = trend.every(t => !t.applications && !t.moves);
  const topFunnel = Math.max(1, funnel[0]?.count || 1);

  return (
    <div style={{ marginBottom: 22 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Today in Recruitment</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
            {todayStr} · Past 7 days: <b>{week.new_applications}</b> applicants, <b>{week.status_changes}</b> moves, <b>{week.joined}</b> joined
          </div>
        </div>
        <button className="btn ghost" onClick={load} disabled={loading} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <TbRefresh size={13} /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ── Today tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        {TILES.map(t => {
          const v = today[t.key];
          return (
            <div key={t.key} className="card" role="button" tabIndex={0} title="Click to see details"
              onClick={() => { setPopRange("today"); setPopup(t.key); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPopRange("today"); setPopup(t.key); } }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(15,23,42,.10)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              style={{ padding: "14px 16px", cursor: "pointer", transition: "transform .15s, box-shadow .15s" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{t.label}</div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, color: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, opacity: v ? 1 : 0.55 }}>{t.icon}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, marginTop: 6, color: v ? "#0f172a" : "#cbd5e1" }}>{v}</div>
              <Delta now={v} before={yesterday[t.key]} />
            </div>
          );
        })}
      </div>

      {/* ── Needs attention + activity feed ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "stretch", marginBottom: 16 }} className="ats-grid">
        <div className="card" style={{ padding: 18 }}>
          <h4 style={{ ...cardTitle, marginBottom: 12 }}>
            Needs your attention
            {attTotal > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#fef2f2", color: "#dc2626", borderRadius: 10, padding: "1px 8px" }}>{attTotal}</span>}
          </h4>
          {groupsAtt.length === 0 ? (
            <div style={{ ...mutedNote, color: "#16a34a", fontWeight: 600 }}>✓ All caught up — nothing is waiting.</div>
          ) : groupsAtt.map(g => {
            const open = openGroup === g.key;
            const rows = fullGroups[g.key] ? g.items : g.items.slice(0, PREVIEW);
            const oldest = Math.max(...g.items.map(i => i.days || 0));
            return (
              <div key={g.key} style={{ border: "1px solid #eef2f6", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                <div onClick={() => setOpenGroup(open ? null : g.key)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", cursor: "pointer", background: open ? "#fafbfc" : "#fff" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: g.bg, color: g.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{g.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{g.text(g.items.length)}</div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {oldest > 0 && g.key !== "docs_review" ? `Longest wait ${oldest} days · ` : ""}
                      {g.items.slice(0, 3).map(i => titleCase(i.name)).join(", ")}{g.items.length > 3 ? ` +${g.items.length - 3} more` : ""}
                    </div>
                  </div>
                  <span style={{ color: "#94a3b8", display: "flex" }}>{open ? <TbChevronDown size={16} /> : <TbChevronRight size={16} />}</span>
                </div>
                {open && (
                  <div style={{ borderTop: "1px solid #eef2f6" }}>
                    {rows.map((a, i) => (
                      <div key={`${a.candidate_id}-${i}`} onClick={() => onOpen(a.candidate_id)}
                        style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 14px 8px 56px", cursor: "pointer", borderTop: i ? "1px solid #f4f6f8" : "none", alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{titleCase(a.name)}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.role || a.status}</div>
                        </div>
                        <div style={{ fontSize: 11.5, color: g.color, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {g.key === "docs_review" ? "Review →" : `${a.days} days`}
                        </div>
                      </div>
                    ))}
                    {g.items.length > PREVIEW && (
                      <button onClick={() => setFullGroups(f => ({ ...f, [g.key]: !f[g.key] }))}
                        style={{ width: "100%", padding: "8px", border: "none", borderTop: "1px solid #f4f6f8", background: "#fafbfc", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {fullGroups[g.key] ? "Show fewer" : `Show all ${g.items.length}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
          <h4 style={{ ...cardTitle, marginBottom: 6 }}>What happened recently</h4>
          {events.length === 0 ? (
            <div style={mutedNote}>No activity in the last 14 days.</div>
          ) : (
            <div>
              {feed.map(g => (
                <div key={g.key}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "12px 0 4px" }}>{dayLabel(g.key)}</div>
                  {g.items.map((e, i) => {
                    const ic = EVENT_ICON[e.type] || EVENT_ICON.status;
                    return (
                      <div key={`${e.candidate_id}-${e.at}-${i}`} onClick={() => onOpen(e.candidate_id)}
                        style={{ display: "flex", gap: 10, padding: "7px 0", cursor: "pointer", alignItems: "flex-start", borderTop: i ? "1px solid #f6f8fa" : "none" }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: ic.bg, color: ic.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, marginTop: 1 }}>{ic.icon}</div>
                        <div style={{ flex: 1, fontSize: 12.5, color: "#475569", lineHeight: 1.6 }}><EventLine e={e} statusColor={statusColor} /></div>
                        <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", marginTop: 3 }}>{timeOf(e.at)}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {events.length > 10 && (
                <button className="btn ghost" onClick={() => setShowAllEvents(v => !v)} style={{ width: "100%", fontSize: 12, marginTop: 10 }}>
                  {showAllEvents ? "Show less" : `Show all ${events.length} updates`}
                </button>
              )}
            </div>
          )}
          <div style={{ marginTop: "auto", paddingTop: 16, fontSize: 11.5, color: "#94a3b8", textAlign: "center" }}>
            Showing the last 14 days · updates appear here as candidates move through the pipeline
          </div>
        </div>
      </div>

      {/* ── Trend + funnel ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "stretch" }} className="ats-grid">
        <div className="card" style={{ padding: 18 }}>
          <h4 style={{ ...cardTitle, justifyContent: "space-between", marginBottom: 14 }}>
            <span>Last 14 days</span>
            <span style={{ display: "flex", gap: 12, fontSize: 11, fontWeight: 500, color: "#64748b" }}>
              <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "var(--brand)", marginRight: 5 }} />New applicants</span>
              <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "#2563eb", marginRight: 5 }} />Moved forward</span>
            </span>
          </h4>
          {trendEmpty ? (
            <div style={{ ...mutedNote, padding: "40px 10px" }}>No applicants or movement in the last 14 days.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 130, borderBottom: "1px solid #e2e8f0" }}>
                {trend.map(t => (
                  <div key={t.date} title={`${t.label}: ${t.applications} new applicants, ${t.moves} moves`}
                    style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, height: "100%" }}>
                    <div style={{ width: "42%", height: `${(t.applications / maxTrend) * 100}%`, minHeight: t.applications ? 3 : 0, background: "var(--brand)", borderRadius: "3px 3px 0 0" }} />
                    <div style={{ width: "42%", height: `${(t.moves / maxTrend) * 100}%`, minHeight: t.moves ? 3 : 0, background: "#2563eb", borderRadius: "3px 3px 0 0" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                {trend.map((t, i) => (
                  <div key={t.date} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#94a3b8" }}>{i % 2 === (trend.length - 1) % 2 ? t.label.replace(" ", " ") : ""}</div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h4 style={{ ...cardTitle, marginBottom: 14 }}>
            Hiring funnel <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>how far candidates got</span>
          </h4>
          {funnel.map((f, i) => (
            <div key={f.stage} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ color: "#334155", fontWeight: 600 }}>{f.stage}</span>
                <span style={{ color: "#64748b" }}>
                  <b style={{ color: "#0f172a" }}>{f.count}</b>
                  {i > 0 && funnel[i - 1].count > 0 && <span style={{ marginLeft: 8, fontSize: 11 }}>{f.pct_of_prev}%</span>}
                </span>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${(f.count / topFunnel) * 100}%`, minWidth: f.count ? 4 : 0, background: "var(--brand)", borderRadius: 4, transition: "width .3s" }} />
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Percent = share of the stage before it that got this far.</div>
        </div>
      </div>

      {/* ── Tile details popup ── */}
      {popup && (() => {
        const tile = TILES.find(t => t.key === popup);
        const match = TILE_MATCH[popup];
        const all = events.filter(match);
        const rows = all.filter(e => inRange(e.at, popRange));
        const closePop = () => setPopup(null);
        let lastDay = null;
        return (
          <div onClick={closePop} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tile.label}
              style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 620, maxHeight: "86vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(15,23,42,.25)" }}>
              <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid #eef2f6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: tile.bg, color: tile.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{tile.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{tile.label}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{TILE_HELP[popup]}</div>
                  </div>
                  <button onClick={closePop} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "#475569" }}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                  {RANGES.map(r => {
                    const n = all.filter(e => inRange(e.at, r.key)).length;
                    const on = popRange === r.key;
                    return (
                      <button key={r.key} onClick={() => setPopRange(r.key)} style={{
                        fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 16, cursor: "pointer",
                        border: `1px solid ${on ? "var(--brand)" : "#e2e8f0"}`, background: on ? "var(--brand-light)" : "#fff", color: on ? "var(--brand)" : "#64748b",
                      }}>{r.label} · {n}</button>
                    );
                  })}
                </div>
              </div>
              <div style={{ overflowY: "auto", padding: "4px 20px 16px" }}>
                {rows.length === 0 ? (
                  <div style={{ ...mutedNote, padding: "40px 10px" }}>Nothing here for {RANGES.find(r => r.key === popRange).label.toLowerCase()}.</div>
                ) : rows.map((e, i) => {
                  const k = dayKey(e.at);
                  const header = popRange !== "today" && popRange !== "yesterday" && k !== lastDay;
                  lastDay = k;
                  return (
                    <React.Fragment key={`${e.candidate_id}-${e.at}-${i}`}>
                      {header && <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 2px" }}>{dayLabel(k)}</div>}
                      <div onClick={() => { closePop(); onOpen(e.candidate_id); }}
                        style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid #f4f6f8", cursor: "pointer" }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: tile.bg, color: tile.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                          {(e.name || "?").trim().charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                            {titleCase(e.name)} {e.code && <span style={{ fontWeight: 500, fontSize: 11, color: "#94a3b8" }}>{e.code}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                            {e.type === "applied" && <>Applied{e.role ? <> for <b>{e.role}</b></> : null}</>}
                            {e.type === "status" && <>{e.from ? <>{statusPill(statusColor, e.from)} → </> : "Moved to "}{statusPill(statusColor, e.to)}{e.role ? <span style={{ color: "#94a3b8" }}> · {e.role}</span> : null}</>}
                            {e.type === "document" && <>Uploaded <b>{e.to}</b></>}
                            {e.by && e.type === "status" && <span style={{ color: "#94a3b8" }}> · by {e.by}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap" }}>{timeOf(e.at)}</div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              <div style={{ padding: "10px 20px", borderTop: "1px solid #eef2f6", fontSize: 11.5, color: "#94a3b8" }}>Click a row to open that candidate.</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
