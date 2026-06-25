import { useState, useEffect } from "react";

/**
 * Lightweight polled total-unread count for the sidebar "Messages" badge.
 * Kept in its own tiny module so dashboards can use it without eagerly
 * importing the (lazy-loaded) Chat component.
 */
export default function useChatUnread(token, api) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const base = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
    const tick = async () => {
      try {
        const r = await fetch(`${base}/api/chat/unread`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return;
        const d = await r.json().catch(() => ({}));
        if (alive) setCount(Number(d?.count ?? d?.unread ?? 0) || 0);
      } catch { /* silent — chat backend may not be live yet */ }
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => { alive = false; clearInterval(id); };
  }, [token, api]);
  return count;
}
