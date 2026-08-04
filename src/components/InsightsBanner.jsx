import React from "react";
import { FaLightbulb, FaGift, FaHourglassHalf, FaCalendarCheck } from "react-icons/fa";
import { getNextHoliday } from "../data/holidays";

/** Rule-based dashboard nudges — no AI involved, just derived from data already on hand. */
export default function InsightsBanner({ leaves = [] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextHoliday = getNextHoliday(today);
  const pendingCount = leaves.filter((l) => l.status === "Pending").length;

  const nextApprovedLeave = leaves
    .filter((l) => l.status === "Approved")
    .map((l) => ({ ...l, d: new Date(l.from_date || l.date) }))
    .filter((l) => !isNaN(l.d) && l.d >= today)
    .sort((a, b) => a.d - b.d)[0];

  const items = [];

  if (nextHoliday && nextHoliday.daysAway <= 14) {
    items.push({
      icon: <FaGift />,
      text: nextHoliday.daysAway === 0
        ? `${nextHoliday.name} is today!`
        : `${nextHoliday.name} is coming up on ${nextHoliday.date} — ${nextHoliday.daysAway} day${nextHoliday.daysAway > 1 ? "s" : ""} away.`,
    });
  }

  if (pendingCount > 0) {
    items.push({
      icon: <FaHourglassHalf />,
      text: `You have ${pendingCount} leave request${pendingCount > 1 ? "s" : ""} awaiting approval.`,
    });
  }

  if (nextApprovedLeave) {
    items.push({
      icon: <FaCalendarCheck />,
      text: `Your next approved leave starts ${nextApprovedLeave.d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="insights-banner">
      <div className="insights-banner-title">
        <FaLightbulb style={{ marginRight: 6, marginBottom: -1 }} /> Insights
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
