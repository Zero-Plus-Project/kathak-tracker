import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_DATA = [
  { tatkaar: "3 min", secondTatkaar: "Intro", chakkar: "8-step focus + 5-step intro", todas: "Learn 3", aamad: "–", gat: "–",
    focus: ["Tatkaar 3 min at 50 BPM", "8-step chakkars — axis & control", "Learn Todas 1–3"] },
  { tatkaar: "4 min", secondTatkaar: "Rhythm practice", chakkar: "8-step stable + 5-step practice", todas: "Total 5", aamad: "–", gat: "–",
    focus: ["Tatkaar 4 min at 60 BPM", "8-step stable + 5-step intro", "Todas 4–5"] },
  { tatkaar: "5 min", secondTatkaar: "2 min", chakkar: "8-step + 5-step + 4-step intro", todas: "Total 8", aamad: "Aamad 1", gat: "–",
    focus: ["Tatkaar 5 min at 70 BPM", "2nd Tatkaar 2 min", "Aamad 1 — learn & polish"] },
  { tatkaar: "6 min", secondTatkaar: "3 min", chakkar: "5-step + 4-step focus", todas: "Total 10", aamad: "Aamad 2", gat: "Gat 1",
    focus: ["Tatkaar 6 min at 80 BPM", "4-step chakkars — find your axis", "Gat 1 intro"] },
  { tatkaar: "7 min", secondTatkaar: "3 min", chakkar: "5-step + 4-step + 3-step intro", todas: "Total 12", aamad: "Aamad 3", gat: "Gat 2",
    focus: ["Tatkaar 7 min at 90 BPM", "3-step chakkars — slow & controlled", "Aamad 3 + Gat 2"] },
  { tatkaar: "8 min", secondTatkaar: "4 min", chakkar: "4-step + 3-step focus", todas: "Total 15", aamad: "Aamad 4", gat: "Gat 3",
    focus: ["Tatkaar 8 min at 100 BPM", "3-step stable — spotting drill daily", "Polish Todas 1–15"] },
  { tatkaar: "9 min", secondTatkaar: "4 min stable", chakkar: "3-step + 2-step intro", todas: "Polish", aamad: "Aamad 5", gat: "Gat 4",
    focus: ["Tatkaar 9 min at 110 BPM", "2-step chakkars — very slow", "Aamad 5 + Gat 4 refinement"] },
  { tatkaar: "10 min", secondTatkaar: "5 min", chakkar: "3-step + 2-step + 1-step intro", todas: "Refine", aamad: "Aamad 6", gat: "Polish",
    focus: ["Tatkaar 10 min at 120 BPM", "1-step chakkars — full control", "Full routine run-through"] },
];

const TATKAAR_LEVELS = [
  { level: "L1", bpm: 50 }, { level: "L2", bpm: 60 }, { level: "L3", bpm: 70 },
  { level: "L4", bpm: 80 }, { level: "L5", bpm: 90 }, { level: "L6", bpm: 100 },
  { level: "L7", bpm: 110 }, { level: "L8", bpm: 120 },
];

const CHAKKAR_STEPS = ["8-step", "5-step", "4-step", "3-step", "2-step", "1-step"];
const STABILITY = ["shaky", "okay", "solid"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STORAGE_KEY = "kathak_journey_v2";

const BADGE_DEFS = [
  { id: "first_practice", icon: "🪷", name: "First Step", desc: "Logged your first practice" },
  { id: "streak_7", icon: "🔥", name: "7-Day Flame", desc: "7 day practice streak" },
  { id: "streak_30", icon: "💎", name: "Diamond Devotion", desc: "30 day streak" },
  { id: "l8", icon: "⚡", name: "Lightning Feet", desc: "Reached Tatkaar L8" },
  { id: "chakkar_1step", icon: "🌀", name: "Vortex", desc: "Mastered 1-step chakkar" },
  { id: "month4", icon: "🌸", name: "Halfway Bloom", desc: "Completed Month 4" },
  { id: "month8", icon: "🏆", name: "8-Month Warrior", desc: "Completed all 8 months" },
  { id: "notes_10", icon: "📖", name: "Reflective", desc: "Wrote 10 practice notes" },
  { id: "quick_log_5", icon: "⚡", name: "Quick Streak", desc: "Used Quick Log 5 times" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getWeekKey() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(new Date().setDate(diff));
  return `${monday.getFullYear()}-W${String(monday.getMonth()+1).padStart(2,"0")}-${String(monday.getDate()).padStart(2,"0")}`;
}

function getMonthFromStartDate(startDateStr) {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.min(Math.max(months, 0), 7);
}

function defaultData() {
  return {
    startDate: null,
    weekLogs: {},
    allLogs: [],
    monthLogs: Array(8).fill(null).map(() => ({ tatkaarLevel: "", secondTatkaar: "", bestChakkar: "", consistency: "" })),
    milestones: {
      tatkaarStart: "", tatkaarM4: "", tatkaarM8: "",
      chakkars: Object.fromEntries(CHAKKAR_STEPS.map(s => [s, { start: "–", m4: "–", m8: "–" }]))
    },
    streak: 0, bestStreak: 0, lastPracticeDate: null,
    xp: 0, badges: [], quickLogCount: 0, totalNotesCount: 0,
    reminderTime: "",
    todayLog: { tatkaarLevel: "L1", secondTatkaar: "", chakkars: [], time: "", notes: "" },
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (!Array.isArray(p.todayLog?.chakkars)) p.todayLog.chakkars = [];
      return { ...defaultData(), ...p };
    }
  } catch {}
  return defaultData();
}

// ─── Metronome hook ───────────────────────────────────────────────────────────

function useMetronome() {
  const [bpm, setBpm] = useState(80);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  function tick() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  useEffect(() => {
    if (running) { tick(); intervalRef.current = setInterval(tick, (60 / bpm) * 1000); }
    else clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [running, bpm]);

  return { bpm, setBpm, running, setRunning };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function KathakTracker() {
  const [data, setData] = useState(loadData);
  const [activeTab, setActiveTab] = useState("today");
  const [saved, setSaved] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(!loadData().startDate);
  const [newBadge, setNewBadge] = useState(null);
  const metro = useMetronome();

  const currentMonth = data.startDate ? getMonthFromStartDate(data.startDate) : 0;
  const currentMonthData = MONTHS_DATA[currentMonth];
  const todayLogged = data.lastPracticeDate === getTodayKey();

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  useEffect(() => {
    if (!data.reminderTime) return;
    const iv = setInterval(() => {
      const now = new Date();
      const [h, m] = data.reminderTime.split(":").map(Number);
      if (now.getHours() === h && now.getMinutes() === m && data.lastPracticeDate !== getTodayKey()) {
        if (Notification.permission === "granted") new Notification("🪷 Kathak time!", { body: "Your daily practice is waiting!" });
      }
    }, 60000);
    return () => clearInterval(iv);
  }, [data.reminderTime, data.lastPracticeDate]);

  function update(fn) {
    setData(prev => {
      const next = fn(JSON.parse(JSON.stringify(prev)));
      return checkBadges(next);
    });
  }

  function checkBadges(d) {
    const earned = new Set(d.badges);
    const newlyEarned = [];
    const add = id => { if (!earned.has(id)) { earned.add(id); newlyEarned.push(id); } };
    if (d.streak >= 1) add("first_practice");
    if (d.streak >= 7) add("streak_7");
    if (d.streak >= 30) add("streak_30");
    if (d.allLogs.some(l => l.tatkaarLevel === "L8")) add("l8");
    if (d.milestones?.chakkars?.["1-step"]?.m8 === "solid") add("chakkar_1step");
    if (currentMonth >= 3) add("month4");
    if (currentMonth >= 7) add("month8");
    if ((d.totalNotesCount || 0) >= 10) add("notes_10");
    if ((d.quickLogCount || 0) >= 5) add("quick_log_5");
    d.badges = Array.from(earned);
    if (newlyEarned.length > 0) {
      const badge = BADGE_DEFS.find(b => b.id === newlyEarned[0]);
      if (badge) setTimeout(() => setNewBadge(badge), 400);
    }
    return d;
  }

  function doLog(isQuick = false) {
    const today = getTodayKey();
    const weekKey = getWeekKey();
    update(d => {
      if (!d.weekLogs[weekKey]) d.weekLogs[weekKey] = {};
      const entry = { ...d.todayLog, date: today, month: currentMonth, ts: Date.now() };
      d.weekLogs[weekKey][today] = entry;
      const idx = d.allLogs.findIndex(l => l.date === today);
      if (idx >= 0) d.allLogs[idx] = entry; else d.allLogs.push(entry);
      const yesterday = (() => { const x = new Date(); x.setDate(x.getDate()-1); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; })();
      if (d.lastPracticeDate === yesterday) d.streak += 1;
      else if (d.lastPracticeDate !== today) d.streak = 1;
      d.bestStreak = Math.max(d.bestStreak || 0, d.streak);
      d.lastPracticeDate = today;
      d.xp += 10 + (parseInt(d.todayLog.time) || 0);
      if (isQuick) d.quickLogCount = (d.quickLogCount || 0) + 1;
      if (d.todayLog.notes?.trim()) d.totalNotesCount = (d.totalNotesCount || 0) + 1;
      return d;
    });
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  function quickLog() {
    if (data.allLogs.length > 0) {
      const last = data.allLogs[data.allLogs.length - 1];
      update(d => { d.todayLog = { ...last, notes: "", date: undefined, ts: undefined }; if (!Array.isArray(d.todayLog.chakkars)) d.todayLog.chakkars = []; return d; });
    }
    setTimeout(() => doLog(true), 50);
  }

  const weekLog = data.weekLogs[getWeekKey()] || {};
  const weekDays = DAYS.map((day, i) => {
    const d = new Date(), curr = d.getDay(), diff = i - (curr === 0 ? 6 : curr - 1);
    const t = new Date(); t.setDate(t.getDate() + diff);
    return { day, key: `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`, logged: !!weekLog[`${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`] };
  });

  const xpLevel = Math.floor(data.xp / 100) + 1;
  const xpProgress = data.xp % 100;
  const chartData = data.allLogs.slice(-30).map((l, i) => ({
    i: i + 1, level: parseInt(l.tatkaarLevel?.replace("L","") || 0), time: parseInt(l.time) || 0
  }));

  const S = {
    page: { minHeight: "100vh", background: "radial-gradient(ellipse at 20% 10%, #1a0a2e 0%, #0d0d1a 50%, #0a1628 100%)", fontFamily: "'Georgia','Times New Roman',serif", color: "#e8d5b7", paddingBottom: 80 },
    card: { padding: "14px 16px", background: "rgba(0,0,0,0.3)", borderRadius: 12, border: "1px solid rgba(180,140,80,0.2)", marginBottom: 12 },
    label: { fontSize: 10, letterSpacing: 3, color: "#b8906a", textTransform: "uppercase", marginBottom: 12, display: "block" },
    input: { width: "100%", padding: "8px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(180,140,80,0.3)", color: "#e8d5b7", fontSize: 13, fontFamily: "inherit" },
    chip: (active, accent) => ({ padding: "6px 12px", borderRadius: 8, border: `1px solid ${active ? (accent || "#c084fc") : "rgba(180,140,80,0.3)"}`, background: active ? `${accent || "#c084fc"}22` : "rgba(0,0,0,0.3)", color: active ? (accent || "#c084fc") : "#9a7a5a", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }),
  };

  const tabs = [
    { id: "today", label: "Today" }, { id: "week", label: "Week" },
    { id: "progress", label: "Progress" }, { id: "journey", label: "Journey" },
    { id: "milestones", label: "Milestones" }, { id: "badges", label: "Badges" },
  ];

  return (
    <div style={S.page}>
      <style>{`
        @keyframes slideDown { from { transform:translate(-50%,-60px);opacity:0 } to { transform:translate(-50%,0);opacity:1 } }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none }
        input[type=time],input[type=date] { color-scheme:dark }
        ::-webkit-scrollbar { display:none }
        * { box-sizing:border-box }
      `}</style>

      {/* Badge toast */}
      {newBadge && (
        <div onClick={() => setNewBadge(null)} style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,rgba(192,132,252,0.97),rgba(139,69,19,0.97))", padding:"14px 24px", borderRadius:16, zIndex:999, cursor:"pointer", boxShadow:"0 8px 32px rgba(192,132,252,0.5)", textAlign:"center", minWidth:220, animation:"slideDown 0.4s ease" }}>
          <div style={{ fontSize:30 }}>{newBadge.icon}</div>
          <div style={{ fontSize:13, fontWeight:"bold", color:"#fff", marginTop:4 }}>Badge Unlocked!</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.85)" }}>{newBadge.name} — {newBadge.desc}</div>
        </div>
      )}

      {/* Onboarding */}
      {showOnboarding && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#0d0d1a", border:"1px solid rgba(180,140,80,0.4)", borderRadius:20, padding:28, maxWidth:340, width:"100%" }}>
            <div style={{ fontSize:36, textAlign:"center", marginBottom:8 }}>🪷</div>
            <div style={{ textAlign:"center", fontSize:18, color:"#f0d9a8", marginBottom:8 }}>Welcome to your Kathak Journey</div>
            <div style={{ fontSize:13, color:"#9a7a5a", textAlign:"center", marginBottom:24, lineHeight:1.7 }}>Set your start date and the app will auto-track which month you're on — no manual navigation needed.</div>
            <span style={S.label}>When did you start?</span>
            <input type="date" style={{ ...S.input, marginBottom:16 }} onChange={e => update(d => { d.startDate = e.target.value; return d; })} />
            <button onClick={() => setShowOnboarding(false)} style={{ width:"100%", padding:14, borderRadius:12, background:"linear-gradient(135deg,rgba(139,69,19,0.6),rgba(100,40,140,0.6))", border:"1px solid rgba(180,140,80,0.4)", color:"#f0d9a8", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>Begin Journey →</button>
            <button onClick={() => setShowOnboarding(false)} style={{ width:"100%", marginTop:8, padding:8, background:"none", border:"none", color:"#6a5a4a", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Skip for now</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,rgba(139,69,19,0.3) 0%,rgba(180,120,60,0.15) 50%,rgba(100,40,140,0.3) 100%)", borderBottom:"1px solid rgba(180,140,80,0.3)", padding:"16px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:4, color:"#b8906a", textTransform:"uppercase", marginBottom:3 }}>नृत्य यात्रा</div>
            <div style={{ fontSize:22, color:"#f0d9a8" }}>Kathak Journey</div>
            <div style={{ fontSize:12, color:"#9a7a5a", marginTop:2 }}>
              Month {currentMonth + 1} of 8
              {todayLogged && <span style={{ marginLeft:10, color:"#90e890" }}>✓ Done today</span>}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ display:"flex", gap:14, marginBottom:6 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:20, color:"#f0a830" }}>🔥 {data.streak}</div>
                <div style={{ fontSize:9, color:"#9a7a5a", letterSpacing:1 }}>STREAK</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:20, color:"#c084fc" }}>Lv.{xpLevel}</div>
                <div style={{ fontSize:9, color:"#9a7a5a", letterSpacing:1 }}>LEVEL</div>
              </div>
            </div>
            <div style={{ width:90, height:5, background:"rgba(255,255,255,0.1)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ width:`${xpProgress}%`, height:"100%", background:"linear-gradient(90deg,#c084fc,#f0a830)", transition:"width 0.5s" }} />
            </div>
            <div style={{ fontSize:9, color:"#9a7a5a", marginTop:2 }}>{data.xp} XP</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid rgba(180,140,80,0.2)", background:"rgba(0,0,0,0.3)", overflowX:"auto", scrollbarWidth:"none" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex:1, minWidth:60, padding:"11px 4px", background:"none", border:"none", borderBottom:activeTab===t.id?"2px solid #c084fc":"2px solid transparent", color:activeTab===t.id?"#c084fc":"#9a7a5a", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth:500, margin:"0 auto", padding:"20px 16px" }}>

        {/* ──── TODAY ──── */}
        {activeTab === "today" && (
          <div>
            {/* Focus card */}
            <div style={{ ...S.card, background:"rgba(192,132,252,0.07)", border:"1px solid rgba(192,132,252,0.22)", marginBottom:16 }}>
              <span style={S.label}>Today's Focus — Month {currentMonth + 1}</span>
              {currentMonthData.focus.map((f, i) => (
                <div key={i} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
                  <span style={{ color:"#c084fc", fontSize:12, marginTop:1 }}>◆</span>
                  <span style={{ fontSize:13, color:"#e8d5b7", lineHeight:1.5 }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Quick log */}
            {data.allLogs.length > 0 && !todayLogged && (
              <button onClick={quickLog} style={{ width:"100%", padding:12, marginBottom:16, borderRadius:12, background:"rgba(240,168,48,0.1)", border:"1px solid rgba(240,168,48,0.35)", color:"#f0a830", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                ⚡ Quick Log — same as last session ({data.allLogs[data.allLogs.length-1]?.tatkaarLevel}, {data.allLogs[data.allLogs.length-1]?.time||"–"} min)
              </button>
            )}

            {/* Tatkaar level */}
            <div style={{ marginBottom:16 }}>
              <span style={S.label}>Tatkaar Level</span>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {TATKAAR_LEVELS.map(l => (
                  <button key={l.level} onClick={() => { update(d => { d.todayLog.tatkaarLevel = l.level; return d; }); metro.setBpm(l.bpm); }} style={S.chip(data.todayLog.tatkaarLevel === l.level)}>
                    {l.level} <span style={{ fontSize:10, opacity:0.65 }}>{l.bpm}bpm</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Metronome */}
            <div style={{ ...S.card, marginBottom:16 }}>
              <span style={S.label}>Metronome — {metro.bpm} BPM</span>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <input type="range" min={40} max={140} value={metro.bpm} onChange={e => metro.setBpm(Number(e.target.value))} style={{ flex:1, accentColor:"#c084fc" }} />
                <button onClick={() => metro.setRunning(r => !r)} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${metro.running?"#f0a830":"rgba(180,140,80,0.3)"}`, background:metro.running?"rgba(240,168,48,0.2)":"rgba(0,0,0,0.3)", color:metro.running?"#f0a830":"#9a7a5a", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>
                  {metro.running ? "■ Stop" : "▶ Start"}
                </button>
              </div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {TATKAAR_LEVELS.map(l => (
                  <button key={l.level} onClick={() => metro.setBpm(l.bpm)} style={{ ...S.chip(metro.bpm === l.bpm), padding:"3px 8px", fontSize:10 }}>{l.level}</button>
                ))}
              </div>
            </div>

            {/* 2nd Tatkaar */}
            <div style={{ marginBottom:16 }}>
              <span style={S.label}>2nd Tatkaar (minutes)</span>
              <input type="number" min="0" max="10" value={data.todayLog.secondTatkaar} onChange={e => update(d => { d.todayLog.secondTatkaar = e.target.value; return d; })} style={{ ...S.input, width:80 }} />
            </div>

            {/* Chakkars with stability rating */}
            <div style={{ marginBottom:16 }}>
              <span style={S.label}>Chakkars — select then rate stability</span>
              {CHAKKAR_STEPS.map(step => {
                const sel = Array.isArray(data.todayLog.chakkars) && data.todayLog.chakkars.includes(step);
                const stab = data.todayLog[`stab_${step}`] || "";
                return (
                  <div key={step} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                    <button onClick={() => update(d => {
                      if (!Array.isArray(d.todayLog.chakkars)) d.todayLog.chakkars = [];
                      d.todayLog.chakkars = d.todayLog.chakkars.includes(step) ? d.todayLog.chakkars.filter(s => s!==step) : [...d.todayLog.chakkars, step];
                      return d;
                    })} style={{ ...S.chip(sel, "#f0a830"), minWidth:78, textAlign:"center" }}>{step}</button>
                    {sel && STABILITY.map(s => {
                      const c = s==="solid"?"#90e890":s==="okay"?"#f0a830":"#f08080";
                      return (
                        <button key={s} onClick={() => update(d => { d.todayLog[`stab_${step}`] = s; return d; })} style={{ padding:"3px 9px", borderRadius:6, fontSize:10, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${stab===s?c:"rgba(180,140,80,0.2)"}`, background:stab===s?`${c}22`:"rgba(0,0,0,0.3)", color:stab===s?c:"#9a7a5a" }}>{s}</button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Time */}
            <div style={{ marginBottom:16 }}>
              <span style={S.label}>Practice Time (min)</span>
              <input type="number" min="0" max="120" value={data.todayLog.time} onChange={e => update(d => { d.todayLog.time = e.target.value; return d; })} style={{ ...S.input, width:80 }} />
            </div>

            {/* Notes */}
            <div style={{ marginBottom:20 }}>
              <span style={S.label}>Notes — optional, one line</span>
              <input type="text" placeholder="e.g. 5-step clicked today, left knee felt off…" value={data.todayLog.notes} onChange={e => update(d => { d.todayLog.notes = e.target.value; return d; })} style={S.input} />
            </div>

            <button onClick={() => doLog(false)} style={{ width:"100%", padding:14, borderRadius:12, background:saved?"rgba(100,200,100,0.2)":"linear-gradient(135deg,rgba(139,69,19,0.5),rgba(100,40,140,0.5))", border:`1px solid ${saved?"rgba(100,200,100,0.5)":"rgba(180,140,80,0.4)"}`, color:saved?"#90e890":"#f0d9a8", fontSize:15, cursor:"pointer", fontFamily:"inherit", transition:"all 0.3s" }}>
              {saved ? "✓ Saved! XP earned" : todayLogged ? "Update Today's Log" : "Mark Practice Done"}
            </button>

            {/* Reminder */}
            <div style={{ ...S.card, marginTop:20 }}>
              <span style={S.label}>Daily Reminder</span>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <input type="time" value={data.reminderTime} onChange={e => { update(d => { d.reminderTime = e.target.value; return d; }); if ("Notification" in window) Notification.requestPermission(); }} style={{ ...S.input, width:"auto", flex:1 }} />
                <span style={{ fontSize:12, color:"#9a7a5a", whiteSpace:"nowrap" }}>{data.reminderTime || "Not set"}</span>
              </div>
              <div style={{ fontSize:11, color:"#6a5a4a", marginTop:6 }}>Allow browser notifications for this to work</div>
            </div>
          </div>
        )}

        {/* ──── WEEK ──── */}
        {activeTab === "week" && (
          <div>
            <span style={S.label}>This Week</span>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginBottom:24 }}>
              {weekDays.map(({ day, logged }) => (
                <div key={day} style={{ textAlign:"center", padding:"10px 2px", borderRadius:10, background:logged?"rgba(192,132,252,0.2)":"rgba(0,0,0,0.3)", border:`1px solid ${logged?"rgba(192,132,252,0.45)":"rgba(180,140,80,0.1)"}` }}>
                  <div style={{ fontSize:9, color:"#9a7a5a", marginBottom:5 }}>{day}</div>
                  <div style={{ fontSize:16 }}>{logged ? "✓" : "·"}</div>
                </div>
              ))}
            </div>
            <span style={S.label}>Session Entries</span>
            {Object.keys(weekLog).length === 0
              ? <div style={{ color:"#9a7a5a", fontSize:13, textAlign:"center", padding:30 }}>No entries this week yet</div>
              : Object.entries(weekLog).sort((a,b) => b[1].ts - a[1].ts).map(([k, e]) => (
                <div key={k} style={S.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:13, color:"#c084fc", fontWeight:"bold" }}>{e.tatkaarLevel}</span>
                    <span style={{ fontSize:12, color:"#f0a830" }}>{e.time||"–"} min</span>
                  </div>
                  {Array.isArray(e.chakkars) && e.chakkars.length > 0 && <div style={{ fontSize:12, color:"#9a7a5a", marginBottom:3 }}>Chakkars: {e.chakkars.join(", ")}</div>}
                  {e.secondTatkaar && <div style={{ fontSize:12, color:"#9a7a5a", marginBottom:3 }}>2nd Tatkaar: {e.secondTatkaar} min</div>}
                  {e.notes && <div style={{ fontSize:12, color:"#b8906a", fontStyle:"italic", marginTop:5 }}>"{e.notes}"</div>}
                </div>
              ))
            }
          </div>
        )}

        {/* ──── PROGRESS ──── */}
        {activeTab === "progress" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:20 }}>
              {[["Best Streak", `${data.bestStreak||data.streak}d`, "#f0a830"], ["Total XP", data.xp, "#c084fc"], ["Sessions", data.allLogs.length, "#90e890"]].map(([l, v, c]) => (
                <div key={l} style={{ ...S.card, textAlign:"center", marginBottom:0 }}>
                  <div style={{ fontSize:22, color:c, fontWeight:"bold" }}>{v}</div>
                  <div style={{ fontSize:10, color:"#9a7a5a", marginTop:4 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <span style={S.label}>Tatkaar Level Over Time</span>
              {chartData.length < 2
                ? <div style={{ color:"#9a7a5a", fontSize:13, textAlign:"center", padding:20 }}>Log more sessions to see your curve</div>
                : <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartData} margin={{ top:5, right:5, bottom:5, left:-20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,140,80,0.1)" />
                      <XAxis dataKey="i" tick={{ fontSize:10, fill:"#9a7a5a" }} />
                      <YAxis domain={[0,8]} tick={{ fontSize:10, fill:"#9a7a5a" }} tickFormatter={v=>`L${v}`} />
                      <Tooltip contentStyle={{ background:"#0d0d1a", border:"1px solid rgba(180,140,80,0.3)", borderRadius:8, fontSize:12 }} formatter={v=>[`L${v}`,"Level"]} />
                      <Line type="monotone" dataKey="level" stroke="#c084fc" strokeWidth={2} dot={{ fill:"#c084fc", r:3 }} />
                    </LineChart>
                  </ResponsiveContainer>
              }
            </div>

            <div style={S.card}>
              <span style={S.label}>Practice Duration (min)</span>
              {chartData.length < 2
                ? <div style={{ color:"#9a7a5a", fontSize:13, textAlign:"center", padding:20 }}>Log time in sessions to see this</div>
                : <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={chartData} margin={{ top:5, right:5, bottom:5, left:-20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,140,80,0.1)" />
                      <XAxis dataKey="i" tick={{ fontSize:10, fill:"#9a7a5a" }} />
                      <YAxis tick={{ fontSize:10, fill:"#9a7a5a" }} />
                      <Tooltip contentStyle={{ background:"#0d0d1a", border:"1px solid rgba(180,140,80,0.3)", borderRadius:8, fontSize:12 }} formatter={v=>[`${v} min`,"Time"]} />
                      <Line type="monotone" dataKey="time" stroke="#f0a830" strokeWidth={2} dot={{ fill:"#f0a830", r:3 }} />
                    </LineChart>
                  </ResponsiveContainer>
              }
            </div>

            {data.allLogs.filter(l => l.notes).length > 0 && (
              <div style={S.card}>
                <span style={S.label}>Practice Notes</span>
                {data.allLogs.filter(l=>l.notes).slice(-6).reverse().map((l, i, arr) => (
                  <div key={i} style={{ fontSize:12, color:"#b8906a", fontStyle:"italic", marginBottom:8, paddingBottom:8, borderBottom:i<arr.length-1?"1px solid rgba(180,140,80,0.08)":"none" }}>
                    "{l.notes}"
                    <span style={{ color:"#9a7a5a", fontStyle:"normal", marginLeft:8 }}>{l.tatkaarLevel} · {l.time||"–"} min</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──── JOURNEY ──── */}
        {activeTab === "journey" && (
          <div>
            <span style={S.label}>8-Month Curriculum</span>
            {MONTHS_DATA.map((month, i) => {
              const past = i < currentMonth, curr = i === currentMonth, future = i > currentMonth;
              const log = data.monthLogs[i];
              return (
                <div key={i} style={{ padding:"14px 16px", marginBottom:10, borderRadius:12, background:curr?"rgba(192,132,252,0.09)":past?"rgba(180,140,80,0.05)":"rgba(0,0,0,0.2)", border:`1px solid ${curr?"rgba(192,132,252,0.4)":past?"rgba(180,140,80,0.2)":"rgba(255,255,255,0.04)"}`, opacity:future?0.42:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div style={{ fontWeight:"bold", color:curr?"#c084fc":"#e8d5b7" }}>Month {i+1}</div>
                    {curr && <span style={{ fontSize:10, color:"#c084fc", letterSpacing:2 }}>● NOW</span>}
                    {past && <span style={{ fontSize:14 }}>✓</span>}
                  </div>
                  <div style={{ fontSize:12, color:"#9a7a5a", display:"flex", gap:12, flexWrap:"wrap", marginBottom:curr?12:0 }}>
                    <span>Tatkaar: {month.tatkaar}</span>
                    {month.aamad!=="–" && <span style={{ color:"#b8906a" }}>{month.aamad}</span>}
                    {month.gat!=="–" && <span style={{ color:"#b8906a" }}>{month.gat}</span>}
                  </div>
                  {curr && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {[["Tatkaar Level","tatkaarLevel","e.g. L4"],["Best Chakkar","bestChakkar","e.g. 4-step"],["2nd Tatkaar (min)","secondTatkaar","e.g. 3"],["Days/week","consistency","e.g. 5"]].map(([label, field, ph]) => (
                        <div key={field}>
                          <div style={{ fontSize:10, color:"#9a7a5a", marginBottom:4 }}>{label}</div>
                          <input placeholder={ph} value={log[field]} onChange={e => update(d => { d.monthLogs[i][field] = e.target.value; return d; })} style={S.input} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!data.startDate && (
              <div style={S.card}>
                <span style={S.label}>Set Start Date to auto-track months</span>
                <input type="date" style={S.input} onChange={e => update(d => { d.startDate = e.target.value; return d; })} />
              </div>
            )}
          </div>
        )}

        {/* ──── MILESTONES ──── */}
        {activeTab === "milestones" && (
          <div>
            <span style={S.label}>8-Month Milestones</span>
            <div style={{ ...S.card, marginBottom:16 }}>
              <div style={{ fontSize:13, color:"#e8d5b7", marginBottom:12 }}>Tatkaar Level</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {["Start","Month 4","Month 8"].map((label, idx) => {
                  const field = ["tatkaarStart","tatkaarM4","tatkaarM8"][idx];
                  return (
                    <div key={label}>
                      <div style={{ fontSize:10, color:"#9a7a5a", marginBottom:4 }}>{label}</div>
                      <input placeholder="L1" value={data.milestones[field]||""} onChange={e => update(d => { d.milestones[field] = e.target.value; return d; })} style={S.input} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ fontSize:12, color:"#b8906a", marginBottom:12 }}>Chakkar Mastery — tap to cycle: – → shaky → okay → solid</div>
            {CHAKKAR_STEPS.map(step => {
              const cd = data.milestones.chakkars?.[step] || { start:"–", m4:"–", m8:"–" };
              const cycle = { "–":"shaky", shaky:"okay", okay:"solid", solid:"–" };
              return (
                <div key={step} style={{ ...S.card, display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1, fontSize:13, color:"#e8d5b7" }}>{step}</div>
                  {["start","m4","m8"].map((key, idx) => {
                    const val = cd[key]||"–";
                    const c = val==="solid"?"#90e890":val==="okay"?"#f0a830":val==="shaky"?"#f08080":"#9a7a5a";
                    return (
                      <div key={key} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:9, color:"#9a7a5a", marginBottom:3 }}>{["Start","M4","M8"][idx]}</div>
                        <button onClick={() => update(d => { if (!d.milestones.chakkars[step]) d.milestones.chakkars[step]={start:"–",m4:"–",m8:"–"}; d.milestones.chakkars[step][key]=cycle[val]||"–"; return d; })} style={{ width:50, height:26, borderRadius:6, cursor:"pointer", fontSize:10, border:`1px solid ${val!=="–"?c:"rgba(180,140,80,0.25)"}`, background:val!=="–"?`${c}22`:"rgba(0,0,0,0.4)", color:c, fontFamily:"inherit" }}>{val}</button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ──── BADGES ──── */}
        {activeTab === "badges" && (
          <div>
            <span style={S.label}>Badges — {data.badges.length}/{BADGE_DEFS.length} earned</span>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
              {BADGE_DEFS.map(badge => {
                const earned = data.badges.includes(badge.id);
                return (
                  <div key={badge.id} style={{ padding:"16px 12px", borderRadius:12, textAlign:"center", background:earned?"rgba(192,132,252,0.1)":"rgba(0,0,0,0.3)", border:`1px solid ${earned?"rgba(192,132,252,0.4)":"rgba(255,255,255,0.05)"}`, opacity:earned?1:0.35 }}>
                    <div style={{ fontSize:28, marginBottom:6 }}>{badge.icon}</div>
                    <div style={{ fontSize:12, color:earned?"#e8d5b7":"#9a7a5a", marginBottom:3 }}>{badge.name}</div>
                    <div style={{ fontSize:10, color:"#6a5a4a" }}>{badge.desc}</div>
                  </div>
                );
              })}
            </div>
            <div style={S.card}>
              <span style={S.label}>Stats</span>
              {[["Total XP",data.xp,"#c084fc"],["Level",`Lv. ${xpLevel}`,"#c084fc"],["Current Streak",`${data.streak} days 🔥`,"#f0a830"],["Best Streak",`${data.bestStreak||data.streak} days`,"#f0a830"],["Total Sessions",data.allLogs.length,"#90e890"],["Notes Written",data.totalNotesCount||0,"#b8906a"]].map(([l,v,c]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, paddingBottom:8, borderBottom:"1px solid rgba(180,140,80,0.07)" }}>
                  <span style={{ fontSize:13, color:"#9a7a5a" }}>{l}</span>
                  <span style={{ fontSize:13, color:c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}