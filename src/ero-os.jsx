import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Trash2, Star, Check, Clock, CircleDot, ChevronLeft, ChevronRight,
  Flame, LayoutGrid, Gauge, RefreshCw, X, AlertTriangle, Pencil,
  Sunrise, Moon, Users
} from "lucide-react";

/* ============================================================
   ERO OS — COMMAND CENTER
   Module 00 of the GNWS / life operating system
   One board. Nothing quietly evaporates.

   v3 changes:
   - Board tab now uses the Covey matrix (Do First / Schedule /
     Delegate / Eliminate) instead of domain columns. Domain is
     kept as a tag on each loop, not the grouping axis.
   - Loops moved into the Delegate quadrant prompt for a person
     and write a real card onto the Delegate board's own storage
     (gnws-delegate-v1) — one-way write, doesn't read anything back.
   - New Rituals tab: Morning and Night habit checklists (separately
     editable), pulls in today's Work board items as a checklist
     step, keeps a daily streak per ritual. Sunday Ten still lives
     as the weekly deep review.
   - Reads Work board (gnws-work-v1) read-only for the Rituals tab
     and to show "from Work" context; never writes to Work.
   ============================================================ */

const C = {
  ink: "#221D19",
  inkSoft: "#3A332C",
  paper: "#F6F3EC",
  panel: "#FFFFFF",
  redwood: "#7E2F21",
  redwoodDark: "#5E2317",
  kraft: "#E4DCCB",
  kraftDark: "#C9BDA3",
  moss: "#4A5D3A",
  mossLight: "#A9C48F",
  faint: "#8A8172",
  warn: "#A65D21",
  gold: "#B8862B",
};

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const STORAGE_KEY = "ero-os-v1";
const WORK_STORAGE_KEY = "gnws-work-v1";
const DELEGATE_STORAGE_KEY = "gnws-delegate-v1";

const DOMAINS = [
  { id: "orders", label: "Orders & Customers", accent: "#7E2F21" },
  { id: "shop", label: "Shop & Equipment", accent: "#4A5D3A" },
  { id: "money", label: "Money", accent: "#B8862B" },
  { id: "property", label: "Property & Tenants", accent: "#5B6B7A" },
  { id: "self", label: "Self & Melody", accent: "#6E4A7E" },
];

const QUADRANTS = [
  { id: "doFirst", q: "Q1", label: "Do First", sub: "urgent + important", accent: "#7E2F21", icon: "🔥" },
  { id: "schedule", q: "Q2", label: "Schedule", sub: "important, not urgent", accent: "#4A5D3A", icon: "📅" },
  { id: "delegate", q: "Q3", label: "Delegate", sub: "urgent, not important", accent: "#B8862B", icon: "👤" },
  { id: "eliminate", q: "Q4", label: "Eliminate", sub: "neither", accent: "#8A8172", icon: "✕" },
];

const DELEGATE_PEOPLE = ["Artemis", "Will", "Matt", "Ero"];

/* ---------------- Seed data (Ero's real board, July 2026) ---------------- */

const SEED_LOOPS = [
  { id: "l1", domain: "orders", quadrant: "doFirst", title: "SO-2026-11 · InStone (Dustin)", next: "Finish production on first order — $54,964 balance releases on completion", status: "active", due: "", focus: true },
  { id: "l2", domain: "orders", quadrant: "schedule", title: "Dillon oak project · Las Vegas", next: "Get $10,000 deposit committed on the $28.5–29.5k quote", status: "active", due: "", focus: false },
  { id: "l3", domain: "orders", quadrant: "schedule", title: "Buckeye packaging commitment", next: "Confirm box order with Cameron inside the 30-day window", status: "active", due: "", focus: false },
  { id: "l4", domain: "shop", quadrant: "doFirst", title: "MJ 431-DC gang rip saw", next: "Confirm Skarpaz blades (4× GR1236T-170) and MJ spacer/shim order (14 pcs) shipped", status: "active", due: "", focus: true },
  { id: "l5", domain: "shop", quadrant: "schedule", title: "480V 3-phase electrical", next: "Leo finishes hookup · source step-down transformer for dust collector + compressor", status: "active", due: "", focus: false },
  { id: "l6", domain: "shop", quadrant: "eliminate", title: "Air compressor", next: "Finish motor/capacitor diagnosis", status: "waiting", due: "", focus: false },
  { id: "l7", domain: "money", quadrant: "doFirst", title: "90-day spending freeze", next: "Freeze ends ~July 5 — decide what rule replaces it BEFORE it lapses", status: "active", due: "2026-07-05", focus: true },
  { id: "l8", domain: "money", quadrant: "schedule", title: "Vehicle liquidation (~$30k)", next: "List / follow up: Duramax, trailer, Jeep", status: "active", due: "", focus: false },
  { id: "l9", domain: "money", quadrant: "schedule", title: "Debt paydown", next: "Confirm this month's payment hit the highest-APR balance", status: "active", due: "", focus: false },
  { id: "l10", domain: "property", quadrant: "delegate", title: "Tiny house 500ft electrical run", next: "Trench + pull 4-4-4 triplex to the 70A panel", status: "active", due: "", focus: false },
  { id: "l11", domain: "property", quadrant: "delegate", title: "Tenant billing (Iris & Irving)", next: "Read meters, send monthly electric bill at $0.51/kWh", status: "active", due: "", focus: false },
  { id: "l12", domain: "self", quadrant: "schedule", title: "Ecstatic dance", next: "Pick a date and go — first time since meeting Melody", status: "active", due: "", focus: false },
  { id: "l13", domain: "self", quadrant: "eliminate", title: "Alto sax", next: "Play once this week, even 15 minutes", status: "waiting", due: "", focus: false },
];

const SEED_RULES = [
  { id: "r1", rule: "Spending freeze through July 5", why: "Cash discipline while consolidating debt. Decide the successor rule before it ends — don't let it just dissolve.", status: "active" },
  { id: "r2", rule: "Equipment buys wait 24 hours + written business case", why: "The impulse-purchase pattern is real. A day of distance turns a good deal into a good decision.", status: "active" },
  { id: "r3", rule: "Extra cash goes to highest-APR debt first", why: "Robinhood proceeds already deployed this way. Keep the order of operations.", status: "active" },
];

const SEED_NUMBERS = [
  { id: "n1", label: "InStone balance outstanding", value: "54964", unit: "$", target: "0" },
  { id: "n2", label: "Vehicle sale proceeds", value: "0", unit: "$", target: "30000" },
  { id: "n3", label: "Cash position", value: "", unit: "$", target: "" },
  { id: "n4", label: "Total AR outstanding", value: "", unit: "$", target: "" },
];

const SEED_MORNING_HABITS = [
  { id: "m1", label: "Meditate" },
  { id: "m2", label: "Eat supplements" },
  { id: "m3", label: "Hydrate" },
  { id: "m4", label: "Check financials (business + personal)" },
  { id: "m5", label: "Work out" },
  { id: "m6", label: "Make bed" },
  { id: "m7", label: "Shower" },
  { id: "m8", label: "Delegate something" },
];

const SEED_NIGHT_HABITS = [
  { id: "n1h", label: "Vacuum" },
  { id: "n2h", label: "Dishes" },
  { id: "n3h", label: "Put away clothes" },
  { id: "n4h", label: "Read (instead of screens)" },
  { id: "n5h", label: "Electronics off by set time" },
  { id: "n6h", label: "Hydrate" },
];

/* ---------------- Helpers ---------------- */

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmtNum = (v) => {
  const n = Number(v);
  return isNaN(n) || v === "" ? "—" : n.toLocaleString("en-US");
};
const daysUntil = (d) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d + "T12:00:00") - new Date()) / 86400000);
  return diff;
};

// Rituals "day" rolls over at 1:00 AM instead of midnight, so anything done
// late at night before 1am still counts toward the day that's ending, and a
// fresh day (fresh slides, fresh streak check) starts at 1am, not 12am.
function ritualDayKey(d = new Date()) {
  const shifted = new Date(d);
  shifted.setHours(shifted.getHours() - 1); // shift back 1hr so 1:00am becomes the new "midnight"
  return shifted.toISOString().slice(0, 10);
}

async function loadWorkItems() {
  try {
    const res = await window.storage.get(WORK_STORAGE_KEY);
    const parsed = JSON.parse(res.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function pushToDelegateBoard(text, person, sourceLoopTitle) {
  try {
    let list = [];
    try {
      const res = await window.storage.get(DELEGATE_STORAGE_KEY);
      const parsed = JSON.parse(res.value);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = []; // no delegate data yet — start fresh
    }
    list.push({
      id: crypto.randomUUID ? crypto.randomUUID() : uid(),
      person,
      text: text || sourceLoopTitle,
      freq: "once",
      priority: "medium",
      minutes: null,
      tools: "",
      done: false,
      completedAt: null,
      createdAt: Date.now(),
    });
    await window.storage.set(DELEGATE_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

const inputStyle = {
  border: `1px solid ${C.kraftDark}`,
  background: "#fff",
  color: C.ink,
  borderRadius: 3,
  padding: "6px 8px",
  fontSize: 13,
  width: "100%",
  outline: "none",
};

const Btn = ({ children, onClick, kind = "ghost", title, disabled }) => {
  const styles = {
    primary: { background: C.redwood, color: "#fff", border: `1px solid ${C.redwoodDark}` },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.kraftDark}` },
    dark: { background: C.ink, color: "#fff", border: `1px solid ${C.ink}` },
    moss: { background: C.moss, color: "#fff", border: `1px solid ${C.moss}` },
    gold: { background: C.gold, color: "#fff", border: `1px solid ${C.gold}` },
  }[kind];
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-opacity hover:opacity-85 disabled:opacity-40"
      style={{ ...styles, fontFamily: MONO, fontSize: 12, letterSpacing: "0.03em" }}
    >
      {children}
    </button>
  );
};

const STATUS_CYCLE = { active: "waiting", waiting: "done", done: "active" };
const StatusIcon = ({ status }) => {
  if (status === "done") return <Check size={14} style={{ color: C.moss }} />;
  if (status === "waiting") return <Clock size={14} style={{ color: C.gold }} />;
  return <CircleDot size={14} style={{ color: C.redwood }} />;
};

/* ---------------- Delegate-person picker modal ---------------- */

function DelegatePickerModal({ loop, onConfirm, onCancel }) {
  const [person, setPerson] = useState(DELEGATE_PEOPLE[0]);
  const [text, setText] = useState(loop.next || loop.title);

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(34,29,25,0.55)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.paper, border: `1px solid ${C.kraftDark}`, borderRadius: 4, maxWidth: 480, width: "100%", padding: 24 }}
      >
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>Send to Delegate board</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.faint, marginBottom: 16 }}>
          This creates a real card on the Delegate board. It won't remove the loop from here.
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>TASK TEXT</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>WHO</label>
          <select style={inputStyle} value={person} onChange={(e) => setPerson(e.target.value)}>
            {DELEGATE_PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn kind="gold" onClick={() => onConfirm(person, text)}><Users size={13} /> Send to {person}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Loop card ---------------- */

function LoopCard({ loop, accent, onChange, onDelete, onRequestDelegate, onMove, isFirst, isLast }) {
  const [editing, setEditing] = useState(false);
  const dleft = daysUntil(loop.due);
  const overdue = dleft !== null && dleft < 0 && loop.status !== "done";
  const soon = dleft !== null && dleft >= 0 && dleft <= 7 && loop.status !== "done";
  const domain = DOMAINS.find((d) => d.id === loop.domain);

  return (
    <div
      className="rounded-sm p-3 mb-2"
      style={{
        background: loop.status === "done" ? C.paper : C.panel,
        border: `1px solid ${C.kraftDark}`,
        borderLeft: `4px solid ${loop.status === "done" ? C.kraftDark : accent}`,
        opacity: loop.status === "done" ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1 flex-1 min-w-0">
          <div className="flex flex-col shrink-0 mt-0.5">
            <button onClick={() => onMove(-1)} disabled={isFirst} className="disabled:opacity-20" style={{ lineHeight: 1, fontSize: 10 }}>▲</button>
            <button onClick={() => onMove(1)} disabled={isLast} className="disabled:opacity-20" style={{ lineHeight: 1, fontSize: 10 }}>▼</button>
          </div>
          <button
            onClick={() => onChange({ ...loop, status: STATUS_CYCLE[loop.status] })}
            className="flex items-center gap-2 text-left flex-1 min-w-0"
            title="Tap to cycle: active → waiting → done"
          >
            <StatusIcon status={loop.status} />
            <span style={{ fontWeight: 700, fontSize: 13, textDecoration: loop.status === "done" ? "line-through" : "none" }}>
              {loop.title}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {loop.quadrant === "delegate" && (
            <button onClick={() => onRequestDelegate(loop)} title="Send to Delegate board" style={{ color: C.gold }}>
              <Users size={13} />
            </button>
          )}
          <button onClick={() => onChange({ ...loop, focus: !loop.focus })} title="Star this loop">
            <Star size={14} fill={loop.focus ? C.gold : "none"} style={{ color: loop.focus ? C.gold : C.kraftDark }} />
          </button>
          <button onClick={() => setEditing(!editing)} className="opacity-40 hover:opacity-100"><Pencil size={13} /></button>
          <button onClick={onDelete} className="opacity-40 hover:opacity-100"><Trash2 size={13} /></button>
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2 pl-5">
          <input style={inputStyle} value={loop.title} onChange={(e) => onChange({ ...loop, title: e.target.value })} placeholder="Loop title" />
          <input style={inputStyle} value={loop.next} onChange={(e) => onChange({ ...loop, next: e.target.value })} placeholder="Next physical action" />
          <div className="flex gap-2 flex-wrap">
            <input type="date" style={{ ...inputStyle, width: 150 }} value={loop.due || ""} onChange={(e) => onChange({ ...loop, due: e.target.value })} />
            <select style={{ ...inputStyle, width: 170 }} value={loop.domain} onChange={(e) => onChange({ ...loop, domain: e.target.value })}>
              {DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <select style={{ ...inputStyle, width: 170 }} value={loop.quadrant} onChange={(e) => onChange({ ...loop, quadrant: e.target.value })}>
              {QUADRANTS.map((q) => <option key={q.id} value={q.id}>{q.q} — {q.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontFamily: MONO, fontSize: 9, color: C.faint, letterSpacing: "0.06em" }}>OPP COST (of not doing it)</label>
              <input style={inputStyle} value={loop.oppCost || ""} onChange={(e) => onChange({ ...loop, oppCost: e.target.value })} placeholder="e.g. $54k stays locked up" />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontFamily: MONO, fontSize: 9, color: C.faint, letterSpacing: "0.06em" }}>OPP VALUE (of doing it)</label>
              <input style={inputStyle} value={loop.oppValue || ""} onChange={(e) => onChange({ ...loop, oppValue: e.target.value })} placeholder="e.g. unlocks next order" />
            </div>
          </div>
          <Btn kind="moss" onClick={() => setEditing(false)}><Check size={12} /> Done</Btn>
        </div>
      ) : (
        <div className="mt-1.5 pl-5">
          <div style={{ fontSize: 12, color: C.inkSoft }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: C.faint, letterSpacing: "0.1em" }}>NEXT </span>
            {loop.next || <span style={{ color: C.warn }}>no next action — that's how loops die</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {domain && (
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.faint, border: `1px solid ${C.kraftDark}`, borderRadius: 2, padding: "1px 5px" }}>
                {domain.label}
              </span>
            )}
            {loop.due && (
              <span style={{ fontFamily: MONO, fontSize: 10, color: overdue ? C.redwood : soon ? C.warn : C.faint, fontWeight: overdue || soon ? 700 : 400 }}>
                {overdue ? `⚑ ${Math.abs(dleft)}d OVERDUE` : dleft === 0 ? "⚑ DUE TODAY" : `due ${loop.due} · ${dleft}d`}
              </span>
            )}
          </div>
          {(loop.oppCost || loop.oppValue) && (
            <div className="mt-1.5 pt-1.5" style={{ borderTop: `1px dashed ${C.kraftDark}` }}>
              {loop.oppCost && (
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.redwood, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700 }}>OPP COST</span> {loop.oppCost}
                </div>
              )}
              {loop.oppValue && (
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.moss, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700 }}>OPP VALUE</span> {loop.oppValue}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Board tab — Covey matrix ---------------- */


function BoardTab({ loops, onChange }) {
  const [showDone, setShowDone] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState(null);
  const [toast, setToast] = useState("");

  const updateLoop = (l) => onChange(loops.map((x) => (x.id === l.id ? l : x)));
  const deleteLoop = (id) => onChange(loops.filter((x) => x.id !== id));
  const addLoop = (quadrant) =>
    onChange([{ id: uid(), domain: "self", quadrant, title: "New loop", next: "", status: "active", due: "", focus: false, oppCost: "", oppValue: "" }, ...loops]);

  // reorder within a quadrant: swaps the loop with its neighbor within the
  // same quadrant, leaving loops in other quadrants untouched.
  const moveLoopInQuadrant = (quadrantId, loopId, dir) => {
    const idxs = loops.map((l, i) => (l.quadrant === quadrantId ? i : -1)).filter((i) => i !== -1);
    const posInGroup = idxs.findIndex((i) => loops[i].id === loopId);
    const targetPos = posInGroup + dir;
    if (targetPos < 0 || targetPos >= idxs.length) return;
    const fromIdx = idxs[posInGroup];
    const toIdx = idxs[targetPos];
    const next = [...loops];
    [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
    onChange(next);
  };

  const confirmDelegate = async (person, text) => {
    const ok = await pushToDelegateBoard(text, person, delegateTarget.title);
    if (ok) {
      setToast(`Sent to ${person} on the Delegate board.`);
      setTimeout(() => setToast(""), 2500);
    }
    setDelegateTarget(null);
  };

  return (
    <div>
      {toast && (
        <div className="rounded-sm p-2 mb-3 text-center" style={{ background: C.moss, color: "#fff", fontFamily: MONO, fontSize: 12 }}>
          {toast}
        </div>
      )}

      {/* Covey matrix */}
      <div className="grid gap-4 md:grid-cols-2">
        {QUADRANTS.map((q) => {
          const items = loops.filter((l) => l.quadrant === q.id && (showDone || l.status !== "done"));
          const openCount = loops.filter((l) => l.quadrant === q.id && l.status !== "done").length;
          return (
            <div key={q.id} className="rounded-sm p-3" style={{ background: C.panel, border: `1px solid ${C.kraftDark}`, borderTop: `4px solid ${q.accent}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 16 }}>{q.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.02em" }}>
                      {q.q} — {q.label}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: C.faint, letterSpacing: "0.06em" }}>{q.sub.toUpperCase()} · {openCount} open</div>
                  </div>
                </div>
                <button onClick={() => addLoop(q.id)} title="Add loop" className="opacity-50 hover:opacity-100"><Plus size={15} /></button>
              </div>
              {items.length === 0 && (
                <div className="rounded-sm p-3 text-center" style={{ border: `1px dashed ${C.kraftDark}`, color: C.faint, fontSize: 12 }}>
                  Clear. Nothing here.
                </div>
              )}
              {items.map((l, i) => (
                <LoopCard
                  key={l.id}
                  loop={l}
                  accent={q.accent}
                  onChange={updateLoop}
                  onDelete={() => deleteLoop(l.id)}
                  onRequestDelegate={setDelegateTarget}
                  onMove={(dir) => moveLoopInQuadrant(q.id, l.id, dir)}
                  isFirst={i === 0}
                  isLast={i === items.length - 1}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <label className="inline-flex items-center gap-2 text-xs" style={{ fontFamily: MONO, color: C.faint }}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Show completed loops
        </label>
      </div>

      {delegateTarget && (
        <DelegatePickerModal loop={delegateTarget} onConfirm={confirmDelegate} onCancel={() => setDelegateTarget(null)} />
      )}
    </div>
  );
}

/* ---------------- Money rules tab ---------------- */

/* ---------------- Financials reader (read-only, one-way) ---------------- */

const FINANCIALS_STORAGE_KEY = "eroOS.debtPayoff.v2";

// Recomputes the same net worth / total debt / cash figures Financials shows
// on its own dashboard, straight from its raw saved state. Read-only — never
// writes back to Financials. If Financials hasn't saved yet, returns null.
async function loadFinancialsSnapshot() {
  try {
    const res = await window.storage.get(FINANCIALS_STORAGE_KEY);
    const d = JSON.parse(res.value);
    const debts = d.debts || [];
    const assets = d.assets || [];
    const totalDebt = debts.reduce((s, x) => s + (x.balance || 0), 0);
    const totalOwed = assets.reduce((s, x) => s + (x.owed || 0), 0);
    const totalAssets = assets.reduce((s, x) => s + (x.value || 0), 0);
    const netWorth = totalAssets - totalOwed - totalDebt;
    // "cash position" = best-guess checking/savings-like asset by name match
    const cashAsset = assets.find((a) => /checking|savings|cash/i.test(a.name || ""));
    const cashPosition = cashAsset ? (cashAsset.value || 0) : null;
    return {
      netWorth, totalDebt: totalDebt + totalOwed, totalAssets, cashPosition,
      savedAt: d.__savedAt || null,
    };
  } catch {
    return null;
  }
}

const FINANCIALS_FIELD_MATCHERS = [
  { test: /net worth/i, key: "netWorth", format: (s) => s.netWorth },
  { test: /total debt|debt outstanding|payoff debt/i, key: "totalDebt", format: (s) => s.totalDebt },
  { test: /total assets/i, key: "totalAssets", format: (s) => s.totalAssets },
  { test: /cash position|cash on hand|checking/i, key: "cashPosition", format: (s) => s.cashPosition },
];

function matchFinancialsField(label) {
  const m = FINANCIALS_FIELD_MATCHERS.find((f) => f.test.test(label || ""));
  return m || null;
}

/* ---------------- Numbers tab ---------------- */

function NumbersTab({ numbers, onChange }) {
  const update = (id, patch) => onChange(numbers.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const remove = (id) => onChange(numbers.filter((n) => n.id !== id));
  const add = () => onChange([...numbers, { id: uid(), label: "New number", value: "", unit: "$", target: "" }]);

  const [financials, setFinancials] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadFinancialsSnapshot().then((snap) => { if (!cancelled) setFinancials(snap); });
    return () => { cancelled = true; };
  }, []);
  const lastUpdatedLabel = financials?.savedAt
    ? new Date(financials.savedAt).toLocaleString()
    : financials
      ? "unknown save time"
      : "no Financials data saved yet";

  return (
    <div>
      <p className="mb-2 text-sm max-w-2xl" style={{ color: C.inkSoft }}>
        The few numbers that tell you the truth. Cards matching a Financials figure (net worth, total debt, total assets, cash position) auto-fill and stay read-only. Everything else you still update by hand.
      </p>
      <div className="mb-4 flex items-center gap-2" style={{ fontFamily: MONO, fontSize: 10, color: C.faint }}>
        <RefreshCw size={11} />
        Financials last saved: {lastUpdatedLabel}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {numbers.map((n) => {
          const match = financials ? matchFinancialsField(n.label) : null;
          const linkedValue = match ? match.format(financials) : null;
          const isLinked = match && linkedValue !== null && linkedValue !== undefined;
          const displayValue = isLinked ? linkedValue : n.value;
          const v = Number(displayValue), t = Number(n.target);
          const hasTarget = n.target !== "" && !isNaN(t);
          return (
            <div key={n.id} className="rounded-sm p-4" style={{ background: C.panel, border: `1px solid ${isLinked ? C.moss : C.kraftDark}` }}>
              <div className="flex justify-between items-start">
                <input
                  style={{ ...inputStyle, border: "none", padding: 0, background: "transparent", fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.08em", textTransform: "uppercase" }}
                  value={n.label} onChange={(e) => update(n.id, { label: e.target.value })}
                />
                <button onClick={() => remove(n.id)} className="opacity-30 hover:opacity-100 shrink-0"><Trash2 size={13} /></button>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span style={{ fontFamily: MONO, fontSize: 14, color: C.faint }}>{n.unit}</span>
                {isLinked ? (
                  <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 26 }}>{fmtNum(Math.round(linkedValue))}</span>
                ) : (
                  <input
                    type="number"
                    style={{ ...inputStyle, border: "none", padding: 0, background: "transparent", fontFamily: MONO, fontWeight: 800, fontSize: 26 }}
                    value={n.value} onChange={(e) => update(n.id, { value: e.target.value })}
                    placeholder="—"
                  />
                )}
              </div>
              {isLinked && (
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.moss, marginTop: 2 }}>
                  ● from Financials
                </div>
              )}
              <div className="flex items-center gap-1 mt-1" style={{ fontFamily: MONO, fontSize: 10, color: C.faint }}>
                target {n.unit}
                <input
                  type="number"
                  style={{ ...inputStyle, border: "none", padding: 0, background: "transparent", fontFamily: MONO, fontSize: 10, color: C.faint, width: 80 }}
                  value={n.target} onChange={(e) => update(n.id, { target: e.target.value })}
                  placeholder="none"
                />
              </div>
              {hasTarget && !isNaN(v) && displayValue !== "" && displayValue !== null && (
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: C.kraft }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(2, t === 0 ? (v === 0 ? 100 : Math.max(2, 100 - (v / (v + 1)) * 100)) : (v / t) * 100))}%`,
                    background: C.moss,
                  }} />
                </div>
              )}
            </div>
          );
        })}
        <button onClick={add} className="rounded-sm p-4 flex items-center justify-center gap-2 min-h-24 hover:opacity-70" style={{ border: `2px dashed ${C.kraftDark}`, color: C.faint, fontFamily: MONO, fontSize: 12 }}>
          <Plus size={15} /> Add number
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   RITUALS TAB — morning / night habit checklists
   ============================================================ */

/* ============================================================
   RITUALS TAB — morning / night, one slide per habit, reorderable
   ============================================================ */

/* ---------------- Confetti burst ---------------- */

const CONFETTI_COLORS = [C.redwood, C.gold, C.moss, C.mossLight, "#E8A87C", "#6E4A7E"];

function ConfettiBurst({ burstKey }) {
  const pieces = useMemo(() => {
    if (!burstKey) return [];
    return Array.from({ length: 26 }, (_, i) => {
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const dist = 60 + Math.random() * 90;
      return {
        id: i,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 40, // bias upward, like a pop
        rot: Math.random() * 720 - 360,
        delay: Math.random() * 80,
        size: 5 + Math.random() * 5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        shape: Math.random() > 0.5 ? "50%" : "2px",
      };
    });
  }, [burstKey]);

  if (!burstKey || pieces.length === 0) return null;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 30 }}>
      <style>{`
        @keyframes confettiPop {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: var(--confetti-end); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id + "-" + burstKey}
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
            background: p.color,
            "--confetti-end": `translate(${p.tx}px, ${p.ty}px) rotate(${p.rot}deg)`,
            animation: `confettiPop 900ms cubic-bezier(0.2,0.8,0.3,1) ${p.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  );
}

function FireworksCelebration() {
  const bursts = useMemo(() => {
    return Array.from({ length: 3 }, (_, b) => ({
      id: b,
      left: 20 + Math.random() * 60,
      top: 10 + Math.random() * 30,
      delay: b * 220,
      color: CONFETTI_COLORS[b % CONFETTI_COLORS.length],
      particles: Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * 360 * (Math.PI / 180);
        const dist = 40 + Math.random() * 30;
        return { id: i, tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist };
      }),
    }));
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 30 }}>
      <style>{`
        @keyframes fireworkPop {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: var(--fw-end) scale(0.6); opacity: 0; }
        }
      `}</style>
      {bursts.map((b) => (
        <div key={b.id} style={{ position: "absolute", left: `${b.left}%`, top: `${b.top}%` }}>
          {b.particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: b.color,
                "--fw-end": `translate(${p.tx}px, ${p.ty}px)`,
                animation: `fireworkPop 700ms ease-out ${b.delay}ms forwards`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function RitualSlideshow({ habits, onChangeHabits, log, onToggleToday, accent, icon: Icon, label, workPeekItems }) {
  const todayKey = ritualDayKey();
  const todaysDone = log[todayKey] || {};
  const [mode, setMode] = useState("intro"); // "intro" | "slides" | "manage" | "done"
  const [idx, setIdx] = useState(0);
  const [burst, setBurst] = useState(0);

  const doneCount = habits.filter((h) => todaysDone[h.id]).length;
  const pct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;

  // streak: consecutive ritual-days (1am rollover, including today if fully
  // done, else up to yesterday) with 100% completion
  const streak = useMemo(() => {
    let s = 0;
    let d = new Date();
    const todaysComplete = habits.length > 0 && habits.every((h) => todaysDone[h.id]);
    if (!todaysComplete) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 400; i++) {
      const key = ritualDayKey(d);
      const dayLog = log[key];
      const complete = dayLog && habits.length > 0 && habits.every((h) => dayLog[h.id]);
      if (!complete) break;
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [log, habits, todaysDone]);

  const startSlides = () => { setIdx(0); setMode("slides"); };

  const goNext = () => {
    if (idx >= habits.length - 1) { setMode("done"); return; }
    setIdx(idx + 1);
  };
  const goBack = () => {
    if (idx === 0) { setMode("intro"); return; }
    setIdx(idx - 1);
  };

  const toggleCurrent = () => {
    const h = habits[idx];
    if (!h) return;
    const wasChecked = !!todaysDone[h.id];
    onToggleToday(h.id);
    if (!wasChecked) {
      // completing (not undoing): celebrate, then auto-advance once the
      // confetti has had a moment to play
      setBurst((b) => b + 1);
      setTimeout(() => {
        setIdx((current) => {
          if (current >= habits.length - 1) { setMode("done"); return current; }
          return current + 1;
        });
      }, 650);
    }
  };

  // reorder
  const moveHabit = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= habits.length) return;
    const next = [...habits];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    onChangeHabits(next);
  };
  const removeHabit = (id) => onChangeHabits(habits.filter((h) => h.id !== id));
  const renameHabit = (id, text) => onChangeHabits(habits.map((h) => (h.id === id ? { ...h, label: text } : h)));
  const [draft, setDraft] = useState("");
  const addHabit = () => {
    const v = draft.trim();
    if (!v) return;
    onChangeHabits([...habits, { id: uid(), label: v }]);
    setDraft("");
  };

  const shell = (children) => (
    <div className="rounded-sm" style={{ background: C.panel, border: `1px solid ${C.kraftDark}`, borderTop: `4px solid ${accent}`, overflow: "hidden" }}>
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: accent }} />
          <span style={{ fontWeight: 900, fontSize: 15 }}>{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: streak > 0 ? accent : C.faint }}>
            <Flame size={14} /> {streak}
          </div>
          <button onClick={() => setMode(mode === "manage" ? "intro" : "manage")} title="Reorder / edit habits" className="opacity-50 hover:opacity-100">
            <Pencil size={13} />
          </button>
        </div>
      </div>
      <div className="h-1.5 mx-4 mt-2 rounded-full overflow-hidden" style={{ background: C.kraft }}>
        <div style={{ height: "100%", width: `${pct}%`, background: accent }} />
      </div>
      {children}
    </div>
  );

  if (habits.length === 0) {
    return shell(
      <div className="p-4">
        <div style={{ fontSize: 12, color: C.faint, marginBottom: 8 }}>No habits yet — add some below.</div>
        <div className="flex items-center gap-2">
          <input
            style={{ ...inputStyle, fontSize: 13 }}
            value={draft}
            placeholder="New habit"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addHabit(); }}
          />
          <Btn kind="moss" onClick={addHabit}>Add</Btn>
        </div>
      </div>
    );
  }

  if (mode === "manage") {
    return shell(
      <div className="p-4">
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.06em", marginBottom: 10 }}>
          REORDER, RENAME, OR REMOVE — THIS SETS THE SLIDE ORDER
        </div>
        {habits.map((h, i) => (
          <div key={h.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: `1px dashed ${C.kraftDark}` }}>
            <div className="flex flex-col shrink-0">
              <button onClick={() => moveHabit(i, -1)} disabled={i === 0} className="disabled:opacity-20" style={{ lineHeight: 1, fontSize: 11 }}>▲</button>
              <button onClick={() => moveHabit(i, 1)} disabled={i === habits.length - 1} className="disabled:opacity-20" style={{ lineHeight: 1, fontSize: 11 }}>▼</button>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint, width: 16, textAlign: "right" }}>{i + 1}</span>
            <input
              style={{ ...inputStyle, fontSize: 13, padding: "4px 6px" }}
              value={h.label}
              onChange={(e) => renameHabit(h.id, e.target.value)}
            />
            <button onClick={() => removeHabit(h.id)} className="opacity-30 hover:opacity-100 shrink-0"><Trash2 size={12} /></button>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3">
          <input
            style={{ ...inputStyle, fontSize: 13 }}
            value={draft}
            placeholder="New habit"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addHabit(); }}
          />
          <Btn kind="moss" onClick={addHabit}><Plus size={12} /> Add</Btn>
        </div>
        <div className="mt-3">
          <Btn onClick={() => setMode("intro")}>Done editing</Btn>
        </div>
      </div>
    );
  }

  if (mode === "intro") {
    return shell(
      <div className="p-4">
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>
          {doneCount}/{habits.length} done today. {habits.length} slide{habits.length === 1 ? "" : "s"} — one habit at a time.
        </div>
        <Btn kind={accent === C.gold ? "gold" : "dark"} onClick={startSlides}>
          {doneCount > 0 ? "Continue" : "Start"} {label.toLowerCase()} walkthrough
        </Btn>
        {workPeekItems && workPeekItems.length > 0 && (
          <div className="mt-4 pt-3" style={{ borderTop: `1px dashed ${C.kraftDark}` }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.06em", marginBottom: 6 }}>
              ALSO TODAY ON WORK (read-only here)
            </div>
            {workPeekItems.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1" style={{ fontSize: 12 }}>
                <CircleDot size={10} style={{ color: C.redwood, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === "done") {
    const allDone = doneCount === habits.length;
    return shell(
      <div className="p-8 text-center" style={{ position: "relative", overflow: "visible" }}>
        {allDone && <FireworksCelebration />}
        <Check size={28} style={{ color: accent, margin: "0 auto 8px" }} />
        <div style={{ fontWeight: 900, fontSize: 16 }}>
          {doneCount}/{habits.length} done
        </div>
        <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>
          {allDone ? "All the way through. Streak's alive." : "That's the walkthrough — anything you skipped is still waiting for you above."}
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Btn onClick={() => { setIdx(0); setMode("slides"); }}>Go through again</Btn>
          <Btn kind="ghost" onClick={() => setMode("intro")}>Close</Btn>
        </div>
      </div>
    );
  }

  // mode === "slides"
  const h = habits[idx];
  const checked = !!todaysDone[h.id];

  return shell(
    <div>
      <div className="flex items-center justify-center gap-1.5 px-4 pt-3">
        {habits.map((hh, i) => (
          <div
            key={hh.id}
            style={{
              width: 8, height: 8, borderRadius: 999,
              background: i === idx ? accent : (todaysDone[hh.id] ? C.mossLight : C.kraft),
              border: i === idx ? `1px solid ${accent}` : "none",
            }}
          />
        ))}
      </div>
      <div className="px-6 py-10 text-center">
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.1em", marginBottom: 10 }}>
          {idx + 1} OF {habits.length}
        </div>
        <div style={{ fontWeight: 900, fontSize: 24, lineHeight: 1.3, marginBottom: 24 }}>{h.label}</div>
        <div style={{ position: "relative", display: "inline-block" }}>
          <ConfettiBurst burstKey={burst} />
          <button
            onClick={toggleCurrent}
            className="mx-auto flex items-center justify-center"
            style={{
              width: 64, height: 64, borderRadius: "50%",
              border: `2px solid ${checked ? accent : C.kraftDark}`,
              background: checked ? accent : "transparent",
            }}
          >
            {checked && <Check size={30} color="#fff" />}
          </button>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, marginTop: 8 }}>
          {checked ? "done — tap to undo" : "tap when done"}
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pb-4">
        <Btn onClick={goBack}><ChevronLeft size={13} /> Back</Btn>
        <Btn kind={accent === C.gold ? "gold" : "dark"} onClick={goNext}>
          {idx >= habits.length - 1 ? "Finish" : "Next"} <ChevronRight size={13} />
        </Btn>
      </div>
    </div>
  );
}

function RitualsTab({ morningHabits, setMorningHabits, nightHabits, setNightHabits, morningLog, setMorningLog, nightLog, setNightLog }) {
  const todayKey = ritualDayKey();

  const toggleMorning = (id) => {
    setMorningLog({
      ...morningLog,
      [todayKey]: { ...(morningLog[todayKey] || {}), [id]: !(morningLog[todayKey] || {})[id] },
    });
  };
  const toggleNight = (id) => {
    setNightLog({
      ...nightLog,
      [todayKey]: { ...(nightLog[todayKey] || {}), [id]: !(nightLog[todayKey] || {})[id] },
    });
  };

  const [workToday, setWorkToday] = useState([]);
  useEffect(() => {
    let cancelled = false;
    loadWorkItems().then((all) => {
      if (!cancelled) setWorkToday(all.filter((t) => t.section === "today" && !t.done));
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <p className="mb-4 text-sm max-w-2xl" style={{ color: C.inkSoft }}>
        One habit per slide, morning and night. Tap the pencil on either card to reorder, rename, add, or remove habits — that order becomes the slide order.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <RitualSlideshow
          habits={morningHabits}
          onChangeHabits={setMorningHabits}
          log={morningLog}
          onToggleToday={toggleMorning}
          accent={C.gold}
          icon={Sunrise}
          label="Morning"
          workPeekItems={workToday}
        />
        <RitualSlideshow
          habits={nightHabits}
          onChangeHabits={setNightHabits}
          log={nightLog}
          onToggleToday={toggleNight}
          accent={C.inkSoft}
          icon={Moon}
          label="Night"
          workPeekItems={workToday}
        />
      </div>
    </div>
  );
}


/* ---------------- Weekly review (Sunday Ten) ---------------- */

const REVIEW_STEPS = [
  {
    key: "loops",
    title: "Sweep the board",
    prompt: "Walk every open loop. Mark what's done. Anything with no next action gets one now or gets deleted — a loop without a next action is just anxiety with a title.",
  },
  {
    key: "rules",
    title: "Face the rules",
    prompt: "Read each money rule out loud. Did you keep it this week? Mark broken ones honestly. Broken is data, hidden is debt.",
  },
  {
    key: "numbers",
    title: "Update the numbers",
    prompt: "Fresh values for cash, AR, InStone balance, vehicle proceeds. Two minutes. Stale numbers lie to you.",
  },
  {
    key: "three",
    title: "Pick the three",
    prompt: "Unstar last week. Star the three loops that, if they move, make this week a win. Three. Not seven.",
  },
  {
    key: "self",
    title: "Check the body",
    prompt: "Dance, sax, land work, Melody. Did you touch what makes you feel alive, or only what makes you feel productive? One honest line below.",
  },
];

function ReviewTab({ reviews, onLog, goTab }) {
  const [step, setStep] = useState(-1); // -1 = not started
  const [reflection, setReflection] = useState("");
  const [rulesKept, setRulesKept] = useState(null);

  const lastReview = reviews[0];
  const daysSince = lastReview ? Math.floor((new Date() - new Date(lastReview.date + "T12:00:00")) / 86400000) : null;

  const streak = useMemo(() => {
    if (reviews.length === 0) return 0;
    let s = 1;
    for (let i = 0; i < reviews.length - 1; i++) {
      const gap = (new Date(reviews[i].date) - new Date(reviews[i + 1].date)) / 86400000;
      if (gap <= 9) s++; else break;
    }
    const sinceLast = (new Date() - new Date(reviews[0].date + "T12:00:00")) / 86400000;
    return sinceLast > 9 ? 0 : s;
  }, [reviews]);

  const finish = () => {
    onLog({ id: uid(), date: today(), reflection, rulesKept });
    setStep(-1); setReflection(""); setRulesKept(null);
  };

  if (step === -1) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-sm p-6" style={{ background: C.ink, color: "#fff" }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "0.02em" }}>The Sunday Ten</div>
              <div className="mt-1 text-sm" style={{ color: C.kraftDark }}>
                Ten minutes, five steps. The weekly deep review — separate from the daily Rituals tab.
              </div>
            </div>
            <div className="text-center shrink-0 ml-4">
              <div className="flex items-center gap-1 justify-center" style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: streak > 0 ? "#E8A87C" : C.kraftDark }}>
                <Flame size={22} /> {streak}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.kraftDark, letterSpacing: "0.1em" }}>WEEK STREAK</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Btn kind="primary" onClick={() => setStep(0)}><RefreshCw size={13} /> Start review</Btn>
            {lastReview ? (
              <span style={{ fontFamily: MONO, fontSize: 11, color: daysSince > 9 ? "#E8A87C" : C.kraftDark }}>
                last: {lastReview.date} ({daysSince}d ago{daysSince > 9 ? " — overdue" : ""})
              </span>
            ) : (
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.kraftDark }}>never run — start the streak</span>
            )}
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="mt-5">
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.12em", marginBottom: 8 }}>REVIEW LOG</div>
            {reviews.map((r) => (
              <div key={r.id} className="rounded-sm p-3 mb-2" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
                <div className="flex justify-between items-center">
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12 }}>{r.date}</span>
                  {r.rulesKept !== null && (
                    <span style={{ fontFamily: MONO, fontSize: 10, color: r.rulesKept ? C.moss : C.redwood, fontWeight: 700 }}>
                      rules {r.rulesKept ? "KEPT" : "SLIPPED"}
                    </span>
                  )}
                </div>
                {r.reflection && <div className="mt-1 text-sm italic" style={{ color: C.inkSoft }}>"{r.reflection}"</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const s = REVIEW_STEPS[step];
  const isLast = step === REVIEW_STEPS.length - 1;
  const jump = { loops: "board", numbers: "numbers", three: "board" }[s.key];

  return (
    <div className="max-w-2xl">
      <div className="flex gap-1 mb-4">
        {REVIEW_STEPS.map((x, i) => (
          <div key={x.key} className="flex-1 h-1.5 rounded-full" style={{ background: i <= step ? C.redwood : C.kraft }} />
        ))}
      </div>
      <div className="rounded-sm p-6" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.12em" }}>STEP {step + 1} OF {REVIEW_STEPS.length}</div>
        <div className="mt-1" style={{ fontWeight: 900, fontSize: 22 }}>{s.title}</div>
        <p className="mt-2 text-sm" style={{ color: C.inkSoft, lineHeight: 1.6 }}>{s.prompt}</p>

        {s.key === "rules" && (
          <div className="mt-4 flex gap-2">
            <Btn kind={rulesKept === true ? "moss" : "ghost"} onClick={() => setRulesKept(true)}><Check size={13} /> Kept them</Btn>
            <Btn kind={rulesKept === false ? "primary" : "ghost"} onClick={() => setRulesKept(false)}><AlertTriangle size={13} /> Slipped</Btn>
          </div>
        )}

        {s.key === "self" && (
          <textarea
            className="mt-4 w-full"
            style={{ ...inputStyle, minHeight: 80, fontSize: 14, resize: "vertical" }}
            value={reflection} onChange={(e) => setReflection(e.target.value)}
            placeholder="One honest line about this week…"
          />
        )}

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-2">
            <Btn onClick={() => (step === 0 ? setStep(-1) : setStep(step - 1))}><ChevronLeft size={13} /> Back</Btn>
            {jump && <Btn onClick={goTab ? () => goTab(jump) : undefined} title="Opens the tab — come back here when done">Open {jump} tab</Btn>}
          </div>
          {isLast ? (
            <Btn kind="moss" onClick={finish}><Check size={13} /> Log review</Btn>
          ) : (
            <Btn kind="primary" onClick={() => setStep(step + 1)}>Next <ChevronRight size={13} /></Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- App root ---------------- */

function EroOSSettingsPanel({ state, onImport, onClose }) {
  const [text, setText] = useState(() => JSON.stringify(state, null, 2));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = STORAGE_KEY + ".json";
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
    if (!window.confirm("This clears all Ero OS data (board, rituals, numbers, reviews) and starts fresh with seed data. Continue?")) return;
    setBusy(true);
    try {
      await window.storage.delete(STORAGE_KEY);
    } catch {
      // ignore — key may not exist
    }
    window.location.reload();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(34,29,25,0.55)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.paper, border: `1px solid ${C.kraftDark}`, borderRadius: 4, maxWidth: 720, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 24 }}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Ero OS — Settings</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.faint, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, marginBottom: 12 }}>
          Storage: window.storage key "{STORAGE_KEY}". Raw JSON of loops, rules, numbers, reviews, and both ritual habit lists/logs. Edit carefully — this is the actual saved data.
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%", minHeight: 360, fontFamily: MONO, fontSize: 11, padding: 10,
            border: `1px solid ${C.kraftDark}`, borderRadius: 3, background: "#fff", color: C.ink, resize: "vertical", boxSizing: "border-box",
          }}
        />
        {error && <div style={{ color: C.redwood, fontFamily: MONO, fontSize: 11, marginTop: 6 }}>{error}</div>}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <Btn onClick={copy} kind={copied ? "moss" : "ghost"}>{copied ? "Copied" : "Copy JSON"}</Btn>
          <Btn onClick={download}>Download .json</Btn>
          <Btn kind="dark" onClick={applyImport}>Apply edited JSON</Btn>
          <button
            onClick={clearAll}
            disabled={busy}
            className="ml-auto"
            style={{ fontFamily: MONO, fontSize: 12, padding: "6px 12px", background: "transparent", color: C.redwood, border: `1px solid ${C.redwood}`, borderRadius: 3, cursor: "pointer" }}
          >
            {busy ? "Clearing…" : "Clear all Ero OS data"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("board");
  const [showSettings, setShowSettings] = useState(false);
  const [loops, setLoops] = useState(SEED_LOOPS);
  const [rules, setRules] = useState(SEED_RULES);
  const [numbers, setNumbers] = useState(SEED_NUMBERS);
  const [reviews, setReviews] = useState([]);
  const [morningHabits, setMorningHabits] = useState(SEED_MORNING_HABITS);
  const [nightHabits, setNightHabits] = useState(SEED_NIGHT_HABITS);
  const [morningLog, setMorningLog] = useState({});
  const [nightLog, setNightLog] = useState({});
  const [now, setNow] = useState(new Date());
  const saveTimer = useRef(null);

  // ticking clock — updates once per second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) {
          const d = JSON.parse(res.value);
          if (d.loops) setLoops(d.loops);
          if (d.rules) setRules(d.rules);
          if (d.numbers) setNumbers(d.numbers);
          if (d.reviews) setReviews(d.reviews);
          if (d.morningHabits) setMorningHabits(d.morningHabits);
          if (d.nightHabits) setNightHabits(d.nightHabits);
          if (d.morningLog) setMorningLog(d.morningLog);
          if (d.nightLog) setNightLog(d.nightLog);
        }
      } catch (e) {
        // First run — seed board stands.
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({
          loops, rules, numbers, reviews, morningHabits, nightHabits, morningLog, nightLog,
        }));
      } catch (e) {
        console.error("Save failed", e);
      }
    }, 600);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [loops, rules, numbers, reviews, morningHabits, nightHabits, morningLog, nightLog, loaded]);

  const importState = (parsed) => {
    if (parsed.loops) setLoops(parsed.loops);
    if (parsed.rules) setRules(parsed.rules);
    if (parsed.numbers) setNumbers(parsed.numbers);
    if (parsed.reviews) setReviews(parsed.reviews);
    if (parsed.morningHabits) setMorningHabits(parsed.morningHabits);
    if (parsed.nightHabits) setNightHabits(parsed.nightHabits);
    if (parsed.morningLog) setMorningLog(parsed.morningLog);
    if (parsed.nightLog) setNightLog(parsed.nightLog);
  };

  const openCount = loops.filter((l) => l.status !== "done").length;
  const brokenRules = rules.filter((r) => r.status === "broken").length;
  const urgentLoops = loops.filter((l) => {
    const d = daysUntil(l.due);
    return l.status !== "done" && d !== null && d <= 7;
  }).length;

  const todayKey = ritualDayKey(now);
  const morningDone = morningHabits.length > 0 && morningHabits.every((h) => (morningLog[todayKey] || {})[h.id]);
  const nightDone = nightHabits.length > 0 && nightHabits.every((h) => (nightLog[todayKey] || {})[h.id]);
  const ritualsBadge = (morningDone ? 0 : 1) + (nightDone ? 0 : 1);

  const tabs = [
    { id: "board", label: "The Board", icon: LayoutGrid, badge: urgentLoops > 0 ? urgentLoops : null },
    { id: "rituals", label: "Rituals", icon: Sunrise, badge: ritualsBadge > 0 ? ritualsBadge : null },
    { id: "numbers", label: "Numbers", icon: Gauge, badge: null },
    { id: "review", label: "Sunday Ten", icon: RefreshCw, badge: null },
  ];

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.paper, fontFamily: MONO, color: C.faint }}>Opening the board…</div>;
  }

  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <header style={{ background: C.ink, color: "#fff" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <span style={{ fontWeight: 900, letterSpacing: "0.08em", fontSize: 16 }}>ERO OS</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.kraftDark, letterSpacing: "0.1em" }}>COMMAND CENTER · MODULE 00</span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.kraftDark, display: "flex", alignItems: "center", gap: 10 }}>
            <span>{openCount} open loops</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
            <button
              onClick={() => setShowSettings(true)}
              title="Settings"
              style={{ background: "transparent", border: `1px solid ${C.kraftDark}`, borderRadius: 3, padding: "3px 8px", cursor: "pointer", fontFamily: MONO, fontSize: 11, color: C.kraftDark }}
            >
              ⚙
            </button>
          </span>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs whitespace-nowrap"
              style={{
                fontFamily: MONO, letterSpacing: "0.05em",
                background: tab === t.id ? C.paper : "transparent",
                color: tab === t.id ? C.ink : C.kraftDark,
                borderRadius: "4px 4px 0 0",
              }}
            >
              <t.icon size={13} /> {t.label}
              {t.badge ? (
                <span className="px-1.5 rounded-full" style={{ background: C.redwood, color: "#fff", fontSize: 9, fontWeight: 800 }}>{t.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        {tab === "board" && <BoardTab loops={loops} onChange={setLoops} />}
        {tab === "rituals" && (
          <RitualsTab
            morningHabits={morningHabits} setMorningHabits={setMorningHabits}
            nightHabits={nightHabits} setNightHabits={setNightHabits}
            morningLog={morningLog} setMorningLog={setMorningLog}
            nightLog={nightLog} setNightLog={setNightLog}
          />
        )}
        {tab === "numbers" && <NumbersTab numbers={numbers} onChange={setNumbers} />}
        {tab === "review" && <ReviewTab reviews={reviews} onLog={(r) => setReviews([r, ...reviews])} goTab={setTab} />}
      </main>

      {showSettings && (
        <EroOSSettingsPanel
          state={{ loops, rules, numbers, reviews, morningHabits, nightHabits, morningLog, nightLog }}
          onImport={importState}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
