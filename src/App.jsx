import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "kathak_journey_v3";
const CONFIG_KEY  = "kathak_config_v3";

// ─── Curriculum Generator ─────────────────────────────────────────────────────
// Takes user config and produces a MONTHS_DATA array dynamically

function generateCurriculum(cfg) {
  const {
    numMonths, startBpm, endBpm,
    hasTatkaar, hasSecondTatkaar, hasChakkars, hasTodas, hasAamads, hasGats,
    numTodas, numAamads, numGats,
    dailyTargetMin, chakkarSteps,
  } = cfg;

  const bpmStep = numMonths > 1 ? Math.round((endBpm - startBpm) / (numMonths - 1)) : 0;
  const todasPerMonth = numTodas > 0 ? Math.ceil(numTodas / numMonths) : 0;

  // distribute aamads and gats across later half of months
  const aamadStart = Math.floor(numMonths / 3);
  const gatStart   = Math.floor(numMonths / 2);

  return Array.from({ length: numMonths }, (_, i) => {
    const monthNum  = i + 1;
    const bpm       = startBpm + bpmStep * i;
    const tatkaarMin = hasTatkaar ? `${Math.round(dailyTargetMin * 0.4)} min` : "–";
    const secondMin  = hasSecondTatkaar ? `${Math.max(1, Math.round(dailyTargetMin * 0.15 * (i / numMonths + 0.5)))} min` : "–";

    // Todas: cumulative count shown per month
    const todasSoFar = hasTodas ? Math.min(todasPerMonth * monthNum, numTodas) : 0;
    const todasLabel  = hasTodas
      ? (i === 0 ? `Learn ${todasSoFar}` : i >= numMonths - 2 ? (i === numMonths - 1 ? "Refine" : "Polish") : `Total ${todasSoFar}`)
      : "–";

    // Aamads: introduce one per month starting at aamadStart
    const aamadIdx   = i - aamadStart;
    const aamadLabel = hasAamads && aamadIdx >= 0 && aamadIdx < numAamads
      ? `Aamad ${aamadIdx + 1}` : "–";

    // Gats: introduce one per month starting at gatStart
    const gatIdx   = i - gatStart;
    const gatLabel = hasGats && gatIdx >= 0 && gatIdx < numGats
      ? (gatIdx >= numGats - 1 ? "Polish Gats" : `Gat ${gatIdx + 1}`) : "–";

    // Chakkar progression across months
    const chakkarFocus = (() => {
      if (!hasChakkars || chakkarSteps.length === 0) return "–";
      const stepsPerMonth = Math.max(1, Math.ceil(chakkarSteps.length / numMonths));
      const startIdx = Math.min(Math.floor(i * chakkarSteps.length / numMonths), chakkarSteps.length - 1);
      const endIdx   = Math.min(startIdx + stepsPerMonth, chakkarSteps.length - 1);
      const current  = chakkarSteps[startIdx];
      const next     = chakkarSteps[endIdx];
      return startIdx === endIdx ? `${current} focus` : `${current} + ${next} intro`;
    })();

    // Focus bullets for today card
    const focus = [];
    if (hasTatkaar) focus.push(`Tatkaar ${tatkaarMin} at ${bpm} BPM`);
    if (hasSecondTatkaar) focus.push(`2nd Tatkaar ${secondMin}`);
    if (hasChakkars && chakkarFocus !== "–") focus.push(`Chakkars: ${chakkarFocus}`);
    if (hasTodas && todasLabel !== "–") focus.push(`Todas: ${todasLabel}`);
    if (hasAamads && aamadLabel !== "–") focus.push(aamadLabel + " — learn & polish");
    if (hasGats && gatLabel !== "–") focus.push(gatLabel);
    if (focus.length === 0) focus.push("Free practice session");

    return { tatkaar: tatkaarMin, secondTatkaar: secondMin, chakkar: chakkarFocus, todas: todasLabel, aamad: aamadLabel, gat: gatLabel, bpm, focus };
  });
}

function generateTatkaarLevels(cfg) {
  const { numMonths, startBpm, endBpm } = cfg;
  const levels = Math.min(numMonths, 8);
  return Array.from({ length: levels }, (_, i) => ({
    level: `L${i + 1}`,
    bpm: Math.round(startBpm + (endBpm - startBpm) * (i / Math.max(levels - 1, 1))),
  }));
}

// ─── Default config ───────────────────────────────────────────────────────────

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const DEFAULT_CONFIG = {
  studentName: "",
  startDate: getTodayISO(),
  numMonths: 8,
  startBpm: 50,
  endBpm: 120,
  dailyTargetMin: 20,
  practicedays: 5,
  hasTatkaar: true,
  hasSecondTatkaar: true,
  hasChakkars: true,
  hasTodas: true,
  hasAamads: true,
  hasGats: true,
  numTodas: 15,
  numAamads: 6,
  numGats: 4,
  chakkarSteps: ["8-step", "5-step", "4-step", "3-step", "2-step", "1-step"],
};

const STABILITY = ["shaky", "okay", "solid"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ALL_CHAKKAR_STEPS = ["8-step", "5-step", "4-step", "3-step", "2-step", "1-step"];

const BADGE_DEFS = [
  { id: "first_practice", icon: "🪷", name: "First Step",       desc: "Logged your first practice" },
  { id: "streak_7",       icon: "🔥", name: "7-Day Flame",      desc: "7 day practice streak" },
  { id: "streak_30",      icon: "💎", name: "Diamond Devotion", desc: "30 day streak" },
  { id: "max_level",      icon: "⚡", name: "Lightning Feet",   desc: "Reached max Tatkaar level" },
  { id: "chakkar_solid",  icon: "🌀", name: "Vortex",           desc: "Mastered smallest chakkar" },
  { id: "halfway",        icon: "🌸", name: "Halfway Bloom",    desc: "Passed halfway through curriculum" },
  { id: "complete",       icon: "🏆", name: "Journey Complete", desc: "Completed the full curriculum" },
  { id: "notes_10",       icon: "📖", name: "Reflective",       desc: "Wrote 10 practice notes" },
  { id: "quick_log_5",    icon: "⚡", name: "Quick Streak",     desc: "Used Quick Log 5 times" },
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

function getMonthFromStartDate(startDateStr, numMonths) {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const now = new Date();
  if (start > now) return 0; // future start date = stay on Month 1
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.min(Math.max(months, 0), numMonths - 1);
}

function defaultData(cfg) {
  return {
    weekLogs: {},
    allLogs: [],
    monthLogs: Array(cfg.numMonths).fill(null).map(() => ({ tatkaarLevel: "", secondTatkaar: "", bestChakkar: "", consistency: "" })),
    milestones: {
      chakkars: Object.fromEntries((cfg.chakkarSteps || []).map(s => [s, { start: "–", m4: "–", m8: "–" }]))
    },
    streak: 0, bestStreak: 0, lastPracticeDate: null,
    xp: 0, badges: [], quickLogCount: 0, totalNotesCount: 0,
    reminderTime: "",
    todayLog: { tatkaarLevel: "L1", secondTatkaar: "", chakkars: [], time: "", notes: "" },
  };
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return null;
}

function loadData(cfg) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (!Array.isArray(p.todayLog?.chakkars)) p.todayLog.chakkars = [];
      return { ...defaultData(cfg), ...p };
    }
  } catch {}
  return defaultData(cfg);
}

// ─── Metronome ────────────────────────────────────────────────────────────────

function useMetronome(initialBpm = 80) {
  const [bpm, setBpm] = useState(initialBpm);
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

// ─── Intake Form ──────────────────────────────────────────────────────────────

function IntakeForm({ onComplete }) {
  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);

  function set(key, val) { setCfg(prev => ({ ...prev, [key]: val })); }
  function toggleChakkar(s) {
    setCfg(prev => {
      const has = prev.chakkarSteps.includes(s);
      return { ...prev, chakkarSteps: has ? prev.chakkarSteps.filter(x => x !== s) : [...prev.chakkarSteps, s] };
    });
  }

  const S = {
    page: { minHeight: "100vh", background: "radial-gradient(ellipse at 20% 10%, #1a0a2e 0%, #0d0d1a 50%, #0a1628 100%)", fontFamily: "'Georgia','Times New Roman',serif", color: "#e8d5b7", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    box: { background: "rgba(13,13,26,0.95)", border: "1px solid rgba(180,140,80,0.35)", borderRadius: 20, padding: 28, maxWidth: 420, width: "100%" },
    label: { fontSize: 10, letterSpacing: 3, color: "#b8906a", textTransform: "uppercase", marginBottom: 8, display: "block" },
    input: { width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(180,140,80,0.3)", color: "#e8d5b7", fontSize: 14, fontFamily: "inherit", marginBottom: 16 },
    chip: (on) => ({ padding: "8px 14px", borderRadius: 8, border: `1px solid ${on ? "#c084fc" : "rgba(180,140,80,0.3)"}`, background: on ? "rgba(192,132,252,0.2)" : "rgba(0,0,0,0.3)", color: on ? "#c084fc" : "#9a7a5a", fontSize: 13, cursor: "pointer", fontFamily: "inherit", margin: "0 6px 6px 0" }),
    btn: { width: "100%", padding: 14, borderRadius: 12, background: "linear-gradient(135deg,rgba(139,69,19,0.6),rgba(100,40,140,0.6))", border: "1px solid rgba(180,140,80,0.4)", color: "#f0d9a8", fontSize: 15, cursor: "pointer", fontFamily: "inherit", marginTop: 8 },
    row: { display: "flex", gap: 12 },
    half: { flex: 1 },
    sub: { fontSize: 12, color: "#9a7a5a", marginBottom: 16, lineHeight: 1.6 },
    progress: { display: "flex", gap: 6, marginBottom: 24 },
    dot: (active, done) => ({ width: 8, height: 8, borderRadius: "50%", background: done ? "#c084fc" : active ? "#f0a830" : "rgba(255,255,255,0.15)" }),
  };

  const steps = [
    // Step 0 — Welcome
    <div key={0}>
      <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>🪷</div>
      <div style={{ fontSize: 22, color: "#f0d9a8", textAlign: "center", marginBottom: 8 }}>Welcome to Kathak Journey</div>
      <div style={S.sub} style={{ ...S.sub, textAlign: "center" }}>Let's set up your personal curriculum. It takes about 2 minutes and makes everything in the app specific to you.</div>
      <span style={S.label}>Your name (optional)</span>
      <input style={S.input} placeholder="e.g. Vineeta" value={cfg.studentName} onChange={e => set("studentName", e.target.value)} />
      <span style={S.label}>Journey start date</span>
      <input type="date" style={S.input} value={cfg.startDate} onChange={e => set("startDate", e.target.value)} />
      <div style={{ fontSize:11, color:"#9a7a5a", marginBottom:16, lineHeight:1.6 }}>Defaults to today. Can be a future date if classes haven't started, or a past date if you began earlier. The app auto-tracks which month you're on.</div>
      <button style={S.btn} onClick={() => setStep(1)}>Next →</button>
    </div>,

    // Step 1 — Curriculum length & Tatkaar
    <div key={1}>
      <div style={{ fontSize: 18, color: "#f0d9a8", marginBottom: 6 }}>Curriculum Setup</div>
      <div style={S.sub}>How long is your course and what are your Tatkaar BPM targets?</div>
      <span style={S.label}>Number of months</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[3, 4, 6, 8, 10, 12].map(n => (
          <button key={n} style={S.chip(cfg.numMonths === n)} onClick={() => set("numMonths", n)}>{n} months</button>
        ))}
      </div>
      <div style={S.row}>
        <div style={S.half}>
          <span style={S.label}>Starting BPM</span>
          <input type="number" style={S.input} value={cfg.startBpm} onChange={e => set("startBpm", Number(e.target.value))} />
        </div>
        <div style={S.half}>
          <span style={S.label}>Target BPM</span>
          <input type="number" style={S.input} value={cfg.endBpm} onChange={e => set("endBpm", Number(e.target.value))} />
        </div>
      </div>
      <span style={S.label}>Daily practice target (minutes)</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[15, 20, 30, 45, 60].map(n => (
          <button key={n} style={S.chip(cfg.dailyTargetMin === n)} onClick={() => set("dailyTargetMin", n)}>{n} min</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, background: "rgba(0,0,0,0.3)", flex: 1 }} onClick={() => setStep(0)}>← Back</button>
        <button style={{ ...S.btn, flex: 2 }} onClick={() => setStep(2)}>Next →</button>
      </div>
    </div>,

    // Step 2 — Elements
    <div key={2}>
      <div style={{ fontSize: 18, color: "#f0d9a8", marginBottom: 6 }}>What's in your curriculum?</div>
      <div style={S.sub}>Tick everything your teacher has you working on.</div>
      {[
        ["hasTatkaar",       "Tatkaar (footwork)"],
        ["hasSecondTatkaar", "Second Tatkaar"],
        ["hasChakkars",      "Chakkars (turns)"],
        ["hasTodas",         "Todas"],
        ["hasAamads",        "Aamads"],
        ["hasGats",          "Gats"],
      ].map(([key, label]) => (
        <button key={key} style={{ ...S.chip(cfg[key]), display: "block", width: "100%", textAlign: "left", marginBottom: 8 }}
          onClick={() => set(key, !cfg[key])}>
          {cfg[key] ? "✓" : "○"} {label}
        </button>
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button style={{ ...S.btn, background: "rgba(0,0,0,0.3)", flex: 1 }} onClick={() => setStep(1)}>← Back</button>
        <button style={{ ...S.btn, flex: 2 }} onClick={() => setStep(3)}>Next →</button>
      </div>
    </div>,

    // Step 3 — Counts
    <div key={3}>
      <div style={{ fontSize: 18, color: "#f0d9a8", marginBottom: 6 }}>How many of each?</div>
      <div style={S.sub}>Enter the total number you'll learn over the full curriculum.</div>
      {cfg.hasTodas && (
        <>
          <span style={S.label}>Total Todas to learn</span>
          <input type="number" style={S.input} value={cfg.numTodas} onChange={e => set("numTodas", Number(e.target.value))} />
        </>
      )}
      {cfg.hasAamads && (
        <>
          <span style={S.label}>Total Aamads</span>
          <input type="number" style={S.input} value={cfg.numAamads} onChange={e => set("numAamads", Number(e.target.value))} />
        </>
      )}
      {cfg.hasGats && (
        <>
          <span style={S.label}>Total Gats</span>
          <input type="number" style={S.input} value={cfg.numGats} onChange={e => set("numGats", Number(e.target.value))} />
        </>
      )}
      {cfg.hasChakkars && (
        <>
          <span style={S.label}>Chakkar types you'll practice</span>
          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 16 }}>
            {ALL_CHAKKAR_STEPS.map(s => (
              <button key={s} style={S.chip(cfg.chakkarSteps.includes(s))} onClick={() => toggleChakkar(s)}>{s}</button>
            ))}
          </div>
        </>
      )}
      {!cfg.hasTodas && !cfg.hasAamads && !cfg.hasGats && !cfg.hasChakkars && (
        <div style={{ color: "#9a7a5a", fontSize: 13, padding: "20px 0" }}>No counts needed — just Tatkaar and/or Second Tatkaar.</div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, background: "rgba(0,0,0,0.3)", flex: 1 }} onClick={() => setStep(2)}>← Back</button>
        <button style={{ ...S.btn, flex: 2 }} onClick={() => onComplete(cfg)}>Start Journey 🪷</button>
      </div>
    </div>,
  ];

  return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={S.progress}>
          {steps.map((_, i) => <div key={i} style={S.dot(i === step, i < step)} />)}
        </div>
        {steps[step]}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function KathakTracker() {
  const [config, setConfig] = useState(() => loadConfig());
  const [data, setData]     = useState(() => config ? loadData(config) : null);
  const [activeTab, setActiveTab] = useState("today");
  const [saved, setSaved]   = useState(false);
  const [newBadge, setNewBadge] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const metro = useMetronome(config?.startBpm || 80);

  // Derived from config
  const MONTHS_DATA    = config ? generateCurriculum(config) : [];
  const TATKAAR_LEVELS = config ? generateTatkaarLevels(config) : [];
  const currentMonth   = config?.startDate ? getMonthFromStartDate(config.startDate, config.numMonths) : 0;
  const currentMonthData = MONTHS_DATA[currentMonth] || {};
  const todayLogged    = data?.lastPracticeDate === getTodayKey();

  useEffect(() => {
    if (data) try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  useEffect(() => {
    if (config) try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch {}
  }, [config]);

  useEffect(() => {
    if (!data?.reminderTime) return;
    const iv = setInterval(() => {
      const now = new Date();
      const [h, m] = data.reminderTime.split(":").map(Number);
      if (now.getHours() === h && now.getMinutes() === m && data.lastPracticeDate !== getTodayKey()) {
        if (Notification.permission === "granted") new Notification("🪷 Kathak time!", { body: "Your daily practice is waiting!" });
      }
    }, 60000);
    return () => clearInterval(iv);
  }, [data?.reminderTime, data?.lastPracticeDate]);

  function handleIntakeComplete(cfg) {
    setConfig(cfg);
    setData(defaultData(cfg));
  }

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
    if (d.allLogs.some(l => l.tatkaarLevel === `L${TATKAAR_LEVELS.length}`)) add("max_level");
    const lastChakkar = config?.chakkarSteps?.[config.chakkarSteps.length - 1];
    if (lastChakkar && d.milestones?.chakkars?.[lastChakkar]?.m8 === "solid") add("chakkar_solid");
    if (currentMonth >= Math.floor(config.numMonths / 2)) add("halfway");
    if (currentMonth >= config.numMonths - 1) add("complete");
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
    const today = getTodayKey(), weekKey = getWeekKey();
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

  // Show intake form if no config saved
  if (!config) return <IntakeForm onComplete={handleIntakeComplete} />;

  const weekLog = data.weekLogs[getWeekKey()] || {};
  const weekDays = DAYS.map((day, i) => {
    const d = new Date(), curr = d.getDay(), diff = i - (curr === 0 ? 6 : curr - 1);
    const t = new Date(); t.setDate(t.getDate() + diff);
    const key = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
    return { day, key, logged: !!weekLog[key] };
  });

  const xpLevel    = Math.floor(data.xp / 100) + 1;
  const xpProgress = data.xp % 100;
  const chartData  = data.allLogs.slice(-30).map((l, i) => ({
    i: i + 1, level: parseInt(l.tatkaarLevel?.replace("L","") || 0), time: parseInt(l.time) || 0
  }));

  const S = {
    page:  { minHeight: "100vh", background: "radial-gradient(ellipse at 20% 10%, #1a0a2e 0%, #0d0d1a 50%, #0a1628 100%)", fontFamily: "'Georgia','Times New Roman',serif", color: "#e8d5b7", paddingBottom: 80 },
    card:  { padding: "14px 16px", background: "rgba(0,0,0,0.3)", borderRadius: 12, border: "1px solid rgba(180,140,80,0.2)", marginBottom: 12 },
    label: { fontSize: 10, letterSpacing: 3, color: "#b8906a", textTransform: "uppercase", marginBottom: 12, display: "block" },
    input: { width: "100%", padding: "8px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(180,140,80,0.3)", color: "#e8d5b7", fontSize: 13, fontFamily: "inherit" },
    chip:  (on, accent) => ({ padding: "6px 12px", borderRadius: 8, border: `1px solid ${on ? (accent||"#c084fc") : "rgba(180,140,80,0.3)"}`, background: on ? `${accent||"#c084fc"}22` : "rgba(0,0,0,0.3)", color: on ? (accent||"#c084fc") : "#9a7a5a", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }),
  };

  const tabs = [
    { id: "today",      label: "Today" },
    { id: "week",       label: "Week" },
    { id: "progress",   label: "Progress" },
    { id: "journey",    label: "Journey" },
    { id: "milestones", label: "Milestones" },
    { id: "badges",     label: "Badges" },
  ];

  return (
    <div style={S.page}>
      <style>{`
        @keyframes slideDown { from{transform:translate(-50%,-60px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=time],input[type=date]{color-scheme:dark}
        ::-webkit-scrollbar{display:none}
        *{box-sizing:border-box}
      `}</style>

      {/* Badge toast */}
      {newBadge && (
        <div onClick={() => setNewBadge(null)} style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,rgba(192,132,252,0.97),rgba(139,69,19,0.97))", padding:"14px 24px", borderRadius:16, zIndex:999, cursor:"pointer", boxShadow:"0 8px 32px rgba(192,132,252,0.5)", textAlign:"center", minWidth:220, animation:"slideDown 0.4s ease" }}>
          <div style={{ fontSize:30 }}>{newBadge.icon}</div>
          <div style={{ fontSize:13, fontWeight:"bold", color:"#fff", marginTop:4 }}>Badge Unlocked!</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.85)" }}>{newBadge.name}</div>
        </div>
      )}

      {/* Reset confirm */}
      {showReset && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#0d0d1a", border:"1px solid rgba(180,140,80,0.4)", borderRadius:20, padding:28, maxWidth:340, width:"100%", textAlign:"center" }}>
            <div style={{ fontSize:30, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:16, color:"#f0d9a8", marginBottom:8 }}>Reset everything?</div>
            <div style={{ fontSize:13, color:"#9a7a5a", marginBottom:24 }}>This will delete all your progress and let you redo the setup form. This cannot be undone.</div>
            <button onClick={() => { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(CONFIG_KEY); setConfig(null); setData(null); setShowReset(false); }} style={{ width:"100%", padding:12, borderRadius:10, background:"rgba(240,80,80,0.2)", border:"1px solid rgba(240,80,80,0.4)", color:"#f08080", cursor:"pointer", fontFamily:"inherit", fontSize:14, marginBottom:10 }}>Yes, reset everything</button>
            <button onClick={() => setShowReset(false)} style={{ width:"100%", padding:10, background:"none", border:"none", color:"#9a7a5a", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,rgba(139,69,19,0.3) 0%,rgba(180,120,60,0.15) 50%,rgba(100,40,140,0.3) 100%)", borderBottom:"1px solid rgba(180,140,80,0.3)", padding:"16px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:4, color:"#b8906a", textTransform:"uppercase", marginBottom:3 }}>नृत्य यात्रा</div>
            <div style={{ fontSize:20, color:"#f0d9a8" }}>{config.studentName ? `${config.studentName}'s Journey` : "Kathak Journey"}</div>
            <div style={{ fontSize:12, color:"#9a7a5a", marginTop:2 }}>
              Month {currentMonth + 1} of {config.numMonths}
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
              {(currentMonthData.focus || []).map((f, i) => (
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
            {config.hasTatkaar && (
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
            )}

            {/* Metronome */}
            {config.hasTatkaar && (
              <div style={{ ...S.card, marginBottom:16 }}>
                <span style={S.label}>Metronome — {metro.bpm} BPM</span>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <input type="range" min={30} max={180} value={metro.bpm} onChange={e => metro.setBpm(Number(e.target.value))} style={{ flex:1, accentColor:"#c084fc" }} />
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
            )}

            {/* Second Tatkaar */}
            {config.hasSecondTatkaar && (
              <div style={{ marginBottom:16 }}>
                <span style={S.label}>2nd Tatkaar (minutes)</span>
                <input type="number" min="0" max="30" value={data.todayLog.secondTatkaar} onChange={e => update(d => { d.todayLog.secondTatkaar = e.target.value; return d; })} style={{ ...S.input, width:80 }} />
              </div>
            )}

            {/* Chakkars */}
            {config.hasChakkars && config.chakkarSteps.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <span style={S.label}>Chakkars — select then rate stability</span>
                {config.chakkarSteps.map(step => {
                  const sel = Array.isArray(data.todayLog.chakkars) && data.todayLog.chakkars.includes(step);
                  const stab = data.todayLog[`stab_${step}`] || "";
                  return (
                    <div key={step} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                      <button onClick={() => update(d => {
                        if (!Array.isArray(d.todayLog.chakkars)) d.todayLog.chakkars = [];
                        d.todayLog.chakkars = d.todayLog.chakkars.includes(step) ? d.todayLog.chakkars.filter(s => s!==step) : [...d.todayLog.chakkars, step];
                        return d;
                      })} style={{ ...S.chip(sel, "#f0a830"), minWidth:78, textAlign:"center" }}>{step}</button>
                      {sel && STABILITY.map(s => {
                        const c = s==="solid"?"#90e890":s==="okay"?"#f0a830":"#f08080";
                        return <button key={s} onClick={() => update(d => { d.todayLog[`stab_${step}`] = s; return d; })} style={{ padding:"3px 9px", borderRadius:6, fontSize:10, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${stab===s?c:"rgba(180,140,80,0.2)"}`, background:stab===s?`${c}22`:"rgba(0,0,0,0.3)", color:stab===s?c:"#9a7a5a" }}>{s}</button>;
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Time */}
            <div style={{ marginBottom:16 }}>
              <span style={S.label}>Practice Time (min)</span>
              <input type="number" min="0" max="120" value={data.todayLog.time} onChange={e => update(d => { d.todayLog.time = e.target.value; return d; })} style={{ ...S.input, width:80 }} />
            </div>

            {/* Notes */}
            <div style={{ marginBottom:20 }}>
              <span style={S.label}>Notes — optional</span>
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
            </div>

            {/* Reconfigure */}
            <button onClick={() => setShowReset(true)} style={{ width:"100%", marginTop:12, padding:10, background:"none", border:"1px solid rgba(180,140,80,0.15)", borderRadius:10, color:"#6a5a4a", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
              ⚙ Reconfigure curriculum
            </button>
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
              {[["Best Streak",`${data.bestStreak||data.streak}d`,"#f0a830"],["Total XP",data.xp,"#c084fc"],["Sessions",data.allLogs.length,"#90e890"]].map(([l,v,c]) => (
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
                      <YAxis domain={[0, TATKAAR_LEVELS.length]} tick={{ fontSize:10, fill:"#9a7a5a" }} tickFormatter={v=>`L${v}`} />
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
            {data.allLogs.filter(l=>l.notes).length > 0 && (
              <div style={S.card}>
                <span style={S.label}>Practice Notes</span>
                {data.allLogs.filter(l=>l.notes).slice(-6).reverse().map((l,i,arr) => (
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
            <span style={S.label}>{config.numMonths}-Month Curriculum</span>
            {MONTHS_DATA.map((month, i) => {
              const past = i < currentMonth, curr = i === currentMonth, future = i > currentMonth;
              const log = data.monthLogs[i] || {};
              return (
                <div key={i} style={{ padding:"14px 16px", marginBottom:10, borderRadius:12, background:curr?"rgba(192,132,252,0.09)":past?"rgba(180,140,80,0.05)":"rgba(0,0,0,0.2)", border:`1px solid ${curr?"rgba(192,132,252,0.4)":past?"rgba(180,140,80,0.2)":"rgba(255,255,255,0.04)"}`, opacity:future?0.42:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div style={{ fontWeight:"bold", color:curr?"#c084fc":"#e8d5b7" }}>Month {i+1}</div>
                    {curr && <span style={{ fontSize:10, color:"#c084fc", letterSpacing:2 }}>● NOW</span>}
                    {past && <span>✓</span>}
                  </div>
                  <div style={{ fontSize:12, color:"#9a7a5a", display:"flex", gap:12, flexWrap:"wrap", marginBottom:curr?12:0 }}>
                    {month.tatkaar!=="–" && <span>Tatkaar: {month.tatkaar}</span>}
                    {month.aamad!=="–" && <span style={{ color:"#b8906a" }}>{month.aamad}</span>}
                    {month.gat!=="–" && <span style={{ color:"#b8906a" }}>{month.gat}</span>}
                    {month.chakkar!=="–" && <span>Chakkars: {month.chakkar}</span>}
                  </div>
                  {curr && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {[["Tatkaar Level","tatkaarLevel","e.g. L4"],["Best Chakkar","bestChakkar","e.g. 4-step"],["2nd Tatkaar (min)","secondTatkaar","e.g. 3"],["Days/week","consistency","e.g. 5"]].map(([label,field,ph]) => (
                        <div key={field}>
                          <div style={{ fontSize:10, color:"#9a7a5a", marginBottom:4 }}>{label}</div>
                          <input placeholder={ph} value={log[field]||""} onChange={e => update(d => { if (!d.monthLogs[i]) d.monthLogs[i]={}; d.monthLogs[i][field] = e.target.value; return d; })} style={S.input} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ──── MILESTONES ──── */}
        {activeTab === "milestones" && (
          <div>
            <span style={S.label}>Milestones</span>
            {config.hasChakkars && config.chakkarSteps.length > 0 && (
              <>
                <div style={{ fontSize:12, color:"#b8906a", marginBottom:12 }}>Chakkar Mastery — tap to cycle: – → shaky → okay → solid</div>
                {config.chakkarSteps.map(step => {
                  const cd = data.milestones?.chakkars?.[step] || { start:"–", m4:"–", m8:"–" };
                  const cycle = { "–":"shaky", shaky:"okay", okay:"solid", solid:"–" };
                  return (
                    <div key={step} style={{ ...S.card, display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, fontSize:13, color:"#e8d5b7" }}>{step}</div>
                      {["start","m4","m8"].map((key, idx) => {
                        const val = cd[key]||"–";
                        const c = val==="solid"?"#90e890":val==="okay"?"#f0a830":val==="shaky"?"#f08080":"#9a7a5a";
                        return (
                          <div key={key} style={{ textAlign:"center" }}>
                            <div style={{ fontSize:9, color:"#9a7a5a", marginBottom:3 }}>{["Start","Mid","End"][idx]}</div>
                            <button onClick={() => update(d => { if (!d.milestones.chakkars[step]) d.milestones.chakkars[step]={start:"–",m4:"–",m8:"–"}; d.milestones.chakkars[step][key]=cycle[val]||"–"; return d; })} style={{ width:50, height:26, borderRadius:6, cursor:"pointer", fontSize:10, border:`1px solid ${val!=="–"?c:"rgba(180,140,80,0.25)"}`, background:val!=="–"?`${c}22`:"rgba(0,0,0,0.4)", color:c, fontFamily:"inherit" }}>{val}</button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
            <div style={{ ...S.card, marginTop:8 }}>
              <span style={S.label}>Your Curriculum Summary</span>
              {[
                ["Months", config.numMonths],
                ["BPM Range", `${config.startBpm} → ${config.endBpm}`],
                ["Daily Target", `${config.dailyTargetMin} min`],
                config.hasTodas && ["Total Todas", config.numTodas],
                config.hasAamads && ["Total Aamads", config.numAamads],
                config.hasGats && ["Total Gats", config.numGats],
              ].filter(Boolean).map(([l,v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, paddingBottom:8, borderBottom:"1px solid rgba(180,140,80,0.07)" }}>
                  <span style={{ fontSize:13, color:"#9a7a5a" }}>{l}</span>
                  <span style={{ fontSize:13, color:"#e8d5b7" }}>{v}</span>
                </div>
              ))}
            </div>
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