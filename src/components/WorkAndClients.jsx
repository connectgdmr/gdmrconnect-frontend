import React, { useState } from "react";
import { FaTasks, FaChartArea, FaFolderOpen } from "react-icons/fa";
import AdminWorkByTeam from "./AdminWorkByTeam";
import WorkAnalytics from "./WorkAnalytics";
import ClientsWorkspace from "./ClientsWorkspace";

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
  const [tab, setTab] = useState("work");
  const isPersonal = variant === "personal";

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button onClick={() => setTab("work")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
          background: tab === "work" ? "var(--red)" : "transparent", color: tab === "work" ? "#fff" : "#64748b",
        }}>
          {isPersonal ? <FaChartArea size={12} /> : <FaTasks size={12} />} {isPersonal ? "My Work" : "Work by Team"}
        </button>
        <button onClick={() => setTab("clients")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
          background: tab === "clients" ? "var(--red)" : "transparent", color: tab === "clients" ? "#fff" : "#64748b",
        }}><FaFolderOpen size={12} /> Clients</button>
      </div>

      {tab === "work"
        ? (isPersonal ? <WorkAnalytics token={token} user={user} /> : <AdminWorkByTeam token={token} role={role} />)
        : <ClientsWorkspace token={token} api={api} ownDepartments={ownDepartments} />}
    </div>
  );
}
