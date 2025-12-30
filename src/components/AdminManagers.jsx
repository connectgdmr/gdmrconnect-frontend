import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function AdminManagers({ token, api }) {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    loadManagers();
  }, []);

  return (
    <div className="card">
      <h2 style={{ color: "#b91c1c" }}>Managers List</h2>

      {error && <p className="alert">{error}</p>}
      
      {/* Change #4: Loader */}
      {loading && <div className="loader-container"><div className="loader"></div></div>}

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
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m._id}>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="icon-btn delete"
                      style={{margin:'0 auto'}}
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