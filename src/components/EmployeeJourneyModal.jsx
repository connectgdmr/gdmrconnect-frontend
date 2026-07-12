import React, { useEffect, useState } from "react";
import {
  FaTimes, FaTrophy, FaMedal, FaStar, FaPlus, FaTrash,
  FaCalendarAlt, FaUserTimes, FaPlane, FaRocket,
  FaChevronDown, FaChevronUp, FaArrowUp, FaChartLine,
  FaBolt, FaClock, FaUserPlus, FaClipboardList,
  FaCheckCircle, FaExclamationTriangle,
} from "react-icons/fa";

// ─── ACHIEVEMENT TYPE CONFIG (FA icons only — no emojis) ─────────────────────
const ACH_TYPES = [
  { value: "eom",         label: "Employee of the Month",   Icon: FaTrophy,       color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { value: "eoq",         label: "Employee of the Quarter", Icon: FaMedal,        color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  { value: "eoy",         label: "Employee of the Year",    Icon: FaStar,         color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  { value: "salary_hike", label: "Salary Hike",             Icon: FaArrowUp,      color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  { value: "promotion",   label: "Promotion",               Icon: FaChartLine,    color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  { value: "custom",      label: "Custom Award",            Icon: FaBolt,         color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" },
];

const C_BRAND = "#34a06a";

function achConfig(type) {
  return ACH_TYPES.find(a => a.value === type) || ACH_TYPES[ACH_TYPES.length - 1];
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""))
      .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function fmtMonth(monthStr) {
  if (!monthStr) return "—";
  try {
    const [y, m] = monthStr.split("-");
    return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch { return monthStr; }
}

function tenure(dateStr) {
  if (!dateStr) return null;
  const ms = new Date() - new Date(dateStr);
  if (ms < 0) return null;
  const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.4));
  if (months < 1) return "< 1 month";
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
  const y = Math.floor(months / 12), m = months % 12;
  return m === 0 ? `${y} year${y !== 1 ? "s" : ""}` : `${y}y ${m}m`;
}

function Avatar({ name, size = 56 }) {
  const initials = (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #34a06a 0%, #1c5249 100%)",
      color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.33),
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "3px solid rgba(255,255,255,0.85)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    }}>
      {initials}
    </div>
  );
}

// ─── TIMELINE ITEM ────────────────────────────────────────────────────────────
function TimelineItem({ event, isLast }) {
  const EventIcon = event.Icon;
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 24 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: event.color + "18",
          border: `2px solid ${event.color}`, display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1, flexShrink: 0,
        }}>
          <EventIcon size={12} color={event.color} />
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, background: "#e2e8f0", minHeight: 24 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20, paddingTop: 5 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{event.title}</div>
        {event.sub && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3 }}>{event.sub}</div>}
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{fmtDate(event.date)}</div>
      </div>
    </div>
  );
}

// ─── MINI PROGRESS BAR ────────────────────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── MAIN MODAL ──────────────────────────────────────────────────────────────
export default function EmployeeJourneyModal({ emp, allLeaves, monthAttendance, month, onClose, api, token }) {
  const [achievements, setAchievements] = useState([]);
  const [loadingAch, setLoadingAch] = useState(false);
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [awardForm, setAwardForm] = useState({
    type: "eom",
    title: "",
    description: "",
    month: month || new Date().toISOString().slice(0, 7),
  });
  const [saving, setSaving] = useState(false);
  const [leavesExpanded, setLeavesExpanded] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Employee meta ──────────────────────────────────────────────────────────
  const joinDate = emp.joined_at || emp.join_date || emp.created_at;
  const dept = Array.isArray(emp.department) ? emp.department.join(", ") : (emp.department || "—");
  const tenureStr = tenure(joinDate) || "—";

  // ── Status ────────────────────────────────────────────────────────────────
  const isOffboarded = emp.resignation?.notice_date &&
    emp.resignation.last_working_day &&
    new Date(emp.resignation.last_working_day) < new Date();
  const isInNotice = emp.resignation?.notice_date && !isOffboarded;
  const isOnExtLeave = !isOffboarded && emp.extended_leaves?.some(
    lv => lv.from_date <= todayStr && lv.to_date >= todayStr
  );
  const statusBadge = isOffboarded
    ? { label: "Alumni",          color: "#64748b", bg: "#f1f5f9" }
    : isInNotice
    ? { label: "Notice Period",   color: "#d97706", bg: "#fffbeb" }
    : isOnExtLeave
    ? { label: "Extended Leave",  color: "#7c3aed", bg: "#f5f3ff" }
    : { label: "Active",          color: "#16a34a", bg: "#f0fdf4" };

  // ── Leaves for this employee ───────────────────────────────────────────────
  const empLeaves = (allLeaves || [])
    .filter(l => l.employee_name === emp.name || String(l.employee_id) === String(emp._id))
    .sort((a, b) => new Date(b.from_date || b.date || 0) - new Date(a.from_date || a.date || 0));

  // ── Attendance this month ──────────────────────────────────────────────────
  const att = monthAttendance || {};
  const attTotal = (att.present || 0) + (att.absent || 0) + (att.leave || 0) + (att.nci || 0);
  const attRate = attTotal > 0 ? Math.round((att.present / attTotal) * 100) : (att.rate ?? 0);

  // ── API calls ──────────────────────────────────────────────────────────────
  async function loadAchievements() {
    setLoadingAch(true);
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/admin/achievements?employee_id=${emp._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAchievements(await res.json());
    } catch { /* silent */ }
    finally { setLoadingAch(false); }
  }

  async function saveAchievement() {
    if (!awardForm.title.trim()) return;
    setSaving(true);
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/admin/achievements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employee_id: emp._id, employee_name: emp.name, ...awardForm }),
      });
      if (res.ok) {
        setShowAwardForm(false);
        setAwardForm({ type: "eom", title: "", description: "", month: month || new Date().toISOString().slice(0, 7) });
        loadAchievements();
      } else {
        alert("Failed to save achievement.");
      }
    } catch { alert("Network error."); }
    finally { setSaving(false); }
  }

  async function deleteAchievement(id) {
    if (!window.confirm("Remove this achievement?")) return;
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      await fetch(`${baseUrl}/api/admin/achievements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadAchievements();
    } catch { alert("Failed to remove."); }
  }

  useEffect(() => { loadAchievements(); }, [emp._id]);

  // ── Build career timeline ──────────────────────────────────────────────────
  const timeline = [];

  if (joinDate) {
    timeline.push({
      date: joinDate.slice(0, 10),
      Icon: FaUserPlus,
      title: "Joined GDMR Connect",
      sub: `Started as ${emp.position || "team member"} · ${dept}`,
      color: C_BRAND,
    });
  }

  achievements.forEach(a => {
    const cfg = achConfig(a.type);
    timeline.push({
      date: a.month ? `${a.month}-01` : (a.created_at?.slice(0, 10) || "2020-01-01"),
      Icon: cfg.Icon,
      title: a.title,
      sub: a.description || (a.month ? fmtMonth(a.month) : ""),
      color: cfg.color,
    });
  });

  (emp.extended_leaves || []).forEach(lv => {
    timeline.push({
      date: lv.from_date || "2020-01-01",
      Icon: FaPlane,
      title: `Extended Leave — ${lv.type || "Sabbatical"}`,
      sub: `${fmtDate(lv.from_date)} → ${fmtDate(lv.to_date)}`,
      color: "#7c3aed",
    });
  });

  if (emp.resignation?.notice_date) {
    timeline.push({
      date: emp.resignation.notice_date,
      Icon: FaUserTimes,
      title: isOffboarded ? "Offboarded" : "Resignation Notice",
      sub: emp.resignation.last_working_day
        ? `Last working day: ${fmtDate(emp.resignation.last_working_day)}`
        : "LWD not set",
      color: "#dc2626",
    });
  }

  timeline.sort((a, b) => a.date.localeCompare(b.date));

  const achByType = {};
  ACH_TYPES.forEach(t => { achByType[t.value] = achievements.filter(a => a.type === t.value); });

  const leaveStatusColor = (s = "") => {
    const v = s.toLowerCase();
    if (v.includes("approved")) return { color: "#16a34a", bg: "#f0fdf4" };
    if (v.includes("rejected")) return { color: "#dc2626", bg: "#fef2f2" };
    return { color: "#d97706", bg: "#fffbeb" };
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: "min(680px, 100vw)", height: "100vh", overflowY: "auto",
        background: "#f8fafc", boxShadow: "-8px 0 48px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease",
      }}>
        <style>{`
          @keyframes slideInRight { from { transform: translateX(48px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          .journey-section { background: #fff; border-radius: 12px; padding: 18px 20px; margin: 0 16px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
          .journey-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
          .ach-badge { display: flex; align-items: center; gap: 10px; padding: 10px 13px; border-radius: 10px; border: 1px solid; margin-bottom: 8px; }
          .leave-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f1f5f9; gap: 10px; }
          .stat-mini { text-align: center; flex: 1; }
          .stat-mini-val { font-size: 22px; font-weight: 900; font-variant-numeric: tabular-nums; }
          .stat-mini-lbl { font-size: 10.5px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }
          .award-form-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
          .award-form-row label { font-size: 12px; font-weight: 600; color: #334155; }
          .award-form-row select, .award-form-row input, .award-form-row textarea { border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; font-size: 13px; font-family: inherit; color: #0f172a; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; background: #f8fafc; }
          .award-form-row select:focus, .award-form-row input:focus, .award-form-row textarea:focus { border-color: #34a06a; background: #fff; }
        `}</style>

        {/* ─── HERO HEADER ──────────────────────────────────────────────── */}
        <div style={{ background: "linear-gradient(135deg, #1c5249 0%, #34a06a 100%)", padding: "28px 20px 22px", position: "relative", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          >
            <FaTimes size={14} />
          </button>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <Avatar name={emp.name} size={64} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 3, lineHeight: 1.2 }}>{emp.name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.80)", marginBottom: 8 }}>
                {emp.position || "—"} · {dept}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: statusBadge.bg, color: statusBadge.color }}>
                  {statusBadge.label}
                </span>
                {tenureStr !== "—" && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.90)" }}>
                    <FaClock size={9} /> {tenureStr} tenure
                  </span>
                )}
                {joinDate && (
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>
                    Joined {fmtDate(joinDate.slice(0, 10))}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Achievement count chips */}
          {achievements.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              {ACH_TYPES.filter(t => achByType[t.value]?.length > 0).map(t => {
                const AIcon = t.Icon;
                return (
                  <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "5px 10px" }}>
                    <AIcon size={11} color="#fff" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{achByType[t.value].length}×</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{t.label.split(" ").slice(-1)[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── ATTENDANCE QUICK STATS ──────────────────────────────────── */}
        <div style={{ margin: "12px 16px 0" }}>
          <div className="journey-section" style={{ margin: 0 }}>
            <div className="journey-section-title"><FaCheckCircle size={10} /> Attendance — {month}</div>
            <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid #f1f5f9" }}>
              {[
                { label: "Rate",    val: `${attRate}%`,       color: attRate >= 80 ? "#16a34a" : attRate >= 65 ? "#d97706" : "#dc2626", bg: attRate >= 80 ? "#f0fdf4" : attRate >= 65 ? "#fffbeb" : "#fef2f2" },
                { label: "Present", val: att.present ?? "—",  color: "#34a06a",  bg: "#fff" },
                { label: "Absent",  val: att.absent  ?? "—",  color: "#dc2626",  bg: "#fff" },
                { label: "Leave",   val: att.leave   ?? "—",  color: "#d97706",  bg: "#fff" },
                { label: "NCI",     val: att.nci     ?? "—",  color: "#64748b",  bg: "#fff" },
              ].map((s, i, arr) => (
                <div key={s.label} className="stat-mini" style={{ background: s.bg, padding: "13px 8px", borderRight: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <div className="stat-mini-val" style={{ color: s.color }}>{s.val}</div>
                  <div className="stat-mini-lbl">{s.label}</div>
                </div>
              ))}
            </div>
            {attTotal > 0 && (
              <div style={{ marginTop: 10 }}>
                <MiniBar value={att.present || 0} max={attTotal} color="#34a06a" />
                <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10.5, color: "#94a3b8" }}>
                  {[["Present","#34a06a"],["Absent","#dc2626"],["Leave","#d97706"],["NCI","#94a3b8"]].map(([l, c]) => (
                    <span key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }} />
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── CAREER TIMELINE ─────────────────────────────────────────── */}
        <div style={{ margin: "12px 16px 0" }}>
          <div className="journey-section" style={{ margin: 0 }}>
            <div className="journey-section-title"><FaRocket size={10} /> Career Journey</div>
            {timeline.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12.5, padding: "12px 0" }}>No timeline events yet.</div>
            ) : timeline.map((ev, i) => (
              <TimelineItem key={`${ev.date}-${i}`} event={ev} isLast={i === timeline.length - 1} />
            ))}
          </div>
        </div>

        {/* ─── ACHIEVEMENTS ────────────────────────────────────────────── */}
        <div style={{ margin: "12px 16px 0" }}>
          <div className="journey-section" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="journey-section-title" style={{ marginBottom: 0 }}><FaTrophy size={10} /> Achievements & Awards</div>
              <button
                onClick={() => setShowAwardForm(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: C_BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "7px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                <FaPlus size={10} /> Award
              </button>
            </div>

            {/* Award form */}
            {showAwardForm && (
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 14, border: "1px solid #e2e8f0" }}>
                <div className="award-form-row">
                  <label>Type</label>
                  <select value={awardForm.type} onChange={e => {
                    const t = ACH_TYPES.find(a => a.value === e.target.value);
                    setAwardForm(f => ({ ...f, type: e.target.value, title: t ? t.label : f.title }));
                  }}>
                    {ACH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="award-form-row">
                  <label>Title</label>
                  <input value={awardForm.title} onChange={e => setAwardForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Employee of the Month — July 2026" />
                </div>
                <div className="award-form-row">
                  <label>Month / Period</label>
                  <input type="month" value={awardForm.month} onChange={e => setAwardForm(f => ({ ...f, month: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Note (optional)</label>
                  <textarea rows={2} value={awardForm.description} onChange={e => setAwardForm(f => ({ ...f, description: e.target.value }))} placeholder="Reason for the award…" style={{ resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowAwardForm(false)} style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={saveAchievement} disabled={saving} style={{ background: C_BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving…" : "Save Award"}
                  </button>
                </div>
              </div>
            )}

            {loadingAch ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12.5, padding: "12px 0" }}>Loading…</div>
            ) : achievements.length === 0 ? (
              <div style={{ textAlign: "center", padding: "18px 0" }}>
                <FaTrophy size={28} style={{ color: "#e2e8f0", marginBottom: 8 }} />
                <div style={{ fontSize: 12.5, color: "#94a3b8" }}>No achievements recorded yet. Click "Award" to recognise this employee.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {achievements.map(a => {
                  const cfg = achConfig(a.type);
                  const AIcon = cfg.Icon;
                  return (
                    <div key={a._id} className="ach-badge" style={{ background: cfg.bg, borderColor: cfg.border }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <AIcon size={15} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{a.title}</div>
                        {a.month && <div style={{ fontSize: 11.5, color: "#64748b" }}>{fmtMonth(a.month)}</div>}
                        {a.description && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{a.description}</div>}
                      </div>
                      <button onClick={() => deleteAchievement(a._id)} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }} title="Remove">
                        <FaTrash size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── LEAVE HISTORY ───────────────────────────────────────────── */}
        <div style={{ margin: "12px 16px 16px" }}>
          <div className="journey-section" style={{ margin: 0 }}>
            <button
              onClick={() => setLeavesExpanded(v => !v)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: leavesExpanded ? 14 : 0 }}
            >
              <div className="journey-section-title" style={{ marginBottom: 0 }}>
                <FaCalendarAlt size={10} /> Leave History ({empLeaves.length})
              </div>
              {leavesExpanded ? <FaChevronUp size={11} color="#94a3b8" /> : <FaChevronDown size={11} color="#94a3b8" />}
            </button>
            {leavesExpanded && (
              empLeaves.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12.5, padding: "12px 0" }}>No leave records found.</div>
              ) : (
                <div>
                  {empLeaves.map((lv, i) => {
                    const sc = leaveStatusColor(lv.status);
                    const dateRange = lv.from_date && lv.to_date && lv.from_date !== lv.to_date
                      ? `${fmtDate(lv.from_date)} → ${fmtDate(lv.to_date)}`
                      : fmtDate(lv.from_date || lv.date);
                    return (
                      <div key={lv._id || i} className="leave-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{dateRange}</div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                            {lv.type === "half" ? `Half Day (${lv.period || "any"})` : "Full Day"}
                            {lv.reason ? ` — ${lv.reason}` : ""}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: sc.bg, color: sc.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {lv.status || "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* ─── EXTENDED LEAVES ─────────────────────────────────────────── */}
        {emp.extended_leaves?.length > 0 && (
          <div style={{ margin: "0 16px 16px" }}>
            <div className="journey-section" style={{ margin: 0 }}>
              <div className="journey-section-title"><FaPlane size={10} /> Extended Leaves / Sabbaticals</div>
              {emp.extended_leaves.map((lv, i) => (
                <div key={i} className="leave-row">
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{fmtDate(lv.from_date)} → {fmtDate(lv.to_date)}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{lv.type || "Sabbatical"}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#f5f3ff", color: "#7c3aed" }}>Extended Leave</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── RESIGNATION INFO ─────────────────────────────────────────── */}
        {emp.resignation?.notice_date && (
          <div style={{ margin: "0 16px 24px" }}>
            <div className="journey-section" style={{ margin: 0, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <div className="journey-section-title" style={{ color: "#dc2626" }}><FaUserTimes size={10} /> Resignation Details</div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Notice Date</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#dc2626" }}>{fmtDate(emp.resignation.notice_date)}</div>
                </div>
                {emp.resignation.last_working_day && (
                  <div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Last Working Day</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#dc2626" }}>{fmtDate(emp.resignation.last_working_day)}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Status</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: isOffboarded ? "#64748b" : "#d97706" }}>
                    {isOffboarded ? "Offboarded" : "In Notice Period"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
