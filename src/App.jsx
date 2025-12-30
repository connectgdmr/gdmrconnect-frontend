// attendance-frontend/src/App.jsx
import React, {useState, useEffect} from "react";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import SplashScreen from "./components/SplashScreen";
import api from "./api";

// Helper to decode JWT simply to check expiration
function parseJwt (token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

export default function App(){
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
            console.log("Token expired. Auto logging out.");
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
    }, 2000); 
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
    return (
      <>
        <Navbar user={null} />
        <Login onLogin={handleLogin} api={api} />
      </>
    );
  }

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="app">
        {role === "admin" ? (
          <AdminDashboard token={token} api={api} />
        ) : role === "manager" ? (
          <ManagerDashboard token={token} api={api} />
        ) : (
          <EmployeeDashboard token={token} api={api} />
        )}

        <div className="footer">
          &copy; {new Date().getFullYear()} GDMR CONNECT
        </div>
      </div>
    </>
  );
}