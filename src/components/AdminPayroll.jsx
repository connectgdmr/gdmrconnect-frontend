import React, { useState, useEffect } from "react";
import {
  FaMoneyBillWave, FaEdit, FaTimes, FaPlay, FaCheckCircle,
  FaSearch, FaFileInvoiceDollar, FaPrint, FaRupeeSign, FaClock,
} from "react-icons/fa";
import { SkeletonTable, SkeletonStats } from "./Skeleton";

const BASE = "https://gdmrconnect-backend-production.up.railway.app/api";

const EARNINGS = [
  { key: "basic",          label: "Basic Salary" },
  { key: "hra",            label: "House Rent Allowance" },
  { key: "conveyance",     label: "Conveyance" },
  { key: "medical",        label: "Medical Allowance" },
  { key: "special",        label: "Special Allowance" },
  { key: "other_earnings", label: "Other Earnings" },
];
const DEDUCTIONS = [
  { key: "pf",                label: "Provident Fund (PF)" },
  { key: "professional_tax",  label: "Professional Tax" },
  { key: "tds",               label: "Income Tax (TDS)" },
  { key: "other_deductions",  label: "Other Deductions" },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const sumKeys = (obj, keys) => keys.reduce((s, k) => s + (Number(obj?.[k]) || 0), 0);
const grossOf = (s) => sumKeys(s, EARNINGS.map(e => e.key));
const dedOf   = (s) => sumKeys(s, DEDUCTIONS.map(d => d.key));
const netOf   = (s) => grossOf(s) - dedOf(s);

const blankSalary = () => Object.fromEntries([...EARNINGS, ...DEDUCTIONS].map(f => [f.key, ""]));

export default function AdminPayroll({ token, employees = [] }) {
  const [tab, setTab] = useState("setup");

  const [salaries, setSalaries]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");

  // Salary edit modal
  const [editEmp, setEditEmp]     = useState(null);
  const [salaryForm, setSalaryForm] = useState(blankSalary());
  const [savingSalary, setSavingSalary] = useState(false);

  // Run payroll
  const now = new Date();
  const [runMonth, setRunMonth] = useState(now.getMonth());
  const [runYear, setRunYear]   = useState(now.getFullYear());
  const [running, setRunning]   = useState(false);

  // Payslips
  const [payslips, setPayslips]       = useState([]);
  const [slipsLoading, setSlipsLoading] = useState(false);
  const [slipMonth, setSlipMonth]     = useState(now.getMonth());
  const [slipYear, setSlipYear]       = useState(now.getFullYear());
  const [viewSlip, setViewSlip]       = useState(null);

  const [msg, setMsg] = useState({ text: "", type: "" });
  const flash = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3500); };

  const toArr = (d) => Array.isArray(d) ? d : (d?.salaries || d?.payslips || d?.data || []);

  async function loadSalaries() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/payroll/salaries`, { headers: { Authorization: `Bearer ${token}` } });
      let list = r.ok ? toArr(await r.json()) : [];
      // Merge with employees prop so unconfigured staff still appear
      if (employees.length) {
        const byId = {};
        list.forEach(s => { byId[String(s.employee_id || s._id)] = s; });
        list = employees.map(e => {
          const existing = byId[String(e._id)];
          return existing || { employee_id: e._id, employee_name: e.name, department: e.department, salary: null };
        });
      }
      setSalaries(list);
    } catch { setSalaries([]); } finally { setLoading(false); }
  }

  async function loadPayslips() {
    setSlipsLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/payroll/payslips?month=${slipMonth + 1}&year=${slipYear}`, { headers: { Authorization: `Bearer ${token}` } });
      setPayslips(r.ok ? toArr(await r.json()) : []);
    } catch { setPayslips([]); } finally { setSlipsLoading(false); }
  }

  useEffect(() => { loadSalaries(); }, []);
  useEffect(() => { if (tab === "payslips") loadPayslips(); }, [tab, slipMonth, slipYear]);

  function openEdit(row) {
    setEditEmp(row);
    setSalaryForm({ ...blankSalary(), ...(row.salary || {}) });
  }

  async function saveSalary(e) {
    e.preventDefault();
    setSavingSalary(true);
    const payload = Object.fromEntries(Object.entries(salaryForm).map(([k, v]) => [k, Number(v) || 0]));
    try {
      const r = await fetch(`${BASE}/admin/payroll/salaries/${editEmp.employee_id || editEmp._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (r.ok) { flash("Salary structure saved."); setEditEmp(null); loadSalaries(); }
      else { const d = await r.json().catch(() => ({})); flash(d.message || "Failed to save.", "error"); }
    } catch { flash("Network error.", "error"); } finally { setSavingSalary(false); }
  }

  async function runPayroll() {
    if (!window.confirm(`Generate payslips for ${MONTHS[runMonth]} ${runYear}? This will create payslips for all employees with a configured salary.`)) return;
    setRunning(true);
    try {
      const r = await fetch(`${BASE}/admin/payroll/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ month: runMonth + 1, year: runYear }),
      });
      if (r.ok) { const d = await r.json().catch(() => ({})); flash(d.message || "Payslips generated successfully."); setTab("payslips"); setSlipMonth(runMonth); setSlipYear(runYear); }
      else { const d = await r.json().catch(() => ({})); flash(d.message || "Failed to generate payslips.", "error"); }
    } catch { flash("Network error.", "error"); } finally { setRunning(false); }
  }

  async function markPaid(slipId) {
    try {
      await fetch(`${BASE}/admin/payroll/payslips/${slipId}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "Paid" }),
      });
      loadPayslips();
    } catch { flash("Could not update status.", "error"); }
  }

  const configuredCount = salaries.filter(s => s.salary && grossOf(s.salary) > 0).length;
  const monthlyOutlay   = salaries.reduce((sum, s) => sum + (s.salary ? netOf(s.salary) : 0), 0);

  const filteredSalaries = salaries.filter(s =>
    !search || (s.employee_name || "").toLowerCase().includes(search.toLowerCase()) || (s.department || "").toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { key: "setup",    label: "Salary Setup" },
    { key: "run",      label: "Run Payroll" },
    { key: "payslips", label: "Payslips" },
  ];
  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{
      padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
      background: tab === key ? "var(--red)" : "transparent", color: tab === key ? "#fff" : "#64748b", transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "var(--red)" }}>Payroll Management</h3>
        <p className="small">Configure salaries, run monthly payroll, and manage payslips</p>
      </div>

      {msg.text && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: msg.type === "error" ? "#fef2f2" : "#f0fdf4", color: msg.type === "error" ? "#b91c1c" : "#16a34a",
          border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>{msg.text}</div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
        {TABS.map(t => tabBtn(t.key, t.label))}
      </div>

      {/* ── Salary Setup ── */}
      {tab === "setup" && (
        loading ? <><SkeletonStats count={3} /><div style={{ marginTop: 14 }}><SkeletonTable rows={7} cols={5} /></div></>
        : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total Staff",        value: salaries.length,          color: "#334155", bg: "#f8fafc" },
              { label: "Salary Configured",  value: configuredCount,          color: "#16a34a", bg: "#f0fdf4" },
              { label: "Monthly Net Outlay", value: inr(monthlyOutlay),       color: "var(--red)", bg: "#fef2f2" },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: "center", padding: 16, background: s.bg }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ position: "relative", marginBottom: 14, maxWidth: 360 }}>
            <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
            <input className="modern-input" placeholder="Search employee or department…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="styled-table-global">
                <thead><tr><th>Employee</th><th>Department</th><th>Gross / mo</th><th>Net / mo</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredSalaries.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No employees found.</td></tr>
                  ) : filteredSalaries.map(row => {
                    const configured = row.salary && grossOf(row.salary) > 0;
                    return (
                      <tr key={row.employee_id || row._id}>
                        <td style={{ fontWeight: 600 }}>{row.employee_name}</td>
                        <td style={{ fontSize: 13, color: "#64748b" }}>{row.department || "—"}</td>
                        <td>{configured ? inr(grossOf(row.salary)) : <span style={{ color: "#94a3b8", fontSize: 12 }}>Not set</span>}</td>
                        <td style={{ fontWeight: 700, color: configured ? "#16a34a" : "#94a3b8" }}>{configured ? inr(netOf(row.salary)) : "—"}</td>
                        <td>
                          <button className="btn ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => openEdit(row)}>
                            <FaEdit size={11} /> {configured ? "Edit" : "Set Salary"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}

      {/* ── Run Payroll ── */}
      {tab === "run" && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h4 style={{ margin: "0 0 6px", color: "#0f172a" }}>Run Monthly Payroll</h4>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
            Generate payslips for every employee with a configured salary for the selected month.
          </p>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Month</label>
              <select className="modern-input" value={runMonth} onChange={e => setRunMonth(+e.target.value)}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 5 }}>Year</label>
              <select className="modern-input" value={runYear} onChange={e => setRunYear(+e.target.value)}>
                {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "#475569" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>Employees with salary configured</span><span style={{ fontWeight: 700 }}>{configuredCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Estimated net payout</span><span style={{ fontWeight: 700, color: "var(--red)" }}>{inr(monthlyOutlay)}</span>
            </div>
          </div>
          <button className="btn" onClick={runPayroll} disabled={running || configuredCount === 0}
            style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 8 }}>
            <FaPlay size={11} /> {running ? "Generating…" : `Generate Payslips for ${MONTHS[runMonth]} ${runYear}`}
          </button>
        </div>
      )}

      {/* ── Payslips ── */}
      {tab === "payslips" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <select className="modern-input" value={slipMonth} onChange={e => setSlipMonth(+e.target.value)} style={{ margin: 0, maxWidth: 180 }}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select className="modern-input" value={slipYear} onChange={e => setSlipYear(+e.target.value)} style={{ margin: 0, maxWidth: 130 }}>
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {slipsLoading ? <SkeletonTable rows={6} cols={6} />
          : payslips.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <FaFileInvoiceDollar size={38} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ margin: 0 }}>No payslips generated for {MONTHS[slipMonth]} {slipYear}.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="styled-table-global">
                  <thead><tr><th>Employee</th><th>Department</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {payslips.map(p => {
                      const paid = (p.status || "").toLowerCase() === "paid";
                      return (
                        <tr key={p._id}>
                          <td style={{ fontWeight: 600 }}>{p.employee_name}</td>
                          <td style={{ fontSize: 13, color: "#64748b" }}>{p.department || "—"}</td>
                          <td>{inr(p.gross ?? grossOf(p))}</td>
                          <td style={{ color: "#dc2626" }}>−{inr(p.total_deductions ?? dedOf(p))}</td>
                          <td style={{ fontWeight: 700, color: "#16a34a" }}>{inr(p.net ?? netOf(p))}</td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                              color: paid ? "#16a34a" : "#d97706", background: paid ? "#f0fdf4" : "#fffbeb", border: `1px solid ${paid ? "#bbf7d0" : "#fde68a"}` }}>
                              {p.status || "Pending"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setViewSlip(p)}>View</button>
                              {!paid && <button className="btn ghost" style={{ fontSize: 12, padding: "4px 10px", color: "#16a34a", borderColor: "#bbf7d0" }} onClick={() => markPaid(p._id)}>Mark Paid</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Salary Edit Modal ── */}
      {editEmp && (
        <div className="modal-overlay" onClick={() => setEditEmp(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, borderBottom: "1px solid #e2e8f0", paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--red)", fontSize: 15 }}>Salary Structure</h3>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{editEmp.employee_name}{editEmp.department && <span style={{ color: "#94a3b8" }}> · {editEmp.department}</span>}</div>
              </div>
              <button onClick={() => setEditEmp(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><FaTimes size={15} /></button>
            </div>

            <form onSubmit={saveSalary}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Earnings</div>
                  {EARNINGS.map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>{f.label}</label>
                      <div style={{ position: "relative" }}>
                        <FaRupeeSign size={10} style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} />
                        <input className="modern-input" type="number" min="0" step="0.01" value={salaryForm[f.key]} placeholder="0"
                          onChange={e => setSalaryForm(s => ({ ...s, [f.key]: e.target.value }))} style={{ margin: 0, paddingLeft: 26 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Deductions</div>
                  {DEDUCTIONS.map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>{f.label}</label>
                      <div style={{ position: "relative" }}>
                        <FaRupeeSign size={10} style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} />
                        <input className="modern-input" type="number" min="0" step="0.01" value={salaryForm[f.key]} placeholder="0"
                          onChange={e => setSalaryForm(s => ({ ...s, [f.key]: e.target.value }))} style={{ margin: 0, paddingLeft: 26 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live totals */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "18px 0", padding: "14px 0", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b" }}>Gross</div><div style={{ fontWeight: 800, color: "#0f172a" }}>{inr(grossOf(salaryForm))}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b" }}>Deductions</div><div style={{ fontWeight: 800, color: "#dc2626" }}>−{inr(dedOf(salaryForm))}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b" }}>Net Pay</div><div style={{ fontWeight: 800, color: "#16a34a" }}>{inr(netOf(salaryForm))}</div></div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn" type="submit" disabled={savingSalary}>{savingSalary ? "Saving…" : "Save Salary"}</button>
                <button className="btn ghost" type="button" onClick={() => setEditEmp(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Payslip View Modal ── */}
      {viewSlip && <PayslipModal slip={viewSlip} onClose={() => setViewSlip(null)} monthLabel={`${MONTHS[slipMonth]} ${slipYear}`} />}
    </div>
  );
}

// ── Shared printable payslip modal ──────────────────────────────────────────
export function PayslipModal({ slip, onClose, monthLabel }) {
  const gross = slip.gross ?? grossOf(slip);
  const ded   = slip.total_deductions ?? dedOf(slip);
  const net   = slip.net ?? netOf(slip);
  const period = slip.period || monthLabel || "";

  const printSlip = () => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const rows = (items, obj) => items.filter(i => Number(obj?.[i.key]) > 0)
      .map(i => `<tr><td style="padding:6px 0;color:#475569">${i.label}</td><td style="text-align:right;font-weight:600">${inr(obj[i.key])}</td></tr>`).join("");
    w.document.write(`
      <html><head><title>Payslip - ${slip.employee_name}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;color:#0f172a}h1{color:#b91c1c;margin:0}table{width:100%;border-collapse:collapse}
      .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #b91c1c;padding-bottom:16px;margin-bottom:20px}
      .cols{display:flex;gap:40px}.col{flex:1}.tot{border-top:2px solid #e2e8f0;margin-top:12px;padding-top:12px}
      .net{background:#f0fdf4;padding:16px;border-radius:8px;margin-top:20px;display:flex;justify-content:space-between;font-size:18px;font-weight:800}</style>
      </head><body>
      <div class="hdr"><div><h1>GDMR CONNECT</h1><div style="color:#64748b;font-size:13px">Salary Slip</div></div>
      <div style="text-align:right"><div style="font-weight:700">${period}</div></div></div>
      <table style="margin-bottom:24px"><tr><td style="color:#64748b">Employee</td><td style="text-align:right;font-weight:600">${slip.employee_name || ""}</td></tr>
      <tr><td style="color:#64748b">Department</td><td style="text-align:right">${slip.department || "—"}</td></tr></table>
      <div class="cols"><div class="col"><h3 style="color:#16a34a;font-size:13px">EARNINGS</h3><table>${rows(EARNINGS, slip)}
      <tr class="tot"><td style="font-weight:700">Gross</td><td style="text-align:right;font-weight:800">${inr(gross)}</td></tr></table></div>
      <div class="col"><h3 style="color:#dc2626;font-size:13px">DEDUCTIONS</h3><table>${rows(DEDUCTIONS, slip)}
      <tr class="tot"><td style="font-weight:700">Total</td><td style="text-align:right;font-weight:800">${inr(ded)}</td></tr></table></div></div>
      <div class="net"><span>NET PAY</span><span>${inr(net)}</span></div>
      <p style="color:#94a3b8;font-size:11px;margin-top:30px;text-align:center">This is a computer-generated payslip and does not require a signature.</p>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--red)", fontSize: 16 }}>Salary Slip</h3>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{period}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><FaTimes size={15} /></button>
        </div>

        <div style={{ padding: "14px 0", borderBottom: "1px solid #f1f5f9", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{slip.employee_name}</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{slip.department || "—"}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", marginBottom: 8 }}>Earnings</div>
            {EARNINGS.filter(f => Number(slip[f.key]) > 0).map(f => (
              <div key={f.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "#475569" }}>
                <span>{f.label}</span><span style={{ fontWeight: 600 }}>{inr(slip[f.key])}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", marginTop: 8, paddingTop: 8, fontWeight: 700 }}>
              <span>Gross</span><span>{inr(gross)}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", marginBottom: 8 }}>Deductions</div>
            {DEDUCTIONS.filter(f => Number(slip[f.key]) > 0).map(f => (
              <div key={f.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "#475569" }}>
                <span>{f.label}</span><span style={{ fontWeight: 600 }}>{inr(slip[f.key])}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", marginTop: 8, paddingTop: 8, fontWeight: 700, color: "#dc2626" }}>
              <span>Total</span><span>−{inr(ded)}</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 18px", marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "#166534" }}>Net Pay</span>
          <span style={{ fontWeight: 800, fontSize: 22, color: "#16a34a" }}>{inr(net)}</span>
        </div>

        <button className="btn" onClick={printSlip} style={{ width: "100%", marginTop: 16, justifyContent: "center", display: "flex", alignItems: "center", gap: 8 }}>
          <FaPrint size={12} /> Print / Download PDF
        </button>
      </div>
    </div>
  );
}
