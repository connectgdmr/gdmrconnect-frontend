import React, { useEffect, useState, useRef } from "react";
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
  FaTimes,
  FaCloudUploadAlt,
  FaCalendarAlt,
  FaChartLine,
  FaEdit,
  FaBullhorn,
  FaEye // Added for viewing details
} from "react-icons/fa";

export default function EmployeeDashboard({ token, api }) {
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [pmsHistory, setPmsHistory] = useState([]);
  const [correctionHistory, setCorrectionHistory] = useState([]);
  const [announcements, setAnnouncements] = useState([]); 
  
  // --- Dynamic PMS Questions ---
  const [pmsQuestions, setPmsQuestions] = useState([]); 
  const [pmsAnswers, setPmsAnswers] = useState({});

  const [view, setView] = useState("dashboard"); 
  
  // --- Leave Form State ---
  const [leaveDuration, setLeaveDuration] = useState("single"); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("full");
  const [period, setPeriod] = useState("First Half"); 
  const [file, setFile] = useState(null);
  
  // --- Correction State ---
  const [correctionData, setCorrectionData] = useState({ newTime: "", reason: "" });

  const [loading, setLoading] = useState(false);

  // --- Camera State ---
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null); 
  const [submittingPhoto, setSubmittingPhoto] = useState(false); // Loader State
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); 

  // --- Modal State ---
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState([]);
  
  // --- PMS Modal State ---
  const [pmsModalOpen, setPmsModalOpen] = useState(false);
  const [selectedPms, setSelectedPms] = useState(null);

  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const approvedLeaves = leaves.filter(l => l.status === 'Approved');
  const rejectedLeaves = leaves.filter(l => l.status === 'Rejected');
  
  const MAX_WORDS = 30;
  const MAX_FILE_SIZE_MB = 5;

  async function load() {
    setLoading(true);
    try {
      const a = await api.myAttendance(token);
      const l = await api.myLeaves(token);
      setAttendance(a);
      setLeaves(l);

      const baseUrl = api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      
      // Fetch History
      const pmsRes = await fetch(`${baseUrl}/api/my/pms`, { headers: { 'Authorization': `Bearer ${token}` } });
      if(pmsRes.ok) setPmsHistory(await pmsRes.json());

      const corrRes = await fetch(`${baseUrl}/api/my/corrections`, { headers: { 'Authorization': `Bearer ${token}` } });
      if(corrRes.ok) setCorrectionHistory(await corrRes.json());
      
      // Fetch Assigned Questions
      const questionsRes = await fetch(`${baseUrl}/api/employee/pms-assignment`, { headers: { 'Authorization': `Bearer ${token}` } });
      if(questionsRes.ok) {
          const data = await questionsRes.json();
          setPmsQuestions(data.questions || []);
      }

      // Fetch Announcements
      const annRes = await fetch(`${baseUrl}/api/announcements`, { headers: {'Authorization': `Bearer ${token}`} });
      if(annRes.ok) setAnnouncements(await annRes.json());

    } catch (err) {
      console.error("Error loading data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
    setSubmittingPhoto(true); // Start Loader
    try {
      if (actionType === "checkin") {
        await api.checkinWithPhoto(token, imageData);
      } else {
        await api.checkoutWithPhoto(token, imageData);
      }
      
      // Artificial delay for UX (0.5s)
      await new Promise(r => setTimeout(r, 500));

      alert(`${actionType === "checkin" ? "Checked in" : "Checked out"} successfully!`);
      
      setSubmittingPhoto(false); 
      closeCamera();
      await load();
    } catch (err) {
      alert("Error submitting attendance: " + (err.message || ""));
      setSubmittingPhoto(false); // Stop loader to retry
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

  // --- DYNAMIC PMS SUBMISSION ---
  function handleAnswerChange(question, answer) {
      setPmsAnswers(prev => ({ ...prev, [question]: answer }));
  }

  async function submitPMS(e) {
    e.preventDefault();
    try {
        const month = new Date().toISOString().slice(0, 7); 
        const res = await fetch(`${api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app'}/api/pms/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            // UPDATED: Sending "responses" instead of "evaluation" to match backend expectation
            body: JSON.stringify({ month, responses: pmsAnswers })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message);
        
        alert("PMS Submitted Successfully!");
        setView("dashboard");
        load(); 
    } catch(err) { 
        alert("Submission failed: " + err.message); 
    }
  }

  function viewPMS(pmsData) {
      setSelectedPms(pmsData);
      setPmsModalOpen(true);
  }

  // --- ATTENDANCE CORRECTION ---
  async function submitCorrection(e) {
      e.preventDefault();
      try {
        const res = await fetch(`${api.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app'}/api/attendance/request-correction`, {
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

        alert("Correction Request Sent!");
        setView("my-leaves"); // Return to My Leaves
        load(); 
      } catch (err) { 
          alert("Error: " + err.message); 
      }
  }

  // --- APPLY LEAVE ---
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
  
  // Handle File Upload
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
        const maxSize = MAX_FILE_SIZE_MB * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            alert(`File is too large. Maximum size allowed is ${MAX_FILE_SIZE_MB}MB.`);
            e.target.value = null; 
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
    <div 
      className="stat-row clickable-stat" 
      onClick={onClick}
      title="Click to view details"
    >
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-count">{count}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );

  return (
    <div>
      <style>{`
        .modern-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: #fff; color: #333; }
        .modern-label { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px; display: block; }
        .file-upload-label { display: flex; align-items: center; justify-content: center; padding: 20px; border: 2px dashed #ddd; border-radius: 8px; background: #fafafa; color: #666; cursor: pointer; gap: 10px; }
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; text-transform: capitalize; min-width: 80px; text-align: center; }
        .status-badge.approved { background: #dcfce7; color: #16a34a; }
        .status-badge.rejected { background: #fee2e2; color: #dc2626; }
        .status-badge.pending { background: #fef3c7; color: #d97706; }
        .status-badge.checkin { color: #16a34a; }
        .status-badge.checkout { color: #dc2626; }
        .styled-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .styled-table thead th { background-color: #fff3f3; color: #b91c1c; text-align: left; padding: 12px 15px; font-weight: 600; border-bottom: 2px solid #fee2e2; }
        .styled-table tbody td { padding: 12px 15px; border-bottom: 1px solid #f2f2f2; color: #444; }
        .clickable-stat { cursor: pointer; transition: transform 0.2s; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 3000; display: flex; justify-content: center; align-items: center; }
        .modal-card { background: white; width: 450px; max-width: 90%; border-radius: 12px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; max-height: 80vh; }
        
        /* NEW: LOADER STYLE */
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {view === "dashboard" ? (
        <div className="dashboard-header-card card">
          <h2 style={{ color: "var(--red)", margin: 0 }}>My Dashboard</h2>
          <p className="small">Manage your attendance and leaves</p>
        </div>
      ) : (
        <div className="dashboard-header-card card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn ghost" onClick={() => setView("dashboard")} style={{padding: '8px 12px', display:'flex', alignItems:'center', gap:6}}>
            <FaArrowLeft /> Back
          </button>
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'capitalize' }}>
            {view.replace("-", " ")}
          </h3>
        </div>
      )}

      {view === "dashboard" && (
        <div className="dashboard-grid-container">
          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Actions</h4>
            <div className="quick-launch-grid">
              <QuickLaunchItem icon={<FaCamera />} label="Check In" onClick={() => openCamera("checkin")} color="green" />
              <QuickLaunchItem icon={<FaSignOutAlt />} label="Check Out" onClick={() => openCamera("checkout")} color="#b91c1c" />
              <QuickLaunchItem icon={<FaCalendarPlus />} label="Apply Leave" onClick={() => setView("apply-leave")} />
              
              {/* UPDATED: PMS Capitalization */}
              <QuickLaunchItem icon={<FaChartLine />} label="PMS Eval" onClick={() => setView("pms")} color="#6366f1" />
              
              <QuickLaunchItem icon={<FaCalendarCheck />} label="My Leaves" onClick={() => setView("my-leaves")} />
              <QuickLaunchItem icon={<FaHistory />} label="Attendance Log" onClick={() => setView("attendance-log")} />
              <QuickLaunchItem icon={<FaCalendarAlt />} label="Holidays" onClick={() => setView("holidays")} />
              <QuickLaunchItem icon={<FaBullhorn />} label="Announcements" onClick={() => setView("announcements")} />
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

      {/* --- ANNOUNCEMENTS VIEW --- */}
      {view === "announcements" && (
         <div className="card" style={{marginTop: 16}}>
            <h3>Announcements</h3>
            {announcements.length === 0 ? <p style={{color:'#777', padding:20, textAlign:'center'}}>No announcements yet.</p> : announcements.map(a => (
                <div key={a._id} style={{borderBottom:'1px solid #f0f0f0', padding:'15px 0'}}>
                    <h4 style={{margin:'0 0 5px 0', color:'#333'}}>{a.title}</h4>
                    <p style={{margin:'0 0 5px 0', color:'#555', fontSize:'14px'}}>{a.message}</p>
                    <small style={{color:'#999'}}>{new Date(a.created_at).toLocaleString()}</small>
                </div>
            ))}
         </div>
      )}

      {/* --- DYNAMIC PMS VIEW --- */}
      {view === "pms" && (
          <div className="card" style={{marginTop: 16}}>
              {/* UPDATED: Capitalized Title */}
              <h3>Monthly Self-Evaluation (PMS)</h3>
              {pmsQuestions.length === 0 ? (
                  <p style={{color:'#777'}}>No questions assigned by manager for this month.</p>
              ) : (
                  <form onSubmit={submitPMS}>
                      {pmsQuestions.map((q, i) => (
                          <div key={i} style={{marginBottom:15}}>
                              <label className="modern-label">{q}</label>
                              <textarea className="modern-input" style={{minHeight:80}} required 
                                  onChange={e => handleAnswerChange(q, e.target.value)} />
                          </div>
                      ))}
                      <div style={{display:'flex', justifyContent:'flex-end'}}>
                          <button type="submit" className="btn" style={{marginTop:15}}>Submit Evaluation</button>
                      </div>
                  </form>
              )}

              {/* PMS HISTORY TABLE */}
              <h4 style={{marginTop:30, color:'var(--red)'}}>My PMS Evaluation History</h4>
              <div style={{overflowX: 'auto'}}>
                <table className="styled-table">
                    <thead><tr><th>Month</th><th>Status</th><th>Score</th><th>Action</th></tr></thead>
                    <tbody>
                        {pmsHistory.length === 0 && <tr><td colSpan="4">No history found.</td></tr>}
                        {pmsHistory.map(p => (
                            <tr key={p._id}>
                                <td>{p.month}</td>
                                <td><span className={`status-badge ${p.status === 'Approved' ? 'approved' : 'pending'}`}>{p.status}</span></td>
                                <td>{p.manager_score || '-'}</td>
                                {/* Added View Button */}
                                <td>
                                    <button className="btn ghost" style={{padding: "5px 10px", fontSize: "12px"}} onClick={() => viewPMS(p)}>
                                        <FaEye /> View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* --- CORRECTION VIEW --- */}
      {view === "correction" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Request Attendance Correction</h3>
              <p className="small" style={{marginBottom:20}}>You can request corrections up to 3 times per month.</p>
              <form onSubmit={submitCorrection}>
                  <div style={{marginBottom:15}}>
                      <label className="modern-label">Correct Date & Time</label>
                      <input className="modern-input" type="datetime-local" required 
                          onChange={e => setCorrectionData({...correctionData, newTime: e.target.value})} />
                  </div>
                  <div style={{marginBottom:15}}>
                      <label className="modern-label">Reason</label>
                      <input className="modern-input" type="text" required placeholder="e.g. Forgot to punch out due to meeting..." 
                          onChange={e => setCorrectionData({...correctionData, reason: e.target.value})} />
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end'}}>
                      <button type="submit" className="btn" style={{marginTop:15}}>Send Request</button>
                  </div>
              </form>

              {/* CORRECTION HISTORY */}
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

      {/* --- MY LEAVES --- */}
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
           {loading ? <p style={{padding:20}}>Loading...</p> : (
            <table className="styled-table">
              <thead><tr><th>Type</th><th>Date / Time</th><th>Photo</th></tr></thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan="3" style={{textAlign:"center", padding:20, color:"#999"}}>No records.</td></tr>
                ) : (
                  attendance.map((a) => (
                    <tr key={a._id}>
                      <td style={{fontWeight: 600}}><span className={`status-badge ${a.type}`}>{a.type === 'checkin' ? 'Check In' : 'Check Out'}</span></td>
                      <td>{new Date(a.time).toLocaleString()}</td>
                      <td>{a.photo_url ? <a href={a.photo_url.startsWith('http') ? a.photo_url : `https://erp-backend-production-d377.up.railway.app${a.photo_url}`} target="_blank" rel="noreferrer" style={{color:"var(--red)", fontSize:13}}>View</a> : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
           )}
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
      
      {/* --- PMS DETAILS MODAL --- */}
      {pmsModalOpen && selectedPms && (
        <div className="modal-overlay" onClick={() => setPmsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{width: 600}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
              <h3 style={{ margin: 0, color: 'var(--red)' }}>PMS Evaluation Details</h3>
              <button className="btn ghost" onClick={() => setPmsModalOpen(false)}><FaTimes /></button>
            </div>
            <div style={{overflowY:'auto', flex:1, maxHeight: '60vh'}}>
               <p><strong>Month:</strong> {selectedPms.month}</p>
               <p><strong>Manager Score:</strong> {selectedPms.manager_score || 'Pending'}</p>
               <hr style={{margin: '10px 0', border: 0, borderTop: '1px solid #eee'}}/>
               <h4 style={{marginBottom: 10}}>Q&A</h4>
               {selectedPms.responses ? (
                   Object.entries(selectedPms.responses).map(([q, a], idx) => (
                       <div key={idx} style={{marginBottom: 15, background: '#f9f9f9', padding: 10, borderRadius: 6}}>
                           <div style={{fontWeight: 600, marginBottom: 5, color: '#444'}}>Q: {q}</div>
                           <div style={{color: '#666'}}>A: {a}</div>
                       </div>
                   ))
               ) : (
                   <p>No details available.</p>
               )}
            </div>
          </div>
        </div>
      )}

      {/* --- CAMERA MODAL --- */}
      {cameraOpen && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
          <div className="camera-box" style={{background:'#fff', padding:20, borderRadius:8, width:400, maxWidth:'90%', textAlign:'center'}}>
            
            {submittingPhoto ? (
                <div style={{ padding: "40px 20px" }}>
                    <div className="loader"></div>
                    <p style={{ marginTop: 15, fontWeight: 500, color: "#555" }}>
                        Submitting attendance...
                    </p>
                    <p style={{ fontSize: "12px", color: "#888" }}>Please wait</p>
                </div>
            ) : (
                <>
                    <h4 style={{marginBottom: 10, color: '#333'}}>{actionType === 'checkin' ? 'Check In' : 'Check Out'}</h4>
                    
                    {/* TOGGLE VISIBILITY */}
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
  );
}