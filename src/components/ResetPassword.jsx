import React, { useState, useEffect } from "react";
import { TbEye, TbEyeOff, TbCircleCheck } from "react-icons/tb";
import Logo from "../assets/GDMR-LOGO-unit.png";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { API_URL } from "../api";

const STRONG_PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/;

// Opened from the link in the "reset your password" email. The password only
// changes when this form is submitted with a valid, unused, unexpired link.
export default function ResetPassword({ resetToken }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => { document.title = "Reset password — GDMR Connect"; }, []);

  async function submit(e) {
    e.preventDefault(); setErr("");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    if (!STRONG_PW.test(pw)) return setErr("Use at least 8 characters with an uppercase letter, a lowercase letter, a number and a special character.");
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: resetToken, password: pw }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Something went wrong. Please try again.");
      setDone(true);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  const card = { background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 8px 30px rgba(15,23,42,.08)" };
  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <img src={Logo} alt="GDMR" style={{ height: 52, marginBottom: 8 }} />
          <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>GDMR CONNECT</div>
        </div>

        {done ? (
          <div style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 56, color: "#16a34a", display: "flex", justifyContent: "center" }}><TbCircleCheck /></div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>Password changed</div>
            <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.5 }}>You can now log in with your new password. Any other devices that were logged in have been signed out.</p>
            <a href="/" className="btn" style={{ display: "inline-block", textDecoration: "none", marginTop: 8 }}>Go to login</a>
          </div>
        ) : (
          <form onSubmit={submit} style={card}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#0f172a" }}>Choose a new password</h2>
            <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13.5 }}>This link works once and expires 30 minutes after it was sent.</p>
            {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "10px 12px", fontSize: 13.5, marginBottom: 14 }}>{err}</div>}

            <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569" }}>New password</label>
            <div style={{ position: "relative", marginBottom: 6 }}>
              <input className="modern-input" type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" maxLength={128} required style={{ margin: 0, paddingRight: 42 }} />
              <button type="button" onClick={() => setShow(s => !s)} aria-label="Show or hide password" style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}>{show ? <TbEyeOff size={18} /> : <TbEye size={18} />}</button>
            </div>
            <PasswordStrengthMeter password={pw} />

            <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", display: "block", marginTop: 12 }}>Confirm new password</label>
            <input className="modern-input" type={show ? "text" : "password"} value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" maxLength={128} required style={{ margin: 0 }} />

            <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 18, justifyContent: "center" }}>{busy ? "Saving…" : "Change password"}</button>
            <div style={{ textAlign: "center", marginTop: 12 }}><a href="/" style={{ fontSize: 13, color: "#64748b" }}>Back to login</a></div>
          </form>
        )}
      </div>
    </div>
  );
}
