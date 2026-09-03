import React, { useState, useEffect } from "react";
import { TbX, TbPlus, TbMoneybag, TbCurrencyRupee } from "react-icons/tb";
import { SkeletonTable } from "./Skeleton";
import { isOffboarded } from "../utils/employeeStatus";

const FETCH_BASE = "/api";
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function IssueLoanModal({ token, employees, onClose, onSuccess }) {
  const [form, setForm] = useState({
    employee_id: "", type: "loan", amount: "",
    disbursed_date: new Date().toISOString().slice(0, 10),
    repayment_months: "6", reason: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const emi = form.type === "loan" && form.amount && form.repayment_months
    ? Math.ceil(Number(form.amount) / Number(form.repayment_months)) : null;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!form.employee_id) { setErr("Please select an employee."); return; }
    if (!form.amount || Number(form.amount) <= 0) { setErr("Enter a valid amount."); return; }
    setSaving(true);
    try {
      const r = await fetch(`${FETCH_BASE}/admin/payroll/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          employee_id: form.employee_id,
          type: form.type,
          amount: Number(form.amount),
          disbursed_date: form.disbursed_date,
          repayment_months: form.type === "loan" ? Number(form.repayment_months) : 1,
          emi_per_month: form.type === "loan" ? emi : Number(form.amount),
          reason: form.reason,
          notes: form.notes,
        }),
      });
      if (r.ok) { onSuccess(); }
      else { const d = await r.json().catch(() => ({})); setErr(d.message || "Failed to issue."); }
    } catch { setErr("Network error. Please try again."); } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, borderBottom: "1px solid #e2e8f0", paddingBottom: 14 }}>
          <h3 style={{ margin: 0, color: "var(--red)", fontSize: 15 }}>Issue Loan / Salary Advance</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><TbX size={15} /></button>
        </div>

        {err && <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#b91c1c", border: "1px solid #fecaca" }}>{err}</div>}

        <form onSubmit={submit}>
          {/* Type toggle */}
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3, marginBottom: 16 }}>
            {[["loan", "Loan"], ["advance", "Salary Advance"]].map(([val, label]) => (
              <button type="button" key={val} onClick={() => set("type", val)} style={{
                flex: 1, padding: "8px 0", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13,
                background: form.type === val ? "#fff" : "transparent",
                color: form.type === val ? "#0f172a" : "#64748b",
                boxShadow: form.type === val ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>{label}</button>
            ))}
          </div>

          {/* Employee */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>Employee *</label>
            <select className="modern-input" style={{ margin: 0 }} value={form.employee_id} onChange={e => set("employee_id", e.target.value)} required>
              <option value="">Select employee…</option>
              {employees.filter(emp => !isOffboarded(emp)).sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(emp => <option key={emp._id} value={emp._id}>{emp.name}{emp.department ? ` — ${emp.department}` : ""}</option>)}
            </select>
          </div>

          {/* Amount + Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>Amount (₹) *</label>
              <div style={{ position: "relative" }}>
                <TbCurrencyRupee size={10} style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} />
                <input className="modern-input" style={{ margin: 0, paddingLeft: 26 }} type="number" min="1" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="e.g. 25000" required />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>Disbursed Date</label>
              <input className="modern-input" style={{ margin: 0 }} type="date" value={form.disbursed_date} onChange={e => set("disbursed_date", e.target.value)} />
            </div>
          </div>

          {/* Loan: repayment period */}
          {form.type === "loan" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>Repayment Period</label>
              <select className="modern-input" style={{ margin: 0 }} value={form.repayment_months} onChange={e => set("repayment_months", e.target.value)}>
                {[1, 2, 3, 6, 9, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}
              </select>
              {emi && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef3c7", borderRadius: 6, fontSize: 12.5, fontWeight: 600, color: "#92400e" }}>
                  Monthly EMI: {inr(emi)} &nbsp;·&nbsp; {form.repayment_months} instalments
                </div>
              )}
            </div>
          )}

          {/* Advance: info */}
          {form.type === "advance" && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "#eff6ff", borderRadius: 8, fontSize: 12.5, color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
              The full advance amount will be auto-deducted in the next payroll run.
            </div>
          )}

          {/* Reason */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>Reason</label>
            <input className="modern-input" style={{ margin: 0 }} value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="e.g. Medical emergency, personal need…" />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>Internal Notes</label>
            <textarea className="modern-input" style={{ margin: 0, minHeight: 64, resize: "vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes for HR records…" />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Issuing…" : `Issue ${form.type === "loan" ? "Loan" : "Advance"}`}</button>
            <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoanDetailModal({ loan, onClose }) {
  const outstanding = Number(loan.outstanding ?? loan.amount ?? 0);
  const recovered = Number(loan.amount ?? 0) - outstanding;
  const pct = loan.amount ? Math.max(0, Math.min(100, (recovered / loan.amount) * 100)) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--red)", fontSize: 15 }}>
              {loan.type === "advance" ? "Salary Advance" : "Loan"} Details
            </h3>
            <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>{loan.employee_name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><TbX size={15} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Loan Amount", value: inr(loan.amount), color: "#0f172a" },
            { label: "Outstanding", value: inr(outstanding), color: outstanding > 0 ? "#dc2626" : "#16a34a" },
            { label: loan.type === "advance" ? "Recovery Amount" : "EMI / Month", value: inr(loan.emi_per_month || loan.amount), color: "#b45309" },
            { label: "Disbursed On", value: fmt(loan.disbursed_date), color: "#0f172a" },
          ].map(s => (
            <div key={s.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
              <div style={{ fontWeight: 700, color: s.color, fontSize: 15 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        {loan.type === "loan" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
              <span>Repayment Progress</span>
              <span style={{ fontWeight: 700 }}>{Math.round(pct)}% recovered</span>
            </div>
            <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#16a34a" : "#10b981", borderRadius: 4, transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              <span>{inr(recovered)} recovered</span>
              <span>{inr(outstanding)} remaining</span>
            </div>
          </div>
        )}

        {loan.reason && (
          <div style={{ background: "#fffbeb", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 10, border: "1px solid #fde68a" }}>
            <span style={{ fontWeight: 600 }}>Reason: </span>{loan.reason}
          </div>
        )}
        {loan.notes && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#475569", border: "1px solid #e2e8f0" }}>
            <span style={{ fontWeight: 600 }}>Notes: </span>{loan.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPayrollLoans({ token, employees = [] }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("active");
  const [showIssue, setShowIssue] = useState(false);
  const [viewLoan, setViewLoan] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  async function loadLoans() {
    setLoading(true);
    try {
      const r = await fetch(`${FETCH_BASE}/admin/payroll/loans`, { headers: { Authorization: `Bearer ${token}` } });
      const d = r.ok ? await r.json() : [];
      setLoans(Array.isArray(d) ? d : d.loans || []);
    } catch { setLoans([]); } finally { setLoading(false); }
  }

  async function closeLoan(id, name) {
    if (!window.confirm(`Close / write off this loan for ${name}? This marks it as fully recovered.`)) return;
    try {
      const r = await fetch(`${FETCH_BASE}/admin/payroll/loans/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "closed" }),
      });
      if (r.ok) { flash("Loan closed."); loadLoans(); }
      else flash("Failed to close loan.", "error");
    } catch { flash("Network error.", "error"); }
  }

  useEffect(() => { loadLoans(); }, []);

  const filtered = loans.filter(l => filter === "all" || l.status === filter);
  const activeLoans = loans.filter(l => l.status === "active");
  const totalDisbursed = loans.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + (Number(l.outstanding ?? l.amount) || 0), 0);

  return (
    <div>
      {msg.text && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: msg.type === "error" ? "#fef2f2" : "#f0fdf4",
          color: msg.type === "error" ? "#b91c1c" : "#16a34a",
          border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>{msg.text}</div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Active Loans & Advances", value: activeLoans.length, color: "#b45309", bg: "#fffbeb" },
          { label: "Total Disbursed", value: inr(totalDisbursed), color: "var(--red)", bg: "#fef2f2" },
          { label: "Total Outstanding", value: inr(totalOutstanding), color: "#dc2626", bg: "#fef2f2" },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: 16, background: s.bg }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 3, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {[["active", "Active"], ["all", "All"], ["closed", "Closed"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: "6px 14px", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12,
              background: filter === val ? "#fff" : "transparent",
              color: filter === val ? "#0f172a" : "#64748b",
              boxShadow: filter === val ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>{label}</button>
          ))}
        </div>
        <button className="btn" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => setShowIssue(true)}>
          <TbPlus size={11} /> Issue Loan / Advance
        </button>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={5} cols={8} /> : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto", overflowY: "visible" }}>
            <table className="styled-table-global">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>EMI / Recovery</th>
                  <th>Outstanding</th>
                  <th>Disbursed</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                    <TbMoneybag size={28} style={{ opacity: 0.2, display: "block", margin: "0 auto 10px" }} />
                    No {filter !== "all" ? filter : ""} loans or advances found.
                  </td></tr>
                ) : filtered.map(l => {
                  const isActive = l.status === "active";
                  const outstanding = Number(l.outstanding ?? l.amount ?? 0);
                  return (
                    <tr key={l._id}>
                      <td style={{ fontWeight: 600 }}>{l.employee_name}</td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: l.type === "advance" ? "#eff6ff" : "#fdf4ff",
                          color: l.type === "advance" ? "#1d4ed8" : "#7e22ce",
                        }}>
                          {l.type === "advance" ? "Advance" : "Loan"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{inr(l.amount)}</td>
                      <td style={{ color: "#b45309", fontWeight: 600 }}>{inr(l.emi_per_month || l.amount)}/mo</td>
                      <td style={{ fontWeight: 700, color: isActive && outstanding > 0 ? "#dc2626" : "#16a34a" }}>
                        {inr(outstanding)}
                      </td>
                      <td style={{ fontSize: 12, color: "#64748b" }}>{fmt(l.disbursed_date)}</td>
                      <td style={{ fontSize: 12, color: "#64748b", maxWidth: 140 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.reason || "—"}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: isActive ? "#fffbeb" : "#f0fdf4",
                          color: isActive ? "#d97706" : "#16a34a",
                          border: `1px solid ${isActive ? "#fde68a" : "#bbf7d0"}`,
                        }}>{isActive ? "Active" : "Closed"}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button className="btn ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setViewLoan(l)}>Details</button>
                          {isActive && (
                            <button className="btn ghost" style={{ fontSize: 12, padding: "4px 10px", color: "#16a34a", borderColor: "#bbf7d0" }}
                              onClick={() => closeLoan(l._id, l.employee_name)}>Close</button>
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
      )}

      <div style={{ marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, color: "#64748b" }}>
        <strong style={{ color: "#475569" }}>Auto-deduction:</strong> When payroll is run, active loan EMIs and salary advances are automatically included as deductions on the payslip and subtracted from net pay.
      </div>

      {showIssue && (
        <IssueLoanModal
          token={token}
          employees={employees}
          onClose={() => setShowIssue(false)}
          onSuccess={() => { setShowIssue(false); flash("Issued successfully."); loadLoans(); }}
        />
      )}

      {viewLoan && <LoanDetailModal loan={viewLoan} onClose={() => setViewLoan(null)} />}
    </div>
  );
}
