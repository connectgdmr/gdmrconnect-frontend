// Shared helpers for the personal goals feature (GoalsBoard + GoalReminderBanner).
import { API_URL as BASE } from "../api";

export const GOAL_COLORS = {
  yellow: { bg: "#fff7c2", edge: "#f2e48a", ink: "#5c4a00" },
  pink:   { bg: "#ffd9e4", edge: "#f3b4c8", ink: "#6b1d3a" },
  blue:   { bg: "#d6ecff", edge: "#a9d2f5", ink: "#12426b" },
  green:  { bg: "#d9f5df", edge: "#aee3b9", ink: "#175b2a" },
  orange: { bg: "#ffe3c7", edge: "#f6c696", ink: "#6b3a07" },
};

export async function goalsApi(token, path = "", method = "GET", body) {
  const r = await fetch(`${BASE}/my/goals${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "Something went wrong. Please try again.");
  return d;
}

// "2026-10-14" -> local-midnight Date (avoids the UTC off-by-one of new Date("YYYY-MM-DD"))
export const parseDay = (s) => new Date(`${s}T00:00:00`);
export const isoDay = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Default deadline for a new note: today for daily, this Sunday for weekly.
export function defaultDeadline(type) {
  const d = new Date();
  if (type === "weekly") d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return isoDay(d);
}

// Human label + urgency for a goal's days_left.
export function dueInfo(daysLeft) {
  if (daysLeft == null) return { text: "", color: "#64748b", bg: "#f1f5f9", urgent: false };
  if (daysLeft < 0) return { text: `Overdue by ${-daysLeft} day${daysLeft === -1 ? "" : "s"}`, color: "#b91c1c", bg: "#fee2e2", urgent: true };
  if (daysLeft === 0) return { text: "Due today", color: "#b45309", bg: "#fef3c7", urgent: true };
  if (daysLeft === 1) return { text: "Due tomorrow", color: "#b45309", bg: "#fef3c7", urgent: true };
  if (daysLeft <= 3) return { text: `Due in ${daysLeft} days`, color: "#b45309", bg: "#fef3c7", urgent: true };
  return { text: `Due in ${daysLeft} days`, color: "#475569", bg: "#f1f5f9", urgent: false };
}
