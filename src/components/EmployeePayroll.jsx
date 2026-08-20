import React, { useState, useEffect } from "react";
import { TbReceiptDollar, TbCurrencyRupee, TbCalendar, TbCashBanknote } from "react-icons/tb";
import { SkeletonList, SkeletonTable } from "./Skeleton";
import { PayslipModal } from "./AdminPayroll";

const BASE = "/api";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function EmployeePayroll({ token }) {
  const [tab, setTab] = useState("payslips");
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [viewSlip, setViewSlip] = useState(null);

  const [loans, setLoans]       = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);

  const toArr = (d) => Array.isArray(d) ? d : (d?.payslips || d?.loans || d?.data || []);

  async function loadPayslips() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/my/payslips`, { headers: { Authorization: `Bearer ${token}` } });
      setPayslips(r.ok ? toArr(await r.json()) : []);
    } catch { setPayslips([]); } finally { setLoading(false); }
  }

  async function loadLoans() {
    setLoansLoading(true);
    try {
      const r = await fetch(`${BASE}/my/loans`, { headers: { Authorization: `Bearer ${token}` } });
      setLoans(r.ok ? toArr(await r.json()) : []);
    } catch { setLoans([]); } finally { setLoansLoading(false); }
  }

  useEffect(() => { loadPayslips(); loadLoans(); }, []);

  const periodLabel = (p) => p.period || `${MONTHS[(p.month || 1) - 1] || ""} ${p.year || ""}`.trim();

  const activeLoans = loans.filter(l => l.status === "active");
  const totalOutstanding = activeLoans.reduce((s, l) => s + (Number(l.outstanding ?? l.amount) || 0), 0);

  const TABS = [
    { key: "payslips", label: "My Payslips" },
    { key: "loans",    label: "Loans & Advances" },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "var(--red)" }}>Payroll</h3>
        <p className="small">View your monthly salary slips and active loans or advances</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
            background: tab === t.key ? "var(--red)" : "transparent",
            color: tab === t.key ? "#fff" : "#64748b", transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── My Payslips ── */}
      {tab === "payslips" && (
        loading ? <SkeletonList count={4} />
        : payslips.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <TbReceiptDollar size={42} style={{ opacity: 0.15, marginBottom: 14 }} />
            <h4 style={{ margin: "0 0 8px", color: "#64748b" }}>No payslips yet</h4>
            <p style={{ margin: 0, fontSize: 13 }}>Your payslips will appear here once payroll is processed.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {payslips.map(p => {
              const net  = p.net ?? 0;
              const paid = (p.status || "").toLowerCase() === "paid";
              return (
                <div key={p._id} className="card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TbCurrencyRupee color="var(--red)" size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                      <TbCalendar size={12} color="#94a3b8" /> {periodLabel(p)}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                      Net Pay: <span style={{ fontWeight: 700, color: "#16a34a" }}>{inr(net)}</span>
                      {(Number(p.loan_emi) > 0 || Number(p.advance_recovery) > 0) && (
                        <span style={{ marginLeft: 10, fontSize: 11, color: "#b45309", fontWeight: 600 }}>
                          (incl. loan/advance deduction)
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 4,
                    color: paid ? "#16a34a" : "#d97706", background: paid ? "#f0fdf4" : "#fffbeb", border: `1px solid ${paid ? "#bbf7d0" : "#fde68a"}` }}>
                    {p.status || "Pending"}
                  </span>
                  <button className="btn ghost" style={{ fontSize: 13, flexShrink: 0 }} onClick={() => setViewSlip(p)}>View Slip</button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── My Loans & Advances ── */}
      {tab === "loans" && (
        loansLoading ? <SkeletonTable rows={3} cols={5} />
        : (
          <div>
            {activeLoans.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ textAlign: "center", padding: 16, background: "#fffbeb" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#b45309" }}>{activeLoans.length}</div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Active Loans / Advances</div>
                </div>
                <div className="card" style={{ textAlign: "center", padding: 16, background: "#fef2f2" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>{inr(totalOutstanding)}</div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Total Outstanding</div>
                </div>
              </div>
            )}

            {loans.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <TbCashBanknote size={38} style={{ opacity: 0.15, marginBottom: 14 }} />
                <h4 style={{ margin: "0 0 8px", color: "#64748b" }}>No loans or advances</h4>
                <p style={{ margin: 0, fontSize: 13 }}>Any loans or salary advances issued to you will appear here.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {loans.map(l => {
                  const isActive = l.status === "active";
                  const outstanding = Number(l.outstanding ?? l.amount ?? 0);
                  const pct = l.amount ? Math.max(0, Math.min(100, ((l.amount - outstanding) / l.amount) * 100)) : 0;
                  return (
                    <div key={l._id} className="card">
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: l.type === "advance" ? "#eff6ff" : "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <TbCashBanknote color={l.type === "advance" ? "#1d4ed8" : "#7e22ce"} size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                              {l.type === "advance" ? "Salary Advance" : "Loan"} — {inr(l.amount)}
                            </span>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                              background: isActive ? "#fffbeb" : "#f0fdf4",
                              color: isActive ? "#d97706" : "#16a34a",
                              border: `1px solid ${isActive ? "#fde68a" : "#bbf7d0"}`,
                            }}>{isActive ? "Active" : "Closed"}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
                            Disbursed {fmt(l.disbursed_date)}
                            {l.emi_per_month ? ` · EMI: ${inr(l.emi_per_month)}/month` : ""}
                            {l.reason ? ` · ${l.reason}` : ""}
                          </div>
                          {/* Progress bar */}
                          {isActive && l.amount > 0 && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                                <span>Repayment progress</span>
                                <span style={{ fontWeight: 600, color: "#0f172a" }}>{inr(outstanding)} remaining</span>
                              </div>
                              <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: "#10b981", borderRadius: 3 }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {viewSlip && <PayslipModal slip={viewSlip} onClose={() => setViewSlip(null)} monthLabel={periodLabel(viewSlip)} />}
    </div>
  );
}
