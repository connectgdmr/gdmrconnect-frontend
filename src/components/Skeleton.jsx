import React from "react";

// Base shimmer block
export function Skeleton({ width = "100%", height = 14, radius = 6, style = {} }) {
  return (
    <span
      className="skeleton-box"
      style={{ width, height, borderRadius: radius, display: "inline-block", ...style }}
    />
  );
}

// Multiple stacked text lines (last one shorter)
export function SkeletonText({ lines = 3, gap = 8, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

// Grid of card skeletons (for course/job/assessment grids)
export function SkeletonCards({ count = 6, minWidth = 280, height = 150 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Skeleton width="55%" height={16} />
            <Skeleton width={28} height={28} radius={8} />
          </div>
          <SkeletonText lines={2} />
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <Skeleton width={60} height={20} radius={99} />
            <Skeleton width={70} height={20} radius={99} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Table skeleton — header is real, body is shimmer rows
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="styled-table-global">
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}>
                    <Skeleton width={c === 0 ? "80%" : `${50 + ((r + c) % 4) * 10}%`} height={12} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Row of stat tiles
export function SkeletonStats({ count = 4 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: 16 }}>
          <Skeleton width={44} height={44} radius={12} />
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height={22} style={{ marginBottom: 8 }} />
            <Skeleton width="70%" height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Vertical list of row skeletons (for stacked cards like jobs/leaves)
export function SkeletonList({ count = 4, height = 70 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Skeleton width={42} height={42} radius={10} />
          <div style={{ flex: 1 }}>
            <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="65%" height={11} />
          </div>
          <Skeleton width={70} height={26} radius={8} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
