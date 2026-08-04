
import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

// ─── API Client ───────────────────────────────────────────────────────────────
const API = axios.create({ baseURL: "http://localhost:5001/api/v1", timeout: 15000 });
API.interceptors.request.use(cfg => {
  const t = localStorage.getItem("chat_token");
  if (t) cfg.headers["Authorization"] = `Bearer ${t}`;
  return cfg;
});
import { motion, AnimatePresence } from "framer-motion";

// ─── Color Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#0a0f1e",
  panel:     "#0f1629",
  card:      "#141d35",
  border:    "#1e2d4a",
  accent1:   "#7c3aed",
  accent2:   "#4f46e5",
  cyan:      "#06b6d4",
  emerald:   "#10b981",
  textPri:   "#e2e8f0",
  textSec:   "#64748b",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CONTACTS = [
  { id: 1, name: "Alice Chen",    avatar: "AC", status: "online",  lastMsg: "Sounds good, see you then!",   time: "2m",  unread: 2, grad: "linear-gradient(135deg,#7c3aed,#4f46e5)" },
  { id: 2, name: "Bob Martinez",  avatar: "BM", status: "online",  lastMsg: "Can you review the PR?",        time: "15m", unread: 0, grad: "linear-gradient(135deg,#3b82f6,#2563eb)" },
  { id: 3, name: "Sara Kim",      avatar: "SK", status: "away",    lastMsg: "The deploy is ready ✅",        time: "1h",  unread: 1, grad: "linear-gradient(135deg,#10b981,#059669)" },
  { id: 4, name: "Dev Team",      avatar: "DT", status: "online",  lastMsg: "Sprint planning at 3pm",        time: "2h",  unread: 5, grad: "linear-gradient(135deg,#f97316,#ea580c)" },
  { id: 5, name: "Priya Patel",   avatar: "PP", status: "offline", lastMsg: "Thanks for the help!",          time: "1d",  unread: 0, grad: "linear-gradient(135deg,#ec4899,#db2777)" },
  { id: 6, name: "James Wilson",  avatar: "JW", status: "online",  lastMsg: "On it, will update you",        time: "3d",  unread: 0, grad: "linear-gradient(135deg,#06b6d4,#0891b2)" },
];

const INITIAL_MESSAGES = {
  1: [
    { id: 1, me: false, cid: 1, text: "Hey! Did you check the new design mockups?",                                          time: "10:02 AM" },
    { id: 2, me: true,  cid: 1, text: "Yeah, they look great! Really love the new color palette.",                           time: "10:04 AM" },
    { id: 3, me: false, cid: 1, text: "Right? The designer really nailed it this time. Are we still on for the review at 3?", time: "10:05 AM" },
    { id: 4, me: true,  cid: 1, text: "Absolutely! I'll have my notes ready. Bring the stakeholder feedback too?",           time: "10:07 AM" },
    { id: 5, me: false, cid: 1, text: "Sounds good, see you then! 🎉",                                                       time: "10:08 AM" },
  ],
  2: [
    { id: 1, me: false, cid: 2, text: "Hey, I pushed the auth refactor to feature/auth-v2",  time: "9:30 AM" },
    { id: 2, me: true,  cid: 2, text: "Got it, I'll take a look in a bit.",                  time: "9:45 AM" },
    { id: 3, me: false, cid: 2, text: "Can you review the PR?",                              time: "9:50 AM" },
  ],
  3: [
    { id: 1, me: false, cid: 3, text: "Just finished the CI pipeline config",   time: "8:00 AM" },
    { id: 2, me: true,  cid: 3, text: "Nice! Did the tests all pass?",          time: "8:15 AM" },
    { id: 3, me: false, cid: 3, text: "The deploy is ready ✅",                 time: "8:20 AM" },
  ],
  4: [
    { id: 1, me: false, cid: 4, text: "Good morning team! Standup in 10 mins",             time: "9:50 AM" },
    { id: 2, me: true,  cid: 4, text: "On my way!",                                        time: "9:52 AM" },
    { id: 3, me: false, cid: 4, text: "Sprint planning at 3pm — bring your estimates 📋",  time: "10:00 AM" },
  ],
  5: [],
  6: [],
};

const CONTACT_REPLIES = {
  1: ["Sounds perfect, let me know if anything changes!", "I'll send over the latest files now.", "Looking forward to the meeting!", "Can you share the doc link again?", "That makes total sense, thanks!"],
  2: ["Sure, I'll get on that ASAP!", "PR is ready for review whenever you're free.", "Let me know if anything looks off.", "Good call, I'll push the fix now.", "Thanks for the heads up!"],
  3: ["Pipeline is green ✅", "All 247 tests passed!", "Staging env is up and running.", "Logs look clean, no errors.", "Deployment took about 90 seconds this time."],
  4: ["@everyone Daily standup in 5!", "Great work this sprint everyone 🚀", "Remember to update your Jira tickets.", "Retro notes are in the shared doc.", "Demo session is at 4pm today."],
  5: ["Hey! Long time no talk 😊", "I just got your message, thanks so much!", "That would be really helpful, appreciate it!", "Let me check and get back to you.", "Sounds great!"],
  6: ["Will update you as soon as I have news.", "Just checked — everything looks good.", "On it! Give me 20 minutes.", "Done, let me know if you need anything else.", "Roger that 👍"],
};

const AI_REPLIES = [
  "I've analyzed your request. Based on the patterns I'm seeing in your conversations, here's my recommendation: focus on the highest-priority items first and delegate the rest.",
  "Great question! The sentiment analysis across your recent chats shows predominantly positive interactions (72%). I'd suggest maintaining this momentum by responding promptly.",
  "Sure! I can help with that. Here's a structured breakdown: 1) Identify the core issue, 2) Draft a clear response, 3) Follow up within 24 hours.",
  "Based on the context, there are three main approaches you could take. The most efficient would leverage your existing workflow without disrupting current processes.",
  "I've processed your message. The key action items I've identified are: review the PR, attend the 3pm meeting, and send the stakeholder update by EOD.",
  "Absolutely! Here's a polished draft for your reply: 'Thank you for your message. I've reviewed the details and will have a full response ready by tomorrow morning.'",
  "Interesting! The conversation threads I've analyzed suggest a pattern: most support requests come in on Tuesday-Thursday between 9am-11am. Planning around this could reduce response times.",
];

const SMART_REPLIES = ["Sounds great!", "I'll check it out", "Thanks!", "On it!", "Can we reschedule?", "Let me look into this", "👍", "Perfect!"];

const AI_SUGGESTIONS = [
  "Summarize my recent chats",
  "Draft a professional reply",
  "Analyze conversation sentiment",
  "Find action items from messages",
  "Suggest quick responses",
  "What's trending in my chats?",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const uid = () => Date.now() + Math.random();

// ─── Inline Styles ────────────────────────────────────────────────────────────
const s = {
  app:        { display: "flex", height: "100vh", width: "100vw", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden", color: C.textPri },
  sidebar:    { width: 64, minWidth: 64, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, paddingBottom: 12, background: C.panel, borderRight: `1px solid ${C.border}`, gap: 4, zIndex: 10 },
  mainArea:   { flex: 1, display: "flex", overflow: "hidden" },
  // sidebar items
  logo:       { width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, flexShrink: 0, boxShadow: "0 0 20px rgba(124,58,237,0.4)" },
  navBtn:     { width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", background: "transparent", color: C.textSec, transition: "all .2s", position: "relative" },
  navBtnActive: { background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(79,70,229,0.3))", color: "#a78bfa", boxShadow: "0 0 16px rgba(124,58,237,0.25)" },
  divider:    { width: 32, height: 1, background: C.border, margin: "8px 0" },
  // cards
  card:       { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 },
  panel:      { background: C.panel, borderRight: `1px solid ${C.border}` },
  // input
  inputBar:   { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 },
  sendBtn:    { width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(124,58,237,0.4)" },
  // bubbles
  bubbleSent: { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", padding: "10px 14px", borderRadius: "16px 16px 4px 16px", maxWidth: 380, fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" },
  bubbleRecv: { background: C.card, border: `1px solid ${C.border}`, color: C.textPri, padding: "10px 14px", borderRadius: "16px 16px 16px 4px", maxWidth: 380, fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const p = {
    chat:     "M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z",
    bot:      "M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7 14v3h4v-3H7zm6 0v3h4v-3h-4z",
    chart:    "M18 20V10M12 20V4M6 20v-6",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    send:     "M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z",
    attach:   "M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48",
    emoji:    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
    phone:    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.15 11a19.79 19.79 0 01-3.07-8.67A2 2 0 012.06 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
    video:    "M23 7l-7 5 7 5V7zM1 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5z",
    info:     "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01",
    sun:      "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M17 12a5 5 0 11-10 0 5 5 0 0110 0z",
    moon:     "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
    logout:   "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    check:    "M20 6L9 17l-5-5",
    bell:     "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0",
    search:   "M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z",
    user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
    shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    x:        "M18 6L6 18M6 6l12 12",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={p[name] || p.chat} />
    </svg>
  );
};

// ─── Avatar Component ─────────────────────────────────────────────────────────
function AvatarBadge({ initials, grad, size = 36, status }) {
  const dotColor = status === "online" ? "#10b981" : status === "away" ? "#f59e0b" : "#64748b";
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.3 }}>
        {initials}
      </div>
      {status && (
        <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: dotColor, border: `2px solid ${C.bg}` }} />
      )}
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({ label, children }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
            style={{ position: "absolute", left: 48, top: "50%", transform: "translateY(-50%)", background: C.card, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 12, padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100 }}>
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, dark, setDark, user, onSignOut }) {
  const navItems = [
    { id: "chat",      icon: "chat",     label: "Chats" },
    { id: "ai",        icon: "bot",      label: "AI Assistant" },
    { id: "analytics", icon: "chart",    label: "Analytics" },
    { id: "settings",  icon: "settings", label: "Settings" },
  ];

  return (
    <div style={s.sidebar}>
      {/* Logo */}
      <div style={s.logo}>
        <Icon name="chat" size={22} color="#fff" />
      </div>

      {/* Nav */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, alignItems: "center", paddingTop: 4 }}>
        {navItems.map(item => (
          <Tooltip key={item.id} label={item.label}>
            <motion.button
              onClick={() => setActive(item.id)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              style={{ ...s.navBtn, ...(active === item.id ? s.navBtnActive : {}) }}
            >
              <Icon name={item.icon} size={20} color={active === item.id ? "#a78bfa" : C.textSec} />
            </motion.button>
          </Tooltip>
        ))}
      </div>

      {/* Bottom controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        <div style={s.divider} />
        <Tooltip label={dark ? "Light mode" : "Dark mode"}>
          <motion.button onClick={() => setDark(d => !d)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} style={s.navBtn}>
            <Icon name={dark ? "sun" : "moon"} size={18} color={C.textSec} />
          </motion.button>
        </Tooltip>
        <Tooltip label={user?.name || "Profile"}>
          <motion.button onClick={() => setActive("settings")} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
            style={{ ...s.navBtn, padding: 2 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
              {user?.name?.[0] || "U"}
            </div>
          </motion.button>
        </Tooltip>
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const fillDemo = () => { setEmail("demo@chatapp.com"); setPassword("demo123"); setError(""); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    setError("");
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin({ name: email.split("@")[0] || "User", email }); }, 900);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 16 }}>
      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: "100%", maxWidth: 440, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 24, padding: 40, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
            <Icon name="chat" size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.textPri }}>ChatFlow AI</div>
            <div style={{ fontSize: 12, color: C.textSec }}>Intelligent Chat Platform</div>
          </div>
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 700, color: C.textPri, margin: "0 0 6px" }}>Welcome back</h2>
        <p style={{ fontSize: 14, color: C.textSec, margin: "0 0 24px" }}>Sign in to your dashboard</p>

        {/* Demo hint */}
        <motion.div onClick={fillDemo} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} style={{ background: "rgba(124,58,237,0.1)", border: "1px dashed rgba(124,58,237,0.5)", borderRadius: 12, padding: "12px 14px", marginBottom: 24, cursor: "pointer" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", marginBottom: 4 }}>🎯 Demo credentials — click to fill</div>
          <div style={{ fontSize: 12, color: C.textSec }}>Email: demo@chatapp.com</div>
          <div style={{ fontSize: 12, color: C.textSec }}>Password: demo123</div>
        </motion.div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: C.textPri, display: "block", marginBottom: 6 }}>Email</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: C.textPri, display: "block", marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>

          {error && <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>}

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
            style={{ padding: "14px", borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 600, fontSize: 15, border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(124,58,237,0.4)", opacity: loading ? 0.7 : 1 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "block" }} />
                Signing in…
              </span>
            ) : "Sign In"}
          </motion.button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: C.textSec, marginTop: 20 }}>Demo mode — any credentials work</p>
      </motion.div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ contact }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
      style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "4px 0" }}>
      <AvatarBadge initials={contact.avatar} grad={contact.grad} size={28} />
      <div style={{ ...s.bubbleRecv, padding: "10px 14px" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center", height: 14 }}>
          {[0, 1, 2].map(i => (
            <motion.span key={i} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15, ease: "easeInOut" }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: C.textSec, display: "block" }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Chat View ────────────────────────────────────────────────────────────────
function ChatView({ dark }) {
  const [activeId, setActiveId]   = useState(1);
  const [messages, setMessages]   = useState(() => {
    // Deep copy so mutations don't affect the constant
    const copy = {};
    Object.keys(INITIAL_MESSAGES).forEach(k => { copy[k] = [...INITIAL_MESSAGES[k]]; });
    return copy;
  });
  const [contacts, setContacts]   = useState(CONTACTS);
  const [input, setInput]         = useState("");
  const [typing, setTyping]       = useState(false);
  const [search, setSearch]       = useState("");
  const endRef                    = useRef(null);
  const inputRef                  = useRef(null);

  const activeContact = contacts.find(c => c.id === activeId) || contacts[0];
  const [smartReplies, setSmartReplies] = useState([]);

  // Fetch real smart replies when last message changes
  useEffect(() => {
    const msgs = messages[activeId] || [];
    const last = [...msgs].reverse().find(m => !m.me);
    if (last?.text) {
      API.post("/ai/smart-replies", { text: last.text })
        .then(({ data }) => { if (data.replies?.length) setSmartReplies(data.replies); })
        .catch(() => setSmartReplies([]));
    }
  }, [messages, activeId]);
  const currentMsgs   = messages[activeId] || [];
  const filtered      = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId, typing]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const newMsg = { id: uid(), me: true, cid: activeId, text, time: now() };

    setMessages(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), newMsg] }));
    setInput("");

    // Update contact last message
    setContacts(prev => prev.map(c => c.id === activeId ? { ...c, lastMsg: text, time: "now", unread: 0 } : c));

    setTyping(true);

    const replyDelay = 1200 + Math.random() * 600;
    setTimeout(() => {
      const pool = CONTACT_REPLIES[activeId] || AI_REPLIES;
      const replyText = pool[Math.floor(Math.random() * pool.length)];
      const reply = { id: uid(), me: false, cid: activeId, text: replyText, time: now() };
      setMessages(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), reply] }));
      setTyping(false);
      setContacts(prev => prev.map(c => c.id === activeId ? { ...c, lastMsg: replyText, time: "now" } : c));
    }, replyDelay);
  }, [input, activeId]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const switchContact = (id) => {
    setActiveId(id);
    setTyping(false);
    // Clear unread
    setContacts(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* ── Contact List ── */}
      <div style={{ width: 280, minWidth: 280, display: "flex", flexDirection: "column", background: C.panel, borderRight: `1px solid ${C.border}`, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.textPri, marginBottom: 10 }}>Messages</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px" }}>
            <Icon name="search" size={16} color={C.textSec} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
              style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: C.textPri, flex: 1 }} />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map(c => (
            <motion.button key={c.id} onClick={() => switchContact(c.id)} whileHover={{ x: 2 }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: activeId === c.id ? "rgba(124,58,237,0.12)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", borderLeft: activeId === c.id ? "2px solid #7c3aed" : "2px solid transparent" }}>
              <AvatarBadge initials={c.avatar} grad={c.grad} size={40} status={c.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: C.textSec, flexShrink: 0, marginLeft: 4 }}>{c.time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: C.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{c.lastMsg || "No messages yet"}</span>
                  {c.unread > 0 && (
                    <span style={{ marginLeft: 6, minWidth: 18, height: 18, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", flexShrink: 0 }}>
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Message Thread ── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: C.bg }}>
        {/* Thread Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <AvatarBadge initials={activeContact.avatar} grad={activeContact.grad} size={38} status={activeContact.status} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.textPri }}>{activeContact.name}</div>
            <div style={{ fontSize: 12, color: activeContact.status === "online" ? C.emerald : C.textSec }}>
              {activeContact.status === "online" ? "● Online" : activeContact.status === "away" ? "◑ Away" : "○ Offline"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {["phone", "video", "info"].map(icon => (
              <motion.button key={icon} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                style={{ width: 36, height: 36, borderRadius: 10, background: "transparent", border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.textSec }}>
                <Icon name={icon} size={16} color={C.textSec} />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {currentMsgs.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, color: C.textSec }}>
              <AvatarBadge initials={activeContact.avatar} grad={activeContact.grad} size={56} />
              <div style={{ fontSize: 16, fontWeight: 600, color: C.textPri }}>{activeContact.name}</div>
              <div style={{ fontSize: 13 }}>No messages yet — say hello!</div>
            </div>
          )}
          {currentMsgs.map((msg, i) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2, delay: i < 6 ? i * 0.04 : 0 }}
              style={{ display: "flex", flexDirection: msg.me ? "row-reverse" : "row", alignItems: "flex-end", gap: 8 }}>
              {!msg.me && <AvatarBadge initials={activeContact.avatar} grad={activeContact.grad} size={28} />}
              <div style={{ display: "flex", flexDirection: "column", alignItems: msg.me ? "flex-end" : "flex-start", gap: 3 }}>
                <div style={msg.me ? s.bubbleSent : s.bubbleRecv}>{msg.text}</div>
                <span style={{ fontSize: 11, color: C.textSec }}>{msg.time}</span>
              </div>
            </motion.div>
          ))}
          <AnimatePresence>
            {typing && <TypingIndicator key="typing" contact={activeContact} />}
          </AnimatePresence>
          <div ref={endRef} />
        </div>

        {/* Smart Reply Chips */}
        <div style={{ padding: "8px 20px 4px", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0, scrollbarWidth: "none" }}>
          {SMART_REPLIES.map(r => (
            <motion.button key={r} onClick={() => { setInput(r); inputRef.current?.focus(); }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 20, background: "transparent", border: `1px solid ${C.border}`, color: C.textSec, fontSize: 12, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>
              {r}
            </motion.button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{ padding: "12px 20px 16px", flexShrink: 0, background: C.panel, borderTop: `1px solid ${C.border}` }}>
          <div style={s.inputBar}>
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: C.textSec, padding: 2 }}>
              <Icon name="attach" size={18} color={C.textSec} />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activeContact.name}…`}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: C.textPri }}
            />
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: C.textSec, padding: 2 }}>
              <Icon name="emoji" size={18} color={C.textSec} />
            </button>
            <motion.button onClick={sendMessage} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} style={s.sendBtn}>
              <Icon name="send" size={16} color="#fff" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Assistant View ────────────────────────────────────────────────────────
function AIAssistantView() {
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "Hi! I'm your AI assistant powered by ChatFlow. I can help you summarize conversations, draft replies, analyze sentiment, and much more. What would you like to do today?" },
  ]);
  const [input, setInput]     = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef                = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  const send = useCallback((text) => {
    const q = (text || input).trim();
    if (!q) return;
    setMessages(prev => [...prev, { id: uid(), role: "user", text: q }]);
    setInput("");
    setThinking(true);
    const delay = 1400 + Math.random() * 800;
    setTimeout(() => {
      const r1 = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)];
      const r2 = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)];
      setMessages(prev => [...prev, { id: uid(), role: "assistant", text: r1 === r2 ? r1 : `${r1} ${r2}` }]);
      setThinking(false);
    }, delay);
  }, [input]);

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const RobotAvatar = () => (
    <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 14px rgba(124,58,237,0.4)" }}>
      <Icon name="bot" size={18} color="#fff" />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: C.bg }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <RobotAvatar />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.textPri }}>AI Assistant</div>
          <div style={{ fontSize: 12, color: C.emerald }}>● Active · GPT-4 Turbo</div>
        </div>
        <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>
          Pro Plan
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((msg, i) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i < 4 ? i * 0.05 : 0 }}
            style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-end" }}>
            {msg.role === "assistant" && <RobotAvatar />}
            <div style={{ maxWidth: 520, ...(msg.role === "user" ? s.bubbleSent : s.bubbleRecv) }}>
              {msg.text}
            </div>
          </motion.div>
        ))}

        <AnimatePresence>
          {thinking && (
            <motion.div key="thinking" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <RobotAvatar />
              <div style={{ ...s.bubbleRecv, padding: "10px 14px" }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center", height: 14 }}>
                  {[0, 1, 2].map(i => (
                    <motion.span key={i} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", display: "block" }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* Suggestion Chips */}
      <div style={{ padding: "8px 20px 4px", display: "flex", flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
        {AI_SUGGESTIONS.map(s => (
          <motion.button key={s} onClick={() => send(s)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ padding: "5px 12px", borderRadius: 20, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontSize: 12, cursor: "pointer" }}>
            {s}
          </motion.button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 20px 16px", background: C.panel, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={s.inputBar}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI anything…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: C.textPri }}
          />
          <motion.button onClick={() => send()} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} style={s.sendBtn}>
            <Icon name="send" size={16} color="#fff" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics View ───────────────────────────────────────────────────────────
function AnalyticsView() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);

  const weeklyMax = 230;
  const weeklyData = [
    { day: "Mon", val: 120 }, { day: "Tue", val: 180 }, { day: "Wed", val: 150 },
    { day: "Thu", val: 210 }, { day: "Fri", val: 190 }, { day: "Sat", val: 230 }, { day: "Sun", val: 175 },
  ];

  const topics = [
    { label: "Product Support",  pct: 35, color: "#7c3aed" },
    { label: "Technical Issues", pct: 28, color: "#4f46e5" },
    { label: "General Queries",  pct: 20, color: "#10b981" },
    { label: "Billing",          pct: 10, color: "#f97316" },
    { label: "Other",            pct:  7, color: "#ec4899" },
  ];

  const statCards = [
    { label: "Total Messages",  value: "24,831", icon: "💬", delta: "+12.4%", glow: "rgba(124,58,237,0.3)" },
    { label: "Active Users",    value: "1,247",  icon: "👥", delta: "+8.1%",  glow: "rgba(79,70,229,0.3)"  },
    { label: "AI Responses",    value: "8,392",  icon: "🤖", delta: "+24.7%", glow: "rgba(16,185,129,0.3)" },
    { label: "Avg Response",    value: "1.2s",   icon: "⚡", delta: "↓0.3s",  glow: "rgba(249,115,22,0.3)" },
  ];

  // SVG donut for sentiment
  const sentiments = [
    { label: "Positive", pct: 72, color: "#10b981" },
    { label: "Neutral",  pct: 19, color: "#64748b" },
    { label: "Negative", pct:  9, color: "#f43f5e" },
  ];
  const r = 54, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  let offset = 0;
  const donutSlices = sentiments.map(seg => {
    const dash = (seg.pct / 100) * circ;
    const gap  = circ - dash;
    const el   = { ...seg, strokeDasharray: `${dash} ${gap}`, strokeDashoffset: -offset };
    offset    += dash;
    return el;
  });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPri, margin: 0 }}>Analytics Dashboard</h2>
        <p style={{ fontSize: 13, color: C.textSec, margin: "4px 0 0" }}>Platform performance — last 30 days</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ ...s.card, padding: 20, boxShadow: `0 0 24px ${card.glow}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 28 }}>{card.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.emerald, background: "rgba(16,185,129,0.12)", padding: "3px 8px", borderRadius: 20 }}>{card.delta}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.textPri }}>{card.value}</div>
            <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Bar Chart + Donut Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        {/* Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ ...s.card, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.textPri, marginBottom: 4 }}>Weekly Messages</div>
          <div style={{ fontSize: 12, color: C.textSec, marginBottom: 20 }}>Messages sent per day</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120 }}>
            {weeklyData.map((d, i) => (
              <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 6 }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: animated ? `${(d.val / weeklyMax) * 100}%` : 0 }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                  style={{ width: "100%", background: i === 5 ? "linear-gradient(to top,#7c3aed,#06b6d4)" : "linear-gradient(to top,#4f46e5,#7c3aed)", borderRadius: "4px 4px 0 0", minHeight: 4, alignSelf: "flex-end" }}
                />
                <span style={{ fontSize: 11, color: C.textSec }}>{d.day}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Donut */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ ...s.card, padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.textPri, marginBottom: 4, alignSelf: "flex-start" }}>Sentiment</div>
          <div style={{ fontSize: 12, color: C.textSec, marginBottom: 16, alignSelf: "flex-start" }}>Message tone analysis</div>
          <svg width={140} height={140} viewBox="0 0 140 140">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={16} />
            {donutSlices.map((seg) => (
              <motion.circle key={seg.label}
                cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={16}
                strokeDasharray={seg.strokeDasharray}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: animated ? seg.strokeDashoffset : circ }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
              />
            ))}
            <text x={cx} y={cy - 8} textAnchor="middle" fill={C.textPri} fontSize={22} fontWeight={700}>72%</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill={C.textSec} fontSize={11}>Positive</text>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 8 }}>
            {sentiments.map(seg => (
              <div key={seg.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: seg.color, display: "block" }} />
                  <span style={{ fontSize: 12, color: C.textSec }}>{seg.label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textPri }}>{seg.pct}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Topic Breakdown */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        style={{ ...s.card, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.textPri, marginBottom: 4 }}>Topic Breakdown</div>
        <div style={{ fontSize: 12, color: C.textSec, marginBottom: 20 }}>Most discussed subjects</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {topics.map((t, i) => (
            <div key={t.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: C.textPri }}>{t.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{t.pct}%</span>
              </div>
              <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: animated ? `${t.pct}%` : 0 }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                  style={{ height: "100%", background: t.color, borderRadius: 4 }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function ToggleSwitch({ on, onChange }) {
  return (
    <motion.div onClick={() => onChange(!on)} style={{ width: 44, height: 24, borderRadius: 12, background: on ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : C.border, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 3px", boxSizing: "border-box", boxShadow: on ? "0 0 12px rgba(124,58,237,0.35)" : "none", transition: "all .3s" }}>
      <motion.div layout animate={{ x: on ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
    </motion.div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────
function SettingsView({ user, dark, setDark, onSignOut }) {
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds]               = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [readReceipts, setReadReceipts]   = useState(true);

  const Row = ({ label, desc, value, onChange }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.textPri }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{desc}</div>}
      </div>
      <ToggleSwitch on={value} onChange={onChange} />
    </div>
  );

  const Section = ({ title, children }) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...s.card, padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</div>
      {children}
    </motion.div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg, maxWidth: 640, margin: "0 auto", width: "100%" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPri, margin: "0 0 20px" }}>Settings</h2>

      {/* Profile */}
      <Section title="Profile">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff", boxShadow: "0 0 24px rgba(124,58,237,0.4)" }}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.textPri }}>{user?.name || "Demo User"}</div>
            <div style={{ fontSize: 13, color: C.textSec }}>{user?.email || "demo@chatapp.com"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.emerald, display: "block" }} />
              <span style={{ fontSize: 12, color: C.emerald }}>Online</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Edit Profile
          </button>
          <button style={{ flex: 1, padding: "10px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.textSec, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Change Photo
          </button>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <Row label="Dark Mode" desc="Use dark theme across the app" value={dark} onChange={setDark} />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {["System", "Dark", "Light"].map(theme => (
            <button key={theme} onClick={() => { if (theme === "Dark") setDark(true); else if (theme === "Light") setDark(false); }}
              style={{ flex: 1, padding: "8px", borderRadius: 10, background: (theme === "Dark" && dark) || (theme === "Light" && !dark) ? "rgba(124,58,237,0.15)" : C.bg, border: `1px solid ${(theme === "Dark" && dark) || (theme === "Light" && !dark) ? "rgba(124,58,237,0.5)" : C.border}`, color: (theme === "Dark" && dark) || (theme === "Light" && !dark) ? "#a78bfa" : C.textSec, fontSize: 13, cursor: "pointer" }}>
              {theme}
            </button>
          ))}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Push Notifications" desc="Get notified for new messages" value={notifications} onChange={setNotifications} />
        <Row label="Sound Alerts" desc="Play sounds for incoming messages" value={sounds} onChange={setSounds} />
        <Row label="Read Receipts" desc="Show when messages are read" value={readReceipts} onChange={setReadReceipts} />
      </Section>

      {/* AI */}
      <Section title="AI Features">
        <Row label="Smart Suggestions" desc="AI-powered quick reply suggestions" value={aiSuggestions} onChange={setAiSuggestions} />
      </Section>

      {/* Account */}
      <Section title="Account">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.textPri }}>Plan</div>
              <div style={{ fontSize: 12, color: C.textSec }}>Pro Plan — unlimited messages</div>
            </div>
            <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>Pro</span>
          </div>
          <motion.button onClick={onSignOut} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#f87171", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="logout" size={16} color="#f87171" />
            Sign Out
          </motion.button>
        </div>
      </Section>

      <p style={{ textAlign: "center", fontSize: 12, color: C.textSec, marginTop: 8 }}>ChatFlow AI v1.0.0 · Demo Mode</p>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]     = useState(null);
  const [active, setActive] = useState("chat");
  const [dark, setDark]     = useState(true);

  // Inject global styles
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { height: 100%; overflow: hidden; }
      body { background: #0a0f1e; font-family: 'Inter', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #1e2d4a; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #2d3d5a; }
      input, button, textarea { font-family: inherit; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Light mode body bg
  useEffect(() => {
    document.body.style.background = dark ? "#0a0f1e" : "#f1f5f9";
  }, [dark]);

  const lC = {
    bg:      dark ? C.bg      : "#f1f5f9",
    panel:   dark ? C.panel   : "#ffffff",
    card:    dark ? C.card    : "#ffffff",
    border:  dark ? C.border  : "#e2e8f0",
    textPri: dark ? C.textPri : "#0f172a",
    textSec: dark ? C.textSec : "#64748b",
  };

  if (!user) return <LoginPage onLogin={setUser} />;

  const renderContent = () => {
    if (active === "chat")      return <ChatView dark={dark} key="chat" />;
    if (active === "ai")        return <AIAssistantView key="ai" />;
    if (active === "analytics") return <AnalyticsView key="analytics" />;
    if (active === "settings")  return <SettingsView user={user} dark={dark} setDark={setDark} onSignOut={() => setUser(null)} key="settings" />;
    return null;
  };

  return (
    <div style={{ ...s.app, background: lC.bg }}>
      <Sidebar active={active} setActive={setActive} dark={dark} setDark={setDark} user={user} onSignOut={() => setUser(null)} />

      <div style={s.mainArea}>
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            style={{ display: "flex", flex: 1, overflow: "hidden" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}






