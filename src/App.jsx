// attendance-frontend/src/App.jsx
import React, { useState, useEffect, lazy, Suspense } from "react";
import Login from "./components/Login";
import SplashScreen from "./components/SplashScreen";
import TakeAssessment from "./components/TakeAssessment";
import api from "./api";

const AdminDashboard    = lazy(() => import("./components/AdminDashboard"));
const EmployeeDashboard = lazy(() => import("./components/EmployeeDashboard"));
const ManagerDashboard  = lazy(() => import("./components/ManagerDashboard"));

// Detect /assessment/:token in the URL — render public assessment page
const assessmentMatch = window.location.pathname.match(/^\/assessment\/([^/]+)/);

// Helper to decode JWT simply to check expiration
function parseJwt (token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

export default function App() {
  // Public assessment-taking page — no login required
  if (assessmentMatch) {
    return <TakeAssessment assessmentToken={assessmentMatch[1]} />;
  }

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [showSplash, setShowSplash] = useState(true);

  // 1. Token Persistence
  useEffect(()=>{
    if(token) {
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
    }
  }, [token, role, user]);

  // 2. AUTO LOGOUT / INVALID TOKEN CHECK
  useEffect(() => {
    const checkTokenValidity = () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        const decoded = parseJwt(storedToken);
        if (decoded && decoded.exp) {
          const currentTime = Date.now() / 1000;
          // If token is expired
          if (decoded.exp < currentTime) {
            onLogout();
          }
        } else {
          // If token is malformed
          onLogout();
        }
      }
    };

    checkTokenValidity();
    
    // Check every minute to auto-logout while window is open
    const interval = setInterval(checkTokenValidity, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  function onLogout(){ 
    setToken(null); 
    setRole(null); 
    setUser(null); 
    localStorage.clear(); // Ensure storage is wiped completely
  }

  async function handleLogin(data){
    setToken(data.token);
    setRole(data.role);
    setUser(data.user);
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  if(!token) {
    return <Login onLogin={handleLogin} api={api} />;
  }

  return (
    <Suspense fallback={<div className="loader-container"><div className="loader"></div></div>}>
      {role === "admin" ? (
        <AdminDashboard token={token} api={api} user={user} onLogout={onLogout} />
      ) : role === "manager" ? (
        <ManagerDashboard token={token} api={api} user={user} onLogout={onLogout} />
      ) : (
        <EmployeeDashboard token={token} api={api} user={user} onLogout={onLogout} />
      )}
    </Suspense>
  );
}