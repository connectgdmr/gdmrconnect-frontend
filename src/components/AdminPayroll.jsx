import React, { useState, useEffect, lazy, Suspense } from "react";
import { escHtml } from "../utils/security";
import {
  FaMoneyBillWave, FaEdit, FaTimes, FaPlay, FaCheckCircle,
  FaSearch, FaFileInvoiceDollar, FaPrint, FaRupeeSign, FaClock, FaHistory, FaDownload,
} from "react-icons/fa";
import { SkeletonTable, SkeletonStats } from "./Skeleton";

const AdminPayrollLoans = lazy(() => import("./AdminPayrollLoans"));

const BASE = "/api";

const EARNINGS = [
  { key: "basic",            label: "Basic" },
  { key: "da",               label: "DA" },
  { key: "hra",              label: "HRA" },
  { key: "travel_allowance", label: "Travel Allowance" },
  { key: "other_allowance",  label: "Other Allowance" },
];
const DEDUCTIONS = [
  { key: "pf",               label: "PF" },
  { key: "professional_tax", label: "Professional Tax" },
  { key: "gratuity",         label: "Gratuity" },
  { key: "esi",              label: "ESI" },
  { key: "lop",              label: "LOP" },
  { key: "tds",              label: "TDS" },
  { key: "other_deductions", label: "Other Deductions" },
];
// PF, Professional Tax and Gratuity are fixed monthly amounts set once on the
// structure. ESI/LOP/TDS/Other Deductions vary month to month and are set in the
// Run Payroll step instead, so they never touch the structure record or show up
// as a fake "increment" in Salary History.
const STRUCTURE_FIXED_KEYS = ["pf", "professional_tax", "gratuity"];
const STRUCTURE_DEDUCTIONS = DEDUCTIONS.filter(d => STRUCTURE_FIXED_KEYS.includes(d.key));
const MONTHLY_DEDUCTIONS   = DEDUCTIONS.filter(d => !STRUCTURE_FIXED_KEYS.includes(d.key));

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const INCREMENT_TYPES = ["New Hire", "Annual Increment", "Promotion", "Performance Bonus", "Correction", "Other"];

function isOffboarded(emp) {
  const lwd = emp?.resignation?.last_working_day;
  if (!emp?.resignation?.notice_date || !lwd) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(lwd) < today;
}

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmt2 = (n) => Number(n || 0).toFixed(2);
const sumKeys = (obj, keys) => keys.reduce((s, k) => s + (Number(obj?.[k]) || 0), 0);
const grossOf = (s) => sumKeys(s, EARNINGS.map(e => e.key));
const dedOf   = (s) => sumKeys(s, DEDUCTIONS.map(d => d.key));
const structureDedOf = (s) => sumKeys(s, STRUCTURE_DEDUCTIONS.map(d => d.key));
const netOf   = (s) => grossOf(s) + (Number(s?.bonus) || 0) - dedOf(s);

const blankSalary = () => ({
  ...Object.fromEntries([...EARNINGS, ...STRUCTURE_DEDUCTIONS].map(f => [f.key, ""])),
  bonus: "",
  employee_code: "",
  effective_date: new Date().toISOString().slice(0, 10),
  increment_type: "Annual Increment",
  increment_reason: "",
});

function numberToWords(n) {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function w(num) {
    if (num === 0) return "";
    if (num < 20) return ones[num] + " ";
    if (num < 100) return tens[Math.floor(num/10)] + " " + ones[num%10] + " ";
    if (num < 1000) return ones[Math.floor(num/100)] + " Hundred " + w(num%100);
    if (num < 100000) return w(Math.floor(num/1000)) + "Thousand " + w(num%1000);
    if (num < 10000000) return w(Math.floor(num/100000)) + "Lakh " + w(num%100000);
    return w(Math.floor(num/10000000)) + "Crore " + w(num%10000000);
  }
  const amount = Math.round(Number(n) || 0);
  return amount === 0 ? "Zero" : w(amount).trim().replace(/\s+/g, " ");
}

export default function AdminPayroll({ token, employees = [] }) {
  const [tab, setTab] = useState("setup");

  const [salaries, setSalaries]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");

  // Salary edit modal
  const [editEmp, setEditEmp]     = useState(null);
  const [salaryForm, setSalaryForm] = useState(blankSalary());
  const [savingSalary, setSavingSalary] = useState(false);

  // Run payroll — per-employee monthly deductions (ESI/LOP/TDS/Other), entered
  // fresh for each run. Keyed by employee id: { [id]: { esi, lop, tds, other_deductions } }
  const now = new Date();
  const [runMonth, setRunMonth] = useState(now.getMonth());
  const [runYear, setRunYear]   = useState(now.getFullYear());
  const [running, setRunning]   = useState(false);
  const [runAdjustments, setRunAdjustments] = useState({});
  const setRunAdjField = (id, key, value) =>
    setRunAdjustments(a => ({ ...a, [id]: { ...a[id], [key]: value } }));

  // Adjustments are month-specific — clear them when the selected month/year changes
  useEffect(() => { setRunAdjustments({}); }, [runMonth, runYear]);

  // Payslips
  const [payslips, setPayslips]       = useState([]);
  const [slipsLoading, setSlipsLoading] = useState(false);
  const [slipMonth, setSlipMonth]     = useState(now.getMonth());
  const [slipYear, setSlipYear]       = useState(now.getFullYear());
  const [viewSlip, setViewSlip]       = useState(null);
  const [slipSearch, setSlipSearch]   = useState("");

  const [historyModal, setHistoryModal] = useState(null); // { emp, history[] }
  const [historyLoading, setHistoryLoading] = useState(false);

  const [exporting, setExporting] = useState(false);

  const [msg, setMsg] = useState({ text: "", type: "" });
  const flash = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3500); };

  const toArr = (d) => Array.isArray(d) ? d : (d?.salaries || d?.payslips || d?.data || []);

  async function loadSalaries() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/payroll/salaries`, { headers: { Authorization: `Bearer ${token}` } });
      let list = r.ok ? toArr(await r.json()) : [];
      // Merge with employees prop so unconfigured staff still appear (skip fully offboarded staff)
      if (employees.length) {
        const activeEmployees = employees.filter(e => !isOffboarded(e));
        const byId = {};
        list.forEach(s => { byId[String(s.employee_id || s._id)] = s; });
        list = activeEmployees.map(e => {
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

  async function openHistory(row) {
    setHistoryLoading(true);
    setHistoryModal({ emp: row, history: [] });
    try {
      const r = await fetch(`${BASE}/admin/payroll/salaries/${row.employee_id || row._id}/history`, { headers: { Authorization: `Bearer ${token}` } });
      const history = r.ok ? toArr(await r.json()) : [];
      setHistoryModal({ emp: row, history });
    } catch { setHistoryModal(m => m ? { ...m, history: [] } : null); } finally { setHistoryLoading(false); }
  }

  async function saveSalary(e) {
    e.preventDefault();
    setSavingSalary(true);
    const numericKeys = [...EARNINGS, ...STRUCTURE_DEDUCTIONS].map(f => f.key);
    const payload = {
      // Monthly deductions (ESI/LOP/TDS/Other) are never part of the structure —
      // force them to 0 here so an old, since-removed value can't linger on the
      // record. They're set per run in the Run Payroll step instead.
      ...Object.fromEntries(MONTHLY_DEDUCTIONS.map(d => [d.key, 0])),
      ...Object.fromEntries(numericKeys.map(k => [k, Number(salaryForm[k]) || 0])),
      bonus: Number(salaryForm.bonus) || 0,
      employee_code: salaryForm.employee_code || "",
      effective_date: salaryForm.effective_date || new Date().toISOString().slice(0, 10),
      increment_type: salaryForm.increment_type || "Annual Increment",
      increment_reason: salaryForm.increment_reason || "",
    };
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
      const adjustments = salaries
        .filter(s => s.salary && grossOf(s.salary) > 0)
        .map(s => {
          const id = s.employee_id || s._id;
          const a = runAdjustments[id] || {};
          return {
            employee_id: id,
            esi: Number(a.esi) || 0,
            lop: Number(a.lop) || 0,
            tds: Number(a.tds) || 0,
            other_deductions: Number(a.other_deductions) || 0,
          };
        });
      const r = await fetch(`${BASE}/admin/payroll/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ month: runMonth + 1, year: runYear, adjustments }),
      });
      if (r.ok) { const d = await r.json().catch(() => ({})); flash(d.message || "Payslips generated successfully."); setRunAdjustments({}); setTab("payslips"); setSlipMonth(runMonth); setSlipYear(runYear); }
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

  async function exportPayroll(format) {
    setExporting(format);
    try {
      const r = await fetch(`${BASE}/admin/payroll/export?month=${slipMonth + 1}&year=${slipYear}&format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); flash(d.message || "Failed to export payroll.", "error"); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payroll_Export_${MONTHS[slipMonth]}_${slipYear}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { flash("Network error.", "error"); } finally { setExporting(false); }
  }

  const configuredCount = salaries.filter(s => s.salary && grossOf(s.salary) > 0).length;
  const monthlyOutlay   = salaries.reduce((sum, s) => sum + (s.salary ? netOf(s.salary) : 0), 0);

  const filteredSlips = (slipSearch
    ? payslips.filter(p => (String(p.employee_name || "")).toLowerCase().includes(slipSearch.toLowerCase()))
    : payslips
  ).slice().sort((a, b) => String(a.employee_name || "").localeCompare(String(b.employee_name || "")));

  const filteredSalaries = salaries.filter(s =>
    !search ||
    String(s.employee_name || "").toLowerCase().includes(search.toLowerCase()) ||
    String(s.department   || "").toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => String(a.employee_name || "").localeCompare(String(b.employee_name || "")));

  const TABS = [
    { key: "setup",    label: "Salary Setup" },
    { key: "run",      label: "Run Payroll" },
    { key: "payslips", label: "Payslips" },
    { key: "loans",    label: "Loans & Advances" },
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
                        <td style={{ fontSize: 13, color: "#64748b" }}>{String(row.department || "") || "—"}</td>
                        <td>{configured ? inr(grossOf(row.salary)) : <span style={{ color: "#94a3b8", fontSize: 12 }}>Not set</span>}</td>
                        <td style={{ fontWeight: 700, color: configured ? "#16a34a" : "#94a3b8" }}>{configured ? inr(netOf(row.salary)) : "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => openEdit(row)}>
                              <FaEdit size={11} /> {configured ? "Edit" : "Set Salary"}
                            </button>
                            {configured && (
                              <button className="btn ghost" style={{ fontSize: 12, padding: "5px 12px", color: "#7c3aed", borderColor: "#ddd6fe" }} onClick={() => openHistory(row)}>
                                <FaHistory size={11} /> History
                              </button>
                            )}
                          </div>
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
      {tab === "run" && (() => {
        const runSalaries = salaries.filter(s => s.salary && grossOf(s.salary) > 0)
          .sort((a, b) => String(a.employee_name || "").localeCompare(String(b.employee_name || "")));
        const netPreviewOf = (s) => {
          const id = s.employee_id || s._id;
          const a = runAdjustments[id] || {};
          const monthlyDed = MONTHLY_DEDUCTIONS.reduce((sum, d) => sum + (Number(a[d.key]) || 0), 0);
          return grossOf(s.salary) + (Number(s.salary.bonus) || 0) - structureDedOf(s.salary) - monthlyDed;
        };
        const estimatedPayout = runSalaries.reduce((sum, s) => sum + netPreviewOf(s), 0);

        return (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h4 style={{ margin: "0 0 6px", color: "#0f172a" }}>Run Monthly Payroll</h4>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
              Set this month's ESI, LOP, TDS and Other Deductions per employee, then generate payslips.
              Base salary stays untouched — these values apply only to this run.
            </p>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, maxWidth: 560 }}>
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
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#475569", maxWidth: 560 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Employees with salary configured</span><span style={{ fontWeight: 700 }}>{runSalaries.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Estimated net payout</span><span style={{ fontWeight: 700, color: "var(--red)" }}>{inr(estimatedPayout)}</span>
              </div>
            </div>
          </div>

          {runSalaries.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
              No employees have a configured salary yet — set one up in Salary Setup first.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="styled-table-global">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      {MONTHLY_DEDUCTIONS.map(d => <th key={d.key}>{d.label}</th>)}
                      <th>Net Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runSalaries.map(row => {
                      const id = row.employee_id || row._id;
                      const a = runAdjustments[id] || {};
                      return (
                        <tr key={id}>
                          <td style={{ fontWeight: 600 }}>
                            {row.employee_name}
                            <div style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>{row.department || "—"}</div>
                          </td>
                          {MONTHLY_DEDUCTIONS.map(d => (
                            <td key={d.key}>
                              <input
                                className="modern-input" type="number" min="0" step="0.01" placeholder="0"
                                value={a[d.key] ?? ""}
                                onChange={e => setRunAdjField(id, d.key, e.target.value)}
                                style={{ margin: 0, width: 100 }}
                              />
                            </td>
                          ))}
                          <td style={{ fontWeight: 700, color: "#16a34a" }}>{inr(netPreviewOf(row))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button className="btn" onClick={runPayroll} disabled={running || runSalaries.length === 0}
            style={{ width: "100%", maxWidth: 560, justifyContent: "center", display: "flex", alignItems: "center", gap: 8 }}>
            <FaPlay size={11} /> {running ? "Generating…" : `Generate Payslips for ${MONTHS[runMonth]} ${runYear}`}
          </button>
        </div>
        );
      })()}

      {/* ── Payslips ── */}
      {tab === "payslips" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <select className="modern-input" value={slipMonth} onChange={e => setSlipMonth(+e.target.value)} style={{ margin: 0, maxWidth: 180 }}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select className="modern-input" value={slipYear} onChange={e => setSlipYear(+e.target.value)} style={{ margin: 0, maxWidth: 130 }}>
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
              <input className="modern-input" placeholder="Search by employee name…" value={slipSearch}
                onChange={e => setSlipSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
            </div>
            <button className="btn ghost" onClick={() => exportPayroll("xlsx")} disabled={!!exporting || payslips.length === 0}
              style={{ display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              <FaDownload size={11} /> {exporting === "xlsx" ? "Exporting…" : "Export Excel"}
            </button>
            <button className="btn ghost" onClick={() => exportPayroll("pdf")} disabled={!!exporting || payslips.length === 0}
              style={{ display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              <FaDownload size={11} /> {exporting === "pdf" ? "Exporting…" : "Export PDF"}
            </button>
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
                    {filteredSlips.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No payslips match "{slipSearch}".</td></tr>
                    ) : filteredSlips.map(p => {
                      const paid = (String(p.status || "")).toLowerCase() === "paid";
                      const totalDed = (p.total_deductions ?? dedOf(p)) + (Number(p.loan_emi) || 0) + (Number(p.advance_recovery) || 0);
                      return (
                        <tr key={String(p._id || p.employee_id || Math.random())}>
                          <td style={{ fontWeight: 600 }}>{String(p.employee_name || "")}</td>
                          <td style={{ fontSize: 13, color: "#64748b" }}>{String(p.department || "") || "—"}</td>
                          <td>{inr(p.gross ?? grossOf(p))}</td>
                          <td style={{ color: "#dc2626" }}>−{inr(totalDed)}</td>
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

      {/* ── Loans & Advances ── */}
      {tab === "loans" && (
        <Suspense fallback={<div style={{ marginTop: 16 }}><SkeletonTable rows={5} cols={8} /></div>}>
          <AdminPayrollLoans token={token} employees={employees} />
        </Suspense>
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
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4, fontWeight: 600 }}>Employee Code</label>
                <input
                  className="modern-input"
                  placeholder="e.g. GDMR-001, EMP001"
                  value={salaryForm.employee_code || ""}
                  onChange={e => setSalaryForm(s => ({ ...s, employee_code: e.target.value }))}
                  style={{ margin: 0 }}
                />
              </div>

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
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Bonus</label>
                    <div style={{ position: "relative" }}>
                      <FaRupeeSign size={10} style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} />
                      <input className="modern-input" type="number" min="0" step="0.01" value={salaryForm.bonus} placeholder="0"
                        onChange={e => setSalaryForm(s => ({ ...s, bonus: e.target.value }))} style={{ margin: 0, paddingLeft: 26 }} />
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Deductions</div>
                  {STRUCTURE_DEDUCTIONS.map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>{f.label}</label>
                      <div style={{ position: "relative" }}>
                        <FaRupeeSign size={10} style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} />
                        <input className="modern-input" type="number" min="0" step="0.01" value={salaryForm[f.key]} placeholder="0"
                          onChange={e => setSalaryForm(s => ({ ...s, [f.key]: e.target.value }))} style={{ margin: 0, paddingLeft: 26 }} />
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "10px 0 0", lineHeight: 1.5 }}>
                    ESI, LOP, TDS and Other Deductions vary every month — set them in
                    <strong style={{ color: "#64748b" }}> Run Payroll</strong> instead, right before generating that month's payslips.
                  </p>
                </div>
              </div>

              {/* Live totals */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, margin: "18px 0", padding: "14px 0", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b" }}>Gross</div><div style={{ fontWeight: 800, color: "#0f172a" }}>{inr(grossOf(salaryForm))}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b" }}>Bonus</div><div style={{ fontWeight: 800, color: "#0f172a" }}>{inr(salaryForm.bonus)}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b" }}>Deductions</div><div style={{ fontWeight: 800, color: "#dc2626" }}>−{inr(structureDedOf(salaryForm))}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b" }}>Net Pay</div><div style={{ fontWeight: 800, color: "#16a34a" }}>{inr(grossOf(salaryForm) + (Number(salaryForm.bonus) || 0) - structureDedOf(salaryForm))}</div></div>
              </div>

              {/* Increment details */}
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Increment / Change Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Effective Date</label>
                    <input className="modern-input" type="date" value={salaryForm.effective_date || ""} onChange={e => setSalaryForm(s => ({ ...s, effective_date: e.target.value }))} style={{ margin: 0 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Type</label>
                    <select className="modern-input" value={salaryForm.increment_type || "Annual Increment"} onChange={e => setSalaryForm(s => ({ ...s, increment_type: e.target.value }))} style={{ margin: 0 }}>
                      {INCREMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Reason / Notes</label>
                    <input className="modern-input" placeholder="e.g. Annual appraisal cycle, promotion to Senior role…" value={salaryForm.increment_reason || ""} onChange={e => setSalaryForm(s => ({ ...s, increment_reason: e.target.value }))} style={{ margin: 0 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn" type="submit" disabled={savingSalary}>{savingSalary ? "Saving…" : "Save Salary"}</button>
                <button className="btn ghost" type="button" onClick={() => setEditEmp(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Salary History Modal ── */}
      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: "#7c3aed", fontSize: 15, display: "flex", alignItems: "center", gap: 7 }}><FaHistory size={13} /> Salary History</h3>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{historyModal.emp.employee_name}{historyModal.emp.department && <span style={{ color: "#94a3b8" }}> · {historyModal.emp.department}</span>}</div>
              </div>
              <button onClick={() => setHistoryModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><FaTimes size={15} /></button>
            </div>
            {historyLoading ? <div className="loader" style={{ margin: "30px auto" }} /> :
            historyModal.history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                <FaHistory size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: 14 }}>No salary history found yet.</p>
                <p style={{ margin: "6px 0 0", fontSize: 12 }}>Salary changes with effective dates will appear here.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="styled-table-global">
                  <thead>
                    <tr><th>Effective Date</th><th>Type</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {historyModal.history.slice().reverse().map((h, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{h.effective_date ? new Date(h.effective_date).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—"}</td>
                        <td><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#f5f3ff", color: "#7c3aed" }}>{h.increment_type || "Update"}</span></td>
                        <td>{inr(grossOf(h))}</td>
                        <td style={{ color: "#dc2626" }}>−{inr(dedOf(h))}</td>
                        <td style={{ fontWeight: 700, color: "#16a34a" }}>{inr(netOf(h))}</td>
                        <td style={{ fontSize: 12.5, color: "#64748b" }}>{h.increment_reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
  const gross    = slip.gross  ?? grossOf(slip);
  const loanEmi  = Number(slip.loan_emi) || 0;
  const advRec   = Number(slip.advance_recovery) || 0;
  const baseDed  = slip.total_deductions ?? dedOf(slip);
  const ded      = baseDed + loanEmi + advRec;
  const bonus    = Number(slip.bonus) || 0;
  const net      = slip.net ?? (gross + bonus - ded);
  const period = slip.period || monthLabel || "";

  const TD = ({ children, style = {} }) => (
    <td style={{ border: "1px solid #cbd5e1", padding: "5px 8px", fontSize: 12.5, ...style }}>{children}</td>
  );

  const printSlip = () => {
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    const extraDedRows = [
      loanEmi > 0 ? `<tr><td></td><td></td><td class="lbl">Loan EMI</td><td class="val">${fmt2(loanEmi)}</td></tr>` : "",
      advRec  > 0 ? `<tr><td></td><td></td><td class="lbl">Advance Recovery</td><td class="val">${fmt2(advRec)}</td></tr>` : "",
    ].join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip - ${escHtml(slip.employee_name || "")}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;padding:36px 40px;color:#0f172a;font-size:12.5px}
  h1{text-align:center;font-size:15px;font-weight:700;padding:8px 0;border-bottom:1px solid #94a3b8}
  .ref{text-align:right;font-size:11px;color:#dc2626;padding:4px 0}
  table{width:100%;border-collapse:collapse}
  td,th{border:1px solid #94a3b8;padding:5px 8px}
  .lbl{font-weight:600;width:32%}
  .val{width:18%;text-align:right}
  .hdr{font-weight:700;background:#f1f5f9}
  .tot{font-weight:700}
  .net{font-weight:700;font-size:13px}
  .words{padding:12px 0;font-size:12px}
  .bank-tbl td{border:1px solid #94a3b8;padding:5px 8px}
  .foot{margin-top:40px;display:flex;justify-content:space-between;font-size:11px;color:#64748b}
</style></head><body>
<h1>GDMR CONNECT — SALARY SLIP</h1>
<div class="ref">${escHtml(period)}</div>
<table style="margin:10px 0">
  <tr><td class="lbl">Employee Name:</td><td>${escHtml(slip.employee_name || "")}</td><td class="lbl">Employee Code:</td><td>${escHtml(slip.employee_code || "")}</td></tr>
  <tr><td class="lbl">Designation:</td><td>${escHtml(slip.designation || "")}</td><td class="lbl">Grade &amp; Profile:</td><td>${escHtml(slip.grade_profile || "")}</td></tr>
  <tr><td class="lbl">Total days of work</td><td>${escHtml(slip.days_worked ?? "")}</td><td class="lbl">Salary Period:</td><td>${escHtml(period)}</td></tr>
</table>
<table style="margin-bottom:0">
  <thead><tr><th class="hdr" colspan="2">Earnings</th><th class="hdr" colspan="2">Deduction</th></tr></thead>
  <tbody>
    ${Array.from({ length: Math.max(EARNINGS.length, DEDUCTIONS.length) }, (_, i) => {
      const e = EARNINGS[i], d = DEDUCTIONS[i];
      return `<tr>${e ? `<td class="lbl">${e.label}</td><td class="val">${fmt2(slip[e.key])}</td>` : "<td></td><td></td>"}${d ? `<td class="lbl">${d.label}</td><td class="val">${fmt2(slip[d.key])}</td>` : "<td></td><td></td>"}</tr>`;
    }).join("")}
    ${extraDedRows}
    <tr class="tot"><td>Gross Salary:</td><td class="val">${fmt2(gross)}</td><td>Total Deductions:</td><td class="val">${Math.round(ded)}</td></tr>
    <tr><td>Bonus</td><td class="val">${fmt2(bonus)}</td><td></td><td></td></tr>
    <tr class="net"><td colspan="4">Net Salary: &nbsp;&nbsp;${fmt2(net)}</td></tr>
  </tbody>
</table>
<div class="words">In Words: &nbsp;&nbsp;${numberToWords(net)} Rupees Only</div>
<table class="bank-tbl" style="margin-top:8px">
  <tr><td style="font-weight:600;width:30%">Bank Detail</td><td>${escHtml(slip.bank_detail || "")}</td></tr>
  <tr><td style="font-weight:600">Transaction Detail</td><td style="color:#16a34a">${escHtml(slip.transaction_detail || "Complete")}</td></tr>
  <tr><td style="font-weight:600">Date:</td><td>${escHtml(slip.transaction_date || "")}</td></tr>
</table>
<div class="foot"><span>This is a computer-generated payslip.</span><span>GDMR Connect</span></div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const cellStyle = { border: "1px solid #cbd5e1", padding: "5px 8px", fontSize: 12.5 };
  const lblStyle  = { ...cellStyle, fontWeight: 600, background: "#f8fafc", width: "26%" };
  const valStyle  = { ...cellStyle, width: "24%" };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: "100%", maxHeight: "92vh", overflowY: "auto", padding: 24 }}>
        {/* Modal header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--red)", fontSize: 15 }}>Salary Slip</h3>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{period}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><FaTimes size={15} /></button>
        </div>

        {/* Company title */}
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15, padding: "10px 0", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", marginBottom: 10 }}>
          GDMR CONNECT — SALARY SLIP
        </div>

        {/* Employee info table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <tbody>
            <tr>
              <TD style={lblStyle}>Employee Name:</TD>
              <TD style={valStyle}>{slip.employee_name || ""}</TD>
              <TD style={lblStyle}>Employee Code:</TD>
              <TD style={valStyle}>{slip.employee_code || ""}</TD>
            </tr>
            <tr>
              <TD style={lblStyle}>Designation:</TD>
              <TD style={valStyle}>{slip.designation || ""}</TD>
              <TD style={lblStyle}>Grade &amp; Profile:</TD>
              <TD style={valStyle}>{slip.grade_profile || ""}</TD>
            </tr>
            <tr>
              <TD style={lblStyle}>Total days of work</TD>
              <TD style={valStyle}>{slip.days_worked ?? ""}</TD>
              <TD style={lblStyle}>Salary Period:</TD>
              <TD style={valStyle}>{period}</TD>
            </tr>
          </tbody>
        </table>

        {/* Earnings / Deductions table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
          <thead>
            <tr>
              <th colSpan={2} style={{ ...cellStyle, background: "#f1f5f9", fontWeight: 700, textAlign: "left", width: "50%" }}>Earnings</th>
              <th colSpan={2} style={{ ...cellStyle, background: "#f1f5f9", fontWeight: 700, textAlign: "left", width: "50%" }}>Deduction</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(EARNINGS.length, DEDUCTIONS.length) }, (_, i) => {
              const e = EARNINGS[i], d = DEDUCTIONS[i];
              return (
                <tr key={i}>
                  {e
                    ? <><TD style={{ ...cellStyle, width: "26%" }}>{e.label}</TD><TD style={{ ...cellStyle, width: "24%", textAlign: "right" }}>{fmt2(slip[e.key])}</TD></>
                    : <><TD style={cellStyle}></TD><TD style={cellStyle}></TD></>
                  }
                  {d
                    ? <><TD style={{ ...cellStyle, width: "26%" }}>{d.label}</TD><TD style={{ ...cellStyle, width: "24%", textAlign: "right" }}>{fmt2(slip[d.key])}</TD></>
                    : <><TD style={cellStyle}></TD><TD style={cellStyle}></TD></>
                  }
                </tr>
              );
            })}
            {/* Extra loan/advance rows if any */}
            {loanEmi > 0 && (
              <tr>
                <TD style={cellStyle}></TD><TD style={cellStyle}></TD>
                <TD style={{ ...cellStyle, color: "#b45309" }}>Loan EMI</TD>
                <TD style={{ ...cellStyle, textAlign: "right", color: "#b45309" }}>{fmt2(loanEmi)}</TD>
              </tr>
            )}
            {advRec > 0 && (
              <tr>
                <TD style={cellStyle}></TD><TD style={cellStyle}></TD>
                <TD style={{ ...cellStyle, color: "#1d4ed8" }}>Advance Recovery</TD>
                <TD style={{ ...cellStyle, textAlign: "right", color: "#1d4ed8" }}>{fmt2(advRec)}</TD>
              </tr>
            )}
            {/* Gross / Total row */}
            <tr>
              <TD style={{ ...cellStyle, fontWeight: 700 }}>Gross Salary:</TD>
              <TD style={{ ...cellStyle, fontWeight: 700, textAlign: "right" }}>{fmt2(gross)}</TD>
              <TD style={{ ...cellStyle, fontWeight: 700 }}>Total Deductions:</TD>
              <TD style={{ ...cellStyle, fontWeight: 700, textAlign: "right" }}>{Math.round(ded)}</TD>
            </tr>
            {/* Bonus row */}
            <tr>
              <TD style={cellStyle}>Bonus</TD>
              <TD style={{ ...cellStyle, textAlign: "right" }}>{fmt2(bonus)}</TD>
              <TD style={cellStyle}></TD>
              <TD style={cellStyle}></TD>
            </tr>
            {/* Net Salary */}
            <tr>
              <TD colSpan={4} style={{ ...cellStyle, fontWeight: 700, fontSize: 13 }}>
                Net Salary: &nbsp;&nbsp;{inr(net)}
              </TD>
            </tr>
          </tbody>
        </table>

        {/* In Words */}
        <div style={{ fontSize: 12.5, padding: "8px 0", borderBottom: "1px solid #e2e8f0", marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>In Words:</span>&nbsp;&nbsp;
          <span style={{ fontStyle: "italic", color: "#475569" }}>{numberToWords(net)} Rupees Only</span>
        </div>

        {/* Bank Details */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
          <tbody>
            <tr>
              <TD style={{ ...cellStyle, fontWeight: 600, width: "30%" }}>Bank Detail</TD>
              <TD style={cellStyle}>{slip.bank_detail || ""}</TD>
            </tr>
            <tr>
              <TD style={{ ...cellStyle, fontWeight: 600 }}>Transaction Detail</TD>
              <TD style={{ ...cellStyle, color: "#16a34a", fontWeight: 600 }}>{slip.transaction_detail || "Complete"}</TD>
            </tr>
            <tr>
              <TD style={{ ...cellStyle, fontWeight: 600 }}>Date:</TD>
              <TD style={cellStyle}>{slip.transaction_date || ""}</TD>
            </tr>
          </tbody>
        </table>

        <button className="btn" onClick={printSlip} style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 8 }}>
          <FaPrint size={12} /> Print / Download PDF
        </button>
      </div>
    </div>
  );
}
