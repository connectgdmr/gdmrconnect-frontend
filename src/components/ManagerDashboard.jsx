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
  FaChartLine,        // Added for PMS
  FaClipboardCheck    // Added for Corrections
} from "react-icons/fa";

export default function ManagerDashboard({ token, api }) {
  const [attendance, setAttendance] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // --- NEW: Manager Approval States ---
  const [pendingPMS, setPendingPMS] = useState([]);
  const [pendingCorrections, setPendingCorrections] = useState([]);

  const [view, setView] = useState("dashboard"); 
  
  // UPDATED: Leave Form State
  const [leaveDuration, setLeaveDuration] = useState("single");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("full");
  const [file, setFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  
  // --- CAMERA STATE (FIXED) ---
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null); // Added for Retake
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // Reference to stop stream properly

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState([]);

  const pendingLeaves = myLeaves.filter(l => l.status === 'Pending');
  const approvedLeaves = myLeaves.filter(l => l.status === 'Approved');
  const rejectedLeaves = myLeaves.filter(l => l.status === 'Rejected');
  
  const MAX_WORDS = 30; 
  const MAX_FILE_SIZE_MB = 5;

  async function load() {
    setLoading(true);
    try {
      const a = await api.myAttendance(token);
      const l = await api.myLeaves(token);
      const t = await api.getManagerEmployees(token); 
      setAttendance(a);
      setMyLeaves(l);
      setTeamMembers(t); 

      // --- FETCH PENDING ACTIONS ---
      // Determine Base URL (fallback to production if not set in api)
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      
      const pmsRes = await fetch(`${baseUrl}/api/manager/pms`, { headers: {'Authorization': `Bearer ${token}`} });
      if(pmsRes.ok) setPendingPMS(await pmsRes.json());

      const corrRes = await fetch(`${baseUrl}/api/manager/corrections`, { headers: {'Authorization': `Bearer ${token}`} });
      if(corrRes.ok) setPendingCorrections(await corrRes.json());

    } catch (err) {
      console.error("Error loading data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // --- FIXED CAMERA LOGIC ---
  async function openCamera(type) {
    setActionType(type);
    setCameraOpen(true);
    setPreviewImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream; // Store stream to stop it later
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
    
    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Show preview instead of auto-submitting
    const imageData = canvas.toDataURL("image/jpeg");
    setPreviewImage(imageData);
  }

  async function submitAttendance(imageData) {
    try {
      if (actionType === "checkin") {
        await api.checkinWithPhoto(token, imageData);
      } else {
        await api.checkoutWithPhoto(token, imageData);
      }
      alert(`${actionType === "checkin" ? "Checked in" : "Checked out"} successfully!`);
      await load();
      closeCamera();
    } catch (err) {
      alert("Error submitting attendance: " + (err.message || ""));
    }
  }

  function closeCamera() {
    // Stop all tracks to turn off camera light
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setPreviewImage(null);
  }

  // --- MANAGER ACTIONS (APPROVE/REJECT) ---
  async function finalizePMS(id, score) {
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          await fetch(`${baseUrl}/api/manager/finalize-pms`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ id, manager_score: score })
          });
          alert("PMS Finalized");
          load();
      } catch(err) { alert(err.message); }
  }

  async function approveCorrection(id, action) {
      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          await fetch(`${baseUrl}/api/manager/approve-correction`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ id, action })
          });
          alert(`Correction ${action}`);
          load();
      } catch(err) { alert(err.message); }
  }
  
  // UPDATED LEAVE SUBMISSION
  async function applyLeave(e) {
    e.preventDefault();
    try {
      let payload = {
         type, 
         reason,
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
      alert("Error applying leave: " + (err.message || ""));
    }
  }
  
  // Handle Reason Word Count
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
  
  // Handle File Upload with Size Check
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
        const maxSize = MAX_FILE_SIZE_MB * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            alert(`File is too large. Maximum size allowed is ${MAX_FILE_SIZE_MB}MB.`);
            e.target.value = null; // Clear input
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

  const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");

  const QuickLaunchItem = ({ icon, label, onClick, color = "var(--red)" }) => (
    <div className="quick-launch-item" onClick={onClick}>
      <div className="quick-launch-icon" style={{ color: color }}>{icon}</div>
      <div className="quick-launch-label">{label}</div>
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
                <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Position</th></tr></thead>
                <tbody>
                    {teamMembers.length === 0 ? (
                        <tr><td colSpan="4" style={{textAlign:"center", padding:20, color:"#999"}}>No employees assigned.</td></tr>
                    ) : (
                        teamMembers.map((m) => (
                            <tr key={m._id}><td style={{fontWeight:500}}>{m.name}</td><td>{m.email}</td><td>{m.department}</td><td>{m.position}</td></tr>
                        ))
                    )}
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
        .modal-card { background: white; width: 450px; max-width: 90%; border-radius: 12px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; max-height: 80vh; }
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; text-transform: capitalize; min-width: 80px; text-align: center; }
        .status-badge.approved { background: #dcfce7; color: #16a34a; }
        .status-badge.rejected { background: #fee2e2; color: #dc2626; }
        .status-badge.pending { background: #fef3c7; color: #d97706; }
        .status-badge.checkin { color: #16a34a; }
        .status-badge.checkout { color: #dc2626; }
        .styled-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .styled-table thead th { background-color: #fff3f3; color: #b91c1c; text-align: left; padding: 12px 15px; font-weight: 600; border-bottom: 2px solid #fee2e2; }
        .styled-table tbody td { padding: 12px 15px; border-bottom: 1px solid #f2f2f2; color: #444; }
        .btn-small { padding: 4px 8px; font-size: 12px; border-radius: 4px; border: none; cursor: pointer; color: white; margin-right: 5px; }
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
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'capitalize' }}>{view.replace("-", " ")}</h3>
        </div>
      )}

      {view === "dashboard" && (
        <div className="dashboard-grid-container">
          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Actions</h4>
            <div className="quick-launch-grid">
              <QuickLaunchItem icon={<FaCamera />} label="Check In" onClick={() => openCamera("checkin")} color="green" />
              <QuickLaunchItem icon={<FaSignOutAlt />} label="Check Out" onClick={() => openCamera("checkout")} color="#b91c1c" />
              <QuickLaunchItem icon={<FaUserCheck />} label="Team Leaves" onClick={() => setView("team-leaves")} color="var(--red)" />
              {/* NEW MANAGER VIEWS */}
              <QuickLaunchItem icon={<FaChartLine />} label="Team PMS" onClick={() => setView("pms-reviews")} color="#6366f1" />
              <QuickLaunchItem icon={<FaClipboardCheck />} label="Corrections" onClick={() => setView("corrections")} color="#f59e0b" />
              
              <QuickLaunchItem icon={<FaUsers />} label="Team Members" onClick={() => setView("team-members")} color="var(--red)" />
              <QuickLaunchItem icon={<FaCalendarPlus />} label="Apply Leave" onClick={() => setView("apply-leave")} />
              <QuickLaunchItem icon={<FaCalendarCheck />} label="My Leaves" onClick={() => setView("my-leaves")} />
              <QuickLaunchItem icon={<FaHistory />} label="My Logs" onClick={() => setView("attendance-log")} />
              <QuickLaunchItem icon={<FaCalendarAlt />} label="Holidays" onClick={() => setView("holidays")} />
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

      {/* --- NEW: PMS REVIEWS VIEW --- */}
      {view === "pms-reviews" && (
          <div className="card">
              <h3>Pending PMS Reviews</h3>
              <div style={{overflowX:'auto'}}>
                <table className="styled-table">
                    <thead><tr><th>Employee</th><th>Month</th><th>Scores</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingPMS.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:20, color:'#999'}}>No pending reviews</td></tr>}
                        {pendingPMS.filter(p => p.status === 'Submitted_by_Employee').map(p => (
                            <tr key={p._id}>
                                <td>{p.employee_name}</td>
                                <td>{p.month}</td>
                                <td>
                                    {/* Display scores nicely if object, else raw */}
                                    <div style={{fontSize:12}}>
                                        {typeof p.self_evaluation === 'object' ? 
                                            Object.entries(p.self_evaluation).map(([k,v]) => <div key={k}><b>{k}:</b> {v}</div>) 
                                            : JSON.stringify(p.self_evaluation)}
                                    </div>
                                </td>
                                <td>
                                    <button className="btn-small" style={{background:'green'}} onClick={() => finalizePMS(p._id, 10)}>Approve</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* --- NEW: CORRECTIONS VIEW --- */}
      {view === "corrections" && (
          <div className="card">
              <h3>Pending Attendance Corrections</h3>
              <div style={{overflowX:'auto'}}>
                <table className="styled-table">
                    <thead><tr><th>Employee</th><th>New Time</th><th>Reason</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingCorrections.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:20, color:'#999'}}>No pending corrections</td></tr>}
                        {pendingCorrections.filter(c => c.status === 'Pending').map(c => (
                            <tr key={c._id}>
                                <td>{c.employee_name}</td>
                                <td>{new Date(c.new_time).toLocaleString()}</td>
                                <td>{c.reason}</td>
                                <td>
                                    <button className="btn-small" style={{background:'green'}} onClick={() => approveCorrection(c._id, 'Approved')}>Approve</button>
                                    <button className="btn-small" style={{background:'red'}} onClick={() => approveCorrection(c._id, 'Rejected')}>Reject</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {view === "team-leaves" && <div style={{ marginTop: 16 }}><AdminLeavePage token={token} api={api} /></div>}
      {view === "team-members" && <TeamMembersList />}
      
      {/* --- APPLY LEAVE (UPDATED) --- */}
      {view === "apply-leave" && (
        <div className="card" style={{ marginTop: 16 }}>
          <form onSubmit={applyLeave}>
            
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
                <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    onChange={handleFileChange} 
                    style={{display: "none"}} 
                />
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
                {myLeaves.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign:"center", padding:20, color:"#999"}}>No leaves found.</td></tr>
                ) : (
                  myLeaves.map((l) => (
                    <tr key={l._id}>
                      <td style={{fontWeight:500}}>{l.from_date && l.to_date && l.from_date !== l.to_date ? `${l.from_date} to ${l.to_date}` : l.date}</td>
                      <td style={{textTransform:"capitalize"}}>{l.type}</td>
                      <td><span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span></td>
                      <td>{l.attachment_url ? <a href={l.attachment_url.startsWith('http') ? l.attachment_url : `https://erp-backend-production-d377.up.railway.app${l.attachment_url}`} target="_blank" rel="noreferrer" style={{color:"var(--red)", fontSize:13}}>View</a> : "-"}</td>
                    </tr>
                  ))
                )}
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
                    <div style={{fontSize:13, color:'#666'}}>"{l.reason}"</div>
                    <span className={`status-badge ${getStatusClass(l.status)}`} style={{marginTop:5}}>{l.status}</span>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- FIXED CAMERA MODAL (RETAKE & BLACK SCREEN FIX) --- */}
      {cameraOpen && (
        <div className="modal-overlay">
          <div className="camera-box">
            <h4 style={{marginBottom: 10, color: '#333'}}>{actionType === 'checkin' ? 'Check In' : 'Check Out'}</h4>
            
            {/* TOGGLE VIDEO/IMAGE VISIBILITY (KEEP STREAM ALIVE) */}
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
          </div>
        </div>
      )}
    </div>
  );
}