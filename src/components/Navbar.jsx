import React, { useState } from "react";
import Logo from "../assets/GDMR-LOGO-unit.png";

export default function Navbar({ user, onLogout }) {
  const [showModal, setShowModal] = useState(false);

  const handleLogoutClick = () => {
    setShowModal(true);
  };

  const confirmLogout = () => {
    setShowModal(false);
    onLogout();
  };

  const cancelLogout = () => {
    setShowModal(false);
  };

  return (
    <>
      <div className="navbar">
        <div className="brand">
          <img src={Logo} alt="GDMR Logo" className="logo-img" />
          <div>
            <div style={{ fontWeight: 700 }}>GDMR CONNECT</div>
            <div className="small">Simple Attendance & Leave Management</div>
          </div>
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <div className="small">Hello, {user.name}</div>
              <button className="btn ghost" onClick={handleLogoutClick}>
                Logout
              </button>
            </>
          ) : (
            <div className="small">Not logged</div>
          )}
        </div>
      </div>

      {/*  Logout Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>

            <div className="modal-actions">
              <button className="btn danger" onClick={confirmLogout}>
                Yes, Logout
              </button>
              <button className="btn ghost" onClick={cancelLogout}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
