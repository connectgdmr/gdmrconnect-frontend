import React, { useState, useEffect } from "react";
import { TbTrash, TbCrown, TbUsers, TbSearch, TbUserBolt } from "react-icons/tb";
import { SkeletonTable } from "./Skeleton";

// Deterministic avatar colour from a name — same idea as Chat.jsx's colorFor
// and AdminAttendancePage.jsx's empAvatarColor, kept local here since none
// of those export it for reuse.
const AVATAR_COLORS = ["#34a06a", "#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#65a30d"];
function avatarColor(name) {
  const k = name || "";
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Same KPI tile used on Attendance/the Admin Dashboard — kept local here
// (rather than imported, since neither exports it) but uses the shared
// .kpi-row/.kpi-tile styles from styles.css so it renders identically.
function KpiTile({ icon, label, value, tone = "brand" }) {
  const tones = {
    brand: { color: "var(--brand)", bg: "var(--brand-light)" },
    amber: { color: "#d97706", bg: "#fffbeb" },
    slate: { color: "#475569", bg: "#f1f5f9" },
  };
  const t = tones[tone] || tones.brand;
  return (
    <div className="kpi-tile">
      <div className="kpi-icon" style={{ color: t.color, background: t.bg }}>{icon}</div>
      <div className="kpi-meta">
        <span className="kpi-value">{value ?? 0}</span>
        <span className="kpi-label">{label}</span>
      </div>
    </div>
  );
}

export default function AdminManagers({ token, api }) {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  async function loadManagers() {
    setLoading(true);
    setError("");
    try {
      const list = await api.getManagers(token);
      setManagers(list);
    } catch (err) {
      setError("Failed to load managers");
    }
    setLoading(false);
  }

  async function deleteManager(id) {
    if (!window.confirm("Are you sure to delete this manager?")) return;
    try {
      await api.deleteManager(id, token);
      loadManagers();
    } catch (err) {
      alert("Delete failed");
    }
  }

  async function toggleOwner(m) {
    const newRole = m.role === "owner" ? "manager" : "owner";
    const label = newRole === "owner" ? "Make Business Owner" : "Remove Business Owner";
    if (!window.confirm(`${label} for ${m.name}?`)) return;
    setTogglingId(m._id);
    try {
      await api.setManagerRole(m._id, newRole, token);
      loadManagers();
    } catch (err) {
      alert("Failed to update role. Please try again.");
    }
    setTogglingId(null);
  }

  useEffect(() => {
    loadManagers();
  }, []);

  const ownerCount = managers.filter(m => m.role === "owner").length;
  const deptCount = new Set(managers.map(m => m.department).filter(Boolean)).size;

  const q = search.trim().toLowerCase();
  const filtered = managers.filter(m => {
    if (roleFilter !== "All" && (m.role === "owner" ? "Owner" : "Manager") !== roleFilter) return false;
    if (!q) return true;
    return (m.name || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Page header — matches every other admin list page's card+title+description */}
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)" }}>Managers</h3>
          <p className="small" style={{ margin: "4px 0 0" }}>All managers and business owners across the company.</p>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 16 }}>
        <KpiTile icon={<TbUsers />} label="Total Managers" value={managers.length} tone="brand" />
        <KpiTile icon={<TbCrown />} label="Business Owners" value={ownerCount} tone="amber" />
        <KpiTile icon={<TbUserBolt />} label="Departments Covered" value={deptCount} tone="slate" />
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <TbSearch style={{ position: "absolute", left: 12, top: 13, color: "#999" }} />
          <input
            className="input"
            placeholder="Search by name or email…"
            style={{ marginBottom: 0, paddingLeft: 38 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ marginBottom: 0, flex: "0 0 160px" }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="All">All Roles</option>
          <option value="Manager">Manager</option>
          <option value="Owner">Business Owner</option>
        </select>
      </div>

      <div className="card">
        {error && <p className="alert">{error}</p>}

        {loading && <SkeletonTable rows={5} cols={4} />}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "#94a3b8", padding: "24px 0" }}>
            {managers.length === 0 ? "No managers added yet." : "No managers match your search."}
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="leave-table-wrapper">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Manager</th>
                  <th>Department</th>
                  <th style={{ textAlign: "center" }}>Role</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: m.photo_url ? "transparent" : avatarColor(m.name), color: "#fff", fontWeight: 700, fontSize: 13,
                          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                        }}>
                          {m.photo_url
                            ? <img src={m.photo_url} alt={m.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : (m.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{m.name}</span>
                            {m.role === "owner" && (
                              <span style={{
                                background: "#fef3c7", color: "#b45309", fontSize: 10.5, fontWeight: 700,
                                borderRadius: 4, padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: 4,
                              }}>
                                <TbCrown size={10} /> Business Owner
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "#334155" }}>{m.department || "—"}</td>
                    <td style={{ textAlign: "center", color: m.role === "owner" ? "#b45309" : "inherit", fontWeight: m.role === "owner" ? 600 : 400 }}>
                      {m.role === "owner" ? "Business Owner" : "Manager"}
                    </td>
                    <td style={{ textAlign: "center", display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <button
                        className={`btn${m.role === "owner" ? " ghost" : ""}`}
                        style={{
                          fontSize: 12,
                          padding: "5px 12px",
                          background: m.role === "owner" ? undefined : "#fef3c7",
                          color: m.role === "owner" ? undefined : "#b45309",
                          border: m.role === "owner" ? "1px solid #d1d5db" : "1px solid #fcd34d",
                          borderRadius: 6,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => toggleOwner(m)}
                        disabled={togglingId === m._id}
                        title={m.role === "owner" ? "Remove Business Owner role" : "Grant Business Owner role"}
                      >
                        <TbCrown style={{ marginRight: 5, fontSize: 11 }} />
                        {togglingId === m._id
                          ? "Updating..."
                          : m.role === "owner"
                          ? "Remove Owner"
                          : "Make Owner"}
                      </button>
                      <button
                        className="icon-btn delete"
                        onClick={() => deleteManager(m._id)}
                        title="Delete"
                      >
                        <TbTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
