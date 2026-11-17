import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../api";

/**
 * "New work for you": polls the number of pieces of work other people assigned to this person that they have
 * not opened yet. Drives the blinking Work & Clients tab and the pop-up notification.
 * The Work page tells us when it has marked them as seen (event "gdmr:work-alerts-refresh") so the blink stops at once.
 */
export default function useWorkAlerts(token) {
  const [alerts, setAlerts] = useState({ count: 0, items: [] });
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/work/alerts`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const d = await r.json();
      setAlerts({ count: Number(d.count) || 0, items: Array.isArray(d.items) ? d.items : [] });
    } catch { /* silent: the next poll will try again */ }
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    window.addEventListener("gdmr:work-alerts-refresh", load);
    return () => { clearInterval(id); window.removeEventListener("gdmr:work-alerts-refresh", load); };
  }, [load]);
  return alerts;
}
