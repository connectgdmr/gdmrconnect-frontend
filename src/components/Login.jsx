import React, { useState } from "react";
import Logo from "../assets/GDMR-LOGO-unit.png";
import { FaEye, FaEyeSlash, FaCheckCircle } from "react-icons/fa";

const FEATURES = [
  "Smart Attendance Tracking",
  "Leave Management System",
  "Performance Reviews (PMS)",
  "Asset Request Management",
  "Real-time Announcements",
];

export default function Login({ onLogin, api }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState(""); // "" | "sending" | "success" | "error"

  async function handle(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    if (!email || !password) {
      setErr("Email and password are required");
      setLoading(false);
      return;
    }
    try {
      const data = await api.login({ email, password });
      onLogin(data);
    } catch (err) {
      if (err.message?.includes("Network error") || err.message?.includes("timed out")) {
        setErr(err.message);
      } else if (err.message?.toLowerCase().includes("many") || err.message?.toLowerCase().includes("limit")) {
        setErr("Too many login attempts. Please wait a minute before trying again.");
      } else {
        setErr(err.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setForgotStatus("sending");
    try {
      await api.forgotPassword(forgotEmail);
      setForgotStatus("success");
    } catch (err) {
      setForgotStatus(
        err?.message?.toLowerCase().includes("many") || err?.message?.toLowerCase().includes("limit")
          ? "ratelimit"
          : "error"
      );
    }
  }

  return (
    <div className="login-root">
      {/* Left brand panel */}
      <div className="login-panel-left">
        <div className="login-brand-block">
          <img src={Logo} alt="GDMR Logo" className="login-brand-logo" />
          <div>
            <div className="login-brand-name">GDMR CONNECT</div>
            <div className="login-brand-sub">HRMS Platform</div>
          </div>
        </div>
        <h1 className="login-tagline">
          Manage your workforce with intelligence &amp; precision.
        </h1>
        <div className="login-features">
          {FEATURES.map((f) => (
            <div key={f} className="login-feature-item">
              <FaCheckCircle style={{ color: "#b91c1c", flexShrink: 0, fontSize: 15 }} />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-panel-right">
        {showForgot ? (
          <div className="login-form-box">
            <div style={{ marginBottom: 28 }}>
              <h2 className="login-form-title">Reset Password</h2>
              <p className="login-form-sub">Enter your email to receive a temporary password.</p>
            </div>

            {forgotStatus === "success" && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#16a34a", fontSize: 14 }}>
                If that email exists, a temporary password has been sent.
              </div>
            )}
            {forgotStatus === "error" && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontSize: 14 }}>
                Error sending request. Please try again.
              </div>
            )}
            {forgotStatus === "ratelimit" && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#c2410c", fontSize: 14 }}>
                Too many requests. Please wait a few hours before trying again.
              </div>
            )}
            {forgotStatus === "sending" && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#64748b", fontSize: 14 }}>
                Sending request...
              </div>
            )}

            <form onSubmit={handleForgot}>
              <div className="login-field">
                <label>Email Address</label>
                <input
                  className="login-input"
                  type="email"
                  placeholder="Enter registered email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
              <button className="login-submit-btn" type="submit" disabled={forgotStatus === "sending"}>
                Send Reset Link
              </button>
            </form>

            <button
              onClick={() => { setShowForgot(false); setForgotStatus(""); }}
              style={{ width: "100%", marginTop: 12, padding: "11px", background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#475569", fontWeight: 600, fontSize: 14, transition: "border-color 0.2s" }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="login-form-box">
            <div style={{ marginBottom: 28 }}>
              <h2 className="login-form-title">Welcome Back</h2>
              <p className="login-form-sub">Sign in to your GDMR Connect account</p>
            </div>

            {err && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontSize: 14 }}>
                {err}
              </div>
            )}

            <form onSubmit={handle}>
              <div className="login-field">
                <label>Email Address</label>
                <input
                  className="login-input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="login-field">
                <label>Password</label>
                <div className="login-input-wrap">
                  <input
                    className="login-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: 44 }}
                    required
                  />
                  <button
                    type="button"
                    className="login-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <div className="login-forgot">
                  <span className="login-forgot-link" onClick={() => setShowForgot(true)}>
                    Forgot Password?
                  </span>
                </div>
              </div>

              <button className="login-submit-btn" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="login-footer">
              &copy; {new Date().getFullYear()} GDMR Foundation &middot; All rights reserved
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
