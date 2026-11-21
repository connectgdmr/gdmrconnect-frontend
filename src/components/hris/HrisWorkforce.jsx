import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbPlus, TbTrash, TbDownload, TbFileTypePdf, TbFileTypeXls, TbSearch } from "react-icons/tb";
import { DateInput, Field, Row, Section, TabBar } from "./shared";
import { useApi, fmtDate, tab, downloadText, downloadBlob, todayIso } from "./util";
import HrisForm from "./HrisForm";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const STATUS_COLOR = { "On Probation": "#d97706", Active: "#16a34a", "Serving Notice": "#b45309", Exited: "#64748b" };
const th = { textAlign: "left", padding: "8px 10px", fontSize: 12, color: "#64748b", fontWeight: 700, whiteSpace: "nowrap" };
const td = { padding: "8px 10px", fontSize: 13, borderTop: "1px solid #f1f5f9", verticalAlign: "top" };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default function HrisWorkforce({ token, onChanged }) {
  const { call } = useApi(token);
  const [tabKey, setTabKey] = useState(() => { try { const t = sessionStorage.getItem("hrisTab"); sessionStorage.removeItem("hrisTab"); return t || "list"; } catch { return "list"; } });
  const [meta, setMeta] = useState(null);
  const [managers, setManagers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null);

  const loadRefs = useCallback(async () => {
    const [m, mg] = await Promise.all([call("/hris/meta"), call("/hris/managers")]);
    if (m.ok) setMeta(m.data);
    if (mg.ok) setManagers(mg.data);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadRefs(); }, [loadRefs]);

  const tabs = [["list", "Employees"], ["add", "Add employee"], ["bulk", "Bulk upload"], ["expiry", "Documents & expiry"], ["reports", "Reports"], ["audit", "Change log"], ["org", "Org chart"], ["payroll", "Payroll files"], ["settings", "Settings"]];
  if (!meta) return <div className="card"><div className="loader" style={{ margin: "30px auto" }} /></div>;

  return (
    <div style={{ marginTop: 16 }}>
      <TabBar>{tabs.map(([k, l]) => <button key={k} style={tab(tabKey === k)} onClick={() => { setTabKey(k); setEditId(null); if (k !== "add") setDraft(null); }}>{l}</button>)}</TabBar>
      {tabKey === "list" && (editId
        ? <HrisForm key={editId} token={token} mode="edit" empId={editId} meta={meta} managers={managers} onCancel={() => setEditId(null)} onSaved={() => { onChanged && onChanged(); }} />
        : <EmployeeList call={call} onOpen={setEditId} onAdd={() => setTabKey("add")} />)}
      {tabKey === "add" && <AddEmployee key={draft?._id || "new"} call={call} token={token} meta={meta} managers={managers} draft={draft} onPickDraft={setDraft}
        onDone={() => { setDraft(null); loadRefs(); onChanged && onChanged(); setTabKey("list"); }} />}
      {tabKey === "bulk" && <Bulk call={call} onImported={() => { loadRefs(); onChanged && onChanged(); }} />}
      {tabKey === "expiry" && <Expiry call={call} />}
      {tabKey === "reports" && <Reports call={call} />}
      {tabKey === "audit" && <Audit call={call} />}
      {tabKey === "org" && <OrgChart call={call} />}
      {tabKey === "payroll" && <PayrollFiles call={call} />}
      {tabKey === "settings" && <Settings call={call} meta={meta} onSaved={loadRefs} />}
    </div>
  );
}

// ── employees ────────────────────────────────────────────────────────────────
function EmployeeList({ call, onOpen, onAdd }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { call("/hris/employees").then(r => setRows(r.ok ? r.data : [])); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => (rows || []).filter(r => !q || `${r.name} ${r.email} ${r.department} ${r.code} ${r.job_title}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  if (!rows) return <div className="card"><div className="loader" style={{ margin: "30px auto" }} /></div>;
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: "var(--brand)", flex: 1 }}>Employees <span className="small" style={{ color: "#94a3b8" }}>· {rows.length}</span></h3>
        <div style={{ position: "relative" }}><TbSearch style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} /><input className="modern-input" style={{ margin: 0, paddingLeft: 32, width: 240 }} placeholder="Search name, email, department…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <button className="btn" onClick={onAdd}><TbPlus /> Add employee</button>
      </div>
      {rows.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>No employees yet. Add one, or upload them all from Excel.</div> : (
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>ID</th><th style={th}>Name</th><th style={th}>Department</th><th style={th}>Job title</th><th style={th}>Office</th><th style={th}>Type</th><th style={th}>Status</th><th style={th}>Joined</th><th style={th}>Manager</th></tr></thead>
          <tbody>{list.map(r => (
            <tr key={r._id} onClick={() => onOpen(r._id)} style={{ cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
              <td style={td}>{r.code}</td><td style={{ ...td, fontWeight: 700 }}>{r.name}<div style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>{r.email}</div></td><td style={td}>{r.department}</td><td style={td}>{r.job_title}</td><td style={td}>{r.office}</td><td style={td}>{r.employment_type}</td>
              <td style={td}><span style={{ color: STATUS_COLOR[r.status] || "#334155", fontWeight: 700 }}>{r.status}</span></td><td style={td}>{fmtDate(r.doj)}</td><td style={td}>{r.manager || "—"}</td></tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}

function AddEmployee({ call, token, meta, managers, draft, onPickDraft, onDone }) {
  const [drafts, setDrafts] = useState([]);
  useEffect(() => { call("/hris/drafts").then(r => r.ok && setDrafts(r.data)); }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  async function del(id) { await call(`/hris/drafts/${id}`, { method: "DELETE" }); setDrafts(d => d.filter(x => x._id !== id)); }
  return (
    <div>
      {!draft && drafts.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Your drafts</div>
          {drafts.map(d => (
            <div key={d._id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderTop: "1px solid #f1f5f9", fontSize: 13.5 }}>
              <span style={{ flex: 1 }}><b>{d.title}</b> <span className="small" style={{ color: "#94a3b8" }}>saved {fmtDate((d.updated_at || "").slice(0, 10))}</span></span>
              <button className="btn ghost" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => onPickDraft(d)}>Continue</button>
              <button className="btn ghost" aria-label="Delete draft" style={{ padding: "4px 8px" }} onClick={() => del(d._id)}><TbTrash /></button>
            </div>))}
        </div>
      )}
      <HrisForm token={token} mode="add" meta={meta} managers={managers} draft={draft} onCancel={onDone} onSaved={onDone} />
    </div>
  );
}

// ── Excel bulk upload ────────────────────────────────────────────────────────
function Bulk({ call, onImported }) {
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const input = useRef(null);
  async function template() {
    const r = await call("/hris/import/template");
    if (r.ok) downloadBlob("aieque-employee-import-template.xlsx", await r.res.blob()); else setMsg("Could not download the template.");
  }
  async function send(commit) {
    if (!file) return setMsg("Choose the filled-in Excel file first.");
    setBusy(true); setMsg("");
    const form = new FormData(); form.append("file", file); form.append("commit", commit ? "1" : "0");
    const r = await call("/hris/import", { method: "POST", form });
    setBusy(false);
    if (r.ok) { setRes(r.data); if (commit) onImported && onImported(); } else { setRes(null); setMsg(r.data?.message || "Upload failed."); }
  }
  function csvOfProblems() {
    const lines = [["Row", "Name", "Email", "Problem"]];
    (res?.rows || []).filter(x => x.status === "error").forEach(x => Object.values(x.errors).forEach(v => lines.push([x.row, x.name, x.email, v])));
    downloadText("import-problems.csv", lines.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n"), "text/csv");
  }
  return (
    <div className="card">
      <h3 style={{ marginTop: 0, color: "var(--brand)" }}>Add all your staff from Excel</h3>
      <ol style={{ paddingLeft: 18, fontSize: 13.5, color: "#334155", lineHeight: 1.7 }}>
        <li>Download the template and fill in one row per employee (dates as dd/mm/yyyy).</li>
        <li>Upload it here and press <b>Check the file</b>. Nothing is saved yet - you will see every row with a mistake and why.</li>
        <li>Fix the file if needed, or press <b>Import</b> to add the correct rows. A person already in the system, or repeated in the file, is never added twice.</li>
      </ol>
      <Row style={{ alignItems: "center" }}>
        <button className="btn ghost" onClick={template}><TbDownload /> Download Excel template</button>
        <input ref={input} type="file" accept=".xlsx" onChange={e => { setFile(e.target.files?.[0] || null); setRes(null); setMsg(""); }} />
        <button className="btn" disabled={busy || !file} onClick={() => send(false)}>{busy ? "Working…" : "Check the file"}</button>
      </Row>
      {msg && <div style={{ color: "#b91c1c", fontSize: 13 }}>{msg}</div>}
      {res && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 8, fontSize: 14 }}>
            <b>{res.total} rows</b><span style={{ color: "#16a34a" }}>✔ {res.committed ? `${res.imported} imported` : `${res.ok} ready`}</span>
            {res.bad > 0 && <span style={{ color: "#b91c1c" }}>✖ {res.bad} with mistakes</span>}
            {!res.committed && res.ok > 0 && <button className="btn" disabled={busy} onClick={() => send(true)}>Import {res.ok} correct row{res.ok === 1 ? "" : "s"}</button>}
            {res.bad > 0 && <button className="btn ghost" onClick={csvOfProblems}><TbDownload /> Download the problems</button>}
          </div>
          {res.committed && res.rows.some(x => x.temp_password) && <div className="small" style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 10px", marginBottom: 8, color: "#92400e" }}>
            Emails are off in this trial. Temporary passwords were created - <button className="btn ghost" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => downloadText("temporary-passwords.csv", ["Name,Login,Temporary password", ...res.rows.filter(x => x.temp_password).map(x => `"${x.name}",${x.email},${x.temp_password}`)].join("\r\n"), "text/csv")}>download the list</button></div>}
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Row</th><th style={th}>Name</th><th style={th}>Work email</th><th style={th}>Result</th></tr></thead>
            <tbody>{res.rows.map(x => (
              <tr key={x.row}><td style={td}>{x.row}</td><td style={td}>{x.name}</td><td style={td}>{x.email}</td>
                <td style={td}>{x.status === "error" ? <div style={{ color: "#b91c1c" }}>{Object.values(x.errors).map((e, i) => <div key={i}>✖ {e}</div>)}</div>
                  : <span style={{ color: "#16a34a" }}>{x.status === "imported" ? "✔ Imported" : "✔ OK"}</span>}
                  {Object.values(x.warnings || {}).map((w, i) => <div key={i} style={{ color: "#b45309" }}>⚠ {w}</div>)}</td></tr>))}</tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}

// ── documents & expiry ───────────────────────────────────────────────────────
const BUCKET = { expired: ["Expired", "#b91c1c", "#fef2f2"], 30: ["Within 30 days", "#c2410c", "#fff7ed"], 60: ["Within 60 days", "#b45309", "#fffbeb"], 90: ["Within 90 days", "#1d4ed8", "#eff6ff"] };
function Expiry({ call }) {
  const [d, setD] = useState(null);
  const [f, setF] = useState("all");
  useEffect(() => { call("/hris/expiries").then(r => setD(r.ok ? r.data : { items: [], counts: {} })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <div className="card"><div className="loader" style={{ margin: "30px auto" }} /></div>;
  const items = d.items.filter(i => f === "all" || i.bucket === f || (f === "docs" && i.kind === "document"));
  return (
    <div className="card">
      <h3 style={{ marginTop: 0, color: "var(--brand)" }}>Documents about to expire</h3>
      <p className="small" style={{ color: "#64748b" }}>Passports, residence visas, Emirates IDs, labour cards, health insurance, ILOE, the trade licence, probation ends and contract ends. Reminders are due {(d.alert_days || [90, 60, 30]).join(", ")} days before each date.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button className={`btn ${f === "all" ? "" : "ghost"}`} style={{ padding: "5px 12px", fontSize: 12.5 }} onClick={() => setF("all")}>All ({d.items.length})</button>
        {Object.entries(BUCKET).map(([k, [l, c]]) => <button key={k} className={`btn ${f === k ? "" : "ghost"}`} style={{ padding: "5px 12px", fontSize: 12.5, color: f === k ? undefined : c }} onClick={() => setF(k)}>{l} ({d.counts[k] || 0})</button>)}
      </div>
      {items.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Nothing is expiring in the next 90 days. 🎉</div> : (
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Employee</th><th style={th}>Department</th><th style={th}>What</th><th style={th}>Date</th><th style={th}>When</th></tr></thead>
          <tbody>{items.map((i, n) => { const [, c, bg] = BUCKET[i.bucket] || ["", "#334155", "#fff"]; return (
            <tr key={n}><td style={{ ...td, fontWeight: 700 }}>{i.employee}</td><td style={td}>{i.department}</td><td style={td}>{i.label}{i.note && <div className="small" style={{ color: "#94a3b8" }}>{i.note}</div>}</td><td style={td}>{fmtDate(i.date)}</td>
              <td style={td}><span style={{ background: bg, color: c, borderRadius: 99, padding: "2px 10px", fontWeight: 700, fontSize: 12 }}>{i.days < 0 ? `${-i.days} days ago` : i.days === 0 ? "Today" : `in ${i.days} days`}</span></td></tr>); })}</tbody>
        </table></div>
      )}
    </div>
  );
}

// ── reports (Excel / PDF) ────────────────────────────────────────────────────
const REPORTS = [["headcount", "Staff list"], ["leavers", "Staff leaving"], ["leave-balances", "Leave balances"], ["attendance", "Attendance summary"], ["expiries", "Documents about to expire"]];
function Reports({ call }) {
  const [name, setName] = useState("headcount");
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [rep, setRep] = useState(null);
  useEffect(() => { setRep(null); call(`/hris/reports/${name}${name === "attendance" ? `?month=${month}` : ""}`).then(r => setRep(r.ok ? r.data : { title: "", columns: [], rows: [], summary: r.data?.message || "Could not load the report." })); }, [name, month]); // eslint-disable-line react-hooks/exhaustive-deps
  function table() {
    return `<table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-family:Arial;font-size:12px"><tr>${rep.columns.map(c => `<th style="background:#e2e8f0">${esc(c)}</th>`).join("")}</tr>${rep.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
  }
  const excel = () => downloadText(`${rep.title}.xls`, `<html><head><meta charset="utf-8"></head><body><h3>${esc(rep.title)}</h3>${table()}</body></html>`, "application/vnd.ms-excel");
  function pdf() {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>${esc(rep.title)}</title></head><body style="font-family:Arial;padding:20px"><h2>${esc(rep.title)}</h2><p>${esc(rep.summary)}</p>${table()}<script>window.onload=function(){window.print()}</script></body></html>`); w.document.close();
  }
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: "var(--brand)", flex: 1 }}>Reports</h3>
        <select className="modern-input" style={{ margin: 0, width: 240 }} value={name} onChange={e => setName(e.target.value)}>{REPORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        {name === "attendance" && <input type="month" className="modern-input" style={{ margin: 0, width: 160 }} value={month} onChange={e => setMonth(e.target.value)} />}
        <button className="btn ghost" disabled={!rep?.rows?.length} onClick={excel}><TbFileTypeXls /> Excel</button>
        <button className="btn ghost" disabled={!rep?.rows?.length} onClick={pdf}><TbFileTypePdf /> PDF</button>
      </div>
      {!rep ? <div className="loader" style={{ margin: "30px auto" }} /> : (<>
        <div className="small" style={{ color: "#64748b", marginBottom: 8 }}>{rep.summary}</div>
        {rep.rows.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Nothing to show yet.</div> : (
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{rep.columns.map(c => <th key={c} style={th}>{c}</th>)}</tr></thead>
            <tbody>{rep.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{/^\d{4}-\d{2}-\d{2}$/.test(String(c)) ? fmtDate(c) : String(c ?? "")}</td>)}</tr>)}</tbody>
          </table></div>)}
      </>)}
    </div>
  );
}

// ── change log ───────────────────────────────────────────────────────────────
function Audit({ call }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { call("/hris/audit").then(r => setRows(r.ok ? r.data : [])); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows) return <div className="card"><div className="loader" style={{ margin: "30px auto" }} /></div>;
  return (
    <div className="card">
      <h3 style={{ marginTop: 0, color: "var(--brand)" }}>Record of changes</h3>
      <p className="small" style={{ color: "#64748b" }}>Who changed an employee's salary, job title, manager, status, leave balance or documents - what it was before, what it is now, and when.</p>
      {rows.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No changes recorded yet.</div> : (
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>When</th><th style={th}>Who</th><th style={th}>Employee</th><th style={th}>What</th><th style={th}>Before</th><th style={th}>After</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r._id}><td style={td}>{fmtDate(r.at.slice(0, 10))} {new Date(r.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td><td style={td}>{r.by_name}</td><td style={td}>{r.employee}</td><td style={td}>{r.field}</td><td style={{ ...td, color: "#b91c1c" }}>{r.before || "—"}</td><td style={{ ...td, color: "#166534", fontWeight: 700 }}>{r.after || "—"}</td></tr>)}</tbody>
        </table></div>)}
    </div>
  );
}

// ── org chart ────────────────────────────────────────────────────────────────
function OrgChart({ call }) {
  const [people, setPeople] = useState(null);
  useEffect(() => { call("/hris/orgchart").then(r => setPeople(r.ok ? r.data : [])); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!people) return <div className="card"><div className="loader" style={{ margin: "30px auto" }} /></div>;
  const kids = id => people.filter(p => p.manager_id === id);
  const roots = people.filter(p => !p.manager_id);
  const Node = ({ p, depth = 0 }) => (
    <div style={{ marginLeft: depth ? 22 : 0, borderLeft: depth ? "2px solid #e2e8f0" : "none", paddingLeft: depth ? 12 : 0 }}>
      <div style={{ display: "inline-block", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "7px 12px", margin: "4px 0", minWidth: 200 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5 }}>{p.name}</div><div className="small" style={{ color: "#64748b" }}>{p.title || "—"}{p.department ? ` · ${p.department}` : ""}</div></div>
      {depth < 8 && kids(p._id).map(k => <Node key={k._id} p={k} depth={depth + 1} />)}
    </div>
  );
  return <div className="card"><h3 style={{ marginTop: 0, color: "var(--brand)" }}>Who reports to whom</h3>{roots.length === 0 ? <div style={{ color: "#94a3b8" }}>No one yet.</div> : roots.map(r => <Node key={r._id} p={r} />)}</div>;
}

// ── payroll files (WPS) ──────────────────────────────────────────────────────
function PayrollFiles({ call }) {
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState(false);
  async function prepare() { setBusy(true); const x = await call(`/hris/wps?month=${month}`); setBusy(false); setR(x.ok ? x.data : { problems: [x.data?.message || "Could not prepare the file."], records: 0 }); }
  return (
    <div className="card">
      <h3 style={{ marginTop: 0, color: "var(--brand)" }}>Wages Protection System (WPS) file</h3>
      <p className="small" style={{ color: "#64748b" }}>Prepares the salary file (SIF) for your bank from each employee's saved salary and bank details. Employees without an IBAN, routing code or WPS person ID are listed so you can complete them. Payslips and salary runs are in the <b>Payroll</b> page.</p>
      <Row style={{ alignItems: "flex-end" }}>
        <Field label="Salary month"><input type="month" className="modern-input" style={{ margin: 0 }} value={month} onChange={e => setMonth(e.target.value)} /></Field>
        <button className="btn" disabled={busy} onClick={prepare}>{busy ? "Preparing…" : "Prepare WPS file"}</button>
      </Row>
      {r && (<div>
        <div style={{ fontSize: 14, marginBottom: 8 }}><b>{r.records}</b> employee record{r.records === 1 ? "" : "s"}{r.total != null && <> · total <b>AED {Number(r.total).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</b></>}</div>
        {(r.problems || []).length > 0 && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#92400e", marginBottom: 8 }}>{r.problems.map((p, i) => <div key={i}>⚠ {p}</div>)}</div>}
        {r.records > 0 && <button className="btn ghost" onClick={() => downloadText(r.file_name, r.content)}><TbDownload /> Download {r.file_name}</button>}
        {r.records > 0 && r.problems.length > 0 && <div className="small" style={{ color: "#94a3b8", marginTop: 6 }}>The file contains only the employees that are complete.</div>}
      </div>)}
    </div>
  );
}

// ── settings ─────────────────────────────────────────────────────────────────
function Settings({ call, onSaved }) {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => { call("/hris/settings").then(r => r.ok && setS(r.data)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return <div className="card"><div className="loader" style={{ margin: "30px auto" }} /></div>;
  const toggle = d => setS(x => ({ ...x, working_week: x.working_week.includes(d) ? x.working_week.filter(i => i !== d) : [...x.working_week, d].sort() }));
  async function save() {
    setMsg(null);
    const r = await call("/hris/settings", { method: "PUT", body: s });
    if (r.ok) { setS(r.data); setMsg({ ok: true, text: "Settings saved." }); onSaved && onSaved(); } else setMsg({ ok: false, text: r.data?.message || "Could not save." });
  }
  return (
    <div className="card">
      <h3 style={{ marginTop: 0, color: "var(--brand)" }}>Company settings</h3>
      <Section title="Working week" right={<span style={{ display: "flex", gap: 6 }}>
        <button className="btn ghost" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => setS({ ...s, working_week: [0, 1, 2, 3, 4] })}>Monday - Friday</button>
        <button className="btn ghost" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => setS({ ...s, working_week: [0, 1, 2, 3, 4, 5] })}>Monday - Saturday</button></span>}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{DAYS.map((d, i) => (
          <label key={d} style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: s.working_week.includes(i) ? "#ecfeff" : "#fff", cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={s.working_week.includes(i)} onChange={() => toggle(i)} />{d}</label>))}</div>
        <div className="small" style={{ color: "#94a3b8", marginTop: 6 }}>Days that are not ticked, and the UAE public holidays in the <b>Holidays</b> page, are never counted as absences.</div>
      </Section>
      <Section title="Offices" right={<button className="btn ghost" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => setS({ ...s, offices: [...s.offices, { name: "", country: "UAE", city: "" }] })}><TbPlus /> Add office</button>}>
        {s.offices.map((o, i) => (
          <Row key={i} style={{ alignItems: "flex-end", marginBottom: 8 }}>
            <Field label="Office name"><input className="modern-input" style={{ margin: 0 }} value={o.name} onChange={e => setS({ ...s, offices: s.offices.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} /></Field>
            <Field label="Country (decides the leave and legal rules)"><input className="modern-input" style={{ margin: 0 }} value={o.country} onChange={e => setS({ ...s, offices: s.offices.map((x, j) => j === i ? { ...x, country: e.target.value } : x) })} /></Field>
            <Field label="City"><input className="modern-input" style={{ margin: 0 }} value={o.city || ""} onChange={e => setS({ ...s, offices: s.offices.map((x, j) => j === i ? { ...x, city: e.target.value } : x) })} /></Field>
            <button className="btn ghost" aria-label="Remove office" style={{ padding: "8px 10px", marginBottom: 1 }} disabled={s.offices.length <= 1} onClick={() => setS({ ...s, offices: s.offices.filter((_, j) => j !== i) })}><TbTrash /></button>
          </Row>))}
      </Section>
      <Section title="Company documents (reminders at 90, 60 and 30 days)" right={<button className="btn ghost" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => setS({ ...s, company_docs: [...(s.company_docs || []), { name: "", expiry: "" }] })}><TbPlus /> Add</button>}>
        {(s.company_docs || []).map((c, i) => (
          <Row key={i} style={{ alignItems: "flex-end", marginBottom: 8 }}>
            <Field label="Document"><input className="modern-input" style={{ margin: 0 }} value={c.name} placeholder="Trade licence" onChange={e => setS({ ...s, company_docs: s.company_docs.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} /></Field>
            <Field label="Expiry date"><DateInput value={c.expiry} onChange={v => setS({ ...s, company_docs: s.company_docs.map((x, j) => j === i ? { ...x, expiry: v } : x) })} /></Field>
            <button className="btn ghost" aria-label="Remove" style={{ padding: "8px 10px", marginBottom: 1 }} onClick={() => setS({ ...s, company_docs: s.company_docs.filter((_, j) => j !== i) })}><TbTrash /></button>
          </Row>))}
      </Section>
      <Section title="Leave and payroll">
        <Row>
          <Field label="Leave policies (one per line)"><textarea className="modern-input" rows={2} style={{ margin: 0 }} value={(s.leave_policies || []).join("\n")} onChange={e => setS({ ...s, leave_policies: e.target.value.split("\n") })} /></Field>
          <Field label="Days that can be carried to next year"><input className="modern-input" style={{ margin: 0 }} inputMode="numeric" value={s.carry_forward_max_days} onChange={e => setS({ ...s, carry_forward_max_days: e.target.value })} /></Field>
        </Row>
        <Row>
          <Field label="Employer MOHRE establishment ID (for the WPS file)"><input className="modern-input" style={{ margin: 0 }} value={s.employer_id || ""} onChange={e => setS({ ...s, employer_id: e.target.value })} /></Field>
          <Field label="Employer bank routing code (9 digits)"><input className="modern-input" style={{ margin: 0 }} value={s.employer_bank_routing || ""} onChange={e => setS({ ...s, employer_bank_routing: e.target.value })} /></Field>
        </Row>
      </Section>
      {msg && <div style={{ marginBottom: 8, fontSize: 13, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</div>}
      <button className="btn" onClick={save}>Save settings</button>
    </div>
  );
}
