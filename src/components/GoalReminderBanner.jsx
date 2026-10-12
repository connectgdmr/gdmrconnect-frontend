import React, { useState, useEffect, useCallback } from "react";
import { TbBellRinging, TbCheck, TbX } from "react-icons/tb";
import { GOAL_COLORS, goalsApi, dueInfo } from "./goalsShared";

const DISMISS_KEY = "goal_reminder_dismissed_v1";

/**
 * Top-of-dashboard reminder: open goals that are due within 3 days (or already
 * overdue). Shown on every login until the goal is marked Done; the ✕ only
 * hides it for the rest of this browser session.
 */
export default function GoalReminderBanner({ token, onOpenGoals }) {
  const [goals, setGoals] = useState([]);
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    goalsApi(token, "/reminders").then(d => setGoals(Array.isArray(d) ? d : [])).catch(() => {});
  }, [token]);
  useEffect(() => { if (token) load(); }, [token, load]);

  async function markDone(g) {
    setBusy(g._id);
    try { await goalsApi(token, `/${g._id}`, "PUT", { done: true }); setGoals(gs => gs.filter(x => x._id !== g._id)); }
    catch { /* leave it in place; the user can retry */ }
    finally { setBusy(""); }
  }
  function dismiss() {
    setHidden(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ }
  }

  if (hidden || goals.length === 0) return null;
  const shown = goals.slice(0, 4);
  const overdue = goals.filter(g => g.days_left < 0).length;

  return (
    <div role="alert" style={{
      margin: "0 0 16px", borderRadius: 12, padding: "14px 16px", background: "#fffbea", border: "1px solid #f2e48a",
      boxShadow: "0 4px 14px rgba(180,140,0,.12)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ color: "#b45309", display: "flex", fontSize: 20 }}><TbBellRinging /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#5c4a00" }}>
            {goals.length === 1 ? "1 goal needs your attention" : `${goals.length} goals need your attention`}
            {overdue > 0 && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#b91c1c", background: "#fee2e2", borderRadius: 10, padding: "1px 8px" }}>{overdue} overdue</span>}
          </div>
          <div style={{ fontSize: 12, color: "#8a6d1a" }}>Deadlines within 3 days — mark them Done when finished.</div>
        </div>
        <button onClick={dismiss} title="Hide for now" aria-label="Hide" style={{ border: "none", background: "transparent", color: "#8a6d1a", cursor: "pointer", display: "flex", padding: 4 }}><TbX size={16} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
        {shown.map(g => {
          const c = GOAL_COLORS[g.color] || GOAL_COLORS.yellow;
          const due = dueInfo(g.days_left);
          return (
            <div key={g._id} style={{ background: c.bg, color: c.ink, borderRadius: 6, padding: "10px 12px", borderLeft: `5px solid ${c.edge}`, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 6px rgba(15,23,42,.08)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: due.color }}>{due.text} · {g.type}{!g.is_owner && g.owner_name ? ` · from ${g.owner_name}` : ""}</div>
              </div>
              <button onClick={() => markDone(g)} disabled={busy === g._id}
                style={{ display: "flex", alignItems: "center", gap: 4, border: "none", borderRadius: 6, padding: "6px 10px", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: busy === g._id ? 0.6 : 1 }}>
                <TbCheck size={13} /> Done
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 12.5 }}>
        {goals.length > shown.length && <span style={{ color: "#8a6d1a", marginRight: 10 }}>+{goals.length - shown.length} more</span>}
        <button onClick={onOpenGoals} style={{ border: "none", background: "none", padding: 0, color: "#b45309", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Open My Goals →</button>
      </div>
    </div>
  );
}
