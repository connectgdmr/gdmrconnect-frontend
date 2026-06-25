import React, { useState, useEffect, useRef } from "react";
import Logo from "../assets/GDMR-LOGO-unit.png";
import { FaCheckCircle, FaCloudUploadAlt, FaExclamationTriangle, FaFilePdf, FaClock, FaTimesCircle } from "react-icons/fa";

const BASE = "https://gdmrconnect-backend-production.up.railway.app/api";

const DEFAULT_DOCS = [
  "Educational Certificate", "Passport Copy", "Visa Copy", "Photograph",
  "Experience Certificate", "Salary Certificate", "Reference Document", "Medical Report",
];

export default function CandidateDocuments({ docToken }) {
  const [phase, setPhase] = useState("loading");   // loading | ready | error
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState([]);  // [{ name, url, status }]
  const [uploading, setUploading] = useState("");  // doc name currently uploading
  const [note, setNote] = useState({ text: "", type: "" });

  useEffect(() => {
    fetch(`${BASE}/ats/documents/${docToken}`)
      .then(async r => { if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || "This link is invalid or has expired."); } return r.json(); })
      .then(d => { setData(d); setSubmitted(d.documents || d.submitted || []); setPhase("ready"); })
      .catch(e => { setErrorMsg(e.message); setPhase("error"); });
  }, [docToken]);

  const flash = (text, type = "success") => { setNote({ text, type }); setTimeout(() => setNote({ text: "", type: "" }), 4000); };

  async function upload(docName, file) {
    if (!file) return;
    // Allow PDFs and images. Many mobile browsers / file managers report an
    // empty file.type, so fall back to checking the file extension before rejecting.
    const ext = (file.name || "").toLowerCase().match(/\.(pdf|png|jpe?g|webp|heic|heif)$/);
    const okType = file.type === "application/pdf" || file.type.startsWith("image/") || !!ext;
    if (!okType) return flash("Please upload a PDF or image file (PDF, JPG, PNG).", "error");
    if (file.size > 15 * 1024 * 1024) return flash("File is too large — please keep it under 15 MB.", "error");

    setUploading(docName);
    try {
      const fd = new FormData();
      fd.append("document", file);     // the file
      fd.append("doc_name", docName);  // which required document this satisfies
      const r = await fetch(`${BASE}/ats/documents/${docToken}`, { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setSubmitted(d.documents || d.submitted || [...submitted.filter(s => s.name !== docName), { name: docName, url: d.url, status: "Pending" }]);
        flash(`${docName} uploaded successfully.`);
      } else {
        flash(d.message || `Upload failed (error ${r.status}). Please try again.`, "error");
      }
    } catch {
      flash("Upload failed — please check your connection and try again.", "error");
    } finally { setUploading(""); }
  }

  const requiredList = (data?.required && data.required.length ? data.required : DEFAULT_DOCS);
  const subFor = (name) => submitted.find(s => s.name === name);
  // A doc only counts as actually uploaded when a file URL exists — the backend
  // may pre-seed the required docs as "Pending" placeholders with no file yet.
  const isUploaded = (sub) => !!(sub && sub.url);

  const Shell = ({ children }) => (
    <div style={{ minHeight: "100vh", background: "#f4f8f6", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px" }}>
      <img src={Logo} alt="GDMR" style={{ height: 44, marginBottom: 22, opacity: 0.95 }} />
      {children}
    </div>
  );

  if (phase === "loading") return <Shell><div className="loader" style={{ margin: "40px auto" }} /></Shell>;

  if (phase === "error") return (
    <Shell>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", textAlign: "center", maxWidth: 440, boxShadow: "0 4px 24px rgba(16,40,30,0.08)" }}>
        <FaExclamationTriangle size={36} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 style={{ margin: "0 0 10px", color: "#0f172a" }}>Link Not Available</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>{errorMsg}</p>
      </div>
    </Shell>
  );

  const allDone = requiredList.every(d => { const s = subFor(d); return isUploaded(s) && s.status !== "Rejected"; });

  return (
    <Shell>
      <div style={{ background: "#fff", borderRadius: 18, padding: "32px 30px", maxWidth: 560, width: "100%", boxShadow: "0 8px 30px rgba(16,40,30,0.10)" }}>
        <h2 style={{ margin: "0 0 4px", color: "var(--brand, #34a06a)", fontSize: 22 }}>Document Submission</h2>
        <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 6px" }}>
          Hi {data?.candidate_name || "there"}, please upload the documents below to continue your application with GDMR.
        </p>
        {data?.job_role && <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 18px" }}>Applying for: <b>{data.job_role}</b></p>}

        {allDone && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", marginBottom: 18, color: "#16a34a", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <FaCheckCircle /> All documents submitted — thank you! Our team will review them shortly.
          </div>
        )}

        {note.text && (
          <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: note.type === "error" ? "#fef2f2" : "#f0fdf4", color: note.type === "error" ? "#b91c1c" : "#16a34a",
            border: `1px solid ${note.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>{note.text}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requiredList.map((docName) => {
            const sub = subFor(docName);
            const uploaded = isUploaded(sub);
            const st = uploaded ? (sub.status || "Pending") : null;   // no status until a file exists
            const stColor = st === "Approved" ? "#16a34a" : st === "Rejected" ? "#dc2626" : "#d97706";
            const needsReupload = st === "Rejected";
            const showUpload = !uploaded || needsReupload;
            return (
              <div key={docName} style={{ border: "1px solid #e6eaef", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a" }}>{docName}</div>
                  {uploaded ? (
                    <div style={{ fontSize: 11.5, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                      {st === "Approved" ? <FaCheckCircle size={11} color="#16a34a" /> : st === "Rejected" ? <FaTimesCircle size={11} color="#dc2626" /> : <FaClock size={11} color="#d97706" />}
                      <span style={{ color: stColor, fontWeight: 700 }}>{st}</span>
                      <a href={sub.url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", marginLeft: 4 }}>view</a>
                      {needsReupload && <span style={{ color: "#dc2626" }}>· please re-upload</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, marginTop: 3, color: "#94a3b8" }}>Not uploaded yet</div>
                  )}
                </div>
                {showUpload && (
                  <label style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "#fff", background: "var(--brand, #34a06a)", borderRadius: 8, padding: "8px 14px", cursor: uploading ? "default" : "pointer", opacity: uploading === docName ? 0.7 : 1 }}>
                    {uploading === docName ? <><span className="btn-spinner" /> Uploading…</> : <><FaCloudUploadAlt size={14} /> {needsReupload ? "Re-upload" : "Upload"}</>}
                    <input type="file" accept="application/pdf,image/*" style={{ display: "none" }} disabled={!!uploading}
                      onChange={e => upload(docName, e.target.files?.[0])} />
                  </label>
                )}
                {uploaded && st === "Approved" && <FaCheckCircle size={18} color="#16a34a" style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 20 }}>
          Accepted: PDF or image (JPG, PNG), up to 15 MB each. Your files are stored securely.
        </p>
      </div>
    </Shell>
  );
}
