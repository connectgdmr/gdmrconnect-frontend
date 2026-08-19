import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");

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
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ color: "var(--brand)" }}>Manage Organization Assets</h3>
      <p className="small" style={{ marginBottom: 20 }}>Review and provide final authorization for all hardware and equipment requests across the company. Requests must be approved by the Department Manager before final Admin processing.</p>

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
            {allAssets.length === 0 ? (
              <tr><td colSpan={canWrite ? 7 : 6} style={{ textAlign: "center", padding: 40, color: "#999" }}>No asset requests found in the system.</td></tr>
            ) : (
              allAssets.map(asset => (
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
                          <FaCheckCircle /> Approve
                        </button>
                        <button
                          className="action-btn btn-reject" disabled={loading}
                          onClick={() => updateAdminAssetStatus(asset._id, "Rejected")}
                        >
                          <FaTimesCircle /> Reject
                        </button>
                        {(asset.admin_status || "").toLowerCase() === "approved" && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 10px", borderRadius: 6,
                            background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                            fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                          }}>
                            <FaCheckCircle size={10} /> Approved — manager assigns
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
  );
}
