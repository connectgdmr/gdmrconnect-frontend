import React, { useState } from "react";
import { TbChecklist, TbChartArea, TbFolderOpen, TbPinned } from "react-icons/tb";
import AdminWorkByTeam from "./AdminWorkByTeam";
import WorkAnalytics from "./WorkAnalytics";
import ClientsWorkspace from "./ClientsWorkspace";
import GoalsBoard from "./GoalsBoard";

// "Work" (by-team for admin/manager, personal for an employee) and "Clients"
// used to be two separate sidebar entries that were really two views into
// the same thing — what work is happening — so they're one sidebar entry
// now, split into two top tabs here instead. Only used for a real user's own
// dashboard; delegated access keeps "work-by-team" and "clients" as separate
// grantable modules (an admin can hand out just one of the two), so those
// still render AdminWorkByTeam/ClientsWorkspace directly, not this wrapper.
//
// variant="team" (default, admin/manager): the Work tab is AdminWorkByTeam,
// team-wide oversight. variant="personal" (employee): the Work tab is
// WorkAnalytics, the employee's own work — a different component/audience,
// not a stripped-down version of the team one.
export default function WorkAndClients({ token, api, user, role, ownDepartments, variant = "team" }) {
  // The login reminder banner's "Open My Goals" sets this flag, then switches
  // to this page — same "global flag, consumed once" pattern Chat.jsx uses.
  const [tab, setTab] = useState(() => {
    if (window.__gdmrOpenGoalsTab) { window.__gdmrOpenGoalsTab = false; return "goals"; }
    return "work";
  });
  const isPersonal = variant === "personal";
  // Personal goals are for employees and managers (admin has no daily-goals use).
  const showGoals = role !== "admin" && role !== "owner";

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button onClick={() => setTab("work")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
          background: tab === "work" ? "var(--red)" : "transparent", color: tab === "work" ? "#fff" : "#64748b",
        }}>
          {isPersonal ? <TbChartArea size={12} /> : <TbChecklist size={12} />} {isPersonal ? "My Work" : "Work by Team"}
        </button>
        <button onClick={() => setTab("clients")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
          background: tab === "clients" ? "var(--red)" : "transparent", color: tab === "clients" ? "#fff" : "#64748b",
        }}><TbFolderOpen size={12} /> Clients</button>
        {showGoals && (
          <button onClick={() => setTab("goals")} style={{
            padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
            background: tab === "goals" ? "var(--red)" : "transparent", color: tab === "goals" ? "#fff" : "#64748b",
          }}><TbPinned size={12} /> My Goals</button>
        )}
      </div>

      {tab === "work" && (isPersonal ? <WorkAnalytics token={token} user={user} /> : <AdminWorkByTeam token={token} role={role} />)}
      {tab === "clients" && <ClientsWorkspace token={token} api={api} ownDepartments={ownDepartments} />}
      {tab === "goals" && showGoals && <GoalsBoard token={token} />}
    </div>
  );
}
