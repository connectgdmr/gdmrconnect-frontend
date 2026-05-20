export const RATING_SCALE = [
  { value: 1, label: "Needs Development",      color: "#ef4444" },
  { value: 2, label: "Developing",             color: "#f97316" },
  { value: 3, label: "Meeting Expectations",   color: "#eab308" },
  { value: 4, label: "Exceeding Expectations", color: "#22c55e" },
  { value: 5, label: "Outstanding",            color: "#6366f1" },
];

export const OVERALL_RATINGS = [
  "Exceptional",
  "Exceeds Expectations",
  "Meets Expectations",
  "Needs Improvement",
  "Unsatisfactory",
];

export function getRatingInfo(score) {
  const s = parseInt(score);
  if (!s || isNaN(s)) return null;
  return RATING_SCALE.find(r => r.value === s) || null;
}
