import React, { useState } from "react";
import { FaTasks, FaFolderOpen } from "react-icons/fa";
import AdminWorkByTeam from "./AdminWorkByTeam";
import ClientsWorkspace from "./ClientsWorkspace";

// "Work by Team" and "Clients" used to be two separate sidebar entries that
// were really two views into the same thing — what the team is working on —
// so they're one sidebar entry now, split into two top tabs here instead.
// Only used for a real admin/manager's own dashboard (they always have both
// features); delegated access keeps "work-by-team" and "clients" as separate
// grantable modules (an admin can hand out just one of the two), so those
// still render AdminWorkByTeam/ClientsWorkspace directly, not this wrapper.
export default function WorkAndClients({ token, api, role, ownDepartments }) {
  const [tab, setTab] = useState("work");

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button onClick={() => setTab("work")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
          background: tab === "work" ? "var(--red)" : "transparent", color: tab === "work" ? "#fff" : "#64748b",
        }}><FaTasks size={12} /> Work by Team</button>
        <button onClick={() => setTab("clients")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
          background: tab === "clients" ? "var(--red)" : "transparent", color: tab === "clients" ? "#fff" : "#64748b",
        }}><FaFolderOpen size={12} /> Clients</button>
      </div>

      {tab === "work"
        ? <AdminWorkByTeam token={token} role={role} />
        : <ClientsWorkspace token={token} api={api} ownDepartments={ownDepartments} />}
    </div>
  );
}
