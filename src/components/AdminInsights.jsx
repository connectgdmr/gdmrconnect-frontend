import React, { useEffect, useState } from "react";

const DEPT_PALETTE = [
  "#3b82f6", "#16a34a", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#6366f1",
];

const SERIES = [
  { key: "present", color: "#16a34a", label: "Present" },
  { key: "leave",   color: "#f59e0b", label: "On Leave" },
  { key: "absent",  color: "#ef4444", label: "Absent" },
];

// ─── Smooth cubic bezier path through points ────────────────────────────────
function smoothLine(pts) {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  return pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const midX = (prev.x + p.x) / 2;
    return acc + ` C ${midX} ${prev.y}, ${midX} ${p.y}, ${p.x} ${p.y}`;
  }, "");
}

function areaPath(pts, bottomY) {
  if (pts.length < 2) return "";
  const line = smoothLine(pts);
  return `${line} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`;
}

// ─── SVG Line Chart ──────────────────────────────────────────────────────────
function AttendanceLineChart({ data, today }) {
  const W   = 480;
  const H   = 200;
  const PAD = { top: 18, right: 16, bottom: 36, left: 34 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const maxVal = Math.max(...data.flatMap(d => [d.present, d.leave, d.absent]), 4);
  const ySteps = 4;

  const gx = (i) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2);
  const gy = (v) => PAD.top + chartH - (v / maxVal) * chartH;

  const pts = (key) => data.map((d, i) => ({ x: gx(i), y: gy(d[key]) }));

  const fmtDate = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const [hovered, setHovered] = useState(null);

  if (data.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: H, color: "#94a3b8", fontSize: 13 }}>
        No attendance data this month yet.
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          {SERIES.map(({ key, color }) => (
            <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis grid lines */}
        {Array.from({ length: ySteps + 1 }, (_, i) => {
          const frac = i / ySteps;
          const y    = PAD.top + chartH * (1 - frac);
          const val  = Math.round(maxVal * frac);
          return (
            <g key={i}>
              <line
                x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke={i === 0 ? "#e2e8f0" : "#f1f5f9"}
                strokeWidth={i === 0 ? 1.5 : 1}
              />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#cbd5e1" fontFamily="inherit">
                {val}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels — every other label when crowded */}
        {data.map((d, i) => {
          const skip = data.length > 10 && i % 2 !== 0;
          if (skip) return null;
          const isToday = d.date === today;
          return (
            <text
              key={d.date}
              x={gx(i)}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize={9}
              fill={isToday ? "var(--red)" : "#94a3b8"}
              fontWeight={isToday ? 700 : 400}
              fontFamily="inherit"
            >
              {fmtDate(d.date)}
            </text>
          );
        })}

        {/* Today vertical marker */}
        {data.map((d, i) => {
          if (d.date !== today) return null;
          return (
            <line
              key="today"
              x1={gx(i)} y1={PAD.top}
              x2={gx(i)} y2={PAD.top + chartH}
              stroke="var(--red)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.5}
            />
          );
        })}

        {/* Area fills */}
        {SERIES.map(({ key }) => (
          <path
            key={`area-${key}`}
            d={areaPath(pts(key), PAD.top + chartH)}
            fill={`url(#grad-${key})`}
            stroke="none"
          />
        ))}

        {/* Lines */}
        {SERIES.map(({ key, color }) => (
          <path
            key={`line-${key}`}
            d={smoothLine(pts(key))}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Hover dots + tooltip trigger */}
        {data.map((d, i) => (
          <g key={`hover-${i}`}>
            <rect
              x={gx(i) - 12} y={PAD.top}
              width={24} height={chartH}
              fill="transparent"
              style={{ cursor: "default" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
            {SERIES.map(({ key, color }) => (
              <circle
                key={key}
                cx={gx(i)} cy={gy(d[key])}
                r={hovered === i ? 5 : 3}
                fill={color}
                stroke="#fff"
                strokeWidth={1.5}
                style={{ transition: "r 0.1s" }}
              />
            ))}
          </g>
        ))}
      </svg>

      {/* Floating tooltip */}
      {hovered !== null && data[hovered] && (
        <div style={{
          position: "absolute",
          top: 10,
          left: Math.min(gx(hovered) / (480 / 100), 75) + "%",
          transform: "translateX(-50%)",
          background: "#0f172a",
          color: "#fff",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          zIndex: 10,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5, color: "#94a3b8" }}>
            {new Date(data[hovered].date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </div>
          {SERIES.map(({ key, color, label }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ color: "#cbd5e1" }}>{label}:</span>
              <span style={{ fontWeight: 700 }}>{data[hovered][key]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Animated Bar ─────────────────────────────────────────────────────────────
function AnimatedBar({ pct, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{ height: 7, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${width}%`, background: color, borderRadius: 99,
        transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}

// ─── Main Insights Component ──────────────────────────────────────────────────
export default function AdminInsights({ stats, employees, api, token }) {
  const [chartData, setChartData] = useState([]);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!api || !token) return;
    const monthStr = new Date().toISOString().slice(0, 7);
    api.getAttendanceSummary(monthStr, token)
      .then((summary) => {
        const days = summary?.days || {};
        const toCount = (v) => Array.isArray(v) ? v.length : (typeof v === "number" ? v : 0);
        const processed = Object.entries(days)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14)
          .map(([date, data]) => ({
            date,
            present: toCount(data.present),
            leave:   toCount(data.leave),
            absent:  toCount(data.absent),
          }))
          .filter(d => d.present + d.leave + d.absent > 0);
        setChartData(processed);
      })
      .catch(() => {});
  }, [api, token]);

  const sp = stats.present        ?? 0;
  const sl = stats.leave          ?? 0;
  const sa = stats.absent         ?? 0;
  const sn = stats.not_checked_in ?? 0;

  // Fall back to today's stats when no history loaded yet
  const displayData = chartData.length > 0 ? chartData : (
    (sp + sa + sl + sn) > 0
      ? [{ date: todayStr, present: sp, leave: sl, absent: sa }]
      : []
  );

  const todayStats = chartData.find(d => d.date === todayStr) || { present: sp, leave: sl, absent: sa };
  const todayTotal = todayStats.present + todayStats.leave + todayStats.absent + sn;
  const presentPct = todayTotal > 0 ? Math.round((todayStats.present / todayTotal) * 100) : 0;

  // Department headcount
  const deptMap = {};
  employees.forEach((emp) => {
    const d = emp.department || "Unassigned";
    deptMap[d] = (deptMap[d] || 0) + 1;
  });
  const deptData = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const deptMax  = deptData.length > 0 ? deptData[0][1] : 1;

  const managerCount  = employees.filter((e) => e.role === "manager").length;
  const employeeCount = employees.filter((e) => e.role === "employee").length;
  const totalStaff    = employees.length;

  return (
    <div className="insights-grid">

      {/* ── Attendance Line Chart ── */}
      <div className="card insights-card" style={{ gridColumn: "span 2" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h4 className="widget-title" style={{ margin: 0 }}>Attendance Trend — Last 14 Days</h4>
          <div style={{ display: "flex", gap: 14 }}>
            {SERIES.map(({ key, color, label }) => (
              <span key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
                <span style={{ width: 18, height: 3, background: color, borderRadius: 2, display: "inline-block" }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <AttendanceLineChart data={displayData} today={todayStr} />

        {/* Today's summary strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 16,
          paddingTop: 16, borderTop: "1px solid #f1f5f9",
        }}>
          {[
            { label: "Present",        value: sp, color: "#16a34a", bg: "#f0fdf4" },
            { label: "On Leave",       value: sl, color: "#d97706", bg: "#fffbeb" },
            { label: "Not Checked In", value: sn, color: "#64748b", bg: "#f8fafc" },
            { label: "Absent",         value: sa, color: "#dc2626", bg: "#fef2f2" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {todayTotal > 0 && (
          <div style={{
            marginTop: 12, padding: "10px 16px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: presentPct >= 75 ? "#f0fdf4" : presentPct >= 50 ? "#fffbeb" : "#fef2f2",
            border: `1px solid ${presentPct >= 75 ? "#bbf7d0" : presentPct >= 50 ? "#fde68a" : "#fecaca"}`,
          }}>
            <span style={{
              fontSize: 20, fontWeight: 800,
              color: presentPct >= 75 ? "#16a34a" : presentPct >= 50 ? "#d97706" : "#dc2626",
            }}>
              {presentPct}%
            </span>
            <span style={{ fontSize: 13, color: "#64748b" }}>attendance rate today</span>
          </div>
        )}
      </div>

      {/* ── Department Distribution ── */}
      <div className="card insights-card">
        <h4 className="widget-title">Department Distribution</h4>

        {deptData.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "48px 0", fontSize: 13 }}>
            No employee data yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
            {deptData.map(([name, count], i) => {
              const pct = Math.round((count / totalStaff) * 100);
              return (
                <div key={name}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: DEPT_PALETTE[i % DEPT_PALETTE.length] }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{pct}%</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", minWidth: 16, textAlign: "right" }}>{count}</span>
                    </div>
                  </div>
                  <AnimatedBar pct={(count / deptMax) * 100} color={DEPT_PALETTE[i % DEPT_PALETTE.length]} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Workforce Composition ── */}
      <div className="card insights-card">
        <h4 className="widget-title">Workforce Composition</h4>

        <div style={{ textAlign: "center", padding: "16px 0 22px" }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: "var(--red)", lineHeight: 1 }}>{totalStaff}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, fontWeight: 500 }}>Active Staff Members</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", background: "#f1f5f9" }}>
            {totalStaff > 0 && (
              <>
                <div style={{
                  width: `${(employeeCount / totalStaff) * 100}%`,
                  background: "#3b82f6",
                  transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  {employeeCount / totalStaff > 0.12 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{employeeCount}</span>
                  )}
                </div>
                <div style={{ flex: 1, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {managerCount / totalStaff > 0.12 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{managerCount}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#eff6ff", borderRadius: 12, padding: "16px 12px", textAlign: "center", border: "1px solid #dbeafe" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#1d4ed8", lineHeight: 1 }}>{employeeCount}</div>
            <div style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600, marginTop: 5 }}>Employees</div>
            <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 2 }}>
              {totalStaff > 0 ? Math.round((employeeCount / totalStaff) * 100) : 0}% of workforce
            </div>
          </div>
          <div style={{ background: "#fffbeb", borderRadius: 12, padding: "16px 12px", textAlign: "center", border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#d97706", lineHeight: 1 }}>{managerCount}</div>
            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginTop: 5 }}>Managers</div>
            <div style={{ fontSize: 11, color: "#fcd34d", marginTop: 2 }}>
              {totalStaff > 0 ? Math.round((managerCount / totalStaff) * 100) : 0}% of workforce
            </div>
          </div>
        </div>

        {deptData.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Top Departments
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {deptData.slice(0, 4).map(([name, count], i) => (
                <span key={name} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
                  background: `${DEPT_PALETTE[i % DEPT_PALETTE.length]}18`,
                  color: DEPT_PALETTE[i % DEPT_PALETTE.length],
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: DEPT_PALETTE[i % DEPT_PALETTE.length] }} />
                  {name} · {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
