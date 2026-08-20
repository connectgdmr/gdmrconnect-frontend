import React, { useState } from "react";
import { FaBriefcase, FaUserTag } from "react-icons/fa";
import AdminCareer from "./AdminCareer";
import EmployeeCareer from "./EmployeeCareer";
import AdminATS from "./AdminATS";

// "Jobs" and "Recruitment" used to be two separate sidebar entries that were
// really two ends of the same pipeline — job postings, and the candidates
// applying/being sourced against them — so they're one sidebar entry now,
// split into two top tabs here instead (same pattern as WorkAndClients.jsx).
// Only used for a real user's own dashboard; delegated access keeps
// "career" and "ats" as separate grantable modules (an admin can hand out
// just one of the two), so those still render AdminCareer/EmployeeCareer/
// AdminATS directly, not this wrapper.
//
// variant="admin" (default, admin/owner): the Jobs tab is AdminCareer
// (create/edit postings). variant="manager": the Jobs tab is EmployeeCareer
// (browse postings + submit referrals) — a manager doesn't manage postings,
// just like an employee.
export default function JobsAndRecruitment({ token, user, role, employees = [], departments = [], variant = "admin" }) {
  const [tab, setTab] = useState("jobs");
  const isAdmin = variant === "admin";

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button onClick={() => setTab("jobs")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
          background: tab === "jobs" ? "var(--red)" : "transparent", color: tab === "jobs" ? "#fff" : "#64748b",
        }}><FaBriefcase size={12} /> Jobs</button>
        <button onClick={() => setTab("ats")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
          background: tab === "ats" ? "var(--red)" : "transparent", color: tab === "ats" ? "#fff" : "#64748b",
        }}><FaUserTag size={12} /> Recruitment</button>
      </div>

      {tab === "jobs"
        ? (isAdmin ? <AdminCareer token={token} employees={employees} /> : <EmployeeCareer token={token} user={user} />)
        : <AdminATS token={token} role={role} employees={employees} departments={departments} />}
    </div>
  );
}
