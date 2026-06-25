import React from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import { getPasswordStrength } from "../utils/security";

/**
 * Live password-strength indicator + rule checklist.
 * Render below a "new password" field. Purely visual — the form should still
 * gate submission on getPasswordStrength(pw).isStrong.
 */
export default function PasswordStrengthMeter({ password = "", showChecklist = true }) {
  if (!password) return null;
  const { score, label, color, checks } = getPasswordStrength(password);
  const pct = Math.min(100, (score / 5) * 100);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: "#eef2f1", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width .2s, background .2s" }} />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color, minWidth: 64, textAlign: "right" }}>{label}</span>
      </div>
      {showChecklist && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", marginTop: 8 }}>
          {checks.map((c) => (
            <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: c.passed ? "#16a34a" : "#94a3b8" }}>
              {c.passed ? <FaCheck size={9} /> : <FaTimes size={9} />} {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
