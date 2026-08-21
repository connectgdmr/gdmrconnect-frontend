import React, { useState, useEffect, useCallback } from "react";
import {
  TbMail, TbLock, TbPlus, TbX, TbSend, TbArrowLeft, TbRefresh,
  TbLogout, TbPaperclip, TbExternalLink,
} from "react-icons/tb";

/**
 * GDMR Connect — Personal Mail
 * Every user connects their own Gmail via an App Password (Google Account →
 * Security → App Passwords, requires 2-Step Verification) and sends/reads
 * mail as themselves — routes/mail.py talks to Gmail's own IMAP/SMTP, not
 * the Google API. Purely personal: nobody sees anyone else's inbox.
 *
 * Props: { token, api }
 */

const PAGE_SIZE = 25;

function initials(name) {
  const n = (name || "?").trim();
  const p = n.split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || n[0]?.toUpperCase() || "?";
}
const AVATAR_COLORS = ["#007D88", "#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#65a30d"];
function colorFor(key) {
  const k = key || "";
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function fmtDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Mail({ token, api }) {
  const [status, setStatus] = useState(null); // {connected, email} | null while loading
  const [statusLoading, setStatusLoading] = useState(true);

  // Connect form
  const [connectEmail, setConnectEmail] = useState("");
  const [connectPassword, setConnectPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  // Inbox
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState("");

  // Detail
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pane, setPane] = useState("list"); // mobile: "list" | "thread"

  // Compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({ to: "", cc: "", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState({ text: "", type: "" });

  const flashSend = (text, type = "success") => { setSendMsg({ text, type }); setTimeout(() => setSendMsg({ text: "", type: "" }), 3500); };

  const loadStatus = useCallback(() => {
    setStatusLoading(true);
    api.mailStatus(token).then(setStatus).catch(() => setStatus({ connected: false })).finally(() => setStatusLoading(false));
  }, [api, token]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const loadInbox = useCallback((newOffset = 0) => {
    setInboxLoading(true);
    setInboxError("");
    api.mailInbox(PAGE_SIZE, newOffset, token)
      .then(d => { setMessages(d.messages || []); setTotal(d.total || 0); setOffset(newOffset); })
      .catch(err => setInboxError(err.message || "Failed to load inbox."))
      .finally(() => setInboxLoading(false));
  }, [api, token]);

  useEffect(() => { if (status?.connected) loadInbox(0); }, [status?.connected, loadInbox]);

  async function handleConnect(e) {
    e.preventDefault();
    setConnecting(true);
    setConnectError("");
    try {
      await api.mailConnect(connectEmail.trim(), connectPassword.trim(), token);
      setConnectPassword("");
      loadStatus();
    } catch (err) {
      setConnectError(err.message || "Failed to connect Gmail.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect your Gmail account? You can reconnect any time.")) return;
    try {
      await api.mailDisconnect(token);
      setStatus({ connected: false });
      setMessages([]); setSelected(null); setDetail(null);
    } catch (err) {
      alert(err.message || "Failed to disconnect.");
    }
  }

  async function openMessage(m) {
    setSelected(m);
    setPane("thread");
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await api.mailMessage(m.uid, token);
      setDetail(d);
      // reflect read state locally without a full refetch
      setMessages(list => list.map(x => x.uid === m.uid ? { ...x, unread: false } : x));
    } catch (err) {
      setDetail({ error: err.message || "Failed to load message." });
    } finally {
      setDetailLoading(false);
    }
  }

  function openCompose(prefill = {}) {
    setComposeForm({ to: "", cc: "", subject: "", body: "", ...prefill });
    setComposeOpen(true);
  }

  function replyTo(d) {
    if (!d || d.error) return;
    openCompose({
      to: d.from_addr || "",
      subject: (d.subject || "").toLowerCase().startsWith("re:") ? d.subject : `Re: ${d.subject || ""}`,
      body: `\n\n---- On ${d.date}, ${d.from_name || d.from_addr} wrote ----\n${(d.body_plain || "").slice(0, 500)}`,
    });
  }

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api.mailSend(composeForm, token);
      setComposeOpen(false);
      flashSend("Email sent.");
    } catch (err) {
      flashSend(err.message || "Failed to send.", "error");
    } finally {
      setSending(false);
    }
  }

  if (statusLoading) {
    return <div className="card" style={{ textAlign: "center", padding: 50, color: "#94a3b8" }}>Loading…</div>;
  }

  // ── Not connected — show the connect form ──────────────────────────────
  if (!status?.connected) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: "24px auto", padding: 28 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <TbMail size={26} />
          </div>
          <h3 style={{ margin: 0, color: "var(--brand)" }}>Connect Your Gmail</h3>
          <p className="small" style={{ margin: "6px 0 0", color: "#64748b" }}>
            Send and read mail as yourself, right from GDMR Connect.
          </p>
        </div>

        <form onSubmit={handleConnect}>
          <div style={{ marginBottom: 14 }}>
            <label className="modern-label">Gmail Address</label>
            <input className="modern-input" type="email" required placeholder="you@gmail.com" value={connectEmail} onChange={e => setConnectEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label className="modern-label">App Password</label>
            <input className="modern-input" type="password" required placeholder="16-character app password" value={connectPassword} onChange={e => setConnectPassword(e.target.value)} />
          </div>
          <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.5 }}>
            <TbLock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
            Not your normal Gmail password. Turn on 2-Step Verification, then generate one at{" "}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>
              myaccount.google.com/apppasswords <TbExternalLink size={10} style={{ verticalAlign: -1 }} />
            </a>. Stored encrypted — never shown again after saving.
          </p>
          {connectError && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--error-bg)", color: "var(--error)", border: "1px solid var(--error-border)", borderRadius: 8, fontSize: 12.5 }}>
              {connectError}
            </div>
          )}
          <button type="submit" className="btn" style={{ width: "100%" }} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect Gmail"}
          </button>
        </form>
      </div>
    );
  }

  // ── Connected — inbox + detail ──────────────────────────────────────────
  return (
    <div className="mail-wrap" data-pane={pane}>
      <style>{`
        .mail-wrap { display: grid; grid-template-columns: 340px 1fr; gap: 0; height: calc(100vh - 140px); min-height: 480px; background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--slate-200); overflow: hidden; margin-top: 12px; }
        .mail-rail { display: flex; flex-direction: column; border-right: 1px solid var(--slate-200); min-width: 0; }
        .mail-rail-head { padding: 14px 16px; border-bottom: 1px solid var(--slate-100); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .mail-rail-list { flex: 1; overflow-y: auto; }
        .mail-item { display: flex; gap: 10px; align-items: flex-start; width: 100%; padding: 12px 16px; border: none; background: none; text-align: left; cursor: pointer; border-bottom: 1px solid var(--slate-50); }
        .mail-item:hover { background: var(--slate-50); }
        .mail-item.active { background: var(--brand-light); }
        .mail-item.unread .mail-item-subject, .mail-item.unread .mail-item-from { font-weight: 700; color: var(--slate-900); }
        .mail-item-body { flex: 1; min-width: 0; }
        .mail-item-top { display: flex; justify-content: space-between; gap: 6px; }
        .mail-item-from { font-size: 13px; color: var(--slate-700); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mail-item-date { font-size: 11px; color: var(--slate-400); flex-shrink: 0; }
        .mail-item-subject { font-size: 12.5px; color: var(--slate-600); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        .mail-thread { display: flex; flex-direction: column; min-width: 0; }
        .mail-thread-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: #94a3b8; flex-direction: column; gap: 10px; }
        .mail-thread-head { padding: 16px 22px; border-bottom: 1px solid var(--slate-100); display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .mail-thread-body { flex: 1; overflow-y: auto; padding: 22px; }
        .mail-back { display: none; }
        @media (max-width: 820px) {
          .mail-wrap { grid-template-columns: 1fr; height: calc(100vh - 120px); }
          .mail-wrap[data-pane="list"] .mail-thread { display: none; }
          .mail-wrap[data-pane="thread"] .mail-rail { display: none; }
          .mail-back { display: inline-flex; }
        }
      `}</style>

      {/* ── Rail ── */}
      <aside className="mail-rail">
        <div className="mail-rail-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <TbMail color="var(--brand)" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Inbox</div>
              <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{status.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button type="button" onClick={() => loadInbox(offset)} title="Refresh" style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 6 }}><TbRefresh size={16} /></button>
            <button type="button" onClick={() => openCompose()} title="Compose" style={{ background: "var(--brand)", border: "none", borderRadius: 6, cursor: "pointer", color: "#fff", padding: 6 }}><TbPlus size={16} /></button>
            <button type="button" onClick={handleDisconnect} title="Disconnect Gmail" style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 6 }}><TbLogout size={16} /></button>
          </div>
        </div>

        <div className="mail-rail-list">
          {inboxLoading && <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading inbox…</div>}
          {!inboxLoading && inboxError && <div style={{ padding: 20, textAlign: "center", color: "var(--error)", fontSize: 12.5 }}>{inboxError}</div>}
          {!inboxLoading && !inboxError && messages.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No messages.</div>
          )}
          {messages.map(m => (
            <button key={m.uid} className={`mail-item ${m.unread ? "unread" : ""} ${selected?.uid === m.uid ? "active" : ""}`} onClick={() => openMessage(m)}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: colorFor(m.from_addr), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {initials(m.from_name)}
              </div>
              <div className="mail-item-body">
                <div className="mail-item-top">
                  <span className="mail-item-from">{m.from_name || m.from_addr}</span>
                  <span className="mail-item-date">{fmtDate(m.date)}</span>
                </div>
                <div className="mail-item-subject">{m.subject}</div>
              </div>
              {m.unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand)", flexShrink: 0, marginTop: 6 }} />}
            </button>
          ))}
        </div>

        {total > PAGE_SIZE && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderTop: "1px solid var(--slate-100)", fontSize: 12, color: "#64748b" }}>
            <button type="button" className="btn-small ghost" disabled={offset === 0} onClick={() => loadInbox(Math.max(0, offset - PAGE_SIZE))}>Newer</button>
            <span>{offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
            <button type="button" className="btn-small ghost" disabled={offset + PAGE_SIZE >= total} onClick={() => loadInbox(offset + PAGE_SIZE)}>Older</button>
          </div>
        )}
      </aside>

      {/* ── Thread / detail ── */}
      <section className="mail-thread">
        {!selected ? (
          <div className="mail-thread-empty">
            <TbMail size={40} style={{ opacity: 0.25 }} />
            <div>Select a message to read it</div>
          </div>
        ) : (
          <>
            <div className="mail-thread-head">
              <button type="button" className="mail-back" onClick={() => setPane("list")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", marginRight: 4 }}><TbArrowLeft size={18} /></button>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{detail?.subject || selected.subject}</div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                  {(detail?.from_name || selected.from_name) || (detail?.from_addr || selected.from_addr)} · {fmtDate(detail?.date || selected.date)}
                </div>
              </div>
              {detail && !detail.error && (
                <button type="button" className="btn-small ghost" onClick={() => replyTo(detail)} style={{ flexShrink: 0 }}>Reply</button>
              )}
            </div>
            <div className="mail-thread-body">
              {detailLoading && <div style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>Loading…</div>}
              {!detailLoading && detail?.error && <div style={{ color: "var(--error)", fontSize: 13 }}>{detail.error}</div>}
              {!detailLoading && detail && !detail.error && (
                <>
                  {detail.attachments?.length > 0 && (
                    <div style={{ marginBottom: 14, fontSize: 12, color: "#64748b", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {detail.attachments.map((a, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--slate-50)", border: "1px solid var(--slate-200)", borderRadius: 6, padding: "4px 8px" }}>
                          <TbPaperclip size={11} /> {a}
                        </span>
                      ))}
                    </div>
                  )}
                  {detail.body_html ? (
                    <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: detail.body_html }} />
                  ) : (
                    <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{detail.body_plain || "(no content)"}</div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Compose modal ── */}
      {composeOpen && (
        <div className="modal-overlay" onClick={() => setComposeOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--slate-100)" }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>New Message</h3>
              <button type="button" onClick={() => setComposeOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><TbX size={18} /></button>
            </div>
            <form onSubmit={handleSend} style={{ padding: 22 }}>
              <div style={{ marginBottom: 12 }}>
                <label className="modern-label">To</label>
                <input className="modern-input" type="text" required placeholder="someone@example.com" value={composeForm.to} onChange={e => setComposeForm({ ...composeForm, to: e.target.value })} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="modern-label">Cc (optional)</label>
                <input className="modern-input" type="text" value={composeForm.cc} onChange={e => setComposeForm({ ...composeForm, cc: e.target.value })} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="modern-label">Subject</label>
                <input className="modern-input" type="text" required value={composeForm.subject} onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="modern-label">Message</label>
                <textarea className="modern-input" required style={{ minHeight: 160, resize: "vertical" }} value={composeForm.body} onChange={e => setComposeForm({ ...composeForm, body: e.target.value })} />
              </div>
              {sendMsg.text && (
                <div style={{ marginBottom: 14, fontSize: 12.5, padding: "8px 12px", borderRadius: 8, background: sendMsg.type === "error" ? "var(--error-bg)" : "var(--success-bg)", color: sendMsg.type === "error" ? "var(--error)" : "var(--success)" }}>
                  {sendMsg.text}
                </div>
              )}
              <button type="submit" className="btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} disabled={sending}>
                <TbSend size={14} /> {sending ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
