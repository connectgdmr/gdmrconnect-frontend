import React from "react";
import Logo from "../assets/GDMR-LOGO-unit.png";

export default function SplashScreen() {
  return (
    <div className="splash-root" role="presentation">
      <div className="splash-card">
        <img src={Logo} alt="GDMR Logo" className="splash-logo" />
        <div className="splash-title">GDMR CONNECT</div>
      </div>
    </div>
  );
}