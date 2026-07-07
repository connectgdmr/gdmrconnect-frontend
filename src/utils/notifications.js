let _audioCtx = null;

// Pre-warm AudioContext on the first user gesture so it's ready for timer callbacks
export function prewarmAudio() {
  const warm = () => {
    try {
      if (!_audioCtx || _audioCtx.state === "closed") {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_audioCtx.state === "suspended") _audioCtx.resume();
    } catch {}
    document.removeEventListener("click", warm);
    document.removeEventListener("keydown", warm);
    document.removeEventListener("touchstart", warm);
  };
  document.addEventListener("click", warm);
  document.addEventListener("keydown", warm);
  document.addEventListener("touchstart", warm);
}

// Soft two-tone chime — no external file required
export async function playNotifSound() {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === "suspended") {
      await _audioCtx.resume();
    }
    const ctx = _audioCtx;
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
    silent: true,
  });
  n.onclick = () => { window.focus(); n.close(); };
}

export async function requestNotifPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission().catch(() => "denied");
}
