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

async function tone(freqs, { gain = 0.22, dur = 0.35, gap = 0 } = {}) {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") await _audioCtx.resume();
  const ctx = _audioCtx;
  freqs.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    const t = ctx.currentTime + i * (dur + gap);
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur);
  });
}

// Incoming-call ringtone — classic alternating two-tone burst, repeating
// until stop() is called. No external audio file required.
export function startRingtone() {
  let stopped = false;
  const burst = () => { if (!stopped) tone([950, 1400], { gain: 0.25, dur: 0.35, gap: 0.05 }).catch(() => {}); };
  burst();
  const id = setInterval(burst, 1700);
  return { stop: () => { stopped = true; clearInterval(id); } };
}

// Outgoing-call ring-back tone — a single softer pulse, distinct from the
// incoming ringtone so callers can tell the two apart.
export function startRingback() {
  let stopped = false;
  const pulse = () => { if (!stopped) tone([440], { gain: 0.15, dur: 0.5 }).catch(() => {}); };
  pulse();
  const id = setInterval(pulse, 2000);
  return { stop: () => { stopped = true; clearInterval(id); } };
}

// Incoming-call OS notification — stays up (requireInteraction) until the
// call is answered/declined/missed, at which point CallContext closes it.
export function showCallNotif(callerName) {
  if (!("Notification" in window) || Notification.permission !== "granted") return null;
  try {
    const n = new Notification(`Incoming call — ${callerName || "Someone"}`, {
      body: "Click to open GDMR Connect and answer",
      icon: "/favicon.ico",
      tag: "gdmr-call",
      requireInteraction: true,
    });
    n.onclick = () => { window.focus(); n.close(); };
    return n;
  } catch { return null; }
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
