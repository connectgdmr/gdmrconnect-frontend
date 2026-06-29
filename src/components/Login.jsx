import React, { useState, useEffect } from "react";
import Logo from "../assets/GDMR-LOGO-unit.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { cleanEmail, isValidEmail } from "../utils/security";

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

export default function Login({ onLogin, api }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState(""); // "" | "sending" | "success" | "error"
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Tick down the soft-lock cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handle(e) {
    e.preventDefault();
    setErr("");
    if (cooldown > 0) return;

    const emailClean = cleanEmail(email);
    if (!emailClean || !password) {
      setErr("Email and password are required");
      return;
    }
    if (!isValidEmail(emailClean)) {
      setErr("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const data = await api.login({ email: emailClean, password });
      setAttempts(0);
      onLogin(data);
    } catch (err) {
      if (err?.status === 429) {
        setErr(err.message || "Too many login attempts. Please wait a moment and try again.");
      } else if (err?.status === 423) {
        setErr(err.message || "Account locked due to multiple failed attempts. Please try again later.");
      } else if (err?.message?.includes("Network error") || err?.message?.includes("timed out")) {
        setErr(err.message);
      } else {
        // Generic message — never reveal whether the email or the password was wrong
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setCooldown(COOLDOWN_SECONDS);
          setErr(`Too many failed attempts. Please wait ${COOLDOWN_SECONDS} seconds before trying again.`);
        } else {
          setErr("Incorrect email or password");
        }
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
    } catch {
      setForgotStatus("error");
    }
  }

  return (
    <div className="login-root">
      <div className="login-bg-blob" />

      {/* Top bar */}
      <div className="login-topbar">
        <div className="login-topbar-brand">
          <img src={Logo} alt="GDMR Logo" className="login-brand-logo" />
          <div>
            <div className="login-brand-name">GDMR CONNECT</div>
            <div className="login-brand-sub">HRMS Platform</div>
          </div>
        </div>
      </div>

      {/* Centered card */}
      <div className="login-center">
        <div className="login-card">
          {showForgot ? (
            <>
              <div style={{ marginBottom: 28 }}>
                <h2 className="login-form-title">Reset Password</h2>
                <p className="login-form-sub">Enter your email to receive a temporary password.</p>
              </div>

              {forgotStatus === "success" && (
                <div className="login-alert login-alert--success">
                  If that email exists, a temporary password has been sent.
                </div>
              )}
              {forgotStatus === "error" && (
                <div className="login-alert login-alert--error">
                  Error sending request. Please try again.
                </div>
              )}
              {forgotStatus === "sending" && (
                <div className="login-alert login-alert--info">
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
                className="login-back-btn"
              >
                Back to Login
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <h2 className="login-form-title">Welcome Back</h2>
                <p className="login-form-sub">Sign in to your GDMR Connect account</p>
              </div>

              {err && (
                <div className="login-alert login-alert--error">{err}</div>
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
                    onBlur={(e) => setEmail(cleanEmail(e.target.value))}
                    autoComplete="username"
                    maxLength={254}
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
                      autoComplete="current-password"
                      maxLength={128}
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

                <button className="login-submit-btn" type="submit" disabled={loading || cooldown > 0}>
                  {cooldown > 0 ? `Try again in ${cooldown}s` : loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <p className="login-footer">
                &copy; {new Date().getFullYear()} GDMR Foundation &middot; All rights reserved
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
