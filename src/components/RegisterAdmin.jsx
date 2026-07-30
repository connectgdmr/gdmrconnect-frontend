import React, { useState, useEffect } from "react";
import { FaUserShield, FaTrash } from "react-icons/fa";

const MAX_ADMINS = 3;

export default function RegisterAdmin({ token, api, user }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { text, type }

  const [admins, setAdmins] = useState(null); // null = unknown (endpoint unavailable), [] = known empty
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  async function loadAdmins() {
    setAdminsLoading(true);
    try {
      const list = await api.getAdmins(token);
      setAdmins(Array.isArray(list) ? list : (list?.admins || null));
    } catch {
      setAdmins(null); // backend doesn't support listing admins yet — can't verify the limit
    } finally {
      setAdminsLoading(false);
    }
  }

  useEffect(() => { loadAdmins(); }, []);

  async function deleteAdmin(a) {
    if (!window.confirm(`Delete admin "${a.name}" (${a.email})? This cannot be undone.`)) return;
    setDeletingId(a._id);
    try {
      await api.deleteAdmin(a._id, token);
      loadAdmins();
    } catch (err) {
      setMsg({ text: err?.message || "Failed to delete admin.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  const knownCount = Array.isArray(admins) ? admins.length : null;
  const limitReached = knownCount !== null && knownCount >= MAX_ADMINS;

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (limitReached) {
      setMsg({ text: `Limit reached — only ${MAX_ADMINS} admin accounts are allowed.`, type: "error" });
      return;
    }
    setSaving(true);
    try {
      await api.registerAdmin({ name, email, password }, token);
      setMsg({ text: "Admin account created successfully.", type: "success" });
      setName(""); setEmail(""); setPassword("");
      loadAdmins();
    } catch (err) {
      setMsg({ text: err?.message || "Failed to create admin account.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ color: "var(--brand)", display: "flex", alignItems: "center", gap: 8 }}>
        <FaUserShield /> Create Admin Account
      </h3>
      <p className="small">
        Creates a full admin account with all admin powers and features.
        {knownCount !== null
          ? ` ${knownCount} of ${MAX_ADMINS} admin slots used.`
          : " Admin count could not be verified — ask your backend team to add a way to list admins so this limit can be enforced reliably."}
      </p>

      {msg && (
        <div style={{
          margin: "10px 0", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: msg.type === "error" ? "#fef2f2" : "#f0fdf4",
          color: msg.type === "error" ? "#b91c1c" : "#16a34a",
          border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}`,
        }}>{msg.text}</div>
      )}

      <form onSubmit={submit}>
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div style={{ flex: 1, position: "relative" }}>
            <label>Temporary Password</label>
            <input
              className="input" type={showPassword ? "text" : "password"}
              value={password} onChange={e => setPassword(e.target.value)}
              required minLength={8} style={{ paddingRight: "42px" }}
            />
            <span className="material-icons" onClick={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 10, top: "53%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--brand)" }}>
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </div>
          <div style={{ flex: 1 }} />
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "end" }}>
          <button className="btn" type="submit" disabled={saving || adminsLoading || limitReached}>
            {saving ? "Creating…" : limitReached ? "Admin limit reached" : "Create Admin"}
          </button>
        </div>
      </form>

      {Array.isArray(admins) && admins.length > 0 && (
        <>
          <h3 style={{ color: "var(--brand)", marginTop: 20 }}>Existing Admins</h3>
          <table className="leave-table">
            <thead><tr><th>Name</th><th>Email</th><th style={{ textAlign: "center" }}>Action</th></tr></thead>
            <tbody>
              {admins.map(a => {
                const isSelf = user?.email && a.email && user.email.toLowerCase() === a.email.toLowerCase();
                return (
                  <tr key={a._id || a.email}>
                    <td>{a.name}</td>
                    <td>{a.email}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="icon-btn"
                        onClick={() => deleteAdmin(a)}
                        disabled={isSelf || deletingId === a._id}
                        title={isSelf ? "You can't delete your own account" : "Delete admin"}
                        style={{
                          border: "none", background: "none", borderRadius: 4, padding: 6,
                          cursor: isSelf ? "not-allowed" : "pointer",
                          color: isSelf ? "#cbd5e1" : "#dc2626",
                        }}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
