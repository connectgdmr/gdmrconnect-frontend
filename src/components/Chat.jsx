import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaSearch, FaPaperPlane, FaHashtag, FaArrowLeft, FaPlus, FaTimes,
  FaUsers, FaCommentDots, FaCheck, FaCircle
} from "react-icons/fa";

/**
 * GDMR Connect — Team Chat (Slack-style messenger)
 * A self-contained internal messaging module shared by every role
 * (admin / manager / employee). Supports direct messages + channels,
 * with lightweight polling for near-real-time delivery.
 *
 * Props: { token, api, user }
 */

const BASE = (api) => (api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app");

// Deterministic avatar colour from a name/id
const AVATAR_COLORS = ["#34a06a", "#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#65a30d"];
function colorFor(key = "") {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "?") {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

function Avatar({ name, size = 38, isChannel = false }) {
  const bg = isChannel ? "#1c5249" : colorFor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: isChannel ? 10 : "50%", background: bg,
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    }}>
      {isChannel ? <FaHashtag size={size * 0.42} /> : initials(name)}
    </div>
  );
}

// ── time helpers ──────────────────────────────────────────────
function fmtTime(ts) {
  const d = new Date(ts);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(ts) {
  const d = new Date(ts); if (isNaN(d)) return "";
  const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtListTime(ts) {
  const d = new Date(ts); if (isNaN(d)) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return fmtTime(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// ── fetch helpers ─────────────────────────────────────────────
// Tolerant JSON parse — a 200/201 with an empty or non-JSON body is a success,
// not an error (this previously made successfully-sent messages look failed).
async function safeJson(r) { try { return await r.json(); } catch { return {}; } }

async function jget(api, token, path) {
  const r = await fetch(`${BASE(api)}/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const d = await safeJson(r);
  if (!r.ok) throw new Error(d?.message || `Request failed (${r.status})`);
  return d;
}
async function jpost(api, token, path, body) {
  const r = await fetch(`${BASE(api)}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  });
  const d = await safeJson(r);
  if (!r.ok) throw new Error(d?.message || `Request failed (${r.status})`);
  return d;
}
const arr = (d, ...keys) => {
  if (Array.isArray(d)) return d;
  for (const k of keys) if (Array.isArray(d?.[k])) return d[k];
  return [];
};

export default function Chat({ token, api, user }) {
  const myId = user?._id || user?.id;

  const [people, setPeople]             = useState([]);   // all users I can message
  const [conversations, setConvos]      = useState([]);   // dm + channel convos w/ unread
  const [active, setActive]             = useState(null); // { id, type, title, peerId }
  const [messages, setMessages]         = useState([]);
  const [text, setText]                 = useState("");
  const [search, setSearch]             = useState("");
  const [sending, setSending]           = useState(false);
  const [loadingList, setLoadingList]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [mobilePane, setMobilePane]     = useState("list"); // list | thread (mobile only)
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [error, setError]               = useState("");

  const scrollRef = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  // ── load people + conversation list ───────────────────────────
  const loadList = useCallback(async () => {
    try {
      const [u, c] = await Promise.all([
        jget(api, token, "/chat/users"),
        jget(api, token, "/chat/conversations"),
      ]);
      setPeople(arr(u, "users", "data", "employees", "members").filter(p => (p._id || p.id) !== myId));
      setConvos(arr(c, "conversations", "data"));
      setError("");
    } catch (e) {
      setError(e.message || "Could not load chats.");
    } finally {
      setLoadingList(false);
    }
  }, [api, token, myId]);

  useEffect(() => {
    loadList();
    const id = setInterval(loadList, 8000);
    return () => clearInterval(id);
  }, [loadList]);

  // ── load messages for active conversation + poll ──────────────
  const loadMessages = useCallback(async (convId, showSpinner) => {
    if (!convId) return;
    if (showSpinner) setLoadingMsgs(true);
    try {
      const d = await jget(api, token, `/chat/conversations/${convId}/messages`);
      // only apply if this is still the open conversation
      if (activeRef.current?.id === convId) setMessages(arr(d, "messages"));
    } catch { /* keep last messages on transient errors */ }
    finally { if (showSpinner) setLoadingMsgs(false); }
  }, [api, token]);

  useEffect(() => {
    if (!active?.id) return;
    loadMessages(active.id, true);
    // mark read + refresh unread badges
    jpost(api, token, `/chat/conversations/${active.id}/read`).catch(() => {});
    setConvos(cs => cs.map(c => c._id === active.id ? { ...c, unread: 0 } : c));
    const id = setInterval(() => loadMessages(active.id, false), 4000);
    return () => clearInterval(id);
  }, [active?.id, loadMessages, api, token]);

  // autoscroll to newest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, active?.id]);

  // ── derive channel + dm lists ─────────────────────────────────
  const ts = (v) => (v ? new Date(v).getTime() || 0 : 0);
  const channels = conversations.filter(c => c.type === "channel");
  const dmConvos = conversations.filter(c => c.type === "dm");
  const dmFor = (uid) => dmConvos.find(c => (c.members || c.participants || []).some(m => (m._id || m.id || m) === uid));

  const q = search.trim().toLowerCase();
  // Sort so the most recent / unread conversations bubble to the top.
  const filteredChannels = channels
    .filter(c => !q || (c.name || "").toLowerCase().includes(q))
    .sort((a, b) => ts(b.last_at) - ts(a.last_at));
  const filteredPeople = people
    .filter(p => !q || (p.name || "").toLowerCase().includes(q) || (p.department || "").toLowerCase().includes(q))
    .sort((a, b) => {
      const ca = dmFor(a._id || a.id), cb = dmFor(b._id || b.id);
      const d = ts(cb?.last_at) - ts(ca?.last_at);
      if (d !== 0) return d;                       // recent chats first
      return (a.name || "").localeCompare(b.name || ""); // then alphabetical
    });

  // ── open a DM (create if needed) / channel ────────────────────
  async function openPerson(p) {
    const uid = p._id || p.id;
    setError("");
    const existing = dmFor(uid);
    if (existing) {
      setActive({ id: existing._id, type: "dm", title: p.name, peerId: uid });
      setMobilePane("thread");
      return;
    }
    try {
      const d = await jpost(api, token, "/chat/dm", { user_id: uid });
      const conv = d.conversation || d;
      setConvos(cs => cs.some(c => c._id === conv._id) ? cs : [conv, ...cs]);
      setActive({ id: conv._id, type: "dm", title: p.name, peerId: uid });
      setMobilePane("thread");
    } catch (e) { setError(e.message || "Could not open conversation."); }
  }
  function openChannel(c) {
    setActive({ id: c._id, type: "channel", title: c.name });
    setMobilePane("thread");
  }

  // ── send message ──────────────────────────────────────────────
  async function send(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !active?.id || sending) return;
    setSending(true);
    // optimistic
    const optimistic = {
      _id: `tmp-${Date.now()}`, sender_id: myId, sender_name: user?.name || "You",
      text: body, created_at: new Date().toISOString(), pending: true,
    };
    setMessages(m => [...m, optimistic]);
    setText("");
    try {
      await jpost(api, token, `/chat/conversations/${active.id}/messages`, { text: body });
      loadMessages(active.id, false);
      loadList();
    } catch (err) {
      setMessages(m => m.map(x => x._id === optimistic._id ? { ...x, failed: true, pending: false } : x));
      setError(err.message || "Message failed to send.");
    } finally { setSending(false); }
  }

  function onComposerKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // ── render: group messages with date dividers ─────────────────
  function renderMessages() {
    if (loadingMsgs) return <div className="gchat-empty"><div className="loader" /></div>;
    if (!messages.length) return (
      <div className="gchat-empty">
        <FaCommentDots size={34} color="#cbd5e1" />
        <p>No messages yet — say hello 👋</p>
      </div>
    );
    let lastDay = null, lastSender = null, lastTs = 0;
    return messages.map((m) => {
      const sid = m.sender_id || m.sender?._id;
      const mine = sid === myId;
      const day = fmtDay(m.created_at);
      const showDay = day !== lastDay; lastDay = day;
      const ts = new Date(m.created_at).getTime();
      const grouped = !showDay && sid === lastSender && (ts - lastTs) < 5 * 60 * 1000;
      lastSender = sid; lastTs = ts;
      return (
        <React.Fragment key={m._id}>
          {showDay && <div className="gchat-day"><span>{day}</span></div>}
          <div className={`gchat-row ${mine ? "mine" : ""}`}>
            {!mine && (grouped
              ? <div style={{ width: 32, flexShrink: 0 }} />
              : <Avatar name={m.sender_name || "?"} size={32} />)}
            <div className="gchat-bubble-wrap">
              {!mine && !grouped && <div className="gchat-sender">{m.sender_name || "Member"}</div>}
              <div className={`gchat-bubble ${mine ? "mine" : ""} ${m.failed ? "failed" : ""}`}>
                {m.text}
                <span className="gchat-bubble-time">
                  {fmtTime(m.created_at)}
                  {mine && (m.pending ? " · sending…" : m.failed ? " · failed" : <FaCheck size={9} style={{ marginLeft: 4, opacity: 0.7 }} />)}
                </span>
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  }

  return (
    <div className={`gchat ${active ? "has-active" : ""}`} data-pane={mobilePane}>
      <ChatStyles />

      {/* ── Left rail ── */}
      <aside className="gchat-rail">
        <div className="gchat-rail-head">
          <h3>Messages</h3>
          <button className="gchat-new-btn" title="New channel" onClick={() => setShowNewChannel(true)}>
            <FaPlus size={12} />
          </button>
        </div>
        <div className="gchat-search">
          <FaSearch size={12} />
          <input placeholder="Search people or channels" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="gchat-rail-scroll">
          {loadingList ? (
            <div className="gchat-empty small"><div className="loader" /></div>
          ) : (
            <>
              {/* Channels */}
              <div className="gchat-section-label"><FaUsers size={10} /> Channels</div>
              {filteredChannels.length === 0 && <div className="gchat-rail-hint">No channels yet</div>}
              {filteredChannels.map(c => (
                <button key={c._id} className={`gchat-item ${active?.id === c._id ? "active" : ""}`} onClick={() => openChannel(c)}>
                  <Avatar name={c.name} size={38} isChannel />
                  <div className="gchat-item-body">
                    <div className="gchat-item-top">
                      <span className="gchat-item-name">{c.name}</span>
                      {c.last_at && <span className="gchat-item-time">{fmtListTime(c.last_at)}</span>}
                    </div>
                    <div className="gchat-item-sub">{c.last_message || `${(c.members || []).length} members`}</div>
                  </div>
                  {c.unread > 0 && <span className="gchat-unread">{c.unread}</span>}
                </button>
              ))}

              {/* Direct messages */}
              <div className="gchat-section-label"><FaCommentDots size={10} /> Direct Messages</div>
              {filteredPeople.length === 0 && <div className="gchat-rail-hint">No people found</div>}
              {filteredPeople.map(p => {
                const uid = p._id || p.id;
                const conv = dmFor(uid);
                return (
                  <button key={uid} className={`gchat-item ${active?.peerId === uid ? "active" : ""}`} onClick={() => openPerson(p)}>
                    <Avatar name={p.name} size={38} />
                    <div className="gchat-item-body">
                      <div className="gchat-item-top">
                        <span className="gchat-item-name">{p.name}</span>
                        {conv?.last_at && <span className="gchat-item-time">{fmtListTime(conv.last_at)}</span>}
                      </div>
                      <div className="gchat-item-sub">{conv?.last_message || (p.role ? p.role : p.department) || "Start a conversation"}</div>
                    </div>
                    {conv?.unread > 0 && <span className="gchat-unread">{conv.unread}</span>}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </aside>

      {/* ── Thread pane ── */}
      <section className="gchat-thread">
        {!active ? (
          <div className="gchat-placeholder">
            <FaCommentDots size={48} color="#cbd5e1" />
            <h3>Your conversations</h3>
            <p>Select a person or channel to start messaging your team.</p>
          </div>
        ) : (
          <>
            <header className="gchat-thread-head">
              <button className="gchat-back" onClick={() => { setActive(null); setMobilePane("list"); }}>
                <FaArrowLeft />
              </button>
              <Avatar name={active.title} size={36} isChannel={active.type === "channel"} />
              <div>
                <div className="gchat-thread-title">{active.type === "channel" ? `#${active.title}` : active.title}</div>
                <div className="gchat-thread-sub">
                  {active.type === "channel" ? "Channel" : <><FaCircle size={7} color="#34a06a" /> Direct message</>}
                </div>
              </div>
            </header>

            <div className="gchat-messages" ref={scrollRef}>
              {renderMessages()}
            </div>

            {error && <div className="gchat-error">{error}</div>}

            <form className="gchat-composer" onSubmit={send}>
              <textarea
                rows={1}
                placeholder={`Message ${active.type === "channel" ? "#" + active.title : active.title}`}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={onComposerKey}
              />
              <button type="submit" className="gchat-send" disabled={!text.trim() || sending}>
                <FaPaperPlane size={14} />
              </button>
            </form>
          </>
        )}
      </section>

      {/* ── New channel modal ── */}
      {showNewChannel && (
        <NewChannelModal
          api={api} token={token} people={people}
          onClose={() => setShowNewChannel(false)}
          onCreated={(conv) => {
            setShowNewChannel(false);
            setConvos(cs => [conv, ...cs]);
            setActive({ id: conv._id, type: "channel", title: conv.name });
            setMobilePane("thread");
          }}
        />
      )}
    </div>
  );
}

// ── New channel modal ──────────────────────────────────────────
function NewChannelModal({ api, token, people, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const toggle = (id) => setMembers(m => m.includes(id) ? m.filter(x => x !== id) : [...m, id]);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return setErr("Channel name is required.");
    setSaving(true); setErr("");
    try {
      const d = await jpost(api, token, "/chat/channels", { name: name.trim(), members });
      onCreated(d.conversation || d);
    } catch (e) { setErr(e.message || "Could not create channel."); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "var(--brand)", fontSize: 17 }}>Create a Channel</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><FaTimes /></button>
        </div>
        {err && <div className="gchat-error" style={{ marginBottom: 12 }}>{err}</div>}
        <form onSubmit={create}>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 6 }}>Channel name</label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <FaHashtag size={12} style={{ position: "absolute", left: 12, top: 13, color: "#94a3b8" }} />
            <input className="modern-input" style={{ paddingLeft: 30 }} placeholder="e.g. design-team" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 6 }}>
            Add members <span style={{ fontWeight: 400, color: "#94a3b8" }}>({members.length} selected)</span>
          </label>
          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e6eaef", borderRadius: 10, padding: 6 }}>
            {people.length === 0 && <div className="gchat-rail-hint">No people available</div>}
            {people.map(p => {
              const id = p._id || p.id;
              const on = members.includes(id);
              return (
                <button type="button" key={id} onClick={() => toggle(id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                    background: on ? "#f0fdf4" : "transparent", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left",
                  }}>
                  <Avatar name={p.name} size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.role || p.department || ""}</div>
                  </div>
                  {on ? <FaCheck color="#16a34a" /> : <span style={{ width: 16, height: 16, border: "1.5px solid #cbd5e1", borderRadius: 4 }} />}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
            <button className="btn" type="submit" disabled={saving} style={{ background: "var(--brand)" }}>
              {saving ? "Creating…" : "Create Channel"}
            </button>
            <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Scoped styles ──────────────────────────────────────────────
function ChatStyles() {
  return (
    <style>{`
      .gchat { display:grid; grid-template-columns: 320px 1fr; height: calc(100vh - 140px); min-height: 520px;
        background:#fff; border:1px solid #e6eaef; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(16,40,30,0.05); }
      .gchat-rail { border-right:1px solid #eef1f4; display:flex; flex-direction:column; background:#fafbfc; min-width:0; min-height:0; overflow:hidden; }
      .gchat-rail-head { display:flex; align-items:center; justify-content:space-between; padding:16px 16px 10px; }
      .gchat-rail-head h3 { margin:0; font-size:18px; color:#0f172a; }
      .gchat-new-btn { width:30px; height:30px; border-radius:8px; border:none; background:var(--brand); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; }
      .gchat-search { display:flex; align-items:center; gap:8px; margin:0 14px 10px; padding:8px 12px; background:#fff; border:1px solid #e6eaef; border-radius:10px; color:#94a3b8; }
      .gchat-search input { border:none; outline:none; flex:1; font-size:13px; background:transparent; color:#0f172a; }
      .gchat-rail-scroll { flex:1; min-height:0; overflow-y:auto; padding-bottom:12px; }
      .gchat-section-label { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8; padding:14px 16px 6px; }
      .gchat-rail-hint { font-size:12px; color:#b6c0cc; padding:4px 16px 8px; }
      .gchat-item { width:100%; display:flex; align-items:center; gap:11px; padding:9px 14px; background:none; border:none; cursor:pointer; text-align:left; transition:background .12s; }
      .gchat-item:hover { background:#f1f5f4; }
      .gchat-item.active { background:#e7f5ee; }
      .gchat-item-body { flex:1; min-width:0; }
      .gchat-item-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .gchat-item-name { font-size:13.5px; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .gchat-item-time { font-size:10.5px; color:#b6c0cc; flex-shrink:0; }
      .gchat-item-sub { font-size:12px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
      .gchat-unread { background:var(--brand); color:#fff; font-size:11px; font-weight:700; min-width:19px; height:19px; border-radius:10px; display:flex; align-items:center; justify-content:center; padding:0 5px; flex-shrink:0; }

      .gchat-thread { display:flex; flex-direction:column; min-width:0; min-height:0; overflow:hidden; background:#fff; }
      .gchat-placeholder { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:#94a3b8; text-align:center; padding:24px; }
      .gchat-placeholder h3 { margin:8px 0 0; color:#475569; }
      .gchat-placeholder p { margin:0; font-size:13px; }
      .gchat-thread-head { display:flex; align-items:center; gap:12px; padding:12px 18px; border-bottom:1px solid #eef1f4; }
      .gchat-thread-title { font-size:15px; font-weight:700; color:#0f172a; }
      .gchat-thread-sub { font-size:11.5px; color:#94a3b8; display:flex; align-items:center; gap:5px; margin-top:1px; }
      .gchat-back { display:none; background:none; border:none; cursor:pointer; color:#475569; font-size:16px; }

      .gchat-messages { flex:1; min-height:0; overflow-y:auto; padding:16px 18px; display:flex; flex-direction:column; gap:3px; background:linear-gradient(#fcfdfc,#fafbfc); }
      .gchat-day { text-align:center; margin:14px 0 8px; }
      .gchat-day span { font-size:11px; font-weight:600; color:#94a3b8; background:#eef2f1; padding:3px 12px; border-radius:20px; }
      .gchat-row { display:flex; gap:8px; align-items:flex-end; max-width:78%; }
      .gchat-row.mine { margin-left:auto; flex-direction:row-reverse; }
      .gchat-bubble-wrap { min-width:0; }
      .gchat-sender { font-size:11.5px; font-weight:700; color:#0f766e; margin:0 0 2px 2px; }
      .gchat-bubble { position:relative; padding:8px 12px 8px; border-radius:14px; background:#f1f3f5; color:#0f172a; font-size:13.5px; line-height:1.45; white-space:pre-wrap; word-break:break-word; border-top-left-radius:4px; }
      .gchat-bubble.mine { background:var(--brand); color:#fff; border-top-left-radius:14px; border-top-right-radius:4px; }
      .gchat-bubble.failed { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
      .gchat-bubble-time { display:inline-block; font-size:9.5px; opacity:.65; margin-left:8px; white-space:nowrap; vertical-align:baseline; }

      .gchat-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#94a3b8; font-size:13px; }
      .gchat-empty.small { padding:30px 0; }
      .gchat-error { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; font-size:12.5px; padding:8px 14px; margin:0 18px; border-radius:8px; }

      .gchat-composer { display:flex; align-items:flex-end; gap:10px; padding:12px 16px 14px; border-top:1px solid #eef1f4; }
      .gchat-composer textarea { flex:1; resize:none; border:1px solid #e6eaef; border-radius:12px; padding:11px 14px; font-size:13.5px; font-family:inherit; outline:none; max-height:120px; line-height:1.4; }
      .gchat-composer textarea:focus { border-color:var(--brand); }
      .gchat-send { width:42px; height:42px; border-radius:12px; border:none; background:var(--brand); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:opacity .15s; }
      .gchat-send:disabled { opacity:.45; cursor:default; }

      @media (max-width: 820px) {
        .gchat { grid-template-columns: 1fr; height: calc(100vh - 120px); position:relative; }
        .gchat-rail { border-right:none; }
        .gchat[data-pane="thread"] .gchat-rail { display:none; }
        .gchat[data-pane="list"] .gchat-thread { display:none; }
        .gchat-back { display:inline-flex; align-items:center; }
        .gchat-row { max-width:86%; }
      }
    `}</style>
  );
}
