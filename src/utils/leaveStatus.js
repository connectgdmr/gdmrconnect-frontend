// Leave-approval display helpers.
//
// A manager's own leave request is approved by the owner in a single step —
// there is no separate manager-approval stage. The backend marks these with
// applicant_role "manager" and manager_status "N/A", and records who made the
// admin/HR decision in admin_decided_by_role ("owner" | "hr").

export const isManagerLeave = (l) =>
  l?.applicant_role === "manager" || l?.manager_status === "N/A";

// What to call the admin/HR approval stage for a given leave row.
export const approverLabel = (l) =>
  isManagerLeave(l) || l?.admin_decided_by_role === "owner" ? "Owner" : "HR";

// Manager-stage cell text — a dash for manager-filed leaves (no such stage).
export const managerStageText = (l) =>
  isManagerLeave(l) ? "—" : (l?.manager_status || "Pending");
