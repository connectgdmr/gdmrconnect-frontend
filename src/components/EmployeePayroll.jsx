import React, { useState, useEffect } from "react";
import { FaFileInvoiceDollar, FaRupeeSign, FaCalendarAlt } from "react-icons/fa";
import { SkeletonList } from "./Skeleton";
import { PayslipModal } from "./AdminPayroll";

import { API_URL as BASE } from "../api";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function EmployeePayroll({ token }) {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [viewSlip, setViewSlip] = useState(null);

  const toArr = (d) => Array.isArray(d) ? d : (d?.payslips || d?.data || []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/my/payslips`, { headers: { Authorization: `Bearer ${token}` } });
      setPayslips(r.ok ? toArr(await r.json()) : []);
    } catch { setPayslips([]); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const periodLabel = (p) => p.period || `${MONTHS[(p.month || 1) - 1] || ""} ${p.year || ""}`.trim();

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "var(--red)" }}>My Payslips</h3>
        <p className="small">View and download your monthly salary slips</p>
      </div>

      {loading ? <SkeletonList count={4} />
      : payslips.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <FaFileInvoiceDollar size={42} style={{ opacity: 0.15, marginBottom: 14 }} />
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
                  <FaRupeeSign color="var(--red)" size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                    <FaCalendarAlt size={12} color="#94a3b8" /> {periodLabel(p)}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>Net Pay: <span style={{ fontWeight: 700, color: "#16a34a" }}>{inr(net)}</span></div>
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
      )}

      {viewSlip && <PayslipModal slip={viewSlip} onClose={() => setViewSlip(null)} monthLabel={periodLabel(viewSlip)} />}
    </div>
  );
}
