import React, { useEffect, useState, useMemo } from "react";
import { resolveAttachmentUrl } from "../utils/security";
import { SkeletonCards, SkeletonTable } from "./Skeleton";
import {
  FaSearch,
  FaFilter,
  FaTimes,
  FaList,
  FaThLarge,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaUserClock,
  FaUserSlash,
  FaMapMarkerAlt,
  FaChartBar,
  FaTrophy,
  FaExclamationTriangle,
  FaUsers,
  FaBuilding,
} from "react-icons/fa";

// Resolve the geo-coordinates (or a place name) from various backend shapes.
// Shows lat,lng as the primary value; falls back to a place name only if no
// coordinates are present.
const locText = (loc) => {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  const lat = loc.lat ?? loc.latitude, lng = loc.lng ?? loc.lon ?? loc.longitude;
  if (lat != null && lng != null) return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  return loc.district || loc.label || loc.city || loc.town || loc.village || loc.state || "";
};
// Tolerate different keys the backend might use for the stored location
const checkinLoc  = (rec) => rec?.checkin?.location  || rec?.checkin_location  || rec?.login_location  || rec?.location_in;
const checkoutLoc = (rec) => rec?.checkout?.location || rec?.checkout_location || rec?.logout_location || rec?.location_out;

// Render a location cell (plain coords / place name, else dash)
const LocationCell = ({ loc, color, label }) => {
  const text = locText(loc);
  if (!text) return <span style={{ color: '#aaa', fontSize: 12 }}>—</span>;
  return (
    <span title={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
      <FaMapMarkerAlt size={10} color={color} /> {text}
    </span>
  );
};

// ============================================================================
// HELPER FUNCTIONS & DATA FORMATTING
// ============================================================================

/**
 * Groups a flat array of attendance records by date for an individual employee.
 * This is used to display a clean table of Check-in vs Check-out times per day.
 * @param {Array} records - The raw attendance records from the API.
 * @returns {Array} - The grouped and chronologically sorted attendance array.
 */
function groupAttendance(records) {
  const groups = {};
  
  // Iterate through records and bucket them by their calendar date
  records.forEach(rec => {
    const date = rec.date;
    if (!groups[date]) {
      groups[date] = {
        checkin: null,
        checkout: null,
        absent: null,
      };
    }
    // Assign the record to the correct type slot (checkin, checkout, or absent)
    groups[date][rec.type] = rec;
  });
  
  // Convert the grouped object back into an array for rendering
  return Object.entries(groups)
    .map(([date, records]) => ({
      date,
      checkin: records.checkin,
      checkout: records.checkout,
      absent: records.absent,
      // Use the latest available time for accurate sorting
      sortTime: new Date(records.checkout?.time || records.checkin?.time || records.absent?.time).getTime()
    }))
    .sort((a, b) => b.sortTime - a.sortTime); // Sort descending (newest first)
}

// ============================================================================
// MAIN COMPONENT EXPORT
// ============================================================================

function StatItem({ icon, label, count, colorClass, onClick, statsLoading }) {
  return (
    <div className="stat-row clickable-stat" style={{ flex: 1, minWidth: '200px' }} onClick={onClick}>
      <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-count">{statsLoading ? "..." : count}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function AdminAttendancePage({ token, api }) {
  // --- Employee Data States ---
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  // --- Master Logs States (COMPLETE VISIBILITY FEATURE) ---
  const [viewMode, setViewMode] = useState("grid"); // Toggles between "grid", "logs", "analyzer"
  const [allAttendanceLogs, setAllAttendanceLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [logDateFilter, setLogDateFilter] = useState(""); // Filter for master logs

  // --- Modal States for Individual Employee Details ---
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // --- Today's Stats States ---
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    not_checked_in: 0,
  });

  // --- Modal State for Clickable Stats (NEWLY ADDED) ---
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailList, setDetailList] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // --- Analyzer State ---
  const [analyzerMonth, setAnalyzerMonth] = useState(new Date().toISOString().slice(0, 7));
  const [analyzerSummary, setAnalyzerSummary] = useState(null);
  const [analyzerLoading, setAnalyzerLoading] = useState(false);
  const [analyzerIdMap, setAnalyzerIdMap] = useState({});   // id -> { name, dept }
  const [analyzerEmpDeptMap, setAnalyzerEmpDeptMap] = useState({}); // id -> dept
  const [expandedDay, setExpandedDay] = useState(null);

  // ============================================================================
  // API DATA FETCHING
  // ============================================================================

  /**
   * 1. Load the overall summary statistics for today.
   */
  async function loadTodayStats() {
    setStatsLoading(true);
    try {
      if (api.todayStats) {
          const res = await api.todayStats(token);
          setStats(res);
      } else {
          // Fallback if todayStats isn't directly bound to the api prop
          const baseUrl = api?.baseUrl || 'https://gdmrconnect-backend-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/admin/today-stats`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) setStats(await res.json());
      }
    } catch (err) {
      console.error("Stats load error:", err);
    } finally {
      setStatsLoading(false);
    }
  }

  /**
   * 2. Load Employee List for the Grid View.
   */
  async function loadEmployees() {
    setLoading(true);
    try {
      const list = await api.listEmployees(token); 
      setEmployees(list);
      setFilteredEmployees(list);
      
      // Extract unique departments for the dropdown filter dynamically
      const depts = ["All", ...new Set(list.map(e => e.department).filter(Boolean))];
      setDepartments(depts);
    } catch (err) {
      console.error("Error loading employees", err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * 3. Load Master Attendance Logs for the Complete View Mode.
   */
  async function loadCompleteLogs() {
    setLoadingLogs(true);
    try {
      // Fetch all attendance records from the admin endpoint
      const logs = await api.adminAttendance(token);
      
      // Sort chronologically (newest first)
      const sortedLogs = logs.sort((a, b) => new Date(b.time) - new Date(a.time));
      setAllAttendanceLogs(sortedLogs);
    } catch (err) {
      console.error("Error loading complete logs", err);
    } finally {
      setLoadingLogs(false);
    }
  }

  /**
   * 4. Load attendance for one specific employee (triggered on card click).
   */
  async function openEmployeeDetails(emp) {
    setSelectedEmp(emp);
    setShowModal(true);
    setLoadingDetails(true);
    setAttendance([]); // clear previous state to avoid flashing old data
    
    try {
      const records = await api.employeeAttendance(emp._id, token);
      setAttendance(groupAttendance(records));
    } catch (err) {
      console.error("Error loading attendance", err);
      alert("Failed to load employee attendance records.");
    } finally {
      setLoadingDetails(false);
    }
  }

  // ============================================================================
  // CLICKABLE STATS LOGIC (NEWLY ADDED)
  // ============================================================================
  
  /**
   * Handles clicks on the Today's Stats widgets to show who is Present/Absent/etc.
   */
  async function handleStatClick(type, title) {
    setDetailTitle(title);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailList([]);

    try {
      const now = new Date();
      const monthStr = now.toISOString().slice(0, 7); 
      
      // Fetch the detailed summary for the current month
      const summaryData = await api.getAttendanceSummary(monthStr, token);
      const todayStr = now.toISOString().slice(0, 10); 
      const todayData = summaryData.days && summaryData.days[todayStr];

      if (todayData && todayData[type]) {
        const listData = todayData[type];
        
        // Enrich the IDs with actual employee details from our loaded employees list
        const enrichedList = listData.map(item => {
            const id = typeof item === 'object' ? item._id : item;
            const empDef = employees.find(e => e._id === id);
            return empDef || (typeof item === 'object' ? item : { name: "Unknown", _id: id, email: "N/A" });
        });
        
        setDetailList(enrichedList);
      } else {
        setDetailList([]); 
      }
    } catch (err) {
      console.error("Error fetching details", err);
      alert("Could not load stat details. Ensure you have the required permissions.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadAnalyzerData(month) {
    setAnalyzerLoading(true);
    try {
      const data = await api.getAttendanceSummary(month, token);
      setAnalyzerSummary(data);
    } catch { /* silent */ } finally { setAnalyzerLoading(false); }
  }

  // ============================================================================
  // EFFECTS & FILTER LOGIC
  // ============================================================================

  // Run initial data fetch on component mount
  useEffect(() => {
    loadTodayStats();
    loadEmployees();
    loadCompleteLogs();
    
    // Auto-set the date filter to today's date for convenience in the logs view
    const today = new Date().toISOString().split('T')[0];
    setLogDateFilter(today);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build id maps once employees load
  useEffect(() => {
    if (!employees.length) return;
    const idM = {}, deptM = {};
    employees.forEach(e => {
      const id = String(e._id || "");
      if (!id) return;
      idM[id] = e.name || "Unknown";
      deptM[id] = Array.isArray(e.department) ? e.department[0] : (e.department || "");
    });
    setAnalyzerIdMap(idM);
    setAnalyzerEmpDeptMap(deptM);
  }, [employees]);

  // Load analyzer data when month changes or tab switches to analyzer
  useEffect(() => {
    if (viewMode === "analyzer") loadAnalyzerData(analyzerMonth);
  }, [viewMode, analyzerMonth]);

  // Filter Logic for Employee Grid View
  useEffect(() => {
    let result = employees;

    if (selectedDept !== "All") {
      result = result.filter(e => e.department === selectedDept);
    }

    if (searchTerm) {
      result = result.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEmployees(result);
  }, [searchTerm, selectedDept, employees]);

  // Filter Logic for Complete Logs View
  const filteredLogs = allAttendanceLogs.filter(log => {
    let matchesSearch = true;
    let matchesDate = true;

    if (searchTerm) {
        matchesSearch = log.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    }

    if (logDateFilter) {
        const logDateStr = new Date(log.time).toISOString().split('T')[0];
        matchesDate = logDateStr === logDateFilter;
    }

    return matchesSearch && matchesDate;
  });

  // ============================================================================
  // UI FORMATTING HELPERS
  // ============================================================================

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timeStr) => {
    if (!timeStr) return "-";
    return new Date(timeStr).toLocaleDateString();
  };
  
  const getStatusDisplay = (rec) => {
      if (rec.absent) return <span className="attendance-indicator leave" style={{color:'red', background:'#fee2e2', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Absent</span>;
      if (rec.checkin && rec.checkout) {
          if (rec.checkin.status_indicator === "Late") return <span style={{color:'#d97706', background:'#fef3c7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Late Check-in</span>;
          if (rec.checkout.status_indicator === "Early") return <span style={{color:'#dc2626', background:'#fee2e2', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Early Checkout</span>;
          return <span style={{color:'#16a34a', background:'#dcfce7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Full Day</span>;
      }
      if (rec.checkin) {
           if (rec.checkin.day_type === "half-day") return <span style={{color:'#16a34a', background:'#dcfce7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Half Day (In)</span>;
           if (rec.checkin.status_indicator === "Late") return <span style={{color:'#d97706', background:'#fef3c7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Late Check-in</span>;
           return <span style={{color:'#16a34a', background:'#dcfce7', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600}}>Checked In</span>;
      }
      return "-";
  };

  // StatItem is defined above the component for performance

  // ============================================================================
  // ANALYZER COMPUTED DATA
  // ============================================================================
  const analyzerData = useMemo(() => {
    if (!analyzerSummary?.days) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayEntries = Object.entries(analyzerSummary.days)
      .filter(([d]) => d <= todayStr)
      .sort(([a], [b]) => a.localeCompare(b));

    const cnt = (v) => Array.isArray(v) ? v.length : (Number(v) || 0);
    const ids = (v) => Array.isArray(v) ? v : [];

    // Resolve id or object to { id, name }
    const resolve = (item) => {
      if (!item) return null;
      if (typeof item === "object") {
        const id = String(item._id || item.id || "");
        const name = item.name || item.employee_name || analyzerIdMap[id] || "Unknown";
        return { id, name };
      }
      const id = String(item);
      return { id, name: analyzerIdMap[id] || id };
    };

    // Per-employee stats
    const empStats = {}; // id -> { name, dept, present, absent, leave, nci }
    const ensure = (id, name) => {
      if (!empStats[id]) empStats[id] = {
        id, name, dept: analyzerEmpDeptMap[id] || "",
        present: 0, absent: 0, leave: 0, nci: 0,
      };
    };

    dayEntries.forEach(([, d]) => {
      [["present", d.present], ["absent", d.absent], ["leave", d.leave], ["nci", d.not_checked_in]].forEach(([cat, arr]) => {
        ids(arr).forEach(item => {
          const r = resolve(item);
          if (!r?.id) return;
          ensure(r.id, r.name);
          empStats[r.id][cat]++;
        });
      });
    });

    // Enrich from employee roster (adds people with zero attendance)
    employees.forEach(e => {
      const id = String(e._id || "");
      if (!id) return;
      if (!empStats[id]) empStats[id] = {
        id, name: e.name, dept: Array.isArray(e.department) ? e.department[0] : (e.department || ""),
        present: 0, absent: 0, leave: 0, nci: 0,
      };
      else {
        empStats[id].name = e.name;
        empStats[id].dept = Array.isArray(e.department) ? e.department[0] : (e.department || "");
      }
    });

    const empList = Object.values(empStats).map(e => {
      const total = e.present + e.absent + e.leave + e.nci;
      return { ...e, total, rate: total > 0 ? Math.round((e.present / total) * 100) : 0 };
    }).sort((a, b) => b.rate - a.rate || b.present - a.present);

    // KPIs
    const workingDays = dayEntries.length;
    const totalPresent = dayEntries.reduce((s, [, d]) => s + cnt(d.present), 0);
    const totalAbsent  = dayEntries.reduce((s, [, d]) => s + cnt(d.absent), 0);
    const totalLeave   = dayEntries.reduce((s, [, d]) => s + cnt(d.leave), 0);
    const totalEmp = analyzerSummary.total_employees || employees.length || 1;
    const avgRate = workingDays > 0 ? Math.round((totalPresent / (workingDays * totalEmp)) * 100) : 0;

    // Department breakdown
    const deptMap = {};
    empList.forEach(e => {
      const d = e.dept || "Unassigned";
      if (!deptMap[d]) deptMap[d] = { dept: d, present: 0, absent: 0, leave: 0, total: 0, members: 0 };
      deptMap[d].present += e.present;
      deptMap[d].absent  += e.absent;
      deptMap[d].leave   += e.leave;
      deptMap[d].total   += e.total;
      deptMap[d].members++;
    });
    const deptList = Object.values(deptMap).map(d => ({
      ...d, rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
    })).sort((a, b) => b.rate - a.rate);

    // Day details (for leave calendar)
    const dayDetails = dayEntries.map(([date, d]) => ({
      date,
      presentNames: ids(d.present).map(resolve).filter(Boolean),
      absentNames:  ids(d.absent).map(resolve).filter(Boolean),
      leaveNames:   ids(d.leave).map(resolve).filter(Boolean),
      nciNames:     ids(d.not_checked_in).map(resolve).filter(Boolean),
      presentCount: cnt(d.present),
      absentCount:  cnt(d.absent),
      leaveCount:   cnt(d.leave),
      nciCount:     cnt(d.not_checked_in),
    }));

    return { empList, deptList, dayDetails, workingDays, totalPresent, totalAbsent, totalLeave, totalEmp, avgRate };
  }, [analyzerSummary, analyzerIdMap, analyzerEmpDeptMap, employees]);

  // ============================================================================
  // COMPONENT RENDER
  // ============================================================================

  return (
    <div>
      <style>{`
        .clickable-stat {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          background: #fff;
          border: 1px solid #eee;
          padding: 15px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .clickable-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-color: #e5e5e5;
        }
        .stat-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 20px;
        }
        .text-green { background: #f0fdf4; color: #16a34a; }
        .text-red { background: #fef2f2; color: #dc2626; }
        .text-dark-red { background: #effdf8; color: #0f766e; }
        .text-orange { background: #f1f5f9; color: #475569; }
        .stat-info { display: flex; flex-direction: column; }
        .stat-count { font-size: 24px; font-weight: bold; color: #333; line-height: 1; }
        .stat-label { font-size: 13px; color: #666; margin-top: 4px; }
        .stats-grid-container {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        /* Modals for Clickable Stats Details */
        .detail-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.6); z-index: 5000;
          display: flex; justify-content: center; align-items: center;
          animation: fadeIn 0.2s;
        }
        .detail-modal-card {
          background: white; width: 450px; max-width: 90%;
          border-radius: 12px; padding: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          display: flex; flex-direction: column; max-height: 80vh;
        }
        .detail-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 15px; border-bottom: 2px solid #fee2e2; padding-bottom: 15px;
        }
        .detail-list {
          overflow-y: auto; flex: 1; padding-right: 5px;
        }
        .detail-item {
          padding: 12px 10px; border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; gap: 15px;
          transition: background 0.2s;
        }
        .detail-item:hover { background: #f8fafc; border-radius: 6px; }
        .detail-avatar {
          width: 36px; height: 36px; background: var(--red); color: white; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: bold;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Page Header */}
      <div className="dashboard-header-card card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
              <h2 style={{ color: "var(--red)", margin: 0 }}>Attendance Logs</h2>
              <p className="small">Monitor complete employee check-ins and check-outs</p>
          </div>
          
          {/* View Mode Toggle Switch */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
              <button 
                  onClick={() => setViewMode("grid")}
                  style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', 
                      borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                      background: viewMode === "grid" ? '#fff' : 'transparent',
                      color: viewMode === "grid" ? 'var(--red)' : '#64748b',
                      boxShadow: viewMode === "grid" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s ease'
                  }}
              >
                  <FaThLarge /> Employee Grid
              </button>
              <button
                  onClick={() => setViewMode("logs")}
                  style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none',
                      borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                      background: viewMode === "logs" ? '#fff' : 'transparent',
                      color: viewMode === "logs" ? 'var(--red)' : '#64748b',
                      boxShadow: viewMode === "logs" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s ease'
                  }}
              >
                  <FaList /> Complete Logs
              </button>
              <button
                  onClick={() => setViewMode("analyzer")}
                  style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none',
                      borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                      background: viewMode === "analyzer" ? '#fff' : 'transparent',
                      color: viewMode === "analyzer" ? 'var(--red)' : '#64748b',
                      boxShadow: viewMode === "analyzer" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s ease'
                  }}
              >
                  <FaChartBar /> Analyzer
              </button>
          </div>
      </div>

      {/* ========================================================= */}
      {/* TODAY'S STATS WIDGETS (NOW FULLY CLICKABLE)               */}
      {/* ========================================================= */}
      <div className="stats-grid-container">
          <StatItem statsLoading={statsLoading} icon={<FaCheckCircle />} label="Present Today"    count={stats.present}        colorClass="text-green"    onClick={() => handleStatClick('present',        'Present Today')} />
          <StatItem statsLoading={statsLoading} icon={<FaTimesCircle />} label="Absent Today"     count={stats.absent}         colorClass="text-red"      onClick={() => handleStatClick('absent',         'Absent Today')} />
          <StatItem statsLoading={statsLoading} icon={<FaUserClock />}   label="On Leave Today"   count={stats.leave}          colorClass="text-dark-red" onClick={() => handleStatClick('leave',          'On Leave Today')} />
          <StatItem statsLoading={statsLoading} icon={<FaUserSlash />}   label="Not Checked In"   count={stats.not_checked_in} colorClass="text-orange"   onClick={() => handleStatClick('not_checked_in', 'Not Checked In')} />
      </div>

      {/* Global Filter Bar */}
      <div className="filter-bar" style={{ marginTop: '15px' }}>
        {/* Search Input */}
        <div style={{flex: 1, position: 'relative'}}>
           <FaSearch style={{position: 'absolute', left: 12, top: 13, color: '#999'}} />
           <input 
              className="input" 
              placeholder={viewMode === "grid" ? "Search Employee..." : "Search Logs by Name..."} 
              style={{marginBottom:0, paddingLeft: 38}}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
           />
        </div>

        {/* Dynamic Second Filter based on View Mode */}
        {viewMode === "grid" ? (
            <div style={{flex: 1, position: 'relative'}}>
               <FaFilter style={{position: 'absolute', left: 12, top: 13, color: '#999'}} />
               <select 
                  className="input" 
                  style={{marginBottom:0, paddingLeft: 38}}
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
               >
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
            </div>
        ) : (
            <div style={{flex: 1, position: 'relative'}}>
               <FaCalendarAlt style={{position: 'absolute', left: 12, top: 13, color: '#999'}} />
               <input 
                  type="date"
                  className="input" 
                  style={{marginBottom:0, paddingLeft: 38}}
                  value={logDateFilter}
                  onChange={e => setLogDateFilter(e.target.value)}
               />
            </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* VIEW MODE: EMPLOYEE GRID                                  */}
      {/* ========================================================= */}
      {viewMode === "grid" && (
          <>
              {loading ? (
                <div style={{ marginTop: 20 }}><SkeletonCards count={8} minWidth={200} /></div>
              ) : filteredEmployees.length === 0 ? (
                <div className="card" style={{textAlign:'center', color:'#888', marginTop: 20, padding: 40}}>
                    No employees found matching your filter criteria.
                </div>
              ) : (
                <div className="emp-grid" style={{ marginTop: 20 }}>
                  {filteredEmployees.map(emp => (
                    <div key={emp._id} className="emp-card" onClick={() => openEmployeeDetails(emp)} style={{ cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid #eaeaea' }}>
                       <div className="emp-avatar" style={{ background: 'var(--red)', color: 'white' }}>
                          {emp.name.charAt(0).toUpperCase()}
                       </div>
                       <h4 style={{ marginBottom: 5 }}>{emp.name}</h4>
                       <div className="emp-role" style={{ color: '#555', fontSize: 13 }}>{emp.position || "Employee"}</div>
                       <div className="emp-dept" style={{ color: '#888', fontSize: 12 }}>{emp.department || "General"}</div>
                    </div>
                  ))}
                </div>
              )}
          </>
      )}

      {/* ========================================================= */}
      {/* VIEW MODE: COMPLETE MASTER LOGS                           */}
      {/* ========================================================= */}
      {viewMode === "logs" && (
          <div className="card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
              {loadingLogs ? (
                 <SkeletonTable rows={6} cols={5} />
              ) : filteredLogs.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                     No attendance logs found matching the selected criteria. Try adjusting the date filter.
                 </div>
              ) : (
                 <div style={{ overflowX: 'auto' }}>
                     <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                         <thead>
                             <tr style={{ background: '#f8f9fa', color: 'var(--red)' }}>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Employee</th>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Date</th>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Time</th>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Action Type</th>
                                 <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Location/Photo</th>
                             </tr>
                         </thead>
                         <tbody>
                             {filteredLogs.map((log) => (
                                 <tr key={log._id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                                     <td style={{ padding: '12px 15px', fontWeight: 600 }}>{log.employee_name || "Unknown"}</td>
                                     <td style={{ padding: '12px 15px' }}>{formatDate(log.time)}</td>
                                     <td style={{ padding: '12px 15px', color: '#555' }}>{formatTime(log.time)}</td>
                                     <td style={{ padding: '12px 15px' }}>
                                         <span style={{
                                             padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                             background: log.type === 'checkin' ? '#dcfce7' : '#fee2e2',
                                             color: log.type === 'checkin' ? '#16a34a' : '#dc2626'
                                         }}>
                                             {log.type === 'checkin' ? 'Check In' : 'Check Out'}
                                         </span>
                                     </td>
                                     <td style={{ padding: '12px 15px' }}>
                                         {resolveAttachmentUrl(log.photo_url, api.baseUrl) ? (
                                             <a
                                                href={resolveAttachmentUrl(log.photo_url, api.baseUrl)}
                                                target="_blank" 
                                                rel="noreferrer" 
                                                style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}
                                             >
                                                 View Photo
                                             </a>
                                         ) : (
                                             <span style={{ color: '#aaa', fontSize: 13 }}>Manual / No Photo</span>
                                         )}
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
              )}
          </div>
      )}

      {/* ========================================================= */}
      {/* VIEW MODE: ANALYZER                                        */}
      {/* ========================================================= */}
      {viewMode === "analyzer" && (
        <div style={{ marginTop: 20 }}>
          {/* Month picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <FaCalendarAlt color="#94a3b8" />
            <input
              type="month"
              value={analyzerMonth}
              onChange={e => setAnalyzerMonth(e.target.value)}
              className="input"
              style={{ width: 180, marginBottom: 0 }}
            />
            <span style={{ fontSize: 13, color: "#64748b" }}>
              {analyzerData ? `${analyzerData.workingDays} working days tracked` : ""}
            </span>
          </div>

          {analyzerLoading || !analyzerData ? (
            <SkeletonTable rows={8} cols={5} />
          ) : (
            <>
              {/* ── KPI Strip ─────────────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { icon: <FaUsers />, label: "Total Employees", value: analyzerData.totalEmp, color: "#0f766e", bg: "#effdf8" },
                  { icon: <FaCheckCircle />, label: "Avg Attendance", value: `${analyzerData.avgRate}%`, color: "#16a34a", bg: "#f0fdf4" },
                  { icon: <FaCalendarAlt />, label: "Working Days", value: analyzerData.workingDays, color: "#1d4ed8", bg: "#eff6ff" },
                  { icon: <FaTimesCircle />, label: "Total Absences", value: analyzerData.totalAbsent, color: "#dc2626", bg: "#fef2f2" },
                  { icon: <FaUserClock />, label: "Total On Leave", value: analyzerData.totalLeave, color: "#d97706", bg: "#fffbeb" },
                ].map(k => (
                  <div key={k.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: k.bg, color: k.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{k.icon}</div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{k.value}</div>
                      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>{k.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Top Performers & Most Absent ──────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {/* Top workers */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                    <FaTrophy color="#d97706" size={13} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Most Present</span>
                  </div>
                  <div style={{ padding: "10px 18px" }}>
                    {analyzerData.empList.slice(0, 5).map((emp, i) => (
                      <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 4 ? "1px solid #f8fafc" : "none" }}>
                        <span style={{ width: 20, fontSize: 11, fontWeight: 700, color: i === 0 ? "#d97706" : "#94a3b8" }}>#{i + 1}</span>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#0f766e,#0d9488)", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {(emp.name || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.name}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{emp.dept}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>{emp.rate}%</div>
                          <div style={{ fontSize: 10, color: "#94a3b8" }}>{emp.present}d</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most absent */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                    <FaExclamationTriangle color="#dc2626" size={13} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Needs Attention</span>
                  </div>
                  <div style={{ padding: "10px 18px" }}>
                    {[...analyzerData.empList].reverse().slice(0, 5).map((emp, i) => (
                      <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 4 ? "1px solid #f8fafc" : "none" }}>
                        <span style={{ width: 20, fontSize: 11, fontWeight: 700, color: i === 0 ? "#dc2626" : "#94a3b8" }}>#{i + 1}</span>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {(emp.name || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.name}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{emp.dept}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{emp.rate}%</div>
                          <div style={{ fontSize: 10, color: "#94a3b8" }}>{emp.absent}d absent</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Department Comparison ─────────────────────────── */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaBuilding color="#0f766e" size={13} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Department Attendance Rate</span>
                </div>
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {analyzerData.deptList.map(d => (
                    <div key={d.dept}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{d.dept}</span>
                        <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "#64748b" }}>
                          <span style={{ color: "#16a34a", fontWeight: 600 }}>{d.present}p</span>
                          <span style={{ color: "#dc2626" }}>{d.absent}a</span>
                          <span style={{ color: "#d97706" }}>{d.leave}l</span>
                          <span style={{ fontWeight: 700, color: d.rate >= 80 ? "#16a34a" : d.rate >= 60 ? "#d97706" : "#dc2626", minWidth: 36, textAlign: "right" }}>{d.rate}%</span>
                        </div>
                      </div>
                      <div style={{ height: 7, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${d.rate}%`, background: d.rate >= 80 ? "linear-gradient(90deg,#16a34a,#22c55e)" : d.rate >= 60 ? "linear-gradient(90deg,#d97706,#f59e0b)" : "linear-gradient(90deg,#dc2626,#ef4444)", borderRadius: 999, transition: "width 0.6s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Full Employee Attendance Table ────────────────── */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>All Employees — Attendance Breakdown</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Employee", "Dept", "Present", "Absent", "On Leave", "Not Checked-in", "Rate", ""].map(h => (
                          <th key={h} style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", textAlign: "left", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analyzerData.empList.map((emp, idx) => (
                        <tr key={emp.id} style={{ borderBottom: "1px solid #f8fafc", background: idx % 2 === 0 ? "#fff" : "#fafcfd" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{emp.name}</td>
                          <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 12 }}>{emp.dept || "—"}</td>
                          <td style={{ padding: "10px 14px", color: "#16a34a", fontWeight: 600 }}>{emp.present}</td>
                          <td style={{ padding: "10px 14px", color: "#dc2626", fontWeight: 600 }}>{emp.absent}</td>
                          <td style={{ padding: "10px 14px", color: "#d97706", fontWeight: 600 }}>{emp.leave}</td>
                          <td style={{ padding: "10px 14px", color: "#64748b" }}>{emp.nci}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 60, height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${emp.rate}%`, background: emp.rate >= 80 ? "#16a34a" : emp.rate >= 60 ? "#d97706" : "#dc2626", borderRadius: 999 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: emp.rate >= 80 ? "#16a34a" : emp.rate >= 60 ? "#d97706" : "#dc2626", minWidth: 34 }}>{emp.rate}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: emp.rate >= 80 ? "#f0fdf4" : emp.rate >= 60 ? "#fffbeb" : "#fef2f2", color: emp.rate >= 80 ? "#16a34a" : emp.rate >= 60 ? "#d97706" : "#dc2626", border: `1px solid ${emp.rate >= 80 ? "#bbf7d0" : emp.rate >= 60 ? "#fde68a" : "#fecaca"}` }}>
                              {emp.rate >= 80 ? "Good" : emp.rate >= 60 ? "Fair" : "Low"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Leave / Absence Calendar ──────────────────────── */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Daily Breakdown — Who Was Where</span>
                  <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>Click a row to see names</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Date", "Present", "Absent", "On Leave", "Not Checked-in", "Attendance %"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", textAlign: "left", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...analyzerData.dayDetails].reverse().map(day => {
                        const total = day.presentCount + day.absentCount + day.leaveCount + day.nciCount;
                        const rate = total > 0 ? Math.round((day.presentCount / total) * 100) : 0;
                        const isOpen = expandedDay === day.date;
                        const fmtDate = (d) => {
                          try { return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); } catch { return d; }
                        };
                        const tag = (label, color, bg) => (
                          <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: bg, color, marginRight: 4, marginBottom: 3 }}>{label}</span>
                        );
                        return (
                          <React.Fragment key={day.date}>
                            <tr
                              onClick={() => setExpandedDay(isOpen ? null : day.date)}
                              style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer", background: isOpen ? "#f0fdf4" : "inherit" }}
                            >
                              <td style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", whiteSpace: "nowrap" }}>{fmtDate(day.date)}</td>
                              <td style={{ padding: "10px 14px", color: "#16a34a", fontWeight: 700 }}>{day.presentCount}</td>
                              <td style={{ padding: "10px 14px", color: day.absentCount > 0 ? "#dc2626" : "#94a3b8", fontWeight: day.absentCount > 0 ? 700 : 400 }}>{day.absentCount}</td>
                              <td style={{ padding: "10px 14px", color: day.leaveCount > 0 ? "#d97706" : "#94a3b8", fontWeight: day.leaveCount > 0 ? 700 : 400 }}>{day.leaveCount}</td>
                              <td style={{ padding: "10px 14px", color: "#64748b" }}>{day.nciCount}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ width: 56, height: 5, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${rate}%`, background: rate >= 80 ? "#16a34a" : rate >= 60 ? "#d97706" : "#dc2626", borderRadius: 999 }} />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: rate >= 80 ? "#16a34a" : rate >= 60 ? "#d97706" : "#dc2626" }}>{rate}%</span>
                                </div>
                              </td>
                            </tr>
                            {isOpen && (
                              <tr style={{ background: "#f8fffe" }}>
                                <td colSpan={6} style={{ padding: "12px 18px 14px", borderBottom: "1px solid #e2e8f0" }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                                    {[
                                      { label: "Present", names: day.presentNames, color: "#16a34a", bg: "#f0fdf4", borderColor: "#bbf7d0" },
                                      { label: "Absent", names: day.absentNames, color: "#dc2626", bg: "#fef2f2", borderColor: "#fecaca" },
                                      { label: "On Leave", names: day.leaveNames, color: "#d97706", bg: "#fffbeb", borderColor: "#fde68a" },
                                      { label: "Not Checked-in", names: day.nciNames, color: "#64748b", bg: "#f1f5f9", borderColor: "#e2e8f0" },
                                    ].map(cat => (
                                      <div key={cat.label} style={{ border: `1px solid ${cat.borderColor}`, borderRadius: 8, overflow: "hidden" }}>
                                        <div style={{ background: cat.bg, padding: "6px 10px", fontWeight: 700, fontSize: 11, color: cat.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                          {cat.label} ({cat.names.length})
                                        </div>
                                        <div style={{ padding: "8px 10px" }}>
                                          {cat.names.length === 0 ? (
                                            <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>None</span>
                                          ) : cat.names.map(n => tag(n.name, cat.color, cat.bg))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CLICKABLE STATS DETAILS (NEW UI)                   */}
      {/* ========================================================= */}
      {detailModalOpen && (
        <div className="detail-modal-overlay" onClick={() => setDetailModalOpen(false)}>
          <div className="detail-modal-card" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3 style={{ margin: 0, color: 'var(--red)' }}>{detailTitle}</h3>
              <button className="btn ghost" onClick={() => setDetailModalOpen(false)} style={{padding:'6px', background: '#f1f5f9', borderRadius: '50%'}}>
                <FaTimes size={14} color="#64748b"/>
              </button>
            </div>
            
            <div className="detail-list">
              {detailLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                   <div className="loader" style={{margin: '0 auto'}}></div>
                   <p style={{color: '#64748b', marginTop: 15}}>Loading details...</p>
                </div>
              ) : detailList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                   <FaUserSlash size={30} style={{opacity: 0.2, marginBottom: 10}}/>
                   <p style={{margin: 0}}>No employees found in this category for today.</p>
                </div>
              ) : (
                detailList.map((emp, idx) => (
                  <div key={emp._id || idx} className="detail-item">
                    <div className="detail-avatar">
                      {emp.name ? emp.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>{emp.name || "Unknown Employee"}</div>
                      <div className="small" style={{color: '#64748b'}}>{emp.email || emp.position || emp.department || "General"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: INDIVIDUAL ATTENDANCE DETAILS                      */}
      {/* ========================================================= */}
      {showModal && selectedEmp && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 4000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '850px', maxHeight: '90vh', overflow: 'hidden', display:'flex', flexDirection:'column', padding:0, borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
             
             <div style={{ padding: '20px', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', background: '#fafafa' }}>
                <div>
                  <h3 style={{color: "var(--red)", margin:0, fontSize: 20}}>{selectedEmp.name}</h3>
                  <span className="small" style={{ color: '#666' }}>{selectedEmp.department} | {selectedEmp.position}</span>
                </div>
                <button className="btn ghost" onClick={() => setShowModal(false)} style={{ border:'none', background: '#fff', padding: 8, borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <FaTimes size={18} color="#555" />
                </button>
             </div>

             <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
                {loadingDetails ? (
                   <div style={{ display: "flex", justifyContent: "center", padding: 50 }}><div className="loader"></div></div>
                ) : attendance.length === 0 ? (
                   <div style={{ textAlign:'center', color:'#999', padding: 40, border: '1px dashed #ccc', borderRadius: 8 }}>
                       No historical attendance records found for this employee.
                   </div>
                ) : (
                  <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: '#555', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: 12 }}>Date</th>
                        <th style={{ padding: 12 }}>In Time</th>
                        <th style={{ padding: 12 }}>Out Time</th>
                        <th style={{ padding: 12 }}>Status</th>
                        <th style={{ padding: 12 }}>Login From</th>
                        <th style={{ padding: 12 }}>Logout From</th>
                        <th style={{ padding: 12 }}>Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((rec) => (
                        <tr key={rec.date} style={{ borderBottom: '1px solid #f2f2f2' }}>
                          <td style={{ padding: 12, fontWeight: 500 }}>{rec.date}</td>
                          <td style={{ padding: 12, color: rec.checkin?.status_indicator === 'Late' ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                              {formatTime(rec.checkin?.time)}
                          </td>
                          <td style={{ padding: 12, color: rec.checkout?.status_indicator === 'Early' ? '#dc2626' : '#333', fontWeight: 600 }}>
                              {formatTime(rec.checkout?.time)}
                          </td>
                          <td style={{ padding: 12 }}>{getStatusDisplay(rec)}</td>
                          <td style={{ padding: 12 }}>
                            <LocationCell loc={checkinLoc(rec)} color="#16a34a" label="Check-in location" />
                          </td>
                          <td style={{ padding: 12 }}>
                            <LocationCell loc={checkoutLoc(rec)} color="#dc2626" label="Check-out location" />
                          </td>
                          <td style={{ padding: 12 }}>
                            <div style={{display:'flex', gap:10}}>
                                {resolveAttachmentUrl(rec.checkin?.photo_url, api.baseUrl) && (
                                  <a href={resolveAttachmentUrl(rec.checkin.photo_url, api.baseUrl)} target="_blank" rel="noreferrer" style={{fontSize:12, color:'#3b82f6', textDecoration:'none', fontWeight: 'bold', background: '#eff6ff', padding: '4px 8px', borderRadius: 4}}>Check-In Photo</a>
                                )}
                                {resolveAttachmentUrl(rec.checkout?.photo_url, api.baseUrl) && (
                                  <a href={resolveAttachmentUrl(rec.checkout.photo_url, api.baseUrl)} target="_blank" rel="noreferrer" style={{fontSize:12, color:'#dc2626', textDecoration:'none', fontWeight: 'bold', background: '#fef2f2', padding: '4px 8px', borderRadius: 4}}>Check-Out Photo</a>
                                )}
                                {!rec.checkin?.photo_url && !rec.checkout?.photo_url && <span style={{color: '#aaa', fontSize: 12}}>N/A</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}