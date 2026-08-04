import React, { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Click-to-select calendar for multi-day leave — pick individual days
// (not necessarily consecutive) instead of typing a start/end date range.
const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
// Build the date string from local components — toISOString() converts to
// UTC first, which silently shifts the date back a day in timezones ahead
// of UTC (e.g. clicking "11" in India (UTC+5:30) would report "10").
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#fff", maxWidth: 240 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", padding: 3 }}>
          <FaChevronLeft size={10} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 11.5, color: "#0f172a" }}>
          {viewDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", padding: 3 }}>
          <FaChevronRight size={10} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
        {DOW_LABELS.map((l, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "#94a3b8", padding: "2px 0" }}>{l}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
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
                aspectRatio: "1", border: "1px solid", borderRadius: 5, fontSize: 10.5, fontWeight: 600,
                cursor: isPast ? "not-allowed" : "pointer", padding: 0,
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
