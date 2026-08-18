import React, { useState, useEffect, useMemo } from "react";

/* ============================================================
   DELEGATE BOARD
   Status-column Kanban (To Do / Done) with person as a tag.
   Recurring tasks (weekly / every-2-weeks) auto-reset back to
   To Do when their cycle rolls over, based on a stored
   last-completed timestamp — no manual re-adding each week.

   Cards carry: priority (High/Med/Low, sorts highest-first),
   estimated minutes, and tools needed. A per-person export
   builds a bulleted text list ready to paste into a text message.

   Storage key: "gnws-delegate-v1" (localStorage)
   Follows the visual language of the main shell:
     paper  #F6F3EC   ink #221D19   line #C9BDA3   accent #7E2F21
   ============================================================ */

const STORAGE_KEY = "gnws-delegate-v1";

const COLORS = {
  paper: "#F6F3EC",
  ink: "#221D19",
  line: "#C9BDA3",
  accent: "#7E2F21",
  sub: "#5a5245",
  card: "#ffffff",
};

const MONO = "ui-monospace, Menlo, monospace";
const SANS = "Helvetica, Arial, sans-serif";

const PEOPLE = ["Artemis", "Will", "Matt", "Ero"];

const PERSON_COLOR = {
  Artemis: "#8A6D3B",
  Will: "#3B6E8A",
  Matt: "#5B7A4A",
  Ero: "#7E2F21",
};

const FREQUENCIES = [
  { id: "once", label: "One-time" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Every 2 weeks" },
  { id: "ongoing", label: "Ongoing" },
  { id: "deferred", label: "Deferred" },
];

const PRIORITIES = [
  { id: "high", label: "High", rank: 0, color: "#7E2F21" },
  { id: "medium", label: "Medium", rank: 1, color: "#8A6D3B" },
  { id: "low", label: "Low", rank: 2, color: "#8a8474" },
];

function priorityRank(id) {
  return PRIORITIES.find((p) => p.id === id)?.rank ?? 1;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------- seed data, from the delegation planning session ---------- */
function seedTasks() {
  const now = Date.now();
  const t = (person, text, freq, extra = {}) => ({
    id: crypto.randomUUID(),
    person,
    text,
    freq,
    priority: "medium",
    minutes: null,
    tools: "",
    done: false,
    completedAt: null,
    createdAt: now,
    ...extra,
  });

  return [
    t("Artemis", "Calculate back rent owed", "once"),
    t("Artemis", "Confirm this month's rent payment timeline", "once"),
    t("Artemis", "Garbage: bagged, loaded into trailer, staged for truck — never on back patio", "ongoing"),
    t("Artemis", "Wipe counters", "weekly"),
    t("Artemis", "Dishes", "weekly"),
    t("Artemis", "Laundry", "weekly"),
    t("Artemis", "Tools put away in tool room", "weekly"),
    t("Artemis", "General tidy/clean", "weekly"),
    t("Artemis", "Vacuum floor", "weekly"),
    t("Artemis", "Change/remake bed sheets", "biweekly"),
    t("Artemis", "Weed whack (plug-in whacker)", "ongoing"),

    t("Will", "Calculate his own back hours/rent owed", "once"),
    t("Will", "Garbage to transfer station", "weekly"),
    t("Will", "Keep weeds down along paths", "ongoing"),
    t("Will", "Blackberry removal", "ongoing"),
    t("Will", "Weed whacking", "ongoing"),
    t("Will", "5 hrs/week minimum, regardless of assigned tasks", "weekly"),
    t("Will", "Fifth wheel repair list (to be specified)", "ongoing"),
    t("Will", "Take apart metal cage by the garbage trailer", "once"),
    t("Will", "Move insulation from other van into dump trailer", "once"),
    t("Will", "Big property dump while the trailer's here — flag anything else that needs to go", "once", { priority: "high", notes: "Trailer is on-site now, good window for this" }),
    t("Will", "Clean out that van generally", "once"),
    t("Will", "Clear out job box (signs), put signs in garbage trailer", "once"),
    t("Will", "Move job box down by road, then paint", "once"),
    t("Will", "Pace-of-work — revisit later", "deferred"),

    t("Matt", "Reassemble tractor, get running", "once"),
    t("Matt", "Reattach rear hydraulic hose", "once"),

    t("Ero", "Bring water pump home", "once"),
    t("Ero", "Buy new water pump for personal use (business expense)", "once"),
    t("Ero", "Buy more quick clamps", "once"),
    t("Ero", "Buy more spring clamps", "once"),
    t("Ero", "Source an engine hoist", "once"),
    t("Ero", "Sell both trailers, buy one right-sized trailer", "once"),
  ];
}

/* ---------- recurrence: does a completed task need to pop back to To Do? ---------- */
function cycleLengthMs(freq) {
  if (freq === "weekly") return 7 * DAY_MS;
  if (freq === "biweekly") return 14 * DAY_MS;
  return null;
}

function applyAutoReset(tasks) {
  const now = Date.now();
  let changed = false;
  const next = tasks.map((task) => {
    if (!task.done || !task.completedAt) return task;
    const cycle = cycleLengthMs(task.freq);
    if (!cycle) return task;
    if (now - task.completedAt >= cycle) {
      changed = true;
      return { ...task, done: false, completedAt: null };
    }
    return task;
  });
  return { next, changed };
}

/* ---------- persistence ---------- */
async function loadTasks() {
  try {
    const res = await window.storage.get(STORAGE_KEY);
    const parsed = JSON.parse(res.value);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedTasks();
    return parsed.map((task) => ({
      priority: "medium",
      minutes: null,
      tools: "",
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
    // network hiccup — local cache in the shim still holds the data this session
  }
}

/* ---------- weekly text export ---------- */
function buildWeeklyText(tasks, person) {
  const list = tasks
    .filter((t) => t.person === person && !t.done)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  if (list.length === 0) return person + " — nothing on the list this week.";

  const lines = list.map((t) => {
    const bits = [];
    if (t.minutes) bits.push(t.minutes + " min");
    if (t.tools && t.tools.trim()) bits.push("tools: " + t.tools.trim());
    const suffix = bits.length ? " (" + bits.join(", ") + ")" : "";
    return "• " + t.text + suffix;
  });

  return person + " — this week:\n" + lines.join("\n");
}

/* ---------- small UI atoms ---------- */
function PersonDot({ person }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 999,
        background: PERSON_COLOR[person] || COLORS.sub,
        marginRight: 6,
      }}
    />
  );
}

function FreqBadge({ freq }) {
  const label = FREQUENCIES.find((f) => f.id === freq)?.label || freq;
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.03em",
        color: COLORS.sub,
        border: "1px solid " + COLORS.line,
        borderRadius: 3,
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
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

/* ---------- task card ---------- */
function TaskCard({ task, onToggle, onDelete, onEdit, onPriorityShift }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const [person, setPerson] = useState(task.person);
  const [freq, setFreq] = useState(task.freq);
  const [priority, setPriority] = useState(task.priority || "medium");
  const [minutes, setMinutes] = useState(task.minutes ?? "");
  const [tools, setTools] = useState(task.tools || "");

  const startEdit = () => {
    setText(task.text);
    setPerson(task.person);
    setFreq(task.freq);
    setPriority(task.priority || "medium");
    setMinutes(task.minutes ?? "");
    setTools(task.tools || "");
    setEditing(true);
  };

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onEdit(task.id, {
      text: trimmed,
      person,
      freq,
      priority,
      minutes: minutes === "" ? null : Number(minutes),
      tools: tools.trim(),
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
          borderLeft: "4px solid " + (PERSON_COLOR[person] || COLORS.line),
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
          <select value={person} onChange={(e) => setPerson(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
            {PEOPLE.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={freq} onChange={(e) => setFreq(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
            {FREQUENCIES.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>{p.label} priority</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="number"
            min="0"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="Minutes"
            style={{ ...inputStyle, width: 90, fontFamily: MONO }}
          />
          <input
            value={tools}
            onChange={(e) => setTools(e.target.value)}
            placeholder="Tools needed (e.g. weed whacker, gloves)"
            style={{ ...inputStyle, flex: "1 1 200px", minWidth: 160 }}
          />
          <div style={{ flex: 1 }} />
          <button
            onClick={cancel}
            style={{
              fontFamily: MONO,
              fontSize: 11,
              padding: "6px 12px",
              background: "transparent",
              color: COLORS.sub,
              border: "1px solid " + COLORS.line,
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={save}
            style={{
              fontFamily: MONO,
              fontSize: 11,
              padding: "6px 12px",
              background: COLORS.accent,
              color: "#fff",
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            SAVE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: COLORS.card,
        border: "1px solid " + COLORS.line,
        borderLeft: "4px solid " + (PERSON_COLOR[task.person] || COLORS.line),
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
        checked={task.done}
        onChange={() => onToggle(task.id)}
        style={{ marginTop: 3, width: 16, height: 16, cursor: "pointer", accentColor: COLORS.accent }}
      />
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 13,
            color: COLORS.ink,
            lineHeight: 1.4,
            textDecoration: task.done ? "line-through" : "none",
            opacity: task.done ? 0.55 : 1,
            wordBreak: "break-word",
          }}
        >
          {task.text}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.sub, display: "flex", alignItems: "center" }}>
            <PersonDot person={task.person} />
            {task.person}
          </span>
          <PriorityBadge priority={task.priority || "medium"} />
          <FreqBadge freq={task.freq} />
          {task.minutes ? (
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.sub }}>{task.minutes} min</span>
          ) : null}
          {task.tools ? (
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.sub }}>🔧 {task.tools}</span>
          ) : null}
        </div>
      </div>
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
  );
}

/* ---------- add-task form ---------- */
function AddTaskForm({ onAdd }) {
  const [text, setText] = useState("");
  const [person, setPerson] = useState(PEOPLE[0]);
  const [freq, setFreq] = useState("once");
  const [priority, setPriority] = useState("medium");
  const [minutes, setMinutes] = useState("");
  const [tools, setTools] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({
      text: trimmed,
      person,
      freq,
      priority,
      minutes: minutes === "" ? null : Number(minutes),
      tools: tools.trim(),
    });
    setText("");
    setMinutes("");
    setTools("");
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
        <select value={person} onChange={(e) => setPerson(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
          {PEOPLE.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={freq} onChange={(e) => setFreq(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
          {FREQUENCIES.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle, fontFamily: MONO }}>
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>{p.label} priority</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="number"
          min="0"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Minutes"
          style={{ ...inputStyle, width: 100, fontFamily: MONO }}
        />
        <input
          value={tools}
          onChange={(e) => setTools(e.target.value)}
          placeholder="Tools needed"
          style={{ ...inputStyle, flex: "1 1 200px", minWidth: 160 }}
        />
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

/* ---------- settings panel (raw data backend) ---------- */

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

/* ---------- weekly text export modal ---------- */
function WeeklyExportModal({ tasks, onClose }) {
  const [copied, setCopied] = useState("");

  const copy = async (person, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(person);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      // clipboard blocked — user can still select and copy manually
    }
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Weekly Lists — Text Ready</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: COLORS.sub, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>

        {PEOPLE.map((person) => {
          const text = buildWeeklyText(tasks, person);
          return (
            <div key={person} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.05em", color: PERSON_COLOR[person], fontWeight: 700 }}>
                  {person.toUpperCase()}
                </span>
                <button
                  onClick={() => copy(person, text)}
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    padding: "5px 10px",
                    background: copied === person ? COLORS.accent : "transparent",
                    color: copied === person ? "#fff" : COLORS.sub,
                    border: "1px solid " + (copied === person ? COLORS.accent : COLORS.line),
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  {copied === person ? "COPIED" : "COPY"}
                </button>
              </div>
              <pre
                style={{ fontFamily: SANS, fontSize: 13, whiteSpace: "pre-wrap", background: COLORS.card, border: "1px solid " + COLORS.line, borderRadius: 3, padding: 12, margin: 0, lineHeight: 1.5 }}
              >
                {text}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- main board ---------- */
export default function DelegateBoard() {
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [personFilter, setPersonFilter] = useState("All");
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = await loadTasks();
      const { next, changed } = applyAutoReset(initial);
      if (changed) await saveTasks(next);
      if (!cancelled) {
        setTasks(next);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prev) => {
        const { next, changed } = applyAutoReset(prev);
        if (changed) saveTasks(next);
        return changed ? next : prev;
      });
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loaded) return; // don't save until the initial load has completed
    saveTasks(tasks);
  }, [tasks, loaded]);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null } : t))
    );
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

  const addTask = ({ text, person, freq, priority, minutes, tools }) => {
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        person,
        text,
        freq,
        priority: priority || "medium",
        minutes: minutes ?? null,
        tools: tools || "",
        done: false,
        completedAt: null,
        createdAt: Date.now(),
      },
    ]);
  };

  const filtered = useMemo(() => {
    const base = personFilter === "All" ? tasks : tasks.filter((t) => t.person === personFilter);
    return [...base].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }, [tasks, personFilter]);

  const todo = filtered.filter((t) => !t.done);
  const done = filtered.filter((t) => t.done);

  const filterPill = (label) => (
    <button
      key={label}
      onClick={() => setPersonFilter(label)}
      style={{
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: "0.03em",
        padding: "6px 12px",
        border: "1px solid " + (personFilter === label ? COLORS.accent : COLORS.line),
        borderRadius: 999,
        background: personFilter === label ? COLORS.accent : "transparent",
        color: personFilter === label ? "#fff" : COLORS.sub,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
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
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px 100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ marginBottom: 4, fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", color: COLORS.sub }}>
              GNWS / HOMESTEAD
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 20px" }}>Delegate</h1>
          </div>
          <div style={{ display: "flex", gap: 8, height: "fit-content" }}>
            <button
              onClick={() => setShowSettings(true)}
              title="Settings"
              style={{ background: "transparent", border: "1px solid " + COLORS.line, borderRadius: 3, padding: "10px 12px", cursor: "pointer", fontFamily: MONO, fontSize: 11, color: COLORS.sub }}
            >
              ⚙ SETTINGS
            </button>
            <button
              onClick={() => setShowExport(true)}
              style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.03em", padding: "10px 18px", background: COLORS.ink, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
            >
              WEEKLY TEXT LISTS
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {filterPill("All")}
          {PEOPLE.map(filterPill)}
        </div>

        <AddTaskForm onAdd={addTask} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.05em", color: COLORS.sub, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid " + COLORS.line }}>
              TO DO — {todo.length}
            </div>
            {todo.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.sub, fontStyle: "italic" }}>Nothing here. Good.</div>
            )}
            {todo.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} onPriorityShift={shiftPriority} />
            ))}
          </div>

          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.05em", color: COLORS.sub, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid " + COLORS.line }}>
              DONE — {done.length}
            </div>
            {done.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.sub, fontStyle: "italic" }}>Nothing checked off yet.</div>
            )}
            {done.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} onPriorityShift={shiftPriority} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: COLORS.sub, fontFamily: MONO, lineHeight: 1.6 }}>
          Weekly and every-2-weeks tasks auto-reset back to To Do once their cycle rolls over. One-time, ongoing, and
          deferred tasks stay put until you check or delete them. Use the ▲▼ arrows to bump priority — highest sorts
          to the top of each column.
        </div>
      </div>

      {showExport && <WeeklyExportModal tasks={tasks} onClose={() => setShowExport(false)} />}
      {showSettings && (
        <SettingsPanel
          storageKey={STORAGE_KEY}
          moduleLabel="Delegate"
          data={tasks}
          onImport={(parsed) => { if (Array.isArray(parsed)) setTasks(parsed); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
