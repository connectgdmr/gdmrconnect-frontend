import React, { useState } from "react";
import { API_URL } from "../api";

// Admin / owner: find out why emails (password resets, reminders, reports) are not arriving, and send a test mail to yourself.
export default function EmailCheck({ token }) {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  async function run(method) {
    setBusy(method); setErr(""); setRes(null);
    try {
      const r = await fetch(`${API_URL}/admin/email-diagnostics`, { method, headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d.message || `Error ${r.status}`); else setRes(d);
    } catch { setErr("Could not reach the server."); } finally { setBusy(""); }
  }
  return (
    <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border, #e2e8f0)" }}>
      <h4 style={{ margin: "0 0 4px" }}>Email sending</h4>
      <p className="small" style={{ margin: "0 0 10px", color: "#64748b" }}>Emails (password resets, reminders, reports) go out through Brevo. Check the set-up, or send a test to your own inbox.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn ghost" type="button" disabled={!!busy} onClick={() => run("GET")}>{busy === "GET" ? "Checking…" : "Check set-up"}</button>
        <button className="btn" type="button" disabled={!!busy} onClick={() => run("POST")}>{busy === "POST" ? "Sending…" : "Send test email to me"}</button>
      </div>
      {err && <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>{err}</div>}
      {res && (
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55 }}>
          {res.test && (
            <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 8, background: res.test.ok ? "#f0fdf4" : "#fef2f2", color: res.test.ok ? "#166534" : "#991b1b" }}>
              {res.test.ok ? `Test email accepted by Brevo and sent to ${res.test.sent_to}. Check the inbox (and spam).` : `Brevo did not send it${res.test.brevo?.status ? ` (status ${res.test.brevo.status})` : ""}: ${res.test.brevo?.detail || "unknown error"}`}
            </div>
          )}
          <div><b>Sender:</b> {res.sender} · <b>API key:</b> {res.api_key_set ? "set" : "missing"}{res.account ? ` · Brevo plan: ${res.account.plan}${res.account.credits != null ? `, ${res.account.credits} credits` : ""}` : ""}</div>
          <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>{res.findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
          {res.verified_senders?.length > 0 && <div className="small" style={{ marginTop: 6, color: "#64748b" }}>Senders in Brevo: {res.verified_senders.map(s => `${s.email}${s.active ? "" : " (not verified)"}`).join(", ")}</div>}
        </div>
      )}
    </div>
  );
}
