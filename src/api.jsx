const API_BASE = import.meta.env.VITE_API_URL || "https://gdmrconnect-backend-production.up.railway.app/api";
export const BASE_URL = API_BASE.replace(/\/api$/, "");

const REQUEST_TIMEOUT_MS = 30000;

async function request(path, method = "GET", body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    // Rate limiting (429) and account lockout (423) — surface a clear message
    if (res.status === 429) {
      throw { status: 429, message: data?.message || "Too many attempts. Please wait a moment and try again." };
    }
    if (res.status === 423) {
      throw { status: 423, message: data?.message || "Account temporarily locked due to multiple failed attempts. Please try again later." };
    }
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. The server may be starting up — please try again in a moment.");
    }
    if (err instanceof TypeError) {
      throw new Error("Network error — please check your internet connection and try again.");
    }
    throw err;
  }
}

export default {
  baseUrl: BASE_URL,
  // Authentication
  login: (payload) => request("/login", "POST", payload),
  forgotPassword: (email) => request("/forgot-password", "POST", { email }),

  registerAdmin: (payload, token) => request("/register-admin", "POST", payload, token),
  registerManager: (payload, token) => request("/register-manager", "POST", payload, token),

  // Employees
  addEmployee: (payload, token) => request("/admin/employees", "POST", payload, token),
  listEmployees: (token) => request("/admin/employees", "GET", null, token),
  deleteEmployee: (id, token) => request(`/admin/employees/${id}`, "DELETE", null, token),
  editEmployee: (id, payload, token) => request(`/admin/employees/${id}`, "PUT", payload, token),

  // Managers
  getManagers: (token) => request("/admin/managers", "GET", null, token),
  editManager: (id, payload, token) => request(`/admin/managers/${id}`, "PUT", payload, token),
  deleteManager: (id, token) => request(`/admin/managers/${id}`, "DELETE", null, token),
  getManagerEmployees: (token) => request("/manager/my-employees", "GET", null, token),

  // Attendance
  checkin: (token) => request("/attendance/checkin", "POST", null, token),
  checkout: (token) => request("/attendance/checkout", "POST", null, token),
  myAttendance: (token) => request("/my/attendance", "GET", null, token),
  adminAttendance: (token) => request("/admin/attendance", "GET", null, token),
  employeeAttendance: (id, token) => request(`/admin/attendance/${id}`, "GET", null, token),
  todayStats: (token) => request("/admin/today-stats", "GET", null, token),

  // Attendance with Photo (+ optional geo-location captured at check-in/out)
  checkinWithPhoto: async (token, imageData, location = null) => {
    const res = await fetch(`${API_BASE}/attendance/checkin-photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData, location }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  checkoutWithPhoto: async (token, imageData, location = null) => {
    const res = await fetch(`${API_BASE}/attendance/checkout-photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData, location }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  // Leaves
  applyLeave: (payload, token) => request("/leaves", "POST", payload, token),
  adminLeaves: (token) => request("/admin/leaves", "GET", null, token),
  updateLeave: (id, payload, token) => request(`/admin/leaves/${id}`, "PUT", payload, token),
  myLeaves: (token) => request("/my/leaves", "GET", null, token),

  // Leave with file (UPDATED FOR DATE RANGES)
  applyLeaveWithFile: async (payload, file, token) => {
    const formData = new FormData();
    // Payload should contain either single 'date' (legacy) or 'from_date' and 'to_date'
    if(payload.from_date) formData.append("from_date", payload.from_date);
    if(payload.to_date) formData.append("to_date", payload.to_date);
    if(payload.date) formData.append("date", payload.date); 
    
    formData.append("type", payload.type);
    formData.append("reason", payload.reason);
    if (file) formData.append("attachment", file);

    const res = await fetch(`${API_BASE}/leaves`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  // Employment Status (extended leaves + resignation)
  getEmployeeStatus:    (id, token)          => request(`/admin/employees/${id}/status`, "GET", null, token),
  addExtendedLeave:     (id, payload, token) => request(`/admin/employees/${id}/extended-leave`, "POST", payload, token),
  removeExtendedLeave:  (id, leaveId, token) => request(`/admin/employees/${id}/extended-leave/${leaveId}`, "DELETE", null, token),
  setResignation:       (id, payload, token) => request(`/admin/employees/${id}/resignation`, "PUT", payload, token),
  clearResignation:     (id, token)          => request(`/admin/employees/${id}/resignation`, "DELETE", null, token),

  getAttendanceSummary: async (month, token) => {
    const res = await fetch(
      `${API_BASE}/admin/attendance-summary?month=${month}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  // ── Daily Work Planning Module ──────────────────────────────────────────
  getMyWorkPlan:     (date, token)        => request(`/my/work-plan?date=${date}`, "GET", null, token),
  saveWorkPlan:      (payload, token)     => request("/my/work-plan", "POST", payload, token),
  updateTaskStatus:  (planId, taskId, status, token) => request(`/my/work-plan/${planId}/task/${taskId}`, "PUT", { status }, token),
  getMyWorkAnalytics:(range, token)       => request(`/my/work-analytics?range=${range}`, "GET", null, token),

  getTeamWorkPlans:  (query, token)       => request(`/admin/work-plans?${query}`, "GET", null, token),
  getTeamWorkAnalytics:(range, token)     => request(`/admin/work-analytics?range=${range}`, "GET", null, token),
  addPlanComment:    (planId, comment, token) => request(`/admin/work-plans/${planId}/comment`, "POST", { comment }, token),
};