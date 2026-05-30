import React, { useState } from "react";
import { FaBullhorn, FaTimes } from "react-icons/fa";

export default function AnnouncementNotifications({ announcements, userId }) {
  const storageKey = `dismissed_ann_${userId || "guest"}`;

  const [dismissed, setDismissed] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    } catch {
      return new Set();
    }
  });

  const visible = (announcements || []).filter((a) => !dismissed.has(a._id));

  if (visible.length === 0) return null;

  function dismiss(id) {
    const next = new Set([...dismissed, id]);
    setDismissed(next);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
  }

  function dismissAll() {
    const next = new Set(announcements.map((a) => a._id));
    setDismissed(next);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
  }

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      {visible.map((ann) => (
        <div
          key={ann._id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            background: "linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%)",
            border: "1px solid #fed7aa",
            borderLeft: "4px solid var(--red)",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(220,38,38,0.07)",
            animation: "slideDown 0.3s ease",
          }}
        >
          <FaBullhorn
            style={{ color: "var(--red)", flexShrink: 0, marginTop: 3, fontSize: 15 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13.5, lineHeight: 1.3 }}>
              {ann.title}
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 5, lineHeight: 1.6 }}>
              {ann.message}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, fontWeight: 500 }}>
              {ann.created_at ? fmtDate(ann.created_at) : ""}
            </div>
          </div>
          <button
            onClick={() => dismiss(ann._id)}
            title="Dismiss"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px 6px",
              flexShrink: 0,
              borderRadius: 6,
              lineHeight: 1,
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "#fef2f2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "none"; }}
          >
            <FaTimes size={13} />
          </button>
        </div>
      ))}

      {visible.length > 1 && (
        <button
          onClick={dismissAll}
          style={{
            alignSelf: "flex-end",
            fontSize: 12,
            color: "#94a3b8",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            padding: "2px 0",
          }}
        >
          Dismiss all ({visible.length})
        </button>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
