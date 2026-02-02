import React, { useEffect, useState, useRef } from "react";
import AdminLeavePage from "./AdminLeavePage"; 
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
  FaExclamationTriangle
} from "react-icons/fa";

export default function ManagerDashboard({ token, api }) {
  // --- Data States ---
  const [attendance, setAttendance] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]); 
  
  // --- Notifications & Announcements ---
  const [notificationCounts, setNotificationCounts] = useState({ leaves: 0, pms: 0, corrections: 0 ,announcements: 0});
  const [announcements, setAnnouncements] = useState([]);

  // --- Manager Approval States ---
  const [pendingPMS, setPendingPMS] = useState([]);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  
  // --- Dynamic PMS States (Assignment) ---
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [pmsQuestions, setPmsQuestions] = useState([""]); 
  
  // --- PMS Review & Grading State ---
  const [reviewScore, setReviewScore] = useState({}); 
  const [viewPMSModalOpen, setViewPMSModalOpen] = useState(false);
  const [selectedPMS, setSelectedPMS] = useState(null);

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
  async function load() {
    setLoading(true);
    try {
      const a = await api.myAttendance(token);
      const l = await api.myLeaves(token);
      setAttendance(a);
      setMyLeaves(l);

      const t = await api.getManagerEmployees(token); 
      setTeamMembers(t); 

      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      
      const pmsRes = await fetch(`${baseUrl}/api/manager/pms`, { headers: {'Authorization': `Bearer ${token}`} });
      if(pmsRes.ok) setPendingPMS(await pmsRes.json());

      const corrRes = await fetch(`${baseUrl}/api/manager/corrections`, { headers: {'Authorization': `Bearer ${token}`} });
      if(corrRes.ok) setPendingCorrections(await corrRes.json());
      
      const leavesRes = await fetch(`${baseUrl}/api/admin/leaves`, { headers: {'Authorization': `Bearer ${token}`} });
      if(leavesRes.ok) setTeamLeaves(await leavesRes.json());

      const notifRes = await fetch(`${baseUrl}/api/notifications/counts`, { headers: {'Authorization': `Bearer ${token}`} });
      if(notifRes.ok) setNotificationCounts(await notifRes.json());

      const annRes = await fetch(`${baseUrl}/api/announcements`, { headers: {'Authorization': `Bearer ${token}`} });
      if(annRes.ok) setAnnouncements(await annRes.json());

    } catch (err) { 
      console.error("Error loading data", err); 
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { load(); }, []);

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
      await load();
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

  // --- PMS LOGIC ---
  function handleAddQuestion() { setPmsQuestions([...pmsQuestions, ""]); }
  
  function handleQuestionChange(index, value) {
      const newQs = [...pmsQuestions];
      newQs[index] = value;
      setPmsQuestions(newQs);
  }

  async function assignPMS(e) {
      e.preventDefault();
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          const month = new Date().toISOString().slice(0, 7);
          const res = await fetch(`${baseUrl}/api/manager/assign-pms`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ employee_id: selectedEmployee, questions: pmsQuestions.filter(q => q.trim() !== ""), month })
          });
          if(res.ok) {
              alert("PMS Questions Assigned Successfully");
              setPmsQuestions([""]); setSelectedEmployee("");
          }
      } catch(err) { alert("Error assigning PMS"); }
  }

  async function finalizePMS(id) {
      const score = reviewScore[id];
      if(!score) return alert("Please enter a score first");
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          await fetch(`${baseUrl}/api/manager/finalize-pms`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ id, manager_score: score })
          });
          alert("PMS Review Finalized"); 
          setViewPMSModalOpen(false); 
          load();
      } catch(err) { alert(err.message); }
  }

  function handleViewPMS(pms) {
      setSelectedPMS(pms);
      if(pms.manager_score) {
          setReviewScore(prev => ({...prev, [pms._id]: pms.manager_score}));
      }
      setViewPMSModalOpen(true);
  }

  // --- CORRECTION LOGIC ---
  async function approveCorrection(id, action) {
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          await fetch(`${baseUrl}/api/manager/approve-correction`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ id, action })
          });
          alert(`Correction Request ${action}`); 
          load();
      } catch(err) { alert(err.message); }
  }
  
  // --- LEAVE STATUS UPDATE LOGIC ---
  async function updateLeaveStatus(id, status) {
       const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
       try {
          await fetch(`${baseUrl}/api/admin/leaves/${id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ status })
          });
          alert("Leave Status Updated"); 
          load();
       } catch(err) { alert(err.message); }
  }

  // --- APPLY LEAVE (MANAGER PERSONAL) ---
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
      setStartDate(""); setEndDate(""); setReason(""); setFile(null);
      await load(); 
      alert("Leave Applied Successfully!"); 
      setView("my-leaves"); 
    } catch (err) { alert(err.message); }
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
        .modal-card { background: white; width: 500px; max-width: 90%; border-radius: 12px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; max-height: 85vh; }
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; text-transform: capitalize; min-width: 80px; text-align: center; }
        .status-badge.approved { background: #dcfce7; color: #16a34a; }
        .status-badge.rejected { background: #fee2e2; color: #dc2626; }
        .status-badge.pending { background: #fef3c7; color: #d97706; }
        .styled-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .styled-table th, .styled-table td { padding: 12px 15px; border-bottom: 1px solid #f2f2f2; }
        .styled-table th { background-color: #f8f9fa; color: #b91c1c; font-weight:600; text-align:left; }
        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn-small { padding: 5px 10px; font-size: 12px; border-radius: 4px; border: none; cursor: pointer; color: white; margin-right: 5px; display:inline-flex; align-items:center; gap:5px; }
        .icon-badge { position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 10px; font-weight: bold; }
        .qa-box { margin-bottom: 15px; background: #f9f9f9; padding: 12px; border-radius: 8px; border-left: 4px solid var(--red); }
      `}</style>

      {view === "dashboard" ? (
        <div className="dashboard-header-card card">
          <h2 style={{ color: "var(--red)", margin: 0 }}>Manager Dashboard</h2>
          <p className="small">Manage your team and your own attendance</p>
        </div>
      ) : (
        <div className="dashboard-header-card card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn ghost" onClick={() => setView("dashboard")} style={{padding: '8px 12px', display:'flex', alignItems:'center', gap:6}}>
            <FaArrowLeft /> Back
          </button>
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'uppercase' }}>{view.replace("-", " ")}</h3>
        </div>
      )}

      {view === "dashboard" && (
        <div className="dashboard-grid-container">
          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Actions</h4>
            <div className="quick-launch-grid">
              <QuickLaunchItem icon={<FaCamera />} label="Check In" onClick={() => openCamera("checkin")} color="green" />
              <QuickLaunchItem icon={<FaSignOutAlt />} label="Check Out" onClick={() => openCamera("checkout")} color="#b91c1c" />
              <QuickLaunchItem icon={<FaUserCheck />} label="Team Leaves" onClick={() => setView("team-leaves")} color="var(--red)" badgeCount={notificationCounts.leaves} />
              <QuickLaunchItem icon={<FaChartLine />} label="PMS Management" onClick={() => setView("pms-manager")} color="#6366f1" badgeCount={notificationCounts.pms} />
              <QuickLaunchItem icon={<FaClipboardCheck />} label="Corrections" onClick={() => setView("corrections")} color="#f59e0b" badgeCount={notificationCounts.corrections} />
              <QuickLaunchItem icon={<FaUsers />} label="Team Members" onClick={() => setView("team-members")} color="var(--red)" />
              <QuickLaunchItem icon={<FaCalendarPlus />} label="Apply Leave" onClick={() => setView("apply-leave")} />
              <QuickLaunchItem icon={<FaCalendarCheck />} label="My Leaves" onClick={() => setView("my-leaves")} />
              <QuickLaunchItem icon={<FaBullhorn />} label="Announcements" onClick={() => setView("announcements")} color="var(--red)" badgeCount={notificationCounts.announcements} />
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

      {view === "announcements" && (
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

      {view === "pms-manager" && (
          <div className="card">
              <h3>Performance Management System (PMS)</h3>
              <div style={{marginBottom: 30, borderBottom:'1px solid #eee', paddingBottom: 20, background:'#f8f9fa', padding:15, borderRadius:8}}>
                  <h4 style={{marginTop:0, color:'#b91c1c'}}>1. Assign Monthly Questions</h4>
                  <form onSubmit={assignPMS} style={{marginTop:15}}>
                      <select className="modern-input" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} required>
                          <option value="">Select Employee</option>
                          {teamMembers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </select>
                      <div style={{marginTop:10}}>
                        {pmsQuestions.map((q, i) => (
                            <input key={i} className="modern-input" style={{marginTop:10}} placeholder={`Question ${i+1}`} value={q} onChange={e => handleQuestionChange(i, e.target.value)} required />
                        ))}
                      </div>
                      <div style={{marginTop:15, display:'flex', gap:10}}>
                        <button type="button" className="btn ghost" onClick={handleAddQuestion}>+ Add Another Question</button>
                        <button type="submit" className="btn">Assign Questions</button>
                      </div>
                  </form>
              </div>
              <h4 style={{color:'#555'}}>2. Pending PMS Reviews</h4>
              <div style={{overflowX:'auto', marginBottom:30}}>
                <table className="styled-table">
                    <thead><tr><th>Employee</th><th>Month</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingPMS.length === 0 && <tr><td colSpan="3" style={{textAlign:'center', padding:20, color:'#999'}}>No pending reviews found.</td></tr>}
                        {pendingPMS.filter(p => p.status === 'Submitted_by_Employee').map(p => (
                            <tr key={p._id}>
                                <td>{p.employee_name}</td>
                                <td>{p.month}</td>
                                <td>
                                    <button className="btn-small" style={{background:'#6366f1'}} onClick={() => handleViewPMS(p)}>
                                        <FaEye /> View & Review
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
              <h4 style={{color:'#555'}}>3. Completed PMS History</h4>
              <div style={{overflowX:'auto'}}>
                <table className="styled-table">
                    <thead><tr><th>Employee</th><th>Month</th><th>Score</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingPMS.filter(p => p.status === 'Approved').map(p => (
                            <tr key={p._id}>
                                <td>{p.employee_name}</td>
                                <td>{p.month}</td>
                                <td>{p.manager_score}/10</td>
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

      {view === "corrections" && (
          <div className="card">
              <h3>Pending Attendance Corrections</h3>
              <div style={{overflowX:'auto'}}>
                <table className="styled-table">
                    <thead><tr><th>Employee</th><th>New Time</th><th>Reason</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingCorrections.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:20, color:'#999'}}>No pending corrections found.</td></tr>}
                        {pendingCorrections.map(c => (
                            <tr key={c._id}>
                                <td>{c.employee_name}</td>
                                <td>{new Date(c.new_time).toLocaleString()}</td>
                                <td>{c.reason}</td>
                                <td>
                                    <button className="btn-small" style={{background:'green'}} onClick={() => approveCorrection(c._id, 'Approved')}><FaCheckCircle /> Approve</button>
                                    <button className="btn-small" style={{background:'#b91c1c'}} onClick={() => approveCorrection(c._id, 'Rejected')}><FaTimesCircle /> Reject</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* --- UPDATED TEAM LEAVES VIEW (MATCHING ADMIN STYLE) --- */}
      {view === "team-leaves" && (
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
                                    <span className={`status-badge ${getStatusClass(l.status)}`}>{l.status}</span>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(l.hr_status || 'Pending')}`}>{l.hr_status || 'Pending'}</span>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(l.status)}`}>{l.status}</span>
                                </td>
                                <td>
                                    {l.status === 'Pending' ? (
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

      {view === "team-members" && <TeamMembersList />}
      
      {view === "apply-leave" && (
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

      {view === "my-leaves" && (
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

      {view === "attendance-log" && (
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

      {viewPMSModalOpen && selectedPMS && (
        <div className="modal-overlay" onClick={() => setViewPMSModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:15, borderBottom:'1px solid #eee', paddingBottom:10}}>
              <h3 style={{ margin: 0, color: 'var(--red)' }}>PMS Review Details</h3>
              <button className="btn ghost" onClick={() => setViewPMSModalOpen(false)}><FaTimes /></button>
            </div>
            <div style={{overflowY:'auto', flex:1, paddingRight:5}}>
                <div style={{background:'#fdf2f2', padding:10, borderRadius:6, marginBottom:20, display:'flex', flexDirection:'column', gap:5}}>
                    <div><b>Employee:</b> {selectedPMS.employee_name}</div>
                    <div><b>Month:</b> {selectedPMS.month}</div>
                    <div><b>Status:</b> <span className={`status-badge ${selectedPMS.status === 'Approved' ? 'approved' : 'pending'}`}>{selectedPMS.status}</span></div>
                </div>
                <h4 style={{marginBottom:15, color:'#333'}}>Employee Responses:</h4>
                {(!selectedPMS.responses || Object.keys(selectedPMS.responses).length === 0) ? (
                    <p style={{fontStyle:'italic', color:'#999'}}>No responses found.</p>
                ) : (
                    Object.entries(selectedPMS.responses).map(([q,a], idx) => (
                        <div key={idx} className="qa-box">
                            <div style={{fontWeight:600, marginBottom:6, color:'#444'}}>Q: {q}</div>
                            <div style={{color:'#666', fontSize:'15px'}}>{a}</div>
                        </div>
                    ))
                )}
                {selectedPMS.status === 'Submitted_by_Employee' && (
                    <div style={{marginTop:30, borderTop:'1px solid #eee', paddingTop:20}}>
                        <h4 style={{marginBottom:10}}>Manager Evaluation</h4>
                        <label className="modern-label">Enter Final Score (1-10)</label>
                        <input 
                            type="number" 
                            min="1" max="10"
                            className="modern-input" 
                            placeholder="e.g. 8"
                            value={reviewScore[selectedPMS._id] || ''}
                            onChange={e => setReviewScore({...reviewScore, [selectedPMS._id]: e.target.value})}
                        />
                        <button 
                            className="btn" 
                            style={{marginTop:15, width:'100%', fontSize:'15px'}} 
                            onClick={() => finalizePMS(selectedPMS._id)}
                        >
                            Submit Score & Finalize Review
                        </button>
                    </div>
                )}
                {selectedPMS.status === 'Approved' && (
                    <div style={{marginTop:20, textAlign:'center', padding:15, background:'#dcfce7', borderRadius:8}}>
                        <div style={{fontSize:18, fontWeight:'bold', color:'#16a34a'}}>Final Score: {selectedPMS.manager_score} / 10</div>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {cameraOpen && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
          <div className="camera-box" style={{background:'#fff', padding:20, borderRadius:8, width:400, maxWidth:'90%', textAlign:'center'}}>
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
                            <><button className="btn" onClick={capturePhoto}>Capture</button><button className="btn ghost" onClick={closeCamera}>Cancel</button></>
                        ) : (
                            <><button className="btn" onClick={() => submitAttendance(previewImage)}>Submit</button><button className="btn ghost" onClick={() => setPreviewImage(null)}>Retake</button></>
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