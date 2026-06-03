import React, { useState, useRef, useEffect } from "react";
import { FaCommentDots, FaTimes, FaPaperPlane, FaRobot } from "react-icons/fa";

const BASE = "https://gdmrconnect-backend-production.up.railway.app/api";

// ─── Built-in HR knowledge base — instant answers + optional navigation ───────
// Each intent: keywords to match, an answer, and an optional quick action.
const KB = [
  {
    k: ["apply leave", "take leave", "request leave", "leave application", "how to leave", "book leave"],
    a: "To apply for leave, open **Apply Leave** from the sidebar. Pick your dates, choose full or half day, add a reason, attach a document if needed, and submit. Your manager and HR will review it.",
    action: { label: "Apply Leave", view: "apply-leave", roles: ["employee", "manager"] },
  },
  {
    k: ["leave balance", "leave status", "my leaves", "leave approved", "leave pending", "how many leave"],
    a: "You can see all your leave requests and their status (Pending / Approved / Rejected) under **My Leaves**.",
    action: { label: "My Leaves", view: "my-leaves", roles: ["employee", "manager"] },
  },
  {
    k: ["check in", "checkin", "check out", "checkout", "mark attendance", "punch", "clock in"],
    a: "Use **Check In** / **Check Out** on your dashboard. It opens your camera for a quick photo verification. Remember you can only check in within your assigned shift hours (±1 hour).",
  },
  {
    k: ["attendance log", "my attendance", "attendance history", "attendance record"],
    a: "Your full check-in / check-out history is under **Attendance Log** in the sidebar.",
    action: { label: "Attendance Log", view: "attendance-log", roles: ["employee", "manager"] },
  },
  {
    k: ["payslip", "salary slip", "my salary", "payroll", "pay slip", "salary"],
    a: "Your monthly payslips are under **Payroll** → My Payslips. You can view the full earnings/deductions breakdown and download each slip as a PDF.",
    action: { label: "Go to Payroll", view: "payroll" },
  },
  {
    k: ["course", "training", "lms", "learning", "my courses", "lesson"],
    a: "Assigned learning courses appear under **My Courses**. Open a course to see its modules and lessons, and mark lessons done to track your progress.",
    action: { label: "My Courses", view: "lms" },
  },
  {
    k: ["job", "career", "opening", "refer", "referral", "vacancy"],
    a: "Open positions are under **Career**. You can browse jobs and refer someone you know by submitting their details — referrals are tracked there too.",
    action: { label: "Career", view: "career" },
  },
  {
    k: ["announcement", "notice", "news"],
    a: "Company announcements appear as banners on your dashboard and under **Announcements**. New ones are highlighted in the sidebar.",
    action: { label: "Announcements", view: "announcements", roles: ["employee", "manager"] },
  },
  {
    k: ["holiday", "holidays", "leave calendar", "off day"],
    a: "The official holiday calendar is under **Holidays** in the sidebar.",
    action: { label: "Holidays", view: "holidays" },
  },
  {
    k: ["password", "change password", "reset password", "forgot password"],
    a: "To change your password, use the **Change Password** option (lock icon) on your dashboard. If you're locked out, use 'Forgot Password' on the login screen to get a temporary password by email.",
  },
  {
    k: ["asset", "laptop", "equipment", "request asset", "hardware"],
    a: "Need hardware or equipment? Use **Request Asset** on your dashboard. Your manager approves first, then admin processes it.",
    action: { label: "Request Asset", view: "assets", roles: ["employee"] },
  },
  {
    k: ["pms", "performance", "review", "appraisal", "evaluation"],
    a: "Performance reviews (PMS) are under **Performance**. You'll find self-evaluation forms and your review history there.",
    action: { label: "Performance", view: "pms", roles: ["employee"] },
  },
  {
    k: ["assessment", "test", "quiz", "exam"],
    a: "Pre-employment and onboarding assessments are managed under **Assessments**. Candidates receive a secure test link by email.",
    action: { label: "Assessments", view: "assessment", roles: ["admin"] },
  },
  {
    k: ["manager", "who is my manager", "my manager", "reporting"],
    a: "Your assigned manager is shown on your profile. For team and reporting structure, HR/Admin manages this under the Employees section.",
  },
  {
    k: ["approve leave", "team leave", "pending approval", "approve request"],
    a: "As a manager, review and approve your team's leave requests under **Team Leaves**. Items awaiting your action are badged in the sidebar.",
    action: { label: "Team Leaves", view: "team-leaves", roles: ["manager"] },
  },
  {
    k: ["shift", "timing", "working hours", "my shift", "office time"],
    a: "Your shift (Morning 10 AM–7 PM or Night 7 PM–4 AM) is set by Admin and shown in the Employees list. You can check in/out within ±1 hour of your shift window.",
  },
  {
    k: ["contact hr", "hr help", "talk to hr", "reach hr", "hr support"],
    a: "For anything I can't help with, reach out to your HR department directly, or post it through the appropriate request in the app. HR can be contacted at info@gdmrfoundation.com.",
  },
  {
    k: ["hello", "hi", "hey", "good morning", "good evening", "namaste"],
    a: "Hello! 👋 I'm your GDMR Connect assistant. I can help with leaves, attendance, payslips, courses, careers and more. What would you like to do?",
  },
  {
    k: ["thank", "thanks", "great", "awesome", "good"],
    a: "You're welcome! 😊 Anything else I can help you with?",
  },
  {
    k: ["what can you do", "help", "options", "features"],
    a: "I can guide you on: applying for leave, checking attendance, viewing payslips, accessing courses, browsing job openings, announcements, holidays, password help and more. Just ask in plain words!",
  },
];

function matchKB(text) {
  const t = text.toLowerCase();
  for (const item of KB) {
    if (item.k.some((kw) => t.includes(kw))) return item;
  }
  return null;
}

// Role-based starter suggestions
const SUGGESTIONS = {
  employee: ["How do I apply for leave?", "Where are my payslips?", "Show my courses", "How do I check in?"],
  manager:  ["Approve team leaves", "How do I apply for leave?", "Where are my payslips?", "View announcements"],
  admin:    ["How does payroll work?", "Manage assessments", "Post a job opening", "View reports"],
};

// Render **bold** markdown-ish into spans
function renderText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export default function ChatBot({ token, user, role = "employee", onNavigate }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);
  const firstName = user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        from: "bot",
        text: `Hi ${firstName}! 👋 I'm your GDMR Connect assistant. Ask me anything about leaves, attendance, payslips, courses or careers — or pick a suggestion below.`,
      }]);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text: q }]);

    // 1) Try the local knowledge base for an instant answer
    const hit = matchKB(q);
    if (hit) {
      const action = hit.action && (!hit.action.roles || hit.action.roles.includes(role)) ? hit.action : null;
      setMessages((m) => [...m, { from: "bot", text: hit.a, action }]);
      return;
    }

    // 2) Fall back to the backend AI for free-form questions
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: q, role, name: user?.name }),
      });
      if (r.ok) {
        const d = await r.json();
        setMessages((m) => [...m, { from: "bot", text: d.reply || d.message || "I'm not sure about that one — please try rephrasing." }]);
      } else {
        throw new Error();
      }
    } catch {
      setMessages((m) => [...m, {
        from: "bot",
        text: "I couldn't reach the AI service for that one. For anything specific, please contact HR at info@gdmrfoundation.com — or ask me about leaves, attendance, payslips, courses or careers.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = SUGGESTIONS[role] || SUGGESTIONS.employee;

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Ask the assistant"
          style={{
            position: "fixed", bottom: 22, right: 22, zIndex: 4000,
            width: 58, height: 58, borderRadius: "50%", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, var(--brand), var(--brand-dark))",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(52,160,106,0.45)", animation: "chatbob 2.6s ease-in-out infinite",
          }}
        >
          <FaCommentDots size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 22, right: 22, zIndex: 4000,
          width: 370, maxWidth: "calc(100vw - 32px)", height: 540, maxHeight: "calc(100vh - 90px)",
          background: "#fff", borderRadius: 18, overflow: "hidden",
          boxShadow: "0 24px 60px rgba(16,40,30,0.28)", display: "flex", flexDirection: "column",
          animation: "chatpop 0.22s ease",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, var(--brand), var(--teal-800))",
            color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FaRobot size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>GDMR Assistant</div>
              <div style={{ fontSize: 11, opacity: 0.85, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#86efac", display: "inline-block" }} /> Online
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaTimes size={13} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px", background: "#f6f8fa", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 13, lineHeight: 1.55,
                  background: m.from === "user" ? "var(--brand)" : "#fff",
                  color: m.from === "user" ? "#fff" : "#334155",
                  borderBottomRightRadius: m.from === "user" ? 4 : 14,
                  borderBottomLeftRadius: m.from === "user" ? 14 : 4,
                  boxShadow: m.from === "user" ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  {renderText(m.text)}
                </div>
                {m.action && (
                  <button
                    onClick={() => { onNavigate?.(m.action.view); setOpen(false); }}
                    style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "var(--brand-light)", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
                  >
                    → {m.action.label}
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", background: "#fff", borderRadius: 14, padding: "12px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#94a3b8", animation: `chatdot 1s ${i * 0.15}s infinite` }} />
                ))}
              </div>
            )}
          </div>

          {/* Suggestions (only before user types) */}
          {messages.length <= 1 && (
            <div style={{ padding: "8px 12px 0", display: "flex", flexWrap: "wrap", gap: 6, background: "#f6f8fa" }}>
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} style={{ fontSize: 11.5, color: "#475569", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 99, padding: "6px 11px", cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 8, padding: 12, background: "#f6f8fa", borderTop: "1px solid #eef1f5" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 99, padding: "10px 16px", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff" }}
            />
            <button type="submit" disabled={loading || !input.trim()} style={{
              width: 42, height: 42, borderRadius: "50%", border: "none", flexShrink: 0,
              background: input.trim() ? "var(--brand)" : "#cbd5e1", color: "#fff", cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FaPaperPlane size={14} />
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes chatbob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes chatpop { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes chatdot { 0%,60%,100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
      `}</style>
    </>
  );
}
