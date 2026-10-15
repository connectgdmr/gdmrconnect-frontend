import React, { useState, useEffect } from "react";
import { TbCircleCheck, TbCircleX, TbAlertTriangle, TbHelpCircle, TbShieldCheck } from "react-icons/tb";
import Logo from "../assets/GDMR-LOGO-unit.png";
import { API_URL } from "../api";

// Public page opened by scanning the QR code on an experience certificate.
// No login. Everything shown comes from the server's live record, so a revoked
// or replaced certificate can never look valid here.
const STATUS = {
  verified:   { icon: <TbCircleCheck />,   color: "#15803d", bg: "#f0fdf4", edge: "#bbf7d0", title: "Verified",
                text: "This certificate is genuine and currently valid." },
  revoked:    { icon: <TbCircleX />,       color: "#b91c1c", bg: "#fef2f2", edge: "#fecaca", title: "Revoked",
                text: "This certificate has been withdrawn by GDMR Foundation and must not be relied upon." },
  superseded: { icon: <TbAlertTriangle />, color: "#b45309", bg: "#fffbeb", edge: "#fde68a", title: "Replaced by a newer certificate",
                text: "This certificate has been replaced. Please ask the holder for the latest certificate and verify that one." },
  invalid:    { icon: <TbHelpCircle />,    color: "#475569", bg: "#f1f5f9", edge: "#cbd5e1", title: "Could not be verified",
                text: "We could not find this certificate in GDMR Foundation's records. It may be forged, altered, or the QR code may be damaged." },
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export default function CertificateVerify({ certToken }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = "Certificate Verification — GDMR Foundation";
    fetch(`${API_URL}/public/certificates/${encodeURIComponent(certToken)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [certToken]);

  const s = data ? (STATUS[data.status] || STATUS.invalid) : null;
  const row = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderTop: "1px solid #eef2f6" }}>
      <span style={{ color: "#64748b", fontSize: 14 }}>{label}</span>
      <span style={{ color: "#0f172a", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <img src={Logo} alt="GDMR Foundation" style={{ height: 54, marginBottom: 8 }} />
          <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", letterSpacing: 0.3 }}>GDMR FOUNDATION</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Certificate Verification</div>
        </div>

        {!data && !error && <div style={{ background: "#fff", borderRadius: 16, padding: 36, textAlign: "center", color: "#64748b" }}>Checking certificate…</div>}

        {error && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, textAlign: "center", color: "#475569" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>We couldn't reach the verification service.</div>
            <div style={{ fontSize: 14 }}>Please check your internet connection and scan the code again. This does not mean the certificate is invalid.</div>
          </div>
        )}

        {data && s && (
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 30px rgba(15,23,42,.08)" }}>
            <div style={{ background: s.bg, borderBottom: `1px solid ${s.edge}`, padding: "26px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 58, color: s.color, lineHeight: 1, display: "flex", justifyContent: "center" }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 8 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: "#334155", marginTop: 6, lineHeight: 1.5 }}>{s.text}</div>
            </div>

            {data.status !== "invalid" && (
              <div style={{ padding: "8px 22px 18px" }}>
                {data.certificate_title && row("Certificate", data.certificate_title)}
                {row("Certificate code", data.reference_no)}
                {data.status === "verified" && <>
                  {row("Name", data.employee_name)}
                  {row("Designation", data.designation)}
                  {row("Date of joining", fmtDate(data.date_of_joining))}
                  {row("Last working date", fmtDate(data.last_working_date))}
                </>}
                {row("Date of issue", fmtDate(data.issue_date))}
                {data.status_date && row(data.status === "revoked" ? "Revoked on" : "Replaced on", fmtDate(data.status_date))}
              </div>
            )}

            <div style={{ padding: "12px 22px 18px", borderTop: "1px solid #eef2f6", fontSize: 12, color: "#94a3b8", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: "#16a34a", marginTop: 1, display: "flex" }}><TbShieldCheck size={15} /></span>
              <span>Checked against GDMR Foundation's official records{data.checked_at ? ` on ${new Date(data.checked_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}. Only details approved for public verification are shown.</span>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 16 }}>
          Questions about a certificate? Contact GDMR Foundation HR.
        </div>
      </div>
    </div>
  );
}
