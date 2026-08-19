import React, { useState, useEffect } from "react";
import { FaBullhorn, FaSave, FaEdit, FaUndo } from "react-icons/fa";

// Full "Manage Announcements" UI — originally AdminDashboard.jsx's
// `view === "announcements"` block. Extracted so a delegated "announcements"
// grant gets the real thing (same rationale as AdminDepartments.jsx). Fully
// self-contained: no employees/departments dependency, just token + api.
// canWrite gates posting/editing/recalling — mirrors the grant's
// access_level (routes/announcements.py requires write=True on POST/PUT/
// DELETE; GET is open to anyone logged in).
export default function AdminAnnouncements({ token, api, canWrite = true }) {
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [editAnnTitle, setEditAnnTitle] = useState("");
  const [editAnnMessage, setEditAnnMessage] = useState("");

  const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";

  async function loadAnnouncements() {
    try {
      const res = await fetch(`${baseUrl}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
    } catch { /* silent */ }
  }

  useEffect(() => { loadAnnouncements(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createAnnouncement() {
    if (!annTitle || !annMessage) return alert("Please fill in both title and message");
    try {
      const res = await fetch(`${baseUrl}/api/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: annTitle, message: annMessage }),
      });
      if (res.ok) {
        alert("Announcement Posted Successfully!");
        setAnnTitle(""); setAnnMessage(""); loadAnnouncements();
      } else { alert("Failed to post announcement"); }
    } catch { alert("Error posting announcement"); }
  }

  function startEditAnnouncement(ann) {
    setEditingAnnId(ann._id); setEditAnnTitle(ann.title); setEditAnnMessage(ann.message);
  }
  function cancelEditAnnouncement() {
    setEditingAnnId(null); setEditAnnTitle(""); setEditAnnMessage("");
  }

  async function updateAnnouncement(id) {
    if (!editAnnTitle || !editAnnMessage) return alert("Title and message cannot be empty.");
    try {
      const res = await fetch(`${baseUrl}/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editAnnTitle, message: editAnnMessage }),
      });
      if (res.ok) {
        alert("Announcement Updated Successfully!");
        setEditingAnnId(null); loadAnnouncements();
      } else { alert("Failed to update announcement"); }
    } catch { alert("Error updating announcement"); }
  }

  async function recallAnnouncement(id) {
    if (!window.confirm("Are you sure you want to recall (delete) this announcement?")) return;
    try {
      const res = await fetch(`${baseUrl}/api/announcements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAnnouncements();
      else alert("Failed to recall announcement");
    } catch { alert("Error recalling announcement"); }
  }

  return (
    <div className="card" style={{ marginTop: 16, background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
      <h3 style={{ color: "var(--red)" }}>Manage Announcements</h3>
      <p style={{ color: "#64748b", marginBottom: 20 }}>Broadcast messages to all employee dashboards.</p>

      {canWrite && (
        <div className="card" style={{ marginBottom: 30 }}>
          <h4 style={{ marginTop: 0, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>Create New Announcement</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <input className="modern-input" placeholder="Title (e.g. Office Closed on Friday)" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
            <textarea className="modern-input" placeholder="Message details..." style={{ minHeight: 80, resize: "vertical" }} value={annMessage} onChange={(e) => setAnnMessage(e.target.value)} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" onClick={createAnnouncement} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
                <FaBullhorn /> Post Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      <h4 style={{ marginBottom: 15, color: "#334155" }}>Announcement History{canWrite ? " & Management" : ""}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {announcements.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}>
            <FaBullhorn size={40} style={{ opacity: 0.2, marginBottom: 15 }} />
            <p style={{ margin: 0 }}>No announcements currently active.</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div key={ann._id}>
              {canWrite && editingAnnId === ann._id ? (
                <div className="edit-mode-card">
                  <h4 style={{ marginTop: 0, color: "var(--brand)" }}>Editing Announcement</h4>
                  <input className="modern-input" style={{ marginBottom: 10 }} value={editAnnTitle} onChange={(e) => setEditAnnTitle(e.target.value)} />
                  <textarea className="modern-input" style={{ minHeight: 100, resize: "vertical", marginBottom: 15 }} value={editAnnMessage} onChange={(e) => setEditAnnMessage(e.target.value)} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn" style={{ display: "flex", alignItems: "center", gap: 5 }} onClick={() => updateAnnouncement(ann._id)}><FaSave /> Save Changes</button>
                    <button className="btn ghost" onClick={cancelEditAnnouncement}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="announcement-card">
                  <div className="announcement-header">
                    <h4 className="announcement-title">{ann.title}</h4>
                    <span className="announcement-date">{new Date(ann.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="announcement-body">{ann.message}</div>
                  {canWrite && (
                    <div className="announcement-actions">
                      <button className="btn-action-edit" onClick={() => startEditAnnouncement(ann)}><FaEdit /> Edit</button>
                      <button className="btn-action-recall" onClick={() => recallAnnouncement(ann._id)}><FaUndo /> Recall / Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
