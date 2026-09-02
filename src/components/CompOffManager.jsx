import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TbGift, TbSearch, TbChevronDown } from "react-icons/tb";

/**
 * Comp-Off granting + team balances — its own view in ManagerDashboard
 * (scope="manager": own team + any department the user heads) and
 * AdminDashboard (scope="admin": everyone). A manager credits comp-off days
 * to team members; the employee redeems them by ticking "Comp-Off" on a
 * leave request (see EmployeeDashboard). No separate leave category — this
 * is the one balance the app tracks.
 */
export default function CompOffManager({ token, api, scope = "manager" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState([]);       // employee_ids to grant to
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [msg, setMsg] = useState(null);           // { ok, text }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.compOffBalances(token);
      setRows(Array.isArray(data) ? data : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [api, token]);

  useEffect(() => { load(); }, [load]);

  const pickerRows = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return q ? rows.filter(r => (r.name || "").toLowerCase().includes(q)) : rows;
  }, [rows, pickerSearch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter(r => (r.name || "").toLowerCase().includes(q) || (r.department || "").toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const togglePick = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const pickedNames = rows.filter(r => picked.includes(r.employee_id)).map(r => r.name);

  async function grant(e) {
    e.preventDefault();
    if (picked.length === 0) { setMsg({ ok: false, text: "Pick at least one employee." }); return; }
    const n = parseFloat(days);
    if (!(n > 0)) { setMsg({ ok: false, text: "Enter a positive number of days." }); return; }
    setGranting(true); setMsg(null);
    try {
      const res = await api.grantCompOff({ employee_ids: picked, days: n, reason: reason.trim() }, token);
      setMsg({ ok: true, text: res.message || "Comp-off granted." });
      setPicked([]); setDays("1"); setReason(""); setPickerOpen(false);
      load();
    } catch (err) {
      setMsg({ ok: false, text: err?.message || "Failed to grant comp-off." });
    } finally { setGranting(false); }
  }

  return (
    <div className="card" style={{ maxWidth: 860, margin: "16px auto 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <TbGift size={18} color="var(--red)" />
        <h3 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>Comp-Off</h3>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
        Credit comp-off days to {scope === "admin" ? "any employee" : "your team"} (e.g. for working a holiday or weekend).
        They redeem it by ticking “Comp-Off” when applying for leave.
      </p>

      <form onSubmit={grant} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 18 }}>
        <div style={{ display: "grid", gap: 12 }}>
          {/* Employee multi-select */}
          <div style={{ position: "relative" }}>
            <label className="modern-label">Employees</label>
            <button type="button" onClick={() => setPickerOpen(o => !o)}
              style={{ width: "100%", textAlign: "left", background: "#fff", border: "1px solid var(--slate-300, #cbd5e1)", borderRadius: 8, padding: "10px 13px", cursor: "pointer", fontSize: 13.5, color: picked.length ? "#0f172a" : "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {picked.length === 0 ? "Select one or more employees…"
                  : picked.length <= 3 ? pickedNames.join(", ")
                  : `${picked.length} employees selected`}
              </span>
              <TbChevronDown size={15} style={{ flexShrink: 0, transform: pickerOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
            {pickerOpen && (
              <div style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 280, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                  <input autoFocus className="modern-input" style={{ margin: 0 }} placeholder="Search…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
                </div>
                <div style={{ overflowY: "auto", padding: 4 }}>
                  {pickerRows.length === 0 ? (
                    <div style={{ padding: 14, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No employees.</div>
                  ) : pickerRows.map(r => (
                    <label key={r.employee_id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <input type="checkbox" checked={picked.includes(r.employee_id)} onChange={() => togglePick(r.employee_id)} />
                      <span style={{ flex: 1 }}>{r.name}{r.department ? <span style={{ color: "#94a3b8" }}> · {r.department}</span> : null}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>bal {r.balance ?? 0}</span>
                    </label>
                  ))}
                </div>
                <div style={{ padding: 8, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                  <button type="button" className="btn ghost" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setPicked(pickerRows.map(r => r.employee_id))}>Select all shown</button>
                  <button type="button" className="btn ghost" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setPickerOpen(false)}>Done</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ width: 110 }}>
              <label className="modern-label">Days</label>
              <input className="modern-input" style={{ margin: 0 }} type="number" min="0.5" step="0.5" value={days} onChange={e => setDays(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 260px", minWidth: 200 }}>
              <label className="modern-label">Reason (optional)</label>
              <input className="modern-input" style={{ margin: 0 }} placeholder="e.g. Worked on Independence Day" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={granting} style={{ padding: "10px 20px", whiteSpace: "nowrap" }}>
              {granting ? "Granting…" : "Grant Comp-Off"}
            </button>
          </div>
        </div>
        {msg && (
          <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 12, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</div>
        )}
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13, color: "#0f172a" }}>Current balances</strong>
        <div style={{ position: "relative", flex: "0 1 240px" }}>
          <TbSearch size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input className="modern-input" style={{ margin: 0, paddingLeft: 30 }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
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
              <tr><td colSpan={3} style={{ textAlign: "center", padding: 18, color: "#94a3b8" }}>
                {rows.length === 0 ? "No team members found." : "No matches."}
              </td></tr>
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
