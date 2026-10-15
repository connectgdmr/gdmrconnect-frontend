import React, { useState, useEffect, useCallback } from "react";
import { TbShieldLock, TbDeviceMobile, TbLogout } from "react-icons/tb";
import { API_URL } from "../api";

// Settings → "Security": two-step verification (authenticator app) and
// "log out of all devices". Lives inside SettingsModal.
export default function MfaSettings({ token }) {
  const [status, setStatus] = useState(null);          // {enabled, backup_codes_left}
  const [setup, setSetup] = useState(null);            // {secret, qr}
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backup, setBackup] = useState(null);          // codes, shown once
  const [disabling, setDisabling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const call = useCallback(async (path, method = "GET", body) => {
    const r = await fetch(`${API_URL}${path}`, {
      method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || "Something went wrong. Please try again.");
    return d;
  }, [token]);

  const load = useCallback(() => { call("/my/mfa/status").then(setStatus).catch(() => setStatus({ enabled: false, backup_codes_left: 0, unavailable: true })); }, [call]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ text: e.message, type: "error" }); } finally { setBusy(false); } };

  const startSetup = () => run(async () => { setSetup(await call("/my/mfa/setup", "POST")); setCode(""); });
  const enable = (e) => { e.preventDefault(); run(async () => {
    const d = await call("/my/mfa/enable", "POST", { code });
    setBackup(d.backup_codes || []); setSetup(null); setCode(""); load();
  }); };
  const disable = (e) => { e.preventDefault(); run(async () => {
    await call("/my/mfa/disable", "POST", { password, code });
    // turning it off ends all sessions on purpose — go back to the login page
    localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("user"); window.location.href = "/";
  }); };
  const logoutAll = () => run(async () => {
    if (!window.confirm("Log out of every device, including this one?")) return;
    await call("/my/logout-all", "POST");
    localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("user"); window.location.href = "/";
  });

  const box = { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc", marginTop: 10 };
  return (
    <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--slate-200, #e2e8f0)" }}>
      <div className="profile-section-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <TbShieldLock size={10} /> Two-step verification
      </div>
      {msg && <div style={{ marginBottom: 10, padding: "9px 13px", borderRadius: 8, fontSize: 12.5, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>{msg.text}</div>}

      {!status ? <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Loading…</div> : backup ? (
        <div style={{ ...box, background: "#fffbea", borderColor: "#f2e48a" }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#5c4a00" }}>Two-step verification is on</div>
          <div style={{ fontSize: 12.5, color: "#6b5600", margin: "6px 0 10px" }}>Save these backup codes somewhere safe. Each works once if you lose your phone. <b>They won't be shown again.</b></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontFamily: "monospace", fontSize: 13 }}>
            {backup.map(c => <div key={c} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 6, padding: "5px 8px", textAlign: "center" }}>{c}</div>)}
          </div>
          <button type="button" className="btn ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={() => navigator.clipboard?.writeText(backup.join("\n"))}>Copy codes</button>
          <button type="button" className="btn" style={{ marginTop: 10, marginLeft: 8, fontSize: 12 }} onClick={() => setBackup(null)}>I've saved them</button>
        </div>
      ) : status.enabled ? (
        <div style={box}>
          <div style={{ fontSize: 13, color: "#15803d", fontWeight: 700 }}>✓ On · {status.backup_codes_left} backup code{status.backup_codes_left === 1 ? "" : "s"} left</div>
          {!disabling ? (
            <button type="button" className="btn ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => { setDisabling(true); setCode(""); setPassword(""); }}>Turn off…</button>
          ) : (
            <form onSubmit={disable} style={{ marginTop: 10 }}>
              <input className="modern-input" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required style={{ margin: "0 0 8px" }} />
              <input className="modern-input" inputMode="text" placeholder="Code from your app (or a backup code)" value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" required style={{ margin: "0 0 8px" }} />
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 8 }}>Turning it off signs you out of all devices.</div>
              <button className="btn" type="submit" disabled={busy} style={{ fontSize: 12 }}>{busy ? "Working…" : "Turn off"}</button>
              <button type="button" className="btn ghost" style={{ fontSize: 12, marginLeft: 8 }} onClick={() => setDisabling(false)}>Cancel</button>
            </form>
          )}
        </div>
      ) : setup ? (
        <form onSubmit={enable} style={box}>
          <div style={{ fontSize: 12.5, color: "#475569", marginBottom: 8 }}><TbDeviceMobile style={{ verticalAlign: "middle" }} /> 1. Scan this code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…).</div>
          <div style={{ textAlign: "center", background: "#fff", borderRadius: 8, padding: 8 }}><img src={setup.qr} alt="Authenticator QR code" style={{ width: 170, height: 170 }} /></div>
          <div style={{ fontSize: 11.5, color: "#64748b", margin: "8px 0", wordBreak: "break-all" }}>Can't scan? Enter this key: <b style={{ fontFamily: "monospace" }}>{setup.secret}</b></div>
          <div style={{ fontSize: 12.5, color: "#475569", marginBottom: 6 }}>2. Type the 6-digit code it shows:</div>
          <input className="modern-input" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" required style={{ margin: "0 0 8px", letterSpacing: 4, textAlign: "center" }} />
          <button className="btn" type="submit" disabled={busy || code.length !== 6} style={{ fontSize: 12 }}>{busy ? "Checking…" : "Turn on"}</button>
          <button type="button" className="btn ghost" style={{ fontSize: 12, marginLeft: 8 }} onClick={() => setSetup(null)}>Cancel</button>
        </form>
      ) : (
        <div style={box}>
          <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.5 }}>Adds a second step at login — a 6-digit code from your phone — so a stolen password alone isn't enough. Recommended for admins and managers.</div>
          <button type="button" className="btn" disabled={busy || status.unavailable} onClick={startSetup} style={{ marginTop: 8, fontSize: 12 }}>Set up</button>
        </div>
      )}

      <button type="button" onClick={logoutAll} disabled={busy} style={{ marginTop: 14, background: "none", border: "none", color: "#b91c1c", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: 0 }}>
        <TbLogout size={14} /> Log out of all devices
      </button>
    </div>
  );
}
