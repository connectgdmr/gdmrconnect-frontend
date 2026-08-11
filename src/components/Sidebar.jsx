import React, { useState } from "react";
import Logo from "../assets/GDMR-LOGO-unit.png";
import {
  FaTachometerAlt, FaUsers, FaCalendarCheck, FaClock, FaUserTie,
  FaChartPie, FaCalendarAlt, FaBullhorn, FaUserShield, FaLaptop,
  FaHistory, FaCalendarPlus, FaEdit, FaChartLine, FaClipboardCheck,
  FaSignOutAlt, FaBalanceScale, FaBuilding, FaClipboardList, FaGraduationCap, FaBriefcase, FaMoneyBillWave,
  FaTasks, FaChartArea, FaFolderOpen, FaUserTag, FaCommentDots
} from "react-icons/fa";

const NAV_ITEMS = {
  admin: [
    { icon: <FaTachometerAlt />, label: "Dashboard", view: "dashboard" },
    { icon: <FaCommentDots />, label: "Messages", view: "chat" },
    { icon: <FaUsers />, label: "Employees", view: "employees" },
    { icon: <FaCalendarCheck />, label: "Leave Requests", view: "leaves" },
    { icon: <FaClock />, label: "Attendance", view: "attendance" },
    { icon: <FaBuilding />, label: "Departments", view: "departments" },
    { icon: <FaUserTie />, label: "Managers", view: "manager" },
    { icon: <FaChartPie />, label: "Reports", view: "summary" },
    { icon: <FaChartLine />, label: "PMS", view: "pms" },
    { icon: <FaCalendarAlt />, label: "Holidays", view: "holidays" },
    { icon: <FaBullhorn />, label: "Announcements", view: "announcements" },
    { icon: <FaUserShield />, label: "Grant Access", view: "grant-access" },
    { icon: <FaLaptop />, label: "Manage Assets", view: "assets" },
    { icon: <FaTasks />, label: "Work by Team", view: "work-by-team" },
    { icon: <FaFolderOpen />, label: "Clients", view: "clients" },
    { icon: <FaClipboardList />, label: "Assessments", view: "assessment" },
    { icon: <FaGraduationCap />, label: "LMS", view: "lms" },
    { icon: <FaBriefcase />, label: "Jobs", view: "career" },
    { icon: <FaUserTag />, label: "Recruitment", view: "ats" },
    { icon: <FaMoneyBillWave />, label: "Payroll", view: "payroll" },
  ],
  manager: [
    { icon: <FaTachometerAlt />, label: "Dashboard", view: "dashboard" },
    { icon: <FaCommentDots />, label: "Messages", view: "chat" },
    { icon: <FaHistory />, label: "Attendance Log", view: "attendance-log" },
    { icon: <FaCalendarCheck />, label: "My Leaves", view: "my-leaves" },
    { icon: <FaCalendarPlus />, label: "Apply Leave", view: "apply-leave" },
    { icon: <FaUsers />, label: "Team", view: "dept-dashboard" },
    { icon: <FaCalendarCheck />, label: "Team Leaves", view: "team-leaves" },
    { icon: <FaClipboardCheck />, label: "Corrections", view: "corrections" },
    { icon: <FaChartLine />, label: "PMS", view: "pms" },
    { icon: <FaBullhorn />, label: "Announcements", view: "announcements" },
    { icon: <FaTasks />, label: "Work by Team", view: "work-by-team" },
    { icon: <FaFolderOpen />, label: "Clients", view: "clients" },
    { icon: <FaUserTag />, label: "Recruitment", view: "ats" },
    { icon: <FaChartArea />, label: "Work", view: "work-analytics" },
    { icon: <FaLaptop />, label: "Team Assets", view: "team-assets" },
    { icon: <FaCalendarAlt />, label: "Holidays", view: "holidays" },
    { icon: <FaGraduationCap />, label: "LMS", view: "lms" },
    { icon: <FaBriefcase />, label: "Jobs", view: "career" },
    { icon: <FaMoneyBillWave />, label: "Payroll", view: "payroll" },
    { icon: <FaUserShield />, label: "Special Access", view: "special-access" },
  ],
  owner: [
    { icon: <FaTachometerAlt />, label: "Dashboard", view: "dashboard" },
    { icon: <FaCommentDots />, label: "Messages", view: "chat" },
    { icon: <FaUsers />, label: "Employees", view: "employees" },
    { icon: <FaCalendarCheck />, label: "Leave Requests", view: "leaves" },
    { icon: <FaClock />, label: "Attendance", view: "attendance" },
    { icon: <FaBuilding />, label: "Departments", view: "departments" },
    { icon: <FaUserTie />, label: "Managers", view: "manager" },
    { icon: <FaChartPie />, label: "Reports", view: "summary" },
    { icon: <FaChartLine />, label: "PMS", view: "pms" },
    { icon: <FaCalendarAlt />, label: "Holidays", view: "holidays" },
    { icon: <FaBullhorn />, label: "Announcements", view: "announcements" },
    { icon: <FaUserShield />, label: "Grant Access", view: "grant-access" },
    { icon: <FaLaptop />, label: "Manage Assets", view: "assets" },
    { icon: <FaTasks />, label: "Work by Team", view: "work-by-team" },
    { icon: <FaFolderOpen />, label: "Clients", view: "clients" },
    { icon: <FaClipboardList />, label: "Assessments", view: "assessment" },
    { icon: <FaGraduationCap />, label: "LMS", view: "lms" },
    { icon: <FaBriefcase />, label: "Jobs", view: "career" },
    { icon: <FaUserTag />, label: "Recruitment", view: "ats" },
    { icon: <FaMoneyBillWave />, label: "Payroll", view: "payroll" },
  ],
  employee: [
    { icon: <FaTachometerAlt />, label: "Dashboard", view: "dashboard" },
    { icon: <FaCommentDots />, label: "Messages", view: "chat" },
    { icon: <FaHistory />, label: "Attendance Log", view: "attendance-log" },
    { icon: <FaCalendarCheck />, label: "My Leaves", view: "my-leaves" },
    { icon: <FaCalendarPlus />, label: "Apply Leave", view: "apply-leave" },
    { icon: <FaChartLine />, label: "Performance", view: "pms" },
    { icon: <FaChartArea />, label: "Work", view: "work-analytics" },
    { icon: <FaBullhorn />, label: "Announcements", view: "announcements" },
    { icon: <FaLaptop />, label: "Request Asset", view: "assets" },
    { icon: <FaCalendarAlt />, label: "Holidays", view: "holidays" },
    { icon: <FaGraduationCap />, label: "My Courses", view: "lms" },
    { icon: <FaBriefcase />, label: "Jobs", view: "career" },
    { icon: <FaMoneyBillWave />, label: "Payroll", view: "payroll" },
    { icon: <FaUserShield />, label: "Special Access", view: "special-access" },
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
            <FaSignOutAlt /> Logout
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
