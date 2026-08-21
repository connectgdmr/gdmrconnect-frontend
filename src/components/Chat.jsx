import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  TbSearch, TbSend, TbHash, TbArrowLeft, TbPlus, TbX,
  TbUsers, TbMessageDots, TbCheck, TbCircle, TbPencil, TbTrash, TbDotsVertical, TbLogout, TbPhone
} from "react-icons/tb";
import { playNotifSound, showBrowserNotif, requestNotifPermission, prewarmAudio } from "../utils/notifications";
import { useCall, CALL_LOG_PREFIX } from "./CallContext";

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
function colorFor(key) {
  const k = typeof key === "string" ? key : (key ? String(key) : "");
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name) {
  const n = typeof name === "string" ? name : (name ? String(name) : "?");
  const p = n.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

function Avatar({ name, size = 38, isChannel = false, online = false }) {
  const safeName = typeof name === "string" ? name : (name ? String(name) : "");
  const bg = isChannel ? "#1c5249" : colorFor(safeName);
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: isChannel ? 10 : "50%", background: bg,
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: size * 0.38,
      }}>
        {isChannel ? <TbHash size={size * 0.42} /> : initials(safeName)}
      </div>
      {online && !isChannel && (
        <span style={{
          position: "absolute", bottom: 0, right: 0, width: Math.max(9, size * 0.28),
          height: Math.max(9, size * 0.28), borderRadius: "50%", background: "#22c55e",
          border: "2px solid #fff", boxSizing: "border-box",
        }} />
      )}
    </div>
  );
}

// ── time helpers ──────────────────────────────────────────────
// The backend stores timestamps in UTC but often returns them without a
// timezone marker (e.g. "2026-06-25 09:58:00"). new Date() would then read
// them as local time, showing the wrong hour. Parse such strings as UTC so
// they display correctly in the viewer's local timezone.
function toDate(ts) {
  if (ts == null) return new Date(NaN);
  if (typeof ts === "string") {
    const s = ts.trim();
    const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
    const iso = s.includes("T") ? s : s.replace(" ", "T");
    return new Date(hasTz ? iso : iso + "Z");
  }
  return new Date(ts);
}
function fmtTime(ts) {
  const d = toDate(ts);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(ts) {
  const d = toDate(ts); if (isNaN(d)) return "";
  const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtListTime(ts) {
  const d = toDate(ts); if (isNaN(d)) return "";
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
async function jreq(api, token, path, method, body) {
  const r = await fetch(`${BASE(api)}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const d = await safeJson(r);
  if (!r.ok) {
    const err = new Error(d?.message || `Request failed (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return d;
}
const jpost = (api, token, path, body) => jreq(api, token, path, "POST", body || {});
const jput  = (api, token, path, body) => jreq(api, token, path, "PUT", body || {});
const jdel  = (api, token, path) => jreq(api, token, path, "DELETE");
const arr = (d, ...keys) => {
  if (Array.isArray(d)) return d;
  for (const k of keys) if (Array.isArray(d?.[k])) return d[k];
  return [];
};

export default function Chat({ token, api, user }) {
  // Try every field the backend might use for the current user's ID
  const myId = user?._id || user?.id || user?.employee_id || user?.admin_id || user?.manager_id || user?.userId;
  const myIdStr = myId ? String(myId) : "";
  const call = useCall();

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
  const [editingId, setEditingId]       = useState(null);   // message being edited
  const [editText, setEditText]         = useState("");
  const [headerMenu, setHeaderMenu]     = useState(false);   // thread header kebab menu
  const [confirm, setConfirm]           = useState(null);    // { title, message, danger, onConfirm }
  const [toast, setToast]               = useState("");      // transient toast message
  const [msgMenu, setMsgMenu]           = useState(null);    // message id whose action menu is open
  const [onlineIds, setOnlineIds]       = useState(() => new Set()); // online user ids (presence)
  const [typingNames, setTypingNames]   = useState([]);      // peers typing in the active convo
  const [notifPerm, setNotifPerm]       = useState(() => ("Notification" in window ? Notification.permission : "unsupported"));

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const isAdmin = (user?.role || (typeof localStorage !== "undefined" && localStorage.getItem("role"))) === "admin";

  const scrollRef = useRef(null);
  const composerRef = useRef(null); // for auto-resize
  const activeRef = useRef(active);
  activeRef.current = active;
  const lastTypingSent = useRef(0);
  const notifiedMsgIds = useRef(new Set()); // tracks message IDs already handled for sound

  // ── notifications setup ───────────────────────────────────────
  useEffect(() => {
    prewarmAudio(); // pre-warms AudioContext on first user interaction
  }, []);

  // Tell the global background hook which conversation is currently open
  useEffect(() => {
    window.__gdmrActiveChatConvId = active?.id || null;
    // Reset seen-message set whenever we switch conversations
    notifiedMsgIds.current = new Set();
  }, [active?.id]);

  // Clear on unmount
  useEffect(() => () => { window.__gdmrActiveChatConvId = null; }, []);

  // ── presence: heartbeat + poll who's online ───────────────────
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const beat = () => jpost(api, token, "/chat/heartbeat").catch(() => {});
    const poll = async () => {
      try {
        const d = await jget(api, token, "/chat/online");
        const ids = arr(d, "online", "users", "data").map(x => x._id || x.id || x);
        if (alive) setOnlineIds(new Set(ids));
      } catch { /* presence endpoint not available — degrade silently */ }
    };
    beat(); poll();
    const b = setInterval(beat, 25000);
    const p = setInterval(poll, 15000);
    return () => { alive = false; clearInterval(b); clearInterval(p); };
  }, [token, api]);
  const isOnline = (uid) => !!uid && onlineIds.has(uid);

  // Tell the server I'm typing (throttled to once / 2.5s)
  function notifyTyping() {
    const now = Date.now();
    if (!active?.id || now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    jpost(api, token, `/chat/conversations/${active.id}/typing`).catch(() => {});
  }

  // ── load people + conversation list ───────────────────────────
  const loadList = useCallback(async () => {
    try {
      const [u, c] = await Promise.all([
        jget(api, token, "/chat/users"),
        jget(api, token, "/chat/conversations"),
      ]);
      const mySelf = myId ? String(myId) : "";
      setPeople(arr(u, "users", "data", "employees", "members").filter(p => {
        return !mySelf || String(p._id || p.id || "") !== mySelf;
      }));
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
      if (activeRef.current?.id === convId) {
        const msgs = arr(d, "messages");
        if (showSpinner) {
          // Initial open: mark all existing messages as seen — no sound
          msgs.forEach(m => { if (m._id) notifiedMsgIds.current.add(m._id); });
        } else {
          // Poll: detect truly new messages from others
          msgs.forEach(m => {
            const mid = m._id;
            if (!mid || m.pending) return;
            if (notifiedMsgIds.current.has(mid)) return;
            notifiedMsgIds.current.add(mid);
            const sid = m.sender_id || m.sender?._id;
            if (sid === myId) return;
            playNotifSound();
            if (!document.hasFocus()) {
              showBrowserNotif(
                m.sender_name || activeRef.current?.title || "New message",
                m.text,
                convId,
              );
            }
          });
        }
        setMessages(msgs);
      }
    } catch { /* keep last messages on transient errors */ }
    finally { if (showSpinner) setLoadingMsgs(false); }
  }, [api, token, myId]);

  useEffect(() => {
    if (!active?.id) return;
    const cid = active.id;
    loadMessages(cid, true);
    // mark read + refresh unread badges
    jpost(api, token, `/chat/conversations/${cid}/read`).catch(() => {});
    setConvos(cs => cs.map(c => c._id === cid ? { ...c, unread: 0 } : c));
    setTypingNames([]);
    const pollTyping = async () => {
      try {
        const d = await jget(api, token, `/chat/conversations/${cid}/typing`);
        const names = arr(d, "typing", "users", "data")
          .filter(u => (u._id || u.id || u) !== myId)
          .map(u => u.name || u.sender_name || "");
        if (activeRef.current?.id === cid) setTypingNames(names);
      } catch { /* typing endpoint not available — degrade silently */ }
    };
    pollTyping();
    const idM = setInterval(() => loadMessages(cid, false), 4000);
    const idT = setInterval(pollTyping, 3000);
    return () => { clearInterval(idM); clearInterval(idT); };
  }, [active?.id, loadMessages, api, token, myId]);

  // autoscroll to newest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, active?.id]);

  // ── derive channel + dm lists ─────────────────────────────────
  const ts = (v) => (v ? toDate(v).getTime() || 0 : 0);
  const channels = conversations.filter(c => c.type === "channel");
  const dmConvos = conversations.filter(c => c.type === "dm");
  // Use string keys so IDs always match regardless of ObjectId vs string type
  const peopleById = new Map(people.map(p => [String(p._id || p.id || ""), p]));
  const dmFor = (uid) => {
    const uidStr = String(uid || "");
    return dmConvos.find(c =>
      (c.members || c.participants || []).some(m => String(m?._id || m?.id || m || "") === uidStr)
    );
  };

  // Resolve the OTHER participant of a DM conversation (peer name/id).
  // Uses string comparison throughout so MongoDB ObjectId ≡ string IDs always match.
  // Falls back through several backend shapes and the people directory.
  function peerInfo(conv) {
    const explicit = conv.peer || conv.with || conv.other_user;
    if (explicit) {
      const id = explicit._id || explicit.id || explicit;
      const idStr = String(id || "");
      return { id, name: explicit.name || conv.peer_name || peopleById.get(idStr)?.name || "Team member", dept: explicit.department };
    }
    const members = conv.members || conv.participants || [];
    // Find the member whose ID is not the current user — string comparison handles type mismatches.
    // If myId is unknown, fall back to the second member (current user is typically listed first).
    const other = myIdStr
      ? (members.find(m => {
          const mid = String(m?._id || m?.id || m || "");
          return mid !== "" && mid !== myIdStr;
        }) ?? members[1] ?? members[0])
      : (members[1] ?? members[0]);
    const id = other?._id || other?.id || (typeof other === "string" ? other : undefined);
    const idStr = String(id || "");
    const name = other?.name
      || conv.peer_name
      || (idStr ? peopleById.get(idStr)?.name : undefined)
      || conv.name || conv.title
      || "Team member";
    return { id, name, dept: other?.department || (idStr ? peopleById.get(idStr)?.department : undefined) };
  }

  const q = search.trim().toLowerCase();
  const matchQ = (s) => !q || (s || "").toLowerCase().includes(q);

  // Sort so the most recent / unread conversations bubble to the top.
  const filteredChannels = channels
    .filter(c => matchQ(c.name))
    .sort((a, b) => ts(b.last_at) - ts(a.last_at));

  // Build DM entries from BOTH existing conversations and the people directory.
  // Deduplicate: if multiple conversations exist with the same peer, keep only the most recent.
  const seenPeers = new Set();
  const dmByPeer = new Map(); // String(peerId) → entry
  dmConvos.forEach(c => {
    const pi = peerInfo(c);
    const peerKey = pi.id ? String(pi.id) : `conv:${c._id}`;
    const entry = { key: c._id, conv: c, id: pi.id, name: pi.name, dept: pi.dept, last_at: c.last_at, last_message: c.last_message, unread: c.unread || 0 };
    if (!dmByPeer.has(peerKey) || ts(c.last_at) > ts(dmByPeer.get(peerKey).last_at)) {
      dmByPeer.set(peerKey, entry);
    }
    if (pi.id) seenPeers.add(String(pi.id));
  });
  const dmEntries = [...dmByPeer.values()];
  people.forEach(p => {
    const id = p._id || p.id;
    if (id && seenPeers.has(String(id))) return; // already shown via its conversation
    dmEntries.push({ key: String(id || p.name || ""), person: p, id, name: p.name || "", dept: p.department || p.role || "" });
  });
  const filteredDms = dmEntries
    .filter(e => matchQ(e.name) || matchQ(e.dept))
    .sort((a, b) => {
      const d = ts(b.last_at) - ts(a.last_at);
      if (d !== 0) return d;                        // recent chats first
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
  function openDmEntry(entry) {
    if (entry.conv) {
      setActive({ id: entry.conv._id, type: "dm", title: entry.name, peerId: entry.id });
      setMobilePane("thread");
    } else {
      openPerson(entry.person || { _id: entry.id, name: entry.name });
    }
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
    if (composerRef.current) { composerRef.current.style.height = "auto"; }
    try {
      await jpost(api, token, `/chat/conversations/${active.id}/messages`, { text: body });
      loadMessages(active.id, false);
      loadList();
    } catch (err) {
      setMessages(m => m.map(x => x._id === optimistic._id ? { ...x, failed: true, pending: false } : x));
      showToast(err.message || "Message failed to send.");
    } finally { setSending(false); }
  }

  function onComposerKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // ── message edit / delete ─────────────────────────────────────
  function startEdit(m) { setEditingId(m._id); setEditText(m.text || ""); }
  function cancelEdit() { setEditingId(null); setEditText(""); }
  async function saveEdit(m) {
    const body = editText.trim();
    if (!body) return;
    if (body === m.text) return cancelEdit();
    const cid = active.id;
    setMessages(ms => ms.map(x => x._id === m._id ? { ...x, text: body, edited: true } : x));
    cancelEdit();
    try {
      const d = await jput(api, token, `/chat/conversations/${cid}/messages/${m._id}`, { text: body });
      if (d && d._id) setMessages(ms => ms.map(x => x._id === m._id ? { ...x, ...d } : x)); // apply edited_at etc.
      loadList();
    } catch (e) {
      if (e.status === 404) { setMessages(ms => ms.filter(x => x._id !== m._id)); return; } // already gone
      if (e.status === 403) showToast("Not allowed"); else showToast(e.message || "Could not edit message.");
      loadMessages(cid, false); // restore from server
    }
  }
  // Delete a message for everyone (own message, or any message for admins)
  async function deleteForEveryone(m) {
    const cid = active.id;
    setMessages(ms => ms.filter(x => x._id !== m._id)); // optimistic
    try {
      await jdel(api, token, `/chat/conversations/${cid}/messages/${m._id}`);
      loadList();
    } catch (e) {
      if (e.status === 404) return;                  // already gone — keep removed, silent
      if (e.status === 403) showToast("Not allowed"); else showToast(e.message || "Could not delete message.");
      loadMessages(cid, false);                      // restore on other failures
    }
  }
  // Hide a message only for me (anyone, any message)
  async function deleteForMe(m) {
    const cid = active.id;
    setMessages(ms => ms.filter(x => x._id !== m._id)); // optimistic
    try {
      await jpost(api, token, `/chat/conversations/${cid}/messages/${m._id}/hide`);
    } catch (e) {
      if (e.status === 404) return;                  // already gone — silent
      showToast(e.message || "Could not remove message.");
      loadMessages(cid, false);
    }
  }

  // ── conversation-level actions ────────────────────────────────
  async function clearForEveryone() {
    const id = active?.id; if (!id) return;
    try {
      await jdel(api, token, `/chat/conversations/${id}/messages`);
      setMessages([]); loadList();
    } catch (e) {
      if (e.status === 403) showToast("Not allowed"); else showToast(e.message || "Could not clear chat.");
    }
  }
  async function clearForMe() {
    const id = active?.id; if (!id) return;
    try {
      await jpost(api, token, `/chat/conversations/${id}/clear`);
      setMessages([]); loadList();
    } catch (e) { showToast(e.message || "Could not clear chat."); }
  }
  async function leaveChannel() {
    const id = active?.id; if (!id) return;
    try {
      await jpost(api, token, `/chat/conversations/${id}/leave`);
      setConvos(cs => cs.filter(c => c._id !== id));
      setActive(null); setMobilePane("list"); loadList();
    } catch (e) {
      if (e.status === 403) showToast("Not allowed"); else showToast(e.message || "Could not leave channel.");
    }
  }
  async function deleteChannel() {
    const id = active?.id; if (!id) return;
    try {
      await jdel(api, token, `/chat/conversations/${id}`);
      setConvos(cs => cs.filter(c => c._id !== id));
      setActive(null); setMobilePane("list"); loadList();
    } catch (e) {
      if (e.status === 403) showToast("Not allowed");
      else if (e.status === 400) showToast("Direct messages can't be deleted.");
      else if (e.status === 404) { setConvos(cs => cs.filter(c => c._id !== id)); setActive(null); setMobilePane("list"); }
      else showToast(e.message || "Could not delete channel.");
    }
  }
  const canModify = (m) => (m.sender_id || m.sender?._id) === myId || isAdmin; // delete for everyone
  const canEdit   = (m) => (m.sender_id || m.sender?._id) === myId; // only own text

  // conversation-level permissions
  const activeConv     = conversations.find(c => c._id === active?.id);
  const activeOwnerId  = activeConv && (activeConv.created_by?._id || activeConv.created_by);
  const isOwner        = !!activeOwnerId && activeOwnerId === myId;
  const canDeleteChan  = active?.type === "channel" && (isAdmin || isOwner);
  const canClearAll    = !!active;

  // ── render: group messages with date dividers ─────────────────
  function renderMessages() {
    if (loadingMsgs) return <div className="gchat-empty"><div className="loader" /></div>;
    if (!messages.length) return (
      <div className="gchat-empty">
        <TbMessageDots size={34} color="#cbd5e1" />
        <p>No messages yet — say hello 👋</p>
      </div>
    );
    let lastDay = null, lastSender = null, lastTs = 0;
    return messages.map((m) => {
      const sid = m.sender_id || m.sender?._id;
      const mine = sid === myId;
      const day = fmtDay(m.created_at);
      const showDay = day !== lastDay; lastDay = day;
      const ts = toDate(m.created_at).getTime();
      const grouped = !showDay && sid === lastSender && (ts - lastTs) < 5 * 60 * 1000;
      lastSender = sid; lastTs = ts;

      if (m.text && m.text.startsWith(CALL_LOG_PREFIX)) {
        lastSender = null; // next real message shows its avatar/sender again
        return (
          <React.Fragment key={m._id}>
            {showDay && <div className="gchat-day"><span>{day}</span></div>}
            <div className="gchat-call-log">
              <TbPhone size={10} />
              <span>{m.text.replace(`${CALL_LOG_PREFIX} `, "")}</span>
              <span className="gchat-call-log-time">{fmtTime(m.created_at)}</span>
            </div>
          </React.Fragment>
        );
      }

      return (
        <React.Fragment key={m._id}>
          {showDay && <div className="gchat-day"><span>{day}</span></div>}
          <div className={`gchat-row ${mine ? "mine" : ""}`}>
            {!mine && (grouped
              ? <div style={{ width: 32, flexShrink: 0 }} />
              : <Avatar name={m.sender_name || "?"} size={32} />)}
            <div className="gchat-bubble-wrap">
              {!mine && !grouped && <div className="gchat-sender">{m.sender_name || "Member"}</div>}
              {editingId === m._id ? (
                <div className="gchat-edit">
                  <textarea
                    rows={2}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(m); } if (e.key === "Escape") cancelEdit(); }}
                    autoFocus
                  />
                  <div className="gchat-edit-actions">
                    <button type="button" className="gchat-edit-save" onClick={() => saveEdit(m)}>Save</button>
                    <button type="button" className="gchat-edit-cancel" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className={`gchat-bubble ${mine ? "mine" : ""} ${m.failed ? "failed" : ""}`}>
                  {m.text}
                  <span className="gchat-bubble-time">
                    {m.edited && <span style={{ marginRight: 4, fontStyle: "italic", opacity: 0.7 }}>edited</span>}
                    {fmtTime(m.created_at)}
                    {mine && (m.pending ? " · sending…" : m.failed ? " · failed" : <TbCheck size={9} style={{ marginLeft: 4, opacity: 0.7 }} />)}
                  </span>
                  {!m.pending && !m.failed && (
                    <div className="gchat-msg-actions">
                      <button title="Message options" onClick={() => setMsgMenu(msgMenu === m._id ? null : m._id)}><TbDotsVertical size={11} /></button>
                      {msgMenu === m._id && (
                        <>
                          <div className="gchat-menu-backdrop" onClick={() => setMsgMenu(null)} />
                          <div className={`gchat-msg-menu ${mine ? "mine" : ""}`}>
                            {canEdit(m) && <button onClick={() => { setMsgMenu(null); startEdit(m); }}><TbPencil size={10} /> Edit</button>}
                            <button onClick={() => { setMsgMenu(null); deleteForMe(m); }}><TbTrash size={10} /> Delete for me</button>
                            {canModify(m) && <button className="danger" onClick={() => { setMsgMenu(null); setConfirm({ title: "Delete message", message: "Delete this message for everyone? This cannot be undone.", danger: true, onConfirm: () => deleteForEveryone(m) }); }}><TbTrash size={10} /> Delete for everyone</button>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </React.Fragment>
      );
    });
  }

  async function enableNotifications() {
    const result = await requestNotifPermission();
    setNotifPerm(result);
    if (result === "granted") {
      playNotifSound();
      showBrowserNotif("Notifications enabled", "You'll now get notified when messages arrive.", "test");
    }
  }

  const hasBanner = notifPerm !== "granted" && notifPerm !== "unsupported";

  return (
    <div className={`gchat${hasBanner ? " has-banner" : ""}${active ? " has-active" : ""}`} data-pane={mobilePane}>
      <ChatStyles />

      {/* Notification permission banner */}
      {hasBanner && (
        <div style={{
          gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, padding: "8px 16px", background: "#fefce8", borderBottom: "1px solid #fde68a",
          fontSize: 12.5, color: "#78350f",
        }}>
          <span>🔔 Enable notifications to get alerts when messages arrive.</span>
          {notifPerm === "denied" ? (
            <span style={{ fontWeight: 600, color: "#b45309" }}>Blocked in browser settings — click the lock icon in your address bar to allow.</span>
          ) : (
            <button onClick={enableNotifications} style={{
              background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6,
              padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
            }}>Enable</button>
          )}
        </div>
      )}

      {/* ── Left rail ── */}
      <aside className="gchat-rail">
        <div className="gchat-rail-head">
          <h3>Messages</h3>
          <button className="gchat-new-btn" title="New channel" onClick={() => setShowNewChannel(true)}>
            <TbPlus size={12} />
          </button>
        </div>
        <div className="gchat-search">
          <TbSearch size={12} />
          <input placeholder="Search people or channels" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {(() => {
          const onlinePeople = dmEntries.filter(e => e.id && isOnline(e.id)).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          if (!onlinePeople.length) return null;
          return (
            <div className="gchat-online-strip">
              <div className="gchat-online-label">Online — {onlinePeople.length}</div>
              <div className="gchat-online-row">
                {onlinePeople.map(e => (
                  <button key={e.id} className="gchat-online-avatar" title={e.name} onClick={() => openDmEntry(e)}>
                    <Avatar name={e.name} size={44} online />
                    <span className="gchat-online-name">{(e.name || "").split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="gchat-rail-scroll">
          {loadingList ? (
            <div className="gchat-empty small"><div className="loader" /></div>
          ) : (
            <>
              {/* Channels */}
              <div className="gchat-section-label"><TbUsers size={10} /> Channels</div>
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
              <div className="gchat-section-label"><TbMessageDots size={10} /> Direct Messages</div>
              {filteredDms.length === 0 && <div className="gchat-rail-hint">No people found</div>}
              {filteredDms.map(e => (
                <button key={e.key} className={`gchat-item ${active?.peerId === e.id || active?.id === e.conv?._id ? "active" : ""}`} onClick={() => openDmEntry(e)}>
                  <Avatar name={e.name} size={38} online={isOnline(e.id)} />
                  <div className="gchat-item-body">
                    <div className="gchat-item-top">
                      <span className="gchat-item-name">{e.name}</span>
                      {e.last_at && <span className="gchat-item-time">{fmtListTime(e.last_at)}</span>}
                    </div>
                    <div className="gchat-item-sub">{e.last_message || e.dept || "Start a conversation"}</div>
                  </div>
                  {e.unread > 0 && <span className="gchat-unread">{e.unread}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ── Thread pane ── */}
      <section className="gchat-thread">
        {!active ? (
          <div className="gchat-placeholder">
            <TbMessageDots size={48} color="#cbd5e1" />
            <h3>Your conversations</h3>
            <p>Select a person or channel to start messaging your team.</p>
          </div>
        ) : (
          <>
            <header className="gchat-thread-head">
              <button className="gchat-back" onClick={() => { setActive(null); setMobilePane("list"); }}>
                <TbArrowLeft />
              </button>
              <Avatar name={active.title} size={36} isChannel={active.type === "channel"} online={active.type === "dm" && isOnline(active.peerId)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="gchat-thread-title">{active.type === "channel" ? `#${active.title}` : active.title}</div>
                <div className="gchat-thread-sub">
                  {typingNames.length > 0 ? (
                    <span style={{ color: "var(--brand)", fontWeight: 600 }}>
                      {active.type === "channel" && typingNames[0] ? `${typingNames[0]} is typing…` : "typing…"}
                    </span>
                  ) : active.type === "channel" ? (
                    "Channel"
                  ) : isOnline(active.peerId) ? (
                    <><TbCircle size={7} color="#22c55e" /> Online</>
                  ) : (
                    <><TbCircle size={7} color="#cbd5e1" /> Offline</>
                  )}
                </div>
              </div>
              {active.type === "dm" && (
                <button
                  className="gchat-menu-btn"
                  title={`Call ${active.title}`}
                  onClick={() => call?.startCall(active.peerId, active.title, active.id)}
                  disabled={!call || call.status !== "idle"}
                  style={{ color: "var(--brand)" }}
                >
                  <TbPhone size={14} />
                </button>
              )}
              <div className="gchat-menu-wrap">
                <button className="gchat-menu-btn" title="Conversation options" onClick={() => setHeaderMenu(v => !v)}>
                  <TbDotsVertical size={15} />
                </button>
                {headerMenu && (
                  <>
                    <div className="gchat-menu-backdrop" onClick={() => setHeaderMenu(false)} />
                    <div className="gchat-menu">
                      <button onClick={() => { setHeaderMenu(false); setConfirm({ title: "Clear chat for me", message: "Hide all messages in this conversation for you only? The other person keeps their copy.", onConfirm: clearForMe }); }}>
                        <TbTrash size={11} /> Clear chat for me
                      </button>
                      {canClearAll && (
                        <button className="danger" onClick={() => { setHeaderMenu(false); setConfirm({ title: "Clear chat for everyone", message: "Delete all messages in this conversation for everyone? This cannot be undone.", danger: true, onConfirm: clearForEveryone }); }}>
                          <TbTrash size={11} /> Clear chat for everyone
                        </button>
                      )}
                      {active.type === "channel" && (
                        <button onClick={() => { setHeaderMenu(false); setConfirm({ title: "Leave channel", message: `Leave "#${active.title}"? You'll stop receiving its messages.`, onConfirm: leaveChannel }); }}>
                          <TbLogout size={12} /> Leave channel
                        </button>
                      )}
                      {canDeleteChan && (
                        <button className="danger" onClick={() => { setHeaderMenu(false); setConfirm({ title: "Delete channel", message: `Delete the channel "#${active.title}" and all its messages for everyone? This cannot be undone.`, danger: true, onConfirm: deleteChannel }); }}>
                          <TbX size={12} /> Delete channel
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </header>

            <div className="gchat-messages" ref={scrollRef}>
              {renderMessages()}
            </div>

            {error && <div className="gchat-error">{error}</div>}

            <form className="gchat-composer" onSubmit={send}>
              <textarea
                ref={composerRef}
                rows={1}
                placeholder={`Message ${active.type === "channel" ? "#" + active.title : active.title}`}
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  if (e.target.value.trim()) notifyTyping();
                }}
                onKeyDown={onComposerKey}
              />
              <button type="submit" className="gchat-send" disabled={!text.trim() || sending}>
                <TbSend size={14} />
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

      {/* ── Toast ── */}
      {toast && <div className="gchat-toast">{toast}</div>}

      {/* ── Confirm modal (clear chat / delete) ── */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><TbTrash size={15} /></div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#0f172a" }}>{confirm.title}</h3>
                <p style={{ margin: 0, fontSize: 13.5, color: "#64748b", lineHeight: 1.5 }}>{confirm.message}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn ghost" type="button" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" onClick={() => { const fn = confirm.onConfirm; setConfirm(null); fn?.(); }}
                style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <TbTrash size={11} /> Confirm
              </button>
            </div>
          </div>
        </div>
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
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><TbX /></button>
        </div>
        {err && <div className="gchat-error" style={{ marginBottom: 12 }}>{err}</div>}
        <form onSubmit={create}>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 6 }}>Channel name</label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <TbHash size={12} style={{ position: "absolute", left: 12, top: 13, color: "#94a3b8" }} />
            <input className="modern-input" style={{ paddingLeft: 30 }} placeholder="e.g. design-team" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 6 }}>
            Add members <span style={{ fontWeight: 400, color: "#94a3b8" }}>({members.length} selected)</span>
          </label>
          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e6eaef", borderRadius: 10, padding: 6 }}>
            {people.length === 0 && <div className="gchat-rail-hint">No people available</div>}
            {[...people].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(p => {
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
                  {on ? <TbCheck color="#16a34a" /> : <span style={{ width: 16, height: 16, border: "1.5px solid #cbd5e1", borderRadius: 4 }} />}
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
      .gchat { display:grid; grid-template-columns: 320px 1fr; grid-template-rows: 1fr; height: calc(100vh - 140px); min-height: 520px;
        background:#fff; border:1px solid #e6eaef; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(16,40,30,0.05); }
      .gchat.has-banner { grid-template-rows: auto 1fr; }
      .gchat-rail { border-right:1px solid #eef1f4; display:flex; flex-direction:column; background:#fafbfc; min-width:0; min-height:0; overflow:hidden; }
      .gchat-rail-head { display:flex; align-items:center; justify-content:space-between; padding:16px 16px 10px; }
      .gchat-rail-head h3 { margin:0; font-size:18px; color:#0f172a; }
      .gchat-new-btn { width:30px; height:30px; border-radius:8px; border:none; background:var(--brand); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; }
      .gchat-search { display:flex; align-items:center; gap:8px; margin:0 14px 10px; padding:8px 12px; background:#fff; border:1px solid #e6eaef; border-radius:10px; color:#94a3b8; }
      .gchat-search input { border:none; outline:none; flex:1; font-size:13px; background:transparent; color:#0f172a; }
      .gchat-online-strip { padding:2px 14px 12px; border-bottom:1px solid #eef1f4; flex-shrink:0; }
      .gchat-online-label { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8; margin-bottom:8px; }
      .gchat-online-row { display:flex; gap:14px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
      .gchat-online-row::-webkit-scrollbar { display:none; }
      .gchat-online-avatar { display:flex; flex-direction:column; align-items:center; gap:4px; background:none; border:none; cursor:pointer; flex-shrink:0; width:52px; padding:0; }
      .gchat-online-name { font-size:10.5px; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:52px; }
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
      .gchat-day span { font-size:11px; font-weight:600; color:#94a3b8; background:#eef2f1; padding:3px 12px; border-radius:8px; }
      .gchat-call-log { display:flex; align-items:center; justify-content:center; gap:7px; margin:8px auto; padding:6px 14px; background:#f8fafc; border:1px solid #eef1f4; border-radius:8px; color:#64748b; font-size:12px; font-weight:500; width:fit-content; max-width:80%; }
      .gchat-call-log-time { color:#b6c0cc; font-size:10.5px; }
      .gchat-row { display:flex; gap:8px; align-items:flex-end; max-width:78%; }
      .gchat-row.mine { margin-left:auto; flex-direction:row-reverse; }
      .gchat-bubble-wrap { min-width:0; }
      .gchat-sender { font-size:11.5px; font-weight:700; color:#0f766e; margin:0 0 2px 2px; }
      .gchat-bubble { position:relative; padding:8px 12px 8px; border-radius:14px; background:#f1f3f5; color:#0f172a; font-size:13.5px; line-height:1.45; white-space:pre-wrap; word-break:break-word; border-top-left-radius:4px; }
      .gchat-bubble.mine { background:var(--brand); color:#fff; border-top-left-radius:14px; border-top-right-radius:4px; }
      .gchat-bubble.failed { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
      .gchat-bubble-time { display:inline-block; font-size:9.5px; opacity:.65; margin-left:8px; white-space:nowrap; vertical-align:baseline; }

      /* per-message hover action (kebab + dropdown) */
      .gchat-msg-actions { position:absolute; top:50%; opacity:0; pointer-events:none; transition:opacity .12s; }
      .gchat-row:hover .gchat-msg-actions, .gchat-msg-actions:has(.gchat-msg-menu) { opacity:1; pointer-events:auto; }
      .gchat-bubble.mine .gchat-msg-actions { left:-6px; transform:translate(-100%,-50%); }
      .gchat-bubble:not(.mine) .gchat-msg-actions { right:-6px; transform:translate(100%,-50%); }
      .gchat-msg-actions > button { width:24px; height:24px; border-radius:6px; border:1px solid #e6eaef; background:#fff; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 4px rgba(0,0,0,.08); }
      .gchat-msg-actions > button:hover { color:#0f172a; }
      .gchat-msg-menu { position:absolute; top:0; z-index:50; background:#fff; border:1px solid #e6eaef; border-radius:9px; box-shadow:0 8px 24px rgba(16,40,30,.16); padding:5px; min-width:150px; }
      .gchat-msg-menu.mine { right:28px; }
      .gchat-msg-menu:not(.mine) { left:28px; }
      .gchat-msg-menu button { width:100%; display:flex; align-items:center; gap:8px; padding:7px 9px; background:none; border:none; border-radius:6px; cursor:pointer; font-size:12.5px; color:#334155; text-align:left; white-space:nowrap; }
      .gchat-msg-menu button:hover { background:#f1f5f4; }
      .gchat-msg-menu button.danger { color:#dc2626; }
      .gchat-msg-menu button.danger:hover { background:#fef2f2; }

      /* inline edit */
      .gchat-edit { display:flex; flex-direction:column; gap:6px; }
      .gchat-edit textarea { resize:none; border:1px solid var(--brand); border-radius:10px; padding:8px 10px; font-size:13.5px; font-family:inherit; outline:none; min-width:230px; line-height:1.4; }
      .gchat-edit-actions { display:flex; gap:8px; }
      .gchat-edit-save { background:var(--brand); color:#fff; border:none; border-radius:6px; padding:5px 14px; font-size:12px; font-weight:600; cursor:pointer; }
      .gchat-edit-cancel { background:#f1f5f9; color:#475569; border:none; border-radius:6px; padding:5px 14px; font-size:12px; font-weight:600; cursor:pointer; }

      /* thread header kebab menu */
      .gchat-menu-wrap { position:relative; flex-shrink:0; }
      .gchat-menu-btn { background:none; border:none; cursor:pointer; color:#94a3b8; width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
      .gchat-menu-btn:hover { background:#f1f5f4; color:#475569; }
      .gchat-menu-backdrop { position:fixed; inset:0; z-index:40; }
      .gchat-menu { position:absolute; right:0; top:40px; z-index:41; background:#fff; border:1px solid #e6eaef; border-radius:10px; box-shadow:0 8px 24px rgba(16,40,30,.14); padding:6px; min-width:170px; }
      .gchat-menu button { width:100%; display:flex; align-items:center; gap:10px; padding:9px 10px; background:none; border:none; border-radius:7px; cursor:pointer; font-size:13px; color:#334155; text-align:left; }
      .gchat-menu button:hover { background:#f1f5f4; }
      .gchat-menu button.danger { color:#dc2626; }
      .gchat-menu button.danger:hover { background:#fef2f2; }

      /* toast */
      .gchat-toast { position:fixed; bottom:28px; left:50%; transform:translateX(-50%); z-index:1000;
        background:#0f172a; color:#fff; font-size:13px; font-weight:600; padding:11px 20px; border-radius:10px;
        box-shadow:0 8px 28px rgba(0,0,0,.25); animation:gchatToast .2s ease; }
      @keyframes gchatToast { from { opacity:0; transform:translate(-50%,8px); } to { opacity:1; transform:translate(-50%,0); } }

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
