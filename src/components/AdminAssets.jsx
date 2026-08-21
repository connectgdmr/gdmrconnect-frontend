import React, { useState, useEffect } from "react";
import { TbCircleCheck, TbCircleX, TbDeviceLaptop, TbHourglass, TbSearch } from "react-icons/tb";

const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");

// Same KPI tile used on Attendance/the Admin Dashboard — kept local here
// (rather than imported, since neither exports it) but uses the shared
// .kpi-row/.kpi-tile styles from styles.css so it renders identically.
function KpiTile({ icon, label, value, tone = "brand" }) {
  const tones = {
    brand: { color: "var(--brand)", bg: "var(--brand-light)" },
    green: { color: "#16a34a", bg: "#f0fdf4" },
    amber: { color: "#d97706", bg: "#fffbeb" },
    red:   { color: "#dc2626", bg: "#fef2f2" },
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

// Full "Manage Organization Assets" UI — originally AdminDashboard.jsx's
// `view === "assets"` block. Extracted so a delegated "assets" grant gets
// the real thing (same rationale as AdminDepartments.jsx/
// AdminAnnouncements.jsx). Fully self-contained: no employees/departments
// dependency, just token + api. canWrite gates the Approve/Reject actions —
// the backend's PUT /api/admin/assets/<id> already requires write=True on
// the grant (routes/assets.py), so a view-only delegate would just get a
// 403 if the buttons were shown anyway.
export default function AdminAssets({ token, api, canWrite = true }) {
  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";

  async function loadAssets() {
    try {
      const res = await fetch(`${baseUrl}/api/admin/assets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAllAssets(await res.json());
    } catch { /* silent fail */ }
  }

  useEffect(() => { loadAssets(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount  = allAssets.filter(a => getStatusClass(a.admin_status) === "pending").length;
  const approvedCount = allAssets.filter(a => getStatusClass(a.admin_status) === "approved").length;
  const rejectedCount = allAssets.filter(a => getStatusClass(a.admin_status) === "rejected").length;

  const q = search.trim().toLowerCase();
  const filteredAssets = allAssets.filter(a => {
    if (statusFilter !== "All" && getStatusClass(a.admin_status || "Pending") !== statusFilter.toLowerCase()) return false;
    if (!q) return true;
    return (a.employee_name || "").toLowerCase().includes(q) || (a.asset_name || "").toLowerCase().includes(q);
  });

  async function updateAdminAssetStatus(id, status) {
    if (!window.confirm(`Are you sure you want to mark this request as ${status}?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/admin/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ admin_status: status }),
      });
      if (res.ok) {
        alert(`Asset request ${status} successfully!`);
        loadAssets();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || "Failed to update asset.");
      }
    } catch (err) {
      alert("Error updating asset: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "var(--brand)" }}>Manage Organization Assets</h3>
        <p className="small" style={{ margin: "4px 0 0" }}>Review and provide final authorization for all hardware and equipment requests across the company. Requests must be approved by the Department Manager before final Admin processing.</p>
      </div>

      <div className="kpi-row" style={{ marginBottom: 16 }}>
        <KpiTile icon={<TbDeviceLaptop />} label="Total Requests" value={allAssets.length} tone="brand" />
        <KpiTile icon={<TbHourglass />}    label="Pending"        value={pendingCount}     tone="amber" />
        <KpiTile icon={<TbCircleCheck />}  label="Approved"       value={approvedCount}    tone="green" />
        <KpiTile icon={<TbCircleX />}      label="Rejected"       value={rejectedCount}    tone="red" />
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <TbSearch style={{ position: "absolute", left: 12, top: 13, color: "#999" }} />
          <input
            className="input"
            placeholder="Search by employee or asset…"
            style={{ marginBottom: 0, paddingLeft: 38 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ marginBottom: 0, flex: "0 0 160px" }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="card">
      <div style={{ overflowX: "auto" }}>
        <table className="styled-table-global">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee (Dept)</th>
              <th>Requested Asset</th>
              <th>Reason</th>
              <th style={{ textAlign: "center" }}>Manager Status</th>
              <th style={{ textAlign: "center" }}>Admin Status</th>
              {canWrite && <th>Final Action</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length === 0 ? (
              <tr><td colSpan={canWrite ? 7 : 6} style={{ textAlign: "center", padding: 40, color: "#999" }}>
                {allAssets.length === 0 ? "No asset requests found in the system." : "No requests match your search/filter."}
              </td></tr>
            ) : (
              filteredAssets.map(asset => (
                <tr key={asset._id}>
                  <td>{new Date(asset.created_at).toLocaleDateString("en-GB")}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>{asset.employee_name}</div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>{asset.department || "No Dept"}</div>
                  </td>
                  <td style={{ fontWeight: 600, color: "#334155" }}>
                    {asset.asset_name}
                  </td>
                  <td style={{ maxWidth: "200px" }}>
                    <div style={{ fontSize: 11, color: "#475569", lineHeight: "1.4" }}>
                      {asset.reason}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`status-badge ${getStatusClass(asset.manager_status || "Pending")}`}>
                      {asset.manager_status || "Pending"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`status-badge ${getStatusClass(asset.admin_status || "Pending")}`}>
                      {asset.admin_status || "Pending"}
                    </span>
                  </td>
                  {canWrite && (
                    <td>
                      <div className="action-btn-group" style={{ flexWrap: "wrap", gap: 6 }}>
                        <button
                          className="action-btn btn-approve" disabled={loading}
                          onClick={() => updateAdminAssetStatus(asset._id, "Approved")}
                        >
                          <TbCircleCheck /> Approve
                        </button>
                        <button
                          className="action-btn btn-reject" disabled={loading}
                          onClick={() => updateAdminAssetStatus(asset._id, "Rejected")}
                        >
                          <TbCircleX /> Reject
                        </button>
                        {(asset.admin_status || "").toLowerCase() === "approved" && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 10px", borderRadius: 6,
                            background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                            fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                          }}>
                            <TbCircleCheck size={10} /> Approved — manager assigns
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
