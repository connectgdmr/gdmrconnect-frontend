import React, { useState, useEffect } from "react";
import { TbBulb, TbGift, TbHourglass, TbCalendarCheck } from "react-icons/tb";

// Finds the nearest holiday on/after `today` from the live GET /api/holidays
// list (database.holidays_col) — used to replace the old hardcoded
// src/data/holidays.js copy so an admin-added holiday shows up in this
// nudge too, not just the Holiday Calendar tab and Attendance Calendar.
function nextHolidayFrom(holidays, today) {
  let next = null;
  for (const h of holidays) {
    const d = new Date(`${h.date}T00:00:00`);
    if (isNaN(d)) continue;
    if (d >= today && (!next || d < next.dateObj)) next = { ...h, dateObj: d };
  }
  if (!next) return null;
  const daysAway = Math.round((next.dateObj - today) / 86400000);
  return { name: next.name, date: next.dateObj, daysAway };
}

/** Rule-based dashboard nudges — no AI involved, just derived from data already on hand. */
export default function InsightsBanner({ leaves = [], token, api }) {
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    if (!token || !api) return;
    api.getHolidays(token).then(d => setHolidays(Array.isArray(d) ? d : [])).catch(() => {});
  }, [token, api]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextHoliday = nextHolidayFrom(holidays, today);
  const pendingCount = leaves.filter((l) => l.status === "Pending").length;

  const nextApprovedLeave = leaves
    .filter((l) => l.status === "Approved")
    .map((l) => ({ ...l, d: new Date(l.from_date || l.date) }))
    .filter((l) => !isNaN(l.d) && l.d >= today)
    .sort((a, b) => a.d - b.d)[0];

  const items = [];

  if (nextHoliday && nextHoliday.daysAway <= 14) {
    items.push({
      icon: <TbGift />,
      text: nextHoliday.daysAway === 0
        ? `${nextHoliday.name} is today!`
        : `${nextHoliday.name} is coming up on ${nextHoliday.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })} — ${nextHoliday.daysAway} day${nextHoliday.daysAway > 1 ? "s" : ""} away.`,
    });
  }

  if (pendingCount > 0) {
    items.push({
      icon: <TbHourglass />,
      text: `You have ${pendingCount} leave request${pendingCount > 1 ? "s" : ""} awaiting approval.`,
    });
  }

  if (nextApprovedLeave) {
    items.push({
      icon: <TbCalendarCheck />,
      text: `Your next approved leave starts ${nextApprovedLeave.d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="insights-banner">
      <div className="insights-banner-title">
        <TbBulb style={{ marginRight: 6, marginBottom: -1 }} /> Insights
      </div>
      {items.map((it, i) => (
        <div key={i} className="insights-row">
          <div className="insights-icon">{it.icon}</div>
          <div className="insights-text">{it.text}</div>
        </div>
      ))}
    </div>
  );
}
