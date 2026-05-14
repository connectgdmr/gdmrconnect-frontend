import React, { useEffect, useState, useRef, useCallback } from "react";
import Sidebar from "./Sidebar";
import HolidayCalendar from "./HolidayCalendar"; 

// ============================================================================
// DELEGATED ADMIN IMPORTS
// These are dynamically rendered only if the standard employee
// has been granted active special permissions from the Admin.
// ============================================================================
import AdminLeavePage from "./AdminLeavePage";
import AdminAttendancePage from "./AdminAttendancePage";

import {
  FaCamera,
  FaSignOutAlt,
  FaCalendarPlus,
  FaCalendarCheck,
  FaHistory,
  FaArrowLeft,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaTimes,
  FaCloudUploadAlt,
  FaCalendarAlt,
  FaChartLine,
  FaEdit,
  FaBullhorn,
  FaEye,
  FaEyeSlash, 
  FaLock,
  FaUserShield,
  FaClipboardList,
  FaShieldAlt,
  FaLaptop,        // NEW: Added the Laptop icon for the Asset module
  FaBars
} from "react-icons/fa";

function QuickLaunchItem({ icon, label, onClick, color = "var(--red)", badgeCount = 0 }) {
  return (
    <div className="quick-launch-item" onClick={onClick} style={{position:'relative'}}>
      <div className="quick-launch-icon" style={{ color }}>{icon}</div>
      <div className="quick-launch-label">{label}</div>
      {badgeCount > 0 && <span className="icon-badge">{badgeCount}</span>}
    </div>
  );
}

function StatItem({ icon, label, count, colorClass, onClick }) {
  return (
    <div className="stat-row clickable-stat" onClick={onClick} title="Click to view details">
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-count">{count}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function EmployeeDashboard({ token, api, user, onLogout, passwordChanged = true }) {
  // ============================================================================
  // 1. CORE DATA STATES
  // ============================================================================
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [pmsHistory, setPmsHistory] = useState([]);
  const [correctionHistory, setCorrectionHistory] = useState([]);
  const [announcements, setAnnouncements] = useState([]); 
  
  // ============================================================================
  // 2. ASSET MANAGEMENT STATES (NEW)
  // ============================================================================
  const [myAssets, setMyAssets] = useState([]);
  const [assetName, setAssetName] = useState("");
  const [assetReason, setAssetReason] = useState("");

  // ============================================================================
  // 3. PASSWORD MANAGEMENT STATES
  // ============================================================================
  const [showPasswordModal, setShowPasswordModal] = useState(!passwordChanged);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // ============================================================================
  // 4. PMS (PERFORMANCE MANAGEMENT) STATES
  // ============================================================================
  const [pmsTemplate, setPmsTemplate] = useState({ sessions: [] }); 
  const [pmsResponses, setPmsResponses] = useState({});

  // ============================================================================
  // 5. SPECIAL ACCESS (DELEGATED ADMIN) STATE
  // ============================================================================
  const [delegatedGrants, setDelegatedGrants] = useState([]);

  // ============================================================================
  // 6. NAVIGATION & UI STATES
  // ============================================================================
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // ============================================================================
  // 7. FORM STATES (LEAVES & CORRECTIONS)
  // ============================================================================
  const [leaveDuration, setLeaveDuration] = useState("single"); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("full");
  const [period, setPeriod] = useState("First Half"); 
  const [file, setFile] = useState(null);
  const [correctionData, setCorrectionData] = useState({ newTime: "", reason: "" });

  // ============================================================================
  // 8. CAMERA & HARDWARE STATES
  // ============================================================================
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null); 
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); 

  // ============================================================================
  // 9. MODAL STATES
  // ============================================================================
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState([]);
  const [pmsModalOpen, setPmsModalOpen] = useState(false);
  const [selectedPms, setSelectedPms] = useState(null);
  
  // ============================================================================
  // 10. DERIVED DATA
  // ============================================================================
  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const approvedLeaves = leaves.filter(l => l.status === 'Approved');
  const rejectedLeaves = leaves.filter(l => l.status === 'Rejected');
  
  const MAX_WORDS = 30;
  const MAX_FILE_SIZE_MB = 5;

  // ============================================================================
  // DATA FETCHING LOGIC
  // ============================================================================
  /**
   * Main data loading function. Fetches all required information for the 
   * employee dashboard, including the newly added asset requests.
   */
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
    const headers = { 'Authorization': `Bearer ${token}` };

    // Returns parsed JSON on success, null on any failure — never throws
    const safeFetch = (url) =>
      fetch(url, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

    try {
      const [
        attData, leaveData, pmsData, corrData,
        templateData, annData, assetsData, grantsData,
      ] = await Promise.all([
        safeFetch(`${baseUrl}/api/my/attendance`),
        safeFetch(`${baseUrl}/api/my/leaves`),
        safeFetch(`${baseUrl}/api/my/pms`),
        safeFetch(`${baseUrl}/api/my/corrections`),
        safeFetch(`${baseUrl}/api/pms-template`),
        safeFetch(`${baseUrl}/api/announcements`),
        safeFetch(`${baseUrl}/api/assets/my-requests`),
        safeFetch(`${baseUrl}/api/my/delegated-access`),
      ]);

      if (attData)      setAttendance(attData);
      if (leaveData)    setLeaves(leaveData);
      if (pmsData)      setPmsHistory(pmsData);
      if (corrData)     setCorrectionHistory(corrData);
      if (templateData) setPmsTemplate(templateData);
      if (annData)      setAnnouncements([...annData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      if (assetsData)   setMyAssets(assetsData);
      setDelegatedGrants(Array.isArray(grantsData) ? grantsData : []);

    } catch (err) {
      console.error("Error loading employee dashboard data:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [token, api]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ============================================================================
  // ASSET SUBMISSION LOGIC (NEW)
  // ============================================================================
  /**
   * Submits a request for new hardware or equipment to the backend.
   */
  async function submitAssetRequest(e) {
      e.preventDefault();
      setLoading(true);
      try {
          const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/assets/request`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ 
                  asset_name: assetName, 
                  reason: assetReason 
              })
          });

          if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.message || "Failed to submit request");
          }

          alert("Asset Request Submitted Successfully! It will now be reviewed by your Manager.");
          setAssetName("");
          setAssetReason("");
          await load(); 
      } catch (err) {
          alert("Error requesting asset: " + err.message);
      } finally {
          setLoading(false);
      }
  }

  // ============================================================================
  // PASSWORD UPDATE LOGIC
  // ============================================================================
  /**
   * Secures the user account by setting a new strong password.
   */
  async function handleSetPassword(e) {
      e.preventDefault();
      setPassError("");

      if (newPassword !== confirmPassword) {
          setPassError("New Password and Confirm Password do not match.");
          return;
      }

      const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      
      if (!strongRegex.test(newPassword)) {
          setPassError("Password must be at least 8 characters long, and include an uppercase letter, a lowercase letter, a number, and a special character (@, $, !, %, *, ?, &).");
          return;
      }

      try {
          const res = await fetch(`${api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app'}/api/my/set-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ oldPassword: oldPassword, password: newPassword })
          });
          const data = await res.json();
          if(!res.ok) throw new Error(data.message);
          
          alert("Password updated successfully!");
          setShowPasswordModal(false);
          setOldPassword("");
          setNewPassword(""); 
          setConfirmPassword("");
          setShowOldPass(false);
          setShowNewPass(false);
          setShowConfirmPass(false);
      } catch (err) {
          setPassError(err.message);
      }
  }

  // ============================================================================
  // HARDWARE INTERACTION (CAMERA)
  // ============================================================================
  /**
   * Initializes the webcam for attendance tracking.
   */
  async function openCamera(type) {
    setActionType(type);
    setCameraOpen(true);
    setPreviewImage(null); 
    setSubmittingPhoto(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream; 
      if (videoRef.current) {
          videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Camera access denied or unavailable. Please check your browser permissions.");
      setCameraOpen(false);
    }
  }

  /**
   * Captures a frame from the video stream to a canvas.
   */
  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d"); 
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    setPreviewImage(canvas.toDataURL("image/jpeg"));
  }

  /**
   * Transmits the captured base64 string to the backend.
   */
  async function submitAttendance(imageData) {
    setSubmittingPhoto(true);
    try {
      if (actionType === "checkin") {
        await api.checkinWithPhoto(token, imageData);
      } else {
        await api.checkoutWithPhoto(token, imageData);
      }
      
      await new Promise(r => setTimeout(r, 500));
      alert(`${actionType === "checkin" ? "Checked in" : "Checked out"} successfully!`);
      
      setSubmittingPhoto(false); 
      closeCamera();
      await load();
    } catch (err) {
      alert("Error submitting attendance: " + (err.message || "An unknown error occurred."));
      setSubmittingPhoto(false); 
    }
  }

  /**
   * Safely disables the webcam stream.
   */
  function closeCamera() {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }
    setCameraOpen(false);
    setPreviewImage(null);
    setSubmittingPhoto(false);
  }

  // ============================================================================
  // DYNAMIC PMS 2.0 SUBMISSION LOGIC
  // ============================================================================
  
  function handlePmsChange(sessionId, sessionName, questionIdx, questionText, field, value) {
      const key = `${sessionId}_${questionIdx}`;
      setPmsResponses(prev => ({
          ...prev,
          [key]: { 
              ...prev[key], 
              session_name: sessionName, 
              question: questionText,
              [field]: value 
          }
      }));
  }

  async function submitPMS(e) {
    e.preventDefault();
    
    const responsesArray = Object.values(pmsResponses);
    if (responsesArray.length === 0) {
        alert("Please provide at least one response before submitting.");
        return;
    }

    try {
        setLoading(true);
        const res = await fetch(`${api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app'}/api/pms/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ responses: responsesArray })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message);
        
        alert("Self Assessment Submitted Successfully! It is now locked for Manager Review.");
        setPmsResponses({});
        setView("dashboard");
        await load(); 
    } catch(err) { 
        alert("Submission failed: " + err.message); 
    } finally {
        setLoading(false);
    }
  }

  function viewPMS(pmsData) {
      setSelectedPms(pmsData);
      setPmsModalOpen(true);
  }

  const getGroupedResponses = () => {
      if (!selectedPms || !selectedPms.responses) return {};
      
      const groups = {};
      selectedPms.responses.forEach(resp => {
          const sName = resp.session_name || "General Evaluation";
          if (!groups[sName]) {
              groups[sName] = [];
          }
          groups[sName].push(resp);
      });
      return groups;
  };

  // ============================================================================
  // ATTENDANCE CORRECTION LOGIC
  // ============================================================================
  async function submitCorrection(e) {
      e.preventDefault();
      try {
        const res = await fetch(`${api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app'}/api/attendance/request-correction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                new_time: correctionData.newTime,
                reason: correctionData.reason,
                attendance_id: "manual_entry" 
            })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message);

        alert("Correction Request Sent Successfully!");
        setView("my-leaves"); 
        load(); 
      } catch (err) { 
          alert("Error sending correction request: " + err.message); 
      }
  }

  // ============================================================================
  // LEAVE APPLICATION LOGIC
  // ============================================================================
  async function applyLeave(e) {
    e.preventDefault();
    try {
      let payload = {
         type, 
         reason,
         period: type === 'half' ? period : null,
         from_date: startDate,
         to_date: leaveDuration === 'single' ? startDate : endDate
      };

      await api.applyLeaveWithFile(payload, file, token);
      
      setStartDate("");
      setEndDate("");
      setReason("");
      setFile(null);
      
      await load();
      alert("Leave applied successfully!");
      setView("my-leaves"); 
    } catch (err) {
      alert("Error applying leave: " + (err.message || "An unknown error occurred."));
    }
  }

  const handleReasonChange = (e) => {
    const val = e.target.value;
    const words = val.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length <= MAX_WORDS) {
      setReason(val);
    }
  };

  const getWordCount = () => {
      return reason.trim() === "" ? 0 : reason.trim().split(/\s+/).filter(w => w.length > 0).length;
  }
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
        const maxSize = MAX_FILE_SIZE_MB * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            alert(`File is too large. Maximum size allowed is ${MAX_FILE_SIZE_MB}MB.`);
            e.target.value = "";
            setFile(null);
        } else {
            setFile(selectedFile);
        }
    }
  };

  function handleStatClick(title, list) {
    setModalTitle(title);
    setModalList(list);
    setLeaveModalOpen(true);
  }

  /**
   * Safely navigates backwards depending on current view state.
   */
  const handleBackNavigation = () => {
      if (view === "delegated-leaves" || view === "delegated-attendance") {
          setView("special-access");
      } else {
          setView("dashboard");
      }
  };

  const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");

  // QuickLaunchItem and StatItem are defined above the component for performance

  // ============================================================================
  // MAIN RENDER METHOD
  // ============================================================================
  return (
    <div className="app-shell">
      <Sidebar
        role="employee"
        user={user}
        view={view}
        setView={setView}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-area">
        <div className="main-topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)}><FaBars /></button>
          {view !== "dashboard" && (
            <button className="topbar-back" onClick={handleBackNavigation}><FaArrowLeft /></button>
          )}
          <span className="topbar-title">
            {view === "dashboard" ? "My Dashboard" : view.replace(/-/g, " ")}
          </span>
          <div className="topbar-right">
            {view === "dashboard" && Array.isArray(delegatedGrants) && delegatedGrants.length > 0 && (
              <div className="topbar-badge-chip">
                <FaShieldAlt /> Special Access Active
              </div>
            )}
            <div className="topbar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <span className="topbar-user-name">{user?.name}</span>
          </div>
        </div>
        <div className="main-content">
      {/*
        ========================================================================
        EXPANDED CSS STYLING
        Expanded to multi-line format for superior readability and maintenance.
        ========================================================================
      */}
      <style>{`
        .modern-input { 
            width: 100%; 
            padding: 10px 12px; 
            border: 1px solid #ddd; 
            border-radius: 6px; 
            font-size: 14px; 
            background: #fff; 
            color: #333; 
        }
        
        .modern-label { 
            font-size: 13px; 
            font-weight: 600; 
            color: #555; 
            margin-bottom: 6px; 
            display: block; 
        }
        
        .file-upload-label { 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 20px; 
            border: 2px dashed #ddd; 
            border-radius: 8px; 
            background: #fafafa; 
            color: #666; 
            cursor: pointer; 
            gap: 10px; 
        }
        
        .status-badge { 
            padding: 4px 10px; 
            border-radius: 20px; 
            font-size: 11px; 
            font-weight: 600; 
            display: inline-block; 
            text-transform: capitalize; 
            min-width: 80px; 
            text-align: center; 
        }
        
        .status-badge.approved { 
            background: #dcfce7; 
            color: #16a34a; 
        }
        
        .status-badge.rejected { 
            background: #fee2e2; 
            color: #dc2626; 
        }
        
        .status-badge.pending { 
            background: #fef3c7; 
            color: #d97706; 
        }
        
        .status-badge.checkin { 
            color: #16a34a; 
        }
        
        .status-badge.checkout { 
            color: #dc2626; 
        }
        
        .styled-table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 14px; 
        }
        
        .styled-table thead th { 
            background-color: #fff3f3; 
            color: #b91c1c; 
            text-align: left; 
            padding: 12px 15px; 
            font-weight: 600; 
            border-bottom: 2px solid #fee2e2; 
        }
        
        .styled-table tbody td { 
            padding: 12px 15px; 
            border-bottom: 1px solid #f2f2f2; 
            color: #444; 
        }
        
        .clickable-stat { 
            cursor: pointer; 
            transition: transform 0.2s; 
        }
        
        .modal-overlay { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.5); 
            z-index: 3000; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
        }
        
        .modal-card { 
            background: white; 
            width: 450px; 
            max-width: 90%; 
            border-radius: 12px; 
            padding: 20px; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
            display: flex; 
            flex-direction: column; 
            max-height: 80vh; 
            position: relative; 
        }
        
        .modal-card.large { 
            width: 750px; 
            max-width: 95%; 
            max-height: 85vh; 
            padding: 25px; 
        }
        
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px auto;
        }
        
        @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }
        
        .password-input-wrapper { 
            position: relative; 
            display: flex; 
            align-items: center; 
            margin-bottom: 15px; 
        }
        
        .password-toggle-icon { 
            position: absolute; 
            right: 12px; 
            cursor: pointer; 
            color: #666; 
            font-size: 16px; 
            top: 38px; 
        }
        
        .delegation-alert { 
            background: #e0e7ff; 
            color: #4f46e5; 
            border-left: 4px solid #4f46e5; 
            padding: 15px; 
            border-radius: 6px; 
            margin-bottom: 20px; 
            font-weight: 500; 
        }
        
        .icon-badge { 
            position: absolute; 
            top: -5px; 
            right: -5px; 
            background: #4f46e5; 
            color: white; 
            border-radius: 50%; 
            padding: 2px 6px; 
            font-size: 10px; 
            font-weight: bold; 
        }
        
        .qa-box { 
            margin-bottom: 20px; 
            background: #f9f9f9; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid var(--red); 
            box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
        }
        
        .announcement-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-left: 4px solid var(--red);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            transition: box-shadow 0.2s;
        }
        
        .announcement-card:hover {
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        
        .announcement-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        
        .announcement-title {
            margin: 0;
            color: #1e293b;
            font-size: 18px;
            font-weight: 700;
        }
        
        .announcement-date {
            font-size: 12px;
            color: #64748b;
            background: #f1f5f9;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .announcement-body {
            color: #475569;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
            margin-bottom: 5px;
        }
      `}</style>

      {/* ============================================================================ */}
      {/* 1. PASSWORD RESET MODAL */}
      {/* ============================================================================ */}
      {showPasswordModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-card">
                {/* Universal Close Button */}
                <button 
                    className="btn ghost" 
                    style={{ position: 'absolute', top: 15, right: 15, padding: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px' }} 
                    onClick={() => {
                        setShowPasswordModal(false);
                        setPassError("");
                        setOldPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                    }}
                >
                    <FaTimes />
                </button>
                
                <h3 style={{color: "var(--red)", marginTop: 0}}>Set Secure Password</h3>
                <p className="small">Please set a strong password to secure your account.</p>
                {passError && <div className="alert" style={{marginBottom: 15, color: '#dc2626', background: '#fee2e2', padding: '10px', borderRadius: '4px'}}>{passError}</div>}
                
                <form onSubmit={handleSetPassword}>
                    {/* CURRENT PASSWORD */}
                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                        <label className="modern-label">Current Password</label>
                        <input 
                            type={showOldPass ? "text" : "password"} 
                            className="modern-input" 
                            style={{ paddingRight: '40px' }}
                            placeholder="Enter current password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                        />
                        <span className="password-toggle-icon" onClick={() => setShowOldPass(!showOldPass)}>
                            {showOldPass ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    {/* NEW PASSWORD */}
                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                        <label className="modern-label">New Password</label>
                        <input 
                            type={showNewPass ? "text" : "password"} 
                            className="modern-input" 
                            style={{ paddingRight: '40px' }}
                            placeholder="1 Uppercase, 1 Lowercase, 1 Number, 1 Special Char"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <span className="password-toggle-icon" onClick={() => setShowNewPass(!showNewPass)}>
                            {showNewPass ? <FaEyeSlash /> : <FaEye />}
                        </span>
                        <small style={{display: 'block', marginTop: 5, color: '#666'}}>Must be at least 8 characters long.</small>
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                        <label className="modern-label">Confirm New Password</label>
                        <input 
                            type={showConfirmPass ? "text" : "password"} 
                            className="modern-input" 
                            style={{ paddingRight: '40px' }}
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <span className="password-toggle-icon" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                            {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    <button className="btn" style={{width: '100%', marginTop: 20, padding: 12}}>Save Password</button>
                </form>
            </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 2. DYNAMIC HEADER LOGIC WITH SPECIAL ACCESS ALERT */}
      {/* ============================================================================ */}
      {view === "dashboard" ? (
        <div className="dashboard-header-card card">
          <h2 style={{ color: "var(--red)", margin: 0 }}>My Dashboard</h2>
          <p className="small">Manage your attendance and leaves</p>
          
          {/* Highlight special permissions prominently on the dashboard header */}
          {Array.isArray(delegatedGrants) && delegatedGrants.length > 0 && (
             <div style={{ marginTop: 10, display: 'inline-block', background: '#e0e7ff', color: '#4f46e5', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                <FaShieldAlt style={{marginRight: 6, marginBottom: -2}}/> You have Special Admin Privileges active.
             </div>
          )}
        </div>
      ) : (
        <div className="dashboard-header-card card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn ghost" onClick={handleBackNavigation} style={{padding: '8px 12px', display:'flex', alignItems:'center', gap:6}}>
            <FaArrowLeft /> Back
          </button>
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'uppercase' }}>
            {view.replace(/-/g, " ")}
          </h3>
        </div>
      )}

      {/* ============================================================================ */}
      {/* NETWORK ERROR BANNER */}
      {/* ============================================================================ */}
      {loadError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '20px', marginTop: '16px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>Failed to load your data</div>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            This usually happens on a slow or new network. The server may be starting up.
          </div>
          <button className="btn" onClick={() => load()} style={{ padding: '10px 28px' }}>
            Retry
          </button>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 3. DASHBOARD WIDGETS */}
      {/* ============================================================================ */}
      {view === "dashboard" && (
        <div className="dashboard-grid-container">
          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Actions</h4>
            <div className="quick-launch-grid">
              <QuickLaunchItem icon={<FaCamera />} label="Check In" onClick={() => openCamera("checkin")} color="green" />
              <QuickLaunchItem icon={<FaSignOutAlt />} label="Check Out" onClick={() => openCamera("checkout")} color="#b91c1c" />
              <QuickLaunchItem icon={<FaCalendarPlus />} label="Apply Leave" onClick={() => setView("apply-leave")} />
              <QuickLaunchItem icon={<FaChartLine />} label="PMS Eval" onClick={() => setView("pms")} color="#6366f1"/>
              <QuickLaunchItem icon={<FaCalendarCheck />} label="My Leaves" onClick={() => setView("my-leaves")} />
              <QuickLaunchItem icon={<FaHistory />} label="Attendance Log" onClick={() => setView("attendance-log")} />
              <QuickLaunchItem icon={<FaCalendarAlt />} label="Holidays" onClick={() => setView("holidays")} />
              <QuickLaunchItem icon={<FaBullhorn />} label="Announcements" onClick={() => setView("announcements")} />
              
              {/* NEW: Asset Request Button */}
              <QuickLaunchItem 
                icon={<FaLaptop />} 
                label="Request Asset" 
                onClick={() => setView("assets")} 
                color="#8b5cf6" 
              />

              <QuickLaunchItem 
                icon={<FaLock />} 
                label="Change Password" 
                onClick={() => {
                  setPassError(""); 
                  setOldPassword("");
                  setNewPassword(""); 
                  setConfirmPassword("");
                  setShowPasswordModal(true);
                }} 
                color="#f59e0b" 
              />

              {/* THE CONSOLIDATED DELEGATED PORTAL BUTTON (SPECIAL ACCESS) */}
              {Array.isArray(delegatedGrants) && delegatedGrants.length > 0 && (
                <QuickLaunchItem 
                    icon={<FaUserShield />} 
                    label="Special Access" 
                    onClick={() => setView("special-access")} 
                    color="#4f46e5" 
                    badgeCount={delegatedGrants.length}
                />
              )}
            </div>
          </div>

          <div className="card dashboard-widget">
            <h4 className="widget-title">My Leave Status</h4>
            <div className="stats-list">
              <StatItem icon={<FaHourglassHalf />} label="Pending Requests" count={pendingLeaves.length} colorClass="text-orange" onClick={() => handleStatClick("Pending Requests", pendingLeaves)} />
              <StatItem icon={<FaCheckCircle />} label="Approved Leaves" count={approvedLeaves.length} colorClass="text-green" onClick={() => handleStatClick("Approved Leaves", approvedLeaves)} />
              <StatItem icon={<FaTimesCircle />} label="Rejected Leaves" count={rejectedLeaves.length} colorClass="text-red" onClick={() => handleStatClick("Rejected Leaves", rejectedLeaves)} />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 4. ASSETS REQUEST VIEW (NEW FEATURE) */}
      {/* ============================================================================ */}
      {view === "assets" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Hardware & Asset Requests</h3>
              <p className="small" style={{marginBottom: 20}}>Request new hardware or equipment. All requests require approval from both your Manager and the Administration team.</p>
              
              {/* Asset Request Form */}
              <form onSubmit={submitAssetRequest} style={{background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 30}}>
                  <h4 style={{marginTop: 0, color: 'var(--red)', borderBottom: '1px solid #cbd5e1', paddingBottom: 10}}>Submit New Request</h4>
                  <div style={{display: 'flex', gap: 15, flexWrap: 'wrap', marginBottom: 15}}>
                      <div style={{flex: 1, minWidth: '250px'}}>
                          <label className="modern-label">Asset Required (e.g., MacBook Pro, External Monitor)</label>
                          <input 
                              className="modern-input" 
                              type="text" 
                              value={assetName} 
                              onChange={(e) => setAssetName(e.target.value)} 
                              required 
                              placeholder="Enter exact asset name..."
                          />
                      </div>
                  </div>
                  <div style={{marginBottom: 15}}>
                      <label className="modern-label">Business Justification / Reason</label>
                      <textarea 
                          className="modern-input" 
                          style={{minHeight: "80px", resize: "vertical"}} 
                          value={assetReason} 
                          onChange={(e) => setAssetReason(e.target.value)} 
                          required 
                          placeholder="Explain why this asset is necessary for your role..." 
                      />
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end'}}>
                      <button className="btn" type="submit" style={{background: '#8b5cf6'}}>
                          {loading ? 'Submitting...' : 'Submit Request to Manager'}
                      </button>
                  </div>
              </form>

              {/* Asset Request History Table */}
              <h4 style={{marginTop: 30, color: '#334155'}}>My Request History</h4>
              <div style={{overflowX: 'auto'}}>
                  <table className="styled-table">
                      <thead>
                          <tr>
                              <th>Date</th>
                              <th>Asset Requested</th>
                              <th>Reason</th>
                              <th>Manager Status</th>
                              <th>Admin Status</th>
                              <th>Final Status</th>
                          </tr>
                      </thead>
                      <tbody>
                          {myAssets.length === 0 ? (
                              <tr><td colSpan="6" style={{textAlign:'center', padding:20, color:'#999'}}>No asset requests found.</td></tr>
                          ) : (
                              myAssets.map(asset => (
                                  <tr key={asset._id}>
                                      <td>{new Date(asset.created_at).toLocaleDateString('en-GB')}</td>
                                      <td style={{fontWeight: 'bold', color: '#1e293b'}}>{asset.asset_name}</td>
                                      <td>{asset.reason}</td>
                                      <td>
                                          <span className={`status-badge ${getStatusClass(asset.manager_status)}`}>
                                              {asset.manager_status || 'Pending'}
                                          </span>
                                      </td>
                                      <td>
                                          <span className={`status-badge ${getStatusClass(asset.admin_status)}`}>
                                              {asset.admin_status || 'Pending'}
                                          </span>
                                      </td>
                                      <td>
                                          <span className={`status-badge ${getStatusClass(asset.status)}`} style={{border: '1px solid #ccc'}}>
                                              {asset.status || 'Pending'}
                                          </span>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* ============================================================================ */}
      {/* 5. DELEGATED ADMIN PORTAL HUB (SPECIAL ACCESS VIEW) */}
      {/* ============================================================================ */}
      {view === "special-access" && (
         <div className="card" style={{ marginTop: "16px" }}>
            <h2 style={{ color: '#4f46e5', marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaUserShield /> Temporary Admin Portal
            </h2>
            <p style={{ color: '#666', marginBottom: 30 }}>
                You have been granted temporary administrative permissions. Select an action below to proceed.
            </p>

            <div className="quick-launch-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <QuickLaunchItem 
                     icon={<FaClipboardList />} 
                     label="Manage Leave Approvals" 
                     onClick={() => setView("delegated-leaves")} 
                     color="#4f46e5" 
                />
                <QuickLaunchItem 
                     icon={<FaHistory />} 
                     label="Manage Daily Attendance" 
                     onClick={() => setView("delegated-attendance")} 
                     color="#4f46e5" 
                />
            </div>
         </div>
      )}

      {/* --- SUB-VIEWS FOR DELEGATED ADMIN --- */}
      {view === "delegated-leaves" && (
         <div style={{ marginTop: "16px" }}>
            <div className="delegation-alert">
               🛡️ You are viewing the Leave Approval interface using temporary Delegated Access. 
            </div>
            <AdminLeavePage token={token} api={api} />
         </div>
      )}

      {view === "delegated-attendance" && (
         <div style={{ marginTop: "16px" }}>
            <div className="delegation-alert">
               🛡️ You are viewing the Daily Attendance Logs using temporary Delegated Access. 
            </div>
            <AdminAttendancePage token={token} api={api} />
         </div>
      )}

      {/* ============================================================================ */}
      {/* 6. ANNOUNCEMENTS VIEW */}
      {/* ============================================================================ */}
      {view === "announcements" && (
         <div className="card" style={{ marginTop: "16px", background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            <h3 style={{color: 'var(--red)'}}>Company Announcements</h3>
            <p style={{color: '#64748b', marginBottom: 20}}>View the latest news and updates from the administration.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {announcements.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                        <FaBullhorn size={40} style={{opacity: 0.2, marginBottom: 15}}/>
                        <p style={{margin: 0}}>No announcements currently active.</p>
                    </div>
                ) : (
                    announcements.map((ann) => (
                        <div key={ann._id} className="announcement-card">
                            <div className="announcement-header">
                                <h4 className="announcement-title">{ann.title}</h4>
                                <span className="announcement-date">
                                    {new Date(ann.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="announcement-body">{ann.message}</div>
                        </div>
                    ))
                )}
            </div>
         </div>
      )}

      {/* ============================================================================ */}
      {/* 7. DYNAMIC PMS VIEW (SELF-EVALUATION) */}
      {/* ============================================================================ */}
      {view === "pms" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Monthly Performance Self-Evaluation</h3>
              {!pmsTemplate || !pmsTemplate.sessions || pmsTemplate.sessions.length === 0 ? (
                  <p style={{color:'#777', padding: 20, textAlign: 'center', border: '1px dashed #ccc', borderRadius: 8}}>
                      No active evaluation sessions available for this month.
                  </p>
              ) : (
                  <form onSubmit={submitPMS}>
                      {pmsTemplate.sessions.map((session, sIdx) => (
                          <div key={sIdx} style={{marginBottom: 30, padding: 25, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb'}}>
                              <h4 style={{color: 'var(--red)', marginTop: 0, borderBottom: '2px solid #fecaca', paddingBottom: 10, fontSize: 18}}>
                                  Session {sIdx + 1}: {session.name}
                              </h4>
                              {session.questions.map((q, qIdx) => {
                                  const responseKey = `${sIdx}_${qIdx}`;
                                  const currentScore = pmsResponses[responseKey]?.self_score || 5;
                                  return (
                                  <div key={qIdx} style={{marginTop: 25, padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9'}}>
                                      <label className="modern-label" style={{fontSize: 15, color: '#1e293b', marginBottom: 12}}>{q.text}</label>
                                      {q.type === 'scale' ? (
                                          <div style={{display:'flex', alignItems:'center', gap: 20, marginTop: 10, marginBottom: 15}}>
                                              <input type="range" min="1" max="10" value={currentScore} onChange={(e) => handlePmsChange(sIdx, session.name, qIdx, q.text, 'self_score', e.target.value)} required style={{flex: 1, accentColor: 'var(--red)', cursor: 'pointer'}} />
                                              <div style={{background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', minWidth: '80px', textAlign: 'center'}}>
                                                  <strong style={{fontSize: 20, color: 'var(--red)'}}>{currentScore}</strong><span style={{color: '#64748b'}}>/10</span>
                                              </div>
                                          </div>
                                      ) : (
                                          <textarea className="modern-input" style={{minHeight: 100, marginTop: 10, marginBottom: 15, resize: 'vertical'}} placeholder="Enter your descriptive answer here..." onChange={(e) => handlePmsChange(sIdx, session.name, qIdx, q.text, 'descriptive_answer', e.target.value)} required />
                                      )}
                                      <input type="text" className="modern-input" style={{background: '#f8fafc', borderStyle: 'dashed'}} placeholder="Remarks / Context explaining your response (Optional)" onChange={(e) => handlePmsChange(sIdx, session.name, qIdx, q.text, 'remarks', e.target.value)} />
                                  </div>
                              )})}
                          </div>
                      ))}
                      <div style={{display:'flex', justifyContent:'flex-end'}}>
                          <button type="submit" className="btn" style={{padding: '15px 40px', fontSize: 16, borderRadius: 30}}>
                              {loading ? 'Submitting...' : 'Submit Evaluation securely'}
                          </button>
                      </div>
                  </form>
              )}

              {/* PMS HISTORY TABLE */}
              <h4 style={{marginTop:40, color:'var(--red)', borderTop: '2px solid #eee', paddingTop: 20}}>My PMS Evaluation History</h4>
              <div style={{overflowX: 'auto'}}>
                <table className="styled-table">
                    <thead><tr><th>Month</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        {pmsHistory.length === 0 && <tr><td colSpan="3" style={{textAlign: 'center', color: '#999', padding: 20}}>No history found.</td></tr>}
                        {pmsHistory.map(p => (
                            <tr key={p._id}>
                                <td style={{fontWeight: 'bold'}}>{p.month}</td>
                                <td><span className={`status-badge ${p.status === 'Manager Review Completed' ? 'approved' : 'pending'}`}>{p.status}</span></td>
                                <td>
                                    <button className="btn ghost" style={{padding: "6px 12px", fontSize: "13px", border: '1px solid #ccc'}} onClick={() => viewPMS(p)}>
                                        <FaEye style={{marginRight: 4}}/> View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* ============================================================================ */}
      {/* 8. CORRECTION VIEW */}
      {/* ============================================================================ */}
      {view === "correction" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Request Attendance Correction</h3>
              <p className="small" style={{marginBottom:20}}>You can request corrections up to 3 times per month.</p>
              <form onSubmit={submitCorrection}>
                  <div style={{marginBottom:15}}>
                      <label className="modern-label">Correct Date & Time</label>
                      <input className="modern-input" type="datetime-local" required onChange={e => setCorrectionData({...correctionData, newTime: e.target.value})} />
                  </div>
                  <div style={{marginBottom:15}}>
                      <label className="modern-label">Reason</label>
                      <input className="modern-input" type="text" required placeholder="e.g. Forgot to punch out due to meeting..." onChange={e => setCorrectionData({...correctionData, reason: e.target.value})} />
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end'}}>
                      <button type="submit" className="btn" style={{marginTop:15}}>Send Request</button>
                  </div>
              </form>

              <h4 style={{marginTop:30, color:'var(--red)'}}>My Correction Requests</h4>
              <div style={{overflowX: 'auto'}}>
                <table className="styled-table">
                    <thead><tr><th>Date Requested</th><th>Reason</th><th>Status</th></tr></thead>
                    <tbody>
                        {correctionHistory.length === 0 && <tr><td colSpan="3">No history found.</td></tr>}
                        {correctionHistory.map(c => (
                            <tr key={c._id}>
                                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                                <td>{c.reason}</td>
                                <td><span className={`status-badge ${c.status === 'Approved' ? 'approved' : c.status === 'Rejected' ? 'rejected' : 'pending'}`}>{c.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* ============================================================================ */}
      {/* 9. APPLY LEAVE */}
      {/* ============================================================================ */}
      {view === "apply-leave" && (
        <div className="card" style={{ marginTop: 16 }}>
          <form onSubmit={applyLeave}>
             <h3 style={{marginTop:0}}>Apply for Leave</h3>
             <div style={{display:'flex', gap:20, marginBottom:15}}>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                    <input type="radio" name="duration" checked={leaveDuration === 'single'} onChange={() => setLeaveDuration('single')} />
                    <FaCalendarAlt style={{color: "var(--red)"}} />
                    <span style={{fontWeight:500}}>Single Day</span>
                </label>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                    <input type="radio" name="duration" checked={leaveDuration === 'multiple'} onChange={() => setLeaveDuration('multiple')} />
                    <FaCalendarAlt style={{color: "var(--red)"}} />
                    <span style={{fontWeight:500}}>Multiple Days</span>
                </label>
            </div>

            <div className="form-row">
              <div style={{flex:1}}>
                <label className="modern-label">{leaveDuration === 'single' ? 'Date' : 'Start Date'}</label>
                <input className="modern-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              
              {leaveDuration === 'multiple' && (
                  <div style={{flex:1}}>
                    <label className="modern-label">End Date</label>
                    <input className="modern-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
              )}

              {leaveDuration === 'single' && (
                  <div style={{flex:1}}>
                    <label className="modern-label">Leave Type</label>
                    <select className="modern-input" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="full">Full Day</option>
                      <option value="half">Half Day</option>
                    </select>
                  </div>
              )}

              {type === 'half' && leaveDuration === 'single' && (
                  <div style={{flex:1, marginLeft:10}}>
                    <label className="modern-label">Period</label>
                    <select className="modern-input" value={period} onChange={(e) => setPeriod(e.target.value)}>
                      <option value="First Half">First Half (Morning)</option>
                      <option value="Second Half">Second Half (Afternoon)</option>
                    </select>
                  </div>
              )}
            </div>

            <div style={{marginTop: 15}}>
              <label className="modern-label">Reason for Leave</label>
              <textarea className="modern-input" style={{minHeight: "100px", resize: "vertical"}} value={reason} onChange={handleReasonChange} required placeholder="Reason (Max 30 words)..." />
              <div className="small" style={{textAlign:'right', marginTop:4, color: getWordCount() === MAX_WORDS ? 'red' : '#777'}}>
                 {getWordCount()}/{MAX_WORDS} words
              </div>
            </div>

            <div style={{marginTop: 15}}>
              <label className="modern-label">Attachment (Optional)</label>
              <label className="file-upload-label">
                <FaCloudUploadAlt size={24} />
                <span>{file ? file.name : "Click to upload a document (Max 5MB)"}</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={{display: "none"}} />
              </label>
            </div>

            <div style={{ marginTop: 25, display:'flex', justifyContent:'flex-end' }}>
              <button className="btn" type="submit" style={{padding: "10px 24px"}}>Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 10. MY LEAVES HISTORY */}
      {/* ============================================================================ */}
      {view === "my-leaves" && (
        <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px'}}>
              <h3 style={{margin:0, color:'var(--red)'}}>My Leaves</h3>
              <button className="btn" style={{background:'#f59e0b', fontSize:'13px'}} onClick={() => setView("correction")}>
                  <FaEdit style={{marginRight:5}}/> Request Correction
              </button>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table className="styled-table">
              <thead><tr><th>Date</th><th>Type</th><th>Status</th><th>Attachment</th></tr></thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign:"center", padding:20, color:"#999"}}>No leaves found.</td></tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l._id}>
                      <td style={{fontWeight:500}}>{l.from_date && l.to_date && l.from_date !== l.to_date ? `${l.from_date} to ${l.to_date}` : l.date}</td>
                      <td style={{textTransform:"capitalize"}}>{l.type === 'half' ? `Half (${l.period || '-'})` : l.type}</td>
                      <td><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span></td>
                      <td>{l.attachment_url ? <a href={l.attachment_url.startsWith('http') ? l.attachment_url : `https://gdmrconnect-backend-production.up.railway.app${l.attachment_url}`} target="_blank" rel="noreferrer" style={{color:"var(--red)", fontSize:13}}>View</a> : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 11. MY ATTENDANCE LOG */}
      {/* ============================================================================ */}
      {view === "attendance-log" && (
        <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
           {loading ? <div className="loader-container" style={{padding: 40}}><div className="loader"></div></div> : (
            <table className="styled-table">
              <thead><tr><th>Type</th><th>Date / Time</th><th>Photo</th></tr></thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan="3" style={{textAlign:"center", padding:20, color:"#999"}}>No records found.</td></tr>
                ) : (
                  attendance.map((a) => (
                    <tr key={a._id}>
                      <td style={{fontWeight: 600}}><span className={`status-badge ${a.type}`}>{a.type === 'checkin' ? 'Check In' : 'Check Out'}</span></td>
                      <td>{new Date(a.time).toLocaleString()}</td>
                      <td>{a.photo_url ? <a href={a.photo_url.startsWith('http') ? a.photo_url : `https://gdmrconnect-backend-production.up.railway.app${a.photo_url}`} target="_blank" rel="noreferrer" style={{color:"var(--red)", fontSize:13}}>View</a> : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
           )}
        </div>
      )}

      {/* ============================================================================ */}
      {/* 12. HOLIDAYS & UTILITY MODALS */}
      {/* ============================================================================ */}
      {view === "holidays" && <div style={{ marginTop: "16px" }}><HolidayCalendar /></div>}

      {leaveModalOpen && (
        <div className="modal-overlay" onClick={() => setLeaveModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
              <h3 style={{ margin: 0, color: 'var(--red)' }}>{modalTitle}</h3>
              <button className="btn ghost" onClick={() => setLeaveModalOpen(false)}><FaTimes /></button>
            </div>
            <div style={{overflowY:'auto', flex:1}}>
               {modalList.map((l) => (
                  <div key={l._id} style={{padding:12, borderBottom:'1px solid #f9f9f9'}}>
                    <div style={{fontWeight:600}}>{l.date || l.from_date}</div>
                    <div style={{fontSize:13, color:'#666'}}>"{l.reason || "No reason"}"</div>
                    <span className={`status-badge ${getStatusClass(l.status)}`} style={{marginTop:5}}>{l.status || 'Pending'}</span>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- PMS DETAILS MODAL --- */}
      {pmsModalOpen && selectedPms && (
        <div className="modal-overlay" onClick={() => setPmsModalOpen(false)}>
          <div className="modal-card large" onClick={e => e.stopPropagation()} style={{padding: '25px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:15, borderBottom:'2px solid #fee2e2', paddingBottom:15}}>
              <div>
                  <h3 style={{ margin: 0, color: 'var(--red)' }}>PMS Evaluation Details</h3>
                  <span className="small" style={{color: '#666'}}>Evaluation for {selectedPms.month}</span>
              </div>
              <button className="btn ghost" style={{background: '#f1f5f9', borderRadius: '50%', padding: '10px'}} onClick={() => setPmsModalOpen(false)}>
                  <FaTimes size={16} color="#333" />
              </button>
            </div>

            <div style={{overflowY:'auto', flex:1, paddingRight: 10}}>
               <p><strong>Status:</strong> <span className={`status-badge ${selectedPms.status === 'Manager Review Completed' ? 'approved' : 'pending'}`} style={{marginLeft: 10}}>{selectedPms.status}</span></p>
               
               {selectedPms.manager_feedback && (
                   <div style={{background: '#fef2f2', padding: 15, borderRadius: 8, marginTop: 15, border: '1px solid #fee2e2'}}>
                       <h4 style={{margin: '0 0 10px 0', color: 'var(--red)'}}>Manager Remarks</h4>
                       <p style={{margin: 0, fontSize: 14, whiteSpace: 'pre-wrap'}}>{selectedPms.manager_feedback}</p>
                   </div>
               )}

               <h4 style={{marginTop: 25, borderBottom: '1px solid #eee', paddingBottom: 10}}>Evaluation Breakdown</h4>
               
               {(!selectedPms.responses || selectedPms.responses.length === 0) ? (
                   <p style={{color: '#999', fontStyle: 'italic', textAlign: 'center', padding: 20}}>No details available.</p>
               ) : (
                   Object.entries(getGroupedResponses()).map(([sessionName, responsesInSession], sessionIndex) => (
                       <div key={sessionIndex} style={{marginBottom: '30px'}}>
                           <h5 style={{ color: 'var(--red)', borderBottom: '2px solid #fecaca', paddingBottom: '8px', marginBottom: '15px', fontSize: '15px', textTransform: 'uppercase' }}>
                               Session: {sessionName}
                           </h5>
                           
                           {responsesInSession.map((resp, idx) => {
                               const mgrScoreObj = selectedPms.manager_scores?.find(m => m.question === resp.question);
                               return (
                               <div key={idx} className="qa-box">
                                   <div style={{fontWeight: 600, marginBottom: 8, color: '#222'}}>{resp.question}</div>
                                   {resp.self_score && (
                                       <div style={{display: 'flex', gap: 20, marginBottom: 10}}>
                                           <div style={{background: '#fff', padding: '6px 12px', borderRadius: '4px', border: '1px solid #e2e8f0'}}>
                                               <span style={{fontSize: 12, color: '#666', display: 'block'}}>Self Score</span> 
                                               <strong style={{fontSize: 16}}>{resp.self_score}</strong>/10
                                           </div>
                                           {mgrScoreObj && (
                                               <div style={{background: '#fef2f2', padding: '6px 12px', borderRadius: '4px', border: '1px solid #fecaca'}}>
                                                   <span style={{fontSize: 12, color: '#dc2626', display: 'block'}}>Manager Score</span> 
                                                   <strong style={{fontSize: 16, color: 'var(--red)'}}>{mgrScoreObj.score}</strong>/10
                                               </div>
                                           )}
                                       </div>
                                   )}
                                   {resp.descriptive_answer && (
                                       <div style={{marginBottom: 10}}>
                                           <div style={{fontSize: 12, color: '#666', fontWeight: 'bold', marginBottom: 4}}>Answer:</div>
                                           <div style={{background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, whiteSpace: 'pre-wrap'}}>
                                               {resp.descriptive_answer}
                                           </div>
                                       </div>
                                   )}
                                   {resp.remarks && (
                                       <div style={{fontSize: 13, fontStyle: 'italic', color: '#475569', marginTop: 10, background: '#f1f5f9', padding: '8px 10px', borderRadius: '4px'}}>
                                           <strong>Remarks:</strong> {resp.remarks}
                                       </div>
                                   )}
                               </div>
                               );
                           })}
                       </div>
                   ))
               )}
            </div>
          </div>
        </div>
      )}

      {/* --- CAMERA MODAL --- */}
      {cameraOpen && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
          <div className="camera-box" style={{position: 'relative', background:'#fff', padding:20, borderRadius:8, width:400, maxWidth:'90%', textAlign:'center'}}>
            <button className="btn ghost" style={{ position: 'absolute', top: 10, right: 10, padding: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px' }} onClick={closeCamera}>
                <FaTimes />
            </button>
            {submittingPhoto ? (
                <div style={{ padding: "40px 20px" }}>
                    <div className="loader"></div>
                    <p style={{ marginTop: 15, fontWeight: 500, color: "#555" }}>Submitting attendance...</p>
                    <p style={{ fontSize: "12px", color: "#888" }}>Please wait</p>
                </div>
            ) : (
                <>
                    <h4 style={{marginBottom: 10, color: '#333'}}>{actionType === 'checkin' ? 'Check In' : 'Check Out'}</h4>
                    <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: "8px", background:'#000', display: previewImage ? 'none' : 'block' }}></video>
                    {previewImage && <img src={previewImage} style={{ width: "100%", borderRadius: "8px", display: 'block' }} alt="Preview" />}
                    <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
                    <div style={{ marginTop: 15, display:'flex', justifyContent:'center', gap: 10 }}>
                        {!previewImage ? (
                            <>
                                <button className="btn" onClick={capturePhoto}>Capture</button>
                                <button className="btn ghost" onClick={closeCamera}>Cancel</button>
                            </>
                        ) : (
                            <>
                                <button className="btn" onClick={() => submitAttendance(previewImage)}>Submit</button>
                                <button className="btn ghost" onClick={() => setPreviewImage(null)}>Retake</button>
                            </>
                        )}
                    </div>
                </>
            )}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}