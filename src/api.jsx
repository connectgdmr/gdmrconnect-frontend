const API_BASE = import.meta.env.VITE_API_URL || "https://gdmrconnect-backend-production.up.railway.app/api";
export const BASE_URL = API_BASE.replace(/\/api$/, "");
export const API_URL = API_BASE; // full /api path — import this instead of hardcoding the URL

// All fetch calls use the same-origin Vercel proxy (/api/*) so Jio mobile data
// cannot block them — blocking /api/* would block the whole site. BASE_URL/API_URL
// above are still used for constructing media/file URLs that point to the CDN.
const FETCH_BASE = '/api';

// Strategy: 3 fetch attempts → 1 XHR attempt.
const REQUEST_TIMEOUT_MS = 20000;  // 20 s per fetch attempt — fail fast so XHR retry kicks in sooner
const MAX_RETRIES = 2;             // 3 total fetch attempts (0, 1, 2)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// XHR path — HTTP/1.1 fallback for ISP proxies that interfere with HTTP/2
function requestXHR(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${FETCH_BASE}${path}`, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = 30000;
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status === 429) {
          reject({ status: 429, message: data?.message || "Too many attempts. Please wait a moment and try again." });
        } else if (xhr.status === 423) {
          reject({ status: 423, message: data?.message || "Account temporarily locked due to multiple failed attempts. Please try again later." });
        } else if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject({ status: xhr.status, ...data });
        }
      } catch {
        reject({ status: xhr.status });
      }
    };
    xhr.onerror = () => {
      const e = new TypeError("XHR network error");
      e.isNetworkError = true;
      reject(e);
    };
    xhr.ontimeout = () => {
      const e = new Error("XHR timeout");
      e.isNetworkError = true;
      reject(e);
    };
    xhr.send(body ? JSON.stringify(body) : null);
  });
}

async function request(path, method = "GET", body, token, attempt = 0) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${FETCH_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
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

    // Don't retry auth errors or app-level errors — only low-level network failures
    if (err?.status) throw err;

    const isNetworkError = err instanceof TypeError;
    const isTimeout = err?.name === "AbortError";

    if ((isNetworkError || isTimeout) && attempt < MAX_RETRIES) {
      await sleep(1000 * (attempt + 1)); // 1 s, 2 s
      return request(path, method, body, token, attempt + 1);
    }

    // All fetch() attempts failed — try XHR as final fallback (HTTP/1.1, different
    // browser code path, often bypasses ISP proxy interference with HTTP/2)
    if (isNetworkError || isTimeout) {
      try {
        return await requestXHR(path, method, body, token);
      } catch (xhrErr) {
        // If XHR returned an HTTP error (auth failure, etc.), surface it directly
        if (xhrErr?.status) throw xhrErr;
        // XHR also failed at network level — fall through to user-facing error
      }
    }

    if (isTimeout) {
      const e = new Error("Connection timed out. The server may be waking up — please try again.");
      e.isNetworkError = true;
      throw e;
    }
    if (isNetworkError) {
      const e = new Error(
        "Unable to reach the server. If you're on Jio mobile data, try switching to WiFi or a different SIM."
      );
      e.isNetworkError = true;
      throw e;
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
  checkinWithPhoto: (token, imageData, location = null) =>
    request("/attendance/checkin-photo", "POST", { image: imageData, location }, token),

  checkoutWithPhoto: (token, imageData, location = null) =>
    request("/attendance/checkout-photo", "POST", { image: imageData, location }, token),

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