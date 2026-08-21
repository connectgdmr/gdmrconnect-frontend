import React, { useState, useEffect, useRef } from "react";
import { TbX, TbGift, TbPhone, TbEdit, TbCircleCheck, TbBuilding, TbBriefcase, TbMail, TbCamera, TbTrash } from "react-icons/tb";

export default function ProfilePanel({ user, setUser, token, api, isOpen, onClose }) {
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone]       = useState("");
  const [bio, setBio]           = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [photoUrl, setPhotoUrl] = useState(user?.photo_url || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);

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
          setPhotoUrl(data.photo_url || "");
        }
      })
      .catch(() => {});
  }, [isOpen, token, api]);

  // Uploads straight to Cloudinary via the backend (already configured/used
  // for employee documents — see routes/announcements.py's
  // /api/my/profile-picture), then updates both this panel's own photo and
  // the app-wide user object so the sidebar/topbar avatar refresh instantly
  // without needing a re-login.
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setPhotoError("");
    setUploadingPhoto(true);
    try {
      const res = await api.uploadMyProfilePicture(file, token);
      setPhotoUrl(res.photo_url);
      setUser?.(u => u ? { ...u, photo_url: res.photo_url } : u);
    } catch (err) {
      setPhotoError(err?.message || "Could not upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handlePhotoRemove() {
    if (!window.confirm("Remove your profile picture?")) return;
    setPhotoError("");
    try {
      await api.removeMyProfilePicture(token);
      setPhotoUrl("");
      setUser?.(u => u ? { ...u, photo_url: null } : u);
    } catch (err) {
      setPhotoError(err?.message || "Could not remove photo.");
    }
  }

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
            <TbX size={14} />
          </button>
        </div>

        {/* Avatar + Info */}
        <div className="profile-panel-hero">
          <div className="profile-panel-avatar-wrap">
            <div className="profile-panel-avatar" style={photoUrl ? { padding: 0, overflow: "hidden" } : undefined}>
              {photoUrl ? (
                <img src={photoUrl} alt={user?.name || "Profile"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                user?.name?.[0]?.toUpperCase() || "?"
              )}
              {uploadingPhoto && (
                <div className="profile-panel-avatar-loading"><div className="loader" style={{ width: 20, height: 20 }} /></div>
              )}
            </div>
            <button
              type="button"
              className="profile-panel-avatar-edit"
              title={photoUrl ? "Change photo" : "Add a photo"}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              <TbCamera size={12} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div className="profile-panel-name">{user?.name}</div>
            <div className="profile-panel-role">{roleLabel}</div>
            {photoUrl && (
              <button type="button" className="profile-panel-remove-photo" onClick={handlePhotoRemove}>
                <TbTrash size={10} /> Remove photo
              </button>
            )}
          </div>
        </div>
        {photoError && <p className="alert" style={{ marginTop: -6, marginBottom: 12 }}>{photoError}</p>}

        {/* Info Row */}
        <div className="profile-panel-info-row">
          {user?.email && (
            <div className="profile-info-item">
              <TbMail size={11} style={{ color: "var(--brand)", flexShrink: 0 }} />
              <span>{user.email}</span>
            </div>
          )}
          {user?.department && (
            <div className="profile-info-item">
              <TbBuilding size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span>{user.department}</span>
            </div>
          )}
          {user?.position && (
            <div className="profile-info-item">
              <TbBriefcase size={11} style={{ color: "#22c55e", flexShrink: 0 }} />
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
                <TbGift size={12} style={{ color: "#f59e0b", marginRight: 6 }} />
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
                <TbPhone size={12} style={{ color: "var(--brand)", marginRight: 6 }} />
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
                <TbEdit size={12} style={{ color: "#22c55e", marginRight: 6 }} />
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
                <><TbCircleCheck /> Saved!</>
              ) : saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
