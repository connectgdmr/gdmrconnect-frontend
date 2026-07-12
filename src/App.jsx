// attendance-frontend/src/App.jsx
import React, { useState, useEffect, lazy, Suspense } from "react";
import Login from "./components/Login";
import SplashScreen from "./components/SplashScreen";
import TakeAssessment from "./components/TakeAssessment";
import CandidateDocuments from "./components/CandidateDocuments";
import api from "./api";
import useChatNotifications from "./components/useChatNotifications";

const AdminDashboard    = lazy(() => import("./components/AdminDashboard"));
const EmployeeDashboard = lazy(() => import("./components/EmployeeDashboard"));
const ManagerDashboard  = lazy(() => import("./components/ManagerDashboard"));

// Public, token-based routes (no login required) — evaluated at module scope
// so the App component can unconditionally call all hooks (Rules of Hooks).
const assessmentMatch = window.location.pathname.match(/^\/assessment\/([^/]+)/);
const documentsMatch  = window.location.pathname.match(/^\/documents\/([^/]+)/);

// Helper to decode JWT simply to check expiration
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

function PublicRoutes() {
  if (assessmentMatch) return <TakeAssessment assessmentToken={assessmentMatch[1]} />;
  if (documentsMatch)  return <CandidateDocuments docToken={documentsMatch[1]} />;
  return null;
}

export default function App() {
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

  // Background chat notification poller — fires even when Chat view is closed
  useChatNotifications(token, api);

  function onLogout() {
    setToken(null);
    setRole(null);
    setUser(null);
    // Only remove app keys — localStorage.clear() wipes third-party data and
    // dismissal state (announcement banners etc.) which should survive re-login
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
  }

  async function handleLogin(data){
    setToken(data.token);
    setRole(data.role);
    setUser(data.user);
  }

  // Public routes — rendered after hooks so Rules of Hooks is satisfied
  if (assessmentMatch || documentsMatch) return <PublicRoutes />;

  if (showSplash) return <SplashScreen />;

  if (!token) return <Login onLogin={handleLogin} api={api} />;

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