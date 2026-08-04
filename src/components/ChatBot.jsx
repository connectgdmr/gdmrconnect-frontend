import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaPaperPlane, FaRegLightbulb } from "react-icons/fa";
import { GiLion } from "react-icons/gi";
import { getNextHoliday } from "../data/holidays";

// ════════════════════════════════════════════════════════════════════════════
//  REXOR — the GDMR Connect in-app assistant.
//  Answers first from a curated, instant, zero-cost HR knowledge base with
//  keyword matching + one-tap navigation. Anything it doesn't recognize is
//  handed to a small LLM fallback (/api/assistant/chat) if the backend has
//  one configured — otherwise it just says so, no backend/API key required.
// ════════════════════════════════════════════════════════════════════════════

const BOT_NAME = "Rexor";

const KB = [
  { k: ["apply leave", "take leave", "request leave", "leave application", "how to leave", "book leave", "want leave"],
    a: "To request time off, head to **Apply Leave**. Pick your dates, choose full or half day, add a reason (and a document if needed), then submit. It goes to your manager and HR for approval.",
    action: { label: "Apply Leave", view: "apply-leave", roles: ["employee", "manager"] } },
  { k: ["leave balance", "leave status", "my leaves", "leave approved", "leave pending", "how many leave"],
    a: "All your leave requests and their status (Pending / Approved / Rejected) live under **My Leaves**.",
    action: { label: "My Leaves", view: "my-leaves", roles: ["employee", "manager"] } },
  { k: ["check in", "checkin", "check out", "checkout", "mark attendance", "punch", "clock in", "clock out"],
    a: "Tap **Check In** / **Check Out** on your dashboard — it opens your camera for a quick photo verification. Tip: you can only check in within ±1 hour of your assigned shift." },
  { k: ["attendance log", "my attendance", "attendance history", "attendance record"],
    a: "Your full check-in / check-out history is under **Attendance Log**.",
    action: { label: "Attendance Log", view: "attendance-log", roles: ["employee", "manager"] } },
  { k: ["payslip", "salary slip", "my salary", "payroll", "pay slip", "salary", "ctc", "earnings"],
    a: "Your monthly payslips are under **Payroll → My Payslips** — view the full earnings/deductions breakdown and download any slip as a PDF.",
    action: { label: "Go to Payroll", view: "payroll" } },
  { k: ["course", "training", "lms", "learning", "my courses", "lesson", "upskill"],
    a: "Assigned learning courses appear under **My Courses**. Open one to see its modules & lessons, and mark lessons done to track progress.",
    action: { label: "My Courses", view: "lms" } },
  { k: ["job", "career", "opening", "refer", "referral", "vacancy", "hiring"],
    a: "Open positions are under **Career**. Browse roles and refer someone you know by submitting their details — your referrals are tracked there too.",
    action: { label: "Career", view: "career" } },
  { k: ["announcement", "notice", "news", "update"],
    a: "Company announcements show as banners on your dashboard and under **Announcements**. New ones blink in the sidebar.",
    action: { label: "Announcements", view: "announcements", roles: ["employee", "manager"] } },
  { k: ["holiday", "holidays", "leave calendar", "off day", "festival"],
    a: "The official holiday calendar is under **Holidays**.",
    action: { label: "Holidays", view: "holidays" } },
  { k: ["password", "change password", "reset password", "forgot password"],
    a: "Change it via **Change Password** (lock icon) on your dashboard. Locked out? Use 'Forgot Password' on the login screen to get a temporary password by email." },
  { k: ["asset", "laptop", "equipment", "request asset", "hardware", "monitor"],
    a: "Need equipment? Use **Request Asset** on your dashboard. Your manager approves first, then admin processes it.",
    action: { label: "Request Asset", view: "assets", roles: ["employee"] } },
  { k: ["pms", "performance", "review", "appraisal", "evaluation", "rating"],
    a: "Performance reviews (PMS) are under **Performance** — self-evaluation forms and your review history.",
    action: { label: "Performance", view: "pms", roles: ["employee"] } },
  { k: ["assessment", "test", "quiz", "exam", "candidate test"],
    a: "Onboarding & pre-employment assessments are managed under **Assessments** — candidates get a secure test link by email.",
    action: { label: "Assessments", view: "assessment", roles: ["admin"] } },
  { k: ["approve leave", "team leave", "pending approval", "approve request", "my team leave"],
    a: "Review and approve your team's leave under **Team Leaves**. Items awaiting you are badged in the sidebar.",
    action: { label: "Team Leaves", view: "team-leaves", roles: ["manager"] } },
  { k: ["shift", "timing", "working hours", "my shift", "office time", "duty time"],
    a: "Shifts are General (9 AM–6 PM), Morning (10 AM–7 PM) or Night (7 PM–4 AM), set by Admin. You can check in/out within ±1 hour of your shift window." },
  { k: ["who is my manager", "my manager", "reporting", "report to"],
    a: "Your assigned manager appears on your profile. HR/Admin manages the reporting structure under Employees." },
  { k: ["contact hr", "hr help", "talk to hr", "reach hr", "hr support", "email hr", "complaint", "grievance"],
    a: "You can reach HR directly at **info@gdmrfoundation.com**, or raise it through the relevant request in the app. They're happy to help!" },
  { k: ["add employee", "new employee", "onboard", "register employee"],
    a: "Admins add staff under **Employees → Add Employee** — set their department, manager, shift and role.",
    action: { label: "Employees", view: "employees", roles: ["admin"] } },
  { k: ["department", "departments", "team structure"],
    a: "Departments, their heads and team sizes are managed under **Departments**.",
    action: { label: "Departments", view: "departments", roles: ["admin"] } },
  { k: ["report", "reports", "attendance summary", "monthly report"],
    a: "Monthly attendance summaries and exports (CSV / PDF) are under **Reports**.",
    action: { label: "Reports", view: "summary", roles: ["admin"] } },
  { k: ["profile", "update profile", "my details", "edit profile"],
    a: "Open your profile from the avatar at the top-right of the screen to view and update your details." },
  { k: ["who are you", "what are you", "your name", "about you"],
    a: `I'm **${BOT_NAME}** — your GDMR Connect assistant. I can guide you around the platform and answer your HR questions, instantly.` },
  { k: ["hello", "hi ", "hey", "good morning", "good evening", "good afternoon", "namaste", "hii"],
    a: `Hey there! 👋 I'm ${BOT_NAME}. What can I help you with today — leaves, attendance, payslips, courses, careers…?` },
  { k: ["thank", "thanks", "great", "awesome", "perfect", "cool", "nice"],
    a: "Anytime! 😊 Need anything else?" },
  { k: ["bye", "goodbye", "see you", "later"],
    a: "Take care! 👋 I'm always here in the corner whenever you need me." },
  { k: ["what can you do", "help", "options", "features", "capabilities"],
    a: "I can help with: **leaves**, **attendance & check-in**, **payslips**, **courses**, **job openings & referrals**, **announcements**, **holidays**, **password help**, **asset requests** and more. Just ask in your own words!" },
];

function matchKB(text) {
  const t = ` ${text.toLowerCase()} `;
  let best = null, bestScore = 0;
  for (const item of KB) {
    for (const kw of item.k) {
      if (t.includes(kw) && kw.length > bestScore) { best = item; bestScore = kw.length; }
    }
  }
  return best;
}

const SUGGESTIONS = {
  employee: ["How do I apply for leave?", "Where are my payslips?", "Show my courses", "How do I check in?"],
  manager:  ["Approve team leaves", "Apply for leave", "My payslips", "View announcements"],
  admin:    ["How does payroll work?", "Manage assessments", "Post a job", "View reports"],
};

function renderText(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: "inherit" }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export default function ChatBot({ user, role = "employee", onNavigate, token, api }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);
  const firstName = user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ from: "bot", text: `Hi ${firstName}! 👋 I'm **${BOT_NAME}**, your GDMR Connect assistant. Ask me anything about leaves, attendance, payslips, courses or careers — or tap a suggestion below.` }]);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const FALLBACK_TEXT = "I'm still learning that one! 🌱 But I can instantly help with **leaves, attendance, payslips, courses, careers, announcements, holidays, password help** and more. Try one of these, or reach HR at info@gdmrfoundation.com.";

  // Asks the backend LLM (if configured) for anything the KB doesn't recognize.
  // Returns null on any failure so the caller can fall back to FALLBACK_TEXT.
  async function askAssistant(q) {
    if (!token) return null;
    try {
      const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const nextHoliday = getNextHoliday();
      const res = await fetch(`${baseUrl}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: q, context: nextHoliday ? { next_holiday: nextHoliday } : {} }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.reply || null;
    } catch {
      return null;
    }
  }

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || typing) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text: q }]);
    setTyping(true);

    const hit = matchKB(q);
    if (hit) {
      const action = hit.action && (!hit.action.roles || hit.action.roles.includes(role)) ? hit.action : null;
      // small natural delay for canned answers
      setTimeout(() => {
        setTyping(false);
        setMessages((m) => [...m, { from: "bot", text: hit.a, action }]);
      }, 480);
      return;
    }

    const llmText = await askAssistant(q);
    setTyping(false);
    if (llmText) {
      setMessages((m) => [...m, { from: "bot", text: llmText }]);
    } else {
      setMessages((m) => [...m, { from: "bot", text: FALLBACK_TEXT, reshow: true }]);
    }
  }

  const suggestions = SUGGESTIONS[role] || SUGGESTIONS.employee;
  const showChips = messages.length <= 1 || messages[messages.length - 1]?.reshow;

  return (
    <>
      {/* Launcher — compact glowing orb */}
      {!open && (
        <button onClick={() => setOpen(true)} title={`Ask ${BOT_NAME}`} className="genie-launcher">
          <span className="genie-launcher-glow" />
          <GiLion size={24} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="genie-panel">
          {/* Header */}
          <div className="genie-header">
            <div className="genie-avatar"><GiLion size={22} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: 0.2 }}>{BOT_NAME}</div>
              <div style={{ fontSize: 10.5, opacity: 0.9, display: "flex", alignItems: "center", gap: 5 }}>
                <span className="genie-dot" /> GDMR Connect Assistant
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="genie-close"><FaTimes size={13} /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="genie-body">
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.from === "user" ? "flex-end" : "flex-start" }}>
                {m.from === "bot" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 4px 4px" }}>
                    <span className="genie-mini"><GiLion size={11} /></span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0f766e" }}>{BOT_NAME}</span>
                  </div>
                )}
                <div className={`genie-bubble ${m.from}`}>{renderText(m.text)}</div>
                {m.action && (
                  <button className="genie-action" onClick={() => { onNavigate?.(m.action.view); setOpen(false); }}>
                    → {m.action.label}
                  </button>
                )}
              </div>
            ))}
            {typing && (
              <div className="genie-bubble bot" style={{ display: "flex", gap: 4, width: "fit-content" }}>
                {[0, 1, 2].map((i) => <span key={i} className="genie-typing" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            )}
          </div>

          {/* Suggestion chips */}
          {showChips && (
            <div className="genie-chips">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="genie-chip">
                  <FaRegLightbulb size={10} style={{ opacity: 0.7 }} /> {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="genie-input-row">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask ${BOT_NAME} anything…`} className="genie-input" />
            <button type="submit" disabled={!input.trim()} className="genie-send" style={{ background: input.trim() ? "var(--brand)" : "#cbd5e1" }}>
              <FaPaperPlane size={13} />
            </button>
          </form>
        </div>
      )}

      <style>{`
        .genie-launcher {
          position: fixed; bottom: 22px; right: 22px; z-index: 4000;
          width: 50px; height: 50px; padding: 0; border: none; cursor: pointer;
          border-radius: 16px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--brand), var(--teal-800));
          color: #fff; font-family: var(--font);
          box-shadow: 0 8px 22px rgba(52,160,106,0.42);
          transition: transform 0.2s; overflow: visible;
        }
        .genie-launcher:hover { transform: translateY(-2px) rotate(-6deg); }
        .genie-launcher-glow {
          position: absolute; inset: 0; border-radius: 16px;
          box-shadow: 0 0 0 0 rgba(52,160,106,0.5);
          animation: genieGlow 2.4s ease-out infinite; pointer-events: none;
        }
        @keyframes genieGlow { 0% { box-shadow: 0 0 0 0 rgba(52,160,106,0.45);} 70% { box-shadow: 0 0 0 16px rgba(52,160,106,0);} 100% { box-shadow: 0 0 0 0 rgba(52,160,106,0);} }

        .genie-panel {
          position: fixed; bottom: 22px; right: 22px; z-index: 4000;
          width: 376px; max-width: calc(100vw - 28px);
          height: 560px; max-height: calc(100vh - 90px);
          background: #fff; border-radius: 22px; overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 28px 70px rgba(16,40,30,0.32);
          animation: geniePop 0.24s cubic-bezier(.2,.8,.2,1);
        }
        @keyframes geniePop { from { opacity: 0; transform: translateY(20px) scale(0.96);} to { opacity: 1; transform: translateY(0) scale(1);} }

        .genie-header {
          background: linear-gradient(135deg, var(--brand) 0%, var(--teal-800) 100%);
          color: #fff; padding: 15px 16px; display: flex; align-items: center; gap: 12px; position: relative;
        }
        .genie-header::after {
          content: ""; position: absolute; top: -40px; right: -30px; width: 130px; height: 130px;
          background: radial-gradient(circle, rgba(255,255,255,0.16), transparent 70%); pointer-events: none;
        }
        .genie-avatar {
          width: 40px; height: 40px; border-radius: 13px; flex-shrink: 0;
          background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25);
        }
        .genie-dot { width: 7px; height: 7px; border-radius: 50%; background: #86efac; display: inline-block; box-shadow: 0 0 0 0 rgba(134,239,172,0.7); animation: genieGlow 2s infinite; }
        .genie-close { background: rgba(255,255,255,0.16); border: none; color: #fff; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        .genie-body { flex: 1; overflow-y: auto; padding: 16px 14px; background: #f4f8f6; display: flex; flex-direction: column; gap: 12px; }
        .genie-body::-webkit-scrollbar { width: 4px; }
        .genie-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .genie-mini { width: 16px; height: 16px; border-radius: 5px; background: #d1fae5; color: #0f766e; display: flex; align-items: center; justify-content: center; }

        .genie-bubble {
          max-width: 86%; padding: 11px 14px; border-radius: 16px; font-size: 13px; line-height: 1.55;
        }
        .genie-bubble.user { background: var(--brand); color: #fff; border-bottom-right-radius: 5px; }
        .genie-bubble.bot { background: #fff; color: #334155; border-bottom-left-radius: 5px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .genie-typing { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; display: inline-block; animation: genieTyping 1s infinite; }
        @keyframes genieTyping { 0%,60%,100% { opacity: 0.3; transform: translateY(0);} 30% { opacity: 1; transform: translateY(-3px);} }

        .genie-action {
          margin-top: 7px; font-size: 12px; font-weight: 700; color: var(--brand);
          background: var(--brand-light); border: 1px solid #bbf7d0; border-radius: 9px;
          padding: 7px 13px; cursor: pointer; transition: background 0.15s;
        }
        .genie-action:hover { background: #dcfce7; }

        .genie-chips { display: flex; flex-wrap: wrap; gap: 7px; padding: 10px 12px 2px; background: #f4f8f6; }
        .genie-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; color: #475569; background: #fff; border: 1px solid #e2e8f0;
          border-radius: 999px; padding: 7px 12px; cursor: pointer; transition: all 0.15s;
        }
        .genie-chip:hover { border-color: var(--brand); color: var(--brand); }

        .genie-input-row { display: flex; gap: 8px; padding: 12px; background: #f4f8f6; border-top: 1px solid #e9eef0; }
        .genie-input {
          flex: 1; border: 1px solid #e2e8f0; border-radius: 999px; padding: 11px 16px;
          font-size: 13px; outline: none; font-family: var(--font); background: #fff;
        }
        .genie-input:focus { border-color: var(--brand); }
        .genie-send { width: 44px; height: 44px; border-radius: 50%; border: none; color: #fff; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s; }

        @media (max-width: 520px) {
          .genie-launcher { bottom: 16px; right: 16px; }
          .genie-panel { right: 12px; left: 12px; bottom: 12px; width: auto; max-width: none; height: calc(100vh - 80px); }
        }
      `}</style>
    </>
  );
}
