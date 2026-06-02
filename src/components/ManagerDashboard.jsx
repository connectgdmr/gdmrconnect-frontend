import React, { useEffect, useState, useRef, useCallback } from "react";
import Sidebar from "./Sidebar";
import AnnouncementNotifications from "./AnnouncementNotifications";
import EmployeeLMS from "./EmployeeLMS";
import EmployeeCareer from "./EmployeeCareer";
import ErrorBoundary from "./ErrorBoundary";
import AdminLeavePage from "./AdminLeavePage";
import AdminAttendancePage from "./AdminAttendancePage";
import HolidayCalendar from "./HolidayCalendar";
import { RATING_SCALE, OVERALL_RATINGS, getRatingInfo } from "../constants";
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
  FaUserShield, 
  FaClipboardList,
  FaCheckSquare,
  FaRegSquare,
  FaClock,
  FaFileDownload,
  FaLaptop,
  FaBars,
  FaGift
} from "react-icons/fa";
import ProfilePanel from "./ProfilePanel";

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
    <div className="stat-row clickable-stat" onClick={onClick}>
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-count">{count}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function ManagerDashboard({ token, api, user, onLogout, passwordChanged = true }) {
  
  // ============================================================================
  // 1. CORE DATA STATES
  // ============================================================================
  
  /** 
   * Stores the attendance records for the current user 
   */
  const [attendance, setAttendance] = useState([]);
  
  /** 
   * Stores the leave requests submitted by the current user 
   */
  const [myLeaves, setMyLeaves] = useState([]);
  
  /** 
   * Stores the profile details of employees assigned to this manager 
   */
  const [teamMembers, setTeamMembers] = useState([]);
  
  /** 
   * Stores the leave requests submitted by the team members 
   */
  const [teamLeaves, setTeamLeaves] = useState([]); 
  
  /** 
   * NEW: Stores hardware/equipment requests submitted by the team 
   */
  const [teamAssets, setTeamAssets] = useState([]);

  /** 
   * Stores dynamic badge counts for dashboard quick launch icons 
   */
  const [notificationCounts, setNotificationCounts] = useState({ 
      leaves: 0, 
      pms: 0, 
      corrections: 0, 
      announcements: 0,
      assets: 0 
  });
  
  /** 
   * Stores active system-wide announcements 
   */
  const [announcements, setAnnouncements] = useState([]);

  /** 
   * Stores pending Performance Management System evaluations 
   */
  const [pendingPMS, setPendingPMS] = useState([]);
  
  /** 
   * Stores pending attendance time-correction requests 
   */
  const [pendingCorrections, setPendingCorrections] = useState([]);

  // ============================================================================
  // 2. PASSWORD MANAGEMENT STATES
  // ============================================================================
  
  /** 
   * Manages the visibility of the mandatory password change modal 
   */
  const [showPasswordModal, setShowPasswordModal] = useState(!passwordChanged);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");

  // Visibility toggles for the 3 password fields to show/hide plaintext
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  // ============================================================================
  // 3. DYNAMIC PMS TEMPLATE BUILDER & REVIEW STATES
  // ============================================================================
  
  /** 
   * Holds the structure of the dynamic evaluation form being built 
   */
  const [templateSessions, setTemplateSessions] = useState([]);
  
  /** 
   * Explicit state to track assigned employees to prevent blanketing the whole org 
   */
  const [assignedEmployees, setAssignedEmployees] = useState([]); 
  
  /** 
   * Holds the manager's assigned scores during an evaluation review 
   */
  const [managerScores, setManagerScores] = useState({});
  const [managerFeedback, setManagerFeedback] = useState("");
  const [viewPMSModalOpen, setViewPMSModalOpen] = useState(false);
  const [selectedPMS, setSelectedPMS] = useState(null);
  const [cycleName, setCycleName] = useState("");
  const [cycleDueDate, setCycleDueDate] = useState("");
  const [overallRating, setOverallRating] = useState("");
  const [developmentPlan, setDevelopmentPlan] = useState("");
  const [managerQuestionComments, setManagerQuestionComments] = useState({});
  const [calibrationData, setCalibrationData] = useState([]);
  const [calibrationMonth, setCalibrationMonth] = useState(new Date().toISOString().slice(0, 7));

  // ============================================================================
  // 4. DELEGATED ADMIN & DASHBOARD STATES
  // ============================================================================
  
  /** 
   * Stores temporary access permissions granted by the master admin 
   */
  const [delegatedGrants, setDelegatedGrants] = useState([]);
  
  /** 
   * Stores aggregated performance metrics for the department 
   */
  const [deptDashboard, setDeptDashboard] = useState([]);
  const [dashboardMonth, setDashboardMonth] = useState(new Date().toISOString().slice(0, 7));

  /** 
   * Primary routing state for conditional rendering of sub-views 
   */
  const [view, setView] = useState("dashboard");
  const [loadError, setLoadError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [birthdayDismissed, setBirthdayDismissed] = useState(false);

  // Leave Form State Variables
  const [leaveDuration, setLeaveDuration] = useState("single");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("full");
  const [period, setPeriod] = useState("First Half"); 
  const [file, setFile] = useState(null);
  
  // Modal display states
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState([]);
  
  // ============================================================================
  // 5. CAMERA & HARDWARE STATES
  // ============================================================================
  
  /** 
   * Hardware interaction states for photo-verified check-ins 
   */
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false); 
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); 

  // ============================================================================
  // 6. DERIVED STATES & CONSTANTS
  // ============================================================================
  const pendingLeaves = myLeaves.filter(l => l.status === 'Pending');
  const approvedLeaves = myLeaves.filter(l => l.status === 'Approved');
  const rejectedLeaves = myLeaves.filter(l => l.status === 'Rejected');
  
  const MAX_WORDS = 30; 
  const MAX_FILE_SIZE_MB = 5;

  // ============================================================================
  // INITIAL DATA LOADING FUNCTION
  // ============================================================================
  
  /**
   * Main data loading function. Fetches all required information for the 
   * manager dashboard in parallel to optimize rendering times.
   */
  const load = useCallback(async (isAction = false) => {
    if (!isAction) setLoadError(false);

    const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // Parallelize all fetch requests to significantly speed up dashboard load times
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
        fetch(`${baseUrl}/api/my/delegated-access`, { headers }).then(r => r.json()),
        fetch(`${baseUrl}/api/manager/assets`, { headers }).then(r => r.json()) 
      ]);

      // Map results to state safely avoiding any undefined crashes
      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) {
          setAttendance(results[0].value);
      }
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
          setMyLeaves(results[1].value);
      }
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) {
          setTeamMembers(results[2].value);
      }
      if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) {
          setPendingPMS(results[3].value);
      }
      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value)) {
          setPendingCorrections(results[4].value);
      }
      if (results[5].status === 'fulfilled' && Array.isArray(results[5].value)) {
          setTeamLeaves(results[5].value);
      }
      if (results[6].status === 'fulfilled' && results[6].value) {
          setNotificationCounts(results[6].value);
      }
      
      // Map Announcements & Sort Newest First
      if (results[7].status === 'fulfilled' && Array.isArray(results[7].value)) {
          const sortedAnns = results[7].value.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setAnnouncements(sortedAnns);
      }
      
      // Map PMS Template builder
      if (results[8].status === 'fulfilled' && results[8].value) {
          if (templateSessions.length === 0 && results[8].value.sessions) {
              // Intentionally blank to allow fresh builds, but data is ready
          }
      }
      
      // Map Dept Dashboard
      if (results[9].status === 'fulfilled' && Array.isArray(results[9].value)) {
          setDeptDashboard(results[9].value);
      }
      
      // Map Delegated Admin Grants
      if (results[10].status === 'fulfilled' && Array.isArray(results[10].value)) {
          setDelegatedGrants(results[10].value);
      }

      // Map Team Asset Requests
      if (results[11].status === 'fulfilled' && Array.isArray(results[11].value)) {
          setTeamAssets(results[11].value);
      }

    } catch (err) {
      // silent fail
      if (!isAction) setLoadError(true);
    }
  }, [token, dashboardMonth, api]);

  // Trigger load on component mount
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

  useEffect(() => {
    if (view === "pms-calibration") fetchCalibration(calibrationMonth);
  }, [view, calibrationMonth]);

  useEffect(() => {
    const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
    fetch(`${baseUrl}/api/notifications/birthdays`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setTodayBirthdays(data); })
      .catch(() => {});
  }, [token, api]);

  // ============================================================================
  // PASSWORD MANAGEMENT
  // ============================================================================
  
  /**
   * Handles the submission of the password change form.
   * Validates matching inputs and enforces strong password regex requirements.
   */
  async function handleSetPassword(e) {
      e.preventDefault();
      setPassError("");

      if (newPassword !== confirmPassword) {
          setPassError("New Password and Confirm Password do not match.");
          return;
      }

      // Requirement: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
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
          if(!res.ok) {
              throw new Error(data.message);
          }
          
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
  // CAMERA & ATTENDANCE LOGIC
  // ============================================================================
  
  /**
   * Requests permission to open the user's webcam device.
   * Renders the video feed inline inside the application modal.
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
   * Captures the current frame from the webcam feed and 
   * converts it to a Base64 string for preview/upload.
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
   * Submits the Base64 image payload to the backend API for
   * Cloudinary storage and database logging.
   */
  async function submitAttendance(imageData) {
    setSubmittingPhoto(true); 
    try {
      if (actionType === "checkin") {
          await api.checkinWithPhoto(token, imageData);
      } else {
          await api.checkoutWithPhoto(token, imageData);
      }
      
      setSubmittingPhoto(false); 
      closeCamera(); 
      alert(`${actionType === "checkin" ? "Checked in" : "Checked out"} successfully!`);
      
      await load(true);
    } catch (err) {
      alert("Error submitting attendance: " + (err.message || ""));
      setSubmittingPhoto(false); 
    }
  }

  /**
   * Terminates the webcam media tracks and destroys the stream context
   * to ensure the camera light turns off.
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
  // PMS TEMPLATE BUILDER LOGIC
  // ============================================================================
  
  /** Adds a new blank session block to the PMS evaluation template */
  const handleAddSession = () => {
      setTemplateSessions([...templateSessions, { name: "", weight: 20, questions: [{ text: "", type: "scale" }] }]);
  };
  
  /** Removes an entire session block from the PMS template */
  const handleRemoveSession = (sIdx) => {
      setTemplateSessions(templateSessions.filter((_, i) => i !== sIdx));
  };
  
  /** Updates the name of a specific session in the template */
  const handleSessionNameChange = (sIdx, name) => {
      const newS = [...templateSessions];
      newS[sIdx].name = name;
      setTemplateSessions(newS);
  };

  /** Updates the weight percentage of a specific session in the template */
  const handleSessionWeightChange = (sIdx, weight) => {
      const newS = [...templateSessions];
      newS[sIdx].weight = parseInt(weight) || 0;
      setTemplateSessions(newS);
  };

  /** Adds a new question field inside a specific session block */
  const handleAddQuestion = (sIdx) => {
      const newS = [...templateSessions];
      newS[sIdx].questions.push({ text: "", type: "scale" });
      setTemplateSessions(newS);
  };
  
  /** Removes a specific question from a session block */
  const handleRemoveQuestion = (sIdx, qIdx) => {
      const newS = [...templateSessions];
      newS[sIdx].questions = newS[sIdx].questions.filter((_, i) => i !== qIdx);
      setTemplateSessions(newS);
  };
  
  /** Updates the text or response type of a specific question */
  const handleQuestionChange = (sIdx, qIdx, field, val) => {
      const newS = [...templateSessions];
      newS[sIdx].questions[qIdx][field] = val;
      setTemplateSessions(newS);
  };

  /**
   * Handles toggling specific employees when assigning a PMS evaluation.
   */
  const toggleEmployeeAssignment = (empId) => {
      if (assignedEmployees.includes(empId)) {
          setAssignedEmployees(assignedEmployees.filter(id => id !== empId));
      } else {
          setAssignedEmployees([...assignedEmployees, empId]);
      }
  };

  /** Selects all available team members for PMS assignment */
  const selectAllEmployees = () => {
      setAssignedEmployees(teamMembers.map(emp => emp._id));
  };

  /** Deselects all team members from the current PMS assignment list */
  const clearAllEmployees = () => {
      setAssignedEmployees([]);
  };

  /**
   * Compiles the nested arrays of the PMS builder and pushes it 
   * to the backend targeting the explicit array of assigned employees.
   */
  async function savePmsTemplate(e) {
      e.preventDefault();
      
      if (assignedEmployees.length === 0) {
          alert("Action Required: Please select at least one employee to assign this evaluation form to.");
          return;
      }
      
      if (templateSessions.length === 0) {
          alert("Action Required: Please create at least one session with questions.");
          return;
      }

      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      
      try {
          const res = await fetch(`${baseUrl}/api/admin/pms-template`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({
                  sessions: templateSessions,
                  assigned_to: assignedEmployees,
                  cycle_name: cycleName,
                  due_date: cycleDueDate
              })
          });
          
          if(res.ok) {
              alert("Success! PMS Evaluation Form has been assigned and saved.");
              setTemplateSessions([]);
              setAssignedEmployees([]);
              setCycleName("");
              setCycleDueDate("");
              setView("dashboard");
          } else {
              const errData = await res.json();
              alert(`Failed to save template: ${errData.message || 'Unknown error'}`);
          }
          await load(true);
      } catch(err) { 
          alert("Network Error saving PMS Template"); 
      }
  }

  // ============================================================================
  // PMS REVIEW & GRADING LOGIC
  // ============================================================================
  
  /**
   * Opens the PMS Evaluation modal and loads the selected employee's data.
   */
  function handleViewPMS(pms) {
      setSelectedPMS(pms);
      setManagerFeedback(pms.manager_feedback || "");
      setOverallRating(pms.overall_rating || "");
      setDevelopmentPlan(pms.development_plan || "");
      const scores = {};
      const comments = {};
      if (pms.manager_scores) {
          pms.manager_scores.forEach(m => { scores[m.question] = m.score; });
      }
      if (pms.manager_comments) {
          pms.manager_comments.forEach(m => { comments[m.question] = m.comment; });
      }
      setManagerScores(scores);
      setManagerQuestionComments(comments);
      setViewPMSModalOpen(true);
  }

  /**
   * Finalizes the PMS review by permanently locking the document
   * and appending the manager's scores and summary text.
   */
  async function finalizePMS(id) {
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      const scoresArr = Object.keys(managerScores).map(q => ({
          question: q,
          score: managerScores[q]
      }));

      if (!managerFeedback.trim()) {
          alert("Please provide overall remarks and feedback before finalizing.");
          return;
      }

      try {
          const res = await fetch(`${baseUrl}/api/manager/finalize-pms`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({
                  review_id: id,
                  manager_scores: scoresArr,
                  manager_feedback: managerFeedback,
                  overall_rating: overallRating,
                  development_plan: developmentPlan,
                  manager_comments: Object.keys(managerQuestionComments).map(q => ({
                      question: q,
                      comment: managerQuestionComments[q]
                  }))
              })
          });
          
          if (res.ok) {
              alert("PMS Review Finalized Successfully!");
              setManagerScores({});
              setManagerFeedback("");
              setOverallRating("");
              setDevelopmentPlan("");
              setManagerQuestionComments({});
              setViewPMSModalOpen(false);
              setSelectedPMS(null);
              await load(true);
          } else {
              alert("Failed to finalize review.");
          }
      } catch(err) { 
          alert(err.message); 
      }
  }

  /**
   * Processes raw responses array and converts it into an object 
   * grouped by the dynamic Session Names created by the manager.
   */
  const getGroupedResponses = () => {
      if (!selectedPMS || !selectedPMS.responses) return {};
      const groups = {};
      selectedPMS.responses.forEach(resp => {
          const sName = resp.session_name || "General Evaluation";
          if (!groups[sName]) {
              groups[sName] = [];
          }
          groups[sName].push(resp);
      });
      return groups;
  };

  // ============================================================================
  // EXPORT CSV & CORRECTIONS & LEAVES & ASSETS
  // ============================================================================
  
  /**
   * Communicates with the backend aggregation pipeline to fetch
   * a dynamically generated CSV file containing the department's scores.
   */
  async function downloadReport() {
      try {
          const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/export-pms?month=${dashboardMonth}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(!res.ok) {
              throw new Error("Failed to download report data from server.");
          }
          
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

  async function fetchCalibration(month) {
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          const res = await fetch(`${baseUrl}/api/manager/pms-calibration?month=${month}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) setCalibrationData(await res.json());
          else setCalibrationData([]);
      } catch { setCalibrationData([]); }
  }

  /**
   * Approves or Rejects a manual attendance correction request.
   */
  async function approveCorrection(id, action) {
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          const res = await fetch(`${baseUrl}/api/manager/approve-correction`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ id, action })
          });
          if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.message || "Failed to process correction request.");
          }
          await load(true);
          alert(`Correction Request ${action} successfully.`);
      } catch(err) {
          alert(err.message);
      }
  }
  
  /**
   * Pushes leave status updates to the dual-tier approval system.
   */
  async function updateLeaveStatus(id, status) {
       const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
       try {
          const res = await fetch(`${baseUrl}/api/admin/leaves/${id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
              body: JSON.stringify({ status })
          });
          if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.message || "Failed to update leave status.");
          }
          await load(true);
          alert(`Leave ${status} Successfully`);
       } catch(err) {
          alert(err.message);
       }
  }

  /**
   * Submits a new leave request. If an attachment is present, 
   * the underlying api object will use FormData instead of standard JSON.
   */
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
      
      await load(true); 
      alert("Leave Applied Successfully!"); 
      setView("my-leaves"); 
    } catch (err) { 
        alert(err.message); 
    }
  }

  /**
   * NEW: Updates the status of an Employee's Asset Request
   * This is the Manager's tier of the Dual-Approval system.
   */
  async function updateAssetStatus(id, status) {
      const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
      try {
          const res = await fetch(`${baseUrl}/api/manager/assets/${id}`, {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ manager_status: status })
          });
          
          if(!res.ok) {
              const errData = await res.json();
              throw new Error(errData.message || "Failed to update asset status");
          }
          
          await load(true);
          alert(`Asset Request ${status} successfully. It will now pend Admin approval.`);
      } catch (err) {
          alert("Error updating asset: " + err.message);
      }
  }
  
  // ============================================================================
  // UTILITY HELPERS (SAFELY UPDATED FOR DATE PARSING)
  // ============================================================================
  
  /**
   * Forcefully safe Date Formatter that handles null, undefined, or invalid dates
   * to prevent catastrophic React runtime errors in tables.
   */
  const formatDateTime = (dateString) => {
      if (!dateString) return { date: "N/A", time: "" };
      
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return { date: "N/A", time: "" }; 
      
      return {
          date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
  };

  /**
   * Validates file uploads to enforce maximum size limits before submission.
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert("File too large. Max 5MB allowed."); 
        e.target.value = null; 
        setFile(null);
    } else { 
        setFile(selectedFile); 
    }
  };

  /**
   * Enforces a strict word count limit on text areas to maintain clean database records.
   */
  const handleReasonChange = (e) => {
    const val = e.target.value;
    const words = val.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length <= MAX_WORDS) {
        setReason(val);
    }
  };
  
  const getWordCount = () => {
      return reason.trim() === "" ? 0 : reason.trim().split(/\s+/).filter(w => w.length > 0).length;
  };
  
  /**
   * Handles opening detailed statistical views in modal overlays.
   */
  const handleStatClick = (title, list) => { 
      setModalTitle(title); 
      setModalList(list); 
      setLeaveModalOpen(true); 
  };
  
  const getStatusClass = (status) => {
      return status ? status.toLowerCase() : "pending";
  };

  // ============================================================================
  // REUSABLE UI COMPONENTS
  // ============================================================================
  
  // QuickLaunchItem and StatItem are defined above the component for performance

  /**
   * UI Component to render a quick directory of the manager's assigned team.
   */
  const TeamMembersList = () => (
    <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
        <div style={{overflowX: 'auto'}}>
            <table className="styled-table-global">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Dept</th>
                        <th>Position</th>
                    </tr>
                </thead>
                <tbody>
                    {teamMembers.length === 0 && (
                        <tr>
                            <td colSpan="4" style={{textAlign:'center', padding:20}}>
                                No team members found in your department.
                            </td>
                        </tr>
                    )}
                    {teamMembers.map(m => (
                        <tr key={m._id}>
                            <td>{m.name}</td>
                            <td>{m.email}</td>
                            <td>{m.department}</td>
                            <td>{m.position}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  // ============================================================================
  // RENDER TEMPLATE
  // ============================================================================
  return (
    <>
    <div className="app-shell">
      <Sidebar
        role="manager"
        user={user}
        view={view}
        setView={setView}
        onLogout={onLogout}
        navBadges={{
          "team-leaves": notificationCounts?.leaves || 0,
          "pms-manager": notificationCounts?.pms || 0,
          "corrections": notificationCounts?.corrections || 0,
          "announcements": notificationCounts?.announcements || 0,
          "team-assets": notificationCounts?.assets || 0,
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-area">
        <div className="main-topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)}><FaBars /></button>
          {view !== "dashboard" && (
            <button className="topbar-back" onClick={() => setView("dashboard")}><FaArrowLeft /></button>
          )}
          <span className="topbar-title">
            {view === "dashboard" ? "Manager Dashboard" : view.replace(/-/g, " ")}
          </span>
          <div className="topbar-right">
            {view === "dashboard" && (
              <button
                className="topbar-action-btn"
                onClick={() => { setPassError(""); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPasswordModal(true); }}
              >
                <FaLock /> Change Password
              </button>
            )}
            <button className="topbar-profile-btn" onClick={() => setProfileOpen(true)}>
              <div className="topbar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
              <span className="topbar-user-name">{user?.name}</span>
            </button>
          </div>
        </div>
        <div className="main-content">
      {/*
        -----------------------------------------------------------------------
        COMPONENT SCOPED CSS STYLING
        Expanded to multi-line format for superior readability and maintenance.
        The visual loader class has been entirely removed from this stylesheet.
        -----------------------------------------------------------------------
      */}
      <style>{`
        .employee-chip { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 8px 14px; border: 1.5px solid #e2e8f0; border-radius: 9999px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s; color: #475569; }
        .employee-chip:hover { border-color: #b91c1c; background: #fff; color: #b91c1c; }
        .employee-chip.selected { background: #b91c1c; color: white; border-color: #b91c1c; box-shadow: 0 2px 8px rgba(185,28,28,0.25); }
        .qa-box { margin-bottom: 12px; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid #b91c1c; transition: background 0.15s; }
        .qa-box:hover { background: #fff; }
        .inline-loader { display: flex; justify-content: center; align-items: center; padding: 40px; color: #64748b; font-weight: 500; gap: 10px; flex-direction: column; }
        .password-input-wrapper { position: relative; display: flex; align-items: center; margin-bottom: 15px; }
        .styled-table-global { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; table-layout: auto !important; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; background: #fff; }
        .styled-table-global th { background: #f8fafc; color: #64748b; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; text-align: left; padding: 11px 16px !important; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .styled-table-global td { padding: 12px 16px !important; border-bottom: 1px solid #f8fafc; color: #334155; vertical-align: middle !important; white-space: normal !important; word-wrap: break-word !important; }
        .styled-table-global tr:last-child td { border-bottom: none; }
        .styled-table-global tbody tr:hover td { background: #f8fafc; }
      `}</style>

      {/* Birthday Notification Banner */}
      {!birthdayDismissed && todayBirthdays.length > 0 && (
        <div className={`birthday-banner ${todayBirthdays.some(b => b.is_self) ? 'birthday-banner-self' : 'birthday-banner-others'}`}>
          <div className="birthday-banner-icon"><FaGift /></div>
          <div className="birthday-banner-text">
            {todayBirthdays.some(b => b.is_self) ? (
              <>
                <div className="birthday-banner-title">Happy Birthday, {user?.name?.split(' ')[0]}!</div>
                <div className="birthday-banner-sub">Wishing you a wonderful day filled with joy and success!</div>
              </>
            ) : (
              <>
                <div className="birthday-banner-title">
                  {todayBirthdays.slice(0, 3).map(b => b.name).join(', ')}{todayBirthdays.length > 3 ? ` +${todayBirthdays.length - 3} more` : ''} {todayBirthdays.length === 1 ? 'has' : 'have'} a birthday today!
                </div>
                <div className="birthday-banner-sub">Don't forget to wish them a great day!</div>
              </>
            )}
          </div>
          <button className="birthday-banner-dismiss" onClick={() => setBirthdayDismissed(true)}><FaTimes size={12} /></button>
        </div>
      )}

      {/* — Password Reset Modal — */}
      {showPasswordModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-card" style={{padding: 0}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid #f1f5f9'}}>
                  <div>
                    <h3 style={{color:'var(--red)', margin:0, fontSize:18, fontWeight:700}}>Set Secure Password</h3>
                    <p style={{margin:'4px 0 0', fontSize:13, color:'#64748b'}}>Please set a strong password to secure your account.</p>
                  </div>
                  <button
                    onClick={() => { setShowPasswordModal(false); setPassError(""); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                    style={{background:'#f1f5f9', border:'none', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#64748b', flexShrink:0}}
                  ><FaTimes size={13} /></button>
                </div>
                <div style={{padding:'20px 24px 24px'}}>
                {passError && <div className="alert" style={{marginBottom: 15, color: '#dc2626', background: '#fee2e2', padding: '10px', borderRadius: '8px'}}>{passError}</div>}
                
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
        </div>
      )}

      {/* — Header — */}
      {view === "dashboard" ? (
        <div className="dashboard-header-card card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: "var(--red)", margin: 0 }}>Manager Dashboard</h2>
            <p className="small">Manage your team and your own attendance</p>
            {delegatedGrants.length > 0 && (
               <div style={{ marginTop: 10, display: 'inline-block', background: '#e0e7ff', color: '#4f46e5', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                You have special Admin privileges active.
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
          <h3 style={{ margin: 0, color: "var(--red)", textTransform: 'uppercase' }}>{view.replace(/-/g, " ")}</h3>
        </div>
      )}
      
      {/* — Network Error — */}
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

      {/* — Announcement Notifications — */}
      {view === "dashboard" && (
        <AnnouncementNotifications announcements={announcements} userId={user?._id} />
      )}

      {/* — Dashboard Home — */}
      {view === "dashboard" && (
        <div className="dashboard-grid-container">
          
          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Actions</h4>
            <div className="quick-launch-grid">
              <QuickLaunchItem icon={<FaCamera />} label="Check In" onClick={() => openCamera("checkin")} />
              <QuickLaunchItem icon={<FaSignOutAlt />} label="Check Out" onClick={() => openCamera("checkout")} />
              <QuickLaunchItem icon={<FaUserCheck />} label="Team Leaves" onClick={() => setView("team-leaves")} badgeCount={notificationCounts?.leaves || 0} />
              <QuickLaunchItem icon={<FaEdit />} label="PMS Form Builder" onClick={() => setView("pms-builder")} />
              <QuickLaunchItem icon={<FaChartLine />} label="PMS Reviews" onClick={() => setView("pms-manager")} badgeCount={notificationCounts?.pms || 0} />
              <QuickLaunchItem icon={<FaUsers />} label="Dept Dashboard" onClick={() => setView("dept-dashboard")} />
              <QuickLaunchItem icon={<FaClipboardCheck />} label="Corrections" onClick={() => setView("corrections")} badgeCount={notificationCounts?.corrections || 0} />
              <QuickLaunchItem icon={<FaCalendarPlus />} label="Apply Leave" onClick={() => setView("apply-leave")} />
              <QuickLaunchItem icon={<FaCalendarCheck />} label="My Leaves" onClick={() => setView("my-leaves")} />
              <QuickLaunchItem icon={<FaHistory />} label="Attendance Log" onClick={() => setView("attendance-log")} />
              <QuickLaunchItem icon={<FaBullhorn />} label="Announcements" onClick={() => setView("announcements")} badgeCount={notificationCounts?.announcements || 0} />
              <QuickLaunchItem icon={<FaLaptop />} label="Team Assets" onClick={() => setView("team-assets")} badgeCount={notificationCounts?.assets || 0} />
              {delegatedGrants.length > 0 && (
                <QuickLaunchItem icon={<FaUserShield />} label="Admin Portal (Special Access)" onClick={() => setView("delegated-admin-portal")} badgeCount={delegatedGrants.length} />
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

      {/* — Delegated Admin Portal — */}
      {view === "delegated-admin-portal" && (
         <div className="card" style={{ marginTop: "16px" }}>
            <h2 style={{ color: 'var(--red)', marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaUserShield /> Temporary Admin Portal
            </h2>
            <p style={{ color: '#666', marginBottom: 30 }}>
                You have been granted temporary administrative permissions. Select an action below to proceed.
            </p>

            <div className="quick-launch-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <QuickLaunchItem icon={<FaClipboardList />} label="Manage Leave Approvals" onClick={() => setView("delegated-leaves")} />
                <QuickLaunchItem icon={<FaHistory />} label="Manage Daily Attendance" onClick={() => setView("delegated-attendance")} />
            </div>
         </div>
      )}

      {/* --- SUB-VIEWS FOR DELEGATED ADMIN --- */}
      {view === "delegated-leaves" && (
         <div style={{ marginTop: "16px" }}>
            <div className="delegation-alert">
               🛡️ You are currently viewing the Leave Approval interface using temporary Delegated Access. 
               Please follow all company guidelines when approving or viewing these records.
            </div>
            <AdminLeavePage token={token} api={api} />
         </div>
      )}

      {view === "delegated-attendance" && (
         <div style={{ marginTop: "16px" }}>
            <div className="delegation-alert">
               🛡️ You are currently viewing the Daily Attendance Logs using temporary Delegated Access. 
               Please follow all company guidelines when modifying or viewing these records.
            </div>
            <AdminAttendancePage token={token} api={api} />
         </div>
      )}

      {/* — Announcements — */}
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
                                    {new Date(ann.created_at).toLocaleString('en-US', { 
                                        month: 'short', day: 'numeric', year: 'numeric', 
                                        hour: '2-digit', minute: '2-digit' 
                                    })}
                                </span>
                            </div>
                            
                            <div className="announcement-body">
                                {ann.message}
                            </div>
                        </div>
                    ))
                )}
            </div>
         </div>
      )}

      {/* — PMS Template Builder — */}
      {view === "pms-builder" && (() => {
        const totalWeight = templateSessions.reduce((sum, s) => sum + (parseInt(s.weight) || 0), 0);
        return (
          <div style={{maxWidth: 960, margin: '0 auto'}}>
            {/* Header */}
            <div className="card" style={{marginBottom: 16}}>
              <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:20}}>
                <div style={{width:46, height:46, borderRadius:12, background:'linear-gradient(135deg, #6366f1, #818cf8)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <FaEdit color="#fff" size={20} />
                </div>
                <div>
                  <h3 style={{margin:0, fontSize:20, color:'#0f172a'}}>PMS Template Builder</h3>
                  <p style={{margin:0, fontSize:13, color:'#64748b'}}>Design performance evaluation forms with weighted sections and assign them to your team</p>
                </div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:20, background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0'}}>
                <div>
                  <label className="modern-label">Review Cycle Name</label>
                  <input className="modern-input" placeholder="e.g., Q1 2025, H1 2025, Annual Review 2025" value={cycleName} onChange={e => setCycleName(e.target.value)} />
                </div>
                <div>
                  <label className="modern-label">Submission Due Date</label>
                  <input className="modern-input" type="date" value={cycleDueDate} onChange={e => setCycleDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            <form onSubmit={savePmsTemplate}>
              {/* Employee Assignment */}
              <div className="card" style={{marginBottom:16}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                  <div>
                    <h4 style={{margin:0, color:'#0f172a'}}>Assign to Employees</h4>
                    <p style={{margin:'3px 0 0', fontSize:13, color:'#64748b'}}>Select who should complete this evaluation</p>
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <button type="button" style={{display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#dcfce7', color:'#166534', border:'1px solid #86efac', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600}} onClick={selectAllEmployees}>
                      <FaCheckSquare size={11}/> All
                    </button>
                    <button type="button" style={{display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#fee2e2', color:'#991b1b', border:'1px solid #fca5a5', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600}} onClick={clearAllEmployees}>
                      <FaRegSquare size={11}/> Clear
                    </button>
                  </div>
                </div>
                {teamMembers.length === 0 ? (
                  <div style={{textAlign:'center', padding:30, color:'#94a3b8', border:'1px dashed #e2e8f0', borderRadius:8}}>No team members found.</div>
                ) : (
                  <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                    {teamMembers.map(emp => (
                      <label key={emp._id} className={`employee-chip ${assignedEmployees.includes(emp._id) ? 'selected' : ''}`}>
                        <input type="checkbox" style={{display:'none'}} checked={assignedEmployees.includes(emp._id)} onChange={() => toggleEmployeeAssignment(emp._id)} />
                        <FaUserCheck style={{opacity: assignedEmployees.includes(emp._id) ? 1 : 0.35}} />
                        {emp.name}
                      </label>
                    ))}
                  </div>
                )}
                {assignedEmployees.length > 0 && (
                  <div style={{marginTop:12, padding:'8px 14px', background:'#f0fdf4', borderRadius:6, border:'1px solid #bbf7d0', fontSize:13, color:'#166534', display:'flex', alignItems:'center', gap:6}}>
                    <FaCheckCircle />{assignedEmployees.length} employee{assignedEmployees.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>

              {/* Sections Builder */}
              <div className="card" style={{marginBottom:16}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                  <div>
                    <h4 style={{margin:0, color:'#0f172a'}}>Evaluation Sections</h4>
                    <p style={{margin:'3px 0 0', fontSize:13, color:'#64748b'}}>Build weighted sections — total must equal 100%</p>
                  </div>
                  {templateSessions.length > 0 && (
                    <div style={{padding:'6px 16px', borderRadius:20, fontSize:13, fontWeight:700,
                      background: totalWeight === 100 ? '#dcfce7' : totalWeight > 100 ? '#fee2e2' : '#fff7ed',
                      color: totalWeight === 100 ? '#166534' : totalWeight > 100 ? '#991b1b' : '#92400e',
                      border: `1px solid ${totalWeight === 100 ? '#86efac' : totalWeight > 100 ? '#fca5a5' : '#fcd34d'}`
                    }}>
                      {totalWeight}% / 100%
                    </div>
                  )}
                </div>

                {templateSessions.length === 0 && (
                  <div style={{textAlign:'center', padding:'40px 20px', background:'#f8fafc', border:'1px dashed #cbd5e1', borderRadius:10, color:'#94a3b8', marginBottom:16}}>
                    <FaClipboardList size={32} style={{marginBottom:10, opacity:0.3}} />
                    <div style={{fontSize:15, fontWeight:500}}>No sections yet</div>
                    <div style={{fontSize:13, marginTop:4}}>Click "Add Section" below to start building</div>
                  </div>
                )}

                {templateSessions.map((session, sIdx) => (
                  <div key={sIdx} style={{marginBottom:14, background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                    <div style={{display:'flex', gap:10, alignItems:'center', padding:'12px 14px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0'}}>
                      <div style={{width:26, height:26, borderRadius:6, background:'var(--red)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0}}>
                        {sIdx + 1}
                      </div>
                      <input className="modern-input" style={{flex:2, background:'#fff'}}
                        placeholder="Section Title (e.g., Work Quality, Communication Skills)"
                        value={session.name} onChange={e => handleSessionNameChange(sIdx, e.target.value)} required />
                      <div style={{display:'flex', alignItems:'center', gap:6, flexShrink:0}}>
                        <span style={{fontSize:12, color:'#64748b', fontWeight:600, whiteSpace:'nowrap'}}>Weight %</span>
                        <input type="number" min="0" max="100" className="modern-input" style={{width:72, textAlign:'center', background:'#fff'}}
                          value={session.weight ?? ""} onChange={e => handleSessionWeightChange(sIdx, e.target.value)} placeholder="20" />
                      </div>
                      <button type="button" style={{background:'#fee2e2', color:'#991b1b', border:'1px solid #fca5a5', borderRadius:6, padding:'7px 10px', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center'}} onClick={() => handleRemoveSession(sIdx)}>
                        <FaTrash size={12} />
                      </button>
                    </div>
                    <div style={{padding:14}}>
                      {session.questions.map((q, qIdx) => (
                        <div key={qIdx} style={{display:'flex', gap:8, marginBottom:8, alignItems:'center'}}>
                          <div style={{width:20, height:20, borderRadius:4, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#64748b', fontWeight:600, flexShrink:0}}>
                            {qIdx + 1}
                          </div>
                          <input className="modern-input" style={{flex:2}}
                            placeholder="Question text..." value={q.text}
                            onChange={e => handleQuestionChange(sIdx, qIdx, 'text', e.target.value)} required />
                          <select className="modern-input" style={{flex:1}}
                            value={q.type} onChange={e => handleQuestionChange(sIdx, qIdx, 'type', e.target.value)}>
                            <option value="scale">Rating Scale (1–5)</option>
                            <option value="descriptive">Descriptive Answer</option>
                            <option value="goals">Goals & Objectives</option>
                          </select>
                          <button type="button" style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8', padding:'8px 6px', flexShrink:0}} onClick={() => handleRemoveQuestion(sIdx, qIdx)}>
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                      <button type="button" style={{display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#f0fdf4', color:'#166534', border:'1px dashed #86efac', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, marginTop:6}} onClick={() => handleAddQuestion(sIdx)}>
                        <FaPlus size={10} /> Add Question
                      </button>
                    </div>
                  </div>
                ))}

                <button type="button" style={{display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 20px', background:'#f8fafc', color:'#475569', border:'2px dashed #cbd5e1', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:600, width:'100%', marginTop: templateSessions.length > 0 ? 8 : 0}} onClick={handleAddSession}>
                  <FaPlus /> Add Section
                </button>
              </div>

              <div style={{display:'flex', justifyContent:'flex-end', gap:12}}>
                <button type="button" className="btn ghost" onClick={() => setView("dashboard")}>Cancel</button>
                <button type="submit" className="btn" style={{padding:'12px 28px', fontSize:15, display:'flex', alignItems:'center', gap:8}}>
                  <FaCheckCircle /> Assign & Save Template
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* — Dept Performance Dashboard — */}
      {view === "dept-dashboard" && (
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
                <table className="styled-table-global">
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

      {/* — PMS Reviews — */}
      {view === "pms-manager" && (
        <div>
          {/* Stats Row */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:20}}>
            {[
              { count: pendingPMS.filter(p => p.status === 'Pending Review').length, label: 'Awaiting Review', color: '#f59e0b', bg: '#fffbeb' },
              { count: pendingPMS.filter(p => p.status === 'Manager Review Completed').length, label: 'Completed', color: '#22c55e', bg: '#f0fdf4' },
              { count: pendingPMS.length, label: 'Total Submissions', color: '#6366f1', bg: '#f5f3ff' },
            ].map((s, i) => (
              <div key={i} className="card" style={{textAlign:'center', padding:'18px 16px', background: s.bg, border:`1px solid ${s.color}22`}}>
                <div style={{fontSize:30, fontWeight:700, color: s.color}}>{s.count}</div>
                <div style={{fontSize:13, color:'#64748b', marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Pending Reviews */}
          {pendingPMS.filter(p => p.status === 'Pending Review').length > 0 && (
            <div className="card" style={{marginBottom:16}}>
              <h4 style={{margin:'0 0 14px', color:'#0f172a', display:'flex', alignItems:'center', gap:8}}>
                <span style={{width:9, height:9, borderRadius:'50%', background:'#f59e0b', display:'inline-block'}}></span>
                Awaiting Your Review
              </h4>
              <div style={{display:'grid', gap:10}}>
                {pendingPMS.filter(p => p.status === 'Pending Review').map(p => (
                  <div key={p._id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:16, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, gap:12}}>
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <div style={{width:44, height:44, borderRadius:10, background:'#f59e0b', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:18, flexShrink:0}}>
                        {p.employee_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontWeight:600, color:'#0f172a', fontSize:15}}>{p.employee_name}</div>
                        <div style={{fontSize:12, color:'#78716c', marginTop:2}}>
                          {p.cycle_name ? `${p.cycle_name} · ` : ''}{p.month}
                        </div>
                      </div>
                    </div>
                    <button className="btn" style={{background:'#6366f1', padding:'9px 20px', fontSize:13, display:'flex', alignItems:'center', gap:6, flexShrink:0}} onClick={() => handleViewPMS(p)}>
                      <FaChartLine /> Review Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Reviews */}
          <div className="card">
            <h4 style={{margin:'0 0 14px', color:'#0f172a', display:'flex', alignItems:'center', gap:8}}>
              <span style={{width:9, height:9, borderRadius:'50%', background:'#22c55e', display:'inline-block'}}></span>
              Completed Reviews
            </h4>
            {pendingPMS.filter(p => p.status === 'Manager Review Completed').length === 0 ? (
              <div style={{textAlign:'center', padding:30, color:'#94a3b8'}}>No completed reviews yet.</div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table className="styled-table-global">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Cycle / Month</th>
                      <th>Overall Rating</th>
                      <th>Acknowledged</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPMS.filter(p => p.status === 'Manager Review Completed').map(p => (
                      <tr key={p._id}>
                        <td style={{fontWeight:600}}>{p.employee_name}</td>
                        <td>{p.cycle_name ? `${p.cycle_name} · ${p.month}` : p.month}</td>
                        <td>
                          {p.overall_rating
                            ? <span style={{fontSize:12, padding:'3px 10px', borderRadius:20, background:'#f0fdf4', color:'#166534', border:'1px solid #86efac', fontWeight:600}}>{p.overall_rating}</span>
                            : <span style={{color:'#94a3b8', fontSize:12}}>—</span>}
                        </td>
                        <td>
                          {p.acknowledged_by_employee
                            ? <span style={{fontSize:12, color:'#22c55e', fontWeight:600, display:'flex', alignItems:'center', gap:4}}><FaCheckCircle/> Yes</span>
                            : <span style={{fontSize:12, color:'#94a3b8'}}>Pending</span>}
                        </td>
                        <td>
                          <button className="btn-small ghost" style={{border:'1px solid #e2e8f0', color:'#475569', padding:'6px 14px', display:'inline-flex', alignItems:'center', gap:4}} onClick={() => handleViewPMS(p)}>
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* — PMS Calibration — */}
      {view === "pms-calibration" && (
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12}}>
            <div>
              <h3 style={{margin:0, color:'#0f172a'}}>Team Performance Calibration</h3>
              <p style={{margin:'4px 0 0', fontSize:13, color:'#64748b'}}>Compare self-assessments vs manager ratings side-by-side for your entire team</p>
            </div>
            <input type="month" className="modern-input" style={{width:'auto'}} value={calibrationMonth} onChange={e => setCalibrationMonth(e.target.value)} />
          </div>

          {calibrationData.length === 0 ? (
            <div style={{textAlign:'center', padding:'50px 20px', color:'#94a3b8', border:'1px dashed #e2e8f0', borderRadius:10}}>
              <FaChartLine size={36} style={{marginBottom:12, opacity:0.3}} />
              <div style={{fontSize:15, fontWeight:500}}>No calibration data for this period</div>
              <div style={{fontSize:13, marginTop:4}}>Complete PMS reviews to see calibration data here</div>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="styled-table-global">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{textAlign:'center'}}>Self Avg</th>
                    <th style={{textAlign:'center'}}>Manager Avg</th>
                    <th style={{textAlign:'center'}}>Variance</th>
                    <th>Overall Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {calibrationData.map((row, idx) => {
                    const variance = row.manager_avg != null ? (row.manager_avg - row.self_avg).toFixed(1) : null;
                    return (
                      <tr key={idx}>
                        <td style={{fontWeight:600}}>{row.employee_name}</td>
                        <td style={{textAlign:'center'}}>
                          <span style={{padding:'3px 10px', borderRadius:20, background:'#eff6ff', color:'#1d4ed8', fontWeight:700, fontSize:13}}>{row.self_avg?.toFixed(1)}/5</span>
                        </td>
                        <td style={{textAlign:'center'}}>
                          {row.manager_avg != null
                            ? <span style={{padding:'3px 10px', borderRadius:20, background:'#fdf4ff', color:'#7e22ce', fontWeight:700, fontSize:13}}>{row.manager_avg?.toFixed(1)}/5</span>
                            : <span style={{color:'#94a3b8', fontSize:12}}>Pending</span>}
                        </td>
                        <td style={{textAlign:'center'}}>
                          {variance != null
                            ? <span style={{fontWeight:700, color: parseFloat(variance) >= 0 ? '#22c55e' : '#ef4444'}}>{parseFloat(variance) >= 0 ? '+' : ''}{variance}</span>
                            : '—'}
                        </td>
                        <td>
                          {row.overall_rating
                            ? <span style={{fontSize:12, padding:'3px 10px', borderRadius:20, background:'#f0fdf4', color:'#166534', border:'1px solid #bbf7d0', fontWeight:600}}>{row.overall_rating}</span>
                            : <span style={{color:'#94a3b8', fontSize:12}}>Not Set</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* — Corrections — */}
      {view === "corrections" && (
          <div className="card">
              <h3>Pending Attendance Corrections</h3>
              <div style={{overflowX:'auto'}}>
                <table className="styled-table-global">
                    <thead><tr><th>Employee</th><th>New Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        {pendingCorrections.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:20, color:'#999'}}>No pending corrections found.</td></tr>}
                        {pendingCorrections.map(c => (
                            <tr key={c._id}>
                                <td style={{fontWeight: 'bold'}}>{c.employee_name}</td>
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

      {/* — Team Leaves — */}
      {view === "team-leaves" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Team Leave Requests</h3>
              <div style={{overflowX: 'auto'}}>
                <table className="styled-table-global">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th style={{minWidth: '95px'}}><FaClock style={{marginRight: 4, opacity: 0.7, marginBottom: -2}}/> Applied On</th>
                            <th>Period</th>
                            <th>Reason</th>
                            <th style={{textAlign:'center'}}>Manager</th>
                            <th style={{textAlign:'center'}}>HR</th>
                            <th style={{textAlign:'center'}}>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamLeaves.length === 0 && <tr><td colSpan="8" style={{textAlign:'center', padding:20, color:'#999'}}>No leave requests found.</td></tr>}
                        {teamLeaves.map(l => {
                            const { date, time } = formatDateTime(l.applied_at || l.created_at);
                            return (
                            <tr key={l._id}>
                                {/* Employee Name & Type */}
                                <td>
                                    <div style={{fontWeight:700, color: "#0f172a", fontSize: 13}}>{l.employee_name}</div>
                                    <div style={{fontSize:10, color:'#64748b', marginTop: 4, textTransform: "uppercase", fontWeight: 600}}>
                                      {l.type === 'half' ? `Half Day` : 'Full Day'}
                                    </div>
                                </td>

                                {/* Applied Date & Time (Stacked safely) */}
                                <td style={{ fontWeight: 500, color: '#334155' }}>
                                    <div>{date}</div>
                                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{time}</div>
                                </td>

                                {/* Leave Target Date(s) */}
                                <td style={{ fontWeight: 500, fontSize: 12 }}>
                                    {l.from_date && l.to_date && l.from_date !== l.to_date 
                                       ? (<>
                                             <div>{new Date(l.from_date).toLocaleDateString('en-GB')}</div>
                                             <div style={{color: '#94a3b8', fontSize: 10}}>to</div>
                                             <div>{new Date(l.to_date).toLocaleDateString('en-GB')}</div>
                                          </>)
                                       : <div>{l.date ? new Date(l.date).toLocaleDateString('en-GB') : '-'}</div>
                                    }
                                </td>

                                {/* Context (Reason and File) */}
                                <td style={{maxWidth:'180px'}}>
                                    <div style={{fontSize:11, color:'#475569', lineHeight:'1.4', marginBottom: l.attachment_url ? 6 : 0}}>
                                      {l.reason || <span style={{fontStyle:'italic', color:'#cbd5e1'}}>No reason</span>}
                                    </div>
                                    {l.attachment_url && (
                                      <div>
                                        <a 
                                          href={l.attachment_url.startsWith('http') ? l.attachment_url : `https://gdmrconnect-backend-production.up.railway.app${l.attachment_url}`}
                                          target="_blank" 
                                          rel="noreferrer"
                                          style={{ 
                                              display: 'inline-flex', alignItems: 'center', gap: 4, color: "var(--red)", 
                                              fontSize: "10px", textDecoration: "none", fontWeight: 600,
                                              background: '#fef2f2', padding: '4px 6px', borderRadius: 4
                                          }}
                                        >
                                          <FaFileDownload /> View
                                        </a>
                                      </div>
                                    )}
                                </td>

                                {/* Statuses */}
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
                                    <span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span>
                                </td>

                                {/* Action Buttons - Always Visible & Forced Stacked */}
                                <td>
                                    <div className="action-btn-group">
                                        <button 
                                            className="action-btn btn-approve" 
                                            onClick={() => updateLeaveStatus(l._id, "Approved")}
                                        >
                                            <FaCheckCircle /> Approve
                                        </button>
                                        <button 
                                            className="action-btn btn-reject" 
                                            onClick={() => updateLeaveStatus(l._id, "Rejected")}
                                        >
                                            <FaTimesCircle /> Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* — Team Assets — */}
      {view === "team-assets" && (
          <div className="card" style={{marginTop: 16}}>
              <h3>Team Hardware & Asset Requests</h3>
              <p className="small" style={{marginBottom: 20}}>Review and approve equipment requests from your department employees. Approved requests will be forwarded to Administration for final provisioning.</p>
              
              <div style={{overflowX: 'auto'}}>
                <table className="styled-table-global">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Requested Asset</th>
                            <th>Justification / Reason</th>
                            <th style={{textAlign:'center'}}>Manager Status</th>
                            <th style={{textAlign:'center'}}>Admin Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamAssets.length === 0 ? (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:40, color:'#999'}}>No pending asset requests from your team.</td></tr>
                        ) : (
                            teamAssets.map(asset => (
                            <tr key={asset._id}>
                                <td>
                                    <div style={{fontWeight:700, color: "#0f172a", fontSize: 13}}>{asset.employee_name}</div>
                                    <div style={{fontSize:10, color:'#64748b', marginTop: 4}}>{new Date(asset.created_at).toLocaleDateString('en-GB')}</div>
                                </td>
                                <td style={{ fontWeight: 600, color: '#334155' }}>
                                    {asset.asset_name}
                                </td>
                                <td style={{maxWidth:'250px'}}>
                                    <div style={{fontSize:12, color:'#475569', lineHeight:'1.4'}}>
                                      {asset.reason}
                                    </div>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(asset.manager_status || 'Pending')}`}>
                                      {asset.manager_status || 'Pending'}
                                    </span>
                                </td>
                                <td style={{textAlign:'center'}}>
                                    <span className={`status-badge ${getStatusClass(asset.admin_status || 'Pending')}`}>
                                      {asset.admin_status || 'Pending'}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-btn-group">
                                        <button 
                                            className="action-btn btn-approve" 
                                            onClick={async () => {
                                                try {
                                                    const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
                                                    await fetch(`${baseUrl}/api/manager/assets/${asset._id}`, {
                                                        method: 'PUT',
                                                        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                                                        body: JSON.stringify({ manager_status: 'Approved' })
                                                    });
                                                    await load(true);
                                                    alert('Asset Request Approved');
                                                } catch(e) { alert(e.message); }
                                            }}
                                        >
                                            <FaCheckCircle /> Approve
                                        </button>
                                        <button 
                                            className="action-btn btn-reject" 
                                            onClick={async () => {
                                                try {
                                                    const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
                                                    await fetch(`${baseUrl}/api/manager/assets/${asset._id}`, {
                                                        method: 'PUT',
                                                        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                                                        body: JSON.stringify({ manager_status: 'Rejected' })
                                                    });
                                                    await load(true);
                                                    alert('Asset Request Rejected');
                                                } catch(e) { alert(e.message); }
                                            }}
                                        >
                                            <FaTimesCircle /> Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* — Team Directory — */}
      {view === "team-members" && <TeamMembersList />}

      {/* — Apply Leave — */}
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

      {/* — My Leaves — */}
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
                {myLeaves.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign:"center", padding:20, color:"#999"}}>No leaves found.</td></tr>
                ) : (
                  myLeaves.map((l) => (
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

      {/* — Attendance Log — */}
      {view === "attendance-log" && (
        <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px'}}>
                <h3 style={{margin:0, color:'var(--red)'}}>My Attendance Log</h3>
            </div>
            <div style={{overflowX: 'auto'}}>
                <table className="styled-table-global">
                  <thead><tr><th>Type</th><th>Date / Time</th><th>Photo</th></tr></thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr><td colSpan="3" style={{textAlign:'center', padding:20}}>No attendance records.</td></tr>
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
            </div>
        </div>
      )}

      {/* — Holidays & Modals — */}
      {view === "holidays" && <div style={{ marginTop: "16px" }}><HolidayCalendar /></div>}
      {view === "lms"     && <ErrorBoundary label="My Courses" resetKey={view}><EmployeeLMS token={token} /></ErrorBoundary>}
      {view === "career"  && <ErrorBoundary label="Career" resetKey={view}><EmployeeCareer token={token} user={user} /></ErrorBoundary>}

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

      {/* --- PMS REVIEW MODAL — WORLD CLASS DESIGN --- */}
      {viewPMSModalOpen && selectedPMS && (() => {
        const isPending = selectedPMS.status === 'Pending Review';
        const grouped = getGroupedResponses();
        const scaleResponses = selectedPMS.responses?.filter(r => r.self_score) || [];
        const selfAvg = scaleResponses.length > 0
          ? (scaleResponses.reduce((s, r) => s + parseFloat(r.self_score || 0), 0) / scaleResponses.length).toFixed(1)
          : null;
        const mgrScores = selectedPMS.manager_scores || [];
        const mgrAvg = mgrScores.length > 0
          ? (mgrScores.reduce((s, m) => s + parseFloat(m.score || 0), 0) / mgrScores.length).toFixed(1)
          : null;

        return (
          <div className="modal-overlay" style={{zIndex: 4000}} onClick={() => setViewPMSModalOpen(false)}>
            <div className="modal-card large" onClick={e => e.stopPropagation()} style={{padding:0, display:'flex', flexDirection:'column', maxHeight:'90vh'}}>

              {/* Modal Header */}
              <div style={{padding:'20px 24px', borderBottom:'1px solid #e2e8f0', background: isPending ? '#fffbeb' : '#f0fdf4', flexShrink:0}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontSize:11, fontWeight:700, color: isPending ? '#92400e' : '#166534', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4}}>
                      {isPending ? 'Pending Review' : 'Review Completed'}
                    </div>
                    <h3 style={{margin:0, fontSize:20, color:'#0f172a'}}>{selectedPMS.employee_name}</h3>
                    <div style={{fontSize:13, color:'#64748b', marginTop:3}}>
                      {selectedPMS.cycle_name ? `${selectedPMS.cycle_name} · ` : ''}{selectedPMS.month}
                    </div>
                  </div>
                  <button style={{background:'#f1f5f9', border:'none', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569', flexShrink:0}} onClick={() => setViewPMSModalOpen(false)}>
                    <FaTimes size={15} />
                  </button>
                </div>

                {/* Score Summary Strip */}
                {(selfAvg || mgrAvg) && (
                  <div style={{display:'flex', gap:16, marginTop:14, flexWrap:'wrap'}}>
                    {selfAvg && (
                      <div style={{background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'8px 14px', border:'1px solid #e2e8f0'}}>
                        <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Self Average</div>
                        <div style={{fontSize:18, fontWeight:700, color:'#1d4ed8'}}>{selfAvg}<span style={{fontSize:12, color:'#94a3b8'}}>/5</span></div>
                      </div>
                    )}
                    {mgrAvg && (
                      <div style={{background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'8px 14px', border:'1px solid #e2e8f0'}}>
                        <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Manager Average</div>
                        <div style={{fontSize:18, fontWeight:700, color:'#7e22ce'}}>{mgrAvg}<span style={{fontSize:12, color:'#94a3b8'}}>/5</span></div>
                      </div>
                    )}
                    {selectedPMS.overall_rating && (
                      <div style={{background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'8px 14px', border:'1px solid #e2e8f0'}}>
                        <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Overall Rating</div>
                        <div style={{fontSize:14, fontWeight:700, color:'#166534'}}>{selectedPMS.overall_rating}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scrollable Body */}
              <div style={{overflowY:'auto', padding:'20px 24px', flex:1}}>

                {(!selectedPMS.responses || selectedPMS.responses.length === 0) ? (
                  <div style={{textAlign:'center', padding:40, color:'#94a3b8'}}>No responses in this submission.</div>
                ) : (
                  Object.entries(grouped).map(([sessionName, responsesInSession], sessionIndex) => {
                    const sessionTemplate = selectedPMS.sessions?.find(s => s.name === sessionName);
                    return (
                      <div key={sessionIndex} style={{marginBottom:28}}>
                        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:10, borderBottom:'2px solid #fecaca'}}>
                          <h5 style={{margin:0, color:'var(--red)', fontSize:15, textTransform:'uppercase', letterSpacing:'0.04em', flex:1}}>
                            {sessionName}
                          </h5>
                          {sessionTemplate?.weight && (
                            <span style={{fontSize:11, padding:'3px 10px', borderRadius:20, background:'#fef2f2', color:'var(--red)', border:'1px solid #fecaca', fontWeight:700}}>
                              {sessionTemplate.weight}% weight
                            </span>
                          )}
                        </div>

                        {responsesInSession.map((resp, idx) => {
                          const existingMgrScore = selectedPMS.manager_scores?.find(m => m.question === resp.question);
                          const existingMgrComment = selectedPMS.manager_comments?.find(m => m.question === resp.question);
                          const selfScoreNum = parseInt(resp.self_score);
                          const selfRating = getRatingInfo(selfScoreNum);
                          const isGoalsType = !resp.self_score && !resp.descriptive_answer && resp.goals_text;

                          return (
                            <div key={idx} style={{marginBottom:16, background:'#fff', padding:18, borderRadius:10, border:'1px solid #e2e8f0', borderLeft:'4px solid var(--red)', boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                              <div style={{fontWeight:600, color:'#1e293b', fontSize:14, marginBottom:14}}>
                                {resp.question}
                              </div>

                              {/* Scale response */}
                              {resp.self_score && (
                                <div style={{marginBottom:12}}>
                                  <div style={{display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-start', marginBottom: isPending ? 16 : 0}}>
                                    {/* Self Score Display */}
                                    <div style={{minWidth:130}}>
                                      <div style={{fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6}}>SELF RATING</div>
                                      {selfScoreNum > 5 ? (
                                        <div style={{background:'#f1f5f9', padding:'8px 14px', borderRadius:8}}>
                                          <span style={{fontSize:20, fontWeight:700, color:'#0f172a'}}>{resp.self_score}</span>
                                          <span style={{fontSize:13, color:'#94a3b8'}}>/10</span>
                                        </div>
                                      ) : (
                                        <div>
                                          <div style={{display:'flex', gap:4, marginBottom:4}}>
                                            {RATING_SCALE.map(r => (
                                              <div key={r.value} style={{
                                                width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                                                background: r.value <= selfScoreNum ? r.color : '#f1f5f9',
                                                color: r.value <= selfScoreNum ? '#fff' : '#94a3b8',
                                                fontSize:12, fontWeight:700
                                              }}>{r.value}</div>
                                            ))}
                                          </div>
                                          {selfRating && <div style={{fontSize:11, color: selfRating.color, fontWeight:600}}>{selfRating.label}</div>}
                                        </div>
                                      )}
                                    </div>

                                    {/* Manager Score Display (completed) */}
                                    {!isPending && existingMgrScore && (
                                      <div style={{minWidth:130}}>
                                        <div style={{fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6}}>MANAGER RATING</div>
                                        {parseInt(existingMgrScore.score) > 5 ? (
                                          <div style={{background:'#fef2f2', padding:'8px 14px', borderRadius:8}}>
                                            <span style={{fontSize:20, fontWeight:700, color:'var(--red)'}}>{existingMgrScore.score}</span>
                                            <span style={{fontSize:13, color:'#f87171'}}>/10</span>
                                          </div>
                                        ) : (
                                          <div>
                                            <div style={{display:'flex', gap:4, marginBottom:4}}>
                                              {RATING_SCALE.map(r => (
                                                <div key={r.value} style={{
                                                  width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                                                  background: r.value <= parseInt(existingMgrScore.score) ? r.color : '#f1f5f9',
                                                  color: r.value <= parseInt(existingMgrScore.score) ? '#fff' : '#94a3b8',
                                                  fontSize:12, fontWeight:700
                                                }}>{r.value}</div>
                                              ))}
                                            </div>
                                            {getRatingInfo(parseInt(existingMgrScore.score)) && (
                                              <div style={{fontSize:11, color: getRatingInfo(parseInt(existingMgrScore.score)).color, fontWeight:600}}>
                                                {getRatingInfo(parseInt(existingMgrScore.score)).label}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Manager Grading (pending) */}
                                  {isPending && (
                                    <div style={{background:'#f8fafc', padding:14, borderRadius:8, border:'1px solid #e2e8f0'}}>
                                      <div style={{fontSize:12, color:'#0f172a', fontWeight:600, marginBottom:10}}>Assign Manager Rating</div>
                                      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:10}}>
                                        {RATING_SCALE.map(r => (
                                          <button key={r.value} type="button"
                                            onClick={() => setManagerScores({...managerScores, [resp.question]: r.value})}
                                            style={{
                                              padding:'8px 12px', borderRadius:8, border:'2px solid',
                                              borderColor: managerScores[resp.question] === r.value ? r.color : '#e2e8f0',
                                              background: managerScores[resp.question] === r.value ? r.color : '#fff',
                                              color: managerScores[resp.question] === r.value ? '#fff' : '#475569',
                                              cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                                              minWidth:36
                                            }}>
                                            {r.value}
                                          </button>
                                        ))}
                                      </div>
                                      {managerScores[resp.question] && (
                                        <div style={{fontSize:12, color: getRatingInfo(managerScores[resp.question])?.color, fontWeight:600}}>
                                          Selected: {getRatingInfo(managerScores[resp.question])?.label}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Descriptive / Goals answer */}
                              {(resp.descriptive_answer || isGoalsType) && (
                                <div style={{marginBottom:12}}>
                                  <div style={{fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6}}>EMPLOYEE ANSWER</div>
                                  <div style={{background:'#f8fafc', padding:12, borderRadius:6, border:'1px solid #e2e8f0', fontSize:13, color:'#334155', whiteSpace:'pre-wrap', lineHeight:1.6}}>
                                    {resp.descriptive_answer || resp.goals_text}
                                  </div>
                                </div>
                              )}

                              {resp.remarks && (
                                <div style={{fontSize:12, color:'#475569', background:'#f1f5f9', padding:'8px 12px', borderRadius:6, borderLeft:'3px solid #94a3b8', marginBottom:12}}>
                                  <strong>Remarks:</strong> {resp.remarks}
                                </div>
                              )}

                              {/* Per-question Manager Comment */}
                              {isPending ? (
                                <div style={{marginTop:10}}>
                                  <label style={{fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:6}}>MANAGER COMMENT (optional)</label>
                                  <textarea
                                    className="modern-input" style={{minHeight:60, resize:'vertical', fontSize:13}}
                                    placeholder="Add specific feedback for this question..."
                                    value={managerQuestionComments[resp.question] || ""}
                                    onChange={e => setManagerQuestionComments({...managerQuestionComments, [resp.question]: e.target.value})}
                                  />
                                </div>
                              ) : (existingMgrComment?.comment && (
                                <div style={{marginTop:10, background:'#fdf4ff', padding:'8px 12px', borderRadius:6, border:'1px solid #e9d5ff', fontSize:12, color:'#6b21a8', borderLeft:'3px solid #a855f7'}}>
                                  <strong>Manager's Note:</strong> {existingMgrComment.comment}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}

                {/* Manager Final Section */}
                {isPending && (
                  <div style={{borderTop:'2px solid #e2e8f0', paddingTop:24, marginTop:8}}>
                    <h4 style={{margin:'0 0 16px', color:'#0f172a', fontSize:16}}>Finalize Evaluation</h4>

                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>
                      <div>
                        <label className="modern-label">Overall Performance Rating</label>
                        <select className="modern-input" value={overallRating} onChange={e => setOverallRating(e.target.value)}>
                          <option value="">— Select Rating —</option>
                          {OVERALL_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{marginBottom:16}}>
                      <label className="modern-label">Overall Remarks & Feedback</label>
                      <textarea className="modern-input" style={{minHeight:100, resize:'vertical'}}
                        placeholder="Provide constructive, specific feedback summarizing the employee's performance..."
                        value={managerFeedback} onChange={e => setManagerFeedback(e.target.value)}
                      />
                    </div>

                    <div style={{marginBottom:20}}>
                      <label className="modern-label">Development Plan & Action Items</label>
                      <textarea className="modern-input" style={{minHeight:90, resize:'vertical'}}
                        placeholder="Outline key areas for growth and specific action items to improve performance..."
                        value={developmentPlan} onChange={e => setDevelopmentPlan(e.target.value)}
                      />
                    </div>

                    <button className="btn" style={{width:'100%', fontSize:16, padding:16, background:'linear-gradient(135deg, #6366f1, #4f46e5)', border:'none', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', gap:8}}
                      onClick={() => finalizePMS(selectedPMS._id)}>
                      <FaCheckCircle /> Submit Scores & Finalize Review
                    </button>
                  </div>
                )}

                {/* Completed State Summary */}
                {!isPending && (
                  <div style={{borderTop:'2px solid #e2e8f0', paddingTop:20, marginTop:8}}>
                    {selectedPMS.overall_rating && (
                      <div style={{marginBottom:14, padding:'10px 16px', background:'#f0fdf4', borderRadius:8, border:'1px solid #bbf7d0', display:'flex', alignItems:'center', gap:10}}>
                        <FaCheckCircle color="#22c55e" />
                        <div>
                          <span style={{fontSize:12, color:'#64748b'}}>Overall Rating: </span>
                          <strong style={{color:'#166534'}}>{selectedPMS.overall_rating}</strong>
                        </div>
                      </div>
                    )}
                    {selectedPMS.manager_feedback && (
                      <div style={{marginBottom:14, padding:16, background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca'}}>
                        <div style={{fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6}}>MANAGER FEEDBACK</div>
                        <p style={{margin:0, fontSize:13, color:'#450a0a', whiteSpace:'pre-wrap', lineHeight:1.6}}>{selectedPMS.manager_feedback}</p>
                      </div>
                    )}
                    {selectedPMS.development_plan && (
                      <div style={{padding:16, background:'#f5f3ff', borderRadius:8, border:'1px solid #e9d5ff'}}>
                        <div style={{fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6}}>DEVELOPMENT PLAN</div>
                        <p style={{margin:0, fontSize:13, color:'#3b0764', whiteSpace:'pre-wrap', lineHeight:1.6}}>{selectedPMS.development_plan}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* — Camera Modal — */}
      {cameraOpen && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
          <div className="camera-box" style={{position: 'relative', background:'#fff', padding:20, borderRadius:8, width:400, maxWidth:'90%', textAlign:'center'}}>
            
            <button 
                className="btn ghost" 
                style={{ position: 'absolute', top: 10, right: 10, padding: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px' }} 
                onClick={closeCamera}
            >
                <FaTimes />
            </button>

            {submittingPhoto ? (
                <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div className="loader"></div>
                    <p style={{ marginTop: 15, fontWeight: 500, color: "#555", fontSize: "18px" }}>Submitting attendance...</p>
                    <p style={{ fontSize: 14, color: "#888" }}>Please wait...</p>
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

    <ProfilePanel user={user} token={token} api={api} isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}