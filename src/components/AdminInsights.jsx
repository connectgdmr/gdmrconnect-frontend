import React, { useEffect, useRef, useState } from "react";

const DEPT_PALETTE = [
  "#3b82f6", "#16a34a", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#6366f1",
];

// ─── Pure SVG Donut ──────────────────────────────────────────────────────────
function DonutChart({ segments, total }) {
  const SIZE = 164;
  const THICKNESS = 28;
  const R = (SIZE - THICKNESS) / 2;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const CIRC = 2 * Math.PI * R;

  let cumLen = 0;

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE, margin: "0 auto" }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        {total === 0 ? (
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e2e8f0" strokeWidth={THICKNESS} />
        ) : (
          segments.map((seg, i) => {
            if (seg.value === 0) return null;
            const segLen = (seg.value / total) * CIRC;
            const el = (
              <circle
                key={i}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={THICKNESS}
                strokeDasharray={`${segLen} ${CIRC}`}
                strokeDashoffset={-cumLen}
                strokeLinecap="butt"
              />
            );
            cumLen += segLen;
            return el;
          })
        )}
      </svg>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center", pointerEvents: "none",
      }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{total}</div>
        <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, marginTop: 3, letterSpacing: "0.04em" }}>
          TOTAL
        </div>
      </div>
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
export default function AdminInsights({ stats, employees }) {
  const total = stats.present + stats.absent + stats.leave + stats.not_checked_in;

  const attendanceSegments = [
    { key: "present",        value: stats.present,        color: "#16a34a", label: "Present" },
    { key: "leave",          value: stats.leave,          color: "#f59e0b", label: "On Leave" },
    { key: "not_checked_in", value: stats.not_checked_in, color: "#94a3b8", label: "Not Checked In" },
    { key: "absent",         value: stats.absent,         color: "#ef4444", label: "Absent" },
  ];

  // Department headcount
  const deptMap = {};
  employees.forEach((emp) => {
    const d = emp.department || "Unassigned";
    deptMap[d] = (deptMap[d] || 0) + 1;
  });
  const deptData = Object.entries(deptMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const deptMax = deptData.length > 0 ? deptData[0][1] : 1;

  // Workforce split
  const managerCount  = employees.filter((e) => e.role === "manager").length;
  const employeeCount = employees.filter((e) => e.role === "employee").length;
  const totalStaff    = employees.length;

  // Attendance % for present
  const presentPct = total > 0 ? Math.round((stats.present / total) * 100) : 0;

  return (
    <div className="insights-grid">

      {/* ── Attendance Donut ── */}
      <div className="card insights-card">
        <h4 className="widget-title">Today's Attendance</h4>
        <DonutChart segments={attendanceSegments} total={total} />

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
          {attendanceSegments.map((seg) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={seg.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, color: "#475569" }}>{seg.label}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{pct}%</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", minWidth: 22, textAlign: "right" }}>
                  {seg.value}
                </span>
              </div>
            );
          })}
        </div>

        {total > 0 && (
          <div style={{
            marginTop: 18, padding: "12px 14px", borderRadius: 10,
            background: presentPct >= 75 ? "#f0fdf4" : presentPct >= 50 ? "#fffbeb" : "#fef2f2",
            border: `1px solid ${presentPct >= 75 ? "#bbf7d0" : presentPct >= 50 ? "#fde68a" : "#fecaca"}`,
            textAlign: "center",
          }}>
            <span style={{
              fontSize: 22, fontWeight: 800,
              color: presentPct >= 75 ? "#16a34a" : presentPct >= 50 ? "#d97706" : "#dc2626",
            }}>
              {presentPct}%
            </span>
            <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>attendance rate today</span>
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
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: DEPT_PALETTE[i % DEPT_PALETTE.length],
                      }} />
                      <span style={{
                        fontSize: 12.5, fontWeight: 600, color: "#334155",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {name}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{pct}%</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", minWidth: 16, textAlign: "right" }}>
                        {count}
                      </span>
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

        {/* Stacked proportion bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", background: "#f1f5f9" }}>
            {totalStaff > 0 && (
              <>
                <div style={{
                  width: `${(employeeCount / totalStaff) * 100}%`,
                  background: "#3b82f6",
                  transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {employeeCount > 0 && employeeCount / totalStaff > 0.12 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{employeeCount}</span>
                  )}
                </div>
                <div style={{
                  flex: 1, background: "#f59e0b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {managerCount > 0 && managerCount / totalStaff > 0.12 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{managerCount}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{
            background: "#eff6ff", borderRadius: 12, padding: "16px 12px",
            textAlign: "center", border: "1px solid #dbeafe",
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#1d4ed8", lineHeight: 1 }}>{employeeCount}</div>
            <div style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600, marginTop: 5 }}>Employees</div>
            <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 2 }}>
              {totalStaff > 0 ? Math.round((employeeCount / totalStaff) * 100) : 0}% of workforce
            </div>
          </div>
          <div style={{
            background: "#fffbeb", borderRadius: 12, padding: "16px 12px",
            textAlign: "center", border: "1px solid #fde68a",
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#d97706", lineHeight: 1 }}>{managerCount}</div>
            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginTop: 5 }}>Managers</div>
            <div style={{ fontSize: 11, color: "#fcd34d", marginTop: 2 }}>
              {totalStaff > 0 ? Math.round((managerCount / totalStaff) * 100) : 0}% of workforce
            </div>
          </div>
        </div>

        {/* Top departments teaser */}
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
