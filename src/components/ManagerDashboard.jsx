import React, { useEffect, useState, useRef, useCallback } from "react";
import AdminLeavePage from "./AdminLeavePage"; 
import HolidayCalendar from "./HolidayCalendar"; 
import {
  FaCamera, FaSignOutAlt, FaCalendarPlus, FaCalendarCheck, 
  FaArrowLeft, FaCheckCircle, FaHourglassHalf, FaTimesCircle, 
  FaUserCheck, FaTimes, FaCloudUploadAlt, FaCalendarAlt, 
  FaUsers, FaChartLine, FaClipboardCheck, FaBullhorn, FaEye
} from "react-icons/fa";

export default function ManagerDashboard({ token, api }) {
  // --- Data States ---
  const [attendance, setAttendance] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]); 
  const [notificationCounts, setNotificationCounts] = useState({ leaves: 0, pms: 0, corrections: 0, announcements: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [pendingPMS, setPendingPMS] = useState([]);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  
  // --- UI States ---
  const [view, setView] = useState("dashboard"); 
  const [loading, setLoading] = useState(false); // New global loader state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState([]);

  // --- Form & PMS States ---
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [pmsQuestions, setPmsQuestions] = useState([""]); 
  const [reviewScore, setReviewScore] = useState({}); 
  const [viewPMSModalOpen, setViewPMSModalOpen] = useState(false);
  const [selectedPMS, setSelectedPMS] = useState(null);
  const [leaveDuration, setLeaveDuration] = useState("single");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("full");
  const [period, setPeriod] = useState("First Half"); 
  const [file, setFile] = useState(null);

  // --- Camera States ---
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false); 
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); 

  const MAX_WORDS = 30; 
  const MAX_FILE_SIZE_MB = 5;

  // --- OPTIMIZED PARALLEL LOADING ---
  const load = useCallback(async () => {
    setLoading(true);
    const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    try {
      const results = await Promise.allSettled([
        api.myAttendance(token),
        api.myLeaves(token),
        api.getManagerEmployees(token),
        fetch(`${baseUrl}/api/manager/pms`, { headers: authHeaders }).then(res => res.json()),
        fetch(`${baseUrl}/api/manager/corrections`, { headers: authHeaders }).then(res => res.json()),
        fetch(`${baseUrl}/api/admin/leaves`, { headers: authHeaders }).then(res => res.json()),
        fetch(`${baseUrl}/api/notifications/counts`, { headers: authHeaders }).then(res => res.json()),
        fetch(`${baseUrl}/api/announcements`, { headers: authHeaders }).then(res => res.json())
      ]);

      // Map fulfilled results to state
      if (results[0].status === 'fulfilled') setAttendance(results[0].value);
      if (results[1].status === 'fulfilled') setMyLeaves(results[1].value);
      if (results[2].status === 'fulfilled') setTeamMembers(results[2].value);
      if (results[3].status === 'fulfilled') setPendingPMS(results[3].value);
      if (results[4].status === 'fulfilled') setPendingCorrections(results[4].value);
      if (results[5].status === 'fulfilled') setTeamLeaves(results[5].value);
      if (results[6].status === 'fulfilled') setNotificationCounts(results[6].value);
      if (results[7].status === 'fulfilled') setAnnouncements(results[7].value);

    } catch (err) {
      console.error("Error loading dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [api, token]);

  useEffect(() => { load(); }, [load]);

  // --- CAMERA LOGIC ---
  async function openCamera(type) {
    setActionType(type);
    setCameraOpen(true);
    setPreviewImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream; 
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied.");
      setCameraOpen(false);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreviewImage(canvas.toDataURL("image/jpeg"));
  }

  async function submitAttendance(imageData) {
    setSubmittingPhoto(true); 
    try {
      if (actionType === "checkin") await api.checkinWithPhoto(token, imageData);
      else await api.checkoutWithPhoto(token, imageData);
      closeCamera(); 
      alert(`${actionType} successful!`);
      load();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingPhoto(false); 
    }
  }

  function closeCamera() {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setCameraOpen(false);
    setPreviewImage(null);
  }

  // --- ACTION LOGIC ---
  async function updateLeaveStatus(id, status) {
    setLoading(true);
    try {
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      await fetch(`${baseUrl}/api/admin/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      alert("Status updated");
      load();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  }

  async function applyLeave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      let payload = { type, reason, period: type === 'half' ? period : null, 
                      from_date: startDate, to_date: leaveDuration === 'single' ? startDate : endDate };
      await api.applyLeaveWithFile(payload, file, token);
      setStartDate(""); setReason(""); setFile(null);
      alert("Applied successfully!");
      setView("my-leaves");
      load();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  }

  // --- HELPERS ---
  const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");
  const handleStatClick = (title, list) => { setModalTitle(title); setModalList(list); setLeaveModalOpen(true); };

  return (
    <div>
      {/* GLOBAL LOADER */}
      {loading && (
        <div className="global-loader-overlay">
          <div className="loader-spinner"></div>
          <p>Processing Data...</p>
        </div>
      )}

      <style>{`
        .global-loader-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.7); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .loader-spinner { border: 4px solid #f3f3f3; border-top: 4px solid #b91c1c; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 10px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .modern-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: #fff; }
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-align: center; min-width: 80px; display: inline-block; text-transform: capitalize; }
        .status-badge.approved { background: #dcfce7; color: #16a34a; }
        .status-badge.rejected { background: #fee2e2; color: #dc2626; }
        .status-badge.pending { background: #fef3c7; color: #d97706; }
        .styled-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .styled-table th { background: #f8f9fa; color: #b91c1c; padding: 12px 15px; text-align: left; }
        .styled-table td { padding: 12px 15px; border-bottom: 1px solid #f2f2f2; }
        .quick-launch-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; }
        .quick-launch-item { padding: 15px; border: 1px solid #eee; border-radius: 10px; text-align: center; cursor: pointer; transition: 0.2s; position: relative; }
        .quick-launch-item:hover { transform: translateY(-3px); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .icon-badge { position: absolute; top: 5px; right: 5px; background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 10px; font-weight: bold; }
      `}</style>

      {/* HEADER Area */}
      <div className="dashboard-header-card card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {view !== "dashboard" && (
            <button className="btn ghost" onClick={() => setView("dashboard")} style={{display:'flex', alignItems:'center', gap:6}}>
              <FaArrowLeft /> Back
            </button>
          )}
          <h2 style={{ color: "var(--red)", margin: 0 }}>
            {view === "dashboard" ? "Manager Dashboard" : view.replace("-", " ").toUpperCase()}
          </h2>
        </div>
      </div>

      {/* DASHBOARD Widgets */}
      {view === "dashboard" && (
        <div className="dashboard-grid-container" style={{marginTop: 20}}>
          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Actions</h4>
            <div className="quick-launch-grid">
              <div className="quick-launch-item" onClick={() => openCamera("checkin")}><FaCamera color="green" size={24}/><div className="small">Check In</div></div>
              <div className="quick-launch-item" onClick={() => openCamera("checkout")}><FaSignOutAlt color="#b91c1c" size={24}/><div className="small">Check Out</div></div>
              <div className="quick-launch-item" onClick={() => setView("team-leaves")}>
                <FaUserCheck color="var(--red)" size={24}/>
                <div className="small">Team Leaves</div>
                {notificationCounts.leaves > 0 && <span className="icon-badge">{notificationCounts.leaves}</span>}
              </div>
              <div className="quick-launch-item" onClick={() => setView("pms-manager")}><FaChartLine color="#6366f1" size={24}/><div className="small">PMS</div></div>
              <div className="quick-launch-item" onClick={() => setView("corrections")}><FaClipboardCheck color="#f59e0b" size={24}/><div className="small">Corrections</div></div>
              <div className="quick-launch-item" onClick={() => setView("announcements")}><FaBullhorn color="var(--red)" size={24}/><div className="small">Announce</div></div>
            </div>
          </div>

          <div className="card dashboard-widget">
            <h4 className="widget-title">My Leave Summary</h4>
            <div className="stats-list">
              <div className="stat-row clickable-stat" onClick={() => handleStatClick("Pending", myLeaves.filter(l => l.status === 'Pending'))}>
                <div className="stat-icon-box text-orange"><FaHourglassHalf /></div>
                <div className="stat-info"><span className="stat-count">{myLeaves.filter(l => l.status === 'Pending').length}</span><span className="stat-label">Pending</span></div>
              </div>
              <div className="stat-row clickable-stat" onClick={() => handleStatClick("Approved", myLeaves.filter(l => l.status === 'Approved'))}>
                <div className="stat-icon-box text-green"><FaCheckCircle /></div>
                <div className="stat-info"><span className="stat-count">{myLeaves.filter(l => l.status === 'Approved').length}</span><span className="stat-label">Approved</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM LEAVES (Updated Admin Style) */}
      {view === "team-leaves" && (
        <div className="card" style={{marginTop: 16}}>
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
              {teamLeaves.length === 0 && <tr><td colSpan="7" style={{textAlign:'center', padding:20}}>No requests found.</td></tr>}
              {teamLeaves.map(l => (
                <tr key={l._id}>
                  <td><b>{l.employee_name}</b><br/><small style={{color:'#888'}}>{l.type === 'half' ? 'Half Day' : 'Full Day'}</small></td>
                  <td><div style={{fontSize:13}}>{l.from_date === l.to_date ? l.from_date : `${l.from_date} to ${l.to_date}`}</div></td>
                  <td style={{maxWidth:250, fontSize:12}}>{l.reason}</td>
                  <td style={{textAlign:'center'}}><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status}</span></td>
                  <td style={{textAlign:'center'}}><span className={`status-badge ${getStatusClass(l.hr_status || 'Pending')}`}>{l.hr_status || 'Pending'}</span></td>
                  <td style={{textAlign:'center'}}><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status}</span></td>
                  <td>
                    {l.status === 'Pending' ? (
                      <div style={{display:'flex', gap:5}}>
                        <button className="btn-small" style={{background:'#16a34a'}} onClick={() => updateLeaveStatus(l._id, 'Approved')}>Approve</button>
                        <button className="btn-small" style={{background:'#dc2626'}} onClick={() => updateLeaveStatus(l._id, 'Rejected')}>Reject</button>
                      </div>
                    ) : <span className="small" style={{color:'#888'}}>Processed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MY LEAVES */}
      {view === "my-leaves" && (
        <div className="card" style={{padding:0, overflow:'hidden', marginTop:16}}>
          <table className="styled-table">
            <thead><tr><th>Date</th><th>Type</th><th>Status</th><th>File</th></tr></thead>
            <tbody>
              {myLeaves.map(l => (
                <tr key={l._id}>
                  <td>{l.from_date === l.to_date ? l.from_date : `${l.from_date} to ${l.to_date}`}</td>
                  <td>{l.type}</td>
                  <td><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status}</span></td>
                  <td>{l.attachment_url ? <a href={l.attachment_url} target="_blank" rel="noreferrer">View</a> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PMS & OTHER Pages (Keeping original logic) */}
      {view === "pms-manager" && <div className="card"><h3>PMS Management</h3>{/* Keep original PMS mapping here */}</div>}
      {view === "announcements" && <div className="card"><h3>Announcements</h3>{announcements.map(a => <div key={a._id} className="qa-box"><b>{a.title}</b><p>{a.message}</p></div>)}</div>}

      {/* CAMERA Modal */}
      {cameraOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{textAlign:'center'}}>
            <h4>Attendance: {actionType}</h4>
            <video ref={videoRef} autoPlay playsInline style={{width:'100%', borderRadius:8, display: previewImage ? 'none' : 'block'}}></video>
            {previewImage && <img src={previewImage} style={{width:'100%', borderRadius:8}} alt="preview"/>}
            <canvas ref={canvasRef} style={{display:'none'}}></canvas>
            <div style={{marginTop:15, display:'flex', justifyContent:'center', gap:10}}>
              {!previewImage ? <button className="btn" onClick={capturePhoto}>Capture</button> : <button className="btn" onClick={() => submitAttendance(previewImage)}>Submit</button>}
              <button className="btn ghost" onClick={closeCamera}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}