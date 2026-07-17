import React, { useState, useEffect, useMemo } from "react";

/* ============================================================
   LOCAL AI — standalone module
   Extracted from Financials (DebtPayoff.jsx) "Local AI" tab so it
   lives as its own top-level pill. Reads and writes Financials'
   own localStorage key directly ("eroOS.debtPayoff.v2") — same
   shape Financials itself uses — so categorization changes made
   here show up back in Financials' Spending/Budget tabs.

   This is NOT read-only like Work/Delegate integrations elsewhere:
   applying category suggestions or rules here actually writes
   back into Financials' txns/rules/categories arrays, because
   that's the whole point of the AI cleanup tool. Everything else
   (debts, assets, budget, events, Snapshots) is read but never
   modified by this module.

   Uses Chrome's on-device Prompt API (window.LanguageModel). No
   API key, no network call — the model runs locally in-browser.
   ============================================================ */

const FIN_KEY = "eroOS.debtPayoff.v2";

const T = {
  paper: "#E9EDE6",
  panel: "#F7F8F3",
  ink: "#232A20",
  muted: "#68705F",
  line: "#C9CFC0",
  rust: "#A6482A",
  moss: "#55704E",
  ochre: "#A87E24",
  mono: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
  sans: "'Archivo', -apple-system, 'Helvetica Neue', sans-serif",
};

const inputStyle = {
  fontFamily: T.mono, fontSize: 13, color: T.ink, background: "#FFF",
  border: `1px solid ${T.line}`, borderRadius: 3, padding: "6px 8px", width: "100%", boxSizing: "border-box",
};
const btnStyle = {
  fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
  color: T.paper, background: T.ink, border: "none", borderRadius: 3,
  padding: "8px 14px", cursor: "pointer",
};
const btnGhost = { ...btnStyle, color: T.ink, background: "transparent", border: `1px solid ${T.line}` };
const card = { background: T.panel, border: `1px solid ${T.line}`, borderRadius: 4, padding: 18 };

/* ---------- categorization helpers (mirrors Financials' own logic) ---------- */

const INCOME_CATEGORY = "Income";
const TRANSFER_CATEGORY = "Transfers & Payments";
const INCOME_CATEGORIES = [INCOME_CATEGORY, "Rental Income", "Business Income", "Personal Sales"];
const DEFAULT_CATEGORIES = ["Rental Income", "Business Income", "Personal Sales", TRANSFER_CATEGORY];

function isIncomeCategory(cat) { return INCOME_CATEGORIES.includes(cat); }
function isTransferCategory(cat) { return cat === TRANSFER_CATEGORY; }

function categorize(desc, rules) {
  const d = (desc || "").toLowerCase();
  for (const r of rules || []) if (r.keyword && d.includes(r.keyword.toLowerCase())) return r.category;
  return "Uncategorized";
}

function merchantKey(desc) {
  return (String(desc || "").split(/\s{2,}/)[0] || desc || "").trim().toLowerCase();
}

function categoryForTxn(txn, rules) {
  return txn.category || categorize(txn.desc, rules);
}

function positiveTransferCategory(desc) {
  const d = String(desc || "").toLowerCase();
  const transferHints = [
    "payment thank you", "automatic payment", "auto-pay thank you", "mobile payment thank you",
    "internet payment thank you", "rewards redeemed", "from savings", "from checking",
    "from emergency fund vault", "from house vault", "internet banking transfer deposit",
    "mobile banking transfer deposit", "electronic deposit sofi bank", "monthly maintenance fee waived",
  ];
  return transferHints.some((x) => d.includes(x)) ? TRANSFER_CATEGORY : null;
}

function displayCategoryForTxn(txn, rules) {
  if (txn.category && txn.category !== "Uncategorized") return txn.category;
  if (txn.amount > 0) {
    const transferCat = positiveTransferCategory(txn.desc);
    if (transferCat) return transferCat;
    const ruleCat = categorize(txn.desc || "", rules);
    if (ruleCat && ruleCat !== "Uncategorized" && ruleCat !== TRANSFER_CATEGORY) return ruleCat;
    return INCOME_CATEGORY;
  }
  return categoryForTxn(txn, rules);
}

function categorySort(a, b) {
  const rank = (c) => {
    if (isIncomeCategory(c)) return 0;
    if (c === "Uncategorized") return 2;
    if (isTransferCategory(c)) return 3;
    return 1;
  };
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (isIncomeCategory(a) && isIncomeCategory(b)) return INCOME_CATEGORIES.indexOf(a) - INCOME_CATEGORIES.indexOf(b);
  return a.localeCompare(b);
}

function getAllCategories(txns = [], rules = [], budgets = {}, categories = [], includeIncome = true) {
  const set = new Set();
  for (const c of DEFAULT_CATEGORIES) set.add(c);
  if (includeIncome) set.add(INCOME_CATEGORY);
  for (const c of categories || []) if (c) set.add(c);
  for (const r of rules || []) if (r.category) set.add(r.category);
  for (const c of Object.keys(budgets || {})) if (c) set.add(c);
  for (const t of txns || []) {
    const c = t.category || displayCategoryForTxn(t, rules);
    if (c) set.add(c);
  }
  return Array.from(set);
}

function buildUncategorizedGroups(txns, rules, limit = 30) {
  const groups = {};
  for (const t of txns || []) {
    if (t.amount >= 0) continue;
    if (categoryForTxn(t, rules) !== "Uncategorized") continue;
    const kw = merchantKey(t.desc || "");
    groups[kw] = groups[kw] || { keyword: kw, sample: t.desc || "", count: 0, total: 0 };
    groups[kw].count++;
    groups[kw].total += -t.amount;
  }
  return Object.values(groups).sort((a, b) => b.total - a.total).slice(0, limit);
}

function buildAISnapshot({ txns, rules, budgets, categories, debts, assets, budget, events }) {
  const allCats = getAllCategories(txns, rules, budgets, categories, true);
  const byMonth = {};
  for (const t of txns || []) {
    const cat = displayCategoryForTxn(t, rules);
    byMonth[t.ym] = byMonth[t.ym] || {};
    byMonth[t.ym][cat] = (byMonth[t.ym][cat] || 0) + (t.amount > 0 ? t.amount : -t.amount);
  }
  const months = Object.keys(byMonth).sort().slice(-6);
  const monthSummary = months.map((ym) => {
    const row = byMonth[ym] || {};
    const income = Object.entries(row).reduce((s, [cat, v]) => isIncomeCategory(cat) ? s + v : s, 0);
    const expenses = Object.entries(row).reduce((s, [cat, v]) => isIncomeCategory(cat) || isTransferCategory(cat) ? s : s + v, 0);
    const topExpenses = Object.entries(row)
      .filter(([cat]) => !isIncomeCategory(cat) && !isTransferCategory(cat))
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([category, amount]) => ({ category, amount: Math.round(amount) }));
    return { ym, income: Math.round(income), expenses: Math.round(expenses), net: Math.round(income - expenses), topExpenses };
  });
  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    totalDebt: Math.round((debts || []).reduce((s, d) => s + (d.balance || 0), 0)),
    totalMinimums: Math.round((debts || []).filter((d) => d.balance > 0).reduce((s, d) => s + (d.minPayment || 0), 0)),
    monthlyDebtBudget: Math.round(budget || 0),
    debts: (debts || []).map((d) => ({ name: d.name, balance: Math.round(d.balance || 0), apr: d.apr || 0, minPayment: d.minPayment || 0 })),
    assets: (assets || []).map((a) => ({ name: a.name, value: Math.round(a.value || 0), owed: Math.round(a.owed || 0) })),
    categories: allCats,
    budgets,
    rulesCount: (rules || []).length,
    txnsCount: (txns || []).length,
    monthSummary,
    uncategorized: buildUncategorizedGroups(txns || [], rules || [], 25),
    events: (events || []).map((e) => ({ ym: e.ym, amount: e.amount, type: e.type, label: e.label })),
  };
}

/* ---------- Chrome Built-in AI (Gemini Nano) ---------- */

function getBuiltInAIAPI() {
  if (typeof window === "undefined") return null;
  return window.LanguageModel || (window.ai && window.ai.languageModel) || null;
}

async function checkBuiltInAIAvailability() {
  const api = getBuiltInAIAPI();
  if (!api || typeof api.availability !== "function" || typeof api.create !== "function") {
    return { available: false, status: "missing", message: "Chrome Built-in AI Prompt API not found. Use Chrome on desktop and enable the Gemini Nano Prompt API flags." };
  }
  const status = await api.availability();
  return {
    available: status === "available" || status === "downloadable" || status === "downloading",
    status,
    message: status === "available"
      ? "Gemini Nano is available."
      : status === "downloadable"
        ? "Gemini Nano is available to download. Creating a session may start the model download."
        : status === "downloading"
          ? "Gemini Nano is downloading. Try again after Chrome finishes the model download."
          : "Gemini Nano is unavailable on this browser/device.",
  };
}

async function promptGeminiNano(prompt, systemPrompt = "") {
  const api = getBuiltInAIAPI();
  if (!api || typeof api.availability !== "function" || typeof api.create !== "function") {
    throw new Error("Chrome Built-in AI Prompt API is not available in this browser.");
  }
  const availability = await api.availability();
  if (availability === "unavailable") throw new Error("Gemini Nano is unavailable on this browser/device.");
  if (availability === "downloading") throw new Error("Gemini Nano is still downloading. Wait a few minutes and try again.");
  const session = await api.create({
    systemPrompt: systemPrompt || "You are a compact local finance assistant embedded inside a personal budgeting app. Be terse, concrete, and return exactly what the user requested.",
  });
  try {
    return await session.prompt(prompt);
  } finally {
    if (session && typeof session.destroy === "function") session.destroy();
  }
}

function extractJSON(text) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch (e) { /* extract below */ }
  const firstObj = raw.indexOf("{");
  const firstArr = raw.indexOf("[");
  let start = -1, end = -1;
  if (firstArr >= 0 && (firstObj < 0 || firstArr < firstObj)) { start = firstArr; end = raw.lastIndexOf("]"); }
  else { start = firstObj; end = raw.lastIndexOf("}"); }
  if (start < 0 || end <= start) throw new Error("AI response did not contain JSON.");
  return JSON.parse(raw.slice(start, end + 1));
}

/* ---------- Financials read/write (same key, same shape) ---------- */

async function loadFinancials() {
  try {
    const res = await window.storage.get(FIN_KEY);
    return JSON.parse(res.value);
  } catch {
    return null;
  }
}

async function saveFinancials(patch) {
  try {
    const current = (await loadFinancials()) || {};
    const next = { ...current, ...patch, __savedAt: Date.now() };
    await window.storage.set(FIN_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/* ---------- small UI atoms ---------- */

function CategorySelect({ value, onChange, categories, placeholder = "Select category" }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const opts = (categories || []).filter((c) => c !== INCOME_CATEGORY).sort(categorySort);
  const saveNew = () => {
    const v = draft.trim();
    if (!v) return;
    onChange(v);
    setDraft("");
    setAdding(false);
  };
  if (adding) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          style={{ ...inputStyle, minWidth: 140 }}
          value={draft} autoFocus placeholder="New category"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveNew(); if (e.key === "Escape") setAdding(false); }}
        />
        <button style={{ ...btnStyle, padding: "7px 10px" }} onClick={saveNew}>Use</button>
        <button style={{ ...btnGhost, padding: "7px 10px" }} onClick={() => { setAdding(false); setDraft(""); }}>Cancel</button>
      </div>
    );
  }
  return (
    <select
      style={inputStyle} value={value || ""}
      onChange={(e) => { if (e.target.value === "__new__") setAdding(true); else onChange(e.target.value); }}
    >
      <option value="">{placeholder}</option>
      {opts.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value="__new__">+ Add new category…</option>
    </select>
  );
}

function AIList({ title, items }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {(items || []).map((x, i) => <li key={i} style={{ marginBottom: 3 }}>{typeof x === "string" ? x : JSON.stringify(x)}</li>)}
      </ul>
    </div>
  );
}

/* ---------- main module ---------- */

export default function LocalAI() {
  const [loaded, setLoaded] = useState(false);
  const [fin, setFin] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadFinancials().then((f) => {
      if (!cancelled) {
        setFin(f);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const refresh = () => { loadFinancials().then(setFin); };

  const [aiStatus, setAiStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("What are the biggest leaks and what should I do next?");
  const [answer, setAnswer] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [raw, setRaw] = useState("");

  const txns = fin?.txns || [];
  const rules = fin?.rules || [];
  const budgets = fin?.budgets || {};
  const categories = fin?.categories || [];
  const debts = fin?.debts || [];
  const assets = fin?.assets || [];
  const budget = fin?.budget || 0;
  const events = fin?.events || [];

  const categoryOptions = useMemo(
    () => getAllCategories(txns, rules, budgets, categories, false),
    [txns, rules, budgets, categories]
  );
  const uncategorized = useMemo(() => buildUncategorizedGroups(txns, rules, 40), [txns, rules]);

  const rememberCategory = (cat) => {
    const clean = (cat || "").trim();
    if (!clean || clean === INCOME_CATEGORY || clean === "Uncategorized") return clean;
    const nextCategories = Array.from(new Set([...(categories || []), clean])).sort(categorySort);
    // fire-and-forget: persist in the background, refresh once it lands.
    // Callers use the returned "clean" string immediately for local UI state
    // without waiting on the network round-trip.
    saveFinancials({ categories: nextCategories }).then(refresh);
    return clean;
  };

  const runCheck = async () => {
    setBusy(true);
    setAnswer("");
    try {
      setAiStatus(await checkBuiltInAIAvailability());
    } catch (e) {
      setAiStatus({ available: false, status: "error", message: e.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  const runAsk = async () => {
    setBusy(true);
    setAnswer("");
    setRaw("");
    try {
      const snapshot = buildAISnapshot({ txns, rules, budgets, categories, debts, assets, budget, events });
      const prompt = `User question: ${question}\n\nCurrent app snapshot JSON:\n${JSON.stringify(snapshot)}\n\nAnswer in direct bullets. Do not give tax/legal advice. Focus on objective cash-flow and categorization moves.`;
      const out = await promptGeminiNano(prompt, "You are a local on-device finance assistant embedded in a budgeting app. Be terse, mechanical, and action-oriented.");
      setAnswer(out);
    } catch (e) {
      setAnswer("AI error: " + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  const runAnalysis = async () => {
    setBusy(true);
    setAnalysis(null);
    setRaw("");
    try {
      const snapshot = buildAISnapshot({ txns, rules, budgets, categories, debts, assets, budget, events });
      const prompt = `Analyze this finance app snapshot. Return strict JSON only with this shape:\n{\n  "oneThing": "single highest leverage move",\n  "risks": ["risk 1", "risk 2", "risk 3"],\n  "nextActions": ["action 1", "action 2", "action 3"],\n  "categoriesToReview": [{"category":"name","reason":"why"}],\n  "debtNotes": ["note"]\n}\n\nSnapshot:\n${JSON.stringify(snapshot)}`;
      const out = await promptGeminiNano(prompt, "Return strict JSON only. No markdown.");
      setRaw(out);
      setAnalysis(extractJSON(out));
    } catch (e) {
      setAnswer("AI analysis error: " + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  const runCategorySuggestions = async () => {
    setBusy(true);
    setSuggestions([]);
    setRaw("");
    try {
      const groups = uncategorized.slice(0, 30);
      const prompt = `Categorize these uncategorized transaction merchant groups. Use existing categories when possible. Create a new concise category only when needed. For ambiguous merchants like Amazon, Google, PayPal, Square, or generic stores, prefer makeRule=false unless the sample clearly indicates one stable category.\n\nExisting categories:\n${JSON.stringify(categoryOptions)}\n\nMerchant groups:\n${JSON.stringify(groups)}\n\nReturn strict JSON only as an array of objects:\n[{"keyword":"merchant keyword exactly from input", "category":"category", "makeRule":true, "confidence":0.0, "reason":"short reason"}]`;
      const out = await promptGeminiNano(prompt, "You are a local transaction categorizer. Return strict JSON only. No markdown.");
      setRaw(out);
      const parsed = extractJSON(out);
      setSuggestions(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      setAnswer("AI categorization error: " + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  const applySuggestionCategories = async (items = suggestions) => {
    const usable = (items || []).filter((s) => s.keyword && s.category);
    for (const s of usable) rememberCategory(s.category); // fires background saves, doesn't block
    const nextTxns = txns.map((t) => {
      if (t.amount >= 0 || categoryForTxn(t, rules) !== "Uncategorized") return t;
      const match = usable.find((s) => (t.desc || "").toLowerCase().includes(String(s.keyword).toLowerCase()));
      return match ? { ...t, category: match.category } : t;
    });
    await saveFinancials({ txns: nextTxns });
    refresh();
  };

  const applySuggestionRules = async () => {
    const ruleItems = suggestions.filter((s) => s.keyword && s.category && s.makeRule);
    if (!ruleItems.length) return;
    for (const s of ruleItems) rememberCategory(s.category); // fires background saves, doesn't block
    const existing = new Set(rules.map((r) => `${String(r.keyword).toLowerCase()}|${r.category}`));
    const additions = ruleItems
      .map((s) => ({ keyword: String(s.keyword).trim(), category: String(s.category).trim() }))
      .filter((r) => r.keyword && r.category && !existing.has(`${r.keyword.toLowerCase()}|${r.category}`));
    await saveFinancials({ rules: [...rules, ...additions] });
    refresh();
  };

  const updateSuggestion = (idx, patch) => setSuggestions(suggestions.map((s, i) => i === idx ? { ...s, ...patch } : s));
  const deleteSuggestion = (idx) => setSuggestions(suggestions.filter((_, i) => i !== idx));

  if (!loaded) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.paper, fontFamily: T.mono, color: T.muted }}>Loading…</div>;
  }

  if (!fin) {
    return (
      <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: T.sans, padding: 24 }}>
        <div style={{ ...card, maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>No Financials data yet</div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>
            Open the Financials module first so there's transaction and debt data for the AI to work with.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: T.sans, padding: "0 0 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        input:focus, button:focus, select:focus { outline: 2px solid ${T.ochre}; outline-offset: 1px; }
      `}</style>

      <div style={{ borderBottom: `2px solid ${T.ink}`, padding: "18px 24px" }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: "0.18em", color: T.muted }}>ERO OS</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>Local AI</div>
      </div>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px" }}>
        <div style={{ ...card, borderLeft: `4px solid ${T.moss}`, marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Local AI · Gemini Nano</div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 12 }}>
            Uses Chrome Built-in AI through the browser's LanguageModel Prompt API. No API key. Transaction data stays in the browser when the model is available locally. Reads live from Financials — category changes and new rules made here write straight back into Financials.
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button style={btnStyle} onClick={runCheck} disabled={busy}>Check Gemini Nano</button>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: aiStatus?.status === "available" ? T.moss : T.muted }}>
              {aiStatus ? `${aiStatus.status}: ${aiStatus.message}` : "Not checked"}
            </span>
            <button style={{ ...btnGhost, marginLeft: "auto" }} onClick={refresh}>Refresh from Financials</button>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginTop: 10 }}>
            If missing: use desktop Chrome, enable chrome://flags/#optimization-guide-on-device-model and chrome://flags/#prompt-api-for-gemini-nano, relaunch, then test await LanguageModel.availability() in DevTools.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Ask the local model</div>
            <textarea
              style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about spending, categories, debt payoff, or cleanup."
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button style={btnStyle} onClick={runAsk} disabled={busy || !question.trim()}>{busy ? "Working…" : "Ask Gemini Nano"}</button>
              <button style={btnGhost} onClick={runAnalysis} disabled={busy}>Structured analysis</button>
            </div>
            {answer && (
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: T.mono, fontSize: 12, background: "#FFF", border: `1px solid ${T.line}`, borderRadius: 3, padding: 12, marginTop: 12 }}>
                {answer}
              </pre>
            )}
            {analysis && (
              <div style={{ marginTop: 12, fontFamily: T.mono, fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: T.moss, marginBottom: 8 }}>One thing: {analysis.oneThing}</div>
                {Array.isArray(analysis.risks) && <AIList title="Risks" items={analysis.risks} />}
                {Array.isArray(analysis.nextActions) && <AIList title="Next actions" items={analysis.nextActions} />}
                {Array.isArray(analysis.debtNotes) && <AIList title="Debt notes" items={analysis.debtNotes} />}
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>AI category cleanup</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 12 }}>
              {uncategorized.length} uncategorized merchant groups. The AI suggests categories. You review before applying — applying writes back into Financials.
            </div>
            <button style={btnStyle} onClick={runCategorySuggestions} disabled={busy || uncategorized.length === 0}>
              Suggest categories
            </button>
            {suggestions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <button style={btnGhost} onClick={() => applySuggestionCategories(suggestions)}>Apply categorize only</button>
                  <button style={btnStyle} onClick={applySuggestionRules}>Add suggested rules</button>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 80px 64px", gap: 8, alignItems: "center", borderBottom: `1px dashed ${T.line}`, paddingBottom: 8 }}>
                      <input style={inputStyle} value={s.keyword || ""} onChange={(e) => updateSuggestion(i, { keyword: e.target.value })} />
                      <CategorySelect
                        value={s.category || ""}
                        categories={categoryOptions}
                        placeholder="Category"
                        onChange={(cat) => updateSuggestion(i, { category: rememberCategory(cat) })}
                      />
                      <label style={{ fontFamily: T.mono, fontSize: 11, display: "flex", gap: 5, alignItems: "center" }}>
                        <input type="checkbox" checked={!!s.makeRule} onChange={(e) => updateSuggestion(i, { makeRule: e.target.checked })} /> Rule
                      </label>
                      <button style={{ ...btnGhost, padding: "6px 8px", color: T.rust, borderColor: T.rust }} onClick={() => deleteSuggestion(i)}>Delete</button>
                      <div style={{ gridColumn: "1 / -1", fontFamily: T.mono, fontSize: 10, color: T.muted }}>
                        conf {s.confidence ?? "—"} · {s.reason || ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {raw && (
          <details style={{ ...card, marginTop: 16 }}>
            <summary style={{ cursor: "pointer", fontFamily: T.mono, fontSize: 12 }}>Raw AI response</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: T.mono, fontSize: 11, marginTop: 10 }}>{raw}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
