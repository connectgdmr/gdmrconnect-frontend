import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaPaperPlane, FaRegLightbulb, FaMicrophone, FaStop, FaCommentDots } from "react-icons/fa";
import { GiLion } from "react-icons/gi";

// ════════════════════════════════════════════════════════════════════════════
//  REXOR — the GDMR Connect in-app assistant.
//  Answers first from a curated, instant, zero-cost HR knowledge base with
//  keyword matching + one-tap navigation. Anything it doesn't recognize is
//  handed to a small LLM fallback (/api/assistant/chat) if the backend has
//  one configured — otherwise it just says so, no backend/API key required.
//
//  Admin/owner get a second skin: a HUD-style voice console (see "Voice
//  mode" below) that opens straight into listening. Everyone else keeps the
//  original friendly light chat panel, unchanged.
// ════════════════════════════════════════════════════════════════════════════

const BOT_NAME = "Rexor";

const KB = [
  { k: ["apply leave", "take leave", "request leave", "leave application", "how to leave", "book leave", "want leave"],
    a: "To request time off, head to **Apply Leave**. Pick your dates, choose full or half day, add a reason (and a document if needed), then submit. It goes to your manager and HR for approval.",
    action: { label: "Apply Leave", view: "leave", subView: "apply-leave", roles: ["employee", "manager"] } },
  { k: ["leave balance", "leave status", "my leaves", "leave approved", "leave pending", "how many leave"],
    a: "All your leave requests and their status (Pending / Approved / Rejected) live under **My Leaves**.",
    action: { label: "My Leaves", view: "leave", subView: "my-leaves", roles: ["employee", "manager"] } },
  { k: ["check in", "checkin", "check out", "checkout", "mark attendance", "punch", "clock in", "clock out"],
    a: "Tap **Check In** / **Check Out** on your dashboard — it opens your camera for a quick photo verification. Tip: you can only check in within ±1 hour of your assigned shift." },
  { k: ["attendance log", "my attendance", "attendance history", "attendance record"],
    a: "Your full check-in / check-out history is under **Attendance**.",
    action: { label: "Attendance Log", view: "attendance", subView: "attendance-log", roles: ["employee", "manager"] } },
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

// ── Voice mode (admin/owner only) ────────────────────────────────────────────
// Tap the launcher and it opens straight into a HUD-style listening console —
// Rexor greets out loud, then listens for the question. No manual language
// toggle: the Web Speech API only accepts one recognizer language at a time,
// so we start on a broad Indian-English locale (which in practice also
// picks up a lot of spoken Malayalam on Chrome/Android) and then auto-detect
// which language was actually spoken from the SCRIPT of the returned
// transcript — Malayalam Unicode block present → reply in Malayalam;
// otherwise English. That detected language is then "sticky" for the next
// turn's recognizer locale, so a Malayalam conversation stays more
// accurately recognized as it goes.
const EN_FALLBACK      = "Sorry, I couldn't get that answer right now.";
const ML_FALLBACK      = "ക്ഷമിക്കണം, ഇപ്പോൾ ഉത്തരം നൽകാൻ കഴിയുന്നില്ല.";
const UNSUPPORTED_MSG  = "Voice isn't supported in this browser — try Chrome.";
const GREETING_TEXT    = "Hi, I'm Rexor, GDMR's AI assistant. How may I help you?";

function detectLangFromText(text) {
  return /[ഀ-ൿ]/.test(text) ? "ml" : "en";
}

export default function ChatBot({ user, role = "employee", onNavigate, token, api }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);
  const firstName = user?.name?.split(" ")[0] || "there";

  // Voice mode state
  const isAdmin = role === "admin" || role === "owner";
  const [panelMode, setPanelMode] = useState("chat"); // "voice" | "chat"
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [detectedLang, setDetectedLang] = useState("en"); // last-detected spoken language
  const recognitionRef = useRef(null);
  // Rolling voice-conversation memory, sent with each turn so follow-ups
  // ("what about the design team?") resolve naturally instead of every
  // question being answered as if asked in isolation. Reset whenever the
  // panel closes — a fresh open starts a fresh conversation.
  const voiceHistoryRef = useRef([]);
  const SpeechRecognitionAPI = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const voiceSupported = isAdmin && !!SpeechRecognitionAPI;
  // Idle / listening / speaking / thinking — drives the HUD orb + caption.
  const hudState = listening ? "listening" : speaking ? "speaking" : typing ? "thinking" : "idle";

  // Continuous conversation: after Rexor answers, it keeps listening for the
  // next question automatically — no re-tap needed — until the admin taps
  // Stop, switches to Text mode, or closes the panel. voiceActiveRef (not
  // state) so async callbacks (speech onend, recognition onend) always read
  // the latest value instead of a stale render's closure.
  const voiceActiveRef = useRef(false);
  const panelModeRef = useRef(panelMode);
  useEffect(() => { panelModeRef.current = panelMode; }, [panelMode]);

  // ── Voice picker — up to 3 selectable English voices (Indian-accented
  // ones surface first when installed), persisted across sessions. Web
  // Speech only exposes whatever voices the OS/browser actually has, so
  // this can't guarantee 3 or a specific accent exists on every device —
  // it just ranks and exposes what's really there. Malayalam replies keep
  // auto-picking whatever Malayalam voice is installed, since substituting
  // an English voice for Malayalam script wouldn't read correctly anyway.
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState(() => {
    try { return localStorage.getItem("rexor_voice_uri") || ""; } catch { return ""; }
  });

  function rankEnglishVoices(all) {
    const en = all.filter(v => v.lang?.toLowerCase().startsWith("en"));
    const isIndian = (v) => v.lang?.toLowerCase() === "en-in" || /india/i.test(v.name);
    return [...en].sort((a, b) => (isIndian(b) ? 1 : 0) - (isIndian(a) ? 1 : 0)).slice(0, 3);
  }

  function refreshVoiceList() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const ranked = rankEnglishVoices(window.speechSynthesis.getVoices());
    setAvailableVoices(ranked);
    setVoiceURI(prev => {
      if (prev && ranked.some(v => v.voiceURI === prev)) return prev;
      const fallback = ranked[0]?.voiceURI || "";
      try { localStorage.setItem("rexor_voice_uri", fallback); } catch { /* ignore */ }
      return fallback;
    });
  }

  function cycleVoice() {
    if (availableVoices.length < 2) return;
    const idx = availableVoices.findIndex(v => v.voiceURI === voiceURI);
    const next = availableVoices[(idx + 1) % availableVoices.length];
    setVoiceURI(next.voiceURI);
    try { localStorage.setItem("rexor_voice_uri", next.voiceURI); } catch { /* ignore */ }
  }

  function speak(text, lang, onEnd) {
    if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "ml" ? "ml-IN" : "en-IN";
    const voices = window.speechSynthesis.getVoices();
    // English replies honor the admin's chosen voice when available;
    // Malayalam always auto-picks a Malayalam-capable voice.
    const chosen = lang === "en" ? voices.find(v => v.voiceURI === voiceURI) : null;
    const match = chosen
      || voices.find(v => v.lang === utter.lang)
      || voices.find(v => v.lang?.startsWith(lang === "ml" ? "ml" : "en"));
    if (match) utter.voice = match;
    setSpeaking(true);
    utter.onend = () => { setSpeaking(false); onEnd?.(); };
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }

  async function askVoiceAssistant(q, lang, history) {
    if (!token) return null;
    try {
      const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const res = await fetch(`${baseUrl}/api/assistant/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: q, lang, history }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.reply || null;
    } catch {
      return null;
    }
  }

  async function sendVoice(transcript) {
    const q = transcript.trim();
    if (!q) return;
    const lang = detectLangFromText(q);
    setDetectedLang(lang);
    if (!open) setOpen(true);
    setMessages((m) => [...m, { from: "user", text: q }]);
    setTyping(true);
    const reply = await askVoiceAssistant(q, lang, voiceHistoryRef.current);
    setTyping(false);
    const replyText = reply || (lang === "ml" ? ML_FALLBACK : EN_FALLBACK);
    setMessages((m) => [...m, { from: "bot", text: replyText }]);
    // Only remember real turns (not the fallback error line) — keep the
    // last 8 so the prompt stays small and stays on the current topic.
    if (reply) {
      voiceHistoryRef.current = [
        ...voiceHistoryRef.current,
        { role: "user", content: q },
        { role: "assistant", content: replyText },
      ].slice(-8);
    }
    // Keep the conversation going: once Rexor finishes speaking, start
    // listening again automatically — as long as the admin hasn't tapped
    // Stop / switched to Text / closed the panel in the meantime. A short
    // delay after the utterance ends avoids the mic catching the tail of
    // Rexor's own voice through the speaker.
    speak(replyText, lang, () => {
      if (voiceActiveRef.current && panelModeRef.current === "voice") {
        setTimeout(() => { if (voiceActiveRef.current) startListening(); }, 400);
      }
    });
  }

  function startListening() {
    if (!SpeechRecognitionAPI) {
      alert(UNSUPPORTED_MSG);
      return;
    }
    if (!open) setOpen(true);
    window.speechSynthesis?.cancel();
    const recog = new SpeechRecognitionAPI();
    // Sticks to whatever language was last detected, so a Malayalam
    // conversation gets progressively better recognized turn to turn.
    recog.lang = detectedLang === "ml" ? "ml-IN" : "en-IN";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    let gotResult = false;
    recog.onresult = (e) => {
      gotResult = true;
      const transcript = e.results?.[0]?.[0]?.transcript;
      if (transcript) sendVoice(transcript);
    };
    recog.onerror = () => { setListening(false); };
    recog.onend = () => {
      setListening(false);
      // Recognizer timed out on silence with nothing heard — retry once so
      // a brief pause mid-conversation doesn't silently end the loop.
      if (!gotResult && voiceActiveRef.current && panelModeRef.current === "voice") {
        setTimeout(() => { if (voiceActiveRef.current) startListening(); }, 500);
      }
    };
    recognitionRef.current = recog;
    try {
      recog.start();
      setListening(true);
      voiceActiveRef.current = true;
    } catch {
      setListening(false);
    }
  }

  function stopListening() {
    voiceActiveRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }

  // Single entry point for the launcher — admins go straight into voice
  // mode; everyone else (or unsupported browsers) gets text chat.
  function openAssistant() {
    setOpen(true);
    setPanelMode(voiceSupported ? "voice" : "chat");
  }

  useEffect(() => {
    if (!open || messages.length > 0) return;
    if (voiceSupported && panelMode === "voice") {
      setMessages([{ from: "bot", text: GREETING_TEXT }]);
      speak(GREETING_TEXT, "en", () => startListening());
    } else {
      setMessages([{ from: "bot", text: `Hi ${firstName}! 👋 I'm **${BOT_NAME}**, your GDMR Connect assistant. Ask me anything about leaves, attendance, payslips, courses or careers — or tap a suggestion below.` }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      voiceHistoryRef.current = []; // fresh conversation memory next time it's opened
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  // Chrome loads TTS voices asynchronously — prime the list (and build the
  // ranked voice picker) so the first speak() call has a chance of finding
  // a matching-language voice.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    refreshVoiceList();
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoiceList);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", refreshVoiceList);
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FALLBACK_TEXT = "I'm still learning that one! 🌱 But I can instantly help with **leaves, attendance, payslips, courses, careers, announcements, holidays, password help** and more. Try one of these, or reach HR at info@gdmrfoundation.com.";

  // Nearest upcoming company holiday from the live GET /api/holidays list
  // (database.holidays_col) — was a hardcoded src/data/holidays.js import
  // before holidays got a real backend + admin CRUD. routes/assistant.py
  // reads next_holiday.days_away (snake_case) from this payload — the old
  // static helper returned "daysAway" instead, which the backend silently
  // never matched, so this also fixes a holiday nudge that was quietly
  // broken from day one.
  async function getNextHoliday() {
    if (!token) return null;
    try {
      const holidays = await api.getHolidays(token);
      if (!Array.isArray(holidays)) return null;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      let next = null;
      for (const h of holidays) {
        const d = new Date(`${h.date}T00:00:00`);
        if (isNaN(d) || d < today) continue;
        if (!next || d < next.dateObj) next = { ...h, dateObj: d };
      }
      if (!next) return null;
      return { name: next.name, date: next.date, day: next.day, days_away: Math.round((next.dateObj - today) / 86400000) };
    } catch {
      return null;
    }
  }

  // Asks the backend LLM (if configured) for anything the KB doesn't recognize.
  // Returns null on any failure so the caller can fall back to FALLBACK_TEXT.
  async function askAssistant(q) {
    if (!token) return null;
    try {
      const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
      const nextHoliday = await getNextHoliday();
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

  function closePanel() {
    stopListening();
    window.speechSynthesis?.cancel();
    setOpen(false);
  }

  function switchToChat() {
    stopListening();
    setPanelMode("chat");
  }

  const hudCaption = { idle: "TAP TO SPEAK", listening: "LISTENING", speaking: "SPEAKING", thinking: "THINKING" }[hudState];

  return (
    <>
      {/* Launcher — compact glowing orb. For admin/owner this goes straight
          into voice mode; everyone else gets the text panel. */}
      {!open && (
        <button onClick={openAssistant} title={`Ask ${BOT_NAME}`} className="genie-launcher">
          <span className="genie-launcher-glow" />
          <GiLion size={24} />
        </button>
      )}

      {/* Popup — centered modal */}
      {open && (
        <div className="genie-overlay" onClick={closePanel}>
          {voiceSupported ? (
            /* ═══════════════════ HUD voice console (admin/owner) ═══════════════════ */
            <div className="hud-panel" onClick={(e) => e.stopPropagation()}>
              <div className="hud-topbar">
                <div className="hud-wordmark">
                  REX<span>OR</span>
                  <small>GDMR CONNECT · AI ASSISTANT</small>
                </div>
                <div className="hud-topbar-right">
                  <span className="hud-status-chip"><span className="hud-led" />ONLINE</span>
                  <button onClick={closePanel} className="hud-close"><FaTimes size={12} /></button>
                </div>
              </div>

              <div className="hud-readout-row">
                <div>MODE&nbsp;<span className="hud-val">{panelMode === "voice" ? "VOICE" : "TEXT"}</span></div>
                <div className="hud-lang-pair">
                  <span className={`hud-lang-pill ${detectedLang === "en" ? "active" : ""}`}>EN</span>
                  <span className={`hud-lang-pill ${detectedLang === "ml" ? "active" : ""}`}>ML</span>
                </div>
              </div>

              {availableVoices.length > 0 && (
                <div className="hud-voice-row">
                  <span>VOICE</span>
                  <button
                    type="button"
                    className="hud-voice-picker"
                    onClick={cycleVoice}
                    disabled={availableVoices.length < 2}
                    title="Cycle voice (English replies only — Malayalam auto-picks its own)"
                  >
                    {(availableVoices.find(v => v.voiceURI === voiceURI)?.name || "Default").replace(/^Google\s*/i, "")}
                    {availableVoices.length > 1 && <span className="hud-voice-next">›</span>}
                  </button>
                </div>
              )}

              {panelMode === "voice" ? (
                <div className="hud-stage" data-state={hudState}>
                  <div className="hud-orb-wrap">
                    <div className="hud-ring r1" />
                    <div className="hud-ring r2" />
                    <div className="hud-ring r3" />
                    <div className="hud-orb-core"><GiLion size={30} /></div>
                  </div>
                  <div className="hud-caption">{hudCaption}</div>
                  <div className="hud-waveform">
                    {Array.from({ length: 8 }).map((_, i) => <i key={i} />)}
                  </div>
                </div>
              ) : (
                <div ref={scrollRef} className="hud-transcript">
                  {messages.map((m, i) => (
                    <div key={i} className={`hud-row ${m.from}`}>
                      <span className="hud-tag">{m.from === "user" ? "YOU" : "REXOR"}</span>
                      <span className="hud-txt">
                        {renderText(m.text)}
                        {m.action && (
                          <button className="hud-action" onClick={() => { onNavigate?.(m.action.view, m.action.subView); closePanel(); }}>
                            → {m.action.label}
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                  {typing && (
                    <div className="hud-row bot">
                      <span className="hud-tag">REXOR</span>
                      <span className="hud-txt hud-thinking">···</span>
                    </div>
                  )}
                </div>
              )}

              <div className="hud-bottombar">
                <div className="hud-mode-toggle">
                  <button
                    type="button"
                    className={panelMode === "voice" ? "active" : ""}
                    onClick={() => setPanelMode("voice")}
                  ><FaMicrophone size={10} /> VOICE</button>
                  <button
                    type="button"
                    className={panelMode === "chat" ? "active" : ""}
                    onClick={switchToChat}
                  ><FaCommentDots size={10} /> TEXT</button>
                </div>

                {panelMode === "voice" ? (
                  <button
                    type="button"
                    className={`hud-talk-btn ${listening ? "live" : ""}`}
                    onClick={listening ? stopListening : startListening}
                  >
                    {listening ? "■ STOP" : "● TALK"}
                  </button>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); send(); }} className="hud-input-row">
                    <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" className="hud-input" />
                    <button type="submit" disabled={!input.trim()} className="hud-send"><FaPaperPlane size={11} /></button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* ═══════════════════ Original light chat panel (everyone else) ═══════════════════ */
            <div className="genie-panel" onClick={(e) => e.stopPropagation()}>
              <div className="genie-header">
                <div className="genie-avatar"><GiLion size={22} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: 0.2 }}>{BOT_NAME}</div>
                  <div style={{ fontSize: 10.5, opacity: 0.9, display: "flex", alignItems: "center", gap: 5 }}>
                    <span className="genie-dot" /> GDMR Connect Assistant
                  </div>
                </div>
                <button onClick={closePanel} className="genie-close"><FaTimes size={13} /></button>
              </div>

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
                      <button className="genie-action" onClick={() => { onNavigate?.(m.action.view, m.action.subView); closePanel(); }}>
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

              {showChips && (
                <div className="genie-chips">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="genie-chip">
                      <FaRegLightbulb size={10} style={{ opacity: 0.7 }} /> {s}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="genie-input-row">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask ${BOT_NAME} anything…`} className="genie-input" />
                <button type="submit" disabled={!input.trim()} className="genie-send" style={{ background: input.trim() ? "var(--brand)" : "#cbd5e1" }}>
                  <FaPaperPlane size={13} />
                </button>
              </form>
            </div>
          )}
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

        .genie-overlay {
          position: fixed; inset: 0; z-index: 4000;
          background: rgba(15,23,42,0.5);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; animation: genieFade 0.18s ease-out;
        }
        @keyframes genieFade { from { opacity: 0; } to { opacity: 1; } }

        /* ═══════════════════ Light chat panel (non-admin) ═══════════════════ */
        .genie-panel {
          width: 400px; max-width: 100%;
          height: 620px; max-height: calc(100vh - 40px);
          background: #fff; border-radius: 22px; overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 28px 70px rgba(16,40,30,0.4);
          animation: geniePop 0.22s cubic-bezier(.2,.8,.2,1);
        }
        @keyframes geniePop { from { opacity: 0; transform: scale(0.94);} to { opacity: 1; transform: scale(1);} }

        .genie-header {
          background: linear-gradient(135deg, var(--brand) 0%, var(--teal-800) 100%);
          color: #fff; padding: 15px 16px; display: flex; align-items: center; gap: 12px; position: relative;
          flex-shrink: 0;
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
        .genie-close { background: rgba(255,255,255,0.16); border: none; color: #fff; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

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

        .genie-chips { display: flex; flex-wrap: wrap; gap: 7px; padding: 10px 12px 2px; background: #f4f8f6; flex-shrink: 0; }
        .genie-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; color: #475569; background: #fff; border: 1px solid #e2e8f0;
          border-radius: 999px; padding: 7px 12px; cursor: pointer; transition: all 0.15s;
        }
        .genie-chip:hover { border-color: var(--brand); color: var(--brand); }

        .genie-input-row { display: flex; gap: 8px; padding: 12px; background: #f4f8f6; border-top: 1px solid #e9eef0; flex-shrink: 0; }
        .genie-input {
          flex: 1; border: 1px solid #e2e8f0; border-radius: 999px; padding: 11px 16px;
          font-size: 13px; outline: none; font-family: var(--font); background: #fff;
        }
        .genie-input:focus { border-color: var(--brand); }
        .genie-send { width: 44px; height: 44px; border-radius: 50%; border: none; color: #fff; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s; background: var(--brand); }

        /* ═══════════════════ HUD voice console (admin/owner) ═══════════════════ */
        .hud-panel {
          --void:       #050b09;
          --void-2:     #081310;
          --panel:      #0a1815;
          --line:       #16332a;
          --mint:       #3ddc97;
          --mint-dim:   #1f6b4d;
          --mint-glow:  rgba(61,220,151,0.5);
          --amber:      #f2b155;
          --amber-glow: rgba(242,177,85,0.45);
          --ink:        #eafff2;
          --ink-dim:    #6d9686;
          --ink-faint:  #3d5c50;
          --mono: ui-monospace, "JetBrains Mono", "SF Mono", "Cascadia Code", Consolas, monospace;

          width: 400px; max-width: 100%;
          height: 620px; max-height: calc(100vh - 40px);
          background: linear-gradient(180deg, var(--panel) 0%, var(--void-2) 100%);
          border: 1px solid var(--line);
          border-radius: 22px; overflow: hidden;
          display: flex; flex-direction: column;
          font-family: var(--mono);
          color: var(--ink);
          box-shadow: 0 0 0 1px rgba(61,220,151,0.06), 0 28px 70px -14px rgba(0,0,0,0.85), 0 0 60px -24px var(--mint-glow);
          animation: geniePop 0.22s cubic-bezier(.2,.8,.2,1);
        }

        .hud-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px 12px; border-bottom: 1px solid var(--line); flex-shrink: 0;
          background: radial-gradient(120px 60px at 10% 0%, rgba(61,220,151,0.14), transparent 70%);
        }
        .hud-wordmark { font-family: -apple-system, "Segoe UI", sans-serif; font-weight: 800; font-size: 14px; letter-spacing: 0.2em; color: var(--ink); }
        .hud-wordmark span { color: var(--mint); }
        .hud-wordmark small { display: block; font-family: var(--mono); font-weight: 400; font-size: 8.5px; letter-spacing: 0.08em; color: var(--ink-faint); margin-top: 3px; }
        .hud-topbar-right { display: flex; align-items: center; gap: 8px; }
        .hud-status-chip {
          display: flex; align-items: center; gap: 6px; font-size: 9.5px; letter-spacing: 0.08em;
          color: var(--ink-dim); border: 1px solid var(--line); border-radius: 999px;
          padding: 4px 9px 4px 7px; background: rgba(61,220,151,0.04);
        }
        .hud-led { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px 1px var(--mint-glow); animation: hudLed 2.2s ease-in-out infinite; }
        @keyframes hudLed { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        .hud-close { background: rgba(255,255,255,0.06); border: 1px solid var(--line); color: var(--ink-dim); cursor: pointer; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .hud-readout-row {
          display: flex; justify-content: space-between; padding: 9px 16px;
          border-bottom: 1px solid var(--line); font-size: 9px; letter-spacing: 0.1em; color: var(--ink-faint); flex-shrink: 0;
        }
        .hud-val { color: var(--ink-dim); }
        .hud-lang-pair { display: flex; gap: 6px; }
        .hud-lang-pill { padding: 2px 7px; border-radius: 5px; border: 1px solid var(--line); color: var(--ink-faint); transition: all 0.35s ease; }
        .hud-lang-pill.active { color: var(--void); background: var(--mint); border-color: var(--mint); box-shadow: 0 0 12px -2px var(--mint-glow); }

        .hud-voice-row {
          display: flex; align-items: center; gap: 8px; padding: 7px 16px;
          border-bottom: 1px solid var(--line); font-size: 9px; letter-spacing: 0.1em; color: var(--ink-faint); flex-shrink: 0;
        }
        .hud-voice-picker {
          display: flex; align-items: center; gap: 4px;
          background: transparent; border: none; color: var(--ink-dim);
          font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em;
          cursor: pointer; padding: 0; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .hud-voice-picker:disabled { cursor: default; }
        .hud-voice-picker:not(:disabled):hover { color: var(--mint); }
        .hud-voice-next { color: var(--mint); flex-shrink: 0; }

        .hud-stage { flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 20px; }
        .hud-orb-wrap { position: relative; width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; }
        .hud-ring { position: absolute; border-radius: 50%; border: 1px solid var(--mint-dim); opacity: 0.55; }
        .hud-ring.r1 { inset: 0; }
        .hud-ring.r2 { inset: 17px; }
        .hud-ring.r3 { inset: 34px; }
        .hud-orb-core {
          position: relative; width: 74px; height: 74px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle at 35% 30%, #123b2c, #06120d 72%);
          border: 1px solid var(--mint); color: var(--mint);
          box-shadow: inset 0 0 24px rgba(61,220,151,0.18), 0 0 30px -4px var(--mint-glow);
          z-index: 2; transition: box-shadow 0.4s ease, border-color 0.4s ease, color 0.4s ease;
        }

        .hud-stage[data-state="idle"] .hud-ring.r1 { animation: hudBreathe 3.6s ease-in-out infinite; }
        .hud-stage[data-state="idle"] .hud-ring.r2 { animation: hudBreathe 3.6s ease-in-out infinite 0.3s; }
        .hud-stage[data-state="idle"] .hud-ring.r3 { animation: hudBreathe 3.6s ease-in-out infinite 0.6s; }
        @keyframes hudBreathe { 0%,100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.03); opacity: 0.7; } }

        .hud-stage[data-state="listening"] .hud-ring { animation: hudSweep 1.6s cubic-bezier(.2,.7,.3,1) infinite; border-color: var(--mint); }
        .hud-stage[data-state="listening"] .hud-ring.r2 { animation-delay: 0.35s; }
        .hud-stage[data-state="listening"] .hud-ring.r3 { animation-delay: 0.7s; }
        @keyframes hudSweep { 0% { transform: scale(0.82); opacity: 0.9; } 100% { transform: scale(1.28); opacity: 0; } }
        .hud-stage[data-state="listening"] .hud-orb-core { box-shadow: inset 0 0 28px rgba(61,220,151,0.32), 0 0 46px -2px var(--mint-glow); }

        .hud-stage[data-state="speaking"] .hud-ring { animation: hudSpeak 0.85s ease-in-out infinite; border-color: var(--mint); }
        .hud-stage[data-state="speaking"] .hud-ring.r2 { animation-delay: 0.1s; }
        .hud-stage[data-state="speaking"] .hud-ring.r3 { animation-delay: 0.2s; }
        @keyframes hudSpeak { 0%,100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.07); opacity: 0.9; } }
        .hud-stage[data-state="speaking"] .hud-orb-core { box-shadow: inset 0 0 26px rgba(61,220,151,0.28), 0 0 40px -2px var(--mint-glow); }

        .hud-stage[data-state="thinking"] .hud-ring.r1 { border-style: dashed; border-color: var(--amber); animation: hudSpin 2.4s linear infinite; opacity: 0.85; }
        .hud-stage[data-state="thinking"] .hud-ring.r2 { border-color: var(--amber-glow); opacity: 0.3; animation: hudBreathe 2s ease-in-out infinite; }
        .hud-stage[data-state="thinking"] .hud-ring.r3 { opacity: 0; }
        @keyframes hudSpin { to { transform: rotate(360deg); } }
        .hud-stage[data-state="thinking"] .hud-orb-core { border-color: var(--amber); color: var(--amber); box-shadow: inset 0 0 24px rgba(242,177,85,0.22), 0 0 34px -4px var(--amber-glow); }

        .hud-caption { font-size: 11.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
        .hud-stage[data-state="listening"] .hud-caption,
        .hud-stage[data-state="speaking"] .hud-caption { color: var(--mint); }
        .hud-stage[data-state="thinking"] .hud-caption { color: var(--amber); }

        .hud-waveform { display: flex; align-items: flex-end; gap: 3px; height: 22px; opacity: 0.25; transition: opacity 0.3s ease; }
        .hud-stage[data-state="listening"] .hud-waveform,
        .hud-stage[data-state="speaking"] .hud-waveform { opacity: 1; }
        .hud-waveform i { width: 3px; background: var(--mint); border-radius: 2px; height: 4px; }
        .hud-stage[data-state="listening"] .hud-waveform i,
        .hud-stage[data-state="speaking"] .hud-waveform i { animation: hudWave 0.9s ease-in-out infinite; }
        .hud-waveform i:nth-child(1) { animation-delay: 0s; } .hud-waveform i:nth-child(2) { animation-delay: 0.1s; }
        .hud-waveform i:nth-child(3) { animation-delay: 0.2s; } .hud-waveform i:nth-child(4) { animation-delay: 0.3s; }
        .hud-waveform i:nth-child(5) { animation-delay: 0.15s; } .hud-waveform i:nth-child(6) { animation-delay: 0.25s; }
        .hud-waveform i:nth-child(7) { animation-delay: 0.05s; } .hud-waveform i:nth-child(8) { animation-delay: 0.35s; }
        @keyframes hudWave { 0%,100% { height: 4px; } 50% { height: 20px; } }

        .hud-transcript { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; background: var(--void-2); font-size: 11.5px; line-height: 1.6; }
        .hud-transcript::-webkit-scrollbar { width: 4px; }
        .hud-transcript::-webkit-scrollbar-thumb { background: var(--line); border-radius: 2px; }
        .hud-row { display: flex; gap: 8px; }
        .hud-tag { color: var(--ink-faint); flex-shrink: 0; width: 46px; font-size: 10px; padding-top: 1px; }
        .hud-row.user .hud-tag { color: var(--mint); }
        .hud-txt { color: var(--ink-dim); }
        .hud-row.user .hud-txt { color: var(--ink); }
        .hud-thinking { animation: hudDots 1.2s steps(3,end) infinite; }
        @keyframes hudDots { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
        .hud-action { display: block; margin-top: 6px; font-family: var(--mono); font-size: 10.5px; font-weight: 700; color: var(--mint); background: rgba(61,220,151,0.08); border: 1px solid var(--mint-dim); border-radius: 6px; padding: 5px 10px; cursor: pointer; }

        .hud-bottombar { display: flex; align-items: center; gap: 10px; padding: 12px 16px 16px; border-top: 1px solid var(--line); flex-shrink: 0; }
        .hud-mode-toggle { display: flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; flex-shrink: 0; }
        .hud-mode-toggle button { font-family: var(--mono); font-size: 9px; letter-spacing: 0.08em; background: transparent; color: var(--ink-faint); border: none; padding: 7px 9px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .hud-mode-toggle button.active { background: var(--mint-dim); color: var(--ink); }

        .hud-talk-btn {
          margin-left: auto; font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
          color: var(--void); background: var(--mint); border: none; border-radius: 999px;
          padding: 9px 18px; cursor: pointer; box-shadow: 0 0 24px -6px var(--mint-glow); transition: transform 0.15s ease;
        }
        .hud-talk-btn:hover { transform: translateY(-1px); }
        .hud-talk-btn.live { background: var(--amber); box-shadow: 0 0 24px -6px var(--amber-glow); }

        .hud-input-row { display: flex; gap: 8px; flex: 1; }
        .hud-input { flex: 1; border: 1px solid var(--line); border-radius: 999px; padding: 9px 14px; font-size: 12px; outline: none; font-family: var(--mono); background: var(--void-2); color: var(--ink); }
        .hud-input:focus { border-color: var(--mint); }
        .hud-input::placeholder { color: var(--ink-faint); }
        .hud-send { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--mint-dim); color: var(--mint); background: rgba(61,220,151,0.08); flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .hud-send:disabled { opacity: 0.4; cursor: default; }

        @media (max-width: 520px) {
          .genie-launcher { bottom: 16px; right: 16px; }
          .genie-overlay { padding: 0; align-items: flex-end; }
          .genie-panel, .hud-panel { width: 100%; max-width: none; height: 92vh; max-height: none; border-radius: 22px 22px 0 0; }
        }
      `}</style>
    </>
  );
}
