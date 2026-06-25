import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import Sidebar from "./Sidebar";
import AnnouncementNotifications from "./AnnouncementNotifications";
import ErrorBoundary from "./ErrorBoundary";
import { SkeletonTable } from "./Skeleton";
import { RATING_SCALE, getRatingInfo } from "../constants";
import useChatUnread from "./useChatUnread";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { getCurrentLocation } from "../utils/geolocation";

const Chat                = lazy(() => import("./Chat"));
const HolidayCalendar     = lazy(() => import("./HolidayCalendar"));
const EmployeeLMS         = lazy(() => import("./EmployeeLMS"));
const EmployeeCareer      = lazy(() => import("./EmployeeCareer"));
const EmployeePayroll     = lazy(() => import("./EmployeePayroll"));
const AdminPayroll        = lazy(() => import("./AdminPayroll"));
const AdminLeavePage      = lazy(() => import("./AdminLeavePage"));
const AdminAttendancePage = lazy(() => import("./AdminAttendancePage"));

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
  FaLaptop,
  FaBars,
  FaGift,
  FaGraduationCap,
  FaBriefcase,
} from "react-icons/fa";
import ProfilePanel from "./ProfilePanel";
import DailyQuote from "./DailyQuote";
import DailyWorkPlan from "./DailyWorkPlan";
import ChatBot from "./ChatBot";

const WorkAnalytics = lazy(() => import("./WorkAnalytics"));
const WorkHistory   = lazy(() => import("./WorkHistory"));
const AdminLMS      = lazy(() => import("./AdminLMS"));

// ─── Daily Motivational Quote (unused — kept for reference) ───────────────────
const _UNUSED_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "What you get by achieving your goals is not as important as what you become.", author: "Henry David Thoreau" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Your limitation — it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
  { text: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
  { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
  { text: "Dream bigger. Do bigger.", author: "Unknown" },
  { text: "You are stronger than you think.", author: "Unknown" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "Be so good they can't ignore you.", author: "Steve Martin" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Talent wins games, but teamwork wins championships.", author: "Michael Jordan" },
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
  { text: "Coming together is a beginning, staying together is progress, working together is success.", author: "Henry Ford" },
  { text: "The strength of the team is each individual member. The strength of each member is the team.", author: "Phil Jackson" },
  { text: "No matter how many mistakes you make or how slow you progress, you are still way ahead of everyone who isn't trying.", author: "Tony Robbins" },
  { text: "Take risks: if you win, you will be happy; if you lose, you will be wise.", author: "Unknown" },
  { text: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
  { text: "Invest in yourself. Your career is the engine of your wealth.", author: "Paul Clitheroe" },
  { text: "Excellence is not a skill. It is an attitude.", author: "Ralph Marston" },
  { text: "The road to success and the road to failure are almost exactly the same.", author: "Colin R. Davis" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.", author: "Steve Jobs" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
  { text: "Too many of us are not living our dreams because we are living our fears.", author: "Les Brown" },
  { text: "Definiteness of purpose is the starting point of all achievement.", author: "W. Clement Stone" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "You become what you believe.", author: "Oprah Winfrey" },
  { text: "The most common way people give up their power is by thinking they don't have any.", author: "Alice Walker" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did.", author: "Mark Twain" },
  { text: "Life is not measured by the number of breaths we take, but by the moments that take our breath away.", author: "Maya Angelou" },
  { text: "If life were predictable, it would cease to be life and be without flavor.", author: "Eleanor Roosevelt" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
  { text: "If you look at what you have in life, you'll always have more.", author: "Oprah Winfrey" },
  { text: "If you want to live a happy life, tie it to a goal, not to people or things.", author: "Albert Einstein" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
  { text: "Money and success don't change people; they merely amplify what is already there.", author: "Will Smith" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Not how long, but how well you have lived is the main thing.", author: "Seneca" },
  { text: "We must be willing to let go of the life we planned so as to have the life that is waiting for us.", author: "Joseph Campbell" },
  { text: "If you are not willing to risk the usual, you will have to settle for the ordinary.", author: "Jim Rohn" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "You have brains in your head. You have feet in your shoes. You can steer yourself in any direction you choose.", author: "Dr. Seuss" },
  { text: "Speak softly and carry a big stick; you will go far.", author: "Theodore Roosevelt" },
  { text: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "I would rather die of passion than of boredom.", author: "Vincent van Gogh" },
  { text: "If opportunity doesn't knock, build a door.", author: "Milton Berle" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
  { text: "Every child is an artist. The problem is how to remain an artist once we grow up.", author: "Pablo Picasso" },
  { text: "You can never cross the ocean until you have the courage to lose sight of the shore.", author: "Christopher Columbus" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "Whether you think you can or think you can't, you're right.", author: "Henry Ford" },
  { text: "The two most important days in your life are the day you are born and the day you find out why.", author: "Mark Twain" },
  { text: "Whatever the mind of man can conceive and believe, it can achieve.", author: "Napoleon Hill" },
  { text: "Eighty percent of success is showing up.", author: "Woody Allen" },
  { text: "I didn't fail the test. I just found 100 ways to do it wrong.", author: "Benjamin Franklin" },
  { text: "In order to succeed, your desire for success should be greater than your fear of failure.", author: "Bill Cosby" },
  { text: "A journey of a thousand miles must begin with a single step.", author: "Lao Tzu" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Things work out best for those who make the best of how things work out.", author: "John Wooden" },
  { text: "To live a creative life, we must lose our fear of being wrong.", author: "Joseph Chilton Pearce" },
  { text: "If you are not willing to risk the usual, you will have to settle for the ordinary.", author: "Jim Rohn" },
  { text: "Trust yourself. You know more than you think you do.", author: "Benjamin Spock" },
  { text: "What's money? A man is a success if he gets up in the morning and goes to bed at night and in between does what he wants to do.", author: "Bob Dylan" },
];

function _UnusedDailyQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const quote = _UNUSED_QUOTES[dayOfYear % _UNUSED_QUOTES.length];

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: "linear-gradient(135deg, #fff5f5 0%, #ffffff 60%, #fafcff 100%)",
      border: "1px solid #fee2e2",
      borderLeft: "4px solid var(--red)",
      borderRadius: 12,
      padding: "18px 22px 16px 24px",
      marginBottom: 0,
    }}>
      {/* Decorative large quote mark */}
      <span style={{
        position: "absolute", top: -2, left: 14,
        fontSize: 72, lineHeight: 1, color: "var(--red)", opacity: 0.08,
        fontFamily: "Georgia, serif", fontWeight: 900, userSelect: "none",
        pointerEvents: "none",
      }}>
        "
      </span>

      <div style={{ position: "relative" }}>
        <div style={{
          fontSize: 13.5, lineHeight: 1.65, color: "#1e293b",
          fontStyle: "italic", fontWeight: 500,
          marginBottom: 10,
        }}>
          "{quote.text}"
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            display: "inline-block", width: 20, height: 1.5,
            background: "var(--red)", borderRadius: 2, opacity: 0.6, flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: "0.02em" }}>
            {quote.author}
          </span>
        </div>
      </div>
    </div>
  );
}

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
  const chatUnread = useChatUnread(token, api);
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [birthdayDismissed, setBirthdayDismissed] = useState(false);
  
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
  const [submittingLeave, setSubmittingLeave] = useState(false);
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
  const [pmsAcknowledging, setPmsAcknowledging] = useState(false);
  
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
      // silent fail — dashboard shows stale/empty state
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

  useEffect(() => {
    const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
    fetch(`${baseUrl}/api/notifications/birthdays`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setTodayBirthdays(data); })
      .catch(() => {});
  }, [token, api]);

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
      // Best-effort geo-location (won't block check-in if denied/unavailable)
      const location = await getCurrentLocation();
      if (actionType === "checkin") {
        await api.checkinWithPhoto(token, imageData, location);
      } else {
        await api.checkoutWithPhoto(token, imageData, location);
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

  async function acknowledgeReview(reviewId) {
      setPmsAcknowledging(true);
      try {
          const res = await fetch(`${api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app'}/api/pms/acknowledge`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ review_id: reviewId })
          });
          if (res.ok) {
              setPmsModalOpen(false);
              setSelectedPms(null);
              await load();
              alert("Review acknowledged successfully!");
          } else {
              alert("Failed to acknowledge review.");
          }
      } catch { alert("Network error. Please try again."); }
      finally { setPmsAcknowledging(false); }
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
    if (submittingLeave) return;
    setSubmittingLeave(true);
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

      alert("Leave applied successfully!");
      setView("my-leaves");
      load(); // refresh in the background — don't block the success feedback
    } catch (err) {
      alert("Error applying leave: " + (err.message || "An unknown error occurred."));
    } finally {
      setSubmittingLeave(false);
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
      if (view === "delegated-leaves" || view === "delegated-attendance" || view === "delegated-lms") {
          setView("special-access");
      } else {
          setView("dashboard");
      }
  };

  // Which modules has this employee been granted? (legacy grants default to attendance)
  const grantedModule = (mod) => Array.isArray(delegatedGrants) && delegatedGrants.some(g => (g.module || "attendance") === mod);

  const getStatusClass = (status) => (status ? status.toLowerCase() : "pending");

  // QuickLaunchItem and StatItem are defined above the component for performance

  // ============================================================================
  // MAIN RENDER METHOD
  // ============================================================================
  const dismissedAnn = (() => {
    try { return new Set(JSON.parse(localStorage.getItem(`dismissed_ann_${user?._id || "guest"}`) || "[]")); }
    catch { return new Set(); }
  })();
  const hasNewAnnouncements = Array.isArray(announcements) && announcements.some(a => !dismissedAnn.has(a._id));

  return (
    <>
    <div className="app-shell">
      <Sidebar
        role="employee"
        user={user}
        view={view}
        setView={setView}
        onLogout={onLogout}
        navBadges={{ chat: chatUnread }}
        navDots={{ announcements: hasNewAnnouncements }}
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
            <button className="topbar-profile-btn" onClick={() => setProfileOpen(true)}>
              <div className="topbar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
              <span className="topbar-user-name">{user?.name}</span>
            </button>
          </div>
        </div>
        <div className="main-content">
      <Suspense fallback={<div style={{ marginTop: 16 }}><SkeletonTable rows={6} cols={3} /></div>}>
      {/*
        ========================================================================
        EXPANDED CSS STYLING
        Expanded to multi-line format for superior readability and maintenance.
        ========================================================================
      */}
      <style>{`
        .qa-box { margin-bottom: 12px; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid var(--brand); transition: background 0.15s; }
        .qa-box:hover { background: #fff; }
        .password-input-wrapper { position: relative; display: flex; align-items: center; margin-bottom: 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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
                        <PasswordStrengthMeter password={newPassword} />
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
        </div>
      )}

      {/* — Header — */}
      {view === "dashboard" ? (
        <div className="dashboard-header-card card">
          <h2 style={{ color: "var(--red)", margin: 0 }}>My Dashboard</h2>
          <p className="small">Manage your attendance and leaves</p>
          
          {/* Highlight special permissions prominently on the dashboard header */}
          {Array.isArray(delegatedGrants) && delegatedGrants.length > 0 && (
             <div style={{ marginTop: 10, display: 'inline-block', background: 'var(--brand-light)', color: 'var(--brand)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
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

      {/* — Daily Quote — */}
      {view === "dashboard" && <DailyQuote />}

      {/* — Daily Work Plan — */}
      {view === "dashboard" && <DailyWorkPlan token={token} user={user} />}

      {/* — Dashboard Widgets — */}
      {view === "dashboard" && (
        <div className="dashboard-grid-container">
          <div className="card dashboard-widget">
            <h4 className="widget-title">Quick Actions</h4>
            <div className="quick-launch-grid">
              <QuickLaunchItem icon={<FaCamera />} label="Check In" onClick={() => openCamera("checkin")} />
              <QuickLaunchItem icon={<FaSignOutAlt />} label="Check Out" onClick={() => openCamera("checkout")} />
              <QuickLaunchItem icon={<FaCalendarPlus />} label="Apply Leave" onClick={() => setView("apply-leave")} />
              <QuickLaunchItem icon={<FaChartLine />} label="PMS Eval" onClick={() => setView("pms")} />
              <QuickLaunchItem icon={<FaCalendarCheck />} label="My Leaves" onClick={() => setView("my-leaves")} />
              <QuickLaunchItem icon={<FaHistory />} label="Attendance Log" onClick={() => setView("attendance-log")} />
              <QuickLaunchItem icon={<FaCalendarAlt />} label="Holidays" onClick={() => setView("holidays")} />
              <QuickLaunchItem icon={<FaBullhorn />} label="Announcements" onClick={() => setView("announcements")} />
              <QuickLaunchItem icon={<FaLaptop />} label="Request Asset" onClick={() => setView("assets")} />
              <QuickLaunchItem icon={<FaGraduationCap />} label="My Courses" onClick={() => setView("lms")} />
              <QuickLaunchItem icon={<FaBriefcase />} label="Career" onClick={() => setView("career")} />
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
              />
              {Array.isArray(delegatedGrants) && delegatedGrants.length > 0 && (
                <QuickLaunchItem icon={<FaUserShield />} label="Special Access" onClick={() => setView("special-access")} badgeCount={delegatedGrants.length} />
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

      {/* — Asset Requests — */}
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
                      <button className="btn" type="submit">
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

      {/* — Delegated Admin Portal — */}
      {view === "special-access" && (
         <div className="card" style={{ marginTop: "16px" }}>
            <h2 style={{ color: 'var(--red)', marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaUserShield /> Temporary Admin Portal
            </h2>
            <p style={{ color: '#666', marginBottom: 30 }}>
                You have been granted temporary administrative permissions. Select an action below to proceed.
            </p>

            <div className="quick-launch-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {grantedModule("attendance") && <QuickLaunchItem icon={<FaClipboardList />} label="Manage Leave Approvals" onClick={() => setView("delegated-leaves")} />}
                {grantedModule("attendance") && <QuickLaunchItem icon={<FaHistory />} label="Manage Daily Attendance" onClick={() => setView("delegated-attendance")} />}
                {grantedModule("lms") && <QuickLaunchItem icon={<FaGraduationCap />} label="Manage LMS Courses" onClick={() => setView("delegated-lms")} />}
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

      {view === "delegated-lms" && (
         <div style={{ marginTop: "16px" }}>
            <div className="delegation-alert">
               🛡️ You are managing LMS Courses using temporary Delegated Access — you can create courses and assign them.
            </div>
            <ErrorBoundary label="LMS" resetKey={view}>
              <AdminLMS token={token} employees={[]} departments={[]} />
            </ErrorBoundary>
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

      {/* — PMS Self-Evaluation — */}
      {view === "pms" && (() => {
        const totalQuestions = pmsTemplate?.sessions?.reduce((s, sess) => s + (sess.questions?.length || 0), 0) || 0;
        const answeredQuestions = Object.keys(pmsResponses).length;
        const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

        return (
          <div style={{maxWidth: 900, margin: '0 auto'}}>

            {/* Header */}
            <div className="card" style={{marginBottom:16}}>
              <div style={{display:'flex', alignItems:'center', gap:14, marginBottom: pmsTemplate?.cycle_name || pmsTemplate?.due_date ? 16 : 0}}>
                <div style={{width:46, height:46, borderRadius:12, background:'linear-gradient(135deg, var(--red), #f97316)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <FaChartLine color="#fff" size={20} />
                </div>
                <div style={{flex:1}}>
                  <h3 style={{margin:0, fontSize:20, color:'#0f172a'}}>Performance Self-Evaluation</h3>
                  <p style={{margin:0, fontSize:13, color:'#64748b'}}>Reflect honestly on your work — your responses are reviewed by your manager</p>
                </div>
              </div>
              {(pmsTemplate?.cycle_name || pmsTemplate?.due_date) && (
                <div style={{display:'flex', gap:16, flexWrap:'wrap', padding:'12px 16px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0'}}>
                  {pmsTemplate.cycle_name && (
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <FaClipboardList style={{color:'var(--red)', fontSize:12}} />
                      <span style={{fontSize:13, color:'#0f172a', fontWeight:600}}>{pmsTemplate.cycle_name}</span>
                    </div>
                  )}
                  {pmsTemplate.due_date && (
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <FaCalendarAlt style={{color:'#f59e0b', fontSize:12}} />
                      <span style={{fontSize:13, color:'#64748b'}}>Due: <strong style={{color:'#0f172a'}}>{new Date(pmsTemplate.due_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!pmsTemplate || !pmsTemplate.sessions || pmsTemplate.sessions.length === 0 ? (
              <div className="card" style={{textAlign:'center', padding:'50px 20px', color:'#94a3b8'}}>
                <FaClipboardList size={40} style={{marginBottom:14, opacity:0.3}} />
                <div style={{fontSize:16, fontWeight:500}}>No active evaluation available</div>
                <div style={{fontSize:13, marginTop:6}}>Your manager hasn't assigned an evaluation form for this period yet.</div>
              </div>
            ) : (
              <>
                {/* Progress Bar */}
                {totalQuestions > 0 && (
                  <div className="card" style={{marginBottom:16, padding:'14px 18px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                      <span style={{fontSize:13, color:'#475569', fontWeight:600}}>Completion Progress</span>
                      <span style={{fontSize:13, fontWeight:700, color: progressPct === 100 ? '#22c55e' : 'var(--red)'}}>{answeredQuestions}/{totalQuestions} answered · {progressPct}%</span>
                    </div>
                    <div style={{height:8, background:'#f1f5f9', borderRadius:99, overflow:'hidden'}}>
                      <div style={{height:'100%', borderRadius:99, width:`${progressPct}%`, background: progressPct === 100 ? '#22c55e' : 'var(--red)', transition:'width 0.4s ease'}} />
                    </div>
                  </div>
                )}

                <form onSubmit={submitPMS}>
                  {pmsTemplate.sessions.map((session, sIdx) => (
                    <div key={sIdx} className="card" style={{marginBottom:14}}>
                      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:12, borderBottom:'2px solid #fecaca'}}>
                        <div style={{width:30, height:30, borderRadius:8, background:'var(--red)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0}}>
                          {sIdx + 1}
                        </div>
                        <div style={{flex:1}}>
                          <h4 style={{margin:0, color:'#0f172a', fontSize:16}}>{session.name}</h4>
                        </div>
                        {session.weight && (
                          <span style={{fontSize:11, padding:'3px 10px', borderRadius:20, background:'#fef2f2', color:'var(--red)', border:'1px solid #fecaca', fontWeight:700}}>{session.weight}%</span>
                        )}
                      </div>

                      {session.questions.map((q, qIdx) => {
                        const responseKey = `${sIdx}_${qIdx}`;
                        const currentScore = parseInt(pmsResponses[responseKey]?.self_score) || null;
                        const isAnswered = pmsResponses[responseKey]?.self_score || pmsResponses[responseKey]?.descriptive_answer;

                        return (
                          <div key={qIdx} style={{padding:16, background: isAnswered ? '#f0fdf4' : '#fafafa', borderRadius:10, border:`1px solid ${isAnswered ? '#bbf7d0' : '#e2e8f0'}`, marginBottom:12, transition:'all 0.2s'}}>
                            <div style={{display:'flex', alignItems:'flex-start', gap:8, marginBottom:14}}>
                              <div style={{width:20, height:20, borderRadius:4, background: isAnswered ? '#22c55e' : '#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1}}>
                                {isAnswered ? <FaCheckCircle color="#fff" size={11} /> : <span style={{fontSize:11, color:'#64748b', fontWeight:600}}>{qIdx+1}</span>}
                              </div>
                              <label style={{fontSize:14, color:'#1e293b', fontWeight:500, lineHeight:1.5}}>{q.text}</label>
                            </div>

                            {q.type === 'scale' && (
                              <div style={{marginBottom:14}}>
                                <div style={{fontSize:11, color:'#64748b', fontWeight:600, marginBottom:10}}>SELECT YOUR RATING</div>
                                <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:8}}>
                                  {RATING_SCALE.map(r => (
                                    <button key={r.value} type="button"
                                      onClick={() => handlePmsChange(sIdx, session.name, qIdx, q.text, 'self_score', r.value)}
                                      style={{
                                        padding:'10px 14px', borderRadius:10, border:'2px solid',
                                        borderColor: currentScore === r.value ? r.color : '#e2e8f0',
                                        background: currentScore === r.value ? r.color : '#fff',
                                        color: currentScore === r.value ? '#fff' : '#475569',
                                        cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                                        display:'flex', flexDirection:'column', alignItems:'center', gap:2, minWidth:52
                                      }}>
                                      <span style={{fontSize:16, fontWeight:700}}>{r.value}</span>
                                    </button>
                                  ))}
                                </div>
                                {currentScore && (
                                  <div style={{fontSize:12, color: getRatingInfo(currentScore)?.color, fontWeight:600, display:'flex', alignItems:'center', gap:6}}>
                                    <div style={{width:8, height:8, borderRadius:'50%', background: getRatingInfo(currentScore)?.color}} />
                                    {getRatingInfo(currentScore)?.label}
                                  </div>
                                )}
                              </div>
                            )}

                            {q.type === 'descriptive' && (
                              <textarea className="modern-input" style={{minHeight:90, resize:'vertical', marginBottom:10}}
                                placeholder="Provide a detailed, honest assessment..."
                                value={pmsResponses[responseKey]?.descriptive_answer || ""}
                                onChange={e => handlePmsChange(sIdx, session.name, qIdx, q.text, 'descriptive_answer', e.target.value)}
                                required
                              />
                            )}

                            {q.type === 'goals' && (
                              <textarea className="modern-input" style={{minHeight:90, resize:'vertical', marginBottom:10}}
                                placeholder="Describe your goals, achievements, and what you aim to accomplish..."
                                value={pmsResponses[responseKey]?.descriptive_answer || ""}
                                onChange={e => handlePmsChange(sIdx, session.name, qIdx, q.text, 'descriptive_answer', e.target.value)}
                                required
                              />
                            )}

                            <input type="text" className="modern-input"
                              style={{background:'transparent', borderStyle:'dashed', fontSize:12}}
                              placeholder="Optional: Add context or remarks for this response..."
                              value={pmsResponses[responseKey]?.remarks || ""}
                              onChange={e => handlePmsChange(sIdx, session.name, qIdx, q.text, 'remarks', e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  <div style={{display:'flex', justifyContent:'flex-end', paddingBottom:20}}>
                    <button type="submit" className="btn" style={{padding:'14px 40px', fontSize:15, borderRadius:12, background:'linear-gradient(135deg, var(--red), #dc2626)', border:'none', display:'flex', alignItems:'center', gap:8}}>
                      {loading ? 'Submitting...' : <><FaCheckCircle /> Submit Evaluation</>}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* PMS History */}
            <div className="card" style={{marginTop:8}}>
              <h4 style={{margin:'0 0 14px', color:'#0f172a', display:'flex', alignItems:'center', gap:8}}>
                <FaHistory style={{color:'var(--red)'}} /> My Evaluation History
              </h4>
              {pmsHistory.length === 0 ? (
                <div style={{textAlign:'center', padding:24, color:'#94a3b8', border:'1px dashed #e2e8f0', borderRadius:8}}>No evaluation history yet.</div>
              ) : (
                <div style={{display:'grid', gap:10}}>
                  {pmsHistory.map(p => {
                    const isCompleted = p.status === 'Manager Review Completed';
                    const isAcknowledged = p.acknowledged_by_employee;
                    return (
                      <div key={p._id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background: isCompleted ? '#f0fdf4' : '#fffbeb', border:`1px solid ${isCompleted ? '#bbf7d0' : '#fde68a'}`, borderRadius:10, gap:12, flexWrap:'wrap'}}>
                        <div style={{display:'flex', alignItems:'center', gap:12}}>
                          <div style={{width:36, height:36, borderRadius:8, background: isCompleted ? '#22c55e' : '#f59e0b', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                            {isCompleted ? <FaCheckCircle size={14}/> : <FaHourglassHalf size={14}/>}
                          </div>
                          <div>
                            <div style={{fontWeight:600, color:'#0f172a', fontSize:14}}>{p.cycle_name ? `${p.cycle_name} · ` : ''}{p.month}</div>
                            <div style={{fontSize:12, color:'#64748b', marginTop:2}}>
                              {isCompleted ? (p.overall_rating || 'Completed') : 'Awaiting Manager Review'}
                            </div>
                          </div>
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                          {isCompleted && !isAcknowledged && (
                            <span style={{fontSize:11, padding:'3px 10px', borderRadius:20, background:'#fff7ed', color:'#92400e', border:'1px solid #fcd34d', fontWeight:600}}>
                              Acknowledgment Pending
                            </span>
                          )}
                          {isCompleted && isAcknowledged && (
                            <span style={{fontSize:11, padding:'3px 10px', borderRadius:20, background:'#f0fdf4', color:'#166534', border:'1px solid #86efac', fontWeight:600, display:'flex', alignItems:'center', gap:4}}>
                              <FaCheckCircle size={9}/> Acknowledged
                            </span>
                          )}
                          <button style={{padding:'7px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5}} onClick={() => viewPMS(p)}>
                            <FaEye size={11}/> View
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* — Correction Request — */}
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

      {/* — Apply Leave — */}
      {submittingLeave && (
        <div className="modal-overlay" style={{ zIndex: 5000 }}>
          <div className="modal-box" style={{ maxWidth: 320, textAlign: "center", padding: "32px 28px" }}>
            <div className="loader" style={{ margin: "0 auto 16px" }} />
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>Submitting your leave request…</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 5 }}>Please wait a moment.</div>
          </div>
        </div>
      )}

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
              <button className="btn" type="submit" disabled={submittingLeave} style={{padding: "10px 24px", display:'flex', alignItems:'center', gap:8}}>
                {submittingLeave && <span className="btn-spinner" />}
                {submittingLeave ? "Submitting…" : "Submit Request"}
              </button>
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

      {/* — Attendance Log — */}
      {view === "attendance-log" && (
        <div className="card" style={{ marginTop: 16, padding:0, overflow:"hidden" }}>
           {loading ? <SkeletonTable rows={6} cols={3} /> : (
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

      {/* — Holidays & Modals — */}
      {view === "chat"    && <ErrorBoundary label="Messages" resetKey={view}><Chat token={token} api={api} user={user} /></ErrorBoundary>}
      {view === "holidays" && <div style={{ marginTop: "16px" }}><HolidayCalendar /></div>}
      {view === "lms"     && <ErrorBoundary label="My Courses" resetKey={view}><EmployeeLMS token={token} /></ErrorBoundary>}
      {view === "career"  && <ErrorBoundary label="Career" resetKey={view}><EmployeeCareer token={token} user={user} /></ErrorBoundary>}
      {view === "work-analytics" && <ErrorBoundary label="My Work Analytics" resetKey={view}><WorkAnalytics token={token} /></ErrorBoundary>}
      {view === "work-history"   && <ErrorBoundary label="Work History" resetKey={view}><WorkHistory token={token} user={user} /></ErrorBoundary>}
      {view === "payroll" && <ErrorBoundary label="Payroll" resetKey={view}>
        {user?.department?.toLowerCase().includes("account")
          ? <AdminPayroll token={token} />
          : <EmployeePayroll token={token} />}
      </ErrorBoundary>}

      {leaveModalOpen && (
        <div className="modal-overlay" onClick={() => setLeaveModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15, borderBottom:'1px solid #f1f5f9', paddingBottom:12}}>
              <h3 style={{ margin: 0, color: 'var(--brand)' }}>{modalTitle}</h3>
              <button
                onClick={() => setLeaveModalOpen(false)}
                style={{ background:'#f1f5f9', border:'none', cursor:'pointer', color:'#64748b', width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
              ><FaTimes size={13} /></button>
            </div>
            <div style={{overflowY:'auto', flex:1}}>
               {modalList.length === 0 ? (
                  <div style={{textAlign:'center', padding:'30px 0', color:'#94a3b8', fontSize:13}}>No records found.</div>
               ) : modalList.map((l) => (
                  <div key={l._id} style={{padding:'12px 4px', borderBottom:'1px solid #f4f6f8'}}>
                    <div style={{fontWeight:600, color:'#0f172a'}}>{l.date || l.from_date}</div>
                    <div style={{fontSize:13, color:'#64748b', margin:'3px 0 6px'}}>"{l.reason || "No reason"}"</div>
                    <span className={`status-badge ${getStatusClass(l.status)}`}>{l.status || 'Pending'}</span>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- PMS DETAILS MODAL — WORLD CLASS DESIGN --- */}
      {pmsModalOpen && selectedPms && (() => {
        const isCompleted = selectedPms.status === 'Manager Review Completed';
        const scaleResps = selectedPms.responses?.filter(r => r.self_score) || [];
        const selfAvg = scaleResps.length > 0
          ? (scaleResps.reduce((s, r) => s + parseFloat(r.self_score || 0), 0) / scaleResps.length).toFixed(1)
          : null;
        const mgrScoresArr = selectedPms.manager_scores || [];
        const mgrAvg = mgrScoresArr.length > 0
          ? (mgrScoresArr.reduce((s, m) => s + parseFloat(m.score || 0), 0) / mgrScoresArr.length).toFixed(1)
          : null;

        return (
          <div className="modal-overlay" onClick={() => setPmsModalOpen(false)}>
            <div className="modal-card large" onClick={e => e.stopPropagation()} style={{padding:0, display:'flex', flexDirection:'column', maxHeight:'90vh'}}>

              {/* Modal Header */}
              <div style={{padding:'20px 24px', borderBottom:'1px solid #e2e8f0', background: isCompleted ? '#f0fdf4' : '#fffbeb', flexShrink:0}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontSize:11, fontWeight:700, color: isCompleted ? '#166534' : '#92400e', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4}}>
                      {isCompleted ? 'Review Completed' : 'Pending Manager Review'}
                    </div>
                    <h3 style={{margin:0, fontSize:19, color:'#0f172a'}}>My Performance Review</h3>
                    <div style={{fontSize:13, color:'#64748b', marginTop:3}}>
                      {selectedPms.cycle_name ? `${selectedPms.cycle_name} · ` : ''}{selectedPms.month}
                    </div>
                  </div>
                  <button style={{background:'#f1f5f9', border:'none', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569'}} onClick={() => setPmsModalOpen(false)}>
                    <FaTimes size={15}/>
                  </button>
                </div>

                {/* Score Summary */}
                {(selfAvg || mgrAvg) && (
                  <div style={{display:'flex', gap:14, marginTop:12, flexWrap:'wrap'}}>
                    {selfAvg && (
                      <div style={{background:'rgba(255,255,255,0.75)', borderRadius:8, padding:'8px 14px', border:'1px solid #e2e8f0'}}>
                        <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>My Avg Score</div>
                        <div style={{fontSize:18, fontWeight:700, color:'#1d4ed8'}}>{selfAvg}<span style={{fontSize:12, color:'#94a3b8'}}>/5</span></div>
                      </div>
                    )}
                    {mgrAvg && (
                      <div style={{background:'rgba(255,255,255,0.75)', borderRadius:8, padding:'8px 14px', border:'1px solid #e2e8f0'}}>
                        <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Manager Avg</div>
                        <div style={{fontSize:18, fontWeight:700, color:'#7e22ce'}}>{mgrAvg}<span style={{fontSize:12, color:'#94a3b8'}}>/5</span></div>
                      </div>
                    )}
                    {selectedPms.overall_rating && (
                      <div style={{background:'rgba(255,255,255,0.75)', borderRadius:8, padding:'8px 14px', border:'1px solid #e2e8f0'}}>
                        <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Overall Rating</div>
                        <div style={{fontSize:14, fontWeight:700, color:'#166534'}}>{selectedPms.overall_rating}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scrollable Body */}
              <div style={{overflowY:'auto', padding:'20px 24px', flex:1}}>

                {/* Manager Feedback Summary */}
                {selectedPms.manager_feedback && (
                  <div style={{padding:16, background:'#fef2f2', borderRadius:10, border:'1px solid #fecaca', marginBottom:18}}>
                    <div style={{fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6}}>MANAGER FEEDBACK</div>
                    <p style={{margin:0, fontSize:13, color:'#450a0a', whiteSpace:'pre-wrap', lineHeight:1.6}}>{selectedPms.manager_feedback}</p>
                  </div>
                )}

                {/* Development Plan */}
                {selectedPms.development_plan && (
                  <div style={{padding:16, background:'#f5f3ff', borderRadius:10, border:'1px solid #e9d5ff', marginBottom:18}}>
                    <div style={{fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6}}>DEVELOPMENT PLAN</div>
                    <p style={{margin:0, fontSize:13, color:'#3b0764', whiteSpace:'pre-wrap', lineHeight:1.6}}>{selectedPms.development_plan}</p>
                  </div>
                )}

                {/* Responses Breakdown */}
                {(!selectedPms.responses || selectedPms.responses.length === 0) ? (
                  <div style={{textAlign:'center', padding:30, color:'#94a3b8'}}>No response details available.</div>
                ) : (
                  Object.entries(getGroupedResponses()).map(([sessionName, responsesInSession], sessionIndex) => (
                    <div key={sessionIndex} style={{marginBottom:24}}>
                      <div style={{paddingBottom:8, marginBottom:12, borderBottom:'2px solid #fecaca'}}>
                        <h5 style={{margin:0, color:'var(--red)', fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em'}}>{sessionName}</h5>
                      </div>
                      {responsesInSession.map((resp, idx) => {
                        const mgrScoreObj = selectedPms.manager_scores?.find(m => m.question === resp.question);
                        const mgrCommentObj = selectedPms.manager_comments?.find(m => m.question === resp.question);
                        const selfScoreNum = parseInt(resp.self_score);
                        const mgrScoreNum = mgrScoreObj ? parseInt(mgrScoreObj.score) : null;

                        return (
                          <div key={idx} style={{marginBottom:12, padding:16, background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', borderLeft:'4px solid var(--red)'}}>
                            <div style={{fontWeight:600, color:'#1e293b', fontSize:13, marginBottom:12}}>{resp.question}</div>

                            {resp.self_score && (
                              <div style={{display:'flex', gap:16, flexWrap:'wrap', marginBottom: mgrCommentObj?.comment ? 12 : 0}}>
                                {/* Self Score */}
                                <div style={{minWidth:120}}>
                                  <div style={{fontSize:10, color:'#64748b', fontWeight:600, marginBottom:5}}>MY RATING</div>
                                  {selfScoreNum > 5 ? (
                                    <span style={{fontWeight:700, fontSize:16, color:'#1d4ed8'}}>{selfScoreNum}/10</span>
                                  ) : (
                                    <div>
                                      <div style={{display:'flex', gap:3, marginBottom:3}}>
                                        {RATING_SCALE.map(r => (
                                          <div key={r.value} style={{width:22, height:22, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', background: r.value <= selfScoreNum ? r.color : '#f1f5f9', color: r.value <= selfScoreNum ? '#fff' : '#94a3b8', fontSize:11, fontWeight:700}}>
                                            {r.value}
                                          </div>
                                        ))}
                                      </div>
                                      {getRatingInfo(selfScoreNum) && <div style={{fontSize:10, color: getRatingInfo(selfScoreNum).color, fontWeight:600}}>{getRatingInfo(selfScoreNum).label}</div>}
                                    </div>
                                  )}
                                </div>

                                {/* Manager Score */}
                                {mgrScoreObj && (
                                  <div style={{minWidth:120}}>
                                    <div style={{fontSize:10, color:'#64748b', fontWeight:600, marginBottom:5}}>MANAGER RATING</div>
                                    {mgrScoreNum > 5 ? (
                                      <span style={{fontWeight:700, fontSize:16, color:'var(--red)'}}>{mgrScoreNum}/10</span>
                                    ) : (
                                      <div>
                                        <div style={{display:'flex', gap:3, marginBottom:3}}>
                                          {RATING_SCALE.map(r => (
                                            <div key={r.value} style={{width:22, height:22, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', background: r.value <= mgrScoreNum ? r.color : '#f1f5f9', color: r.value <= mgrScoreNum ? '#fff' : '#94a3b8', fontSize:11, fontWeight:700}}>
                                              {r.value}
                                            </div>
                                          ))}
                                        </div>
                                        {getRatingInfo(mgrScoreNum) && <div style={{fontSize:10, color: getRatingInfo(mgrScoreNum).color, fontWeight:600}}>{getRatingInfo(mgrScoreNum).label}</div>}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {resp.descriptive_answer && (
                              <div style={{marginBottom:10}}>
                                <div style={{fontSize:10, color:'#64748b', fontWeight:600, marginBottom:5}}>MY ANSWER</div>
                                <div style={{background:'#f8fafc', padding:10, borderRadius:6, border:'1px solid #e2e8f0', fontSize:13, whiteSpace:'pre-wrap', lineHeight:1.6}}>{resp.descriptive_answer}</div>
                              </div>
                            )}

                            {resp.remarks && (
                              <div style={{fontSize:12, color:'#475569', background:'#f1f5f9', padding:'7px 10px', borderRadius:5, borderLeft:'2px solid #94a3b8', marginBottom:10}}>
                                <strong>Remarks:</strong> {resp.remarks}
                              </div>
                            )}

                            {mgrCommentObj?.comment && (
                              <div style={{background:'#fdf4ff', padding:'8px 12px', borderRadius:6, border:'1px solid #e9d5ff', fontSize:12, color:'#6b21a8', borderLeft:'3px solid #a855f7'}}>
                                <strong>Manager's Note:</strong> {mgrCommentObj.comment}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

                {/* Acknowledge Button */}
                {isCompleted && !selectedPms.acknowledged_by_employee && (
                  <div style={{borderTop:'2px solid #e2e8f0', paddingTop:20, marginTop:8, textAlign:'center'}}>
                    <p style={{color:'#64748b', fontSize:13, marginBottom:16}}>
                      Please acknowledge that you have read and understood your performance review.
                    </p>
                    <button className="btn" style={{padding:'12px 32px', fontSize:14, background:'linear-gradient(135deg, #22c55e, #16a34a)', border:'none', borderRadius:10, display:'inline-flex', alignItems:'center', gap:8}}
                      onClick={() => acknowledgeReview(selectedPms._id)}
                      disabled={pmsAcknowledging}>
                      <FaCheckCircle /> {pmsAcknowledging ? 'Acknowledging...' : 'Acknowledge Review'}
                    </button>
                  </div>
                )}

                {isCompleted && selectedPms.acknowledged_by_employee && (
                  <div style={{borderTop:'2px solid #e2e8f0', paddingTop:16, marginTop:8, textAlign:'center'}}>
                    <div style={{display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', background:'#f0fdf4', borderRadius:20, border:'1px solid #86efac', fontSize:13, color:'#166534', fontWeight:600}}>
                      <FaCheckCircle /> Review Acknowledged
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- CAMERA MODAL --- */}
      {cameraOpen && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
          <div className="camera-box" style={{position: 'relative', background:'#fff', padding:20, borderRadius:8, width:400, maxWidth:'90%', textAlign:'center'}}>
            <button className="btn ghost" style={{ position: 'absolute', top: 10, right: 10, padding: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px' }} onClick={closeCamera}>
                <FaTimes />
            </button>
            {submittingPhoto ? (
                <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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
      </Suspense>
        </div>
      </div>
    </div>

    <ProfilePanel user={user} token={token} api={api} isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    <ChatBot token={token} user={user} role="employee" onNavigate={setView} />
    </>
  );
}