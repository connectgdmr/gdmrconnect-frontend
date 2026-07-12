// Client-side input validation, sanitization and password-strength helpers.
// NOTE: client validation is for UX and a first line of defence only — the
// backend must always re-validate and sanitize every input independently.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = new RegExp("[\u0000-\u001F\u007F]", "g");

/** Trim + lowercase an email for consistent comparison/submission. */
export function cleanEmail(value = "") {
  return String(value).trim().toLowerCase();
}

/** Basic email format check. */
export function isValidEmail(value = "") {
  const v = cleanEmail(value);
  return EMAIL_RE.test(v) && v.length <= 254;
}

/**
 * Sanitize a free-text input: trim, strip control characters, collapse
 * excess whitespace and cap the length. Returns a clean string safe to send.
 */
export function sanitizeText(value = "", maxLen = 1000) {
  return String(value)
    .replace(CONTROL_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Strip characters commonly abused for injection from short fields (names, etc.). */
export function sanitizeName(value = "", maxLen = 120) {
  return sanitizeText(value, maxLen).replace(/[<>$`]/g, "");
}

const PW_RULES = [
  { key: "length",  label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "upper",   label: "An uppercase letter",   test: (p) => /[A-Z]/.test(p) },
  { key: "lower",   label: "A lowercase letter",    test: (p) => /[a-z]/.test(p) },
  { key: "number",  label: "A number",              test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "A symbol (!@#$…)",      test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Evaluate password strength.
 * Returns { score 0-5, label, color, checks: [{key,label,passed}], isStrong }.
 * A password is "strong enough" when it is 8+ chars and meets >= 4 of 5 rules.
 */
export function getPasswordStrength(password = "") {
  const p = String(password);
  const checks = PW_RULES.map((r) => ({ key: r.key, label: r.label, passed: r.test(p) }));
  const passed = checks.filter((c) => c.passed).length;
  const lengthOk = p.length >= 8;

  let label = "Very weak", color = "#dc2626";
  if (!p) { label = ""; color = "#e2e8f0"; }
  else if (passed >= 5 && p.length >= 12) { label = "Very strong"; color = "#16a34a"; }
  else if (passed >= 4 && lengthOk)       { label = "Strong";      color = "#16a34a"; }
  else if (passed >= 3)                   { label = "Medium";      color = "#d97706"; }
  else if (passed >= 2)                   { label = "Weak";        color = "#ea580c"; }

  return { score: passed, label, color, checks, isStrong: lengthOk && passed >= 4 };
}

export const PASSWORD_RULES = PW_RULES;

/**
 * Safely resolve an attachment URL from the backend.
 * Absolute http/https URLs are returned as-is; relative paths are prefixed
 * with baseUrl. Returns null for any other scheme (e.g. javascript:) so the
 * caller can skip rendering the link entirely.
 */
export function resolveAttachmentUrl(url, baseUrl) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") ? url : null;
  } catch {
    return `${baseUrl}${url}`;
  }
}
