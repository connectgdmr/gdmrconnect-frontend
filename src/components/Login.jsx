// attendance-frontend/src/components/Login.jsx
import React, { useState } from "react";
import Logo from "../assets/GDMR-LOGO-unit.png"; 

export default function Login({ onLogin, api }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");

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
      setErr(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  // Handle Forgot Password Submit
  async function handleForgot(e) {
    e.preventDefault();
    setForgotMsg("Sending request...");
    try {
      await api.forgotPassword(forgotEmail);
      setForgotMsg("✅ If that email exists, a temporary password has been sent.");
    } catch (error) {
      setForgotMsg("❌ Error sending request.");
    }
  }

  // Render Forgot Password View
  if (showForgot) {
     return (
        <div className="app">
         <div className="card" style={{ maxWidth: 450, margin: "60px auto", padding: "40px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <h3 style={{color: "var(--red)", margin:0}}>Reset Password</h3>
                <p className="small" style={{marginTop:5}}>Enter your email to receive a temporary password.</p>
            </div>
            
            {forgotMsg && <div className="alert" style={{marginBottom:15}}>{forgotMsg}</div>}
            
            <form onSubmit={handleForgot}>
                <div style={{ marginBottom: "15px" }}>
                    <label>Email Address</label>
                    <input 
                        className="input" 
                        type="email" 
                        placeholder="Enter registered email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        required
                        style={{width:'100%', marginTop:5}}
                    />
                </div>
                <button className="btn" style={{width:'100%', padding:'12px'}}>Send Reset Link</button>
            </form>
            
            <button 
                className="btn ghost" 
                style={{marginTop:15, width:'100%'}} 
                onClick={() => {setShowForgot(false); setForgotMsg("");}}
            >
                Back to Login
            </button>
         </div>
        </div>
     )
  }

  return (
    <div className="app">
      <div className="card" style={{ maxWidth: 450, margin: "60px auto", padding: "40px" }}>
        
        {/* Branding Section */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img 
            src={Logo} 
            alt="GDMR Logo" 
            style={{ width: "80px", height: "80px", objectFit: "contain", marginBottom: "15px" }} 
          />
          <h2 style={{ color: "var(--red)", margin: 0, fontSize: "24px" }}>
            Welcome Back
          </h2>
          <p className="small" style={{ marginTop: "5px" }}>
            Sign in to GDMR Connect
          </p>
        </div>

        {err && <div className="alert" style={{ marginBottom: "20px" }}>{err}</div>}

        <form onSubmit={handle}>
          {/* Email */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ fontWeight: 500 }}>Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", marginTop: "5px" }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "25px" }}>
            <label style={{ fontWeight: 500 }}>Password</label>
            <div style={{ position: "relative", marginTop: "5px" }}>
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", paddingRight: "42px" }}
                required
              />

              <span
                className="material-icons"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  color: "var(--red)", // Uses your theme color
                  userSelect: "none"
                }}
              >
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </div>
            
            {/* FORGOT PASSWORD LINK */}
             <div style={{textAlign: "right", marginTop: "8px"}}>
                <span 
                    style={{fontSize: "13px", color: "var(--red)", cursor: "pointer", fontWeight: 500}}
                    onClick={() => setShowForgot(true)}
                >
                    Forgot Password?
                </span>
             </div>
          </div>

          {/* Submit */}
          <button 
            className="btn" 
            type="submit" 
            disabled={loading}
            style={{ width: "100%", fontSize: "16px", padding: "12px" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}