import { useEffect, useRef } from "react";
import { playNotifSound, showBrowserNotif, requestNotifPermission } from "../utils/notifications";

/**
 * Background notification poller — runs in App.jsx so it stays alive even
 * when the Chat view is not open. Fires a sound + OS notification whenever
 * any conversation's unread count increases, except for the conversation
 * that is currently open in Chat (tracked via window.__gdmrActiveChatConvId).
 */
export default function useChatNotifications(token, api) {
  const prevUnread = useRef({});
  const initialized = useRef(false);

  // Silently request permission on first login (banner in Chat.jsx handles the visible prompt)
  useEffect(() => {
    if (token && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    if (!token || !api) return;
    const base = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";

    const tick = async () => {
      try {
        const r = await fetch(`${base}/api/chat/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const d = await r.json().catch(() => ({}));
        const convos = Array.isArray(d) ? d : (d?.conversations || d?.data || []);

        if (!initialized.current) {
          convos.forEach(c => { prevUnread.current[c._id] = c.unread || 0; });
          initialized.current = true;
          return;
        }

        convos.forEach(c => {
          const prev = prevUnread.current[c._id] ?? 0;
          const curr = c.unread || 0;
          prevUnread.current[c._id] = curr;
          if (curr <= prev) return;
          // Chat.jsx is currently showing this conversation — it handles its own sound
          if (window.__gdmrActiveChatConvId === c._id) return;

          playNotifSound();
          if (!document.hasFocus()) {
            const title = c.peer_name || c.name || "New message";
            showBrowserNotif(title, c.last_message, c._id);
          }
        });
      } catch {}
    };

    tick();
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, [token, api]);
}
