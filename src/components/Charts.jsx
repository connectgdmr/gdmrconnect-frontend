import React, { useState } from "react";

// Shared green-family palette for charts
export const CHART_COLORS = ["#34a06a", "#0f766e", "#5cb88a", "#1c5249", "#7cc4a4", "#226e48", "#9bd0b8", "#143f39"];
const inr = (n) => Number(n || 0).toLocaleString("en-IN");

// ─── Smooth line chart ───────────────────────────────────────────────────────
export function LineChart({ data = [], color = "#34a06a", height = 180, valueLabel = "" }) {
  const W = 480, H = height, PAD = { t: 16, r: 14, b: 28, l: 30 };
  const cw = W - PAD.l - PAD.r, ch = H - PAD.t - PAD.b;
  const [hover, setHover] = useState(null);
  if (!data.length) return <Empty h={height} />;
  const max = Math.max(...data.map(d => d.value), 1);
  const gx = (i) => PAD.l + (data.length > 1 ? (i / (data.length - 1)) * cw : cw / 2);
  const gy = (v) => PAD.t + ch - (v / max) * ch;
  const pts = data.map((d, i) => ({ x: gx(i), y: gy(d.value), ...d }));
  const path = pts.reduce((a, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${a} C ${(pts[i-1].x+p.x)/2} ${pts[i-1].y}, ${(pts[i-1].x+p.x)/2} ${p.y}, ${p.x} ${p.y}`, "");
  const area = `${path} L ${pts[pts.length-1].x} ${PAD.t+ch} L ${pts[0].x} ${PAD.t+ch} Z`;
  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs><linearGradient id="lcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0.01" /></linearGradient></defs>
        {[0,0.25,0.5,0.75,1].map((f,i) => { const y = PAD.t+ch*(1-f); return <g key={i}><line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y} stroke={i===0?"#e2e8f0":"#f1f5f9"} /><text x={PAD.l-6} y={y+4} textAnchor="end" fontSize="9" fill="#cbd5e1">{Math.round(max*f)}</text></g>; })}
        <path d={area} fill="url(#lcg)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {pts.map((p,i) => (
          <g key={i}>
            <text x={p.x} y={H-PAD.b+14} textAnchor="middle" fontSize="9" fill="#94a3b8">{p.label}</text>
            <rect x={p.x-14} y={PAD.t} width="28" height={ch} fill="transparent" onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} />
            <circle cx={p.x} cy={p.y} r={hover===i?5:3} fill={color} stroke="#fff" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
      {hover!==null && (
        <div style={{ position:"absolute", top:6, left:`${Math.min(pts[hover].x/W*100,72)}%`, transform:"translateX(-50%)", background:"#0f172a", color:"#fff", borderRadius:7, padding:"5px 10px", fontSize:11, pointerEvents:"none", whiteSpace:"nowrap" }}>
          <b>{data[hover].value}</b> {valueLabel} · {data[hover].label}
        </div>
      )}
    </div>
  );
}

// ─── Bar chart ───────────────────────────────────────────────────────────────
export function BarChart({ data = [], height = 180, multicolor = true, color = "#34a06a" }) {
  if (!data.length) return <Empty h={height} />;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, padding: "8px 4px 0" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 4 }}>{d.value}</div>
          <div title={`${d.label}: ${d.value}`} style={{
            width: "70%", maxWidth: 38, height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0,
            background: multicolor ? CHART_COLORS[i % CHART_COLORS.length] : color,
            borderRadius: "6px 6px 0 0", transition: "height 0.6s cubic-bezier(.4,0,.2,1)",
          }} />
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Donut / Pie ─────────────────────────────────────────────────────────────
export function DonutChart({ segments = [], size = 170, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + (x.value || 0), 0);
  if (!total) return <Empty h={size} />;
  const R = size / 2, sw = size * 0.16, r = R - sw / 2;
  let acc = 0;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={R} cy={R} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        {segments.map((s, i) => {
          const frac = s.value / total; const dash = frac * circ;
          const el = <circle key={i} cx={R} cy={R} r={r} fill="none" stroke={s.color || CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc * circ} transform={`rotate(-90 ${R} ${R})`} strokeLinecap="butt" />;
          acc += frac; return el;
        })}
        {centerLabel !== undefined && <text x={R} y={R-2} textAnchor="middle" fontSize={size*0.2} fontWeight="800" fill="#0f172a">{centerLabel}</text>}
        {centerSub && <text x={R} y={R+size*0.14} textAnchor="middle" fontSize={size*0.075} fill="#94a3b8">{centerSub}</text>}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 120 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color || CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
            <span style={{ color: "#475569", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
            <span style={{ fontWeight: 700, color: "#0f172a" }}>{s.value}</span>
            <span style={{ color: "#94a3b8", fontSize: 11, width: 38, textAlign: "right" }}>{Math.round(s.value/total*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Progress ring ───────────────────────────────────────────────────────────
export function ProgressRing({ percent = 0, size = 120, color = "#34a06a", label }) {
  const R = size / 2, sw = size * 0.11, r = R - sw / 2, circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={R} cy={R} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        <circle cx={R} cy={R} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - (pct/100)*circ} transform={`rotate(-90 ${R} ${R})`} style={{ transition: "stroke-dashoffset 0.7s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: size*0.22, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{Math.round(pct)}%</div>
        {label && <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3 }}>{label}</div>}
      </div>
    </div>
  );
}

function Empty({ h }) {
  return <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12.5 }}>No data to display yet.</div>;
}
