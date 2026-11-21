import React, { useEffect, useRef, useState } from "react";
import { TbCalendar } from "react-icons/tb";
import { COUNTRY_CODES, isoToDmy, dmyToIso } from "./util";

// A day/month/year box (type 21052026 and the slashes appear) with a calendar button for picking.
export function DateInput({ value, onChange, onBlur, invalid, placeholder = "dd/mm/yyyy", disabled, id }) {
  const [text, setText] = useState(isoToDmy(value));
  const picker = useRef(null);
  useEffect(() => { if ((value || "") !== dmyToIso(text)) setText(isoToDmy(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  function typed(e) {
    const d = e.target.value.replace(/\D/g, "").slice(0, 8);
    const f = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    setText(f);
    onChange(dmyToIso(f));
  }
  const bad = invalid || (text.length === 10 && !dmyToIso(text));
  return (
    <div style={{ position: "relative" }}>
      <input id={id} className="modern-input" inputMode="numeric" autoComplete="off" disabled={disabled} placeholder={placeholder} value={text} onChange={typed} onBlur={onBlur}
        style={{ margin: 0, paddingRight: 36, borderColor: bad ? "#ef4444" : undefined }} aria-invalid={bad || undefined} />
      <button type="button" tabIndex={-1} aria-label="Pick a date" disabled={disabled} onClick={() => { try { picker.current?.showPicker(); } catch { picker.current?.focus(); } }}
        style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#64748b", display: "flex", padding: 4 }}><TbCalendar size={17} /></button>
      <input ref={picker} type="date" tabIndex={-1} aria-hidden value={value || ""} onChange={e => { onChange(e.target.value); setText(isoToDmy(e.target.value)); onBlur && onBlur(); }}
        style={{ position: "absolute", right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

// label + red star + the error (red) or warning (amber) right under the box
export function Field({ label, req, error, warn, hint, children, style }) {
  return (
    <div style={{ flex: 1, minWidth: 200, ...style }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{label}{req && <span style={{ color: "#dc2626" }} title="Compulsory"> *</span>}</label>
      {children}
      {error ? <div role="alert" style={{ fontSize: 12, color: "#b91c1c", marginTop: 3 }}>{error}</div>
        : warn ? <div style={{ fontSize: 12, color: "#b45309", marginTop: 3 }}>⚠ {warn}</div>
        : hint ? <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 3 }}>{hint}</div> : null}
    </div>
  );
}

export const Row = ({ children, style }) => <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, ...style }}>{children}</div>;
export const Section = ({ title, children, right }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: 6, marginBottom: 12 }}>
      <div style={{ flex: 1, fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{title}</div>{right}
    </div>{children}
  </div>
);

export function PhoneInput({ cc, num, onCc, onNum, onBlur, invalid }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select className="modern-input" value={cc || "+971"} onChange={e => onCc(e.target.value)} style={{ margin: 0, width: 112, flex: "none" }} aria-label="Country code">
        {COUNTRY_CODES.map(([c, n]) => <option key={c + n} value={c}>{c} {n}</option>)}
      </select>
      <input className="modern-input" inputMode="tel" placeholder="50 123 4567" value={num || ""} onChange={e => onNum(e.target.value.replace(/[^\d\s]/g, ""))} onBlur={onBlur}
        style={{ margin: 0, flex: 1, minWidth: 0, borderColor: invalid ? "#ef4444" : undefined }} />
    </div>
  );
}

export const TabBar = ({ children }) => <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>{children}</div>;
