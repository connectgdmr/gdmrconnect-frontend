import React, { useState, useEffect } from "react";
import { FaTimes, FaGift, FaPhone, FaEdit, FaCheckCircle, FaBuilding, FaBriefcase, FaEnvelope } from "react-icons/fa";

export default function ProfilePanel({ user, token, api, isOpen, onClose }) {
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone]       = useState("");
  const [bio, setBio]           = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
    fetch(`${baseUrl}/api/my/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setBirthday(data.birthday || "");
          setPhone(data.phone || "");
          setBio(data.bio || "");
        }
      })
      .catch(() => {});
  }, [isOpen, token, api]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/my/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ birthday, phone, bio }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {}
    finally { setSaving(false); }
  }

  if (!isOpen) return null;

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : user?.department || "";

  return (
    <>
      <div className="profile-panel-overlay" onClick={onClose} />
      <div className="profile-panel open">

        {/* Header */}
        <div className="profile-panel-header">
          <h3 style={{ margin: 0, fontSize: 17, color: "#0f172a" }}>My Profile</h3>
          <button className="profile-panel-close" onClick={onClose}>
            <FaTimes size={14} />
          </button>
        </div>

        {/* Avatar + Info */}
        <div className="profile-panel-hero">
          <div className="profile-panel-avatar">
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div className="profile-panel-name">{user?.name}</div>
            <div className="profile-panel-role">{roleLabel}</div>
          </div>
        </div>

        {/* Info Row */}
        <div className="profile-panel-info-row">
          {user?.email && (
            <div className="profile-info-item">
              <FaEnvelope size={11} style={{ color: "#6366f1", flexShrink: 0 }} />
              <span>{user.email}</span>
            </div>
          )}
          {user?.department && (
            <div className="profile-info-item">
              <FaBuilding size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span>{user.department}</span>
            </div>
          )}
          {user?.position && (
            <div className="profile-info-item">
              <FaBriefcase size={11} style={{ color: "#22c55e", flexShrink: 0 }} />
              <span>{user.position}</span>
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div className="profile-panel-body">
          <div className="profile-section-label">Personal Information</div>

          <form onSubmit={saveProfile}>
            <div className="profile-field">
              <label className="profile-label">
                <FaGift size={12} style={{ color: "#f59e0b", marginRight: 6 }} />
                Date of Birth
              </label>
              <input
                type="date"
                className="modern-input"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
              />
              <span className="profile-hint">
                Your team will be notified on your birthday
              </span>
            </div>

            <div className="profile-field">
              <label className="profile-label">
                <FaPhone size={12} style={{ color: "#6366f1", marginRight: 6 }} />
                Phone Number
              </label>
              <input
                type="tel"
                className="modern-input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="profile-field">
              <label className="profile-label">
                <FaEdit size={12} style={{ color: "#22c55e", marginRight: 6 }} />
                Bio / About Me
              </label>
              <textarea
                className="modern-input"
                style={{ minHeight: 80, resize: "vertical" }}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A short description about yourself..."
              />
            </div>

            <button
              type="submit"
              className="btn"
              style={{
                width: "100%",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: saved ? "#22c55e" : undefined,
              }}
              disabled={saving}
            >
              {saved ? (
                <><FaCheckCircle /> Saved!</>
              ) : saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
