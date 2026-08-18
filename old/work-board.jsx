import React, { useState, useEffect, useMemo } from "react";

/* ============================================================
   WORK BOARD
   Ero's own daily/ongoing task planner — separate from Delegate
   (which tracks tasks assigned to other people). Covers business,
   home, personal, whatever — "work" broadly.

   Sections: TODAY / BACKLOG / DONE (backlog <-> today via arrows)

   Money fields on each task:
     dueDate   — ISO date string (yyyy-mm-dd) or null
     amount    — dollar amount, rounded, or null
     direction — "cost" | "income" | null (null = no money attached)
     freq      — "once" | "weekly" | "monthly" (for recurring cash flow,
                 e.g. $10/week garbage) — separate from the priority
                 system, only used for money projection

   Financials (DebtPayoff.jsx) reads this board's data straight out
   of localStorage (read-only, one-way) to build its "Upcoming
   Purchases" / "Upcoming Income" dashboard cards and cash flow
   chart. This board never reads anything back from Financials —
   the debt/payoff math there is untouched.

   Storage key: "gnws-work-v1" (localStorage)
   Same visual language as Delegate board:
     paper #F6F3EC   ink #221D19   line #C9BDA3   accent #7E2F21
   ============================================================ */

const STORAGE_KEY = "gnws-work-v1";

const COLORS = {
  paper: "#F6F3EC",
  ink: "#221D19",
  line: "#C9BDA3",
  accent: "#7E2F21",
  sub: "#5a5245",
  card: "#ffffff",
  income: "#3B6E8A",
};

const MONO = "ui-monospace, Menlo, monospace";
const SANS = "Helvetica, Arial, sans-serif";

const CATEGORIES = ["Business", "Home", "Personal", "Errand"];

const CATEGORY_COLOR = {
  Business: "#7E2F21",
  Home: "#3B6E8A",
  Personal: "#8A6D3B",
  Errand: "#5B7A4A",
};

const PRIORITIES = [
  { id: "high", label: "High", rank: 0, color: "#7E2F21" },
  { id: "medium", label: "Medium", rank: 1, color: "#8A6D3B" },
  { id: "low", label: "Low", rank: 2, color: "#8a8474" },
];

const FREQS = [
  { id: "once", label: "One-time" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

function priorityRank(id) {
  return PRIORITIES.find((p) => p.id === id)?.rank ?? 1;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmt$(n) {
  const v = Math.round(Number(n) || 0);
  return "$" + v.toLocaleString();
}

/* ---------- seed data — Thursday July 9 plan ---------- */
function seedTasks() {
  const now = Date.now();
  const t = (text, section, extra = {}) => ({
    id: crypto.randomUUID(),
    text,
    section, // "today" | "backlog" | "done"
    category: "Business",
    priority: "medium",
    minutes: null,
    notes: "",
    dueDate: null,
    amount: null,
    direction: null, // "cost" | "income"
    freq: "once",
    createdAt: now,
    ...extra,
  });

  return [
    // Tomorrow — electrical is the priority, band practice skipped for it
    t("Trench + drop electrical to tiny houses (incl. Dana's)", "today", {
      category: "Home", priority: "high", minutes: 240,
      notes: "Decided: skipping band practice for this. Tenants need heat.",
    }),
    t("Check tenant's sink for leak / dryness", "today", { category: "Home", priority: "high", minutes: 20 }),
    t("Move Starlink / internet to the upper spot", "today", { category: "Business", priority: "high", minutes: 60, notes: "For Leo" }),
    t("Finish remaining boxes", "today", { category: "Business", priority: "medium", minutes: 120 }),
    t("Conversation with Matt and Leo about Matt's pay", "today", { category: "Business", priority: "medium", minutes: 20 }),
    t("Ask Ethica when to feed the snake", "today", { category: "Personal", priority: "medium", minutes: 5 }),
    t("Throw clothes in dryer (find boxers)", "today", { category: "Personal", priority: "low", minutes: 5 }),
    t("Source engine hoist for Matt (other van's engine)", "today", { category: "Business", priority: "low", minutes: null }),

    t("Feed the snake", "backlog", { category: "Personal", priority: "medium", minutes: 10, dueDate: "2026-07-12" }),

    t("Dentist", "backlog", { category: "Personal", priority: "low", minutes: null }),
    t("Optometrist", "backlog", { category: "Personal", priority: "low", minutes: null, notes: "Eyes have been stable" }),
    t("General checkup", "backlog", { category: "Personal", priority: "low", minutes: null }),
    t("Post construction signs on Facebook to give away/sell", "backlog", { category: "Business", priority: "low", minutes: 15, notes: "Revive the listings habit" }),
  ];
}

/* ---------- persistence (async, shared via Supabase through window.storage) ---------- */
async function loadTasks() {
  try {
    const res = await window.storage.get(STORAGE_KEY);
    const parsed = JSON.parse(res.value);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedTasks();
    return parsed.map((task) => ({
      category: "Business",
      priority: "medium",
      minutes: null,
      notes: "",
      dueDate: null,
      amount: null,
      direction: null,
      freq: "once",
      ...task,
    }));
  } catch {
    return seedTasks();
  }
}

async function saveTasks(tasks) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // network hiccup or storage unavailable — local cache in the shim still holds the data
  }
}

/* ---------- small UI atoms ---------- */
function CategoryBadge({ category }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.03em",
        color: "#fff",
        background: CATEGORY_COLOR[category] || COLORS.sub,
        borderRadius: 3,
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {category}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = PRIORITIES.find((p) => p.id === priority) || PRIORITIES[1];
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.03em",
        color: "#fff",
        background: p.color,
        borderRadius: 3,
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {p.label.toUpperCase()}
    </span>
  );
}

function MoneyBadge({ amount, direction, freq }) {
  if (!amount) return null;
  const isIncome = direction === "income";
  const suffix = freq === "weekly" ? "/wk" : freq === "monthly" ? "/mo" : "";
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 10.5,
        fontWeight: 700,
        color: isIncome ? COLORS.income : COLORS.accent,
        border: "1px solid " + (isIncome ? COLORS.income : COLORS.accent),
        borderRadius: 3,
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {isIncome ? "+" : "−"}{fmt$(amount)}{suffix}
    </span>
  );
}

/* ---------- task card ---------- */
function TaskCard({ task, onMove, onDelete, onEdit, onPriorityShift }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const [category, setCategory] = useState(task.category);
  const [priority, setPriority] = useState(task.priority);
  const [minutes, setMinutes] = useState(task.minutes ?? "");
  const [notes, setNotes] = useState(task.notes || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [amount, setAmount] = useState(task.amount ?? "");
  const [direction, setDirection] = useState(task.direction || "");
  const [freq, setFreq] = useState(task.freq || "once");

  const startEdit = () => {
    setText(task.text);
    setCategory(task.category);
    setPriority(task.priority);
    setMinutes(task.minutes ?? "");
    setNotes(task.notes || "");
    setDueDate(task.dueDate || "");
    setAmount(task.amount ?? "");
    setDirection(task.direction || "");
    setFreq(task.freq || "once");
    setEditing(true);
  };

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onEdit(task.id, {
      text: trimmed,
      category,
      priority,
      minutes: minutes === "" ? null : Number(minutes),
      notes: notes.trim(),
      dueDate: dueDate || null,
      amount: amount === "" ? null : Math.round(Number(amount)),
      direction: amount === "" ? null : (direction || "cost"),
      freq,
    });
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  const inputStyle = {
    fontFamily: SANS,
    fontSize: 13,
    padding: "6px 8px",
    border: "1px solid " + COLORS.line,
    borderRadius: 3,
    background: "#fff",
    color: COLORS.ink,
  };

  if (editing) {
    return (
      <div
        style={{
          background: COLORS.card,
          border: "1px solid " + COLORS.accent,
          borderLeft: "4px solid " + (CATEGORY_COLOR[category] || COLORS.line),
          borderRadius: 3,
          padding: "10px 12px",
          marginBottom: 8,
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          autoFocus
          style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 8, fontFamily: SANS }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>{p.label} priority</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="Minutes"
            style={{ ...inputStyle, width: 90, fontFamily: MONO }}
          />
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.05em", color: COLORS.sub, marginBottom: 4 }}>
          MONEY (optional)
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ ...inputStyle, fontFamily: MONO, width: 150 }}
          />
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount $"
            style={{ ...inputStyle, width: 110, fontFamily: MONO }}
          />
          <select value={direction} onChange={(e) => setDirection(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
            <option value="">Cost or income?</option>
            <option value="cost">Cost (I pay)</option>
            <option value="income">Income (I get paid)</option>
          </select>
          <select value={freq} onChange={(e) => setFreq(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
            {FREQS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={1}
          placeholder="Notes (optional)"
          style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 8, fontFamily: SANS }}
        />
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button
            onClick={cancel}
            style={{ fontFamily: MONO, fontSize: 11, padding: "6px 12px", background: "transparent", color: COLORS.sub, border: "1px solid " + COLORS.line, borderRadius: 3, cursor: "pointer" }}
          >
            CANCEL
          </button>
          <button
            onClick={save}
            style={{ fontFamily: MONO, fontSize: 11, padding: "6px 12px", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
          >
            SAVE
          </button>
        </div>
      </div>
    );
  }

  const isDone = task.section === "done";

  return (
    <div
      style={{
        background: COLORS.card,
        border: "1px solid " + COLORS.line,
        borderLeft: "4px solid " + (CATEGORY_COLOR[task.category] || COLORS.line),
        borderRadius: 3,
        padding: "10px 12px",
        marginBottom: 8,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <input
        type="checkbox"
        checked={isDone}
        onChange={() => onMove(task.id, isDone ? "today" : "done")}
        style={{ marginTop: 3, width: 16, height: 16, cursor: "pointer", accentColor: COLORS.accent }}
      />
      {!isDone && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 1 }}>
          <button
            onClick={() => onPriorityShift(task.id, -1)}
            title="Raise priority"
            style={{ background: "transparent", border: "none", color: COLORS.sub, cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0 }}
          >
            ▲
          </button>
          <button
            onClick={() => onPriorityShift(task.id, 1)}
            title="Lower priority"
            style={{ background: "transparent", border: "none", color: COLORS.sub, cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0 }}
          >
            ▼
          </button>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 13,
            color: COLORS.ink,
            lineHeight: 1.4,
            textDecoration: isDone ? "line-through" : "none",
            opacity: isDone ? 0.55 : 1,
            wordBreak: "break-word",
          }}
        >
          {task.text}
        </div>
        {task.notes ? (
          <div style={{ fontFamily: SANS, fontSize: 11.5, color: COLORS.sub, marginTop: 3, fontStyle: "italic" }}>
            {task.notes}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <CategoryBadge category={task.category} />
          <PriorityBadge priority={task.priority} />
          {task.minutes ? (
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.sub }}>{task.minutes} min</span>
          ) : null}
          {task.dueDate ? (
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.sub }}>📅 {task.dueDate}</span>
          ) : null}
          <MoneyBadge amount={task.amount} direction={task.direction} freq={task.freq} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {task.section === "today" && (
          <button
            onClick={() => onMove(task.id, "backlog")}
            title="Push to backlog"
            style={{ background: "transparent", border: "none", color: COLORS.sub, cursor: "pointer", fontSize: 11, fontFamily: MONO }}
          >
            →
          </button>
        )}
        {task.section === "backlog" && (
          <button
            onClick={() => onMove(task.id, "today")}
            title="Bring to today"
            style={{ background: "transparent", border: "none", color: COLORS.accent, cursor: "pointer", fontSize: 11, fontFamily: MONO }}
          >
            ←
          </button>
        )}
        <button
          onClick={startEdit}
          title="Edit"
          style={{ background: "transparent", border: "none", color: COLORS.sub, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 2 }}
        >
          ✎
        </button>
        <button
          onClick={() => onDelete(task.id)}
          title="Delete"
          style={{ background: "transparent", border: "none", color: COLORS.sub, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* ---------- add-task form ---------- */
function AddTaskForm({ onAdd }) {
  const [text, setText] = useState("");
  const [section, setSection] = useState("today");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState("medium");
  const [minutes, setMinutes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState("");
  const [freq, setFreq] = useState("once");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({
      text: trimmed,
      section,
      category,
      priority,
      minutes: minutes === "" ? null : Number(minutes),
      notes: "",
      dueDate: dueDate || null,
      amount: amount === "" ? null : Math.round(Number(amount)),
      direction: amount === "" ? null : (direction || "cost"),
      freq,
    });
    setText("");
    setMinutes("");
    setDueDate("");
    setAmount("");
    setDirection("");
    setFreq("once");
  };

  const inputStyle = {
    fontFamily: SANS,
    fontSize: 13,
    padding: "8px 10px",
    border: "1px solid " + COLORS.line,
    borderRadius: 3,
    background: "#fff",
    color: COLORS.ink,
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="New task..."
          style={{ ...inputStyle, flex: "1 1 220px", minWidth: 160 }}
        />
        <select value={section} onChange={(e) => setSection(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
          <option value="today">Today</option>
          <option value="backlog">Backlog</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>{p.label} priority</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Minutes"
          style={{ ...inputStyle, width: 100, fontFamily: MONO }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ ...inputStyle, fontFamily: MONO, width: 150 }}
        />
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount $"
          style={{ ...inputStyle, width: 110, fontFamily: MONO }}
        />
        <select value={direction} onChange={(e) => setDirection(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
          <option value="">Cost or income?</option>
          <option value="cost">Cost (I pay)</option>
          <option value="income">Income (I get paid)</option>
        </select>
        <select value={freq} onChange={(e) => setFreq(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
          {FREQS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <button
          onClick={submit}
          style={{ fontFamily: MONO, fontSize: 12, padding: "8px 16px", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
        >
          ADD
        </button>
      </div>
    </div>
  );
}

/* ---------------- Settings panel (raw data backend) ---------------- */

function SettingsPanel({ storageKey, moduleLabel, data, onImport, onClose }) {
  const [text, setText] = useState(() => JSON.stringify(data, null, 2));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — text is still selectable in the box
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = storageKey + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyImport = () => {
    try {
      const parsed = JSON.parse(text);
      onImport(parsed);
      setError("");
      onClose();
    } catch (e) {
      setError("Couldn't parse that as JSON: " + (e.message || String(e)));
    }
  };

  const clearAll = async () => {
    if (!window.confirm(`This clears all ${moduleLabel} data everywhere it's synced (all your devices), starting fresh. Continue?`)) return;
    try {
      await window.storage.delete(storageKey);
    } catch {
      // ignore — key may not exist
    }
    window.location.reload();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(34,29,25,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: COLORS.paper, border: "1px solid " + COLORS.line, borderRadius: 4, maxWidth: 640, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 24 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{moduleLabel} — Settings</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: COLORS.sub, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: COLORS.sub, marginBottom: 12 }}>
          Storage key: {storageKey}. Raw JSON — edit carefully, this is the actual saved data.
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%", minHeight: 320, fontFamily: MONO, fontSize: 11.5, padding: 10,
            border: "1px solid " + COLORS.line, borderRadius: 3, background: "#fff", color: COLORS.ink, resize: "vertical",
          }}
        />
        {error && <div style={{ color: COLORS.accent, fontFamily: MONO, fontSize: 11, marginTop: 6 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={copy} style={{ fontFamily: MONO, fontSize: 11, padding: "6px 12px", background: copied ? COLORS.accent : "transparent", color: copied ? "#fff" : COLORS.sub, border: "1px solid " + (copied ? COLORS.accent : COLORS.line), borderRadius: 3, cursor: "pointer" }}>
            {copied ? "COPIED" : "COPY JSON"}
          </button>
          <button onClick={download} style={{ fontFamily: MONO, fontSize: 11, padding: "6px 12px", background: "transparent", color: COLORS.sub, border: "1px solid " + COLORS.line, borderRadius: 3, cursor: "pointer" }}>
            DOWNLOAD .JSON
          </button>
          <button onClick={applyImport} style={{ fontFamily: MONO, fontSize: 11, padding: "6px 12px", background: COLORS.ink, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
            APPLY EDITED JSON
          </button>
          <button onClick={clearAll} style={{ fontFamily: MONO, fontSize: 11, padding: "6px 12px", background: "transparent", color: "#a6482a", border: "1px solid #a6482a", borderRadius: 3, cursor: "pointer", marginLeft: "auto" }}>
            CLEAR ALL {moduleLabel.toUpperCase()} DATA
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main board ---------------- */

export default function WorkBoard() {
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTasks().then((t) => {
      if (!cancelled) {
        setTasks(t);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return; // don't save until the initial load has completed
    saveTasks(tasks);
  }, [tasks, loaded]);

  const moveTask = (id, section) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, section } : t)));
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const editTask = (id, updates) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const shiftPriority = (id, direction) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const currentRank = priorityRank(t.priority);
        const nextRank = Math.min(2, Math.max(0, currentRank + direction));
        const nextPriority = PRIORITIES.find((p) => p.rank === nextRank)?.id || t.priority;
        return { ...t, priority: nextPriority };
      })
    );
  };

  const addTask = (payload) => {
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category: "Business",
        priority: "medium",
        minutes: null,
        notes: "",
        dueDate: null,
        amount: null,
        direction: null,
        freq: "once",
        createdAt: Date.now(),
        ...payload,
      },
    ]);
  };

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }, [tasks]);

  const today = sorted.filter((t) => t.section === "today");
  const backlog = sorted.filter((t) => t.section === "backlog");
  const done = sorted.filter((t) => t.section === "done");

  const columnHeader = (label, count) => (
    <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.05em", color: COLORS.sub, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid " + COLORS.line }}>
      {label} — {count}
    </div>
  );

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.paper, color: COLORS.sub, fontFamily: MONO, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
        Syncing…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.paper, color: COLORS.ink, fontFamily: SANS }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", color: COLORS.sub }}>
            GNWS / HOMESTEAD
          </div>
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={{ background: "transparent", border: "1px solid " + COLORS.line, borderRadius: 3, padding: "4px 8px", cursor: "pointer", fontFamily: MONO, fontSize: 11, color: COLORS.sub }}
          >
            ⚙ SETTINGS
          </button>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 20px" }}>Work</h1>

        <AddTaskForm onAdd={addTask} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          <div>
            {columnHeader("TODAY", today.length)}
            {today.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.sub, fontStyle: "italic" }}>Nothing planned yet.</div>
            )}
            {today.map((task) => (
              <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} onEdit={editTask} onPriorityShift={shiftPriority} />
            ))}
          </div>

          <div>
            {columnHeader("BACKLOG", backlog.length)}
            {backlog.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.sub, fontStyle: "italic" }}>Nothing pushed off yet.</div>
            )}
            {backlog.map((task) => (
              <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} onEdit={editTask} onPriorityShift={shiftPriority} />
            ))}
          </div>

          <div>
            {columnHeader("DONE", done.length)}
            {done.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.sub, fontStyle: "italic" }}>Nothing checked off yet.</div>
            )}
            {done.map((task) => (
              <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} onEdit={editTask} onPriorityShift={shiftPriority} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: COLORS.sub, fontFamily: MONO, lineHeight: 1.6 }}>
          → pushes a Today item to Backlog. ← brings a Backlog item back to Today when its time comes.
          Checkbox moves items to Done. Priority arrows (▲▼) re-sort within each column, highest on top.
          Items with a due date and dollar amount show up on the Financials dashboard automatically.
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          storageKey={STORAGE_KEY}
          moduleLabel="Work"
          data={tasks}
          onImport={(parsed) => { if (Array.isArray(parsed)) setTasks(parsed); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
