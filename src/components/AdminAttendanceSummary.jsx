import React, { useEffect, useState, useMemo } from "react";
import { escHtml } from "../utils/security";
import {
  TbFileTypeCsv, TbFileTypePdf, TbChartBar, TbChartLine,
  TbCircleCheck, TbCircleX, TbAlertTriangle,
  TbUsers, TbCalendar, TbArrowUp, TbArrowDown,
  TbTrophy, TbSearch, TbFilter, TbTable,
} from "react-icons/tb";
import { SkeletonStats, SkeletonTable } from "./Skeleton";
import EmployeeJourneyModal from "./EmployeeJourneyModal";

// Same "offboarded" rule used elsewhere in the app (AdminAttendancePage,
// AdminPayroll, AdminDashboard's empExitStatus, etc.): notice given + last
// working day already passed. Offboarded staff are irrelevant to attendance/
// LOP/correction reporting — every report table on this page excludes them.
function isOffboarded(emp) {
  const lwd = emp?.resignation?.last_working_day;
  if (!emp?.resignation?.notice_date || !lwd) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(lwd) < today;
}

// ─── WORKING DAY LOGIC ────────────────────────────────────────────────────────
// Sundays = off. Saturdays = off EXCEPT the last Saturday of each month.
function isLastSatOfMonth(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (d.getDay() !== 6) return false;
  const next = new Date(d);
  next.setDate(d.getDate() + 7);
  return next.getMonth() !== d.getMonth();
}

function isWorkingDay(dateStr) {
  const dow = new Date(dateStr + "T00:00:00").getDay();
  if (dow === 0) return false;          // Sunday always off
  if (dow === 6) return isLastSatOfMonth(dateStr); // Only last Saturday
  return true;
}

// ─── DATA HELPERS ─────────────────────────────────────────────────────────────
const cnt = (v) => Array.isArray(v) ? v.length : (Number(v) || 0);

function getNames(d, key, idMap = {}) {
  const named = d[`${key}_names`];
  if (Array.isArray(named) && named.length) return named.filter(Boolean);
  const arr = d[key];
  if (Array.isArray(arr)) {
    return arr.map(x => {
      if (x && typeof x === "object") return x.name || x.employee_name || x.full_name || idMap[String(x._id || x.id)] || "";
      return idMap[String(x)] || "";
    }).filter(Boolean);
  }
  return [];
}

const nameList = (d, key, idMap) => {
  const n = getNames(d, key, idMap);
  return n.length ? n.join(" | ") : "—";
};

function visibleDayEntries(summary) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return Object.entries(summary?.days || {})
    .filter(([date]) => date <= todayStr && isWorkingDay(date))
    .sort(([a], [b]) => a.localeCompare(b));
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── METRICS ─────────────────────────────────────────────────────────────────
function computeMetrics(entries, idMap, totalEmp) {
  const totals = { present: 0, absent: 0, leave: 0, nci: 0 };
  const trend = [], dowBuckets = {}, empStats = {}, spikes = [];
  let hasEmpData = false;

  entries.forEach(([date, d]) => {
    const dow = new Date(date + "T00:00:00").getDay();
    const p = cnt(d.present), a = cnt(d.absent), l = cnt(d.leave), n = cnt(d.not_checked_in);
    totals.present += p; totals.absent += a; totals.leave += l; totals.nci += n;
    trend.push({ x: date, label: date.slice(8), y: p, absent: a, leave: l });
    if (!dowBuckets[dow]) dowBuckets[dow] = [];
    dowBuckets[dow].push(p);
    if (totalEmp > 0 && a / totalEmp > 0.2) spikes.push({ date, absent: a, rate: Math.round((a / totalEmp) * 100) });
    const CAT = { present: "present", absent: "absent", leave: "leave", nci: "not_checked_in" };
    Object.entries(CAT).forEach(([stat, key]) => {
      const names = getNames(d, key, idMap);
      if (names.length) {
        hasEmpData = true;
        names.forEach(name => {
          if (!empStats[name]) empStats[name] = { name, present: 0, absent: 0, leave: 0, nci: 0 };
          empStats[name][stat]++;
        });
      }
    });
  });

  const workDays = entries.length;
  const avgPresent = workDays ? totals.present / workDays : 0;
  const totalRate = totalEmp && workDays ? (totals.present / (totalEmp * workDays)) * 100 : 0;

  const dowBreakdown = Object.entries(dowBuckets)
    .filter(([, a]) => a.length)
    .map(([dow, a]) => ({ label: DOW_LABELS[+dow], value: a.reduce((s, v) => s + v, 0) / a.length }))
    .sort((a, b) => ["Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(a.label) - ["Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(b.label));

  const half = Math.floor(workDays / 2);
  const f1 = half > 0 ? entries.slice(0, half).reduce((s, [, d]) => s + cnt(d.present), 0) / half : 0;
  const f2 = workDays - half > 0 ? entries.slice(half).reduce((s, [, d]) => s + cnt(d.present), 0) / (workDays - half) : 0;
  const trendDir = f2 > f1 + 0.5 ? "up" : f2 < f1 - 0.5 ? "down" : "flat";
  const trendPct = f1 > 0 ? Math.abs(((f2 - f1) / f1) * 100) : 0;

  const sortedByPresent = [...entries].sort(([, a], [, b]) => cnt(b.present) - cnt(a.present));
  const bestDays = sortedByPresent.slice(0, 3);
  const worstDays = sortedByPresent.filter(([, d]) => cnt(d.present) + cnt(d.absent) + cnt(d.leave) > 0).slice(-3).reverse();

  const wkBuckets = {};
  entries.forEach(([date, d]) => {
    const wk = `W${Math.ceil(new Date(date + "T00:00:00").getDate() / 7)}`;
    if (!wkBuckets[wk]) wkBuckets[wk] = { label: wk, present: 0, days: 0 };
    wkBuckets[wk].present += cnt(d.present); wkBuckets[wk].days++;
  });
  const weeklyAvg = Object.values(wkBuckets).map(w => ({ label: w.label, value: w.days ? w.present / w.days : 0 }));

  const empList = Object.values(empStats).map(e => {
    const rate = workDays ? Math.round((e.present / workDays) * 100) : 0;
    return {
      ...e, rate,
      risk: e.absent >= 5 ? "critical" : e.absent >= 3 ? "warning" : rate < 70 ? "low" : "good",
    };
  }).sort((a, b) => b.rate - a.rate);

  return { totals, avgPresent, totalRate, trend, dowBreakdown, weeklyAvg, trendDir, trendPct, bestDays, worstDays, empList, hasEmpData, spikes, workDays };
}

// ─── INSIGHTS (no API key — rule-based analysis) ──────────────────────────────
function generateInsights(m, totalEmp) {
  const { totalRate, trendDir, trendPct, empList, spikes, dowBreakdown, hasEmpData, totals, workDays } = m;
  const insights = [];
  const score = Math.min(100, Math.round(totalRate));

  if (totalRate >= 90)
    insights.push({ sev: "success", title: "Outstanding Attendance", body: `Attendance rate is ${totalRate.toFixed(1)}% — top-tier performance. Strong engagement and culture are evident.` });
  else if (totalRate >= 80)
    insights.push({ sev: "info", title: "Above-Average Attendance", body: `At ${totalRate.toFixed(1)}%, attendance exceeds the 80% industry benchmark. Targeted follow-ups with high-absence employees can push this higher.` });
  else if (totalRate >= 65)
    insights.push({ sev: "warning", title: "Below Benchmark", body: `Attendance is ${totalRate.toFixed(1)}%, below the 80% benchmark. Recommend flexible scheduling, wellbeing check-ins, and workload reviews.` });
  else
    insights.push({ sev: "critical", title: "Critical Attendance Alert", body: `At ${totalRate.toFixed(1)}%, attendance requires urgent intervention. Escalate to department heads and initiate structured improvement plans immediately.` });

  if (trendDir === "up" && trendPct > 2)
    insights.push({ sev: "success", title: "Positive Monthly Trend", body: `Attendance improved by ${trendPct.toFixed(1)}% from the first half to the second half of the month. Momentum is building.` });
  else if (trendDir === "down" && trendPct > 2)
    insights.push({ sev: "warning", title: "Declining Trend", body: `Attendance dropped ${trendPct.toFixed(1)}% across the month. Investigate for burnout, unresolved issues, or leave stacking.` });

  if (dowBreakdown.length >= 3) {
    const sorted = [...dowBreakdown].sort((a, b) => b.value - a.value);
    const peak = sorted[0], low = sorted[sorted.length - 1];
    if (peak?.label !== low?.label)
      insights.push({ sev: "info", title: "Day-of-Week Pattern", body: `${peak.label}s are the strongest day (avg ${peak.value.toFixed(0)} present). ${low.label}s average the lowest (${low.value.toFixed(0)}). Front-load key meetings on ${peak.label}s.` });
  }

  if (spikes.length > 0) {
    const worst = spikes.reduce((a, b) => b.rate > a.rate ? b : a, spikes[0]);
    insights.push({ sev: "warning", title: `${spikes.length} Absence Spike${spikes.length > 1 ? "s" : ""} Detected`, body: `On ${spikes.length} day${spikes.length > 1 ? "s" : ""}, absences exceeded 20% of the team. Peak: ${worst.date} with ${worst.rate}% absent. Review for external events or morale issues on those dates.` });
  }

  if (hasEmpData && empList.length > 0) {
    const risky = empList.filter(e => e.risk === "critical");
    const perfect = empList.filter(e => e.absent === 0 && e.nci === 0 && e.present > 0);
    if (risky.length)
      insights.push({ sev: "critical", title: `${risky.length} High-Risk Employee${risky.length > 1 ? "s" : ""}`, body: `${risky.slice(0, 3).map(e => e.name).join(", ")}${risky.length > 3 ? ` and ${risky.length - 3} more` : ""} — absent 5+ days. Trigger a welfare check or return-to-work conversation.` });
    if (perfect.length)
      insights.push({ sev: "success", title: `${perfect.length} Perfect Attendance`, body: `${perfect.length} employee${perfect.length > 1 ? "s" : ""} had zero absences this month. Recognise them in the next all-hands to reinforce the behaviour.` });
  }

  const leaveRate = totalEmp > 0 && workDays > 0 ? (totals.leave / (totalEmp * workDays)) * 100 : 0;
  if (leaveRate > 10)
    insights.push({ sev: "info", title: "Elevated Leave Usage", body: `${leaveRate.toFixed(1)}% of workforce-days were on approved leave. Review leave coverage plans for peak periods.` });

  insights.push({ sev: "tip", title: "Recommendation", body: score >= 90 ? "Sustain excellence with quarterly recognition programmes and flexible wellbeing days." : score >= 80 ? "A quick pulse survey on commute, workload, and meeting fatigue often reveals the root of the 20% gap." : "Introduce a phased attendance improvement plan: clear communication, 1:1 manager check-ins, and a visible attendance tracker for team leads." });

  return { insights, score };
}

// ─── SVG CHARTS ──────────────────────────────────────────────────────────────
// Colours align with the app's design tokens
const C_BRAND  = "#34a06a";  // var(--brand)
const C_DANGER = "#dc2626";  // var(--error)
const C_WARN   = "#d97706";  // var(--warning)
const C_INFO   = "#2563eb";  // var(--info)
const C_SLATE  = "#64748b";  // var(--slate-500)
const C_GRID   = "#e6eaef";  // var(--slate-200)
const C_LABEL  = "#94a3b8";  // var(--slate-400)

function Sparkline({ data = [], color = C_BRAND, h = 30, w = 72 }) {
  if (data.length < 2) return <span style={{ display: "block", width: w, height: h }} />;
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / rng) * (h - 4)}`).join(" ");
  const lx = w, ly = h - 2 - ((data[data.length - 1] - min) / rng) * (h - 4);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h, display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
    </svg>
  );
}

function LineChart({ series = [], h = 190 }) {
  const PAD = { t: 14, r: 12, b: 28, l: 36 };
  const W = 720, H = h, IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;
  const n = series[0]?.data?.length || 0;
  if (n < 2) return <div style={{ textAlign: "center", padding: "40px 0", color: C_LABEL, fontSize: 13 }}>Not enough data to plot — need at least 2 working days.</div>;
  const allY = series.flatMap(s => s.data.map(d => d.y));
  const minY = Math.max(0, Math.floor(Math.min(...allY) * 0.85));
  const maxY = Math.ceil(Math.max(...allY) * 1.08) || 1;
  const rng = maxY - minY || 1;
  const px = i => PAD.l + (i / (n - 1)) * IW;
  const py = v => PAD.t + IH - ((v - minY) / rng) * IH;
  const ticks = [0, 0.33, 0.67, 1].map(t => Math.round(minY + t * rng));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: h }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={py(t)} x2={W - PAD.r} y2={py(t)} stroke={C_GRID} strokeWidth={1} strokeDasharray={i > 0 ? "4 3" : ""} />
          <text x={PAD.l - 5} y={py(t) + 4} textAnchor="end" fontSize={9} fill={C_LABEL}>{t}</text>
        </g>
      ))}
      {series[0].data.map((d, i) => (i % 5 === 0 || i === n - 1) && (
        <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize={9} fill={C_LABEL}>{d.label}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.data.map((d, i) => `${px(i)},${py(d.y)}`).join(" ");
        const area = `${px(0)},${py(minY)} ${pts} ${px(n - 1)},${py(minY)}`;
        return (
          <g key={si}>
            <polygon points={area} fill={s.color} opacity={0.07} />
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={si === 0 ? 2 : 1.5}
              strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={si > 0 ? "5 3" : undefined} />
            {si === 0 && [0, n - 1].map(i => (
              <circle key={i} cx={px(i)} cy={py(s.data[i].y)} r={3} fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function BarChart({ data = [], h = 150 }) {
  const W = 520, H = h, PAD = { t: 12, r: 10, b: 28, l: 34 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;
  if (!data.length) return null;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(32, (IW / data.length) * 0.55);
  const gap = IW / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: h }}>
      {[0, 0.5, 1].map((t, i) => {
        const v = maxV * t, yv = PAD.t + IH - t * IH;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={yv} x2={W - PAD.r} y2={yv} stroke={C_GRID} strokeWidth={1} strokeDasharray={i > 0 ? "4 3" : ""} />
            <text x={PAD.l - 5} y={yv + 4} textAnchor="end" fontSize={9} fill={C_LABEL}>{Math.round(v)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const bh = Math.max((d.value / maxV) * IH, 2);
        const bx = PAD.l + gap * i + (gap - barW) / 2;
        const by = PAD.t + IH - bh;
        const isTop = data.reduce((mx, x) => x.value > mx.value ? x : mx, data[0]) === d;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={bh} rx={3} fill={d.color || C_BRAND} opacity={isTop ? 1 : 0.65} />
            <text x={bx + barW / 2} y={H - 6} textAnchor="middle" fontSize={9} fill={C_SLATE}>{d.label}</text>
            {d.value > 0 && <text x={bx + barW / 2} y={by - 3} textAnchor="middle" fontSize={9} fontWeight="700" fill={d.color || C_BRAND}>{d.value.toFixed(0)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ segs = [], size = 140 }) {
  const R = 48, CX = size / 2, CY = size / 2, circ = 2 * Math.PI * R;
  const total = segs.reduce((s, d) => s + d.value, 0) || 1;
  let cum = 0;
  const mainPct = Math.round((segs[0]?.value / total) * 100);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
      {segs.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const offset = circ / 4 - cum;
        cum += dash;
        return <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={seg.color} strokeWidth={20}
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={offset} />;
      })}
      <circle cx={CX} cy={CY} r={34} fill="white" />
      <text x={CX} y={CY - 2} textAnchor="middle" fontSize={15} fontWeight="800" fill="#0f172a">{mainPct}%</text>
      <text x={CX} y={CY + 13} textAnchor="middle" fontSize={8.5} fill={C_SLATE}>{segs[0]?.label || "Present"}</text>
    </svg>
  );
}

function GaugeChart({ score = 0, size = 150 }) {
  const R = 52, CX = size / 2, CY = size * 0.68, circ = Math.PI * R;
  const color = score >= 88 ? C_BRAND : score >= 72 ? C_WARN : C_DANGER;
  const filled = (score / 100) * circ;
  return (
    <svg viewBox={`0 0 ${size} ${size * 0.6}`} style={{ width: size, height: size * 0.6 }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={C_GRID} strokeWidth={14}
        strokeDasharray={`${circ} ${circ}`} style={{ transformOrigin: `${CX}px ${CY}px`, transform: "rotate(180deg)" }} />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`} style={{ transformOrigin: `${CX}px ${CY}px`, transform: "rotate(180deg)" }} />
      <text x={CX} y={CY - 6} textAnchor="middle" fontSize={20} fontWeight="900" fill={color}>{score}</text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize={8.5} fill={C_SLATE} fontWeight="600">Attendance Score</text>
      <text x={CX} y={CY + 21} textAnchor="middle" fontSize={8} fill={C_LABEL}>out of 100</text>
    </svg>
  );
}

// ─── EXPORT FUNCTIONS ─────────────────────────────────────────────────────────
function convertToCSV(summary, idMap) {
  let csv = "Date,Day,Present,Present Names,Absent,Absent Names,On Leave,Leave Names,Not Checked-in,NCI Names\n";
  visibleDayEntries(summary).forEach(([date, d]) => {
    const q = s => `"${String(s).replace(/"/g, '""')}"`;
    const dow = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
    csv += [date, dow, cnt(d.present), q(nameList(d,"present",idMap)), cnt(d.absent), q(nameList(d,"absent",idMap)), cnt(d.leave), q(nameList(d,"leave",idMap)), cnt(d.not_checked_in), q(nameList(d,"not_checked_in",idMap))].join(",") + "\n";
  });
  return csv;
}

function buildPDFHtml(summary, month, idMap = {}) {
  const days = visibleDayEntries(summary);
  const fmt = iso => { try { return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); } catch { return iso; } };
  const totals = days.reduce((a, [, d]) => ({ p: a.p + cnt(d.present), ab: a.ab + cnt(d.absent), l: a.l + cnt(d.leave), n: a.n + cnt(d.not_checked_in) }), { p: 0, ab: 0, l: 0, n: 0 });
  const totalEmp = summary.total_employees ?? "—";
  const rate = totalEmp !== "—" && days.length ? ((totals.p / (totalEmp * days.length)) * 100).toFixed(1) + "%" : "—";
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const rows = days.map(([date, d]) => `<tr><td>${escHtml(date)}</td><td>${new Date(date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short"})}</td><td style="color:#16a34a;font-weight:700">${cnt(d.present)}</td><td style="color:#dc2626;font-weight:700">${cnt(d.absent)}</td><td style="color:#d97706;font-weight:700">${cnt(d.leave)}</td><td style="color:#64748b;font-weight:700">${cnt(d.not_checked_in)}</td></tr>`).join("");
  const catBlock = (d, key, title, color, bg) => { const names = getNames(d, key, idMap); const list = names.length ? `<ol style="margin:0;padding-left:18px;font-size:11px;color:#334155;line-height:1.9">${names.map(n=>`<li>${escHtml(n)}</li>`).join("")}</ol>` : `<div style="font-size:11px;color:#94a3b8;font-style:italic">No records.</div>`; return `<div style="flex:1;min-width:160px;border:1px solid #f1f5f9;border-radius:8px;overflow:hidden"><div style="background:${bg};padding:7px 11px;display:flex;justify-content:space-between"><span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${color}">${title}</span><span style="font-size:13px;font-weight:800;color:${color}">${cnt(d[key])}</span></div><div style="padding:8px 11px">${list}</div></div>`; };
  const detailPages = days.map(([date, d]) => `<div style="page-break-inside:avoid;margin-bottom:20px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="width:4px;height:18px;background:#34a06a;border-radius:2px"></div><h3 style="margin:0;font-size:13px;color:#0f172a">${escHtml(fmt(date))}</h3></div><div style="display:flex;flex-wrap:wrap;gap:8px">${catBlock(d,"present","Present","#16a34a","#f0fdf4")}${catBlock(d,"leave","On Leave","#d97706","#fffbeb")}${catBlock(d,"absent","Absent","#dc2626","#fef2f2")}${catBlock(d,"not_checked_in","Not Checked-in","#64748b","#f8fafc")}</div></div>`).join("");
  return `<html><head><title>GDMR Connect — Attendance Report ${month}</title><style>@media print{@page{margin:14mm}}body{font-family:system-ui,Arial,sans-serif;color:#0f172a;margin:0;font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:7px 10px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:12px}th{background:#f8fafc;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e6eaef}</style></head><body><div style="padding:36px 44px"><div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #34a06a;padding-bottom:14px;margin-bottom:20px"><div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#34a06a;margin-bottom:4px">GDMR Connect HRMS</div><h1 style="margin:0;font-size:18px;font-weight:800;color:#0f172a">Monthly Attendance Report</h1></div><div style="text-align:right;font-size:11px;color:#64748b"><div><b>Period:</b> ${month}</div><div><b>Rate:</b> ${rate}</div><div><b>Employees:</b> ${totalEmp}</div><div><b>Working Days:</b> ${days.length}</div><div><b>Generated:</b> ${today}</div></div></div><div style="display:flex;gap:10px;margin-bottom:20px">${[["Present",totals.p,"#16a34a","#f0fdf4"],["On Leave",totals.l,"#d97706","#fffbeb"],["Absent",totals.ab,"#dc2626","#fef2f2"],["Not Checked-in",totals.n,"#64748b","#f8fafc"]].map(([l,v,c,bg])=>`<div style="flex:1;background:${bg};border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:900;color:${c}">${v}</div><div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:.05em">${l}</div></div>`).join("")}</div><table><thead><tr><th>Date</th><th>Day</th><th>Present</th><th>Absent</th><th>On Leave</th><th>Not Checked-in</th></tr></thead><tbody>${rows}</tbody></table></div><div style="padding:36px 44px;page-break-before:always"><h2 style="color:#34a06a;margin:0 0 4px;font-size:15px">Detailed Daily Breakdown</h2><p style="color:#64748b;font-size:11px;margin:0 0 18px">Employees grouped by attendance status, day by day.</p>${detailPages}</div></body></html>`;
}

// ─── HR REPORTS (Stage 2) ──────────────────────────────────────────────────────
// Six report types cover the spec's nine bullets — LOP, unauthorized absence, missing
// check-ins, and payroll-related LOP are all the same underlying "absent" bucket from
// the day-classification data (see helpers.classify_attendance_day on the backend), so
// they're one report rather than four duplicate tables with identical numbers.
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const HR_REPORT_TYPES = [
  { id: "employee-wise",     label: "Employee-wise Attendance" },
  { id: "department-wise",   label: "Department-wise Attendance" },
  { id: "lop",                label: "LOP / Unauthorized Absence / Missing Check-ins" },
  { id: "late-checkins",     label: "Late Check-ins" },
  { id: "corrections",       label: "Attendance Corrections" },
  { id: "leave-utilization", label: "Leave Utilization" },
];

// Same 4-way bucket EmployeeList.jsx's getEmpStatus() already uses, so "Notice Period"
// means the same thing on both screens.
function hrEmployeeStatus(emp) {
  if (emp.resignation?.notice_date) {
    const lwd = emp.resignation.last_working_day;
    if (lwd) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(lwd) < today) return "resigned";
    }
    return "notice";
  }
  if (emp.extended_leaves?.length > 0) return "on_leave";
  return "active";
}
const HR_STATUS_LABELS = { active: "Active", on_leave: "On Extended Leave", notice: "Serving Notice", resigned: "Off-boarded" };

function uniqueOptions(arr, getter) {
  return [...new Set(arr.map(getter).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

// Generic {columns, rows} exporter every HR report feeds into — same CSV-Blob /
// window.print() PDF pattern as convertToCSV/buildPDFHtml above, generalized so six
// report types don't need six bespoke export functions.
function reportRowsToCSV(columns, rows) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  let csv = columns.map(c => esc(c.label)).join(",") + "\n";
  rows.forEach(r => { csv += columns.map(c => esc(r[c.key])).join(",") + "\n"; });
  return csv;
}

function reportRowsToPDFHtml(title, columns, rows, periodLabel) {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const head = columns.map(c => `<th>${escHtml(c.label)}</th>`).join("");
  const body = rows.length
    ? rows.map(r => `<tr>${columns.map(c => `<td>${escHtml(String(r[c.key] ?? "—"))}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${columns.length}" style="text-align:center;color:#94a3b8">No rows for this period/filter.</td></tr>`;
  return `<html><head><title>GDMR Connect — ${escHtml(title)}</title><style>@media print{@page{margin:14mm}}body{font-family:system-ui,Arial,sans-serif;color:#0f172a;margin:0;font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:7px 10px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:12px}th{background:#f8fafc;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e6eaef}</style></head><body><div style="padding:36px 44px"><div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #34a06a;padding-bottom:14px;margin-bottom:20px"><div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#34a06a;margin-bottom:4px">GDMR Connect HRMS</div><h1 style="margin:0;font-size:18px;font-weight:800;color:#0f172a">${escHtml(title)}</h1></div><div style="text-align:right;font-size:11px;color:#64748b"><div><b>Period:</b> ${escHtml(periodLabel)}</div><div><b>Rows:</b> ${rows.length}</div><div><b>Generated:</b> ${today}</div></div></div><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></body></html>`;
}

function exportHrReport(fmt, title, columns, rows, periodLabel, filenameBase) {
  if (fmt === "csv") {
    const blob = new Blob([reportRowsToCSV(columns, rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filenameBase}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const w = window.open("", "", "height=700,width=900");
    if (!w) return;
    w.document.write(reportRowsToPDFHtml(title, columns, rows, periodLabel));
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }
}

// ─── SEVERITY CONFIG (standard icons, no AI branding) ─────────────────────────
const SEV_CONFIG = {
  success:  { bg: "var(--success-bg)",  border: "var(--success-border)",  accent: C_BRAND,  Icon: TbCircleCheck },
  info:     { bg: "var(--info-bg)",     border: "var(--info-border)",     accent: C_INFO,   Icon: TbCalendar },
  warning:  { bg: "var(--warning-bg)",  border: "var(--warning-border)",  accent: C_WARN,   Icon: TbAlertTriangle },
  critical: { bg: "var(--error-bg)",    border: "var(--error-border)",    accent: C_DANGER, Icon: TbCircleX },
  tip:      { bg: "#f5f3ff",            border: "#ddd6fe",                accent: "#7c3aed", Icon: TbTrophy },
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatMonthsLabel(months) {
  if (!months.length) return "No months selected";
  if (months.length === 1) {
    const [y, m] = months[0].split("-");
    return `${MONTH_SHORT[+m - 1]} ${y}`;
  }
  const sorted = [...months].sort();
  return `${sorted.length} months (${MONTH_SHORT[+sorted[0].split("-")[1] - 1]} ${sorted[0].split("-")[0]} – ${MONTH_SHORT[+sorted[sorted.length - 1].split("-")[1] - 1]} ${sorted[sorted.length - 1].split("-")[0]})`;
}

export default function AdminAttendanceSummary({ token, api }) {
  const [months, setMonths] = useState([new Date().toISOString().slice(0, 7)]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [idMap, setIdMap] = useState({});
  const [codeMap, setCodeMap] = useState({});        // employee name -> employee code (from Payroll)
  const [employees, setEmployees] = useState([]);   // full employee objects for Journey modal
  const [allLeaves, setAllLeaves] = useState([]);   // all leave apps for Journey modal
  const [activeTab, setActiveTab] = useState("overview");
  const [empSearch, setEmpSearch] = useState("");
  const [empSort, setEmpSort] = useState("name");
  const [empFilter, setEmpFilter] = useState("all");
  const [journeyEmp, setJourneyEmp] = useState(null); // employee object to show in Journey modal

  // — Spreadsheet-style PDF reports (Monthly Report / Master Tracker) —
  // Company-wide, real generated PDF files matching the HR team's existing
  // reference spreadsheets — separate from the six filtered CSV/print
  // reports below, which don't need a real backend file.
  const now = new Date();
  const [pdfReportMonth, setPdfReportMonth] = useState(now.getMonth() + 1);
  const [pdfReportYear,  setPdfReportYear]  = useState(now.getFullYear());
  const [trackerYear,    setTrackerYear]    = useState(now.getFullYear());
  const [pdfDownloading, setPdfDownloading] = useState(null); // "monthly-pdf" | "monthly-xlsx" | "tracker-pdf" | "tracker-xlsx" | null

  async function downloadReport(kind, format) {
    const key = `${kind}-${format}`;
    setPdfDownloading(key);
    try {
      const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const url = kind === "monthly"
        ? `${baseUrl}/api/admin/reports/monthly-attendance-${format}?month=${pdfReportMonth}&year=${pdfReportYear}`
        : `${baseUrl}/api/admin/reports/master-tracker-${format}?year=${trackerYear}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        alert(detail && detail.length < 300 ? `Failed to generate the report.\n\n${detail}` : "Failed to generate the report.");
        return;
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = kind === "monthly"
        ? `Monthly_Attendance_Report_${pdfReportMonth}_${pdfReportYear}.${format}`
        : `Attendance_Master_Tracker_${trackerYear}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(objUrl);
    } catch { alert("Network error — failed to generate the report."); }
    finally { setPdfDownloading(null); }
  }

  // — HR Reports (Stage 2) —
  const [hrDept, setHrDept] = useState("All");
  const [hrDesignation, setHrDesignation] = useState("All");
  const [hrManager, setHrManager] = useState("All");
  const [hrEmpType, setHrEmpType] = useState("All");
  const [hrLocation, setHrLocation] = useState("All");
  const [hrStatus, setHrStatus] = useState("All");
  const [hrReportType, setHrReportType] = useState("employee-wise");
  const [correctionsReport, setCorrectionsReport] = useState(null);
  const [correctionsReportLoading, setCorrectionsReportLoading] = useState(false);
  const [lateCheckins, setLateCheckins] = useState(null);
  const [lateCheckinsLoading, setLateCheckinsLoading] = useState(false);

  async function load() {
    if (!months.length) { setSummary({ days: {}, total_employees: 0 }); return; }
    setLoading(true);
    try {
      const results = await Promise.all(months.map(m => api.getAttendanceSummary(m, token).catch(() => null)));
      const mergedDays = {};
      let totalEmp = 0;
      results.forEach(data => {
        if (!data) return;
        Object.assign(mergedDays, data.days || {});
        if (typeof data.total_employees === "number") totalEmp = Math.max(totalEmp, data.total_employees);
      });
      setSummary({ days: mergedDays, total_employees: totalEmp });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [months.join(",")]);

  // HR Reports: on-demand fetch for the two report types that need data beyond
  // what's already loaded (attendance-summary + roster) — reset when the period
  // changes so a stale month's rows never linger under a new month label.
  useEffect(() => {
    setCorrectionsReport(null);
    setLateCheckins(null);
  }, [months.join(",")]);

  useEffect(() => {
    if (activeTab !== "hr-reports") return;
    if (hrReportType === "corrections" && correctionsReport === null && !correctionsReportLoading) {
      setCorrectionsReportLoading(true);
      Promise.all(months.map(m => api.getCorrectionsReport(m, token).catch(() => [])))
        .then(results => setCorrectionsReport(results.flat()))
        .finally(() => setCorrectionsReportLoading(false));
    }
    if (hrReportType === "late-checkins" && lateCheckins === null && !lateCheckinsLoading) {
      setLateCheckinsLoading(true);
      Promise.all(months.map(m => api.getLateCheckinsReport(m, token).catch(() => [])))
        .then(results => setLateCheckins(results.flat()))
        .finally(() => setLateCheckinsLoading(false));
    }
  }, [activeTab, hrReportType, months.join(",")]);

  function toggleMonth(m) {
    setMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort());
  }
  // Full employee list for the Journey modal and every HR report's roster —
  // also called by the HR Reports tab's Refresh button.
  function loadEmployees() {
    return api.listEmployees(token)
      .then(list => {
        const arr = Array.isArray(list) ? list : list?.employees || [];
        const m = {};
        arr.forEach(e => { if (e?._id) m[String(e._id)] = e.name; });
        setIdMap(m);
        setEmployees(arr);
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadEmployees();
    // Load all leave applications for Journey modal
    api.adminLeaves(token)
      .then(data => setAllLeaves(Array.isArray(data) ? data : data?.leaves || []))
      .catch(() => {});
    // Load employee codes from Payroll (only place employee codes are stored)
    api.getPayrollSalaries?.(token)
      .then(list => {
        const arr = Array.isArray(list) ? list : (list?.salaries || list?.data || []);
        const m = {};
        arr.forEach(s => { if (s?.employee_name && s?.employee_code) m[s.employee_name] = s.employee_code; });
        setCodeMap(m);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // HR Reports "Refresh" — re-pulls the roster, this period's attendance
  // summary, and (if currently viewing them) the two on-demand reports, so
  // "generate/refresh" always reflects the latest data rather than whatever
  // was cached when the tab was first opened.
  function refreshHrReports() {
    loadEmployees();
    load();
    setCorrectionsReport(null);
    setLateCheckins(null);
  }

  const entries = useMemo(() => summary ? visibleDayEntries(summary) : [], [summary]);
  const totalEmp = summary?.total_employees ?? 0;
  const metrics = useMemo(() => entries.length ? computeMetrics(entries, idMap, totalEmp) : null, [entries, idMap, totalEmp]);
  const { insights, score } = useMemo(() => metrics ? generateInsights(metrics, totalEmp) : { insights: [], score: 0 }, [metrics, totalEmp]);

  // Must be BEFORE the early return — Rules of Hooks
  const filteredEmp = useMemo(() => {
    const offboardedNames = new Set(employees.filter(isOffboarded).map(e => e.name));
    const list = metrics?.empList ? metrics.empList.filter(e => !offboardedNames.has(e.name)) : [];
    let result = list;
    if (empFilter === "critical") result = result.filter(e => e.risk === "critical");
    else if (empFilter === "warning") result = result.filter(e => e.risk === "warning");
    else if (empFilter === "good") result = result.filter(e => e.risk === "good");
    else if (empFilter === "perfect") result = result.filter(e => e.absent === 0 && e.nci === 0 && e.present > 0);
    if (empSearch) result = result.filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase()));
    if (empSort === "rate") result.sort((a, b) => b.rate - a.rate);
    else if (empSort === "absent") result.sort((a, b) => b.absent - a.absent);
    else if (empSort === "present") result.sort((a, b) => b.present - a.present);
    else if (empSort === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [metrics, empFilter, empSearch, empSort, employees]);

  // Offboarded staff are irrelevant to every report on this page — excluded
  // once, here, rather than in each report's own memo.
  const activeEmployees = useMemo(() => employees.filter(e => !isOffboarded(e)), [employees]);

  // — HR Reports: filter options derived from the active roster —
  const hrDeptOptions = useMemo(() => uniqueOptions(activeEmployees, e => Array.isArray(e.department) ? e.department[0] : e.department), [activeEmployees]);
  const hrDesignationOptions = useMemo(() => uniqueOptions(activeEmployees, e => e.position), [activeEmployees]);
  const hrManagerOptions = useMemo(() => uniqueOptions(activeEmployees, e => e.manager_name), [activeEmployees]);
  const hrLocationOptions = useMemo(() => uniqueOptions(activeEmployees, e => e.location), [activeEmployees]);

  // — HR Reports: active roster filtered by all six dimensions, alphabetical by name —
  const hrFilteredEmployees = useMemo(() => activeEmployees.filter(e => {
    const dept = Array.isArray(e.department) ? e.department[0] : e.department;
    if (hrDept !== "All" && dept !== hrDept) return false;
    if (hrDesignation !== "All" && e.position !== hrDesignation) return false;
    if (hrManager !== "All" && e.manager_name !== hrManager) return false;
    if (hrEmpType !== "All" && (e.employment_type || "Permanent") !== hrEmpType) return false;
    if (hrLocation !== "All" && e.location !== hrLocation) return false;
    if (hrStatus !== "All" && hrEmployeeStatus(e) !== hrStatus) return false;
    return true;
  }).sort((a, b) => (a.name || "").localeCompare(b.name || "")), [activeEmployees, hrDept, hrDesignation, hrManager, hrEmpType, hrLocation, hrStatus]);

  const hrDeptOf = (name) => {
    const e = employees.find(x => x.name === name);
    return e ? (Array.isArray(e.department) ? e.department.join(", ") : e.department) || "—" : "—";
  };

  // — Report rows, one memo per report type —
  const employeeWiseRows = useMemo(() => hrFilteredEmployees.map(e => {
    const stats = metrics?.empList?.find(x => x.name === e.name) || { present: 0, absent: 0, leave: 0, nci: 0, rate: 0 };
    return {
      employee_code: codeMap[e.name] || "—",
      name: e.name,
      department: Array.isArray(e.department) ? e.department.join(", ") : (e.department || "—"),
      designation: e.position || "—",
      present: stats.present, absent: stats.absent, leave: stats.leave, nci: stats.nci, rate: stats.rate,
    };
  }), [hrFilteredEmployees, metrics, codeMap]);

  const departmentWiseRows = useMemo(() => {
    const workDays = metrics?.workDays || 0;
    const byDept = {};
    employeeWiseRows.forEach(r => {
      const d = r.department || "—";
      if (!byDept[d]) byDept[d] = { department: d, employees: 0, present: 0, absent: 0, leave: 0, nci: 0 };
      byDept[d].employees++; byDept[d].present += r.present; byDept[d].absent += r.absent; byDept[d].leave += r.leave; byDept[d].nci += r.nci;
    });
    return Object.values(byDept).map(d => ({
      ...d, rate: d.employees && workDays ? Math.round((d.present / (d.employees * workDays)) * 100) : 0,
    })).sort((a, b) => a.department.localeCompare(b.department));
  }, [employeeWiseRows, metrics]);

  const lopRows = useMemo(() => {
    const allowedNames = new Set(hrFilteredEmployees.map(e => e.name));
    const rows = [];
    entries.forEach(([date, d]) => {
      getNames(d, "absent", idMap).forEach(name => {
        if (allowedNames.has(name)) rows.push({ date, name, department: hrDeptOf(name) });
      });
    });
    return rows.sort((a, b) => a.name.localeCompare(b.name) || a.date.localeCompare(b.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, hrFilteredEmployees, idMap, employees]);

  const leaveUtilRows = useMemo(() => {
    const allowedNames = new Set(hrFilteredEmployees.map(e => e.name));
    const byName = {};
    entries.forEach(([, d]) => {
      getNames(d, "leave", idMap).forEach(name => { if (allowedNames.has(name)) byName[name] = (byName[name] || 0) + 1; });
    });
    return hrFilteredEmployees.filter(e => byName[e.name]).map(e => ({
      name: e.name,
      department: Array.isArray(e.department) ? e.department.join(", ") : (e.department || "—"),
      leave_days: byName[e.name],
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [entries, hrFilteredEmployees, idMap]);

  const correctionsRows = useMemo(() => {
    if (!correctionsReport) return [];
    const allowedNames = new Set(hrFilteredEmployees.map(e => e.name));
    return correctionsReport.filter(c => allowedNames.has(c.employee_name)).map(c => ({
      date: c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB") : "—",
      employee_name: c.employee_name,
      department: Array.isArray(c.department) ? c.department.join(", ") : (c.department || "—"),
      new_time: c.new_time ? new Date(c.new_time).toLocaleString() : "—",
      reason: c.reason || "—",
      status: c.status || "Pending",
      submitted_by_role: c.submitted_by_role || "—",
    })).sort((a, b) => a.employee_name.localeCompare(b.employee_name) || a.date.localeCompare(b.date));
  }, [correctionsReport, hrFilteredEmployees]);

  const lateCheckinRows = useMemo(() => {
    if (!lateCheckins) return [];
    const allowedNames = new Set(hrFilteredEmployees.map(e => e.name));
    return lateCheckins.filter(r => allowedNames.has(r.employee_name)).map(r => ({
      date: r.date,
      employee_name: r.employee_name,
      department: Array.isArray(r.department) ? r.department.join(", ") : (r.department || "—"),
      time: r.time ? new Date(r.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—",
    })).sort((a, b) => a.employee_name.localeCompare(b.employee_name) || a.date.localeCompare(b.date));
  }, [lateCheckins, hrFilteredEmployees]);

  const HR_REPORT_COLUMNS = {
    "employee-wise":     [{key:"employee_code",label:"Employee Code"},{key:"name",label:"Employee"},{key:"department",label:"Department"},{key:"designation",label:"Designation"},{key:"present",label:"Present"},{key:"absent",label:"LOP"},{key:"leave",label:"Leave"},{key:"nci",label:"NCI"},{key:"rate",label:"Rate %"}],
    "department-wise":   [{key:"department",label:"Department"},{key:"employees",label:"Employees"},{key:"present",label:"Present"},{key:"absent",label:"LOP"},{key:"leave",label:"Leave"},{key:"nci",label:"NCI"},{key:"rate",label:"Rate %"}],
    "lop":               [{key:"date",label:"Date"},{key:"name",label:"Employee"},{key:"department",label:"Department"}],
    "late-checkins":     [{key:"date",label:"Date"},{key:"employee_name",label:"Employee"},{key:"department",label:"Department"},{key:"time",label:"Check-in Time"}],
    "corrections":       [{key:"date",label:"Date Requested"},{key:"employee_name",label:"Employee"},{key:"department",label:"Department"},{key:"new_time",label:"Requested Time"},{key:"reason",label:"Reason"},{key:"status",label:"Status"},{key:"submitted_by_role",label:"Submitted By"}],
    "leave-utilization": [{key:"name",label:"Employee"},{key:"department",label:"Department"},{key:"leave_days",label:"Leave Days Taken"}],
  };
  const HR_REPORT_ROWS = {
    "employee-wise": employeeWiseRows, "department-wise": departmentWiseRows, "lop": lopRows,
    "late-checkins": lateCheckinRows, "corrections": correctionsRows, "leave-utilization": leaveUtilRows,
  };
  const hrReportLoading = (hrReportType === "corrections" && correctionsReportLoading) || (hrReportType === "late-checkins" && lateCheckinsLoading);
  const hrActiveColumns = HR_REPORT_COLUMNS[hrReportType] || [];
  const hrActiveRows = HR_REPORT_ROWS[hrReportType] || [];
  const hrActiveLabel = HR_REPORT_TYPES.find(r => r.id === hrReportType)?.label || "Report";

  function handleExport(fmt) {
    if (!summary) return;
    const label = formatMonthsLabel(months);
    if (fmt === "csv") {
      const blob = new Blob([convertToCSV(summary, idMap)], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Attendance_${months.join("_")}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const w = window.open("", "", "height=700,width=900");
      if (!w) return;
      w.document.write(buildPDFHtml(summary, label, idMap));
      w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
    }
  }

  if (loading || !summary) return (
    <div style={{ marginTop: 16 }}>
      <SkeletonStats count={4} />
      <div style={{ marginTop: 14 }}><SkeletonTable rows={6} cols={5} /></div>
    </div>
  );

  // Destructure after early return (these are plain variables, not hooks)
  const { totals, avgPresent, totalRate, trend, dowBreakdown, weeklyAvg, trendDir, trendPct, bestDays, worstDays, hasEmpData, workDays } = metrics || {};

  const donutSegs = [
    { label: "Present",     value: totals?.present || 0, color: C_BRAND  },
    { label: "On Leave",    value: totals?.leave   || 0, color: C_WARN   },
    { label: "Absent",      value: totals?.absent  || 0, color: C_DANGER },
    { label: "Not Checked", value: totals?.nci     || 0, color: C_SLATE  },
  ];
  const sparkPresent = trend?.map(d => d.y)      || [];
  const sparkAbsent  = trend?.map(d => d.absent)  || [];
  const sparkLeave   = trend?.map(d => d.leave)   || [];
  const presentRate  = totalRate?.toFixed(1) ?? "0.0";

  const kpiCards = [
    { label: "Attendance Rate",    value: `${presentRate}%`, sub: `${totalEmp} employees · ${workDays ?? 0} working days`, spark: sparkPresent, color: totalRate >= 80 ? C_BRAND : totalRate >= 65 ? C_WARN : C_DANGER, showTrend: true },
    { label: "Avg Present / Day",  value: avgPresent?.toFixed(1) ?? "—",  sub: "employees per working day",   spark: sparkPresent, color: C_BRAND   },
    { label: "Total Absences",     value: totals?.absent ?? 0,             sub: `${workDays && totals ? (totals.absent / workDays).toFixed(1) : 0} avg per day`, spark: sparkAbsent,  color: C_DANGER  },
    { label: "Leave Days Taken",   value: totals?.leave  ?? 0,             sub: "across all employees",        spark: sparkLeave,   color: C_WARN    },
  ];

  const tabs = [
    { id: "overview",   label: "Overview",    icon: <TbCalendar size={11} /> },
    { id: "analytics",  label: "Analytics",   icon: <TbChartBar size={11} />    },
    { id: "employees",  label: "Employees",   icon: <TbUsers size={11} />       },
    { id: "hr-reports", label: "HR Reports",  icon: <TbFilter size={11} />      },
    { id: "insights",   label: "Insights",    icon: <TbTrophy size={11} />      },
  ];

  const riskBadge = (e) => {
    if (e.absent === 0 && e.nci === 0 && e.present > 0) return { label: "Perfect",  cls: "approved" };
    if (e.risk === "critical")          return { label: "Critical", cls: "rejected" };
    if (e.risk === "warning" || e.risk === "low") return { label: "At Risk", cls: "pending" };
    return { label: "Good", cls: "" };
  };

  // Find a full employee object by name (for Journey modal)
  function findEmpByName(name) {
    return employees.find(e => e.name === name) || { name, _id: name };
  }

  // Attendance data for a given employee name in the current month
  function empMonthAtt(name) {
    return metrics?.empList?.find(e => e.name === name) || {};
  }

  return (
    <div>
      {/* ─ Employee Journey Modal ─ */}
      {journeyEmp && (
        <EmployeeJourneyModal
          emp={journeyEmp}
          allLeaves={allLeaves}
          monthAttendance={empMonthAtt(journeyEmp.name)}
          month={months[months.length - 1] || new Date().toISOString().slice(0, 7)}
          onClose={() => setJourneyEmp(null)}
          api={api}
          token={token}
        />
      )}
      {/* ─ Page Header ─ */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ color: "var(--red)", margin: 0 }}>Attendance Reports</h2>
          <p className="small" style={{ margin: "4px 0 0", color: "var(--slate-500)" }}>
            {months.length > 1 ? "Multi-month summary" : "Monthly summary"} · Mon–Fri + last Saturday counted · Sundays excluded
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <button
              type="button" onClick={() => { setPickerOpen(o => !o); if (months.length) setPickerYear(+months[months.length - 1].split("-")[0]); }}
              className="modern-input"
              style={{ width: "auto", margin: 0, padding: "8px 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <TbCalendar size={12} color="var(--slate-400)" />
              {formatMonthsLabel(months)}
            </button>

            {pickerOpen && (
              <>
                <div onClick={() => setPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
                <div style={{
                  position: "absolute", top: "110%", right: 0, zIndex: 20, width: 250,
                  background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12,
                  boxShadow: "0 10px 28px rgba(0,0,0,0.14)", padding: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <button type="button" onClick={() => setPickerYear(y => y - 1)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--slate-500)", fontSize: 15, padding: 4 }}>‹</button>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--slate-700)" }}>{pickerYear}</span>
                    <button type="button" onClick={() => setPickerYear(y => y + 1)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--slate-500)", fontSize: 15, padding: 4 }}>›</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {MONTH_SHORT.map((label, i) => {
                      const key = `${pickerYear}-${String(i + 1).padStart(2, "0")}`;
                      const selected = months.includes(key);
                      return (
                        <button
                          key={key} type="button" onClick={() => toggleMonth(key)}
                          style={{
                            padding: "8px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            border: selected ? "1px solid var(--brand)" : "1px solid var(--slate-200)",
                            background: selected ? "var(--brand)" : "#fff",
                            color: selected ? "#fff" : "var(--slate-600)",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--slate-100)" }}>
                    <button type="button" onClick={() => setMonths([])} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--slate-500)" }}>Clear</button>
                    <span style={{ fontSize: 11.5, color: "var(--slate-400)" }}>{months.length} selected</span>
                    <button type="button" onClick={() => setPickerOpen(false)} className="btn" style={{ padding: "4px 12px", fontSize: 12 }}>Done</button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={() => handleExport("csv")} className="btn ghost" style={{ padding: "8px 14px", fontSize: 12.5 }}>
            <TbFileTypeCsv /> CSV
          </button>
          <button onClick={() => handleExport("pdf")} className="btn" style={{ padding: "8px 14px", fontSize: 12.5 }}>
            <TbFileTypePdf /> PDF
          </button>
        </div>
      </div>

      {/* ─ KPI Strip ─ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 16 }}>
        {kpiCards.map((k, i) => (
          <div key={i} className="card" style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: k.color, lineHeight: 1, fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", gap: 6 }}>
                {k.value}
                {k.showTrend && trendDir && trendDir !== "flat" && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: trendDir === "up" ? C_BRAND : C_DANGER, display: "flex", alignItems: "center", gap: 2 }}>
                    {trendDir === "up" ? <TbArrowUp size={9} /> : <TbArrowDown size={9} />}
                    {trendPct?.toFixed(0)}%
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--slate-400)", marginTop: 5 }}>{k.sub}</div>
            </div>
            <Sparkline data={k.spark} color={k.color} />
          </div>
        ))}
      </div>

      {/* ─ Tab Navigation (pill style — matches AdminAttendancePage) ─ */}
      <div style={{ display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 10, marginBottom: 16, gap: 2 }}>
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 14px", border: "none", borderRadius: 7, cursor: "pointer",
              fontWeight: 600, fontSize: 13, fontFamily: "var(--font)",
              background: activeTab === t.id ? "#fff" : "transparent",
              color: activeTab === t.id ? "var(--red)" : "var(--slate-500)",
              boxShadow: activeTab === t.id ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
              transition: "all 0.18s",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════ OVERVIEW ═══════════════════════════════════ */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Donut + month summary */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14 }}>
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 22px", minWidth: 190 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)", alignSelf: "flex-start" }}>Distribution</div>
              <DonutChart segs={donutSegs} size={140} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                {donutSegs.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      <span style={{ color: "var(--slate-600)" }}>{s.label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Month summary tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
                {[["Total Present", totals?.present, C_BRAND, "var(--success-bg)"], ["On Leave", totals?.leave, C_WARN, "var(--warning-bg)"], ["Absent", totals?.absent, C_DANGER, "var(--error-bg)"], ["Not Checked-in", totals?.nci, C_SLATE, "var(--slate-50)"]].map(([l, v, c, bg]) => (
                  <div key={l} className="card" style={{ background: bg, textAlign: "center", padding: "14px 10px", boxShadow: "none", border: "1px solid var(--slate-200)" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums" }}>{v ?? 0}</div>
                    <div style={{ fontSize: 10.5, color: "var(--slate-500)", marginTop: 3, fontWeight: 600 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Best / Worst days */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <TbTrophy size={12} color={C_WARN} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)" }}>Peak Days</span>
                  </div>
                  {(bestDays?.length ? bestDays : []).map(([date, d], i) => (
                    <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < bestDays.length - 1 ? "1px solid var(--slate-100)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-700)" }}>{date}</div>
                        <div style={{ fontSize: 11, color: "var(--slate-400)" }}>{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}</div>
                      </div>
                      <span className="status-badge approved">{cnt(d.present)} present</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <TbAlertTriangle size={11} color={C_DANGER} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)" }}>Lowest Days</span>
                  </div>
                  {(worstDays?.length ? worstDays : []).map(([date, d], i) => (
                    <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < worstDays.length - 1 ? "1px solid var(--slate-100)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-700)" }}>{date}</div>
                        <div style={{ fontSize: 11, color: "var(--slate-400)" }}>{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}</div>
                      </div>
                      <span className="status-badge rejected">{cnt(d.absent)} absent</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Daily log table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--slate-100)", display: "flex", alignItems: "center", gap: 8 }}>
              <TbTable size={12} color="var(--slate-400)" />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)" }}>Daily Log — working days only (Mon–Fri + last Saturday)</span>
            </div>
            <div style={{ overflowX: "auto", overflowY: "visible" }}>
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Day</th>
                    <th style={{ color: C_BRAND }}>Present</th>
                    <th style={{ color: C_DANGER }}>Absent</th>
                    <th style={{ color: C_WARN }}>On Leave</th>
                    <th style={{ color: C_SLATE }}>Not Checked-in</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--slate-400)" }}>No attendance data for this period yet.</td></tr>
                  ) : entries.map(([date, d]) => {
                    const p = cnt(d.present), a = cnt(d.absent), l = cnt(d.leave), n = cnt(d.not_checked_in);
                    const rate = totalEmp ? Math.round((p / totalEmp) * 100) : 0;
                    const dow = new Date(date + "T00:00:00").getDay();
                    const isLastSat = dow === 6;
                    return (
                      <tr key={date}>
                        <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{date}</td>
                        <td>
                          <span style={{ fontSize: 12, color: "var(--slate-500)" }}>
                            {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                            {isLastSat && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", padding: "1px 5px", borderRadius: 4 }}>Mandatory</span>}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: C_BRAND, fontVariantNumeric: "tabular-nums" }}>{p}</td>
                        <td style={{ fontWeight: 700, color: a > 0 ? C_DANGER : "var(--slate-300)", fontVariantNumeric: "tabular-nums" }}>{a}</td>
                        <td style={{ fontWeight: 700, color: l > 0 ? C_WARN : "var(--slate-300)", fontVariantNumeric: "tabular-nums" }}>{l}</td>
                        <td style={{ fontWeight: 700, color: n > 0 ? C_SLATE : "var(--slate-300)", fontVariantNumeric: "tabular-nums" }}>{n}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 48, height: 5, borderRadius: 3, background: "var(--slate-100)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${rate}%`, background: rate >= 80 ? C_BRAND : rate >= 65 ? C_WARN : C_DANGER, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: rate >= 80 ? C_BRAND : rate >= 65 ? C_WARN : C_DANGER, fontVariantNumeric: "tabular-nums", minWidth: 30 }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ ANALYTICS ══════════════════════════════════ */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <TbChartLine size={13} color="var(--brand)" />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--slate-700)" }}>Daily Attendance Trend — {formatMonthsLabel(months)}</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--slate-500)" }}>
                {[["Present", C_BRAND, "solid"], ["Absent", C_DANGER, "dashed"], ["On Leave", C_WARN, "dashed"]].map(([l, c, d]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 18, height: 2.5, background: c, borderRadius: 2, opacity: d === "dashed" ? 0.7 : 1 }} />
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <LineChart h={190} series={[
              { color: C_BRAND,  data: trend?.map(d => ({ label: d.label, y: d.y }))      || [] },
              { color: C_DANGER, data: trend?.map(d => ({ label: d.label, y: d.absent })) || [] },
              { color: C_WARN,   data: trend?.map(d => ({ label: d.label, y: d.leave }))  || [] },
            ]} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)", marginBottom: 12 }}>Day-of-Week Avg Attendance</div>
              <BarChart h={150} data={dowBreakdown?.map(d => ({ label: d.label, value: d.value, color: C_BRAND })) || []} />
              {dowBreakdown?.length > 0 && (() => {
                const s = [...dowBreakdown].sort((a, b) => b.value - a.value);
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11.5 }}>
                    <span style={{ color: "var(--slate-500)" }}>Strongest: <b style={{ color: C_BRAND }}>{s[0]?.label}</b></span>
                    <span style={{ color: "var(--slate-500)" }}>Weakest: <b style={{ color: C_DANGER }}>{s[s.length - 1]?.label}</b></span>
                  </div>
                );
              })()}
            </div>
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)", marginBottom: 12 }}>Weekly Average Attendance</div>
              <BarChart h={150} data={weeklyAvg?.map(w => ({ label: w.label, value: w.value, color: C_INFO })) || []} />
              {weeklyAvg?.length > 1 && (() => {
                const last = weeklyAvg[weeklyAvg.length - 1]?.value ?? 0;
                const prev = weeklyAvg[weeklyAvg.length - 2]?.value ?? 0;
                const diff = last - prev;
                return (
                  <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--slate-500)" }}>
                    Latest vs previous week: <b style={{ color: diff >= 0 ? C_BRAND : C_DANGER }}>{diff >= 0 ? "+" : ""}{diff.toFixed(1)}</b> avg present
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Absence heatmap */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)", marginBottom: 12 }}>Absence Intensity — working days only</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {entries.map(([date, d]) => {
                const rate = totalEmp ? cnt(d.absent) / totalEmp : 0;
                const opacity = Math.min(0.12 + rate * 2, 1);
                const label = `${date}: ${cnt(d.absent)} absent (${Math.round(rate * 100)}%)`;
                return (
                  <div key={date} title={label} style={{ width: 26, height: 26, borderRadius: 4, background: C_DANGER, opacity, display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}>
                    <span style={{ fontSize: 8, color: "#fff", fontWeight: 700, opacity: rate > 0.1 ? 1 : 0 }}>{date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11, color: "var(--slate-400)" }}>
              <span>Low absence</span>
              {[0.08, 0.2, 0.4, 0.65, 1].map((o, i) => <div key={i} style={{ width: 16, height: 9, borderRadius: 3, background: C_DANGER, opacity: o }} />)}
              <span>High absence</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ EMPLOYEES ══════════════════════════════════ */}
      {activeTab === "employees" && (
        <div>
          {!hasEmpData ? (
            <div className="card" style={{ textAlign: "center", padding: 40 }}>
              <TbUsers size={32} style={{ color: "var(--slate-200)", marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: "var(--slate-500)", marginBottom: 6 }}>Employee-level breakdown requires name data from the backend.</div>
              <div style={{ fontSize: 12, color: "var(--slate-400)" }}>Check the Attendance Logs tab to view individual records.</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="filter-bar" style={{ margin: "0 0 0", borderRadius: "14px 14px 0 0", borderBottom: "1px solid var(--slate-200)", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                  <TbSearch style={{ position: "absolute", left: 12, top: 13, color: "var(--slate-400)" }} size={11} />
                  <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search employee…"
                    className="modern-input" style={{ paddingLeft: 32, margin: 0, fontSize: 13 }} />
                </div>
                <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 13, height: 42 }}>
                  <option value="all">All Employees</option>
                  <option value="good">Good Standing</option>
                  <option value="warning">At Risk</option>
                  <option value="critical">Critical</option>
                  <option value="perfect">Perfect Attendance</option>
                </select>
                <select value={empSort} onChange={e => setEmpSort(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 13, height: 42 }}>
                  <option value="name">Sort: Name A–Z</option>
                  <option value="rate">Sort: Rate ↓</option>
                  <option value="present">Sort: Present ↓</option>
                  <option value="absent">Sort: Absent ↓</option>
                </select>
                <span style={{ fontSize: 12, color: "var(--slate-400)", whiteSpace: "nowrap" }}>{filteredEmp.length} employees</span>
              </div>
              <div className="table-scroll-body" style={{ maxHeight: 520 }}>
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th className="sticky-th">Employee Code</th><th className="sticky-th">Employee</th>
                      <th className="sticky-th" style={{ color: C_BRAND }}>Present</th>
                      <th className="sticky-th" style={{ color: C_DANGER }}>Absent</th>
                      <th className="sticky-th" style={{ color: C_WARN }}>Leave</th>
                      <th className="sticky-th" style={{ color: C_SLATE }}>NCI</th>
                      <th className="sticky-th">Attendance Rate</th>
                      <th className="sticky-th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmp.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--slate-400)" }}>No employees match this filter.</td></tr>
                    ) : filteredEmp.map((e, i) => {
                      const badge = riskBadge(e);
                      return (
                        <tr
                          key={e.name}
                          onClick={() => setJourneyEmp(findEmpByName(e.name))}
                          style={{ cursor: "pointer" }}
                          title="Click to view employee journey"
                        >
                          <td style={{ color: "var(--slate-400)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{codeMap[e.name] || "—"}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#334155,#1e293b)", color: "#fff", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {e.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, color: "var(--slate-700)" }}>{e.name}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, color: C_BRAND, fontVariantNumeric: "tabular-nums" }}>{e.present}</td>
                          <td style={{ fontWeight: 700, color: e.absent > 0 ? C_DANGER : "var(--slate-300)", fontVariantNumeric: "tabular-nums" }}>{e.absent}</td>
                          <td style={{ fontWeight: 700, color: e.leave > 0 ? C_WARN : "var(--slate-300)", fontVariantNumeric: "tabular-nums" }}>{e.leave}</td>
                          <td style={{ fontWeight: 700, color: e.nci > 0 ? C_SLATE : "var(--slate-300)", fontVariantNumeric: "tabular-nums" }}>{e.nci}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 52, height: 5, borderRadius: 3, background: "var(--slate-100)", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${e.rate}%`, background: e.rate >= 80 ? C_BRAND : e.rate >= 65 ? C_WARN : C_DANGER, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: e.rate >= 80 ? C_BRAND : e.rate >= 65 ? C_WARN : C_DANGER, fontVariantNumeric: "tabular-nums", minWidth: 32 }}>{e.rate}%</span>
                            </div>
                          </td>
                          <td>
                            {badge.cls ? (
                              <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                            ) : (
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--slate-500)" }}>{badge.label}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════ HR REPORTS ══════════════════════════════════ */}
      {activeTab === "hr-reports" && (
        <div>
          {/* Spreadsheet-style reports — company-wide, real generated PDF/CSV
              files matching the exact layout of the HR team's existing
              reference spreadsheets, not filtered by the six reports below. */}
          <div className="card" style={{ marginBottom: 16, padding: 18 }}>
            <h4 style={{ margin: "0 0 4px", color: "#0f172a" }}>Spreadsheet-style Reports</h4>
            <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#64748b" }}>
              Real downloadable PDF or Excel files matching the team's existing attendance spreadsheets.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13, width: 110, flexShrink: 0 }}>Monthly Report</span>
                <select className="modern-input" style={{ margin: 0, width: "auto" }} value={pdfReportMonth} onChange={e => setPdfReportMonth(+e.target.value)}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input className="modern-input" type="number" style={{ margin: 0, width: 90 }} value={pdfReportYear} onChange={e => setPdfReportYear(+e.target.value)} />
                <button className="btn" onClick={() => downloadReport("monthly", "pdf")} disabled={pdfDownloading === "monthly-pdf"}>
                  {pdfDownloading === "monthly-pdf" ? "Generating…" : "PDF"}
                </button>
                <button className="btn" onClick={() => downloadReport("monthly", "xlsx")} disabled={pdfDownloading === "monthly-xlsx"}>
                  {pdfDownloading === "monthly-xlsx" ? "Generating…" : "Excel"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13, width: 110, flexShrink: 0 }}>Master Tracker</span>
                <input className="modern-input" type="number" style={{ margin: 0, width: 90 }} value={trackerYear} onChange={e => setTrackerYear(+e.target.value)} />
                <button className="btn" onClick={() => downloadReport("tracker", "pdf")} disabled={pdfDownloading === "tracker-pdf"}>
                  {pdfDownloading === "tracker-pdf" ? "Generating…" : "PDF"}
                </button>
                <button className="btn" onClick={() => downloadReport("tracker", "xlsx")} disabled={pdfDownloading === "tracker-xlsx"}>
                  {pdfDownloading === "tracker-xlsx" ? "Generating…" : "Excel"}
                </button>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>· includes Master Sheet, Dep wise, Leave Monitoring &amp; Late Coming</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Filter bar — mirrors EmployeeList.jsx's .filter-select styling */}
            <div className="filter-bar" style={{ margin: 0, borderRadius: "14px 14px 0 0", borderBottom: "1px solid var(--slate-200)", gap: 10, flexWrap: "wrap" }}>
              <select value={hrDept} onChange={e => setHrDept(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 12.5, height: 38 }}>
                <option value="All">All Departments</option>
                {hrDeptOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={hrDesignation} onChange={e => setHrDesignation(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 12.5, height: 38 }}>
                <option value="All">All Designations</option>
                {hrDesignationOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={hrManager} onChange={e => setHrManager(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 12.5, height: 38 }}>
                <option value="All">All Reporting Managers</option>
                {hrManagerOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={hrEmpType} onChange={e => setHrEmpType(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 12.5, height: 38 }}>
                <option value="All">All Employee Types</option>
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
              <select value={hrLocation} onChange={e => setHrLocation(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 12.5, height: 38 }}>
                <option value="All">All Locations</option>
                {hrLocationOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={hrStatus} onChange={e => setHrStatus(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 12.5, height: 38 }}>
                <option value="All">All Statuses</option>
                {/* "resigned"/Off-boarded is deliberately excluded — offboarded staff are
                    filtered out of every HR report entirely (see activeEmployees above),
                    so that option would only ever show zero rows. */}
                {Object.entries(HR_STATUS_LABELS).filter(([k]) => k !== "resigned").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>

            {/* Report type selector + export */}
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--slate-200)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <select value={hrReportType} onChange={e => setHrReportType(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 13, fontWeight: 600, height: 38 }}>
                {HR_REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--slate-400)" }}>{hrActiveRows.length} rows · {formatMonthsLabel(months)}</span>
                <button onClick={refreshHrReports} className="btn ghost" style={{ padding: "7px 12px", fontSize: 12 }} title="Re-pull the latest roster and attendance data for this report">
                  <TbTable /> Refresh
                </button>
                <button onClick={() => exportHrReport("csv", hrActiveLabel, hrActiveColumns, hrActiveRows, formatMonthsLabel(months), `${hrReportType}_${months.join("_")}`)} className="btn ghost" style={{ padding: "7px 12px", fontSize: 12 }}>
                  <TbFileTypeCsv /> CSV
                </button>
                <button onClick={() => exportHrReport("pdf", hrActiveLabel, hrActiveColumns, hrActiveRows, formatMonthsLabel(months), `${hrReportType}_${months.join("_")}`)} className="btn" style={{ padding: "7px 12px", fontSize: 12 }}>
                  <TbFileTypePdf /> PDF
                </button>
              </div>
            </div>

            {/* Report table — offboarded employees excluded, header sticky, rows scroll, alphabetical by default */}
            <div className="table-scroll-body" style={{ maxHeight: 520 }}>
              <table className="styled-table">
                <thead>
                  <tr>{hrActiveColumns.map(c => <th key={c.key} className="sticky-th">{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {hrReportLoading ? (
                    <tr><td colSpan={hrActiveColumns.length} style={{ textAlign: "center", padding: 32, color: "var(--slate-400)" }}>Loading…</td></tr>
                  ) : hrActiveRows.length === 0 ? (
                    <tr><td colSpan={hrActiveColumns.length} style={{ textAlign: "center", padding: 32, color: "var(--slate-400)" }}>No rows for this report / filter / period.</td></tr>
                  ) : hrActiveRows.map((r, i) => (
                    <tr key={i}>
                      {hrActiveColumns.map(c => <td key={c.key}>{r[c.key] ?? "—"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ INSIGHTS ═══════════════════════════════════ */}
      {activeTab === "insights" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Score + summary */}
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <GaugeChart score={score} size={150} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--slate-400)", marginBottom: 6 }}>Attendance Score — {formatMonthsLabel(months)}</div>
              <h3 style={{ color: "var(--red)", margin: "0 0 8px", fontSize: 18 }}>
                {score >= 88 ? "Excellent — Keep it up" : score >= 72 ? "Good — Room to improve" : "Needs attention"}
              </h3>
              <p style={{ color: "var(--slate-500)", margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                Based on <b>{workDays ?? 0}</b> working days (Mon–Fri + last Saturday), <b>{totalEmp}</b> employees, and <b>{(workDays ?? 0) * totalEmp}</b> total attendance data-points. Insights are generated from trend analysis and statistical pattern detection.
              </p>
              <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
                {[["Attendance Rate", `${presentRate}%`, totalRate >= 80 ? C_BRAND : C_DANGER], ["Trend", trendDir === "up" ? "↑ Improving" : trendDir === "down" ? "↓ Declining" : "→ Stable", trendDir === "up" ? C_BRAND : trendDir === "down" ? C_DANGER : C_SLATE], ["Employees", totalEmp, C_INFO], ["Working Days", workDays ?? 0, C_SLATE]].map(([l, v, c]) => (
                  <div key={l}>
                    <div style={{ fontSize: 10.5, color: "var(--slate-400)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insight cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
            {insights.map((ins, i) => {
              const cfg = SEV_CONFIG[ins.sev] || SEV_CONFIG.info;
              return (
                <div key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.accent}`, borderRadius: "var(--radius)", padding: "15px 17px", display: "flex", gap: 11 }}>
                  <div style={{ color: cfg.accent, fontSize: 15, flexShrink: 0, marginTop: 1 }}>
                    <cfg.Icon />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--slate-800)", marginBottom: 5 }}>{ins.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--slate-600)", lineHeight: 1.65 }}>{ins.body}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Benchmark comparison */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)", marginBottom: 14 }}>Benchmark Comparison</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[{ label: "Excellent", benchmark: 90 }, { label: "Industry Average", benchmark: 80 }, { label: "Acceptable Minimum", benchmark: 70 }].map(b => (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: "var(--slate-600)", fontWeight: 600 }}>{b.label}</span>
                    <div style={{ display: "flex", gap: 16, color: "var(--slate-500)", fontSize: 12 }}>
                      <span>Target: <b style={{ color: "var(--slate-700)" }}>{b.benchmark}%</b></span>
                      <span>Yours: <b style={{ color: totalRate >= b.benchmark ? C_BRAND : C_DANGER }}>{presentRate}%</b></span>
                    </div>
                  </div>
                  <div style={{ position: "relative", height: 7, background: "var(--slate-100)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${b.benchmark}%`, background: "var(--slate-200)", borderRadius: 4 }} />
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(totalRate, 100)}%`, background: totalRate >= b.benchmark ? C_BRAND : C_DANGER, borderRadius: 4, transition: "width 0.5s" }} />
                    <div style={{ position: "absolute", left: `${b.benchmark}%`, top: 0, width: 1.5, height: "100%", background: "var(--slate-400)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
