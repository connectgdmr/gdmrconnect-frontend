let _audioCtx = null;
function getAudioCtx() {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  } catch { return null; }
}

// Soft two-tone chime — no external file required
export function playNotifSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    [880, 660].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      const t = ctx.currentTime + i * 0.18;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.start(t);
      o.stop(t + 0.45);
    });
  } catch {}
}

// Show OS-level browser notification (requires permission)
export function showBrowserNotif(title, body, convId) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body: (body || "You have a new message").slice(0, 100),
    icon: "/favicon.ico",
    tag: `gdmr-chat-${convId}`,
    silent: true, // we handle sound ourselves
  });
  n.onclick = () => { window.focus(); n.close(); };
}

export function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}
