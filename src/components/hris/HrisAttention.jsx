import React, { useEffect, useState } from "react";
import { TbFileAlert, TbHourglassEmpty, TbContract, TbCake, TbConfetti } from "react-icons/tb";
import { useApi, fmtDate } from "./util";

// Extra rows for "Needs Your Attention" on the dashboard (aieque demo): document expiries, probation ends, contracts due,
// plus birthdays and work anniversaries. Clicking a tile opens Workforce > Documents & expiry.
export default function HrisAttention({ token, onOpen, isHr }) {
  const { call } = useApi(token);
  const [a, setA] = useState(null);
  const [x, setX] = useState(null);
  useEffect(() => {
    if (isHr) call("/hris/attention").then(r => r.ok && setA(r.data));
    call("/hris/dashboard-extras").then(r => r.ok && setX(r.data));
  }, [isHr]); // eslint-disable-line react-hooks/exhaustive-deps
  const tile = (icon, label, n, tone) => (
    <button type="button" onClick={() => onOpen("expiry")} className={`attention-tile${n > 0 ? " has-count" : ""}`}>
      <div className="attention-icon" style={{ color: n ? tone : undefined }}>{icon}</div>
      <div className="attention-meta"><span className="attention-count">{n}</span><span className="attention-label">{label}</span></div>
    </button>
  );
  return (
    <div>
      {isHr && a && (
        <>
          <div className="attention-grid" style={{ marginTop: 10 }}>
            {tile(<TbFileAlert />, "Documents expiring (90 days)", a.documents, "#d97706")}
            {a.expired > 0 && tile(<TbFileAlert />, "Documents already expired", a.expired, "#b91c1c")}
            {tile(<TbHourglassEmpty />, "Probation ending soon", a.probation, "#2563eb")}
            {tile(<TbContract />, "Contracts due for renewal", a.contracts, "#7c3aed")}
          </div>
          {a.top.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: "#475569" }}>
              {a.top.slice(0, 4).map((i, n) => <div key={n} style={{ padding: "2px 0" }}><b>{i.employee}</b> - {i.label}: <span style={{ color: i.days < 0 ? "#b91c1c" : "#b45309", fontWeight: 700 }}>{i.days < 0 ? `expired ${fmtDate(i.date)}` : i.days === 0 ? "today" : `${fmtDate(i.date)} (${i.days} days)`}</span></div>)}
            </div>
          )}
        </>
      )}
      {x && (x.birthdays.length > 0 || x.anniversaries.length > 0) && (
        <div style={{ marginTop: 12, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5, color: "#475569" }}>
          {x.birthdays.length > 0 && <div><b><TbCake style={{ verticalAlign: -2 }} /> Birthdays</b>{x.birthdays.slice(0, 4).map((b, i) => <div key={i}>{b.name} - {b.days === 0 ? "today 🎉" : fmtDate(b.date).slice(0, 5)}</div>)}</div>}
          {x.anniversaries.length > 0 && <div><b><TbConfetti style={{ verticalAlign: -2 }} /> Work anniversaries</b>{x.anniversaries.slice(0, 4).map((b, i) => <div key={i}>{b.name} - {b.years} yr{b.years > 1 ? "s" : ""}, {b.days === 0 ? "today 🎉" : fmtDate(b.date).slice(0, 5)}</div>)}</div>}
        </div>
      )}
    </div>
  );
}
