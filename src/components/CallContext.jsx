import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Peer from "peerjs";

/**
 * Voice calling over WebRTC via PeerJS.
 * Every logged-in user opens a Peer connection keyed to their own user id
 * (prefixed to avoid collisions on the shared public PeerJS broker), so an
 * incoming call can ring no matter what page they're on. This context is
 * mounted once in App.jsx, above the role-specific dashboards.
 *
 * TURN credentials are optional but recommended — without a TURN server,
 * calls between users on restrictive networks (corporate wifi, some mobile
 * carriers) may fail to connect. Set these in .env to enable one:
 *   VITE_TURN_URLS      comma-separated list of turn:/turns: URLs
 *   VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL   shared by all of the above
 *   VITE_STUN_URL        optional extra STUN server (Google's is always included)
 */

const peerIdFor = (userId) => `gdmr-${String(userId)}`;
const RING_TIMEOUT_MS = 30000;

function buildIceServers() {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  const stunUrl = import.meta.env.VITE_STUN_URL;
  if (stunUrl) servers.push({ urls: stunUrl });

  const turnUrls = (import.meta.env.VITE_TURN_URLS || "").split(",").map(s => s.trim()).filter(Boolean);
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (username && credential) {
    turnUrls.forEach(urls => servers.push({ urls, username, credential }));
  }
  return servers;
}

const CallContext = createContext(null);

export function useCall() {
  return useContext(CallContext);
}

export function CallProvider({ token, user, children }) {
  const peerRef = useRef(null);
  const currentCallRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const ringTimeoutRef = useRef(null);

  // "idle" | "calling" | "ringing" | "connected"
  const [status, setStatus] = useState("idle");
  const [peerName, setPeerName] = useState("");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [audioBlocked, setAudioBlocked] = useState(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    if (currentCallRef.current) { try { currentCallRef.current.close(); } catch {} currentCallRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    setStatus("idle");
    setPeerName("");
    setMuted(false);
    setDuration(0);
    setAudioBlocked(false);
  }, []);

  const retryAudio = useCallback(() => {
    const audioEl = document.getElementById("gdmr-call-remote-audio");
    audioEl?.play().then(() => setAudioBlocked(false)).catch(() => {});
  }, []);

  const attachRemoteAudio = (stream) => {
    let audioEl = document.getElementById("gdmr-call-remote-audio");
    if (!audioEl) {
      audioEl = document.createElement("audio");
      audioEl.id = "gdmr-call-remote-audio";
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);
    }
    audioEl.srcObject = stream;
    // Browsers can silently block autoplay even for an <audio> tag — detect it
    // so the UI can offer a manual "tap to enable audio" fallback.
    audioEl.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
  };

  const wireCallEvents = useCallback((call) => {
    currentCallRef.current = call;

    // Give up if the other side never picks up / ICE never completes
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = setTimeout(() => {
      setError("No answer — call ended.");
      cleanup();
    }, RING_TIMEOUT_MS);

    call.on("stream", (remoteStream) => {
      if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
      attachRemoteAudio(remoteStream);
      setStatus("connected");
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    });
    call.on("close", cleanup);
    call.on("error", () => { setError("Call failed."); cleanup(); });

    // Detect a stalled/failed ICE connection even if PeerJS itself never
    // fires "error" for it (this is the common cause of silent, dead calls).
    const watchIce = () => {
      const pc = call.peerConnection;
      if (!pc) { setTimeout(watchIce, 300); return; }
      pc.addEventListener("iceconnectionstatechange", () => {
        if (["failed", "disconnected"].includes(pc.iceConnectionState)) {
          setError("Call connection lost or blocked by the network.");
          cleanup();
        }
      });
    };
    watchIce();
  }, [cleanup]);

  // Open (or reopen) this user's Peer connection
  useEffect(() => {
    if (!token || !user?._id) return;
    const peer = new Peer(peerIdFor(user._id), { config: { iceServers: buildIceServers() } });
    peerRef.current = peer;

    peer.on("call", (call) => {
      // Only handle one call at a time — reject anything else while busy
      if (currentCallRef.current) { call.close(); return; }
      setPeerName(call.metadata?.callerName || "Someone");
      setStatus("ringing");
      currentCallRef.current = call; // held un-answered until the user accepts
      // If the caller hangs up before we answer, clear the ringing UI
      call.on("close", cleanup);
    });

    peer.on("error", (err) => {
      if (err?.type === "peer-unavailable") {
        setError("That person isn't reachable right now.");
        cleanup();
      } else {
        setError("Connection issue with the calling service.");
      }
    });

    return () => { peer.destroy(); peerRef.current = null; };
  }, [token, user?._id]);

  const startCall = useCallback(async (targetUserId, targetName) => {
    if (!peerRef.current || status !== "idle") return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setPeerName(targetName || "Calling…");
      setStatus("calling");
      const call = peerRef.current.call(peerIdFor(targetUserId), stream, { metadata: { callerName: user?.name } });
      wireCallEvents(call);
    } catch {
      setError("Microphone access is required to make a call.");
      cleanup();
    }
  }, [status, user?.name, wireCallEvents, cleanup]);

  const answerCall = useCallback(async () => {
    const call = currentCallRef.current;
    if (!call) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      wireCallEvents(call); // re-wires the same call, now that we're answering
      call.answer(stream);
    } catch {
      setError("Microphone access is required to answer.");
      call.close();
      cleanup();
    }
  }, [wireCallEvents, cleanup]);

  const declineCall = useCallback(() => {
    currentCallRef.current?.close();
    cleanup();
  }, [cleanup]);

  const hangUp = useCallback(() => { cleanup(); }, [cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  return (
    <CallContext.Provider value={{ status, peerName, muted, duration, error, audioBlocked, startCall, answerCall, declineCall, hangUp, toggleMute, retryAudio, clearError: () => setError("") }}>
      {children}
    </CallContext.Provider>
  );
}
