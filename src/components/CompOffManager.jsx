import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TbGift, TbSearch } from "react-icons/tb";

/**
 * Comp-Off granting + team balances — shared by ManagerDashboard (scope="manager",
 * own team) and AdminDashboard (scope="admin", everyone). A manager credits
 * comp-off days to a team member; the employee spends them by ticking "Comp-Off"
 * on a leave request (see EmployeeDashboard). No separate leave category — this
 * is the one balance the app tracks.
 */
export default function CompOffManager({ token, api, scope = "manager" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [empId, setEmpId] = useState("");
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.compOffBalances(token);
      setRows(Array.isArray(data) ? data : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [api, token]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter(r => (r.name || "").toLowerCase().includes(q) || (r.employee_code || "").toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  async function grant(e) {
    e.preventDefault();
    if (!empId) { setMsg({ ok: false, text: "Pick an employee." }); return; }
    const n = parseFloat(days);
    if (!(n > 0)) { setMsg({ ok: false, text: "Enter a positive number of days." }); return; }
    setGranting(true); setMsg(null);
    try {
      const res = await api.grantCompOff({ employee_id: empId, days: n, reason: reason.trim() }, token);
      setMsg({ ok: true, text: res.message || "Comp-off granted." });
      setDays("1"); setReason("");
      load();
    } catch (err) {
      setMsg({ ok: false, text: err?.message || "Failed to grant comp-off." });
    } finally { setGranting(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <TbGift size={18} color="var(--red)" />
        <h4 style={{ margin: 0, color: "#0f172a" }}>Comp-Off</h4>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#64748b" }}>
        Credit comp-off days to {scope === "admin" ? "any employee" : "a team member"} (e.g. for working a holiday or weekend).
        They redeem it by ticking “Comp-Off” when applying for leave.
      </p>

      <form onSubmit={grant} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
        <div style={{ flex: "2 1 220px" }}>
          <label className="modern-label">Employee</label>
          <select className="modern-input" style={{ margin: 0 }} value={empId} onChange={e => setEmpId(e.target.value)}>
            <option value="">— Select employee —</option>
            {rows.map(r => (
              <option key={r.employee_id} value={r.employee_id}>
                {r.name}{r.department ? ` · ${r.department}` : ""} (bal {r.balance ?? 0})
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "0 1 90px" }}>
          <label className="modern-label">Days</label>
          <input className="modern-input" style={{ margin: 0 }} type="number" min="0.5" step="0.5" value={days} onChange={e => setDays(e.target.value)} />
        </div>
        <div style={{ flex: "3 1 240px" }}>
          <label className="modern-label">Reason (optional)</label>
          <input className="modern-input" style={{ margin: 0 }} placeholder="e.g. Worked on Independence Day" value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={granting} style={{ padding: "9px 18px" }}>
          {granting ? "Granting…" : "Grant Comp-Off"}
        </button>
      </form>

      {msg && (
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 12, color: msg.ok ? "#166534" : "#b91c1c" }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ position: "relative", flex: "0 1 260px" }}>
          <TbSearch size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input className="modern-input" style={{ margin: 0, paddingLeft: 30 }} placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="button" className="btn ghost" style={{ padding: "7px 12px", fontSize: 12 }} onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="styled-table" style={{ minWidth: 420 }}>
          <thead><tr><th>Employee</th><th>Department</th><th style={{ textAlign: "center" }}>Comp-Off Balance</th></tr></thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: "center", padding: 18, color: "#94a3b8" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: "center", padding: 18, color: "#94a3b8" }}>No employees.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.employee_id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.department || "—"}</td>
                <td style={{ textAlign: "center" }}>
                  <span style={{
                    fontWeight: 700, fontSize: 13, padding: "3px 12px", borderRadius: 8,
                    background: r.balance > 0 ? "#f0fdf4" : "#f1f5f9",
                    color: r.balance > 0 ? "#166534" : "#64748b",
                    border: `1px solid ${r.balance > 0 ? "#bbf7d0" : "#e2e8f0"}`,
                  }}>
                    {r.balance ?? 0} day{(r.balance ?? 0) === 1 ? "" : "s"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
