import React, { useState, useEffect } from "react";
import { FaTrash, FaCrown } from "react-icons/fa";
import { SkeletonTable } from "./Skeleton";

export default function AdminManagers({ token, api }) {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

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

  return (
    <div className="card">
      <h2 style={{ color: "var(--brand)" }}>Managers List</h2>

      {error && <p className="alert">{error}</p>}

      {loading && <SkeletonTable rows={5} cols={4} />}

      {!loading && managers.length === 0 && (
        <p>No Managers Added Yet.</p>
      )}

      {!loading && managers.length > 0 && (
        <div className="leave-table-wrapper">
          <table className="leave-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th style={{ textAlign: "center" }}>Role</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m._id}>
                  <td>
                    {m.name}
                    {m.role === "owner" && (
                      <span style={{
                        marginLeft: 8,
                        background: "#fef3c7",
                        color: "#b45309",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 4,
                        padding: "2px 7px",
                        verticalAlign: "middle",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}>
                        <FaCrown style={{ fontSize: 10 }} /> Business Owner
                      </span>
                    )}
                  </td>
                  <td>{m.email}</td>
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
                      <FaCrown style={{ marginRight: 5, fontSize: 11 }} />
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
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
