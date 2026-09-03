import React, { useEffect, useState } from "react";
import {
  TbX, TbTrophy, TbMedal, TbStar, TbPlus, TbTrash,
  TbCalendar, TbUserX, TbPlane, TbRocket,
  TbChevronDown, TbChevronUp, TbArrowUp, TbChartLine,
  TbBolt, TbClock, TbUserPlus,
  TbCircleCheck, TbEdit, TbDeviceFloppy,
  TbFileText, TbFileUpload, TbExternalLink, TbBriefcase,
  TbMail, TbPhone, TbDownload, TbCurrencyDollar, TbRefresh,
} from "react-icons/tb";
import { isOffboarded, isInNotice } from "../utils/employeeStatus";

// "View" opens a URL the browser can actually render inline. Images and
// PDFs render natively; anything else (docx/xlsx/pptx, or — very common
// here — an older Cloudinary "raw" upload with no file extension at all,
// so the browser has no idea what it even is) gets routed through Google's
// document viewer instead of just handing the browser a file it can only
// download.
function cloudinaryViewUrl(url) {
  if (!url) return url;
  if (/\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(url)) return url;
  if (/\.pdf(\?|$)/i.test(url)) return url;
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

// "Download" fetches the bytes and saves them as a blob instead of relying
// on Cloudinary's fl_attachment URL flag — that flag's syntax turned out to
// be a repeated source of bugs (its mere presence forces a download
// regardless of the value after the colon, so fl_attachment:false actually
// downloaded a file named "false"; and a doc name containing "/" like
// "Resume / CV" broke the URL outright with an HTTP 400). Fetching the
// bytes directly sidesteps all of that — same pattern already used in
// AdminATS.jsx's document downloads.
async function downloadDocument(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename || "document" });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank"); // fallback — at least gets them to the file
  }
}

// Employee document taxonomy — mirrors DOCUMENT_TYPES in routes/employees.py exactly.
const DOCUMENT_TYPES = [
  "Personal / ID Proof",
  "Educational Certificate",
  "Professional Certificate",
  "Previous Company Payslip",
  "Experience Certificate",
  "Offer Letter",
  "Appointment Letter",
  "Confirmation Letter",
  "Increment / Salary Revision Letter",
  "Promotion Letter",
  "Warning / Memo Letter",
  "Training Certificate",
  "Other",
];

// ─── ACHIEVEMENT TYPE CONFIG (FA icons only — no emojis) ─────────────────────
const ACH_TYPES = [
  { value: "eom",         label: "Employee of the Month",   Icon: TbTrophy,       color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { value: "eoq",         label: "Employee of the Quarter", Icon: TbMedal,        color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  { value: "eoy",         label: "Employee of the Year",    Icon: TbStar,         color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  { value: "salary_hike", label: "Salary Hike",             Icon: TbArrowUp,      color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  { value: "promotion",   label: "Promotion",               Icon: TbChartLine,    color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  { value: "custom",      label: "Custom Award",            Icon: TbBolt,         color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" },
];

const SHIFT_OPTIONS = [
  { key: "general", label: "General Shift (9 AM – 6 PM)" },
  { key: "morning", label: "Morning Shift (10 AM – 7 PM)" },
  { key: "night",   label: "Night Shift (7 PM – 4 AM)" },
];

const C_BRAND = "#34a06a";

// Mirrors backend's RECRUITMENT_PROFILE_FIELDS (routes/ats.py) — recruitment
// detail carried onto the employee record at onboarding and kept in sync.
const RECRUITMENT_PROFILE_LABELS = {
  education:          "Education",
  experience:         "Experience",
  current_ctc:        "Current CTC",
  expected_ctc:       "Expected CTC",
  current_location:   "Current Location",
  preferred_location: "Preferred Location",
  notice_period:      "Notice Period",
  campaign:            "Recruitment Campaign",
};

function achConfig(type) {
  return ACH_TYPES.find(a => a.value === type) || ACH_TYPES[ACH_TYPES.length - 1];
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""))
      .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function fmtDateTime(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}

function fmtMonth(monthStr) {
  if (!monthStr) return "—";
  try {
    const [y, m] = monthStr.split("-");
    return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch { return monthStr; }
}

function tenure(dateStr) {
  if (!dateStr) return null;
  const ms = new Date() - new Date(dateStr);
  if (ms < 0) return null;
  const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.4));
  if (months < 1) return "< 1 month";
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
  const y = Math.floor(months / 12), m = months % 12;
  return m === 0 ? `${y} year${y !== 1 ? "s" : ""}` : `${y}y ${m}m`;
}

function Avatar({ name, size = 56, photoUrl = null }) {
  const initials = (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: photoUrl ? "transparent" : "linear-gradient(135deg, #34a06a 0%, #1c5249 100%)",
      color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.33),
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      border: "3px solid rgba(255,255,255,0.85)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    }}>
      {photoUrl ? <img src={photoUrl} alt={name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

// ─── TIMELINE ITEM ────────────────────────────────────────────────────────────
function TimelineItem({ event, isLast }) {
  const EventIcon = event.Icon;
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 24 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: event.color + "18",
          border: `2px solid ${event.color}`, display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1, flexShrink: 0,
        }}>
          <EventIcon size={12} color={event.color} />
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, background: "#e2e8f0", minHeight: 24 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20, paddingTop: 5 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{event.title}</div>
        {event.sub && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3 }}>{event.sub}</div>}
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{fmtDate(event.date)}</div>
      </div>
    </div>
  );
}

// ─── MINI PROGRESS BAR ────────────────────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── MAIN MODAL ──────────────────────────────────────────────────────────────
// `allLeaves` / `monthAttendance` / `month` are optional — when the caller
// already has them loaded (e.g. AdminAttendanceSummary's report view) they're
// used as-is; otherwise the modal fetches its own, which is what lets it be
// dropped in anywhere just from `emp` + `api` + `token` (e.g. clicking a row
// in the plain Employee List).
export default function EmployeeJourneyModal({ emp, allLeaves, monthAttendance, month, onClose, api, token, onRefresh, departments = [] }) {
  const [empData, setEmpData] = useState(emp); // local mutable copy — edits/doc changes update this in place
  const [achievements, setAchievements] = useState([]);
  const [loadingAch, setLoadingAch] = useState(false);
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [awardForm, setAwardForm] = useState({
    type: "eom",
    title: "",
    description: "",
    month: month || new Date().toISOString().slice(0, 7),
  });
  const [saving, setSaving] = useState(false);
  const [leavesExpanded, setLeavesExpanded] = useState(true);

  // Self-fetched fallbacks when the caller doesn't already have this data.
  const [selfLeaves, setSelfLeaves] = useState(null);
  const [selfMonthAtt, setSelfMonthAtt] = useState(null);
  const effectiveMonth = month || new Date().toISOString().slice(0, 7);

  // ── Edit mode ───────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [managers, setManagers] = useState([]);
  const [deptList, setDeptList] = useState(departments);

  // ── Documents ────────────────────────────────────────────────────────────────
  const [newDocName, setNewDocName] = useState("");
  const [newDocFile, setNewDocFile] = useState(null);
  const [newDocType, setNewDocType] = useState("");
  const [newDocExpiry, setNewDocExpiry] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  // Inline "Replace" mini-form — only one document's replace form is open at a time.
  const [replacingDocId, setReplacingDocId] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceExpiry, setReplaceExpiry] = useState("");
  const [replacingUpload, setReplacingUpload] = useState(false);
  // Which document's version history is expanded.
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => { setEmpData(emp); }, [emp]);

  useEffect(() => {
    if (allLeaves || !api || !token) return;
    api.adminLeaves(token).then(setSelfLeaves).catch(() => setSelfLeaves([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (monthAttendance || !api || !token) return;
    api.getAttendanceSummary(effectiveMonth, token).then(summary => {
      const days = summary?.days || {};
      const idStr = String(empData._id);
      const inBucket = (arr) => Array.isArray(arr) && arr.some(x => String(typeof x === "object" ? (x._id || x.id) : x) === idStr);
      let present = 0, absent = 0, leave = 0, nci = 0;
      Object.values(days).forEach(d => {
        if (inBucket(d.present)) present++;
        else if (inBucket(d.leave)) leave++;
        else if (inBucket(d.absent)) absent++;
        else if (inBucket(d.not_checked_in)) nci++;
      });
      setSelfMonthAtt({ present, absent, leave, nci });
    }).catch(() => setSelfMonthAtt({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMonth]);

  const finalLeaves    = allLeaves || selfLeaves || [];
  const finalMonthAtt  = monthAttendance || selfMonthAtt || {};

  // ── Employee meta ──────────────────────────────────────────────────────────
  const joinDate = empData.joined_at || empData.join_date || empData.doj || empData.created_at;
  const dept = Array.isArray(empData.department) ? empData.department.join(", ") : (empData.department || "—");
  const tenureStr = tenure(joinDate) || "—";

  // ── Status ────────────────────────────────────────────────────────────────
  const offboarded = isOffboarded(empData);
  const inNotice = isInNotice(empData);
  const isOnExtLeave = !offboarded && empData.extended_leaves?.some(
    lv => lv.from_date <= todayStr && lv.to_date >= todayStr
  );
  const statusBadge = offboarded
    ? { label: "Alumni",          color: "#64748b", bg: "#f1f5f9" }
    : inNotice
    ? { label: "Notice Period",   color: "#d97706", bg: "#fffbeb" }
    : isOnExtLeave
    ? { label: "Extended Leave",  color: "#7c3aed", bg: "#f5f3ff" }
    : { label: "Active",          color: "#16a34a", bg: "#f0fdf4" };

  // ── Leaves for this employee ───────────────────────────────────────────────
  const empLeaves = (finalLeaves || [])
    .filter(l => l.employee_name === empData.name || String(l.employee_id) === String(empData._id) || String(l.user_id) === String(empData._id))
    .sort((a, b) => new Date(b.from_date || b.date || 0) - new Date(a.from_date || a.date || 0));

  // ── Attendance this month ──────────────────────────────────────────────────
  const att = finalMonthAtt || {};
  const attTotal = (att.present || 0) + (att.absent || 0) + (att.leave || 0) + (att.nci || 0);
  const attRate = attTotal > 0 ? Math.round((att.present / attTotal) * 100) : (att.rate ?? 0);

  // ── API calls: achievements ──────────────────────────────────────────────────
  async function loadAchievements() {
    setLoadingAch(true);
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/admin/achievements?employee_id=${empData._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAchievements(await res.json());
    } catch { /* silent */ }
    finally { setLoadingAch(false); }
  }

  async function saveAchievement() {
    if (!awardForm.title.trim()) return;
    setSaving(true);
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/admin/achievements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employee_id: empData._id, employee_name: empData.name, ...awardForm }),
      });
      if (res.ok) {
        setShowAwardForm(false);
        setAwardForm({ type: "eom", title: "", description: "", month: month || new Date().toISOString().slice(0, 7) });
        loadAchievements();
      } else {
        alert("Failed to save achievement.");
      }
    } catch { alert("Network error."); }
    finally { setSaving(false); }
  }

  async function deleteAchievement(id) {
    if (!window.confirm("Remove this achievement?")) return;
    try {
      const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      await fetch(`${baseUrl}/api/admin/achievements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadAchievements();
    } catch { alert("Failed to remove."); }
  }

  useEffect(() => { loadAchievements(); }, [empData._id]);

  // ── Edit details ─────────────────────────────────────────────────────────────
  async function startEdit() {
    setEditForm({
      name: empData.name || "",
      email: empData.email || "",
      phone: empData.phone || "",
      position: empData.position || "",
      location: empData.location || "",
      employee_code: empData.employee_code || "",
      department: empData.department || "",
      shift: empData.shift || "morning",
      doj: (empData.doj || "").slice(0, 10),
      confirmation_date: (empData.confirmation_date || "").slice(0, 10),
      promotion_date: (empData.promotion_date || "").slice(0, 10),
      manager_id: empData.manager_id || "",
    });
    setEditMode(true);
    if (managers.length === 0) {
      try { setManagers(await api.getManagers(token)); } catch { /* silent */ }
    }
    if (deptList.length === 0) {
      try {
        const baseUrl = api.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
        const res = await fetch(`${baseUrl}/api/admin/departments`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDeptList(await res.json());
      } catch { /* silent */ }
    }
  }

  async function saveEdit() {
    setSavingEdit(true);
    try {
      await api.editEmployee(empData._id, editForm, token);
      setEmpData(prev => ({ ...prev, ...editForm }));
      setEditMode(false);
      onRefresh?.();
    } catch {
      alert("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Documents ────────────────────────────────────────────────────────────────
  async function uploadDoc(e) {
    e.preventDefault();
    if (!newDocName.trim() || !newDocFile || !newDocType) return;
    setUploadingDoc(true);
    try {
      const doc = await api.uploadEmployeeDocument(empData._id, newDocName.trim(), newDocFile, token, newDocType, newDocExpiry || null);
      setEmpData(prev => ({ ...prev, documents: [...(prev.documents || []), doc] }));
      setNewDocName("");
      setNewDocFile(null);
      setNewDocType("");
      setNewDocExpiry("");
      onRefresh?.();
    } catch {
      alert("Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function removeDoc(docId) {
    if (!window.confirm("Remove this document?")) return;
    try {
      await api.deleteEmployeeDocument(empData._id, docId, token);
      setEmpData(prev => ({ ...prev, documents: (prev.documents || []).filter(d => d.id !== docId) }));
      onRefresh?.();
    } catch {
      alert("Failed to remove document.");
    }
  }

  async function replaceDoc(docId) {
    if (!replaceFile) return;
    setReplacingUpload(true);
    try {
      const res = await api.replaceEmployeeDocument(empData._id, docId, replaceFile, replaceExpiry || null, token);
      // Patch the local copy directly from the returned document — no need
      // to re-fetch the whole employee roster just to see the new version.
      if (res?.document) {
        setEmpData(prev => ({
          ...prev,
          documents: (prev.documents || []).map(d => d.id === docId ? res.document : d),
        }));
      }
      onRefresh?.();
      setReplacingDocId(null);
      setReplaceFile(null);
      setReplaceExpiry("");
    } catch {
      alert("Failed to replace document.");
    } finally {
      setReplacingUpload(false);
    }
  }

  // ── Build career timeline ──────────────────────────────────────────────────
  const timeline = [];

  if (joinDate) {
    timeline.push({
      date: joinDate.slice(0, 10),
      Icon: TbUserPlus,
      title: "Joined GDMR Connect",
      sub: `Started as ${empData.position || "team member"} · ${dept}`,
      color: C_BRAND,
    });
  }

  // Generic profile audit log — onboarding / recruitment sync events (see
  // _auto_onboard_employee / _sync_candidate_to_employee in routes/ats.py)
  // plus salary changes (routes/payroll.py's upsert_salary) all push entries
  // here, tagged with a "type" so they render with the right icon/title.
  (empData.profile_history || []).forEach((h, i) => {
    let dateStr = joinDate ? joinDate.slice(0, 10) : todayStr;
    try { dateStr = new Date(h.at).toISOString().slice(0, 10); } catch { /* keep fallback */ }
    let Icon = TbBriefcase, title = "Profile Updated", color = "#2563eb";
    if (h.type === "salary_change") {
      Icon = TbCurrencyDollar;
      title = h.increment_type || "Salary Updated";
      color = "#16a34a";
    } else if (h.type === "onboarding" || (!h.type && i === 0)) {
      title = "Onboarded from Recruitment";
    } else if (h.type === "recruitment_sync" || !h.type) {
      title = "Profile Synced from Recruitment";
    }
    timeline.push({ date: dateStr, Icon, title, sub: h.summary || "", color });
  });

  achievements.forEach(a => {
    const cfg = achConfig(a.type);
    timeline.push({
      date: a.month ? `${a.month}-01` : (a.created_at?.slice(0, 10) || "2020-01-01"),
      Icon: cfg.Icon,
      title: a.title,
      sub: a.description || (a.month ? fmtMonth(a.month) : ""),
      color: cfg.color,
    });
  });

  (empData.extended_leaves || []).forEach(lv => {
    timeline.push({
      date: lv.from_date || "2020-01-01",
      Icon: TbPlane,
      title: `Extended Leave — ${lv.type || "Sabbatical"}`,
      sub: `${fmtDate(lv.from_date)} → ${fmtDate(lv.to_date)}`,
      color: "#7c3aed",
    });
  });

  if (empData.resignation?.notice_date) {
    timeline.push({
      date: empData.resignation.notice_date,
      Icon: TbUserX,
      title: offboarded ? "Offboarded" : "Resignation Notice",
      sub: empData.resignation.last_working_day
        ? `Last working day: ${fmtDate(empData.resignation.last_working_day)}`
        : "LWD not set",
      color: "#dc2626",
    });
  }

  timeline.sort((a, b) => a.date.localeCompare(b.date));

  const achByType = {};
  ACH_TYPES.forEach(t => { achByType[t.value] = achievements.filter(a => a.type === t.value); });

  const leaveStatusColor = (s = "") => {
    const v = s.toLowerCase();
    if (v.includes("approved")) return { color: "#16a34a", bg: "#f0fdf4" };
    if (v.includes("rejected")) return { color: "#dc2626", bg: "#fef2f2" };
    return { color: "#d97706", bg: "#fffbeb" };
  };

  const docSourceBadge = (source) => source === "ats"
    ? { label: "From Recruitment", color: "#2563eb", bg: "#eff6ff" }
    : { label: "Manual", color: "#64748b", bg: "#f1f5f9" };

  // Expired / expiring-soon badge for a document's expiry_date, or null if
  // there's nothing to flag (no expiry set, or it's comfortably in the future).
  const docExpiryBadge = (expiryDate) => {
    if (!expiryDate) return null;
    const daysLeft = Math.ceil((new Date(expiryDate) - new Date(todayStr)) / 86400000);
    if (daysLeft < 0) return { label: "Expired", color: "#dc2626", bg: "#fef2f2" };
    if (daysLeft <= 30) return { label: `Expires in ${daysLeft}d`, color: "#d97706", bg: "#fffbeb" };
    return null;
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: "min(680px, 100vw)", height: "100vh", overflowY: "auto",
        background: "#f8fafc", boxShadow: "-8px 0 48px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease",
      }}>
        <style>{`
          @keyframes slideInRight { from { transform: translateX(48px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          .journey-section { background: #fff; border-radius: 12px; padding: 18px 20px; margin: 0 16px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
          .journey-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
          .ach-badge { display: flex; align-items: center; gap: 10px; padding: 10px 13px; border-radius: 10px; border: 1px solid; margin-bottom: 8px; }
          .leave-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f1f5f9; gap: 10px; }
          .stat-mini { text-align: center; flex: 1; }
          .stat-mini-val { font-size: 22px; font-weight: 900; font-variant-numeric: tabular-nums; }
          .stat-mini-lbl { font-size: 10.5px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }
          .award-form-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
          .award-form-row label { font-size: 12px; font-weight: 600; color: #334155; }
          .award-form-row select, .award-form-row input, .award-form-row textarea { border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; font-size: 13px; font-family: inherit; color: #0f172a; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; background: #f8fafc; }
          .award-form-row select:focus, .award-form-row input:focus, .award-form-row textarea:focus { border-color: #34a06a; background: #fff; }
          .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .doc-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .doc-row:last-child { border-bottom: none; }
        `}</style>

        {/* ─── HERO HEADER ──────────────────────────────────────────────── */}
        <div style={{ background: "linear-gradient(135deg, #1c5249 0%, #34a06a 100%)", padding: "28px 20px 22px", position: "relative", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
            {api && token && (
              <button
                onClick={() => editMode ? setEditMode(false) : startEdit()}
                title={editMode ? "Cancel editing" : "Edit employee details"}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
              >
                {editMode ? <TbX size={13} /> : <TbEdit size={13} />}
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            >
              <TbX size={14} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <Avatar name={empData.name} size={64} photoUrl={empData.photo_url} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 3, lineHeight: 1.2 }}>{empData.name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.80)", marginBottom: 6 }}>
                {empData.position || "—"} · {dept}
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                {empData.email && (
                  <a href={`mailto:${empData.email}`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
                    <TbMail size={10} /> {empData.email}
                  </a>
                )}
                {empData.phone && (
                  <a href={`tel:${empData.phone}`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
                    <TbPhone size={10} /> {empData.phone}
                  </a>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: statusBadge.bg, color: statusBadge.color }}>
                  {statusBadge.label}
                </span>
                {tenureStr !== "—" && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.90)" }}>
                    <TbClock size={9} /> {tenureStr} tenure
                  </span>
                )}
                {joinDate && (
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>
                    Joined {fmtDate(joinDate.slice(0, 10))}
                  </span>
                )}
                {empData.source_candidate_id && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.90)" }}>
                    <TbBriefcase size={9} /> Recruitment Hire
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Achievement count chips */}
          {achievements.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              {ACH_TYPES.filter(t => achByType[t.value]?.length > 0).map(t => {
                const AIcon = t.Icon;
                return (
                  <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "5px 10px" }}>
                    <AIcon size={11} color="#fff" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{achByType[t.value].length}×</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{t.label.split(" ").slice(-1)[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── EDIT DETAILS ────────────────────────────────────────────── */}
        {editMode && editForm && (
          <div style={{ margin: "12px 16px 0" }}>
            <div className="journey-section" style={{ margin: 0 }}>
              <div className="journey-section-title"><TbEdit size={10} /> Edit Employee Details</div>
              <div className="edit-grid">
                <div className="award-form-row">
                  <label>Full Name</label>
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Phone</label>
                  <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Position</label>
                  <input value={editForm.position} onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Location</label>
                  <input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Employee ID</label>
                  <input value={editForm.employee_code} onChange={e => setEditForm(f => ({ ...f, employee_code: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Department</label>
                  <select value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}>
                    <option value={editForm.department}>{editForm.department || "— Select —"}</option>
                    {[...deptList].filter(d => d.name !== editForm.department).sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(d => (
                      <option key={d._id || d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="award-form-row">
                  <label>Shift</label>
                  <select value={editForm.shift} onChange={e => setEditForm(f => ({ ...f, shift: e.target.value }))}>
                    {SHIFT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="award-form-row">
                  <label>Date of Joining</label>
                  <input type="date" value={editForm.doj} onChange={e => setEditForm(f => ({ ...f, doj: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Confirmation Date</label>
                  <input type="date" value={editForm.confirmation_date} onChange={e => setEditForm(f => ({ ...f, confirmation_date: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Promotion Date</label>
                  <input type="date" value={editForm.promotion_date} onChange={e => setEditForm(f => ({ ...f, promotion_date: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Manager</label>
                  <select value={editForm.manager_id || ""} onChange={e => setEditForm(f => ({ ...f, manager_id: e.target.value || null }))}>
                    <option value="">No Manager / Self-Managed</option>
                    {[...managers].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(m => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button onClick={() => setEditMode(false)} style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={saveEdit} disabled={savingEdit} style={{ display: "flex", alignItems: "center", gap: 6, background: C_BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: savingEdit ? 0.7 : 1 }}>
                  <TbDeviceFloppy size={11} /> {savingEdit ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── ATTENDANCE QUICK STATS ──────────────────────────────────── */}
        <div style={{ margin: "12px 16px 0" }}>
          <div className="journey-section" style={{ margin: 0 }}>
            <div className="journey-section-title"><TbCircleCheck size={10} /> Attendance — {effectiveMonth}</div>
            <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid #f1f5f9" }}>
              {[
                { label: "Rate",    val: `${attRate}%`,       color: attRate >= 80 ? "#16a34a" : attRate >= 65 ? "#d97706" : "#dc2626", bg: attRate >= 80 ? "#f0fdf4" : attRate >= 65 ? "#fffbeb" : "#fef2f2" },
                { label: "Present", val: att.present ?? "—",  color: "#34a06a",  bg: "#fff" },
                { label: "Absent",  val: att.absent  ?? "—",  color: "#dc2626",  bg: "#fff" },
                { label: "Leave",   val: att.leave   ?? "—",  color: "#d97706",  bg: "#fff" },
                { label: "NCI",     val: att.nci     ?? "—",  color: "#64748b",  bg: "#fff" },
              ].map((s, i, arr) => (
                <div key={s.label} className="stat-mini" style={{ background: s.bg, padding: "13px 8px", borderRight: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <div className="stat-mini-val" style={{ color: s.color }}>{s.val}</div>
                  <div className="stat-mini-lbl">{s.label}</div>
                </div>
              ))}
            </div>
            {attTotal > 0 && (
              <div style={{ marginTop: 10 }}>
                <MiniBar value={att.present || 0} max={attTotal} color="#34a06a" />
                <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10.5, color: "#94a3b8" }}>
                  {[["Present","#34a06a"],["Absent","#dc2626"],["Leave","#d97706"],["NCI","#94a3b8"]].map(([l, c]) => (
                    <span key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }} />
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── DOCUMENTS ───────────────────────────────────────────────── */}
        <div style={{ margin: "12px 16px 0" }}>
          <div className="journey-section" style={{ margin: 0 }}>
            <div className="journey-section-title"><TbFileText size={10} /> Documents ({(empData.documents || []).length})</div>

            {(empData.documents || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "12px 0", color: "#94a3b8", fontSize: 12.5 }}>No documents on file yet.</div>
            ) : (
              <div>
                {empData.documents.map(d => {
                  const b = docSourceBadge(d.source);
                  const expiryBadge = docExpiryBadge(d.expiry_date);
                  const history = d.history || [];
                  const isReplacing = replacingDocId === d.id;
                  const isHistoryOpen = expandedHistoryId === d.id;
                  return (
                    <div key={d.id || d.url}>
                      <div className="doc-row">
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <TbFileText size={13} color="#64748b" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {fmtDateTime(d.uploaded_at)}
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 8, background: b.bg, color: b.color }}>{b.label}</span>
                            {d.type && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 8, background: "#f5f3ff", color: "#7c3aed" }}>{d.type}</span>}
                            {expiryBadge && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 8, background: expiryBadge.bg, color: expiryBadge.color }}>{expiryBadge.label}</span>}
                            {history.length > 0 && (
                              <button type="button" onClick={() => setExpandedHistoryId(isHistoryOpen ? null : d.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 2, padding: 0 }}>
                                v{history.length + 1} {isHistoryOpen ? <TbChevronUp size={8} /> : <TbChevronDown size={8} />}
                              </button>
                            )}
                          </div>
                        </div>
                        <a href={cloudinaryViewUrl(d.url)} target="_blank" rel="noreferrer" title="View" style={{ color: C_BRAND, padding: 6, display: "flex" }}>
                          <TbExternalLink size={13} />
                        </a>
                        <button type="button" onClick={() => downloadDocument(d.url, d.name)} title="Download" style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 6, display: "flex" }}>
                          <TbDownload size={12} />
                        </button>
                        {api && token && (
                          <>
                            <button type="button" onClick={() => { setReplacingDocId(isReplacing ? null : d.id); setReplaceFile(null); setReplaceExpiry(d.expiry_date || ""); }} title="Replace" style={{ background: "none", border: "none", cursor: "pointer", color: isReplacing ? C_BRAND : "#64748b", padding: 6, display: "flex" }}>
                              <TbRefresh size={12} />
                            </button>
                            <button onClick={() => removeDoc(d.id)} title="Remove" style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", padding: 6, display: "flex" }}>
                              <TbTrash size={12} />
                            </button>
                          </>
                        )}
                      </div>

                      {isHistoryOpen && history.length > 0 && (
                        <div style={{ margin: "0 0 8px 42px", padding: "8px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 11.5 }}>
                          {history.slice().reverse().map((h, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", color: "#64748b" }}>
                              <span>v{history.length - i}</span>
                              <span>{fmtDateTime(h.uploaded_at)}</span>
                              <a href={cloudinaryViewUrl(h.url)} target="_blank" rel="noreferrer" style={{ color: C_BRAND }}>View</a>
                              <button type="button" onClick={() => downloadDocument(h.url, `${d.name} (v${history.length - i})`)} style={{ background: "none", border: "none", cursor: "pointer", color: C_BRAND, padding: 0 }}>Download</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {isReplacing && (
                        <div style={{ margin: "0 0 10px 42px", padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <input type="file" onChange={e => setReplaceFile(e.target.files?.[0] || null)} style={{ flex: "1 1 160px", fontSize: 12 }} accept=".pdf,.jpg,.jpeg,.png" />
                          <input type="date" value={replaceExpiry} onChange={e => setReplaceExpiry(e.target.value)}
                            style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none" }} title="Expiry date (optional)" />
                          <button type="button" disabled={replacingUpload || !replaceFile} onClick={() => replaceDoc(d.id)}
                            style={{ background: C_BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: (replacingUpload || !replaceFile) ? 0.6 : 1 }}>
                            {replacingUpload ? "Uploading…" : "Upload New Version"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {api && token && (
              <form onSubmit={uploadDoc} style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  placeholder="Document name (e.g. Offer Letter)"
                  style={{ flex: "1 1 180px", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, outline: "none" }}
                />
                <select
                  value={newDocType}
                  onChange={e => setNewDocType(e.target.value)}
                  required
                  style={{ flex: "1 1 160px", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, outline: "none", background: "#fff" }}
                >
                  <option value="">— Document Type —</option>
                  {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  type="date"
                  value={newDocExpiry}
                  onChange={e => setNewDocExpiry(e.target.value)}
                  title="Expiry date (optional)"
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, outline: "none" }}
                />
                <input
                  type="file"
                  onChange={e => setNewDocFile(e.target.files?.[0] || null)}
                  style={{ flex: "1 1 160px", fontSize: 12 }}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <button type="submit" disabled={uploadingDoc || !newDocName.trim() || !newDocFile || !newDocType} style={{ display: "flex", alignItems: "center", gap: 6, background: C_BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: (uploadingDoc || !newDocName.trim() || !newDocFile || !newDocType) ? 0.6 : 1 }}>
                  <TbFileUpload size={11} /> {uploadingDoc ? "Uploading…" : "Add"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ─── RECRUITMENT PROFILE (carried over from the ATS candidate record) ─── */}
        {empData.recruitment_profile && Object.values(empData.recruitment_profile).some(Boolean) && (
          <div style={{ margin: "12px 16px 0" }}>
            <div className="journey-section" style={{ margin: 0 }}>
              <div className="journey-section-title"><TbBriefcase size={10} /> Recruitment Profile</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
                {Object.entries(RECRUITMENT_PROFILE_LABELS).map(([key, label]) => (
                  empData.recruitment_profile[key] ? (
                    <div key={key}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                      <div style={{ fontSize: 13.5, color: "#0f172a", marginTop: 2 }}>{empData.recruitment_profile[key]}</div>
                    </div>
                  ) : null
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 12 }}>Kept in sync automatically when this person's recruitment record is edited.</div>
            </div>
          </div>
        )}

        {/* ─── CAREER TIMELINE ─────────────────────────────────────────── */}
        <div style={{ margin: "12px 16px 0" }}>
          <div className="journey-section" style={{ margin: 0 }}>
            <div className="journey-section-title"><TbRocket size={10} /> Career Journey</div>
            {timeline.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12.5, padding: "12px 0" }}>No timeline events yet.</div>
            ) : timeline.map((ev, i) => (
              <TimelineItem key={`${ev.date}-${i}`} event={ev} isLast={i === timeline.length - 1} />
            ))}
          </div>
        </div>

        {/* ─── ACHIEVEMENTS ────────────────────────────────────────────── */}
        <div style={{ margin: "12px 16px 0" }}>
          <div className="journey-section" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="journey-section-title" style={{ marginBottom: 0 }}><TbTrophy size={10} /> Achievements & Awards</div>
              <button
                onClick={() => setShowAwardForm(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: C_BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "7px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                <TbPlus size={10} /> Award
              </button>
            </div>

            {/* Award form */}
            {showAwardForm && (
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 14, border: "1px solid #e2e8f0" }}>
                <div className="award-form-row">
                  <label>Type</label>
                  <select value={awardForm.type} onChange={e => {
                    const t = ACH_TYPES.find(a => a.value === e.target.value);
                    setAwardForm(f => ({ ...f, type: e.target.value, title: t ? t.label : f.title }));
                  }}>
                    {ACH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="award-form-row">
                  <label>Title</label>
                  <input value={awardForm.title} onChange={e => setAwardForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Employee of the Month — July 2026" />
                </div>
                <div className="award-form-row">
                  <label>Month / Period</label>
                  <input type="month" value={awardForm.month} onChange={e => setAwardForm(f => ({ ...f, month: e.target.value }))} />
                </div>
                <div className="award-form-row">
                  <label>Note (optional)</label>
                  <textarea rows={2} value={awardForm.description} onChange={e => setAwardForm(f => ({ ...f, description: e.target.value }))} placeholder="Reason for the award…" style={{ resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowAwardForm(false)} style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={saveAchievement} disabled={saving} style={{ background: C_BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving…" : "Save Award"}
                  </button>
                </div>
              </div>
            )}

            {loadingAch ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12.5, padding: "12px 0" }}>Loading…</div>
            ) : achievements.length === 0 ? (
              <div style={{ textAlign: "center", padding: "18px 0" }}>
                <TbTrophy size={28} style={{ color: "#e2e8f0", marginBottom: 8 }} />
                <div style={{ fontSize: 12.5, color: "#94a3b8" }}>No achievements recorded yet. Click "Award" to recognise this employee.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {achievements.map(a => {
                  const cfg = achConfig(a.type);
                  const AIcon = cfg.Icon;
                  return (
                    <div key={a._id} className="ach-badge" style={{ background: cfg.bg, borderColor: cfg.border }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <AIcon size={15} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{a.title}</div>
                        {a.month && <div style={{ fontSize: 11.5, color: "#64748b" }}>{fmtMonth(a.month)}</div>}
                        {a.description && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{a.description}</div>}
                      </div>
                      <button onClick={() => deleteAchievement(a._id)} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }} title="Remove">
                        <TbTrash size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── LEAVE HISTORY ───────────────────────────────────────────── */}
        <div style={{ margin: "12px 16px 16px" }}>
          <div className="journey-section" style={{ margin: 0 }}>
            <button
              onClick={() => setLeavesExpanded(v => !v)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: leavesExpanded ? 14 : 0 }}
            >
              <div className="journey-section-title" style={{ marginBottom: 0 }}>
                <TbCalendar size={10} /> Leave History ({empLeaves.length})
              </div>
              {leavesExpanded ? <TbChevronUp size={11} color="#94a3b8" /> : <TbChevronDown size={11} color="#94a3b8" />}
            </button>
            {leavesExpanded && (
              empLeaves.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12.5, padding: "12px 0" }}>No leave records found.</div>
              ) : (
                <div>
                  {empLeaves.map((lv, i) => {
                    const sc = leaveStatusColor(lv.status);
                    const dateRange = lv.from_date && lv.to_date && lv.from_date !== lv.to_date
                      ? `${fmtDate(lv.from_date)} → ${fmtDate(lv.to_date)}`
                      : fmtDate(lv.from_date || lv.date);
                    return (
                      <div key={lv._id || i} className="leave-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{dateRange}</div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                            {lv.type === "half" ? `Half Day (${lv.period || "any"})` : "Full Day"}
                            {lv.reason ? ` — ${lv.reason}` : ""}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: sc.bg, color: sc.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {lv.status || "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* ─── EXTENDED LEAVES ─────────────────────────────────────────── */}
        {empData.extended_leaves?.length > 0 && (
          <div style={{ margin: "0 16px 16px" }}>
            <div className="journey-section" style={{ margin: 0 }}>
              <div className="journey-section-title"><TbPlane size={10} /> Extended Leaves / Sabbaticals</div>
              {empData.extended_leaves.map((lv, i) => (
                <div key={i} className="leave-row">
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{fmtDate(lv.from_date)} → {fmtDate(lv.to_date)}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{lv.type || "Sabbatical"}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "#f5f3ff", color: "#7c3aed" }}>Extended Leave</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── RESIGNATION INFO ─────────────────────────────────────────── */}
        {empData.resignation?.notice_date && (
          <div style={{ margin: "0 16px 24px" }}>
            <div className="journey-section" style={{ margin: 0, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <div className="journey-section-title" style={{ color: "#dc2626" }}><TbUserX size={10} /> Resignation Details</div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Notice Date</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#dc2626" }}>{fmtDate(empData.resignation.notice_date)}</div>
                </div>
                {empData.resignation.last_working_day && (
                  <div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Last Working Day</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#dc2626" }}>{fmtDate(empData.resignation.last_working_day)}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Status</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: offboarded ? "#64748b" : "#d97706" }}>
                    {offboarded ? "Offboarded" : "In Notice Period"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
