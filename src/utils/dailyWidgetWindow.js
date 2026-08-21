import { useState, useEffect } from "react";

// How long the "morning" dashboard widgets (Insights banner, daily quote,
// "what are you working on" status log) stay visible after the user's
// first dashboard load each day.
const WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_PREFIX = "gdmr_dash_widgets_since_";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Shows the dashboard's "morning" widgets for the first 30 minutes after
 * the user's first dashboard view each calendar day, then hides them for
 * the rest of that day. A new day (login or not) always gets a fresh
 * 30-minute window — the timestamp is keyed by user + local date, stored
 * in localStorage so a page reload mid-window doesn't restart the clock.
 */
export function useShowDailyWidgets(userId) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const key = `${STORAGE_PREFIX}${userId || "anon"}_${todayKey()}`;
    let since = Number(localStorage.getItem(key));
    if (!since) {
      since = Date.now();
      try { localStorage.setItem(key, String(since)); } catch { /* storage unavailable — window just won't persist across reloads */ }
    }
    const remaining = WINDOW_MS - (Date.now() - since);
    if (remaining <= 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(t);
  }, [userId]);

  return visible;
}
