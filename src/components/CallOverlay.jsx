import React, { useEffect } from "react";
import { TbPhone, TbPhoneOff, TbMicrophone, TbMicrophoneOff } from "react-icons/tb";
import { useCall } from "./CallContext";

function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function initials(name) {
  const p = String(name || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

export default function CallOverlay() {
  const call = useCall();
  if (!call) return null;
  const { status, peerName, muted, duration, error, audioBlocked, answerCall, declineCall, hangUp, toggleMute, retryAudio, clearError } = call;

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 4000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  if (status === "idle" && !error) return null;

  const avatar = (
    <div style={{
      width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#34a06a,#1c5249)",
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 26, margin: "0 auto 12px",
    }}>
      {initials(peerName)}
    </div>
  );

  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
          borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 500, marginBottom: 10, maxWidth: 280,
        }}>
          {error}
        </div>
      )}

      {status === "ringing" && (
        <div style={{
          background: "#fff", borderRadius: 16, padding: "20px 22px", width: 260,
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)", textAlign: "center", border: "1px solid #e2e8f0",
        }}>
          {avatar}
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 2 }}>{peerName}</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 18 }}>Incoming call…</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <button onClick={declineCall} title="Decline" style={{
              width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "#dc2626", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>
              <TbPhoneOff />
            </button>
            <button onClick={answerCall} title="Answer" style={{
              width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "#16a34a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>
              <TbPhone />
            </button>
          </div>
        </div>
      )}

      {(status === "calling" || status === "connected") && (
        <div style={{
          background: "#fff", borderRadius: 16, padding: "20px 22px", width: 260,
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)", textAlign: "center", border: "1px solid #e2e8f0",
        }}>
          {avatar}
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 2 }}>{peerName}</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: status === "connected" && audioBlocked ? 8 : 18 }}>
            {status === "calling" ? "Calling…" : fmtDuration(duration)}
          </div>
          {status === "connected" && audioBlocked && (
            <button onClick={retryAudio} style={{
              display: "block", margin: "0 auto 14px", border: "1px solid #fde68a", background: "#fffbeb",
              color: "#b45309", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              🔇 Tap to enable audio
            </button>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"} style={{
              width: 44, height: 44, borderRadius: "50%", border: "1px solid #e2e8f0", cursor: "pointer",
              background: muted ? "#f1f5f9" : "#fff", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
            }}>
              {muted ? <TbMicrophoneOff /> : <TbMicrophone />}
            </button>
            <button onClick={hangUp} title="End call" style={{
              width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "#dc2626", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>
              <TbPhoneOff />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
