import React, { useState, useEffect, useCallback } from "react";
import { TbCertificate, TbPlus, TbDownload, TbLink, TbRefresh, TbBan, TbHistory, TbX, TbSearch } from "react-icons/tb";
import { API_URL as BASE } from "../api";

const STATUS_STYLE = {
  active:     { label: "Active",     color: "#15803d", bg: "#f0fdf4" },
  revoked:    { label: "Revoked",    color: "#b91c1c", bg: "#fef2f2" },
  superseded: { label: "Superseded", color: "#b45309", bg: "#fffbeb" },
};
const fmtDay = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const ACTION_LABEL = { generated: "Generated", reissued: "Issued as replacement", superseded: "Replaced by a newer certificate", revoked: "Revoked", downloaded: "PDF downloaded" };

export default function AdminCertificates({ token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "ok" });
  const [modal, setModal] = useState(null);       // {kind: "generate"|"reissue"|"revoke"|"history", cert?}
  const [busy, setBusy] = useState(false);

  const flash = (text, type = "ok") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "ok" }), 4500); };
  const call = useCallback(async (path, method = "GET", body) => {
    const r = await fetch(`${BASE}/admin/certificates${path}`, {
      method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || "Something went wrong. Please try again.");
    return d;
  }, [token]);

  const load = useCallback(async () => {
    try { setRows(await call("")); } catch (e) { flash(e.message, "err"); } finally { setLoading(false); }
  }, [call]);
  useEffect(() => { load(); }, [load]);

  async function downloadPdf(c) {
    try {
      const r = await fetch(`${BASE}/admin/certificates/${c._id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Could not download the PDF.");
      const url = URL.createObjectURL(await r.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: `Relieving_Service_Certificate_${c.reference_no}.pdf` });
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) { flash(e.message, "err"); }
  }
  async function copyLink(c) {
    try { await navigator.clipboard.writeText(c.verify_url); flash("Verification link copied."); }
    catch { window.prompt("Copy this verification link:", c.verify_url); }
  }

  const shown = rows.filter(c => (filter === "all" || c.status === filter)
    && (!search.trim() || `${c.employee_name} ${c.employee_code} ${c.reference_no} ${c.designation}`.toLowerCase().includes(search.trim().toLowerCase())));
  const count = (s) => rows.filter(c => s === "all" || c.status === s).length;

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)", display: "flex", alignItems: "center", gap: 8 }}><TbCertificate /> Relieving cum Service Certificates</h3>
          <p className="small" style={{ margin: "4px 0 0" }}>Issue the approved Relieving cum Service Certificate with a QR code that anyone can scan to verify it. Dates and designation come from the employee's HRIS record.</p>
        </div>
        <button className="btn" onClick={() => setModal({ kind: "generate" })} style={{ display: "flex", alignItems: "center", gap: 6 }}><TbPlus size={13} /> Generate certificate</button>
      </div>

      {msg.text && <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: msg.type === "err" ? "#fef2f2" : "#f0fdf4", color: msg.type === "err" ? "#b91c1c" : "#15803d" }}>{msg.text}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[["all", "All"], ["active", "Active"], ["superseded", "Superseded"], ["revoked", "Revoked"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            fontSize: 12.5, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: "pointer",
            border: `1px solid ${filter === k ? "var(--brand)" : "#e2e8f0"}`, background: filter === k ? "var(--brand-light)" : "#fff", color: filter === k ? "var(--brand)" : "#64748b",
          }}>{l} · {count(k)}</button>
        ))}
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 320, marginLeft: "auto" }}>
          <TbSearch style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} />
          <input className="modern-input" placeholder="Search name, ID, reference…" value={search} onChange={e => setSearch(e.target.value)} style={{ margin: 0, paddingLeft: 32 }} />
        </div>
      </div>

      {loading ? <div style={{ color: "#94a3b8", padding: 20 }}>Loading certificates…</div> : shown.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "44px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 34 }}>📜</div>
          <div style={{ fontWeight: 600, color: "#64748b", marginTop: 4 }}>{rows.length ? "No certificates match." : "No certificates issued yet"}</div>
          {!rows.length && <div style={{ fontSize: 12.5, marginTop: 4 }}>Certificates can be generated for employees who have a date of joining and a last working day on record.</div>}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                {["Reference", "Employee", "Service period", "Issued", "Status", "Verified", "Actions"].map(h => <th key={h} style={{ padding: "11px 14px", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map(c => {
                const st = STATUS_STYLE[c.status] || STATUS_STYLE.active;
                return (
                  <tr key={c._id} style={{ borderTop: "1px solid #eef2f6" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 700, whiteSpace: "nowrap" }}>{c.reference_no}{c.replaces && <div style={{ fontWeight: 500, fontSize: 11, color: "#94a3b8" }}>replaces {c.replaces}</div>}{c.superseded_by && <div style={{ fontWeight: 500, fontSize: 11, color: "#94a3b8" }}>replaced by {c.superseded_by}</div>}</td>
                    <td style={{ padding: "11px 14px" }}><div style={{ fontWeight: 600 }}>{c.employee_name}</div><div style={{ fontSize: 11.5, color: "#94a3b8" }}>{c.employee_code} · {c.designation}</div></td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap", color: "#475569" }}>{fmtDay(c.date_of_joining)} → {fmtDay(c.last_working_date)}</td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap", color: "#475569" }}>{fmtDay(c.issue_date)}<div style={{ fontSize: 11, color: "#94a3b8" }}>by {c.issued_by_name || "—"}</div></td>
                    <td style={{ padding: "11px 14px" }}><span style={{ fontSize: 11.5, fontWeight: 700, color: st.color, background: st.bg, padding: "3px 10px", borderRadius: 12 }}>{st.label}</span></td>
                    <td style={{ padding: "11px 14px", color: "#475569", whiteSpace: "nowrap" }}>{c.verify_count} scan{c.verify_count === 1 ? "" : "s"}{c.last_verified_at && <div style={{ fontSize: 11, color: "#94a3b8" }}>last {fmtTime(c.last_verified_at)}</div>}</td>
                    <td style={{ padding: "8px 14px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <IconBtn title="Download PDF" onClick={() => downloadPdf(c)}><TbDownload size={15} /></IconBtn>
                        <IconBtn title="Copy verification link" onClick={() => copyLink(c)}><TbLink size={15} /></IconBtn>
                        <IconBtn title="History" onClick={() => setModal({ kind: "history", cert: c })}><TbHistory size={15} /></IconBtn>
                        {c.status === "active" && <>
                          <IconBtn title="Reissue (replace with a corrected certificate)" onClick={() => setModal({ kind: "reissue", cert: c })}><TbRefresh size={15} /></IconBtn>
                          <IconBtn title="Revoke" danger onClick={() => setModal({ kind: "revoke", cert: c })}><TbBan size={15} /></IconBtn>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal?.kind === "generate" && <GenerateModal call={call} busy={busy} setBusy={setBusy} onClose={() => setModal(null)}
        onDone={async (cert) => { setModal(null); await load(); flash(`Certificate ${cert.reference_no} generated.`); downloadPdf(cert); }} />}
      {modal?.kind === "reissue" && <ReasonModal title="Reissue certificate" cert={modal.cert} confirmLabel="Reissue" busy={busy}
        intro={<>This creates a <b>new certificate</b> from the employee's current HRIS record and marks <b>{modal.cert.reference_no}</b> as superseded. Scans of the old QR code will show that it has been replaced.</>}
        onClose={() => setModal(null)}
        onSubmit={async (reason) => { setBusy(true); try { const n = await call(`/${modal.cert._id}/reissue`, "POST", { reason }); setModal(null); await load(); flash(`Reissued as ${n.reference_no}.`); downloadPdf(n); } catch (e) { flash(e.message, "err"); } finally { setBusy(false); } }} />}
      {modal?.kind === "revoke" && <ReasonModal title="Revoke certificate" cert={modal.cert} confirmLabel="Revoke certificate" danger busy={busy}
        intro={<>Revoking <b>{modal.cert.reference_no}</b> immediately makes its QR code show “Revoked”. This cannot be undone, but you can generate a new certificate afterwards.</>}
        onClose={() => setModal(null)}
        onSubmit={async (reason) => { setBusy(true); try { await call(`/${modal.cert._id}/revoke`, "POST", { reason }); setModal(null); await load(); flash("Certificate revoked."); } catch (e) { flash(e.message, "err"); } finally { setBusy(false); } }} />}
      {modal?.kind === "history" && <HistoryModal call={call} cert={modal.cert} onClose={() => setModal(null)} />}
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} style={{
    width: 30, height: 30, borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    color: danger ? "#b91c1c" : "#475569",
  }}>{children}</button>;
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", padding: 22, boxShadow: "0 20px 50px rgba(15,23,42,.25)" }}>{children}</div>
    </div>
  );
}
function ModalHead({ title, onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{title}</div>
      <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#475569" }}><TbX /></button>
    </div>
  );
}
const lbl = { fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 };

function GenerateModal({ call, onClose, onDone, busy, setBusy }) {
  const [people, setPeople] = useState(null);
  const [empId, setEmpId] = useState("");
  const [name, setName] = useState("");
  const [desg, setDesg] = useState("");
  const [sal, setSal] = useState("");              // Mr. / Ms. / Mx. — chosen by HR, never guessed
  const [posted, setPosted] = useState("");
  const [salutations, setSalutations] = useState(["Mr.", "Ms.", "Mx."]);
  const [err, setErr] = useState("");
  useEffect(() => {
    call("/eligible").then(setPeople).catch(e => { setPeople([]); setErr(e.message); });
    // signatory + posting are set on the server (approved template); HR can still change them per certificate
    call("/defaults").then(d => { setName(d.signatory_name || ""); setDesg(d.signatory_designation || ""); setPosted(d.posted_at || ""); if (d.salutations) setSalutations(d.salutations); }).catch(() => {});
  }, [call]);
  const emp = (people || []).find(p => p._id === empId);

  async function submit(e) {
    e.preventDefault(); setErr("");
    if (!emp) return setErr("Please choose an employee.");
    if (!sal) return setErr("Please choose Mr., Ms. or Mx. — it decides how the certificate refers to the person.");
    if (!name.trim() || !desg.trim()) return setErr("Please enter the authorised signatory's name and designation.");
    setBusy(true);
    try {
      const cert = await call("", "POST", { employee_id: empId, salutation: sal, posted_at: posted.trim(), signatory_name: name.trim(), signatory_designation: desg.trim() });
      onDone(cert);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  return (
    <Overlay onClose={onClose}>
      <form onSubmit={submit}>
        <ModalHead title="Generate Relieving cum Service Certificate" onClose={onClose} />
        <label style={lbl}>Employee *</label>
        <select className="modern-input" value={empId} onChange={e => setEmpId(e.target.value)} style={{ margin: 0 }} disabled={!people}>
          <option value="">{people ? (people.length ? "— Select employee —" : "No eligible employees") : "Loading…"}</option>
          {(people || []).map(p => <option key={p._id} value={p._id}>{p.employee_name}{p.employee_code ? ` (${p.employee_code})` : ""}{p.has_active_certificate ? " — has active certificate" : ""}</option>)}
        </select>
        <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>Only employees with a date of joining and a last working day that has passed are listed.</div>

        {emp && (
          <div style={{ marginTop: 12, border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", background: "#f8fafc", fontSize: 13 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>From the HRIS record (read-only)</div>
            {[["Name", emp.employee_name], ["Employee ID", emp.employee_code || "—"], ["Designation", emp.designation], ["Department", emp.department || "—"],
              ["Date of joining", fmtDay(emp.date_of_joining)], ["Last working date", fmtDay(emp.last_working_date)]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "#64748b" }}>{k}</span><b>{v}</b></div>
            ))}
            <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 6 }}>To correct anything, update the employee record first.</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, marginTop: 14 }}>
          <div>
            <label style={lbl}>Title *</label>
            <select className="modern-input" value={sal} onChange={e => setSal(e.target.value)} style={{ margin: 0 }}>
              <option value="">Select…</option>
              {salutations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Posted at <span style={{ fontWeight: 500, color: "#94a3b8" }}>(shown as “posted at our …”; clear to leave out)</span></label>
            <input className="modern-input" value={posted} onChange={e => setPosted(e.target.value)} placeholder="e.g. Thiruvananthapuram office (Remote)" maxLength={80} style={{ margin: 0 }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div><label style={lbl}>Authorised signatory *</label><input className="modern-input" value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={80} style={{ margin: 0 }} /></div>
          <div><label style={lbl}>Signatory designation *</label><input className="modern-input" value={desg} onChange={e => setDesg(e.target.value)} placeholder="e.g. Managing Director" maxLength={80} style={{ margin: 0 }} /></div>
        </div>
        {err && <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 12.5 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={busy || !emp}>{busy ? "Generating…" : "Generate & download PDF"}</button>
        </div>
      </form>
    </Overlay>
  );
}

function ReasonModal({ title, cert, intro, confirmLabel, danger, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  return (
    <Overlay onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (reason.trim().length >= 5) onSubmit(reason.trim()); }}>
        <ModalHead title={title} onClose={onClose} />
        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.55, marginBottom: 12 }}>{intro}</div>
        <div style={{ fontSize: 12.5, color: "#0f172a", marginBottom: 12 }}><b>{cert.employee_name}</b> · {cert.reference_no}</div>
        <label style={lbl}>Reason * <span style={{ fontWeight: 500, color: "#94a3b8" }}>(kept in the audit trail)</span></label>
        <textarea className="modern-input" rows={3} maxLength={500} autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Designation was entered incorrectly" style={{ resize: "vertical" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={busy || reason.trim().length < 5} style={danger ? { background: "#b91c1c", borderColor: "#b91c1c" } : undefined}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </form>
    </Overlay>
  );
}

function HistoryModal({ call, cert, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { call(`/${cert._id}/audit`).then(setData).catch(e => setErr(e.message)); }, [call, cert._id]);
  return (
    <Overlay onClose={onClose}>
      <ModalHead title={`History · ${cert.reference_no}`} onClose={onClose} />
      {err && <div style={{ color: "#b91c1c", fontSize: 13 }}>{err}</div>}
      {!data && !err && <div style={{ color: "#94a3b8" }}>Loading…</div>}
      {data && (
        <>
          <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 10 }}>Scanned {data.verify_count} time{data.verify_count === 1 ? "" : "s"} in total ({data.verifications_30d} in the last 30 days).</div>
          {data.events.map((e, i) => (
            <div key={i} style={{ padding: "9px 0", borderTop: i ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{ACTION_LABEL[e.action] || e.action}{e.replaced_by && ` → ${e.replaced_by}`}{e.replaces && ` (replaces ${e.replaces})`}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{e.by_name || "—"} · {fmtTime(e.at)}</div>
              {e.reason && <div style={{ fontSize: 12.5, color: "#475569", marginTop: 3 }}>Reason: {e.reason}</div>}
            </div>
          ))}
        </>
      )}
    </Overlay>
  );
}
