import React, { useEffect, useState } from "react";
import { TbBriefcase, TbX } from "react-icons/tb";

// Pop-up notification when someone assigns you work. Shown once per assignment (remembered for the browser session).
const SEEN_KEY = "gdmr_work_toast_seen";
const readSeen = () => { try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); } };
const writeSeen = (set) => { try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-100))); } catch { /* private mode */ } };

export default function WorkAlertToast({ alerts, onOpen }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const seen = readSeen();
    const fresh = (alerts.items || []).filter(i => !seen.has(i.id));
    if (fresh.length === 0) return;
    fresh.forEach(i => seen.add(i.id));
    writeSeen(seen);
    setToast({ items: fresh });
    // a desktop notification too, if this browser already allowed them (we never ask)
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
        new Notification("New work assigned", { body: fresh.length === 1 ? `${fresh[0].title}${fresh[0].by ? ` — from ${fresh[0].by}` : ""}` : `${fresh.length} new pieces of work` });
      }
    } catch { /* ignore */ }
  }, [alerts]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 14000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  const first = toast.items[0];
  return (
    <div role="status" style={{ position: "fixed", right: 18, bottom: 18, zIndex: 3000, width: "min(360px, calc(100vw - 36px))", background: "#fff", borderRadius: 14,
      boxShadow: "0 14px 40px rgba(15,23,42,.28)", border: "1px solid #e2e8f0", borderLeft: "5px solid var(--brand)", padding: "14px 16px", animation: "slideDown .25s ease-out" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}><TbBriefcase /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{toast.items.length > 1 ? `${toast.items.length} new pieces of work for you` : "New work assigned to you"}</div>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{first.title}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{first.by ? `from ${first.by}` : ""}{first.deadline ? ` · due ${new Date(`${first.deadline}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}{toast.items.length > 1 ? ` · +${toast.items.length - 1} more` : ""}</div>
          <button className="btn" style={{ marginTop: 10, fontSize: 12.5, padding: "6px 14px" }} onClick={() => { setToast(null); onOpen(); }}>View work</button>
        </div>
        <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: 2 }}><TbX /></button>
      </div>
    </div>
  );
}
