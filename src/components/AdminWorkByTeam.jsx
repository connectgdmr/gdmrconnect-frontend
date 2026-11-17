import React from "react";
import WorkHub from "./WorkHub";

// Kept as the entry point used by the dashboards and by delegated ("Work by Team") access: the whole work experience
// now lives in WorkHub — one page, same layout for everyone, scope depends on the role.
export default function AdminWorkByTeam({ token, role = "admin" }) {
  return <WorkHub token={token} role={role} />;
}
