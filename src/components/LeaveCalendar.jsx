import React, { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Click-to-select calendar for multi-day leave — pick individual days
// (not necessarily consecutive) instead of typing a start/end date range.
const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
function ymd(d) { return d.toISOString().slice(0, 10); }

export default function LeaveCalendar({ selected, onToggle }) {
  const [viewDate, setViewDate] = useState(new Date());
  const todayStr = ymd(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", padding: 6 }}>
          <FaChevronLeft size={12} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", padding: 6 }}>
          <FaChevronRight size={12} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DOW_LABELS.map((l, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "#94a3b8", padding: "4px 0" }}>{l}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = ymd(new Date(year, month, d));
          const isPast = dateStr < todayStr;
          const isSelected = selected.includes(dateStr);
          return (
            <button
              type="button" key={i} disabled={isPast}
              onClick={() => onToggle(dateStr)}
              style={{
                aspectRatio: "1", border: "1px solid", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                cursor: isPast ? "not-allowed" : "pointer",
                borderColor: isSelected ? "var(--brand, #16a34a)" : "#e2e8f0",
                background: isSelected ? "var(--brand, #16a34a)" : isPast ? "#f8fafc" : "#fff",
                color: isSelected ? "#fff" : isPast ? "#cbd5e1" : "#0f172a",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
