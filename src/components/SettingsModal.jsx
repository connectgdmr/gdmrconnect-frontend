import React, { useState } from "react";
import { FaTimes, FaSun, FaMoon, FaDesktop, FaLock, FaEye, FaEyeSlash, FaCheck } from "react-icons/fa";
import { useTheme, ACCENTS } from "./ThemeContext";
import PasswordStrengthMeter from "./PasswordStrengthMeter";

const THEME_OPTIONS = [
  { key: "light", label: "Light", icon: FaSun },
  { key: "dark", label: "Dark", icon: FaMoon },
  { key: "system", label: "System", icon: FaDesktop },
];

const STRONG_PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function SettingsModal({ token, api, onClose }) {
  const { mode, setMode, accent, setAccent } = useTheme();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { text, type }

  async function submitPassword(e) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg({ text: "New password and confirmation don't match.", type: "error" });
      return;
    }
    if (!STRONG_PW.test(newPassword)) {
      setMsg({ text: "Password needs 8+ characters with an uppercase letter, lowercase letter, number, and special character.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/my/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update password.");
      setMsg({ text: "Password updated successfully.", type: "success" });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setMsg({ text: err.message || "Failed to update password.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 6000 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "94vw", padding: 26, textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "var(--red)" }}>Settings</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate-400)" }}>
            <FaTimes size={16} />
          </button>
        </div>

        {/* ── Appearance ── */}
        <div style={{ marginBottom: 26 }}>
          <div className="profile-section-label" style={{ marginBottom: 10 }}>Appearance</div>
          <div style={{ display: "flex", gap: 8 }}>
            {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key} type="button" onClick={() => setMode(key)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "12px 8px", borderRadius: "var(--radius-md)", cursor: "pointer",
                  border: mode === key ? "1.5px solid var(--brand)" : "1.5px solid var(--slate-200)",
                  background: mode === key ? "var(--brand-light)" : "var(--slate-50)",
                  color: mode === key ? "var(--brand)" : "var(--slate-600)",
                  fontWeight: 600, fontSize: 12.5, fontFamily: "var(--font)",
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 14, marginBottom: 4, fontSize: 12.5, fontWeight: 600, color: "var(--slate-600)" }}>Accent Color</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ACCENTS.map(({ key, label, swatch }) => (
              <button
                key={key} type="button" title={label} onClick={() => setAccent(key)}
                style={{
                  width: 34, height: 34, borderRadius: "50%", cursor: "pointer",
                  background: swatch, display: "flex", alignItems: "center", justifyContent: "center",
                  border: accent === key ? "2.5px solid var(--slate-800)" : "2.5px solid transparent",
                  outline: accent === key ? "2px solid " + swatch : "none",
                  outlineOffset: 2,
                }}
              >
                {accent === key && <FaCheck size={11} color="#fff" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Change Password ── */}
        <div>
          <div className="profile-section-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <FaLock size={10} /> Change Password
          </div>

          {msg && (
            <div style={{
              marginBottom: 12, padding: "9px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 500,
              background: msg.type === "error" ? "var(--error-bg)" : "var(--success-bg)",
              color: msg.type === "error" ? "var(--error)" : "var(--success)",
              border: `1px solid ${msg.type === "error" ? "var(--error-border)" : "var(--success-border)"}`,
            }}>{msg.text}</div>
          )}

          <form onSubmit={submitPassword}>
            <div style={{ marginBottom: 12, position: "relative" }}>
              <label className="modern-label">Current Password</label>
              <input
                className="modern-input" type={showOld ? "text" : "password"}
                value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                required style={{ paddingRight: 40 }}
              />
              <span className="password-toggle-icon" onClick={() => setShowOld((v) => !v)}
                style={{ position: "absolute", right: 12, top: 34 }}>
                {showOld ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              </span>
            </div>

            <div style={{ marginBottom: 4, position: "relative" }}>
              <label className="modern-label">New Password</label>
              <input
                className="modern-input" type={showNew ? "text" : "password"}
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                required style={{ paddingRight: 40 }}
              />
              <span className="password-toggle-icon" onClick={() => setShowNew((v) => !v)}
                style={{ position: "absolute", right: 12, top: 34 }}>
                {showNew ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              </span>
            </div>
            <PasswordStrengthMeter password={newPassword} />

            <div style={{ marginTop: 12, marginBottom: 18 }}>
              <label className="modern-label">Confirm New Password</label>
              <input
                className="modern-input" type={showNew ? "text" : "password"}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
              {saving ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
