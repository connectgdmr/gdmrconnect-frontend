import React, { useState } from "react";
import Logo from "../assets/GDMR-LOGO-unit.png";
// Tabler Icons (via react-icons/tb — already installed, no new dependency)
// instead of Font Awesome — matches the Jampack reference theme's icon set
// (see TRMPLATE UI/.../SidebarMenu.jsx, which imports straight from
// 'tabler-icons-react'). Same icon names react-icons re-exports with a
// "Tb" prefix, so this is a like-for-like visual swap only.
import {
  TbLayoutDashboard, TbUsers, TbCalendarCheck, TbClock,
  TbChartPie, TbCalendar, TbSpeakerphone, TbShieldLock, TbDeviceLaptop,
  TbHistory, TbChartLine,
  TbLogout, TbBuilding, TbClipboardList, TbSchool, TbBriefcase, TbCurrencyDollar,
  TbChecklist, TbChartArea, TbMessageDots
} from "react-icons/tb";

const NAV_ITEMS = {
  admin: [
    { icon: <TbLayoutDashboard />, label: "Dashboard", view: "dashboard" },
    { icon: <TbMessageDots />, label: "Messages", view: "chat" },
    { icon: <TbUsers />, label: "Workforce", view: "workforce" },
    { icon: <TbCalendarCheck />, label: "Leave Requests", view: "leaves" },
    { icon: <TbClock />, label: "Attendance", view: "attendance" },
    { icon: <TbBuilding />, label: "Departments", view: "departments" },
    { icon: <TbChartPie />, label: "Reports", view: "summary" },
    { icon: <TbChartLine />, label: "PMS", view: "pms" },
    { icon: <TbCalendar />, label: "Holidays", view: "holidays" },
    { icon: <TbSpeakerphone />, label: "Announcements", view: "announcements" },
    { icon: <TbShieldLock />, label: "Grant Access", view: "grant-access" },
    { icon: <TbDeviceLaptop />, label: "Manage Assets", view: "assets" },
    { icon: <TbChecklist />, label: "Work & Clients", view: "work-clients" },
    { icon: <TbClipboardList />, label: "Assessments", view: "assessment" },
    { icon: <TbSchool />, label: "LMS", view: "lms" },
    { icon: <TbBriefcase />, label: "Jobs & Recruitment", view: "jobs-recruitment" },
    { icon: <TbCurrencyDollar />, label: "Payroll", view: "payroll" },
  ],
  manager: [
    { icon: <TbLayoutDashboard />, label: "Dashboard", view: "dashboard" },
    { icon: <TbMessageDots />, label: "Messages", view: "chat" },
    { icon: <TbHistory />, label: "Attendance", view: "attendance" },
    { icon: <TbCalendarCheck />, label: "Leave", view: "leave" },
    { icon: <TbUsers />, label: "Team", view: "dept-dashboard" },
    { icon: <TbCalendarCheck />, label: "Team Leaves", view: "team-leaves" },
    { icon: <TbChartLine />, label: "PMS", view: "pms" },
    { icon: <TbSpeakerphone />, label: "Announcements", view: "announcements" },
    { icon: <TbChecklist />, label: "Work & Clients", view: "work-clients" },
    { icon: <TbDeviceLaptop />, label: "Team Assets", view: "team-assets" },
    { icon: <TbCalendar />, label: "Holidays", view: "holidays" },
    { icon: <TbSchool />, label: "LMS", view: "lms" },
    { icon: <TbBriefcase />, label: "Jobs & Recruitment", view: "jobs-recruitment" },
    { icon: <TbCurrencyDollar />, label: "Payroll", view: "payroll" },
    { icon: <TbShieldLock />, label: "Special Access", view: "special-access" },
  ],
  owner: [
    { icon: <TbLayoutDashboard />, label: "Dashboard", view: "dashboard" },
    { icon: <TbMessageDots />, label: "Messages", view: "chat" },
    { icon: <TbUsers />, label: "Workforce", view: "workforce" },
    { icon: <TbCalendarCheck />, label: "Leave Requests", view: "leaves" },
    { icon: <TbClock />, label: "Attendance", view: "attendance" },
    { icon: <TbBuilding />, label: "Departments", view: "departments" },
    { icon: <TbChartPie />, label: "Reports", view: "summary" },
    { icon: <TbChartLine />, label: "PMS", view: "pms" },
    { icon: <TbCalendar />, label: "Holidays", view: "holidays" },
    { icon: <TbSpeakerphone />, label: "Announcements", view: "announcements" },
    { icon: <TbShieldLock />, label: "Grant Access", view: "grant-access" },
    { icon: <TbDeviceLaptop />, label: "Manage Assets", view: "assets" },
    { icon: <TbChecklist />, label: "Work & Clients", view: "work-clients" },
    { icon: <TbClipboardList />, label: "Assessments", view: "assessment" },
    { icon: <TbSchool />, label: "LMS", view: "lms" },
    { icon: <TbBriefcase />, label: "Jobs & Recruitment", view: "jobs-recruitment" },
    { icon: <TbCurrencyDollar />, label: "Payroll", view: "payroll" },
  ],
  employee: [
    { icon: <TbLayoutDashboard />, label: "Dashboard", view: "dashboard" },
    { icon: <TbMessageDots />, label: "Messages", view: "chat" },
    { icon: <TbHistory />, label: "Attendance", view: "attendance" },
    { icon: <TbCalendarCheck />, label: "Leave", view: "leave" },
    { icon: <TbChartLine />, label: "Performance", view: "pms" },
    { icon: <TbChartArea />, label: "Work & Clients", view: "work-clients" },
    { icon: <TbSpeakerphone />, label: "Announcements", view: "announcements" },
    { icon: <TbDeviceLaptop />, label: "Request Asset", view: "assets" },
    { icon: <TbCalendar />, label: "Holidays", view: "holidays" },
    { icon: <TbSchool />, label: "My Courses", view: "lms" },
    { icon: <TbBriefcase />, label: "Jobs", view: "career" },
    { icon: <TbCurrencyDollar />, label: "Payroll", view: "payroll" },
    { icon: <TbShieldLock />, label: "Special Access", view: "special-access" },
  ],
};

function getActiveItem(view) {
  if (view && view.startsWith("delegated-")) return "special-access";
  return view;
}

export default function Sidebar({ role, user, view, setView, onLogout, navBadges = {}, navDots = {}, isOpen, onClose }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navItems = NAV_ITEMS[role] || NAV_ITEMS.employee;
  const activeItem = getActiveItem(view);

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? " visible" : ""}`}
        onClick={onClose}
      />

      <aside className={`sidebar${isOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <img src={Logo} alt="GDMR" className="sidebar-logo" />
          <div>
            <div className="sidebar-brand-name">GDMR CONNECT</div>
            <div className="sidebar-brand-sub">Your Complete Business Suite</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const badge = navBadges[item.view] || 0;
            const dot   = !badge && navDots[item.view];
            return (
              <button
                key={item.view}
                className={`sidebar-nav-item${activeItem === item.view ? " active" : ""}`}
                onClick={() => { setView(item.view); onClose?.(); }}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
                {badge > 0 && <span className="sidebar-nav-badge">{badge}</span>}
                {dot && <span className="sidebar-nav-dot" title="New activity" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-pill">
            <div className="sidebar-avatar">
              {user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div className="sidebar-user-name">{user?.name || "User"}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={() => setShowLogoutModal(true)}>
            <TbLogout /> Logout
          </button>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 style={{ margin: "0 0 8px" }}>Confirm Logout</h3>
            <p style={{ color: "#666", margin: "0 0 20px" }}>Are you sure you want to logout?</p>
            <div className="modal-actions">
              <button className="btn danger" onClick={() => { setShowLogoutModal(false); onLogout(); }}>
                Yes, Logout
              </button>
              <button className="btn ghost" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
