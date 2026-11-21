import { API_URL as BASE } from "../../api";

// ── dates: the UAE writes day/month/year; the server and database keep ISO yyyy-mm-dd ──
export function isoToDmy(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
export function dmyToIso(txt) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt || "");
  if (!m) return "";
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1] ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
export const fmtDate = isoToDmy;
export function addMonthsIso(iso, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m || n === "" || isNaN(+n)) return "";
  const y0 = +m[1], mo0 = +m[2] - 1 + Math.trunc(+n);
  const y = y0 + Math.floor(mo0 / 12), mo = ((mo0 % 12) + 12) % 12;
  const last = new Date(y, mo + 1, 0).getDate();
  return `${y}-${String(mo + 1).padStart(2, "0")}-${String(Math.min(+m[3], last)).padStart(2, "0")}`;
}
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export const COUNTRY_CODES = [["+971", "UAE"], ["+966", "Saudi Arabia"], ["+968", "Oman"], ["+974", "Qatar"], ["+973", "Bahrain"], ["+965", "Kuwait"], ["+91", "India"],
  ["+92", "Pakistan"], ["+880", "Bangladesh"], ["+94", "Sri Lanka"], ["+977", "Nepal"], ["+63", "Philippines"], ["+20", "Egypt"], ["+962", "Jordan"], ["+961", "Lebanon"],
  ["+963", "Syria"], ["+249", "Sudan"], ["+254", "Kenya"], ["+234", "Nigeria"], ["+44", "UK"], ["+1", "USA / Canada"], ["+61", "Australia"], ["+49", "Germany"], ["+33", "France"]];

// tiny fetch wrapper for the /api/hris routes
export function useApi(token) {
  const headers = { Authorization: `Bearer ${token}` };
  async function call(path, { method = "GET", body, form } = {}) {
    const r = await fetch(`${BASE}${path}`, { method, headers: form ? headers : { ...headers, "Content-Type": "application/json" }, body: form || (body ? JSON.stringify(body) : undefined) });
    const ct = r.headers.get("content-type") || "";
    const data = ct.includes("json") ? await r.json().catch(() => ({})) : null;
    return { ok: r.ok, status: r.status, data, res: r };
  }
  return { call, headers };
}

export function downloadText(name, text, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 500);
}
export function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 500);
}

export const setIn = (obj, path, value) => {
  const keys = path.split(".");
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = out;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) cur[k] = value;
    else { cur[k] = { ...(cur[k] || {}) }; cur = cur[k]; }
  });
  return out;
};
export const getIn = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

export const tab = (active) => ({ padding: "8px 16px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap",
  background: active ? "var(--red)" : "transparent", color: active ? "#fff" : "#64748b" });
