import React, { useEffect, useState, useRef, useCallback } from "react";
// IMPORTING ADMIN COMPONENTS FOR DELEGATED ACCESS
import AdminLeavePage from "./AdminLeavePage"; 
import AdminAttendancePage from "./AdminAttendancePage";
import HolidayCalendar from "./HolidayCalendar"; 
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
  FaUserCheck, 
  FaTimes, 
  FaCloudUploadAlt, 
  FaCalendarAlt, 
  FaUsers,
  FaChartLine, 
  FaClipboardCheck, 
  FaBullhorn, 
  FaEye,
  FaEyeSlash, 
  FaLock,
  FaDownload,
  FaPlus,
  FaTrash,
  FaEdit,
  FaUserShield, // ADDED: Icon for Delegated Access
  FaClipboardList // ADDED: Icon for Delegated Attendance
} from "react-icons/fa";

export default function ManagerDashboard({ token, api, passwordChanged = true }) {
  // --- Data States ---
  const [attendance, setAttendance] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]); 
  
  // --- Notifications & Announcements ---
  const [notificationCounts, setNotificationCounts] = useState({ leaves: 0, pms: 0, corrections: 0, announcements: 0 });
  const [announcements, setAnnouncements] = useState([]);

  // --- Manager Approval States ---
  const [pendingPMS, setPendingPMS] = useState([]);
  const [pendingCorrections, setPendingCorrections] = useState([]);

  // --- Password State ---
  const [showPasswordModal, setShowPasswordModal] = useState(!passwordChanged);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");

  // Visibility toggles for the 3 password fields
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  // --- Dynamic PMS Template Builder State ---
  const [templateSessions, setTemplateSessions] = useState([]);
  
  // --- PMS Review & Grading State ---
  const [managerScores, setManagerScores] = useState({}); 
  const [managerFeedback, setManagerFeedback] = useState("");
  const [viewPMSModalOpen, setViewPMSModalOpen] = useState(false);
  const [selectedPMS, setSelectedPMS] = useState(null);

  // --- DELEGATED ADMIN STATE ---
  const [delegatedGrants, setDelegatedGrants] = useState([]);

  // --- Department Dashboard State ---
  const [deptDashboard, setDeptDashboard] = useState([]);
  const [dashboardMonth, setDashboardMonth] = useState(new Date().toISOString().slice(0, 7));

  // --- Navigation State ---
  const [view, setView] = useState("dashboard"); 
  
  // --- Leave Form State ---
  const [leaveDuration, setLeaveDuration] = useState("single");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("full");
  const [period, setPeriod] = useState("First Half"); 
  const [file, setFile] = useState(null);
  
  // --- Loading States ---
  const [loading, setLoading] = useState(false);
  
  // --- Camera State ---
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false); 
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); 

  // --- Modal State (General) ---
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState([]);

  // --- Derived States ---
  const pendingLeaves = myLeaves.filter(l => l.status === 'Pending');
  const approvedLeaves = myLeaves.filter(l => l.status === 'Approved');
  const rejectedLeaves = myLeaves.filter(l => l.status === 'Rejected');
  
  const MAX_WORDS = 30; 
  const MAX_FILE_SIZE_MB = 5;

  // --- INITIAL DATA LOADING ---
  const load = useCallback(async (isAction = false) => {
    setLoading(true); 
    
    // Safely check for api to prevent crashes if it isn't passed correctly
    const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const results = await Promise.allSettled([
        api?.myAttendance ? api.myAttendance(token) : Promise.resolve([]),
        api?.myLeaves ? api.myLeaves(token) : Promise.resolve([]),
        api?.getManagerEmployees ? api.getManagerEmployees(token) : Promise.resolve([]),
        fetch(`${baseUrl}/api/manager/pms`, { headers }).then(r => r.json()),
        fetch(`${baseUrl}/api/manager/corrections`, { headers }).then(r => r.json()),
        fetch(`${baseUrl}/api/admin/leaves`, { headers }).then(r => r.json()),
        fetch(`${baseUrl}/api/notifications/counts`, { headers }).then(r => r.json()),
        fetch(`${baseUrl}/api/announcements`, { headers }).then(r => r.json()),
        fetch(`${baseUrl}/api/pms-template`, { headers }).then(r => r.json()),
        fetch(`${baseUrl}/api/admin/pms-dashboard?month=${dashboardMonth}`, { headers }).then(r => r.json()),
        // Fetch Delegated Admin Grants
        fetch(`${baseUrl}/api/my/delegated-access`, { headers }).then(r => r.json())
      ]);

      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) setAttendance(results[0].value);
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) setMyLeaves(results[1].value);
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) setTeamMembers(results[2].value);
      if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) setPendingPMS(results[3].value);
      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value)) setPendingCorrections(results[4].value);
      if (results[5].status === 'fulfilled' && Array.isArray(results[5].value)) setTeamLeaves(results[5].value);
      if (results[6].status === 'fulfilled' && results[6].value) setNotificationCounts(results[6].value);
      if (results[7].status === 'fulfilled' && Array.isArray(results[7].value)) setAnnouncements(results[7].value);
      
      if (results[8].status === 'fulfilled' && results[8].value) {
          setTemplateSessions(results[8].value.sessions || []);
      }
      if (results[9].status === 'fulfilled' && Array.isArray(results[9].value)) {
          setDeptDashboard(results[9].value);
      }
      // Set Delegated Grants
      if (results[10].status === 'fulfilled' && Array.isArray(results[10].value)) {
          setDelegatedGrants(results[10].value);
      }

    } catch (err) { 
      console.error("Error loading data", err); 
    } finally { 
      setLoading(false); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dashboardMonth]); 

  useEffect(() => { load(); }, [load]);

  // --- SET STRONG PASSWORD ---
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

  // --- CAMERA LOGIC ---
  async function openCamera(type) {
    setActionType(type);
    setCameraOpen(true);
    setPreviewImage(null);
    setSubmittingPhoto(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream; 
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied or unavailable.");
      setCameraOpen(false);
    }
  }

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

  async function submitAttendance(imageData) {
    setSubmittingPhoto(true); 
    try {
      if (actionType === "checkin") await api.checkinWithPhoto(token, imageData);
      else await api.checkoutWithPhoto(token, imageData);
      
      setSubmittingPhoto(false); 
      closeCamera(); 
      alert(`${actionType === "checkin" ? "Checked in" : "Checked out"} successfully!`);
      await load(true);
    } catch (err) {
      alert("Error submitting attendance: " + (err.message || ""));
      setSubmittingPhoto(false); 
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setPreviewImage(null);
    setSubmittingPhoto(false);
  }

  // --- PMS TEMPLATE BUILDER LOGIC ---
  const handleAddSession = () => setTemplateSessions([...templateSessions, { name: "", questions: [{ text: "", type: "scale" }] }]);
  const handleRemoveSession = (sIdx) => setTemplateSessions(templateSessions.filter((_, i) => i !== sIdx));
  
  const handleSessionNameChange = (sIdx, name) => {
      const newS = [...templateSessions];
      newS[sIdx].name = name;
      setTemplateSessions(newS);
  };
  
  const handleAddQuestion = (sIdx) => {
      const newS = [...templateSessions];
      newS[sIdx].questions.push({ text: "", type: "scale" });
      setTemplateSessions(newS);
  };
  
  const handleRemoveQuestion = (sIdx, qIdx) => {
      const newS = [...templateSessions];
      newS[sIdx].questions = newS[sIdx].questions.filter((_, i) => i !== qIdx);
      setTemplateSessions(newS);
  };
  
  const handleQuestionChange = (sIdx, qIdx, field, val) => {
      const newS = [...templateSessions];
      newS[sIdx].questions[qIdx][field] = val;
      setTemplateSessions(newS);
  };

  async function savePmsTemplate(e) {
      e.preventDefault();
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          setLoading(true);
          const res = await fetch(`${baseUrl}/api/admin/pms-template`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ sessions: templateSessions })
          });
          if(res.ok) alert("PMS Evaluation Form Saved Successfully!");
          else alert("Failed to save template.");
          await load(true);
      } catch(err) { 
          alert("Error saving PMS Template"); 
          setLoading(false);
      }
  }

  // --- PMS REVIEW LOGIC ---
  function handleViewPMS(pms) {
      setSelectedPMS(pms);
      setManagerFeedback(pms.manager_feedback || "");
      
      const scores = {};
      if(pms.manager_scores) {
          pms.manager_scores.forEach(m => scores[m.question] = m.score);
      }
      setManagerScores(scores);
      setViewPMSModalOpen(true);
  }

  async function finalizePMS(id) {
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      
      const scoresArr = Object.keys(managerScores).map(q => ({
          question: q,
          score: managerScores[q]
      }));

      try {
          setLoading(true);
          await fetch(`${baseUrl}/api/manager/finalize-pms`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ 
                  review_id: id, 
                  manager_scores: scoresArr,
                  manager_feedback: managerFeedback
              })
          });
          await load(true);
          alert("PMS Review Finalized"); 
          setViewPMSModalOpen(false); 
      } catch(err) { 
          alert(err.message); 
          setLoading(false);
      }
  }

  // --- EXPORT CSV ---
  async function downloadReport() {
      try {
          const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/export-pms?month=${dashboardMonth}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(!res.ok) throw new Error("Failed to download");
          
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Dept_PMS_Report_${dashboardMonth}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
      } catch(err) {
          alert("Export failed: " + err.message);
      }
  }

  // --- CORRECTION LOGIC ---
  async function approveCorrection(id, action) {
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          setLoading(true); 
          await fetch(`${baseUrl}/api/manager/approve-correction`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ id, action })
          });
          await load(true);
          alert(`Correction Request ${action}`); 
      } catch(err) { 
          alert(err.message); 
          setLoading(false);
      }
  }
  
  // --- LEAVE STATUS UPDATE LOGIC ---
  async function updateLeaveStatus(id, status) {
       setLoading(true); 
       const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
       try {
          await fetch(`${baseUrl}/api/admin/leaves/${id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ status })
          });
          await load(true); 
          alert(`Leave ${status} Successfully`); 
       } catch(err) { 
          alert(err.message); 
          setLoading(false);
       }
  }

  // --- APPLY LEAVE (MANAGER PERSONAL) ---
  async function applyLeave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      let payload = { 
          type, 
          reason, 
          period: type === 'half' ? period : null, 
          from_date: startDate, 
          to_date: leaveDuration === 'single' ? startDate : endDate 
      };
      await api.applyLeaveWithFile(payload, file, token);
      setStartDate(""); setEndDate(""); setReason(""); setFile(null);
      await load(true); 
      alert("Leave Applied Successfully!"); 
      setView("my-leaves"); 
    } catch (err) { 
        alert(err.message); 
        setLoading(false);
    }
  }
  
  // --- HELPERS ---
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert("File too large. Max 5MB allowed."); e.target.value = null; setFile(null);
    } else { setFile(selectedFile); }
  };

  const handleReasonChange = (e) => {
    const val = e.target.value;
    const words = val.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length <= MAX_WORDS) setReason(val);
  };
  
  const getWordCount = () => reason.trim() === "" ? 0 : reason.trim().split(/\s+/).filter(w => w.length > 0).length;
  const handleStatClick = (title, list) => { setModalTitle(title); setModalList(list); setLeaveModalOpen(true); }
  const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");

  // --- UI COMPONENTS ---
  const QuickLaunchItem = ({ icon, label, onClick, color = "var(--red)", badgeCount = 0 }) => (
    <div className="quick-launch-item" onClick={onClick} style={{position:'relative'}}>
      <div className="quick-launch-icon" style={{ color: color }}>{icon}</div>
      <div className="quick-launch-label">{label}</div>
      {badgeCount > 0 && <span className="icon-badge">{badgeCount}</span>}
    </div>
  );

  const StatItem = ({ icon, label, count, colorClass, onClick }) => (
    <div className="stat-row clickable-stat" onClick={onClick}>
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info"><span className="stat-count">{count}</span><span className="stat-label">{label}</span></div>
    </div>
  );

  const TeamMembersList = () => (
    <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
        <div style={{overflowX: 'auto'}}>
            <table className="styled-table">
                <thead><tr><th>Name</th><th>Email</th><th>Dept</th><th>Position</th></tr></thead>
                <tbody>
                    {teamMembers.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:20}}>No team members found.</td></tr>}
                    {teamMembers.map(m => <tr key={m._id}><td>{m.name}</td><td>{m.email}</td><td>{m.department}</td><td>{m.position}</td></tr>)}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div>
      <style>{`
        .modern-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: #fff; color: #333; }
        .modern-label { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px; display: block; }
        .file-upload-label { display: flex; align-items: center; justify-content: center; padding: 20px; border: 2px dashed #ddd; border-radius: 8px; background: #fafafa; color: #666; cursor: pointer; gap: 10px; }
        .clickable-stat { cursor: pointer; transition: transform 0.2s; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 3000; display: flex; justify-content: center; align-items: center; }
        .modal-card { background: white; width: 500px; max-width: 90%; border-radius: 12px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; max-height: 85vh; position: relative; }
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; text-transform: capitalize; min-width: 80px; text-align: center; }
        .status-badge.approved { background: #dcfce7; color: #16a34a; }
        .status-badge.rejected { background: #fee2e2; color: #dc2626; }
        .status-badge.pending { background: #fef3c7; color: #d97706; }
        .styled-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .styled-table th, .styled-table td { padding: 12px 15px; border-bottom: 1px solid #f2f2f2; }
        .styled-table th { background-color: #f8f9fa; color: #b91c1c; font-weight:600; text-align:left; }
        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #b91c1c; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn-small { padding: 5px 10px; font-size: 12px; border-radius: 4px; border: none; cursor: pointer; color: white; margin-right: 5px; display:inline-flex; align-items:center; gap:5px; }
        .icon-badge { position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 10px; font-weight: bold; }
        .qa-box { margin-bottom: 15px; background: #f9f9f9; padding: 12px; border-radius: 8px; border-left: 4px solid var(--red); }
        .inline-loader { display: flex; justify-content: center; align-items: center; padding: 40px; color: #666; font-weight: 500; gap: 10px; flex-direction: column; }
        
        .password-input-wrapper { position: relative; display: flex; align-items: center; margin-bottom: 15px; }
        .password-toggle-icon { position: absolute; right: 12px; cursor: pointer; color: #666; font-size: 16px; top: 38px; }
        .delegation-alert { background: #e0e7ff; color: #4f46e5; border-left: 4px solid #4f46e5; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-weight: 500; }
        .icon-badge-blue { background: #4f46e5 !important; }
      `}</style>

      {/* PASSWORD RESET MODAL */}
      {showPasswordModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-card">
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

      {/* HEADER LOGIC */}
      {view === "dashboard" ? (
        <div className="dashboard-header-card card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: "var(--red)", margin: 0 }}>Manager Dashboard</h2>
            <p className="small">Manage your team and your own attendance</p>
            {delegatedGrants.length > 0 && (
               <div style={{ marginTop: 10, display: 'inline-block', background: '#e0e7ff', color: '#4f46e5', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                  🌟 You have special Admin privileges active.
               </div>
            )}
          </div>
          <button 
            onClick={() => {
              setPassError(""); 
              setOldPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setShowPasswordModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <FaLock /> Change Password
          </button>
        </div>
      ) : (
        <div className="dashboard-header-card card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn ghost" onClick={() => setView("dashboard")} style={{padding: '8px 12px', display:'flex', alignItems:'center', gap:6}}>
            <FaArrowLeft /> Back
          </button>
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'uppercase' }}>{view.replace("-", " ")}</h3>
        </div>
      )}

      {loading && (
        <div className="card" style={{ marginTop: 16 }}>
           <div className="inline-loader">
              <div className="loader" style={{width: 40, height: 40, borderWidth: 4}}></div>
              <span style={{color: '#b91c1c', marginTop: 10}}>Updating Data...</span>
           </div>
        </div>
      )}
      
      {/* DASHBOARD GRID */}
      {!loading && view === "dashboard" && (
        <div className="dashboard-grid-container">
          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Actions</h4>
            <div className="quick-launch-grid">
              <QuickLaunchItem icon={<FaCamera />} label="Check In" onClick={() => openCamera("checkin")} color="green" />
              <QuickLaunchItem icon={<FaSignOutAlt />} label="Check Out" onClick={() => openCamera("checkout")} color="#b91c1c" />
              <QuickLaunchItem icon={<FaUserCheck />} label="Team Leaves" onClick={() => setView("team-leaves")} color="var(--red)" badgeCount={notificationCounts?.leaves || 0} />
              
              <QuickLaunchItem icon={<FaEdit />} label="PMS Form Builder" onClick={() => setView("pms-builder")} color="#10b981" />
              <QuickLaunchItem icon={<FaChartLine />} label="PMS Reviews" onClick={() => setView("pms-manager")} color="#6366f1" badgeCount={notificationCounts?.pms || 0} />
              <QuickLaunchItem icon={<FaUsers />} label="Dept Dashboard" onClick={() => setView("dept-dashboard")} color="#8b5cf6" />
              
              <QuickLaunchItem icon={<FaClipboardCheck />} label="Corrections" onClick={() => setView("corrections")} color="#f59e0b" badgeCount={notificationCounts?.corrections || 0} />
              <QuickLaunchItem icon={<FaCalendarPlus />} label="Apply Leave" onClick={() => setView("apply-leave")} />
              <QuickLaunchItem icon={<FaCalendarCheck />} label="My Leaves" onClick={() => setView("my-leaves")} />
              <QuickLaunchItem icon={<FaBullhorn />} label="Announcements" onClick={() => setView("announcements")} color="var(--red)" badgeCount={notificationCounts?.announcements || 0} />
              
              {/* CONSOLIDATED DELEGATED PORTAL BUTTON */}
              {delegatedGrants.length > 0 && (
                <QuickLaunchItem 
                    icon={<FaUserShield />} 
                    label="Admin Portal (Special Access)" 
                    onClick={() => setView("delegated-admin-portal")} 
                    color="#4f46e5" 
                    badgeCount={delegatedGrants.length}
                />
              )}
            </div>
          </div>

          <div className="card dashboard-widget">
            <h4 className="widget-title">My Leave Status</h4>
            <div className="stats-list">
              <StatItem icon={<FaHourglassHalf />} label="Pending" count={pendingLeaves.length} colorClass="text-orange" onClick={() => handleStatClick("My Pending", pendingLeaves)} />
              <StatItem icon={<FaCheckCircle />} label="Approved" count={approvedLeaves.length} colorClass="text-green" onClick={() => handleStatClick("My Approved", approvedLeaves)} />
              <StatItem icon={<FaTimesCircle />} label="Rejected" count={rejectedLeaves.length} colorClass="text-red" onClick={() => handleStatClick("My Rejected", rejectedLeaves)} />
            </div>
          </div>
        </div>
      )}

      {/* --- DELEGATED ADMIN PORTAL HUB (NEW) --- */}
      {!loading && view === "delegated-admin-portal" && (
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
      {!loading && view === "delegated-leaves" && (
         <div style={{ marginTop: "16px" }}>
            <div className="delegation-alert">
               🛡️ You are currently viewing the Leave Approval interface using temporary Delegated Access. 
               Please follow all company guidelines when approving or viewing these records.
            </div>
            <AdminLeavePage token={token} api={api} />
         </div>
      )}

      {!loading && view === "delegated-attendance" && (
         <div style={{ marginTop: "16px" }}>
            <div className="delegation-alert">
               🛡️ You are currently viewing the Daily Attendance Logs using temporary Delegated Access. 
               Please follow all company guidelines when modifying or viewing these records.
            </div>
            <AdminAttendancePage token={token} api={api} />
         </div>
      )}

      {/* --- ANNOUNCEMENTS --- */}
      {!loading && view === "announcements" && (
         <div className="card">
            <h3>Announcements</h3>
            {announcements.length === 0 ? <p style={{color:'#777'}}>No announcements at this time.</p> : announcements.map(a => (
                <div key={a._id} style={{borderBottom:'1px solid #eee', padding:'15px 0'}}>
                    <h4 style={{margin:'0 0 5px 0', color:'#333'}}>{a.title}</h4>
                    <p style={{margin:'5px 0', color:'#555'}}>{a.message}</p>
                    <small style={{color:'#999'}}>{new Date(a.created_at).toLocaleString()}</small>
                </div>
            ))}
         </div>
      )}

      {/* --- PMS TEMPLATE BUILDER (REQ 2.1 & 2.9) --- */}
      {!loading && view === "pms-builder" && (
          <div className="card">
              <h3>Create Department PMS Evaluation Form</h3>
              <p className="small" style={{marginBottom: 20}}>Structure performance reviews through sessions and categorized questions for your department.</p>
              
              <form onSubmit={savePmsTemplate}>
                  {templateSessions.map((session, sIdx) => (
                      <div key={sIdx} style={{marginBottom: 25, padding: 15, background: '#f8f9fa', border: '1px solid #ddd', borderRadius: 8}}>
                          <div style={{display:'flex', gap: 10, alignItems: 'center', marginBottom: 15}}>
                              <h4 style={{margin:0}}>Session {sIdx + 1}</h4>
                              <input 
                                  className="modern-input" style={{flex: 1}} 
                                  placeholder="e.g. Work Productivity" 
                                  value={session.name} 
                                  onChange={e => handleSessionNameChange(sIdx, e.target.value)} 
                                  required 
                              />
                              <button type="button" className="btn-small ghost" style={{color: 'red'}} onClick={() => handleRemoveSession(sIdx)}>
                                  <FaTrash /> Remove Session
                              </button>
                          </div>

                          <div style={{paddingLeft: 20, borderLeft: '2px solid var(--red)'}}>
                              {session.questions.map((q, qIdx) => (
                                  <div key={qIdx} style={{display:'flex', gap: 10, marginBottom: 10, alignItems: 'center'}}>
                                      <input 
                                          className="modern-input" style={{flex: 2}} 
                                          placeholder="Question text..." 
                                          value={q.text} 
                                          onChange={e => handleQuestionChange(sIdx, qIdx, 'text', e.target.value)} 
                                          required 
                                      />
                                      <select 
                                          className="modern-input" style={{flex: 1}} 
                                          value={q.type} 
                                          onChange={e => handleQuestionChange(sIdx, qIdx, 'type', e.target.value)}
                                      >
                                          <option value="scale">Linear Scale (1-10)</option>
                                          <option value="descriptive">Descriptive Answer</option>
                                      </select>
                                      <button type="button" className="btn-small ghost" style={{color: '#888'}} onClick={() => handleRemoveQuestion(sIdx, qIdx)}>
                                          <FaTimes />
                                      </button>
                                  </div>
                              ))}
                              <button type="button" className="btn-small ghost" style={{marginTop: 5, color: '#10b981'}} onClick={() => handleAddQuestion(sIdx)}>
                                  <FaPlus /> Add Question
                              </button>
                          </div>
                      </div>
                  ))}

                  <div style={{display:'flex', justifyContent: 'space-between', marginTop: 20}}>
                      <button type="button" className="btn ghost" onClick={handleAddSession}><FaPlus /> Add New Session</button>
                      <button type="submit" className="btn">Save PMS Form</button>
                  </div>
              </form>
          </div>
      )}

      {/* --- DEPARTMENT PERFORMANCE DASHBOARD (REQ 2.8 & 3.0) --- */}
      {!loading && view === "dept-dashboard" && (
          <div className="card">
              <div style={{display:'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: 20}}>
                  <h3 style={{margin:0}}>Department Performance Dashboard</h3>
                  <div style={{display:'flex', gap: 10}}>
                      <input 
                          type="month" 
                          className="modern-input" 
                          value={dashboardMonth} 
                          onChange={(e) => setDashboardMonth(e.target.value)} 
                      />
                      <button className="btn" style={{background: '#10b981', display:'flex', alignItems:'center', gap:5}} onClick={downloadReport}>
                          <FaDownload /> Export CSV
                      </button>
                  </div>
              </div>

              <div style={{overflowX:'auto'}}>
                <table className="styled-table">
                    <thead>
                        <tr>
                            <th>Department</th>
                            <th style={{textAlign:'center'}}>Total Employees</th>
                            <th style={{textAlign:'center'}}>Completed Reviews</th>
                            <th style={{textAlign:'center'}}>Avg Department Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deptDashboard.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:20}}>No data available for this month.</td></tr>}
                        {deptDashboard.map((row, idx) => (
                            <tr key={idx}>
                                <td style={{fontWeight: 'bold'}}>{row.department}</td>
                                <td style={{textAlign:'center'}}>{row.total_employees}</td>
                                <td style={{textAlign:'center'}}>{row.completed_pms}</td>
                                <td style={{textAlign:'center'}}>
                                    <span style={{fontSize: 16, fontWeight: 'bold', color: row.average_score >= 7 ? 'green' : row.average_score >= 5 ? 'orange' : 'red'}}>
                                        {row.average_score} / 10
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* --- PMS REVIEWS LIST (REQ 2.4) --- */}
      {!loading && view === "pms-manager" && (
          <div className="card">
              <h3>Pending PMS Reviews</h3>
              <div style={{overflowX:'auto', marginBottom:30}}>
                <table className="styled-table">
                    <thead><tr><th>Employee</th><th>Month</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingPMS.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:20, color:'#999'}}>No pending reviews found.</td></tr>}
                        {pendingPMS.filter(p => p.status === 'Pending Review').map(p => (
                            <tr key={p._id}>
                                <td>{p.employee_name}</td>
                                <td>{p.month}</td>
                                <td><span className="status-badge pending">{p.status}</span></td>
                                <td>
                                    <button className="btn-small" style={{background:'#6366f1'}} onClick={() => handleViewPMS(p)}>
                                        <FaEye /> View & Grade
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>

              <h4 style={{color:'#555'}}>Completed PMS History</h4>
              <div style={{overflowX:'auto'}}>
                <table className="styled-table">
                    <thead><tr><th>Employee</th><th>Month</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingPMS.filter(p => p.status === 'Manager Review Completed').map(p => (
                            <tr key={p._id}>
                                <td>{p.employee_name}</td>
                                <td>{p.month}</td>
                                <td><span className="status-badge approved">Completed</span></td>
                                <td>
                                    <button className="btn-small" style={{background:'#888'}} onClick={() => handleViewPMS(p)}>
                                        <FaEye /> View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* --- CORRECTIONS VIEW --- */}
      {!loading && view === "corrections" && (
          <div className="card">
              <h3>Pending Attendance Corrections</h3>
              <div style={{overflowX:'auto'}}>
                <table className="styled-table">
                    <thead><tr><th>Employee</th><th>New Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingCorrections.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:20, color:'#999'}}>No pending corrections found.</td></tr>}
                        {pendingCorrections.map(c => (
                            <tr key={c._id}>
                                <td>{c.employee_name}</td>
                                <td>{new Date(c.new_time).toLocaleString()}</td>
                                <td>{c.reason}</td>
                                <td><span className={`status-badge ${getStatusClass(c.status)}`}>{c.status}</span></td>
                                <td>
                                    {c.status === 'Pending' ? (
                                      <div style={{display:'flex', gap:5}}>
                                        <button className="btn-small" style={{background:'green'}} onClick={() => approveCorrection(c._id, 'Approved')}>
                                          <FaCheckCircle /> Approve
                                        </button>
                                        <button className="btn-small" style={{background:'#b91c1c'}} onClick={() => approveCorrection(c._id, 'Rejected')}>
                                          <FaTimesCircle /> Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span style={{color:'#888', fontStyle:'italic', fontSize:12}}>Processed</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* --- TEAM LEAVES VIEW --- */}
      {!loading && view === "team-leaves" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Team Leave Requests</h3>
              <div style={{overflowX: 'auto'}}>
                <table className="styled-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Date / Period</th>
                            <th>Reason</th>
                            <th style={{textAlign:'center'}}>Manager</th>
                            <th style={{textAlign:'center'}}>HR</th>
                            <th style={{textAlign:'center'}}>Overall</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamLeaves.length === 0 && <tr><td colSpan="7" style={{textAlign:'center', padding:20, color:'#999'}}>No leave requests found.</td></tr>}
                        {teamLeaves.map(l => (
                            <tr key={l._id}>
                                <td>
                                    <div style={{fontWeight:600}}>{l.employee_name}</div>
                                    <div style={{fontSize:11, color:'#888'}}>{l.type === 'half' ? 'Half Day' : 'Full'}</div>
                                </td>
                                <td>
                                    <div style={{fontSize:13}}>{l.from_date === l.to_date ? l.from_date : `${l.from_date} to ${l.to_date}`}</div>
                                </td>
                                <td style={{maxWidth:'250px', fontSize:12, color:'#555', lineHeight:'1.4'}}>{l.reason}</td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(l.manager_status || 'Pending')}`}>
                                      {l.manager_status || 'Pending'}
                                    </span>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(l.admin_status || 'Pending')}`}>
                                      {l.admin_status || 'Pending'}
                                    </span>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(l.status)}`}>{l.status}</span>
                                </td>
                                <td>
                                    {(!l.manager_status || l.manager_status === 'Pending') ? (
                                        <div style={{display:'flex', gap:5}}>
                                            <button className="btn-small" style={{background:'#16a34a', padding:'6px 12px'}} onClick={() => updateLeaveStatus(l._id, 'Approved')}>Approve</button>
                                            <button className="btn-small" style={{background:'#dc2626', padding:'6px 12px'}} onClick={() => updateLeaveStatus(l._id, 'Rejected')}>Reject</button>
                                        </div>
                                    ) : (
                                        <span style={{fontSize:12, color:'#888', fontStyle:'italic'}}>Processed</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {!loading && view === "team-members" && <TeamMembersList />}
      
      {/* --- APPLY LEAVE --- */}
      {!loading && view === "apply-leave" && (
        <div className="card">
          <form onSubmit={applyLeave}>
             <h3 style={{marginTop:0}}>Apply for Leave</h3>
             <div style={{display:'flex', gap:20, marginBottom:15}}>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                    <input type="radio" name="duration" checked={leaveDuration === 'single'} onChange={() => setLeaveDuration('single')} />
                    <FaCalendarAlt style={{color: "var(--red)"}} /><span style={{fontWeight:500}}>Single Day</span>
                </label>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                    <input type="radio" name="duration" checked={leaveDuration === 'multiple'} onChange={() => setLeaveDuration('multiple')} />
                    <FaCalendarAlt style={{color: "var(--red)"}} /><span style={{fontWeight:500}}>Multiple Days</span>
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
                      <option value="First Half">First Half</option>
                      <option value="Second Half">Second Half</option>
                    </select>
                  </div>
              )}
            </div>
            <div style={{marginTop: 15}}>
              <label className="modern-label">Reason for Leave</label>
              <textarea className="modern-input" style={{minHeight: "100px", resize: "vertical"}} value={reason} onChange={handleReasonChange} required placeholder="Reason (Max 30 words)..." />
              <div className="small" style={{textAlign:'right', marginTop:4, color: getWordCount() === MAX_WORDS ? 'red' : '#777'}}>{getWordCount()}/{MAX_WORDS} words</div>
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

      {/* --- MY LEAVES --- */}
      {!loading && view === "my-leaves" && (
        <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
          <div style={{overflowX: 'auto'}}>
            <table className="styled-table">
              <thead><tr><th>Date</th><th>Type</th><th>Status</th><th>Attachment</th></tr></thead>
              <tbody>
                {myLeaves.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:20}}>No leaves found.</td></tr>}
                {myLeaves.map((l) => (
                    <tr key={l._id}>
                      <td style={{fontWeight:500}}>{l.from_date && l.to_date && l.from_date !== l.to_date ? `${l.from_date} to ${l.to_date}` : l.date}</td>
                      <td style={{textTransform:"capitalize"}}>{l.type === 'half' ? `Half (${l.period || '-'})` : l.type}</td>
                      <td><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span></td>
                      <td>{l.attachment_url ? <a href={l.attachment_url.startsWith('http') ? l.attachment_url : `https://erp-backend-production-d377.up.railway.app${l.attachment_url}`} target="_blank" rel="noreferrer" style={{color:"var(--red)", fontSize:13}}>View</a> : "-"}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && view === "attendance-log" && (
        <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
            <table className="styled-table">
              <thead><tr><th>Type</th><th>Date / Time</th><th>Photo</th></tr></thead>
              <tbody>
                {attendance.length === 0 && <tr><td colSpan="3" style={{textAlign:'center', padding:20}}>No attendance records.</td></tr>}
                {attendance.map((a) => (
                    <tr key={a._id}>
                      <td style={{fontWeight: 600}}><span className={`status-badge ${a.type}`}>{a.type === 'checkin' ? 'Check In' : 'Check Out'}</span></td>
                      <td>{new Date(a.time).toLocaleString()}</td>
                      <td>{a.photo_url ? <a href={a.photo_url.startsWith('http') ? a.photo_url : `https://erp-backend-production-d377.up.railway.app${a.photo_url}`} target="_blank" rel="noreferrer" style={{color:"var(--red)", fontSize:13}}>View</a> : "-"}</td>
                    </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}

      {/* Holidays and Modals always render as overlays/separate */}
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

      {/* --- PMS DETAILS & MANAGER GRADING MODAL --- */}
      {viewPMSModalOpen && selectedPMS && (
        <div className="modal-overlay" onClick={() => setViewPMSModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{width: 650}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:15, borderBottom:'1px solid #eee', paddingBottom:10}}>
              <h3 style={{ margin: 0, color: 'var(--red)' }}>PMS Review Details</h3>
              <button className="btn ghost" onClick={() => setViewPMSModalOpen(false)}><FaTimes /></button>
            </div>
            <div style={{overflowY:'auto', flex:1, paddingRight:10, maxHeight: '65vh'}}>
                <div style={{background:'#fdf2f2', padding:10, borderRadius:6, marginBottom:20, display:'flex', flexDirection:'column', gap:5}}>
                    <div><b>Employee:</b> {selectedPMS.employee_name}</div>
                    <div><b>Month:</b> {selectedPMS.month}</div>
                    <div><b>Status:</b> <span className={`status-badge ${selectedPMS.status === 'Manager Review Completed' ? 'approved' : 'pending'}`}>{selectedPMS.status}</span></div>
                </div>
                
                <h4 style={{marginBottom:15, color:'#333'}}>Employee Responses:</h4>
                {(!selectedPMS.responses || selectedPMS.responses.length === 0) ? (
                    <p style={{fontStyle:'italic', color:'#999'}}>No responses found.</p>
                ) : (
                    selectedPMS.responses.map((resp, idx) => {
                        const existingMgrScore = selectedPMS.manager_scores?.find(m => m.question === resp.question);
                        const isPending = selectedPMS.status === 'Pending Review';

                        return (
                        <div key={idx} className="qa-box" style={{marginBottom: 20, background: '#f9f9f9', padding: 15, borderRadius: 8, borderLeft: '4px solid #ddd'}}>
                            <div style={{fontWeight:600, marginBottom:8, color:'#222'}}>{resp.question}</div>
                            
                            {resp.self_score && (
                                <div>
                                    <div style={{display: 'flex', gap: 20, marginBottom: 10, alignItems: 'center'}}>
                                        <div><span style={{fontSize: 12, color: '#666'}}>Employee Self Score:</span> <strong style={{fontSize: 16}}>{resp.self_score}</strong>/10</div>
                                        
                                        {!isPending && existingMgrScore && (
                                            <div><span style={{fontSize: 12, color: '#666'}}>Manager Score:</span> <strong style={{fontSize: 16, color: 'var(--red)'}}>{existingMgrScore.score}</strong>/10</div>
                                        )}
                                    </div>
                                    
                                    {isPending && (
                                        <div style={{marginTop: 10, background: '#fff', padding: 10, border: '1px solid #eee', borderRadius: 4}}>
                                            <label className="modern-label" style={{fontSize: 12}}>Assign Manager Score (1-10)</label>
                                            <input 
                                                type="number" min="1" max="10" className="modern-input" required
                                                value={managerScores[resp.question] || ""}
                                                onChange={(e) => setManagerScores({...managerScores, [resp.question]: e.target.value})}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {resp.descriptive_answer && (
                                <div style={{marginBottom: 10}}>
                                    <div style={{fontSize: 12, color: '#666'}}>Answer:</div>
                                    <div style={{background: '#fff', padding: 10, borderRadius: 4, border: '1px solid #eee', fontSize: 14}}>
                                        {resp.descriptive_answer}
                                    </div>
                                </div>
                            )}

                            {resp.remarks && (
                                <div style={{fontSize: 13, fontStyle: 'italic', color: '#555', marginTop: 10}}>
                                    <strong>Remarks:</strong> {resp.remarks}
                                </div>
                            )}
                        </div>
                    )})
                )}
                
                {/* MANAGER FINAL FEEDBACK & SUBMIT */}
                {selectedPMS.status === 'Pending Review' && (
                    <div style={{marginTop:30, borderTop:'1px solid #eee', paddingTop:20}}>
                        <h4 style={{marginBottom:10}}>Manager Final Evaluation</h4>
                        <label className="modern-label">Overall Remarks & Feedback</label>
                        <textarea 
                            className="modern-input" 
                            style={{minHeight: 100}}
                            placeholder="Provide constructive feedback..."
                            value={managerFeedback}
                            onChange={e => setManagerFeedback(e.target.value)}
                        />
                        <button 
                            className="btn" 
                            style={{marginTop:15, width:'100%', fontSize:'15px'}} 
                            onClick={() => finalizePMS(selectedPMS._id)}
                        >
                            Submit Scores & Finalize Review
                        </button>
                    </div>
                )}
                
                {selectedPMS.status === 'Manager Review Completed' && selectedPMS.manager_feedback && (
                    <div style={{marginTop:20, padding:15, background:'#fef2f2', borderRadius:8, border: '1px solid #fee2e2'}}>
                        <h4 style={{margin: '0 0 10px 0', color:'var(--red)'}}>Your Final Remarks:</h4>
                        <p style={{margin: 0, fontSize: 14}}>{selectedPMS.manager_feedback}</p>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* --- CAMERA MODAL --- */}
      {cameraOpen && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
          <div className="camera-box" style={{position: 'relative', background:'#fff', padding:20, borderRadius:8, width:400, maxWidth:'90%', textAlign:'center'}}>
            
            {/* Added Close X button for Camera Modal */}
            <button 
                className="btn ghost" 
                style={{ position: 'absolute', top: 10, right: 10, padding: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px' }} 
                onClick={closeCamera}
            >
                <FaTimes />
            </button>

            {submittingPhoto ? (
                <div style={{ padding: "40px 20px" }}>
                    <div className="loader"></div>
                    <p style={{ marginTop: 15, fontWeight:500, color:'#555' }}>Submitting attendance...</p>
                    <p style={{ fontSize:12, color:'#888' }}>Please wait...</p>
                </div>
            ) : (
                <>
                    <h4 style={{marginBottom: 10}}>{actionType === 'checkin' ? 'Check In' : 'Check Out'}</h4>
                    <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: "8px", display: previewImage ? 'none' : 'block' }}></video>
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
  );
}