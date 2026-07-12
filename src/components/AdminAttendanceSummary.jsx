import React, { useEffect, useState, useMemo } from "react";
import {
  FaFileCsv, FaFilePdf, FaBrain, FaChartLine, FaChartBar, FaChartPie,
  FaLightbulb, FaExclamationTriangle, FaCheckCircle, FaFlag, FaUsers,
  FaCalendarAlt, FaArrowUp, FaArrowDown, FaTrophy, FaSearch, FaTable,
  FaStar, FaClock, FaShieldAlt, FaFire,
} from "react-icons/fa";
import { SkeletonStats, SkeletonTable } from "./Skeleton";

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

const nameList = (d, key, idMap) => { const n = getNames(d, key, idMap); return n.length ? n.join(" | ") : "—"; };

function visibleDayEntries(summary) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return Object.entries(summary?.days || {})
    .filter(([date]) => date <= todayStr)
    .sort(([a], [b]) => a.localeCompare(b));
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
      if (names.length) { hasEmpData = true; names.forEach(name => { if (!empStats[name]) empStats[name] = { name, present: 0, absent: 0, leave: 0, nci: 0 }; empStats[name][stat]++; }); }
    });
  });

  const workDays = entries.length;
  const avgPresent = workDays ? totals.present / workDays : 0;
  const totalRate = totalEmp && workDays ? (totals.present / (totalEmp * workDays)) * 100 : 0;

  const dowBreakdown = Object.entries(dowBuckets)
    .filter(([, a]) => a.length)
    .map(([dow, a]) => ({ label: DOW[+dow], value: a.reduce((s, v) => s + v, 0) / a.length }))
    .sort((a, b) => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(a.label) - ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(b.label));

  const half = Math.floor(workDays / 2);
  const f1 = half > 0 ? entries.slice(0, half).reduce((s, [, d]) => s + cnt(d.present), 0) / half : 0;
  const f2 = workDays - half > 0 ? entries.slice(half).reduce((s, [, d]) => s + cnt(d.present), 0) / (workDays - half) : 0;
  const trendDir = f2 > f1 + 0.5 ? "up" : f2 < f1 - 0.5 ? "down" : "flat";
  const trendPct = f1 > 0 ? Math.abs(((f2 - f1) / f1) * 100) : 0;

  const sortedP = [...entries].sort(([, a], [, b]) => cnt(b.present) - cnt(a.present));
  const bestDays = sortedP.slice(0, 3);
  const worstDays = sortedP.filter(([, d]) => cnt(d.present) + cnt(d.absent) + cnt(d.leave) > 0).slice(-3).reverse();

  const wkBuckets = {};
  entries.forEach(([date, d]) => {
    const wk = `W${Math.ceil(new Date(date + "T00:00:00").getDate() / 7)}`;
    if (!wkBuckets[wk]) wkBuckets[wk] = { label: wk, present: 0, days: 0 };
    wkBuckets[wk].present += cnt(d.present); wkBuckets[wk].days++;
  });
  const weeklyAvg = Object.values(wkBuckets).map(w => ({ label: w.label, value: w.days ? w.present / w.days : 0 }));

  const empList = Object.values(empStats).map(e => ({
    ...e,
    rate: workDays ? Math.round((e.present / workDays) * 100) : 0,
    risk: e.absent >= 5 ? "critical" : e.absent >= 3 ? "warning" : e.rate < 70 ? "low" : "good",
  })).sort((a, b) => b.rate - a.rate);

  return { totals, avgPresent, totalRate, trend, dowBreakdown, weeklyAvg, trendDir, trendPct, bestDays, worstDays, empList, hasEmpData, spikes, workDays };
}

// ─── AI INSIGHTS ─────────────────────────────────────────────────────────────
function generateInsights(m, totalEmp) {
  const { totalRate, trendDir, trendPct, empList, spikes, dowBreakdown, hasEmpData, totals } = m;
  const insights = [], score = Math.min(100, Math.round(totalRate));

  if (totalRate >= 90) insights.push({ sev: "success", title: "Outstanding Attendance", body: `Your team's attendance rate is ${totalRate.toFixed(1)}% — top-tier performance. Strong culture and engagement are evident. Maintain it with consistent recognition.` });
  else if (totalRate >= 80) insights.push({ sev: "info", title: "Above-Average Attendance", body: `At ${totalRate.toFixed(1)}%, attendance is above the 80% industry benchmark. Targeted follow-ups with the bottom 20% absent employees could push this to excellent.` });
  else if (totalRate >= 65) insights.push({ sev: "warning", title: "Below Benchmark", body: `Attendance sits at ${totalRate.toFixed(1)}%, below the 80% benchmark. Recommend flexible scheduling, team wellbeing check-ins, and workload audits.` });
  else insights.push({ sev: "critical", title: "Critical Attendance Alert", body: `At ${totalRate.toFixed(1)}%, attendance requires urgent HR intervention. Escalate to department heads and initiate structured attendance improvement plans immediately.` });

  if (trendDir === "up" && trendPct > 2) insights.push({ sev: "success", title: "Positive Trend", body: `Month-over-month momentum is up ${trendPct.toFixed(1)}% from the first half to the second. The team is recovering or ramping up. Keep the energy going.` });
  else if (trendDir === "down" && trendPct > 2) insights.push({ sev: "warning", title: "Declining Trend Detected", body: `Attendance fell ${trendPct.toFixed(1)}% from month start to current. Investigate for burnout signals, unresolved conflicts, or seasonal leave stacking.` });

  if (dowBreakdown.length >= 3) {
    const s = [...dowBreakdown].sort((a, b) => b.value - a.value);
    const peak = s[0], low = s[s.length - 1];
    if (peak && low && peak.label !== low.label)
      insights.push({ sev: "info", title: "Day-of-Week Intelligence", body: `${peak.label}s average ${peak.value.toFixed(0)} present (peak). ${low.label}s are the weakest at ${low.value.toFixed(0)} avg. Front-load key decisions and standups on ${peak.label}s for maximum team presence.` });
  }

  if (spikes.length > 0) {
    const worst = spikes.reduce((a, b) => b.rate > a.rate ? b : a, spikes[0]);
    insights.push({ sev: "warning", title: `${spikes.length} Absence Spike${spikes.length > 1 ? "s" : ""} Detected`, body: `On ${spikes.length} day${spikes.length > 1 ? "s" : ""}, absences exceeded 20% of the workforce. Peak: ${worst.date} with ${worst.rate}% absent. Review for external events, schedule conflicts, or systemic morale dips on those dates.` });
  }

  if (hasEmpData && empList.length > 0) {
    const risky = empList.filter(e => e.risk === "critical");
    const perfect = empList.filter(e => e.absent === 0 && e.nci === 0 && e.present > 0);
    if (risky.length) insights.push({ sev: "critical", title: `${risky.length} High-Risk Employee${risky.length > 1 ? "s" : ""}`, body: `${risky.slice(0, 3).map(e => e.name).join(", ")}${risky.length > 3 ? ` +${risky.length - 3} more` : ""} — absent 5+ days. Trigger an HR welfare check or a structured return-to-work conversation this week.` });
    if (perfect.length) insights.push({ sev: "success", title: `${perfect.length} Perfect Attendance`, body: `${perfect.length} employee${perfect.length > 1 ? "s" : ""} had zero absences this month. Public recognition in the next all-hands reinforces this behavior across the team.` });
  }

  const leaveRate = totalEmp > 0 && m.workDays > 0 ? (totals.leave / (totalEmp * m.workDays)) * 100 : 0;
  if (leaveRate > 10) insights.push({ sev: "info", title: "Elevated Leave Usage", body: `${leaveRate.toFixed(1)}% of workforce-days this month were on approved leave. Cross-training and leave coverage plans should be reviewed for peak leave windows.` });

  insights.push({ sev: "tip", title: "Recommendation", body: score >= 90 ? "Sustain excellence: quarterly recognition programs and flexible wellbeing days keep high-performers engaged without sacrificing attendance." : score >= 80 ? "A 5-minute pulse survey asking about commute, workload, and meeting fatigue often reveals exactly why the 20% absence gap exists." : "Introduce a phased attendance improvement program: clear communication, 1:1 check-ins with managers, and a visible attendance dashboard for team leaders." });

  return { insights, score };
}

// ─── SVG CHARTS ──────────────────────────────────────────────────────────────
const BRAND = "#059669";
const DANGER = "#ef4444";
const WARN = "#f59e0b";
const INFO = "#3b82f6";
const SLATE = "#64748b";

function Sparkline({ data = [], color = BRAND, h = 32, w = 80 }) {
  if (data.length < 2) return <span style={{ display: "block", width: w, height: h }} />;
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / rng) * (h - 4)}`).join(" ");
  const lx = ((data.length - 1) / (data.length - 1)) * w;
  const ly = h - 2 - ((data[data.length - 1] - min) / rng) * (h - 4);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h, display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
    </svg>
  );
}

function LineChart({ series = [], h = 200 }) {
  const PAD = { t: 16, r: 16, b: 32, l: 38 };
  const W = 720, H = h;
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;
  const n = series[0]?.data?.length || 0;
  if (n < 2) return null;
  const allY = series.flatMap(s => s.data.map(d => d.y));
  const minY = Math.max(0, Math.floor(Math.min(...allY) * 0.88));
  const maxY = Math.ceil(Math.max(...allY) * 1.05) || 1;
  const rng = maxY - minY || 1;
  const x = i => PAD.l + (i / (n - 1)) * IW;
  const y = v => PAD.t + IH - ((v - minY) / rng) * IH;
  const ticks = [0, 0.33, 0.66, 1].map(t => Math.round(minY + t * rng));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: h }}>
      <defs>
        {series.map((s, si) => (
          <linearGradient key={si} id={`lg${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={y(t)} x2={W - PAD.r} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={i > 0 ? "4 3" : ""} />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize={9} fill="#94a3b8" fontVariantNumeric="tabular-nums">{t}</text>
        </g>
      ))}
      {series[0].data.map((d, i) => (i % 5 === 0 || i === n - 1) && (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.label}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.data.map((d, i) => `${x(i)},${y(d.y)}`).join(" ");
        const area = `${x(0)},${y(minY)} ${pts} ${x(n - 1)},${y(minY)}`;
        return (
          <g key={si}>
            <polygon points={area} fill={`url(#lg${si})`} />
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={si === 0 ? 2.5 : 1.5}
              strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={si > 0 ? "5 3" : undefined} />
            {si === 0 && s.data.map((d, i) => (i === 0 || i === n - 1) && (
              <circle key={i} cx={x(i)} cy={y(d.y)} r={3.5} fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function BarChart({ data = [], h = 160 }) {
  const W = 540, H = h;
  const PAD = { t: 14, r: 12, b: 30, l: 36 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(36, (IW / data.length) * 0.55);
  const gap = IW / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: h }}>
      {[0, 0.5, 1].map((t, i) => {
        const v = maxV * t, yv = PAD.t + IH - t * IH;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={yv} x2={W - PAD.r} y2={yv} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={t > 0 ? "4 3" : ""} />
            <text x={PAD.l - 6} y={yv + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(v)}</text>
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
            <rect x={bx} y={by} width={barW} height={bh} rx={4} fill={d.color || BRAND} opacity={isTop ? 1 : 0.72} />
            <text x={bx + barW / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="#64748b">{d.label}</text>
            {d.value > 0 && <text x={bx + barW / 2} y={by - 4} textAnchor="middle" fontSize={9} fontWeight="700" fill="#334155">{d.value.toFixed(0)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ segs = [], size = 150 }) {
  const R = 52, CX = size / 2, CY = size / 2;
  const circ = 2 * Math.PI * R;
  const total = segs.reduce((s, d) => s + d.value, 0) || 1;
  let cum = 0;
  const mainPct = Math.round((segs[0]?.value / total) * 100);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
      {segs.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const offset = circ / 4 - cum;
        cum += dash;
        return <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={seg.color} strokeWidth={22}
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={offset} />;
      })}
      <circle cx={CX} cy={CY} r={37} fill="white" />
      <text x={CX} y={CY - 3} textAnchor="middle" fontSize={16} fontWeight="800" fill="#0f172a" fontVariantNumeric="tabular-nums">{mainPct}%</text>
      <text x={CX} y={CY + 14} textAnchor="middle" fontSize={9} fill="#64748b">{segs[0]?.label || "Present"}</text>
    </svg>
  );
}

function GaugeChart({ score = 0, size = 160 }) {
  const R = 56, CX = size / 2, CY = size * 0.68;
  const circ = Math.PI * R;
  const color = score >= 88 ? BRAND : score >= 72 ? WARN : DANGER;
  const filled = (score / 100) * circ;
  return (
    <svg viewBox={`0 0 ${size} ${size * 0.62}`} style={{ width: size, height: size * 0.62 }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={16}
        strokeDasharray={`${circ} ${circ}`}
        style={{ transformOrigin: `${CX}px ${CY}px`, transform: "rotate(180deg)" }} />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        style={{ transformOrigin: `${CX}px ${CY}px`, transform: "rotate(180deg)" }} />
      <text x={CX} y={CY - 8} textAnchor="middle" fontSize={22} fontWeight="900" fill={color} fontVariantNumeric="tabular-nums">{score}</text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight="600" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Health Score</text>
      <text x={CX} y={CY + 22} textAnchor="middle" fontSize={8} fill="#cbd5e1">out of 100</text>
    </svg>
  );
}

// ─── CSV / PDF EXPORT ─────────────────────────────────────────────────────────
function convertToCSV(summary, idMap) {
  let csv = 'Date,Present,Present Names,Absent,Absent Names,On Leave,Leave Names,Not Checked-in,NCI Names\n';
  visibleDayEntries(summary).forEach(([date, d]) => {
    const q = s => `"${String(s).replace(/"/g, '""')}"`;
    csv += [date, cnt(d.present), q(nameList(d,"present",idMap)), cnt(d.absent), q(nameList(d,"absent",idMap)), cnt(d.leave), q(nameList(d,"leave",idMap)), cnt(d.not_checked_in), q(nameList(d,"not_checked_in",idMap))].join(",") + "\n";
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
  const overviewRows = days.map(([date, d]) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${date}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#059669;font-weight:700;font-size:12px">${cnt(d.present)}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#ef4444;font-weight:700;font-size:12px">${cnt(d.absent)}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#f59e0b;font-weight:700;font-size:12px">${cnt(d.leave)}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#64748b;font-weight:700;font-size:12px">${cnt(d.not_checked_in)}</td></tr>`).join("");
  const catBlock = (d, key, title, color, bg) => { const names = getNames(d, key, idMap); const list = names.length ? `<ol style="margin:0;padding-left:18px;font-size:11.5px;color:#334155;line-height:1.9">${names.map(n => `<li>${n}</li>`).join("")}</ol>` : `<div style="font-size:11px;color:#94a3b8;font-style:italic">No records.</div>`; return `<div style="flex:1;min-width:180px;border:1px solid #f1f5f9;border-radius:8px;overflow:hidden"><div style="background:${bg};padding:8px 12px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:${color}">${title}</span><span style="font-size:14px;font-weight:800;color:${color}">${cnt(d[key])}</span></div><div style="padding:10px 12px">${list}</div></div>`; };
  const detailPages = days.map(([date, d]) => `<div style="page-break-inside:avoid;margin-bottom:24px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:5px;height:20px;background:#059669;border-radius:3px"></div><h3 style="margin:0;font-size:14px;color:#0f172a">${fmt(date)}</h3></div><div style="display:flex;flex-wrap:wrap;gap:10px">${catBlock(d,"present","Present","#059669","#f0fdf4")}${catBlock(d,"leave","On Leave","#d97706","#fffbeb")}${catBlock(d,"absent","Absent","#dc2626","#fef2f2")}${catBlock(d,"not_checked_in","Not Checked-in","#64748b","#f8fafc")}</div></div>`).join("");
  return `<html><head><title>GDMR Connect — Attendance Report ${month}</title><style>@media print{@page{margin:14mm}}body{font-family:system-ui,Arial,sans-serif;color:#0f172a;margin:0}</style></head><body><div style="padding:40px 48px"><div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #059669;padding-bottom:16px;margin-bottom:22px"><div><h1 style="color:#059669;margin:0;font-size:22px;font-weight:900">GDMR Connect</h1><div style="font-size:15px;font-weight:700;margin-top:3px">Monthly Attendance Intelligence Report</div></div><div style="text-align:right;font-size:11px;color:#64748b"><div><b>Period:</b> ${month}</div><div><b>Attendance Rate:</b> ${rate}</div><div><b>Total Employees:</b> ${totalEmp}</div><div><b>Generated:</b> ${today}</div></div></div><div style="display:flex;gap:12px;margin-bottom:24px">${[["Present Days", totals.p, "#059669", "#f0fdf4"],["On Leave", totals.l, "#d97706", "#fffbeb"],["Absent Days", totals.ab, "#dc2626", "#fef2f2"],["Not Checked-in", totals.n, "#64748b", "#f8fafc"]].map(([l, v, c, b]) => `<div style="flex:1;background:${b};border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:900;color:${c}">${v}</div><div style="font-size:10px;color:#64748b;margin-top:3px;text-transform:uppercase;letter-spacing:.05em">${l}</div></div>`).join("")}</div><table style="width:100%;border-collapse:collapse;margin-bottom:8px"><thead><tr>${["Date","Present","Absent","On Leave","NCI"].map(h => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #059669;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#475569">${h}</th>`).join("")}</tr></thead><tbody>${overviewRows}</tbody></table></div><div style="padding:40px 48px;page-break-before:always"><h2 style="color:#059669;margin:0 0 4px;font-size:16px">Detailed Daily Breakdown</h2><div style="color:#64748b;font-size:11px;margin-bottom:20px">Every employee grouped by their status, day by day.</div>${detailPages}</div></body></html>`;
}

// ─── SEVERITY UI MAP ──────────────────────────────────────────────────────────
const SEV = {
  success:  { bg: "#f0fdf4", border: "#86efac", dot: BRAND,   icon: <FaCheckCircle color={BRAND} /> },
  info:     { bg: "#eff6ff", border: "#93c5fd", dot: INFO,    icon: <FaStar color={INFO} /> },
  warning:  { bg: "#fffbeb", border: "#fde68a", dot: WARN,    icon: <FaExclamationTriangle color={WARN} /> },
  critical: { bg: "#fef2f2", border: "#fca5a5", dot: DANGER,  icon: <FaFlag color={DANGER} /> },
  tip:      { bg: "#faf5ff", border: "#d8b4fe", dot: "#7c3aed", icon: <FaLightbulb color="#7c3aed" /> },
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminAttendanceSummary({ token, api }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [idMap, setIdMap] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [empSearch, setEmpSearch] = useState("");
  const [empSort, setEmpSort] = useState("rate");
  const [empFilter, setEmpFilter] = useState("all");

  async function load() {
    setLoading(true);
    try { const data = await api.getAttendanceSummary(month, token); setSummary(data); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [month]);
  useEffect(() => {
    api.listEmployees(token)
      .then(list => { const m = {}; (Array.isArray(list) ? list : list?.employees || []).forEach(e => { if (e?._id) m[String(e._id)] = e.name; }); setIdMap(m); })
      .catch(() => {});
  }, [token]);

  const entries = useMemo(() => summary ? visibleDayEntries(summary) : [], [summary]);
  const totalEmp = summary?.total_employees ?? 0;
  const metrics = useMemo(() => entries.length ? computeMetrics(entries, idMap, totalEmp) : null, [entries, idMap, totalEmp]);
  const { insights, score } = useMemo(() => metrics ? generateInsights(metrics, totalEmp) : { insights: [], score: 0 }, [metrics, totalEmp]);

  function handleExport(fmt) {
    if (!summary) return;
    if (fmt === "csv") {
      const blob = new Blob([convertToCSV(summary, idMap)], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Attendance_${month}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const w = window.open("", "", "height=700,width=900");
      if (!w) return;
      w.document.write(buildPDFHtml(summary, month, idMap));
      w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
    }
  }

  if (loading || !summary) return (
    <div style={{ marginTop: 16 }}><SkeletonStats count={4} /><div style={{ marginTop: 14 }}><SkeletonTable rows={6} cols={5} /></div></div>
  );

  const { totals, avgPresent, totalRate, trend, dowBreakdown, weeklyAvg, trendDir, trendPct, bestDays, worstDays, empList, hasEmpData } = metrics || {};

  const donutSegs = [
    { label: "Present",      value: totals?.present || 0, color: BRAND   },
    { label: "On Leave",     value: totals?.leave   || 0, color: WARN    },
    { label: "Absent",       value: totals?.absent  || 0, color: DANGER  },
    { label: "Not Checked",  value: totals?.nci     || 0, color: SLATE   },
  ];

  const sparkPresent  = trend?.map(d => d.y) || [];
  const sparkAbsent   = trend?.map(d => d.absent) || [];
  const presentRate   = totalRate?.toFixed(1);

  const filteredEmp = useMemo(() => {
    if (!empList) return [];
    let list = [...empList];
    if (empFilter !== "all") list = list.filter(e => e.risk === empFilter || (empFilter === "good" && e.risk === "good") || (empFilter === "perfect" && e.absent === 0 && e.nci === 0));
    if (empSearch) list = list.filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase()));
    if (empSort === "rate") list.sort((a, b) => b.rate - a.rate);
    else if (empSort === "absent") list.sort((a, b) => b.absent - a.absent);
    else if (empSort === "present") list.sort((a, b) => b.present - a.present);
    else if (empSort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [empList, empFilter, empSearch, empSort]);

  const tabs = [
    { id: "overview",  label: "Overview",    icon: <FaChartPie size={11} /> },
    { id: "analytics", label: "Analytics",   icon: <FaChartLine size={11} /> },
    { id: "employees", label: "Employees",   icon: <FaUsers size={11} /> },
    { id: "insights",  label: "AI Insights", icon: <FaBrain size={11} /> },
  ];

  const kpiCards = [
    { label: "Attendance Rate", value: `${presentRate}%`, sub: `${totalEmp} total employees`, spark: sparkPresent, color: totalRate >= 80 ? BRAND : totalRate >= 65 ? WARN : DANGER, trend: trendDir },
    { label: "Avg Present / Day", value: avgPresent?.toFixed(1), sub: `over ${entries.length} working days`, spark: sparkPresent, color: BRAND },
    { label: "Total Absences", value: totals?.absent, sub: `${entries.length > 0 ? (totals.absent / entries.length).toFixed(1) : 0} avg/day`, spark: sparkAbsent, color: DANGER },
    { label: "Leave Days Taken", value: totals?.leave, sub: `across all employees`, spark: trend?.map(d => d.leave) || [], color: WARN },
  ];

  const riskBadge = (e) => {
    if (e.absent === 0 && e.nci === 0) return { label: "Perfect", bg: "#f0fdf4", color: BRAND };
    if (e.risk === "critical") return { label: "Critical", bg: "#fef2f2", color: DANGER };
    if (e.risk === "warning")  return { label: "At Risk",  bg: "#fffbeb", color: WARN };
    return { label: "Good", bg: "#f8fafc", color: SLATE };
  };

  return (
    <div>
      {/* ─ Header ─ */}
      <div className="card" style={{ marginBottom: 0, borderBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, background: "linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)", color: "#fff", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaChartBar size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: "#fff", fontSize: 17, fontWeight: 800 }}>Attendance Intelligence</h3>
              <div style={{ fontSize: 12, color: "#a7f3d0", marginTop: 2 }}>AI-powered insights · Employee analytics · Exportable reports</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, color: "#fff", padding: "6px 12px", fontSize: 13, cursor: "pointer", outline: "none" }} />
            <button onClick={() => handleExport("csv")} className="btn ghost"
              style={{ padding: "7px 12px", fontSize: 12, color: "#fff", borderColor: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 5 }}>
              <FaFileCsv /> CSV
            </button>
            <button onClick={() => handleExport("pdf")} className="btn"
              style={{ padding: "7px 12px", fontSize: 12, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 5 }}>
              <FaFilePdf /> PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* ─ KPI Strip ─ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 0, borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
        {kpiCards.map((k, i) => (
          <div key={i} style={{ padding: "16px 20px", borderRight: i < kpiCards.length - 1 ? "1px solid #e2e8f0" : "none", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {k.value ?? "—"}
                {k.trend && k.trend !== "flat" && (
                  <span style={{ fontSize: 12, marginLeft: 6, color: k.trend === "up" ? BRAND : DANGER }}>
                    {k.trend === "up" ? <FaArrowUp size={11} /> : <FaArrowDown size={11} />} {trendPct?.toFixed(0)}%
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{k.sub}</div>
            </div>
            <Sparkline data={k.spark} color={k.color} />
          </div>
        ))}
      </div>

      {/* ─ Tab Nav ─ */}
      <div style={{ display: "flex", borderBottom: "2px solid #f1f5f9", background: "#fff", paddingLeft: 8, borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} type="button"
            style={{ padding: "12px 18px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === t.id ? `2px solid ${BRAND}` : "2px solid transparent", color: activeTab === t.id ? BRAND : "#64748b", fontWeight: activeTab === t.id ? 700 : 500, fontSize: 12.5, marginBottom: -2, display: "flex", alignItems: "center", gap: 6, transition: "color 0.15s", whiteSpace: "nowrap" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─ OVERVIEW TAB ─ */}
      {activeTab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
            {/* Donut + legend */}
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 24px", minWidth: 200 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "flex-start" }}>Distribution</div>
              <DonutChart segs={donutSegs} size={150} />
              <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%" }}>
                {donutSegs.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      <span style={{ color: "#475569" }}>{s.label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best / Worst + summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Best days */}
                <div className="card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <FaTrophy color="#f59e0b" size={13} />
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Peak Days</span>
                  </div>
                  {bestDays?.map(([date, d], i) => (
                    <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < bestDays.length - 1 ? "1px solid #f8fafc" : "none" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{date}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f0fdf4", padding: "4px 10px", borderRadius: 99 }}>
                        <FaUsers size={9} color={BRAND} />
                        <span style={{ fontWeight: 800, color: BRAND, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{cnt(d.present)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Worst days */}
                <div className="card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <FaExclamationTriangle color={DANGER} size={12} />
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Lowest Days</span>
                  </div>
                  {worstDays?.map(([date, d], i) => (
                    <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < worstDays.length - 1 ? "1px solid #f8fafc" : "none" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{date}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#fef2f2", padding: "4px 10px", borderRadius: 99 }}>
                        <span style={{ fontWeight: 800, color: DANGER, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{cnt(d.absent)}</span>
                        <span style={{ fontSize: 10, color: DANGER }}>absent</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Month totals bar */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 14 }}>Month Summary — {month}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 12 }}>
                  {[["Total Present", totals?.present, BRAND, "#f0fdf4"], ["On Leave", totals?.leave, WARN, "#fffbeb"], ["Absent", totals?.absent, DANGER, "#fef2f2"], ["Not Checked-in", totals?.nci, SLATE, "#f8fafc"]].map(([l, v, c, bg]) => (
                    <div key={l} style={{ background: bg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums" }}>{v ?? 0}</div>
                      <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 3, fontWeight: 600 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Daily table */}
          <div className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
              <FaTable size={12} color="#94a3b8" />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Daily Log — {totalEmp} employees total</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Day</th>
                    <th style={{ color: BRAND }}>Present</th>
                    <th style={{ color: DANGER }}>Absent</th>
                    <th style={{ color: WARN }}>On Leave</th>
                    <th style={{ color: SLATE }}>Not Checked-in</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No attendance data for this month yet.</td></tr>
                  ) : entries.map(([date, d]) => {
                    const p = cnt(d.present), a = cnt(d.absent), l = cnt(d.leave), n = cnt(d.not_checked_in);
                    const rate = totalEmp ? Math.round((p / totalEmp) * 100) : 0;
                    return (
                      <tr key={date}>
                        <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{date}</td>
                        <td style={{ color: "#94a3b8", fontSize: 12 }}>{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}</td>
                        <td><span style={{ fontWeight: 700, color: BRAND, fontVariantNumeric: "tabular-nums" }}>{p}</span></td>
                        <td><span style={{ fontWeight: 700, color: a > 0 ? DANGER : "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{a}</span></td>
                        <td><span style={{ fontWeight: 700, color: l > 0 ? WARN : "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{l}</span></td>
                        <td><span style={{ fontWeight: 700, color: n > 0 ? SLATE : "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{n}</span></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 48, height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${rate}%`, background: rate >= 80 ? BRAND : rate >= 65 ? WARN : DANGER, borderRadius: 3, transition: "width 0.3s" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: rate >= 80 ? BRAND : rate >= 65 ? WARN : DANGER, fontVariantNumeric: "tabular-nums" }}>{rate}%</span>
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

      {/* ─ ANALYTICS TAB ─ */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <FaChartLine size={13} color={BRAND} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>30-Day Attendance Trend</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, color: "#64748b" }}>
                {[["Present", BRAND], ["Absent", DANGER], ["On Leave", WARN]].map(([l, c]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 20, height: 2.5, background: c, borderRadius: 2 }} />
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <LineChart h={200} series={[
              { color: BRAND,   data: trend?.map(d => ({ label: d.label, y: d.y }))      || [] },
              { color: DANGER,  data: trend?.map(d => ({ label: d.label, y: d.absent })) || [] },
              { color: WARN,    data: trend?.map(d => ({ label: d.label, y: d.leave }))  || [] },
            ]} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="card">
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 14 }}>Day-of-Week Avg Attendance</div>
              <BarChart h={160} data={dowBreakdown?.map(d => ({ label: d.label, value: d.value, color: BRAND })) || []} />
              {dowBreakdown?.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
                  <span>Peak: <b style={{ color: BRAND }}>{[...dowBreakdown].sort((a, b) => b.value - a.value)[0]?.label}</b></span>
                  <span>Lowest: <b style={{ color: DANGER }}>{[...dowBreakdown].sort((a, b) => a.value - b.value)[0]?.label}</b></span>
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 14 }}>Weekly Average Attendance</div>
              <BarChart h={160} data={weeklyAvg?.map(w => ({ label: w.label, value: w.value, color: INFO })) || []} />
              {weeklyAvg?.length > 1 && (() => {
                const last = weeklyAvg[weeklyAvg.length - 1]?.value;
                const prev = weeklyAvg[weeklyAvg.length - 2]?.value;
                const diff = last - prev;
                return (
                  <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
                    Latest week vs previous: <b style={{ color: diff >= 0 ? BRAND : DANGER }}>{diff >= 0 ? "+" : ""}{diff.toFixed(1)}</b> avg present
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Absence rate by day mini heatmap */}
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 14 }}>Absence Intensity Heatmap</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {entries.map(([date, d]) => {
                const rate = totalEmp ? (cnt(d.absent) / totalEmp) : 0;
                const opacity = Math.min(0.15 + rate * 2, 1);
                const label = `${date}: ${cnt(d.absent)} absent (${Math.round(rate * 100)}%)`;
                return (
                  <div key={date} title={label} style={{ width: 28, height: 28, borderRadius: 5, background: DANGER, opacity, display: "flex", alignItems: "center", justifyContent: "center", cursor: "help" }}>
                    <span style={{ fontSize: 8, color: "#fff", fontWeight: 700, opacity: rate > 0.1 ? 1 : 0 }}>{date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 11, color: "#94a3b8" }}>
              <span>Low absence</span>
              {[0.08, 0.2, 0.4, 0.65, 1].map((o, i) => <div key={i} style={{ width: 18, height: 10, borderRadius: 3, background: DANGER, opacity: o }} />)}
              <span>High absence</span>
            </div>
          </div>
        </div>
      )}

      {/* ─ EMPLOYEES TAB ─ */}
      {activeTab === "employees" && (
        <div style={{ marginTop: 16 }}>
          {!hasEmpData ? (
            <div className="card" style={{ textAlign: "center", padding: 40 }}>
              <FaUsers size={32} color="#e2e8f0" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8 }}>Employee-level breakdown requires name data from the backend.</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Check the Attendance Logs tab to view individual employee records.</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                  <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={11} />
                  <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search employee…"
                    className="modern-input" style={{ paddingLeft: 30, margin: 0, fontSize: 12.5 }} />
                </div>
                <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 12.5 }}>
                  <option value="all">All Employees</option>
                  <option value="good">Good Standing</option>
                  <option value="warning">At Risk</option>
                  <option value="critical">Critical</option>
                  <option value="perfect">Perfect Attendance</option>
                </select>
                <select value={empSort} onChange={e => setEmpSort(e.target.value)} className="modern-input" style={{ width: "auto", margin: 0, fontSize: 12.5 }}>
                  <option value="rate">Sort: Attendance Rate</option>
                  <option value="present">Sort: Most Present</option>
                  <option value="absent">Sort: Most Absent</option>
                  <option value="name">Sort: Name A–Z</option>
                </select>
                <span style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>{filteredEmp.length} employees</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Employee</th>
                      <th style={{ color: BRAND }}>Present</th>
                      <th style={{ color: DANGER }}>Absent</th>
                      <th style={{ color: WARN }}>Leave</th>
                      <th style={{ color: SLATE }}>NCI</th>
                      <th>Rate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmp.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>No employees match this filter.</td></tr>
                    ) : filteredEmp.map((e, i) => {
                      const badge = riskBadge(e);
                      return (
                        <tr key={e.name}>
                          <td style={{ color: "#94a3b8", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                          <td style={{ fontWeight: 600, color: "#334155" }}>{e.name}</td>
                          <td style={{ fontWeight: 700, color: BRAND, fontVariantNumeric: "tabular-nums" }}>{e.present}</td>
                          <td style={{ fontWeight: 700, color: e.absent > 0 ? DANGER : "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{e.absent}</td>
                          <td style={{ fontWeight: 700, color: e.leave > 0 ? WARN : "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{e.leave}</td>
                          <td style={{ fontWeight: 700, color: e.nci > 0 ? SLATE : "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{e.nci}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 52, height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${e.rate}%`, background: e.rate >= 80 ? BRAND : e.rate >= 65 ? WARN : DANGER, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: e.rate >= 80 ? BRAND : e.rate >= 65 ? WARN : DANGER, fontVariantNumeric: "tabular-nums" }}>{e.rate}%</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: badge.bg, color: badge.color }}>{badge.label}</span>
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

      {/* ─ AI INSIGHTS TAB ─ */}
      {activeTab === "insights" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
          {/* Health score hero */}
          <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)", borderRadius: 16, padding: "28px 32px", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
            <GaugeChart score={score} size={170} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <FaBrain size={14} color="#a7f3d0" />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b" }}>AI Attendance Intelligence</span>
              </div>
              <h3 style={{ color: "#f1f5f9", margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>
                {score >= 88 ? "Excellent team health" : score >= 72 ? "Room for improvement" : "Needs urgent attention"}
              </h3>
              <p style={{ color: "#94a3b8", margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                Based on {entries.length} working days, {totalEmp} employees, and {entries.length * totalEmp} total attendance data points. Insights are generated using trend analysis, statistical pattern detection, and behavioral benchmarks — no external AI API required.
              </p>
              <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
                {[["Attendance Rate", `${presentRate}%`, totalRate >= 80 ? "#86efac" : totalRate >= 65 ? "#fde68a" : "#fca5a5"], ["Trend", trendDir === "up" ? "↑ Improving" : trendDir === "down" ? "↓ Declining" : "→ Stable", trendDir === "up" ? "#86efac" : trendDir === "down" ? "#fca5a5" : "#94a3b8"], ["Employees", totalEmp, "#93c5fd"], ["Working Days", entries.length, "#d8b4fe"]].map(([l, v, c]) => (
                  <div key={l}>
                    <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insight cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
            {insights.map((ins, i) => {
              const s = SEV[ins.sev] || SEV.info;
              return (
                <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderLeft: `4px solid ${s.dot}`, borderRadius: 12, padding: "16px 18px", display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 5 }}>{ins.title}</div>
                    <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6 }}>{ins.body}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Benchmark comparison */}
          <div className="card" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <FaShieldAlt size={12} color="#94a3b8" />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Industry Benchmarks</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Excellent Attendance", benchmark: 90, yours: totalRate },
                { label: "Industry Avg Benchmark", benchmark: 80, yours: totalRate },
                { label: "Acceptable Threshold",  benchmark: 70, yours: totalRate },
              ].map(b => (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "#475569", fontWeight: 600 }}>{b.label}</span>
                    <div style={{ display: "flex", gap: 12, color: "#64748b" }}>
                      <span>Benchmark: <b style={{ color: "#334155" }}>{b.benchmark}%</b></span>
                      <span>Yours: <b style={{ color: totalRate >= b.benchmark ? BRAND : DANGER }}>{presentRate}%</b></span>
                    </div>
                  </div>
                  <div style={{ position: "relative", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${b.benchmark}%`, background: "#e2e8f0", borderRadius: 4 }} />
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(totalRate, 100)}%`, background: totalRate >= b.benchmark ? BRAND : DANGER, borderRadius: 4, transition: "width 0.5s" }} />
                    <div style={{ position: "absolute", left: `${b.benchmark}%`, top: 0, width: 2, height: "100%", background: "#334155", opacity: 0.3 }} />
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
