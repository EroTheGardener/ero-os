import React, { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
   MONEY — Ero OS module (v2)
   Dashboard · Payoff Plan · Debts · Budget · Spending · Snapshots
   Drop into src/ and add to your nav. Self-contained, no deps.
   Persists to localStorage "eroOS.debtPayoff.v2" (migrates v1).
   ============================================================ */

const T = {
  paper: "#E9EDE6",
  panel: "#F7F8F3",
  ink: "#232A20",
  muted: "#68705F",
  line: "#C9CFC0",
  rust: "#A6482A", // avalanche / debt
  moss: "#55704E", // snowball / assets / paid
  ochre: "#A87E24", // cash flow / budget
  mono: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
  sans: "'Archivo', -apple-system, 'Helvetica Neue', sans-serif",
};

const STRATS = [
  { key: "avalanche", label: "Avalanche", sub: "highest rate first", color: T.rust },
  { key: "snowball", label: "Snowball", sub: "smallest balance first", color: T.moss },
  { key: "cashflow", label: "Cash Flow", sub: "biggest payment first", color: T.ochre },
];

const EVENT_TYPES = ["Windfall / sale", "Balloon payment", "Refi cash-out", "Inheritance", "Other"];

const SEED_DEBTS = [
  { id: "excite-loan", name: "Excite Personal Loan", balance: 20680, apr: 11.0, minPayment: 503, dueDay: null, autopay: false, note: "fixed $503/mo — verify APR" },
  { id: "excite-cc", name: "Excite Credit", balance: 22355, apr: 14.15, minPayment: 450, dueDay: null, autopay: false, note: "" },
  { id: "usb-0452", name: "US Bank 0452", balance: 10523, apr: 19.24, minPayment: 250, dueDay: null, autopay: false, note: "" },
  { id: "usb-0292", name: "US Bank 0292", balance: 2364, apr: 18.24, minPayment: 60, dueDay: null, autopay: false, note: "" },
  { id: "wf-reflect", name: "Wells Fargo Reflect", balance: 2594, apr: 0, aprAfter: 29.99, promoEnd: "2027-08", minPayment: 30, dueDay: null, autopay: false, note: "0% promo ends Aug 2027" },
  { id: "chase-amzn", name: "Chase Amazon", balance: 77, apr: 27.74, minPayment: 25, dueDay: null, autopay: false, note: "" },
];

const SEED_ASSETS = [
  { id: "usb-check", name: "US Bank Checking", value: 0, owed: 0 },
  { id: "savings", name: "Savings", value: 0, owed: 0 },
  { id: "hsa", name: "HSA (Fidelity)", value: 0, owed: 0 },
  { id: "home", name: "Homestead (27091 Hwy 49)", value: 0, owed: 0 },
  { id: "vehicles", name: "Vehicles & equipment", value: 0, owed: 0 },
];

const SEED_RULES = [
  // --- Fuel & propane ---
  { keyword: "robinson petroleum", category: "Fuel & Propane" },
  { keyword: "ferrell*gas", category: "Fuel & Propane" },
  { keyword: "sierra energy", category: "Fuel & Propane" },
  { keyword: "vp racing", category: "Fuel & Propane" },
  { keyword: "chevron", category: "Fuel & Propane" },
  { keyword: "arco", category: "Fuel & Propane" },
  { keyword: "maverik", category: "Fuel & Propane" },
  { keyword: "sinclair", category: "Fuel & Propane" },
  { keyword: "grassvalley hwy", category: "Fuel & Propane" },
  { keyword: "smiths-fuel", category: "Fuel & Propane" },
  { keyword: "kwik serv", category: "Fuel & Propane" },
  { keyword: "sunol super stop", category: "Fuel & Propane" },
  { keyword: "shell", category: "Fuel & Propane" },
  { keyword: "76 ", category: "Fuel & Propane" },

  // --- Vehicle & equipment ---
  { keyword: "palmer ent truck", category: "Vehicle & Equipment" },
  { keyword: "parts geek", category: "Vehicle & Equipment" },
  { keyword: "o'reilly", category: "Vehicle & Equipment" },
  { keyword: "j & s smog", category: "Vehicle & Equipment" },
  { keyword: "sq *mg repair", category: "Vehicle & Equipment" },
  { keyword: "vevor", category: "Vehicle & Equipment" },
  { keyword: "sp naito", category: "Vehicle & Equipment" },

  // --- Property & home ---
  { keyword: "home depot", category: "Property & Home" },
  { keyword: "lowes", category: "Property & Home" },
  { keyword: "b & c home", category: "Property & Home" },
  { keyword: "hansen bros", category: "Property & Home" },
  { keyword: "recology", category: "Property & Home" },
  { keyword: "wm_mccourtney", category: "Property & Home" },
  { keyword: "hills flat", category: "Property & Home" },

  // --- Insurance ---
  { keyword: "progressive ins", category: "Insurance" },

  // --- Groceries ---
  { keyword: "safeway", category: "Groceries" },
  { keyword: "savemart", category: "Groceries" },
  { keyword: "raley", category: "Groceries" },
  { keyword: "trader joe", category: "Groceries" },
  { keyword: "natural selection", category: "Groceries" },
  { keyword: "grass valley grocer", category: "Groceries" },
  { keyword: "sprouts", category: "Groceries" },
  { keyword: "costco", category: "Groceries" },
  { keyword: "jackson grocery", category: "Groceries" },
  { keyword: "briarpatch", category: "Groceries" },
  { keyword: "grocery", category: "Groceries" },
  { keyword: "walmart", category: "Groceries" },
  { keyword: "wal-mart", category: "Groceries" },
  { keyword: "wm supercenter", category: "Groceries" },

  // --- Dining & entertainment ---
  { keyword: "mother truckers", category: "Dining" },
  { keyword: "taste of thai", category: "Dining" },
  { keyword: "chipotle", category: "Dining" },
  { keyword: "hot potato pie", category: "Dining" },
  { keyword: "sq *pho country", category: "Dining" },
  { keyword: "sq *mama", category: "Dining" },
  { keyword: "sq *the ridge cafe", category: "Dining" },
  { keyword: "sq *scoups", category: "Dining" },
  { keyword: "sq *the hangar", category: "Dining" },
  { keyword: "sq *choquiero", category: "Dining" },
  { keyword: "sq *heartwood", category: "Dining" },
  { keyword: "the store", category: "Dining" },
  { keyword: "dave & busters", category: "Dining" },
  { keyword: "crazy sexy hot", category: "Dining" },
  { keyword: "gold ranch", category: "Dining" },

  // --- Health & wellness ---
  { keyword: "any lab test now", category: "Health" },
  { keyword: "carson hot springs", category: "Health" },
  { keyword: "kj song", category: "Health" },
  { keyword: "sq *hospice", category: "Donations" },

  // --- Subscriptions & software ---
  { keyword: "starlink", category: "Internet" },
  { keyword: "openai", category: "Software & AI" },
  { keyword: "anthropic", category: "Software & AI" },
  { keyword: "wispr", category: "Software & AI" },
  { keyword: "audible", category: "Subscriptions" },
  { keyword: "premium musescore", category: "Subscriptions" },
  { keyword: "premium mu*", category: "Subscriptions" },
  { keyword: "upg - warmtech", category: "Subscriptions" },
  { keyword: "you need a budget", category: "Subscriptions" },
  { keyword: "ownerly", category: "Subscriptions" },
  { keyword: "google *tinder", category: "Subscriptions" },
  { keyword: "google *amazon", category: "Shopping" },

  // --- Business & web ---
  { keyword: "godaddy", category: "Business: Web" },
  { keyword: "namecheap", category: "Business: Web" },
  { keyword: "wordpress", category: "Business: Web" },
  { keyword: "facebk", category: "Business: Ads" },

  // --- Business tools ---
  { keyword: "ritchie bros", category: "Business: Equipment" },

  // --- Astrology & personal growth ---
  { keyword: "astrodienst", category: "Astrology & Personal" },
  { keyword: "ambrosia events", category: "Astrology & Personal" },

  // --- Government / fees ---
  { keyword: "fd *ca dmv", category: "Government & Fees" },
  { keyword: "nv parks", category: "Government & Fees" },
  { keyword: "experian", category: "Finance: Credit" },

  // --- Shopping ---
  { keyword: "ebay", category: "Shopping" },
  { keyword: "goodwill", category: "Shopping" },
  { keyword: "sq *sammie", category: "Shopping" },

  // --- Finance / bank ---
  { keyword: "interest charge", category: "Finance: Interest" },
  { keyword: "returned payment fee", category: "Finance: Fees" },
  { keyword: "frgn trans fee", category: "Finance: Fees" },
];

const APPEND_RULES = [
  { keyword: "airbnb", category: "Rental Income" },
  { keyword: "good news wood", category: "Business Income" },
  { keyword: "ecocamp coyote", category: "Business Income" },
  { keyword: "stripe inc", category: "Business Income" },
];

function mergeAppendedRules(existing = []) {
  const out = [...(existing || [])];
  const seen = new Set(out.map((r) => `${String(r.keyword || "").toLowerCase()}|${String(r.category || "").toLowerCase()}`));
  for (const r of APPEND_RULES) {
    const k = `${r.keyword.toLowerCase()}|${r.category.toLowerCase()}`;
    if (!seen.has(k)) out.push(r);
  }
  return out;
}

function normalizeSavedCategories(existing = []) {
  return Array.from(new Set([...(existing || []), ...DEFAULT_CATEGORIES])).sort(categorySort);
}

function normalizeSavedTxns(existing = []) {
  return (existing || []).map((t) => {
    if (t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date)) return t;
    const first = String(t.key || "").split("|")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(first)) return { ...t, date: first, ym: first.slice(0, 7) };
    return t;
  });
}

function isSameLegacyTxn(t, parsed, amount, source) {
  if (!t || !parsed) return false;
  const sameSource = String(t.source || "") === String(source || "");
  const sameMonth = String(t.ym || "") === String(parsed.ym || "");
  const sameDesc = String(t.desc || "").trim() === String(parsed.desc || "").trim();
  const sameAmount = Math.abs((Number(t.amount) || 0) - (Number(amount) || 0)) < 0.005;
  return sameSource && sameMonth && sameDesc && sameAmount;
}


/* ---------- helpers ---------- */

const fmt$ = (n) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtCents = (n) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function monthKeyOf(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function addMonths(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKeyOf(d);
}
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyYM(ym) {
  if (!ym) return "—";
  const [y, m] = ym.split("-").map(Number);
  return MONTH_NAMES[m - 1] + " " + y;
}

/* ---------- payoff simulation (with one-time events) ---------- */

// A promo-rate card's real APR depends on the month: still the teaser rate
// before promoEnd, the real aprAfter once it lapses. Shared with the
// Dashboard's monthly-interest display so both agree with each other.
function effApr(d, ym) {
  return d.promoEnd && d.aprAfter != null && ym > d.promoEnd ? d.aprAfter : d.apr;
}

function simulate(debts, budget, strategy, startYM, events = []) {
  const live = debts.filter((d) => d.balance > 0.005).map((d) => ({ ...d, bal: d.balance }));
  const rank = (d, ym) => {
    if (strategy === "avalanche") return -effApr(d, ym);
    if (strategy === "snowball") return d.bal;
    return -d.minPayment;
  };
  const totalMin = live.reduce((s, d) => s + d.minPayment, 0);
  if (budget < totalMin - 0.005) return { infeasible: true, totalMin };

  const eventsByYM = {};
  for (const e of events) {
    if (e.ym && e.amount > 0) eventsByYM[e.ym] = (eventsByYM[e.ym] || 0) + e.amount;
  }

  let ym = startYM, months = 0, totalInterest = 0;
  const order = [];
  const series = [{ ym, total: live.reduce((s, d) => s + d.bal, 0) }];

  while (live.some((d) => d.bal > 0.005) && months < 600) {
    months++;
    ym = addMonths(ym, 1);
    for (const d of live) {
      if (d.bal <= 0.005) continue;
      const i = (d.bal * effApr(d, ym)) / 1200;
      d.bal += i;
      totalInterest += i;
    }
    let extra = budget + (eventsByYM[ym] || 0);
    for (const d of live) {
      if (d.bal <= 0.005) continue;
      const pay = Math.min(d.minPayment, d.bal);
      d.bal -= pay;
      extra -= pay;
    }
    while (extra > 0.005) {
      const targets = live.filter((d) => d.bal > 0.005).sort((a, b) => rank(a, ym) - rank(b, ym));
      if (!targets.length) break;
      const t = targets[0];
      const pay = Math.min(extra, t.bal);
      t.bal -= pay;
      extra -= pay;
    }
    for (const d of live) {
      if (d.bal <= 0.005 && !order.find((o) => o.id === d.id)) order.push({ id: d.id, name: d.name, ym });
    }
    series.push({ ym, total: live.reduce((s, d) => s + Math.max(0, d.bal), 0) });
  }
  return { infeasible: false, months, debtFree: ym, totalInterest, order, series, capped: months >= 600, totalMin };
}

/* ---------- CSV parsing ---------- */

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

function detectColumns(header) {
  const h = header.map((x) => x.trim().toLowerCase());
  const find = (names) => h.findIndex((c) => names.some((n) => c.includes(n)));
  return {
    date: find(["transaction date", "posted date", "post date", "date"]),
    desc: find(["description", "payee", "name", "memo", "details"]),
    amount: find(["amount"]),
    debit: find(["debit", "withdrawal"]),
    credit: find(["credit", "deposit"]),
  };
}

function parseDateParts(s) {
  const t = String(s || "").trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = m[1];
    const mo = m[2].padStart(2, "0");
    const day = m[3].padStart(2, "0");
    return { date: `${y}-${mo}-${day}`, ym: `${y}-${mo}` };
  }
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    const mo = m[1].padStart(2, "0");
    const day = m[2].padStart(2, "0");
    return { date: `${y}-${mo}-${day}`, ym: `${y}-${mo}` };
  }
  const d = new Date(t);
  if (isNaN(d)) return null;
  const ym = monthKeyOf(d);
  const date = ym + "-" + String(d.getDate()).padStart(2, "0");
  return { date, ym };
}

function parseDateToYM(s) {
  const parts = parseDateParts(s);
  return parts ? parts.ym : null;
}

function categorize(desc, rules) {
  const d = desc.toLowerCase();
  for (const r of rules) if (r.keyword && d.includes(r.keyword.toLowerCase())) return r.category;
  return "Uncategorized";
}

function merchantKey(desc) {
  // US Bank pads name/city with runs of spaces — keep just the merchant part.
  return (desc.split(/\s{2,}/)[0] || desc).trim().toLowerCase();
}

const INCOME_CATEGORY = "Income";
const TRANSFER_CATEGORY = "Transfers & Payments";
const INCOME_CATEGORIES = [INCOME_CATEGORY, "Rental Income", "Business Income", "Personal Sales"];
const DEFAULT_CATEGORIES = ["Rental Income", "Business Income", "Personal Sales", TRANSFER_CATEGORY];

function isIncomeCategory(cat) {
  return INCOME_CATEGORIES.includes(cat);
}

function isTransferCategory(cat) {
  return cat === TRANSFER_CATEGORY;
}


function categoryForTxn(txn, rules) {
  // Manual one-time categories live on the transaction and do not create future rules.
  return txn.category || categorize(txn.desc, rules);
}

function positiveTransferCategory(desc) {
  const d = String(desc || "").toLowerCase();
  const transferHints = [
    "payment thank you",
    "automatic payment",
    "auto-pay thank you",
    "mobile payment thank you",
    "internet payment thank you",
    "rewards redeemed",
    "from savings",
    "from checking",
    "from emergency fund vault",
    "from house vault",
    "internet banking transfer deposit",
    "mobile banking transfer deposit",
    "electronic deposit sofi bank",
    "monthly maintenance fee waived",
  ];
  return transferHints.some((x) => d.includes(x)) ? TRANSFER_CATEGORY : null;
}

function displayCategoryForTxn(txn, rules) {
  // Manual one-time categories always win.
  if (txn.category && txn.category !== "Uncategorized") return txn.category;

  // Positive transactions default to Income unless they are clear account/payment movements.
  // Positive-specific rules can split Income into Rental Income, Business Income, Personal Sales, etc.
  // Broad transfer/payment rules are skipped for positives so "Zelle Payment from..." stays income-like.
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
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (isIncomeCategory(a) && isIncomeCategory(b)) {
    return INCOME_CATEGORIES.indexOf(a) - INCOME_CATEGORIES.indexOf(b);
  }
  return a.localeCompare(b);
}

function categoryAmount(txn) {
  // Store category rows as positive magnitudes; income remains additive in totals.
  return txn.amount > 0 ? txn.amount : -txn.amount;
}


function getAllCategories(txns = [], rules = [], budgets = {}, categories = [], includeIncome = true) {
  const set = new Set();

  // Always keep the core user-facing categories available, even before rules or budgets use them.
  for (const c of DEFAULT_CATEGORIES) set.add(c);
  if (includeIncome) set.add(INCOME_CATEGORY);

  for (const c of categories || []) if (c) set.add(c);
  for (const r of rules || []) if (r.category) set.add(r.category);
  for (const c of Object.keys(budgets || {})) if (c) set.add(c);
  for (const t of txns || []) {
    const c = t.category || displayCategoryForTxn(t, rules);
    if (c) set.add(c);
  }
  return Array.from(set).filter((c) => includeIncome || c !== INCOME_CATEGORY).sort(categorySort);
}

function isAmazonDetailTxn(txnOrDesc, source = "") {
  const desc = typeof txnOrDesc === "string" ? txnOrDesc : (txnOrDesc?.desc || "");
  const src = typeof txnOrDesc === "string" ? source : (txnOrDesc?.source || source || "");
  const d = String(desc || "").trim().toLowerCase();
  const s = String(src || "").toLowerCase();
  return d.startsWith("amz-") || s.includes("amazon-import");
}

function isGenericAmazonMerchantTxn(txn) {
  const d = String(txn?.desc || "").trim().toLowerCase();
  return d.includes("amazon mktpl") || d.startsWith("amazon.com*") || d.includes("amazon marketplace");
}

function normalizeAmazonDesc(desc) {
  return String(desc || "")
    .toLowerCase()
    .replace(/\s+#\d+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function duplicateKeyForTxn(txn) {
  const amount = Number(txn?.amount || 0).toFixed(2);
  if (isAmazonDetailTxn(txn)) {
    return `amazon-detail|${txn.date || txn.ym || ""}|${normalizeAmazonDesc(txn.desc)}|${amount}`;
  }
  return txn?.key || `${txn?.date || txn?.ym || ""}|${String(txn?.desc || "").toLowerCase().replace(/\s+/g, " ").trim()}|${amount}`;
}

function makeTxnKey({ date, ym, desc, amount, source }) {
  const base = { date, ym, desc, amount, source };
  return isAmazonDetailTxn(desc, source)
    ? duplicateKeyForTxn(base)
    : `${date || ym}|${desc}|${Number(amount || 0).toFixed(2)}`;
}

function monthNeighbors(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return [ym || ""];
  return [ym, addMonths(ym, -1), addMonths(ym, 1)];
}

function amountMonthKey(txn, ym = txn?.ym) {
  return `${ym || ""}|${Math.abs(Number(txn?.amount || 0)).toFixed(2)}`;
}

function dedupeAmazonDetailTransactions(txns = []) {
  const seenDetail = new Set();
  const uniqueDetailKeysByMonth = new Set();
  for (const t of txns) {
    if (!isAmazonDetailTxn(t)) continue;
    const k = duplicateKeyForTxn(t);
    if (seenDetail.has(k)) continue;
    seenDetail.add(k);
    for (const m of monthNeighbors(t.ym)) uniqueDetailKeysByMonth.add(amountMonthKey(t, m));
  }

  const pushedDetail = new Set();
  const out = [];
  let removedDetail = 0;
  let removedGeneric = 0;
  for (const t of txns) {
    if (isAmazonDetailTxn(t)) {
      const k = duplicateKeyForTxn(t);
      if (pushedDetail.has(k)) { removedDetail++; continue; }
      pushedDetail.add(k);
      out.push(t);
      continue;
    }
    if (isGenericAmazonMerchantTxn(t) && uniqueDetailKeysByMonth.has(amountMonthKey(t))) {
      removedGeneric++;
      continue;
    }
    out.push(t);
  }
  return { txns: out, removed: removedDetail + removedGeneric, removedDetail, removedGeneric };
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsv(rows) {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rowsToHtmlTable(rows, numericFromCol = 1) {
  return `<table><thead><tr>${rows[0].map((h, i) => `<th class="${i >= numericFromCol ? "num" : ""}">${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c, i) => `<td class="${i >= numericFromCol ? "num" : ""}">${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function printRows(title, rows, numericFromCol = 1) {
  const win = window.open("", "_blank");
  if (!win) { window.print(); return; }
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;margin:24px;color:#232A20}
    h1{font-size:20px;margin:0 0 12px}
    table{border-collapse:collapse;width:100%;font-family:Menlo,Consolas,monospace;font-size:11px}
    th,td{border-bottom:1px solid #C9CFC0;padding:6px;text-align:left;vertical-align:top}
    th{border-bottom:2px solid #232A20}
    .num{text-align:right;white-space:nowrap}
    @media print{button{display:none}}
  </style></head><body><h1>${escapeHtml(title)}</h1>${rowsToHtmlTable(rows, numericFromCol)}<script>window.onload=()=>setTimeout(()=>window.print(),100)<\/script></body></html>`);
  win.document.close();
}


/* ---------- storage + migration ---------- */

const LS_KEY = "eroOS.debtPayoff.v2";
const LS_KEY_V1 = "eroOS.debtPayoff.v1";

// Loads Financials state from the shared Supabase-backed store. If nothing's
// there yet, checks this browser's OLD local-only data (from before the
// multi-device sync existed) and migrates it up into the shared store once,
// so a first run on your original device doesn't lose anything.
async function loadState() {
  try {
    const res = await window.storage.get(LS_KEY);
    return JSON.parse(res.value);
  } catch {
    // nothing in the shared store yet — check for pre-sync local data to migrate
  }
  try {
    const v2raw = localStorage.getItem(LS_KEY);
    if (v2raw) {
      const migrated = JSON.parse(v2raw);
      await window.storage.set(LS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    const v1raw = localStorage.getItem(LS_KEY_V1);
    if (v1raw) {
      const v1 = JSON.parse(v1raw);
      const migrated = {
        debts: (v1.debts || SEED_DEBTS).map((d) => ({ dueDay: null, autopay: false, ...d })),
        budget: v1.budget,
        rules: v1.rules,
        txns: (v1.txns || []).map((t) => ({ ...t, amount: v1.flipSigns ? -t.amount : t.amount })),
        Snapshots: (v1.snapshots || []).map((s) => ({
          date: s.date, debts: s.balances || {}, assets: {}, totalDebt: s.total, totalAssets: null, netWorth: null,
        })),
        assets: SEED_ASSETS,
        events: [],
        budgets: {},
        categories: [],
      };
      await window.storage.set(LS_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (e) { /* fresh start */ }
  return null;
}

/* ---------- tiny UI atoms ---------- */

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

function Label({ children }) {
  return (
    <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 4, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

function Num({ value, onChange, step = 1, min = 0, width }) {
  return (
    <input type="number" step={step} min={min} value={value ?? ""} style={{ ...inputStyle, width: width || "100%" }}
      onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))} />
  );
}


function FinancialsSettingsPanel({ storageKey, state, onImport, onClose }) {
  const [text, setText] = useState(() => JSON.stringify(state, null, 2));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
    if (!window.confirm("This clears all Financials data everywhere it's synced (all your devices), starting fresh with seed data. Continue?")) return;
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
      style={{ position: "fixed", inset: 0, background: "rgba(35,42,32,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 4, maxWidth: 720, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 24 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, fontFamily: T.sans }}>Financials — Settings</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginBottom: 12 }}>
          Storage key: {storageKey}. Raw JSON of debts, assets, budget, events, rules, budgets, categories, transactions, and Snapshots. Edit carefully — this is the actual saved data.
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%", minHeight: 360, fontFamily: T.mono, fontSize: 11, padding: 10,
            border: `1px solid ${T.line}`, borderRadius: 3, background: "#fff", color: T.ink, resize: "vertical", boxSizing: "border-box",
          }}
        />
        {error && <div style={{ color: T.rust, fontFamily: T.mono, fontSize: 11, marginTop: 6 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={copy} style={copied ? btnStyle : btnGhost}>{copied ? "COPIED" : "Copy JSON"}</button>
          <button onClick={download} style={btnGhost}>Download .json</button>
          <button onClick={applyImport} style={btnStyle}>Apply edited JSON</button>
          <button onClick={clearAll} style={{ ...btnGhost, color: T.rust, borderColor: T.rust, marginLeft: "auto" }}>Clear all Financials data</button>
        </div>
      </div>
    </div>
  );
}

function CategorySelect({ value, onChange, categories, placeholder = "Select category", allowIncome = false }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const opts = (categories || []).filter((c) => allowIncome || c !== INCOME_CATEGORY).sort(categorySort);
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
          value={draft}
          autoFocus
          placeholder="New category"
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
      style={inputStyle}
      value={value || ""}
      onChange={(e) => {
        if (e.target.value === "__new__") setAdding(true);
        else onChange(e.target.value);
      }}
    >
      <option value="">{placeholder}</option>
      {opts.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value="__new__">+ Add new category…</option>
    </select>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function DebtPayoff() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dash");
  const [showSettings, setShowSettings] = useState(false);
  const [debts, setDebts] = useState(SEED_DEBTS);
  const [assets, setAssets] = useState(SEED_ASSETS);
  const [budget, setBudget] = useState(1600);
  const [events, setEvents] = useState([]);
  const [rules, setRules] = useState(SEED_RULES);
  const [budgets, setBudgets] = useState({});
  const [categories, setCategories] = useState([]);
  const [txns, setTxns] = useState([]);
  const [Snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadState().then((saved) => {
      if (cancelled) return;
      if (saved) {
        setDebts(saved.debts || SEED_DEBTS);
        setAssets(saved.assets || SEED_ASSETS);
        setBudget(saved.budget ?? 1600);
        setEvents(saved.events || []);
        setRules(mergeAppendedRules(saved.rules || SEED_RULES));
        setBudgets(saved.budgets || {});
        setCategories(normalizeSavedCategories(saved.categories || []));
        setTxns(normalizeSavedTxns(saved.txns || []));
        setSnapshots(saved.Snapshots || []);
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return; // don't save until the initial load has completed, or we'd overwrite shared data with defaults
    window.storage.set(LS_KEY, JSON.stringify({ debts, assets, budget, events, rules, budgets, categories, txns, Snapshots, __savedAt: Date.now() }))
      .catch(() => { /* network hiccup — local cache in the shim still holds the data */ });
  }, [debts, assets, budget, events, rules, budgets, categories, txns, Snapshots, loaded]);

  const startYM = monthKeyOf(new Date());
  const results = useMemo(() => {
    const out = {};
    for (const s of STRATS) out[s.key] = simulate(debts, budget, s.key, startYM, events);
    return out;
  }, [debts, budget, startYM, events]);

  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const totalOwed = assets.reduce((s, a) => s + (a.owed || 0), 0);
  const totalAssets = assets.reduce((s, a) => s + (a.value || 0), 0);
  const netWorth = totalAssets - totalOwed - totalDebt;
  const totalMin = debts.filter((d) => d.balance > 0).reduce((s, d) => s + (d.minPayment || 0), 0);

  const importState = (parsed) => {
    if (parsed.debts) setDebts(parsed.debts);
    if (parsed.assets) setAssets(parsed.assets);
    if (parsed.budget != null) setBudget(parsed.budget);
    if (parsed.events) setEvents(parsed.events);
    if (parsed.rules) setRules(parsed.rules);
    if (parsed.budgets) setBudgets(parsed.budgets);
    if (parsed.categories) setCategories(parsed.categories);
    if (parsed.txns) setTxns(parsed.txns);
    if (parsed.Snapshots) setSnapshots(parsed.Snapshots);
  };

  const TABS = [
    ["dash", "Dashboard"], ["plan", "Payoff Plan"], ["debts", "Debts"],
    ["budget", "Budget"], ["spending", "Spending"], ["Snapshots", "Snapshots"],
  ];

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: T.paper, color: T.muted, fontFamily: T.mono, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
        Syncing…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: T.sans, padding: "0 0 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        input:focus, button:focus, select:focus { outline: 2px solid ${T.ochre}; outline-offset: 1px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      {/* header */}
      <div style={{ borderBottom: `2px solid ${T.ink}`, padding: "18px 24px", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: "0.18em", color: T.muted }}>ERO OS</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>Money</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 28, fontFamily: T.mono, flexWrap: "wrap" }}>
            <div>
              <Label>Net worth</Label>
              <div style={{ fontSize: 22, fontWeight: 600, color: netWorth >= 0 ? T.moss : T.rust }}>{fmt$(netWorth)}</div>
            </div>
            <div>
              <Label>Total debt</Label>
              <div style={{ fontSize: 22, fontWeight: 600, color: T.rust }}>{fmt$(totalDebt + totalOwed)}</div>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={{ ...btnGhost, fontSize: 11 }}
          >
            ⚙ Settings
          </button>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 2, padding: "0 24px", borderBottom: `1px solid ${T.line}`, overflowX: "auto" }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.03em",
            padding: "12px 18px", border: "none", cursor: "pointer", whiteSpace: "nowrap",
            background: tab === k ? T.ink : "transparent",
            color: tab === k ? T.paper : T.muted,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px" }}>
        {tab === "dash" && <DashboardTab debts={debts} assets={assets} results={results} txns={txns} budgets={budgets} rules={rules} Snapshots={Snapshots} totalDebt={totalDebt} totalOwed={totalOwed} totalAssets={totalAssets} netWorth={netWorth} totalMin={totalMin} startYM={startYM} budget={budget} events={events} />}
        {tab === "plan" && <PlanTab budget={budget} setBudget={setBudget} results={results} totalMin={totalMin} startYM={startYM} events={events} setEvents={setEvents} />}
        {tab === "debts" && <DebtsTab debts={debts} setDebts={setDebts} />}
        {tab === "budget" && <BudgetTab txns={txns} rules={rules} budgets={budgets} setBudgets={setBudgets} categories={categories} startYM={startYM} />}
        {tab === "spending" && <SpendingTab txns={txns} setTxns={setTxns} rules={rules} setRules={setRules} budgets={budgets} setBudgets={setBudgets} categories={categories} setCategories={setCategories} />}
        {tab === "Snapshots" && <SnapshotsTab debts={debts} assets={assets} setAssets={setAssets} Snapshots={Snapshots} setSnapshots={setSnapshots} />}
      </div>

      {showSettings && (
        <FinancialsSettingsPanel
          storageKey={LS_KEY}
          state={{ debts, assets, budget, events, rules, budgets, categories, txns, Snapshots }}
          onImport={importState}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

/* ============================================================
   WORK BOARD READER (read-only, one-way)
   Reads Ero's "Work" module (shared Supabase key "gnws-work-v1")
   to surface upcoming purchases/income on the dashboard. This
   never writes back to Work, and never touches debts/assets/
   budget/payoff simulation state — purely additive display.
   ============================================================ */

const WORK_STORAGE_KEY = "gnws-work-v1";

async function loadWorkItems() {
  try {
    const res = await window.storage.get(WORK_STORAGE_KEY);
    const parsed = JSON.parse(res.value);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

// Project a work item's occurrences within [today, today+horizonDays].
// once: single occurrence on dueDate if within range.
// weekly/monthly: repeat forward from dueDate (or today if no dueDate) through the horizon.
function projectWorkCashFlow(items, horizonDays = 60) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + horizonDays);

  const out = [];
  for (const item of items) {
    if (!item.amount || !item.direction) continue;
    if (item.section === "done") continue; // completed items don't project forward

    const freq = item.freq || "once";
    let anchor = item.dueDate ? new Date(item.dueDate + "T00:00:00") : new Date(today);

    if (freq === "once") {
      if (!item.dueDate) continue; // no date, can't place a one-time item on the timeline
      if (anchor >= today && anchor <= horizon) {
        out.push({ id: item.id, date: anchor, text: item.text, amount: item.amount, direction: item.direction });
      }
      continue;
    }

    // recurring: walk forward from the anchor (or today) in freq steps until past horizon
    let cursor = new Date(anchor);
    // if anchor is in the past, fast-forward to the first occurrence >= today
    const stepDays = freq === "weekly" ? 7 : 30;
    while (cursor < today) {
      cursor.setDate(cursor.getDate() + stepDays);
    }
    let guard = 0;
    while (cursor <= horizon && guard < 200) {
      out.push({ id: item.id + "-" + cursor.toISOString().slice(0, 10), date: new Date(cursor), text: item.text, amount: item.amount, direction: item.direction });
      cursor.setDate(cursor.getDate() + stepDays);
      guard++;
    }
  }
  out.sort((a, b) => a.date - b.date);
  return out;
}

// Combined cash flow projection: debt minimum payments (by dueDay), the
// recurring monthly debt-paydown budget, one-time payoff events (windfalls
// etc.), and Work board items (dated costs/income, including recurring).
// This is the one true "all data" cash flow feed — read-only merge, doesn't
// mutate any of the source state.
function projectFullCashFlow(debts, budget, events, workItems, horizonDays = 60) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + horizonDays);

  const out = [];

  // 1. debt minimum payments with a due day
  for (const d of debts) {
    if (!d.dueDay || d.balance <= 0 || !d.minPayment) continue;
    let due = new Date(today.getFullYear(), today.getMonth(), d.dueDay);
    if (due < today) due.setMonth(due.getMonth() + 1);
    while (due <= horizon) {
      out.push({ id: d.id + "-" + due.toISOString().slice(0, 10), date: new Date(due), text: d.name + " (min payment)", amount: d.minPayment, direction: "cost", source: "debt" });
      due = new Date(due);
      due.setMonth(due.getMonth() + 1);
    }
  }

  // 2. recurring monthly debt-paydown budget — modeled as a lump outflow on the 1st of each covered month
  if (budget > 0) {
    let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    if (cursor < today) cursor.setMonth(cursor.getMonth() + 1);
    while (cursor <= horizon) {
      out.push({ id: "budget-" + cursor.toISOString().slice(0, 10), date: new Date(cursor), text: "Monthly debt paydown budget", amount: budget, direction: "cost", source: "budget" });
      cursor = new Date(cursor);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  // 3. one-time payoff events (windfalls, balloon payments, etc.) — ym + amount
  for (const e of events || []) {
    if (!e.ym || !e.amount) continue;
    const [y, m] = e.ym.split("-").map(Number);
    const date = new Date(y, (m || 1) - 1, 1);
    if (date >= today && date <= horizon) {
      const isIncome = e.amount > 0 && (e.type === "Windfall / sale" || e.type === "Inheritance" || e.type === "Refi cash-out");
      out.push({ id: "event-" + e.id, date, text: e.label || e.type || "Payoff event", amount: Math.abs(e.amount), direction: isIncome ? "income" : "cost", source: "event" });
    }
  }

  // 4. Work board items — dated costs/income, including recurring
  const workFlow = projectWorkCashFlow(workItems, horizonDays);
  for (const w of workFlow) out.push({ ...w, source: "work" });

  out.sort((a, b) => a.date - b.date);
  return out;
}

/* ============================================================
   DASHBOARD TAB
   ============================================================ */

function DashboardTab({ debts, assets, results, txns, budgets, rules, Snapshots, totalDebt, totalOwed, totalAssets, netWorth, totalMin, startYM, budget, events }) {
  // best strategy
  const best = STRATS.reduce((b, s) => {
    const r = results[s.key];
    if (r.infeasible) return b;
    if (!b || r.totalInterest < results[b.key].totalInterest) return s;
    return b;
  }, null);
  const bestR = best ? results[best.key] : null;

  // this month spending vs budget
  const spendThisMonth = useMemo(() => {
    let s = 0;
    for (const t of txns) if (t.ym === startYM && t.amount < 0) s += -t.amount;
    return s;
  }, [txns, startYM]);
  const budgetTotal = Object.values(budgets).reduce((s, v) => s + (v || 0), 0);

  // upcoming payments (next 14 days)
  const today = new Date();
  const upcoming = useMemo(() => {
    const list = [];
    for (const d of debts) {
      if (!d.dueDay || d.balance <= 0) continue;
      const due = new Date(today.getFullYear(), today.getMonth(), d.dueDay);
      if (due < new Date(today.getFullYear(), today.getMonth(), today.getDate())) due.setMonth(due.getMonth() + 1);
      const days = Math.round((due - today) / 86400000);
      list.push({ ...d, due, days });
    }
    return list.sort((a, b) => a.due - b.due);
  }, [debts]);

  const bigNum = { fontFamily: T.mono, fontSize: 30, fontWeight: 600, lineHeight: 1.1 };

  // combined cash flow — debt minimums, monthly paydown budget, payoff events, and Work board (read-only merge)
  const [workItems, setWorkItems] = useState([]);
  useEffect(() => {
    let cancelled = false;
    loadWorkItems().then((items) => { if (!cancelled) setWorkItems(items); });
    return () => { cancelled = true; };
  }, []);
  const fullCashFlow = useMemo(() => projectFullCashFlow(debts, budget, events, workItems, 60), [debts, budget, events, workItems]);
  const upcomingPurchases = fullCashFlow.filter((w) => w.direction === "cost").slice(0, 14);
  const upcomingIncome = fullCashFlow.filter((w) => w.direction === "income").slice(0, 14);

  return (
    <div>
      {/* top row: position */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={{ ...card, borderTop: `4px solid ${netWorth >= 0 ? T.moss : T.rust}` }}>
          <Label>Net worth</Label>
          <div style={{ ...bigNum, color: netWorth >= 0 ? T.moss : T.rust }}>{fmt$(netWorth)}</div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginTop: 6 }}>
            {fmt$(totalAssets)} assets − {fmt$(totalOwed + totalDebt)} debt
          </div>
        </div>
        <div style={{ ...card, borderTop: `4px solid ${T.rust}` }}>
          <Label>Payoff debt</Label>
          <div style={{ ...bigNum, color: T.rust }}>{fmt$(totalDebt)}</div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginTop: 6 }}>
            {fmt$(totalMin)}/mo minimums{totalOwed > 0 ? ` · +${fmt$(totalOwed)} secured (mortgage etc.)` : ""}
          </div>
        </div>
        <div style={{ ...card, borderTop: `4px solid ${best ? best.color : T.line}` }}>
          <Label>Debt-free ({best ? best.label : "—"})</Label>
          <div style={bigNum}>{bestR && !bestR.infeasible ? (bestR.capped ? "50+ yrs" : prettyYM(bestR.debtFree)) : "—"}</div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginTop: 6 }}>
            {bestR && !bestR.infeasible ? `${bestR.months} months · ${fmt$(bestR.totalInterest)} interest` : "set a budget on Payoff Plan"}
          </div>
        </div>
        <div style={{ ...card, borderTop: `4px solid ${T.ochre}` }}>
          <Label>Spent · {prettyYM(startYM)}</Label>
          <div style={{ ...bigNum, color: budgetTotal && spendThisMonth > budgetTotal ? T.rust : T.ink }}>{fmt$(spendThisMonth)}</div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginTop: 6 }}>
            {budgetTotal ? `of ${fmt$(budgetTotal)} budgeted` : "no budget set yet"}
          </div>
        </div>
      </div>

      {/* middle row: accounts + upcoming */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Positions</div>
          <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: T.mono, fontSize: 12 }}>
            <tbody>
              {assets.filter((a) => a.value || a.owed).map((a) => {
                const monthlyInt = a.owed && a.apr ? (a.owed * a.apr) / 1200 : 0;
                return (
                  <tr key={a.id}>
                    <td style={{ padding: "5px 0", borderBottom: `1px dashed ${T.line}` }}>{a.name}</td>
                    <td style={{ textAlign: "right", padding: "5px 0 5px 10px", borderBottom: `1px dashed ${T.line}`, color: T.muted, whiteSpace: "nowrap" }}>
                      {a.owed && a.apr ? `${a.apr}%` : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "5px 0 5px 10px", borderBottom: `1px dashed ${T.line}`, color: T.muted, whiteSpace: "nowrap" }}>
                      {monthlyInt ? fmt$(monthlyInt) + "/mo" : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "5px 0 5px 10px", borderBottom: `1px dashed ${T.line}`, color: T.moss }}>
                      {fmt$((a.value || 0) - (a.owed || 0))}
                      {a.owed ? <span style={{ color: T.muted }}> ({fmt$(a.value)} − {fmt$(a.owed)})</span> : null}
                    </td>
                  </tr>
                );
              })}
              {debts.filter((d) => d.balance > 0).map((d) => {
                const monthlyInt = (d.balance * effApr(d, startYM)) / 1200;
                return (
                  <tr key={d.id}>
                    <td style={{ padding: "5px 0", borderBottom: `1px dashed ${T.line}` }}>{d.name}</td>
                    <td style={{ textAlign: "right", padding: "5px 0 5px 10px", borderBottom: `1px dashed ${T.line}`, color: T.muted, whiteSpace: "nowrap" }}>
                      {effApr(d, startYM)}%
                    </td>
                    <td style={{ textAlign: "right", padding: "5px 0 5px 10px", borderBottom: `1px dashed ${T.line}`, color: T.muted, whiteSpace: "nowrap" }}>
                      {fmt$(monthlyInt)}/mo
                    </td>
                    <td style={{ textAlign: "right", padding: "5px 0 5px 10px", borderBottom: `1px dashed ${T.line}`, color: T.rust }}>−{fmt$(d.balance)}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ padding: "6px 0 0", fontWeight: 700 }}>Total monthly interest</td>
                <td />
                <td style={{ textAlign: "right", padding: "6px 0 0 10px", fontWeight: 700, color: T.rust, whiteSpace: "nowrap" }}>
                  {fmt$(
                    debts.filter((d) => d.balance > 0).reduce((s, d) => s + (d.balance * effApr(d, startYM)) / 1200, 0) +
                    assets.reduce((s, a) => s + (a.owed && a.apr ? (a.owed * a.apr) / 1200 : 0), 0)
                  )}/mo
                </td>
                <td />
              </tr>
            </tbody>
          </table>
          {!assets.some((a) => a.value || a.owed) && (
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginTop: 8 }}>
              Add asset values on the Snapshots tab to complete the picture.
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Upcoming payments</div>
          {upcoming.length === 0 && (
            <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>
              Set due days on the Debts tab and payments will line up here.
            </div>
          )}
          {upcoming.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: "7px 0", borderBottom: `1px dashed ${T.line}`, fontFamily: T.mono, fontSize: 12 }}>
              <span style={{ width: 76, color: d.days <= 3 ? T.rust : T.muted, fontWeight: d.days <= 3 ? 600 : 400 }}>
                {MONTH_NAMES[d.due.getMonth()]} {d.due.getDate()}
              </span>
              <span style={{ flex: 1 }}>{d.name}</span>
              <span style={{ fontWeight: 600 }}>{fmt$(d.minPayment)}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 2,
                color: d.autopay ? T.moss : T.rust, border: `1px solid ${d.autopay ? T.moss : T.rust}`,
              }}>{d.autopay ? "AUTO" : "MANUAL"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* combined cash flow: upcoming purchases + income, all sources */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Upcoming purchases</div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginBottom: 10 }}>
            Debt minimums, monthly paydown budget, payoff events, and Work costs — next 60 days.
          </div>
          {upcomingPurchases.length === 0 && (
            <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>
              Nothing costed and dated yet.
            </div>
          )}
          {upcomingPurchases.map((w) => (
            <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: "7px 0", borderBottom: `1px dashed ${T.line}`, fontFamily: T.mono, fontSize: 12 }}>
              <span style={{ width: 76, color: T.muted }}>
                {MONTH_NAMES[w.date.getMonth()]} {w.date.getDate()}
              </span>
              <span style={{ flex: 1, color: T.ink, fontFamily: T.sans }}>{w.text}</span>
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 2,
                color: T.muted, border: `1px solid ${T.line}`, textTransform: "uppercase",
              }}>{w.source}</span>
              <span style={{ fontWeight: 600, color: T.rust }}>−{fmt$(w.amount)}</span>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Upcoming income</div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginBottom: 10 }}>
            Payoff windfall events and Work income — next 60 days.
          </div>
          {upcomingIncome.length === 0 && (
            <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>
              Nothing dated as income yet.
            </div>
          )}
          {upcomingIncome.map((w) => (
            <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: "7px 0", borderBottom: `1px dashed ${T.line}`, fontFamily: T.mono, fontSize: 12 }}>
              <span style={{ width: 76, color: T.muted }}>
                {MONTH_NAMES[w.date.getMonth()]} {w.date.getDate()}
              </span>
              <span style={{ flex: 1, color: T.ink, fontFamily: T.sans }}>{w.text}</span>
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 2,
                color: T.muted, border: `1px solid ${T.line}`, textTransform: "uppercase",
              }}>{w.source}</span>
              <span style={{ fontWeight: 600, color: T.moss }}>+{fmt$(w.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* cash flow chart — all sources combined */}
      {fullCashFlow.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Cash flow — next 60 days</div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginBottom: 8 }}>
            Running balance from debt minimums, monthly paydown budget, payoff events, and Work — starts at $0, shows the shape of the next 60 days, not your actual bank balance.
          </div>
          <CashFlowChart flow={fullCashFlow} />
        </div>
      )}

      {/* trend */}
      {Snapshots.filter((s) => s.netWorth != null).length > 1 && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Net worth & debt trend</div>
          <TrendChart Snapshots={Snapshots} />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PLAN TAB
   ============================================================ */

function PlanTab({ budget, setBudget, results, totalMin, startYM, events, setEvents }) {
  const feasible = budget >= totalMin;
  const best = STRATS.reduce((b, s) => {
    const r = results[s.key];
    if (r.infeasible) return b;
    if (!b || r.totalInterest < results[b.key].totalInterest) return s;
    return b;
  }, null);

  const addEvent = () =>
    setEvents([...events, { id: "e" + Date.now(), ym: addMonths(startYM, 3), amount: 5000, type: EVENT_TYPES[0], label: "" }]);
  const updEvent = (id, patch) => setEvents(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <div>
      {/* budget input */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ width: 220 }}>
          <Label>Total toward debt each month</Label>
          <Num value={budget} onChange={(v) => setBudget(v || 0)} step={50} />
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, paddingBottom: 8 }}>
          Minimums total {fmt$(totalMin)}/mo · everything above that is extra
        </div>
      </div>

      {/* one-time events */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>One-time payments</div>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 12 }}>
          Balloon payments, refi cash-out, selling something big, inheritance — drops the amount on your debt in that month, on top of the monthly budget.
        </div>
        {events.map((e) => (
          <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: "10px 0", borderBottom: `1px dashed ${T.line}` }}>
            <div style={{ width: 110 }}>
              <Label>Month</Label>
              <input style={inputStyle} placeholder="YYYY-MM" value={e.ym || ""} onChange={(ev) => updEvent(e.id, { ym: ev.target.value })} />
            </div>
            <div style={{ width: 130 }}>
              <Label>Amount</Label>
              <Num value={e.amount} onChange={(v) => updEvent(e.id, { amount: v || 0 })} step={500} />
            </div>
            <div style={{ width: 170 }}>
              <Label>Type</Label>
              <select style={inputStyle} value={e.type} onChange={(ev) => updEvent(e.id, { type: ev.target.value })}>
                {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>Note</Label>
              <input style={inputStyle} placeholder="e.g. sell Duramax" value={e.label || ""} onChange={(ev) => updEvent(e.id, { label: ev.target.value })} />
            </div>
            <button onClick={() => setEvents(events.filter((x) => x.id !== e.id))} style={{ ...btnGhost, color: T.rust, borderColor: T.rust }}>✕</button>
          </div>
        ))}
        <button onClick={addEvent} style={{ ...btnStyle, marginTop: 12 }}>+ Add one-time payment</button>
      </div>

      {!feasible && (
        <div style={{ background: "#F3E2DA", border: `1px solid ${T.rust}`, borderRadius: 4, padding: "12px 16px", fontFamily: T.mono, fontSize: 13, marginBottom: 24 }}>
          Budget is below your combined minimums ({fmt$(totalMin)}/mo). Raise the number above to see a schedule.
        </div>
      )}

      {feasible && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
            {STRATS.map((s) => {
              const r = results[s.key];
              const isBest = best && best.key === s.key;
              return (
                <div key={s.key} style={{ ...card, borderTop: `4px solid ${s.color}`, position: "relative" }}>
                  {isBest && (
                    <div style={{
                      position: "absolute", top: 12, right: 12, transform: "rotate(6deg)",
                      fontFamily: T.mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
                      color: s.color, border: `2px solid ${s.color}`, borderRadius: 3, padding: "3px 7px",
                    }}>LEAST INTEREST</div>
                  )}
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{s.label}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 14 }}>{s.sub}</div>
                  <Label>Debt-free</Label>
                  <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 600, marginBottom: 10 }}>
                    {r.capped ? "50+ yrs" : prettyYM(r.debtFree)}
                  </div>
                  <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                    <div>
                      <Label>Months</Label>
                      <div style={{ fontFamily: T.mono, fontSize: 15 }}>{r.months}</div>
                    </div>
                    <div>
                      <Label>Total interest</Label>
                      <div style={{ fontFamily: T.mono, fontSize: 15, color: T.rust }}>{fmt$(r.totalInterest)}</div>
                    </div>
                  </div>
                  <Label>Payoff order</Label>
                  <div style={{ borderTop: `1px solid ${T.line}` }}>
                    {r.order.map((o, i) => (
                      <div key={o.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: `1px dashed ${T.line}`, fontFamily: T.mono, fontSize: 12 }}>
                        <span style={{ color: T.muted }}>{i + 1}.</span>
                        <span style={{ flex: 1 }}>{o.name}</span>
                        <span style={{ color: s.color, fontWeight: 600 }}>{prettyYM(o.ym)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Balance projection</div>
              <div style={{ display: "flex", gap: 16 }}>
                {STRATS.map((s) => (
                  <span key={s.key} style={{ fontFamily: T.mono, fontSize: 11, color: s.color }}>— {s.label}</span>
                ))}
              </div>
            </div>
            <ProjectionChart results={results} startYM={startYM} events={events} />
          </div>
        </>
      )}
    </div>
  );
}

function ProjectionChart({ results, startYM, events = [] }) {
  const W = 1000, H = 300, PAD = { l: 60, r: 16, t: 16, b: 30 };
  const allSeries = STRATS.map((s) => ({ ...s, series: results[s.key].series || [] })).filter((s) => s.series.length > 1);
  if (!allSeries.length) return null;
  const maxMonths = Math.max(...allSeries.map((s) => s.series.length - 1));
  const maxVal = Math.max(...allSeries.flatMap((s) => s.series.map((p) => p.total)));
  const x = (i) => PAD.l + (i / maxMonths) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - v / maxVal) * (H - PAD.t - PAD.b);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal);
  const xTickEvery = maxMonths > 48 ? 12 : 6;
  const xTicks = [];
  for (let i = 0; i <= maxMonths; i += xTickEvery) xTicks.push(i);

  const monthIndex = (ym) => {
    const [y1, m1] = startYM.split("-").map(Number);
    const [y2, m2] = (ym || "").split("-").map(Number);
    if (!y2) return -1;
    return (y2 - y1) * 12 + (m2 - m1);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", marginTop: 8 }} role="img" aria-label="Debt balance projection by strategy">
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={T.line} strokeWidth="1" />
          <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fontFamily={T.mono} fill={T.muted}>{fmt$(v)}</text>
        </g>
      ))}
      {xTicks.map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fontFamily={T.mono} fill={T.muted}>
          {prettyYM(addMonths(startYM, i))}
        </text>
      ))}
      {events.filter((e) => e.amount > 0).map((e) => {
        const i = monthIndex(e.ym);
        if (i < 1 || i > maxMonths) return null;
        return (
          <g key={e.id}>
            <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={H - PAD.b} stroke={T.ochre} strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={x(i)} y={PAD.t + 10} textAnchor="middle" fontSize="9" fontFamily={T.mono} fill={T.ochre}>
              +{fmt$(e.amount)}
            </text>
          </g>
        );
      })}
      {allSeries.map((s) => (
        <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2.5"
          points={s.series.map((p, i) => `${x(i)},${y(p.total)}`).join(" ")} />
      ))}
    </svg>
  );
}

/* ============================================================
   DEBTS TAB
   ============================================================ */

function DebtsTab({ debts, setDebts }) {
  const upd = (id, patch) => setDebts(debts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const remove = (id) => setDebts(debts.filter((d) => d.id !== id));
  const add = () =>
    setDebts([...debts, { id: "d" + Date.now(), name: "New debt", balance: 0, apr: 0, minPayment: 0, dueDay: null, autopay: false, note: "" }]);

  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, marginBottom: 16 }}>
        Update balances here during your weekly review. For 0% promo cards, set APR to 0, then fill in the rate it jumps to and the month the promo ends (YYYY-MM). Due day is the day of the month the payment is owed.
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {debts.map((d) => (
          <div key={d.id} style={{ ...card, padding: 14, borderLeft: `4px solid ${d.balance > 0 ? T.rust : T.moss}` }}>
            {/* row 1 */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ flex: "2 1 220px", minWidth: 200 }}>
                <Label>Account</Label>
                <input style={inputStyle} value={d.name} onChange={(e) => upd(d.id, { name: e.target.value })} />
              </div>
              <div style={{ flex: "0 0 140px" }}>
                <Label>Balance</Label>
                <Num value={d.balance} onChange={(v) => upd(d.id, { balance: v || 0 })} step={100} />
              </div>
              <div style={{ flex: "0 0 110px" }}>
                <Label>APR %</Label>
                <Num value={d.apr} onChange={(v) => upd(d.id, { apr: v || 0 })} step={0.01} />
              </div>
              <div style={{ flex: "0 0 120px" }}>
                <Label>Min / mo</Label>
                <Num value={d.minPayment} onChange={(v) => upd(d.id, { minPayment: v || 0 })} step={10} />
              </div>
              <button onClick={() => remove(d.id)} style={{ ...btnGhost, color: T.rust, borderColor: T.rust }}>✕</button>
            </div>
            {/* row 2 */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 100px" }}>
                <Label>Due day</Label>
                <Num value={d.dueDay} onChange={(v) => upd(d.id, { dueDay: v ? Math.min(31, Math.max(1, Math.round(v))) : null })} min={1} />
              </div>
              <div style={{ flex: "0 0 100px", paddingBottom: 7 }}>
                <label style={{ fontFamily: T.mono, fontSize: 12, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!d.autopay} onChange={(e) => upd(d.id, { autopay: e.target.checked })} />
                  Autopay
                </label>
              </div>
              <div style={{ flex: "0 0 150px" }}>
                <Label>APR after promo</Label>
                <Num value={d.aprAfter} onChange={(v) => upd(d.id, { aprAfter: v })} step={0.01} />
              </div>
              <div style={{ flex: "0 0 120px" }}>
                <Label>Promo ends</Label>
                <input style={inputStyle} placeholder="YYYY-MM" value={d.promoEnd || ""} onChange={(e) => upd(d.id, { promoEnd: e.target.value })} />
              </div>
              <div style={{ flex: "1 1 180px" }}>
                <Label>Note</Label>
                <input style={inputStyle} value={d.note || ""} onChange={(e) => upd(d.id, { note: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={add} style={{ ...btnStyle, marginTop: 16 }}>+ Add debt</button>
    </div>
  );
}

/* ============================================================
   BUDGET TAB
   ============================================================ */

function BudgetTab({ txns, rules, budgets, setBudgets, categories, startYM }) {
  // per-category monthly totals. Income is positive/additive and sorted first.
  const byCatMonth = useMemo(() => {
    const m = {};
    for (const t of txns) {
      const cat = displayCategoryForTxn(t, rules);
      m[cat] = m[cat] || {};
      m[cat][t.ym] = (m[cat][t.ym] || 0) + categoryAmount(t);
    }
    return m;
  }, [txns, rules]);

  // last 3 complete months (exclude current)
  const histMonths = useMemo(() => {
    const set = new Set();
    for (const cat of Object.keys(byCatMonth)) for (const ym of Object.keys(byCatMonth[cat])) set.add(ym);
    return Array.from(set).filter((ym) => ym < startYM).sort().slice(-3);
  }, [byCatMonth, startYM]);

  const cats = useMemo(() => {
    const set = new Set([...categories, ...Object.keys(byCatMonth), ...Object.keys(budgets)]);
    return Array.from(set).sort(categorySort);
  }, [byCatMonth, budgets, categories]);

  const avgOf = (cat) => {
    if (!histMonths.length) return 0;
    return histMonths.reduce((s, ym) => s + (byCatMonth[cat]?.[ym] || 0), 0) / histMonths.length;
  };
  const thisMonthOf = (cat) => byCatMonth[cat]?.[startYM] || 0;

  const budgetIncomeCats = cats.filter(isIncomeCategory);
  const budgetExpenseCats = cats.filter((c) => !isIncomeCategory(c) && !isTransferCategory(c));
  const incomeAvg = budgetIncomeCats.reduce((s, c) => s + avgOf(c), 0);
  const expenseAvg = budgetExpenseCats.reduce((s, c) => s + avgOf(c), 0);
  const totalAvg = incomeAvg - expenseAvg;
  const incomeBudget = budgetIncomeCats.reduce((s, c) => s + (budgets[c] || 0), 0);
  const expenseBudget = budgetExpenseCats.reduce((s, c) => s + (budgets[c] || 0), 0);
  const totalBudget = incomeBudget - expenseBudget;
  const incomeActual = budgetIncomeCats.reduce((s, c) => s + thisMonthOf(c), 0);
  const expenseActual = budgetExpenseCats.reduce((s, c) => s + thisMonthOf(c), 0);
  const totalActual = incomeActual - expenseActual;
  const totalLeft = totalActual - totalBudget;

  const [newCat, setNewCat] = useState("");

  const th = { textAlign: "right", padding: "6px 10px", borderBottom: `2px solid ${T.ink}`, whiteSpace: "nowrap" };

  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, marginBottom: 16 }}>
        {histMonths.length
          ? `Averages come from your last ${histMonths.length} full months of imported activity (${histMonths.map(prettyYM).join(", ")}).`
          : "No imported activity yet. Upload CSVs on the Spending tab and averages fill in here."}{" "}
        Income is additive and stays at the top. Expense categories subtract from net cash flow.
      </div>

      <div style={{ ...card, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: T.mono, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Category</th>
              <th style={th}>Avg / mo</th>
              <th style={th}>Budget</th>
              <th style={th}>{prettyYM(startYM)} actual</th>
              <th style={th}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => {
              const isIncome = isIncomeCategory(c);
              const b = budgets[c] || 0;
              const act = thisMonthOf(c);
              const left = isIncome ? act - b : b - act;
              return (
                <tr key={c}>
                  <td style={{ padding: "6px 10px", borderBottom: `1px dashed ${T.line}`, color: isIncome ? T.moss : c === "Uncategorized" ? T.muted : T.ink, fontWeight: isIncome ? 600 : 400 }}>{c}</td>
                  <td style={{ textAlign: "right", padding: "6px 10px", borderBottom: `1px dashed ${T.line}`, color: isIncome ? T.moss : T.muted }}>{fmt$(avgOf(c))}</td>
                  <td style={{ textAlign: "right", padding: "4px 10px", borderBottom: `1px dashed ${T.line}` }}>
                    <Num value={budgets[c] ?? null} onChange={(v) => setBudgets({ ...budgets, [c]: v || 0 })} step={25} width={100} />
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 10px", borderBottom: `1px dashed ${T.line}`, color: isIncome ? T.moss : T.ink }}>{fmt$(act)}</td>
                  <td style={{ textAlign: "right", padding: "6px 10px", borderBottom: `1px dashed ${T.line}`, color: b ? (left >= 0 ? T.moss : T.rust) : T.muted, fontWeight: 600 }}>
                    {b ? fmt$(left) : "·"}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td style={{ padding: "8px 10px", fontWeight: 600, borderTop: `2px solid ${T.ink}` }}>NET</td>
              <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, borderTop: `2px solid ${T.ink}`, color: totalAvg >= 0 ? T.moss : T.rust }}>{fmt$(totalAvg)}</td>
              <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, borderTop: `2px solid ${T.ink}`, color: totalBudget >= 0 ? T.moss : T.rust }}>{fmt$(totalBudget)}</td>
              <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, borderTop: `2px solid ${T.ink}`, color: totalActual >= 0 ? T.moss : T.rust }}>{fmt$(totalActual)}</td>
              <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, borderTop: `2px solid ${T.ink}`, color: totalLeft >= 0 ? T.moss : T.rust }}>
                {Object.keys(budgets).length ? fmt$(totalLeft) : "·"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ width: 200 }}>
          <Label>Add budget category</Label>
          <input style={inputStyle} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Melody & dates" />
        </div>
        <button style={btnStyle} onClick={() => { if (newCat.trim()) { setBudgets({ ...budgets, [newCat.trim()]: 0 }); setNewCat(""); } }}>Add</button>
      </div>
    </div>
  );
}

/* ============================================================
   SPENDING TAB
   ============================================================ */

function SpendingTab({ txns, setTxns, rules, setRules, budgets, setBudgets, categories, setCategories }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState("");
  const [newKw, setNewKw] = useState("");
  const [newCat, setNewCat] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [detail, setDetail] = useState(null); // { category, ym }

  const categoryOptions = useMemo(
    () => getAllCategories(txns, rules, budgets, categories, false),
    [txns, rules, budgets, categories]
  );

  const rememberCategory = (cat) => {
    const clean = (cat || "").trim();
    if (!clean || clean === INCOME_CATEGORY || clean === "Uncategorized") return clean;
    if (!categoryOptions.includes(clean)) setCategories([...categories, clean].sort(categorySort));
    return clean;
  };

  const renameCategory = (oldCat, newCatRaw) => {
    const newCat = (newCatRaw || "").trim();
    if (!oldCat || !newCat || oldCat === newCat || oldCat === INCOME_CATEGORY) return;
    rememberCategory(newCat);
    setCategories(Array.from(new Set(categories.map((c) => c === oldCat ? newCat : c).concat(newCat))).sort(categorySort));
    setRules(rules.map((r) => r.category === oldCat ? { ...r, category: newCat } : r));
    setTxns(txns.map((t) => t.category === oldCat ? { ...t, category: newCat } : t));
    const nextBudgets = { ...budgets };
    if (nextBudgets[oldCat] != null) {
      nextBudgets[newCat] = (nextBudgets[newCat] || 0) + nextBudgets[oldCat];
      delete nextBudgets[oldCat];
      setBudgets(nextBudgets);
    }
    if (detail?.category === oldCat) setDetail({ ...detail, category: newCat });
  };

  const deleteCategory = (cat) => {
    if (!cat || cat === INCOME_CATEGORY || cat === "Uncategorized") return;
    if (!confirm(`Delete category "${cat}"? Matching rules will be removed and manual transactions will become Uncategorized.`)) return;
    setCategories(categories.filter((c) => c !== cat));
    setRules(rules.filter((r) => r.category !== cat));
    setTxns(txns.map((t) => t.category === cat ? { ...t, category: "Uncategorized" } : t));
    const nextBudgets = { ...budgets };
    delete nextBudgets[cat];
    setBudgets(nextBudgets);
    if (detail?.category === cat) setDetail(null);
  };

  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    let added = 0, skipped = 0, updatedDates = 0;
    const notes = [];
    let next = [...txns];
    for (const f of files) {
      const text = await f.text();
      const rows = parseCSV(text);
      if (rows.length < 2) continue;
      const cols = detectColumns(rows[0]);
      if (cols.date < 0 || (cols.amount < 0 && cols.debit < 0)) {
        notes.push(`Couldn't find date/amount columns in ${f.name} (headers: ${rows[0].join(", ")})`);
        continue;
      }
      // first pass: parse raw amounts to detect sign convention per file
      const parsed = [];
      for (const r of rows.slice(1)) {
        const dateParts = parseDateParts(r[cols.date] || "");
        if (!dateParts) { skipped++; continue; }
        const ym = dateParts.ym;
        const date = dateParts.date;
        let amt;
        if (cols.amount >= 0) {
          amt = parseFloat((r[cols.amount] || "").replace(/[$,()]/g, (m) => (m === "(" ? "-" : m === ")" ? "" : "")));
        } else {
          const deb = parseFloat((r[cols.debit] || "0").replace(/[$,]/g, "")) || 0;
          const cred = cols.credit >= 0 ? parseFloat((r[cols.credit] || "0").replace(/[$,]/g, "")) || 0 : 0;
          amt = cred - deb;
        }
        if (isNaN(amt) || amt === 0) { skipped++; continue; }
        const desc = cols.desc >= 0 ? (r[cols.desc] || "").trim() : "";
        parsed.push({ date, ym, desc, amt });
      }
      // auto-detect: bank exports show spending negative; credit card exports
      // often show charges positive. If positives heavily outnumber negatives,
      // flip so that negative always = money out.
      const pos = parsed.filter((p) => p.amt > 0).length;
      const neg = parsed.length - pos;
      const flip = pos > neg * 2;
      if (flip) notes.push(`${f.name}: charges were positive — flipped so spending reads as money out.`);
      for (const p of parsed) {
        const amount = flip ? -p.amt : p.amt;
        const key = makeTxnKey({ date: p.date, ym: p.ym, desc: p.desc, amount, source: f.name });
        const existingIdx = next.findIndex((t) =>
          t.key === key ||
          duplicateKeyForTxn(t) === key ||
          isSameLegacyTxn(t, p, amount, f.name)
        );
        if (existingIdx >= 0) {
          if (!next[existingIdx].date && p.date) {
            next[existingIdx] = { ...next[existingIdx], date: p.date, ym: p.ym };
            updatedDates++;
          }
          skipped++;
          continue;
        }
        next.push({ key, date: p.date, ym: p.ym, desc: p.desc, amount, source: f.name });
        added++;
      }
    }
    setTxns(next);
    setStatus([`Added ${added} transactions${skipped ? `, skipped ${skipped} (duplicates or unreadable)` : ""}${updatedDates ? `, repaired ${updatedDates} missing date${updatedDates === 1 ? "" : "s"}` : ""}.`, ...notes].join(" "));
    if (fileRef.current) fileRef.current.value = "";
  };

  const byMonth = useMemo(() => {
    const m = {};
    for (const t of txns) {
      const cat = displayCategoryForTxn(t, rules);
      m[t.ym] = m[t.ym] || {};
      m[t.ym][cat] = (m[t.ym][cat] || 0) + categoryAmount(t);
    }
    return m;
  }, [txns, rules]);

  const allMonths = Object.keys(byMonth).sort().reverse();
  const months = selectedMonth === "all" ? allMonths : allMonths.filter((ym) => ym === selectedMonth);
  const cats = useMemo(() => {
    const set = new Set(categories);
    for (const ym of months) for (const c of Object.keys(byMonth[ym] || {})) set.add(c);
    return Array.from(set).sort(categorySort);
  }, [byMonth, months, categories]);

  const addRule = () => {
    const cat = rememberCategory(newCat);
    if (!newKw.trim() || !cat) return;
    setRules([...rules, { keyword: newKw.trim(), category: cat }]);
    setNewKw(""); setNewCat("");
  };

  // group uncategorized outflows by merchant for quick rule creation. Income is auto-categorized.
  const uncat = useMemo(() => {
    const groups = {};
    for (const t of txns) {
      if (t.amount >= 0) continue;
      if (selectedMonth !== "all" && t.ym !== selectedMonth) continue;
      if (categoryForTxn(t, rules) !== "Uncategorized") continue;
      const kw = merchantKey(t.desc);
      groups[kw] = groups[kw] || { kw, sample: t.desc, count: 0, total: 0 };
      groups[kw].count++;
      groups[kw].total += -t.amount;
    }
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [txns, rules, selectedMonth]);

  const updateTxn = (key, patch) => setTxns(txns.map((t) => t.key === key ? { ...t, ...patch } : t));

  const incomeCats = useMemo(() => cats.filter(isIncomeCategory), [cats]);
  const transferCats = useMemo(() => cats.filter(isTransferCategory), [cats]);
  const expenseCats = useMemo(() => cats.filter((c) => !isIncomeCategory(c) && !isTransferCategory(c)), [cats]);

  const sumCatForMonths = (cat, monthList = months) =>
    monthList.reduce((s, m) => s + (byMonth[m]?.[cat] || 0), 0);

  const sumCatsForMonth = (catList, ym) =>
    catList.reduce((s, c) => s + (byMonth[ym]?.[c] || 0), 0);

  const sumCatsForMonths = (catList, monthList = months) =>
    monthList.reduce((s, m) => s + sumCatsForMonth(catList, m), 0);

  const buildSpendingRows = () => {
    const header = ["Category", ...months.map(prettyYM), "Total"];
    const rows = [header];

    const addCategoryRows = (catList) => {
      for (const c of catList) {
        const vals = months.map((m) => byMonth[m]?.[c] || 0);
        rows.push([c, ...vals.map((v) => v ? v.toFixed(2) : ""), vals.reduce((s, v) => s + v, 0).toFixed(2)]);
      }
    };

    addCategoryRows(incomeCats);
    rows.push(["TOTAL INCOME", ...months.map((m) => sumCatsForMonth(incomeCats, m).toFixed(2)), sumCatsForMonths(incomeCats).toFixed(2)]);
    rows.push([""]);
    addCategoryRows(expenseCats);
    rows.push(["TOTAL EXPENSES", ...months.map((m) => sumCatsForMonth(expenseCats, m).toFixed(2)), sumCatsForMonths(expenseCats).toFixed(2)]);
    rows.push([""]);
    addCategoryRows(transferCats);
    rows.push(["TOTAL TRANSFERS", ...months.map((m) => sumCatsForMonth(transferCats, m).toFixed(2)), sumCatsForMonths(transferCats).toFixed(2)]);

    const netVals = months.map((m) => sumCatsForMonth(incomeCats, m) - sumCatsForMonth(expenseCats, m));
    rows.push(["NET", ...netVals.map((v) => v.toFixed(2)), netVals.reduce((s, v) => s + v, 0).toFixed(2)]);
    return rows;
  };

  const exportSpendingCsv = () => {
    const suffix = selectedMonth === "all" ? "all-months" : selectedMonth;
    downloadText(`income-spending-by-category-${suffix}.csv`, rowsToCsv(buildSpendingRows()), "text/csv");
  };

  const printSpendingReport = () => {
    printRows(`Income and spending by category — ${selectedMonth === "all" ? "All months" : prettyYM(selectedMonth)}`, buildSpendingRows(), 1);
  };

  const cleanAmazonDuplicates = () => {
    const result = dedupeAmazonDetailTransactions(txns);
    setTxns(result.txns);
    setStatus(result.removed
      ? `Removed ${result.removed} Amazon duplicate${result.removed === 1 ? "" : "s"}: ${result.removedDetail} repeated detail row${result.removedDetail === 1 ? "" : "s"}, ${result.removedGeneric} generic card charge${result.removedGeneric === 1 ? "" : "s"} already covered by Amazon detail.`
      : "No Amazon duplicates found.");
  };

  const detailTxns = useMemo(() => {
    if (!detail) return [];
    return txns
      .filter((t) => detail.all || displayCategoryForTxn(t, rules) === detail.category)
      .filter((t) => !detail.ym || detail.ym === "all" || t.ym === detail.ym)
      .sort((a, b) => ((b.date || b.ym || "").localeCompare(a.date || a.ym || "")) || (a.desc || "").localeCompare(b.desc || ""));
  }, [txns, rules, detail]);

  const openDetail = (category, ym = selectedMonth) => setDetail({ category, ym: ym || "all" });
  const openAllTransactions = () => setDetail({ category: "All transactions", ym: selectedMonth || "all", all: true });

  const renderCategoryRow = (c) => {
    const isIncome = isIncomeCategory(c);
    const isTransfer = isTransferCategory(c);
    const total = sumCatForMonths(c);
    const color = isIncome ? T.moss : isTransfer ? T.muted : c === "Uncategorized" ? T.muted : T.ink;
    return (
      <tr key={c}>
        <td style={{ padding: "6px 10px", borderBottom: `1px dashed ${T.line}` }}>
          <button
            onClick={() => openDetail(c, selectedMonth)}
            style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: T.mono, fontSize: 12, color, fontWeight: isIncome ? 600 : 400, textDecoration: "underline" }}
          >
            {c}
          </button>
        </td>
        {months.map((ym) => {
          const val = byMonth[ym]?.[c] || 0;
          return (
            <td key={ym} style={{ textAlign: "right", padding: "6px 10px", borderBottom: `1px dashed ${T.line}`, color }}>
              {val ? (
                <button
                  onClick={() => openDetail(c, ym)}
                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: T.mono, fontSize: 12, color, textDecoration: "underline" }}
                >
                  {fmt$(val)}
                </button>
              ) : "·"}
            </td>
          );
        })}
        <td style={{ textAlign: "right", padding: "6px 10px", borderBottom: `1px dashed ${T.line}`, fontWeight: 600, color }}>
          {total ? (
            <button
              onClick={() => openDetail(c, selectedMonth === "all" ? "all" : selectedMonth)}
              style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: T.mono, fontSize: 12, fontWeight: 600, color, textDecoration: "underline" }}
            >
              {fmt$(total)}
            </button>
          ) : "·"}
        </td>
      </tr>
    );
  };

  const renderSectionTotalRow = (label, catList, opts = {}) => {
    const isNet = opts.net;
    const borderTop = opts.borderTop || `2px solid ${T.ink}`;
    const vals = months.map((ym) => isNet ? sumCatsForMonth(incomeCats, ym) - sumCatsForMonth(expenseCats, ym) : sumCatsForMonth(catList, ym));
    const total = vals.reduce((s, v) => s + v, 0);
    const color = isNet ? (total >= 0 ? T.moss : T.rust) : (opts.color || T.ink);
    return (
      <tr key={label}>
        <td style={{ padding: "8px 10px", fontWeight: 800, borderTop }}>{label}</td>
        {vals.map((v, i) => (
          <td key={months[i]} style={{ textAlign: "right", padding: "8px 10px", fontWeight: 800, borderTop, color }}>
            {fmt$(v)}
          </td>
        ))}
        <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 800, borderTop, color }}>
          {fmt$(total)}
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={() => fileRef.current?.click()} style={btnStyle}>Upload bank CSVs</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" multiple style={{ display: "none" }} onChange={onFile} />
        <div style={{ width: 180 }}>
          <Label>Month filter</Label>
          <select style={inputStyle} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="all">All months</option>
            {allMonths.map((ym) => <option key={ym} value={ym}>{prettyYM(ym)}</option>)}
          </select>
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>
          Click any category or amount to open line-item detail.
        </span>
        {months.length > 0 && (
          <>
            <button onClick={exportSpendingCsv} style={btnGhost}>Export CSV</button>
            <button onClick={printSpendingReport} style={btnGhost}>Print / Save PDF</button>
            <button onClick={openAllTransactions} style={btnGhost}>Open all transactions</button>
          </>
        )}
        {txns.some((t) => isAmazonDetailTxn(t) || isGenericAmazonMerchantTxn(t)) && (
          <button onClick={cleanAmazonDuplicates} style={btnGhost}>Clean Amazon duplicates</button>
        )}
        {txns.length > 0 && (
          <button onClick={() => { if (confirm("Clear all imported transactions?")) setTxns([]); }} style={{ ...btnGhost, color: T.rust, borderColor: T.rust }}>
            Clear all ({txns.length})
          </button>
        )}
      </div>
      {status && <div style={{ fontFamily: T.mono, fontSize: 12, color: T.moss, marginBottom: 16 }}>{status}</div>}

      {allMonths.length === 0 && (
        <div style={{ ...card, borderStyle: "dashed", padding: 32, textAlign: "center", fontFamily: T.mono, fontSize: 13, color: T.muted, marginTop: 12 }}>
          No transactions yet. Export CSVs from all online accounts. Duplicates are skipped automatically, so re-uploading overlapping date ranges is safe.
        </div>
      )}

      {months.length > 0 && (
        <div style={{ ...card, marginTop: 12, overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Income and spending by category</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={exportSpendingCsv} style={{ ...btnGhost, fontSize: 11, padding: "6px 10px" }}>CSV</button>
              <button onClick={printSpendingReport} style={{ ...btnGhost, fontSize: 11, padding: "6px 10px" }}>Print/PDF</button>
              <button onClick={openAllTransactions} style={{ ...btnGhost, fontSize: 11, padding: "6px 10px" }}>All txns</button>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted }}>{selectedMonth === "all" ? "All months" : prettyYM(selectedMonth)}</div>
            </div>
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: T.mono, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${T.ink}` }}>Category</th>
                {months.map((ym) => (
                  <th key={ym} style={{ textAlign: "right", padding: "6px 10px", borderBottom: `2px solid ${T.ink}`, whiteSpace: "nowrap" }}>{prettyYM(ym)}</th>
                ))}
                <th style={{ textAlign: "right", padding: "6px 10px", borderBottom: `2px solid ${T.ink}`, whiteSpace: "nowrap" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {incomeCats.map(renderCategoryRow)}
              {renderSectionTotalRow("TOTAL INCOME", incomeCats, { color: T.moss })}
              {expenseCats.map(renderCategoryRow)}
              {renderSectionTotalRow("TOTAL EXPENSES", expenseCats, { color: T.rust })}
              {transferCats.map(renderCategoryRow)}
              {transferCats.length > 0 && renderSectionTotalRow("TOTAL TRANSFERS", transferCats, { color: T.muted })}
              {renderSectionTotalRow("NET", [], { net: true })}
            </tbody>
          </table>
        </div>
      )}

      {uncat.length > 0 && (
        <div style={{ ...card, marginTop: 16, borderLeft: `4px solid ${T.ochre}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Uncategorized ({uncat.length} merchants)</div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 12 }}>
            Type a category, then choose Categorize only for a one-time cleanup or Add rule + categorize for this merchant going forward.
          </div>
          {uncat.map((g) => (
            <UncatRow
              key={g.kw}
              group={g}
              categories={categoryOptions}
              onAddRule={(kw, catRaw) => {
                const cat = rememberCategory(catRaw);
                setRules([...rules, { keyword: kw, category: cat }]);
              }}
              onCategorize={(kw, catRaw) => {
                const cat = rememberCategory(catRaw);
                setTxns(txns.map((t) =>
                  t.amount < 0 &&
                  categoryForTxn(t, rules) === "Uncategorized" &&
                  t.desc.toLowerCase().includes(kw.toLowerCase())
                    ? { ...t, category: cat }
                    : t
                ));
              }}
            />
          ))}
        </div>
      )}

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Categories</div>
          <button style={{ ...btnGhost, fontSize: 11 }} onClick={() => setShowCategories(!showCategories)}>{showCategories ? "Hide" : "Show"}</button>
        </div>
        {showCategories && (
          <CategoryManager
            categories={categoryOptions}
            onAdd={(cat) => rememberCategory(cat)}
            onRename={renameCategory}
            onDelete={deleteCategory}
          />
        )}
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Category rules</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowRules(!showRules)} style={{ ...btnGhost, fontSize: 11 }}>
              {showRules ? "Hide rules" : `Show rules (${rules.length})`}
            </button>
            <button
              onClick={() => { if (confirm("Replace your current rules with the built-in defaults? Custom rules you've added will be lost.")) setRules(SEED_RULES); }}
              style={{ ...btnGhost, fontSize: 11 }}
            >
              Reset to defaults ({SEED_RULES.length})
            </button>
          </div>
        </div>
        {showRules && (
          <>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 12 }}>
              If a transaction description contains the keyword, it gets the category. First match wins. Category fields use your existing category list, plus one open add-new option.
            </div>
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              {rules.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderBottom: `1px dashed ${T.line}`, paddingBottom: 8 }}>
                  <input
                    style={{ ...inputStyle, width: 240 }}
                    value={r.keyword}
                    onChange={(e) => setRules(rules.map((x, j) => j === i ? { ...x, keyword: e.target.value } : x))}
                  />
                  <div style={{ width: 240 }}>
                    <CategorySelect
                      value={r.category}
                      categories={categoryOptions}
                      onChange={(catRaw) => {
                        const cat = rememberCategory(catRaw);
                        setRules(rules.map((x, j) => j === i ? { ...x, category: cat } : x));
                      }}
                    />
                  </div>
                  <button onClick={() => setRules(rules.filter((_, j) => j !== i))}
                    style={{ ...btnGhost, color: T.rust, borderColor: T.rust }}>Delete</button>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
          <div style={{ width: 180 }}>
            <Label>Keyword</Label>
            <input style={inputStyle} value={newKw} onChange={(e) => setNewKw(e.target.value)} placeholder="e.g. tractor supply" />
          </div>
          <div style={{ width: 240 }}>
            <Label>Category</Label>
            <CategorySelect value={newCat} onChange={(cat) => setNewCat(rememberCategory(cat))} categories={categoryOptions} placeholder="Choose or add" />
          </div>
          <button onClick={addRule} style={btnStyle}>Add rule</button>
        </div>
      </div>

      {detail && (
        <CategoryDetailWindow
          detail={detail}
          setDetail={setDetail}
          txns={detailTxns}
          allMonths={allMonths}
          categories={categoryOptions}
          rememberCategory={rememberCategory}
          rules={rules}
          updateTxn={updateTxn}
          deleteTxn={(key) => setTxns(txns.filter((t) => t.key !== key))}
        />
      )}
    </div>
  );
}

function UncatRow({ group, categories, onAddRule, onCategorize }) {
  const [kw, setKw] = useState(group.kw);
  const [cat, setCat] = useState("");
  const canSave = kw.trim() && cat.trim();
  const saveCategoryOnly = () => {
    if (!canSave) return;
    onCategorize(kw.trim(), cat.trim());
    setCat("");
  };
  const saveRuleAndCategorize = () => {
    if (!canSave) return;
    onAddRule(kw.trim(), cat.trim());
    setCat("");
  };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: "8px 0", borderBottom: `1px dashed ${T.line}` }}>
      <div style={{ flex: "1 1 200px", minWidth: 180 }}>
        <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600 }}>{group.sample.split(/\s{2,}/)[0]}</div>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted }}>
          {group.count} txn{group.count > 1 ? "s" : ""} · {fmt$(group.total)}
        </div>
      </div>
      <div style={{ flex: "0 0 170px" }}>
        <Label>Keyword</Label>
        <input style={inputStyle} value={kw} onChange={(e) => setKw(e.target.value)} />
      </div>
      <div style={{ flex: "0 0 240px" }}>
        <Label>Category</Label>
        <CategorySelect
          value={cat}
          onChange={setCat}
          categories={categories}
          placeholder="Choose or add"
        />
      </div>
      <button style={btnGhost} disabled={!canSave} onClick={saveCategoryOnly}>
        Categorize only
      </button>
      <button style={btnStyle} disabled={!canSave} onClick={saveRuleAndCategorize}>
        Add rule + categorize
      </button>
    </div>
  );
}

function CategoryManager({ categories, onAdd, onRename, onDelete }) {
  const [newCat, setNewCat] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const visible = (categories || []).filter((c) => c && c !== INCOME_CATEGORY && c !== "Uncategorized").sort(categorySort);
  const add = () => {
    const c = newCat.trim();
    if (!c) return;
    onAdd(c);
    setNewCat("");
  };
  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 12 }}>
        Rename or delete categories here. Renames update manual transactions, rules, and budgets.
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ width: 220 }}>
          <Label>New category</Label>
          <input style={inputStyle} value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="e.g. Wood business" />
        </div>
        <button style={btnStyle} onClick={add}>Add category</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {visible.map((c) => (
          <div key={c} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderBottom: `1px dashed ${T.line}`, paddingBottom: 8 }}>
            {editing === c ? (
              <>
                <input style={{ ...inputStyle, width: 240 }} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onRename(c, draft); setEditing(null); } }} />
                <button style={btnStyle} onClick={() => { onRename(c, draft); setEditing(null); }}>Save</button>
                <button style={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex: "1 1 240px", fontFamily: T.mono, fontSize: 12 }}>{c}</span>
                <button style={btnGhost} onClick={() => { setEditing(c); setDraft(c); }}>Edit</button>
                <button style={{ ...btnGhost, color: T.rust, borderColor: T.rust }} onClick={() => onDelete(c)}>Delete</button>
              </>
            )}
          </div>
        ))}
        {visible.length === 0 && <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>No custom categories yet.</div>}
      </div>
    </div>
  );
}

function CategoryDetailWindow({ detail, setDetail, txns, allMonths, categories, rememberCategory, rules, updateTxn, deleteTxn }) {
  const [ym, setYm] = useState(detail.ym || "all");
  useEffect(() => setYm(detail.ym || "all"), [detail.ym]);
  const visible = txns.filter((t) => ym === "all" || t.ym === ym);
  const total = visible.reduce((s, t) => s + t.amount, 0);
  const title = detail.all ? "All transactions" : detail.category;
  const buildDetailRows = () => [
    ["Date", "Description", "Amount", "Category", "Source"],
    ...visible.map((t) => [
      t.date || "",
      t.desc || "",
      Number(t.amount || 0).toFixed(2),
      t.category || displayCategoryForTxn(t, rules),
      t.source || ""
    ])
  ];
  const exportDetailCsv = () => {
    const safeCat = String(title || "transactions").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const suffix = ym === "all" ? "all-months" : ym;
    downloadText(`${safeCat || "transactions"}-${suffix}.csv`, rowsToCsv(buildDetailRows()), "text/csv");
  };
  const printDetail = () => {
    printRows(`${title} — ${ym === "all" ? "All months" : prettyYM(ym)}`, buildDetailRows(), 2);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(35,42,32,0.45)", zIndex: 1000, padding: 24, overflow: "auto" }}>
      <div style={{ background: T.panel, border: `2px solid ${T.ink}`, borderRadius: 4, maxWidth: 1100, margin: "0 auto", padding: 18, boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em" }}>{detail.all ? "ALL TRANSACTIONS" : "CATEGORY DETAIL WINDOW"}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
            <div style={{ fontFamily: T.mono, fontSize: 12, color: total >= 0 ? T.moss : T.rust }}>{visible.length} lines · signed total {fmtCents(total)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ width: 170 }}>
              <Label>Month</Label>
              <select style={inputStyle} value={ym} onChange={(e) => setYm(e.target.value)}>
                <option value="all">All months</option>
                {allMonths.map((m) => <option key={m} value={m}>{prettyYM(m)}</option>)}
              </select>
            </div>
            <button style={btnGhost} onClick={exportDetailCsv}>Export CSV</button>
            <button style={btnGhost} onClick={printDetail}>Print / Save PDF</button>
            <button style={btnGhost} onClick={() => setDetail(null)}>Close</button>
          </div>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 10 }}>
          Date is editable. Amount is locked to the imported CSV value. If a row has no full date, re-uploading the original CSV will repair it when the app can match the old transaction.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: T.mono, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px", borderBottom: `2px solid ${T.ink}` }}>Date</th>
                <th style={{ textAlign: "left", padding: "6px", borderBottom: `2px solid ${T.ink}` }}>Description</th>
                <th style={{ textAlign: "right", padding: "6px", borderBottom: `2px solid ${T.ink}` }}>Amount</th>
                <th style={{ textAlign: "left", padding: "6px", borderBottom: `2px solid ${T.ink}` }}>Category</th>
                <th style={{ textAlign: "left", padding: "6px", borderBottom: `2px solid ${T.ink}` }}>Source</th>
                <th style={{ padding: "6px", borderBottom: `2px solid ${T.ink}` }} />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const shownCategory = t.category || displayCategoryForTxn(t, rules);
                return (
                  <tr key={t.key}>
                    <td style={{ padding: "6px", borderBottom: `1px dashed ${T.line}`, minWidth: 120 }}>
                      <input
                        style={{ ...inputStyle, width: 112 }}
                        value={t.date || ""}
                        placeholder={t.ym || "YYYY-MM-DD"}
                        onChange={(e) => {
                          const date = e.target.value;
                          const patch = { date };
                          if (/^\d{4}-\d{2}/.test(date)) patch.ym = date.slice(0, 7);
                          updateTxn(t.key, patch);
                        }}
                      />
                    </td>
                    <td style={{ padding: "6px", borderBottom: `1px dashed ${T.line}`, minWidth: 320 }}>
                      <input style={inputStyle} value={t.desc || ""} onChange={(e) => updateTxn(t.key, { desc: e.target.value })} />
                    </td>
                    <td style={{ padding: "6px", borderBottom: `1px dashed ${T.line}`, minWidth: 110, textAlign: "right", whiteSpace: "nowrap", color: t.amount >= 0 ? T.moss : T.rust, fontWeight: 600 }}>
                      {fmtCents(t.amount)}
                    </td>
                    <td style={{ padding: "6px", borderBottom: `1px dashed ${T.line}`, minWidth: 240 }}>
                      <CategorySelect
                        value={shownCategory || ""}
                        categories={Array.from(new Set([INCOME_CATEGORY, ...(categories || [])])).sort(categorySort)}
                        allowIncome={true}
                        placeholder="Rule-based / choose"
                        onChange={(catRaw) => updateTxn(t.key, { category: rememberCategory(catRaw) || "" })}
                      />
                    </td>
                    <td style={{ padding: "6px", borderBottom: `1px dashed ${T.line}`, color: T.muted, minWidth: 160 }}>{t.source || "—"}</td>
                    <td style={{ padding: "6px", borderBottom: `1px dashed ${T.line}` }}>
                      <button style={{ ...btnGhost, color: T.rust, borderColor: T.rust }} onClick={() => { if (confirm("Delete this transaction?")) deleteTxn(t.key); }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan="6" style={{ padding: 16, color: T.muted, textAlign: "center" }}>No matching transactions.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


/* ============================================================
/* ============================================================
   Snapshots TAB — balance sheet + Snapshots
   ============================================================ */

function SnapshotsTab({ debts, assets, setAssets, Snapshots, setSnapshots }) {
  const updAsset = (id, patch) => setAssets(assets.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const moveAsset = (idx, delta) => {
    const j = idx + delta;
    if (j < 0 || j >= assets.length) return;
    const next = [...assets];
    const [item] = next.splice(idx, 1);
    next.splice(j, 0, item);
    setAssets(next);
  };
  const addAsset = () => setAssets([...assets, { id: "a" + Date.now(), name: "New account", value: 0, owed: 0 }]);

  const takeSnapshots = () => {
    const date = new Date().toISOString().slice(0, 10);
    const debtBal = {};
    for (const d of debts) debtBal[d.id] = d.balance;
    const assetVals = {};
    for (const a of assets) assetVals[a.id] = { value: a.value || 0, owed: a.owed || 0 };
    const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0) + assets.reduce((s, a) => s + (a.owed || 0), 0);
    const totalAssets = assets.reduce((s, a) => s + (a.value || 0), 0);
    const next = Snapshots.filter((s) => s.date !== date);
    next.push({ date, debts: debtBal, assets: assetVals, totalDebt, totalAssets, netWorth: totalAssets - totalDebt });
    next.sort((a, b) => a.date.localeCompare(b.date));
    setSnapshots(next);
  };

  const th = { textAlign: "right", padding: "6px 10px", borderBottom: `2px solid ${T.ink}`, whiteSpace: "nowrap" };
  const td = { textAlign: "right", padding: "6px 10px", borderBottom: `1px dashed ${T.line}`, whiteSpace: "nowrap" };

  return (
    <div>
      {/* balance sheet accounts */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Balance sheet accounts</div>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 12 }}>
          Cash, property, vehicles, equipment — anything you hold. "Owed against" is for secured debt like the mortgage, so it stays out of the payoff plan but counts in net worth. Card and loan balances live on the Debts tab.
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {assets.map((a, i) => (
            <div key={a.id} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 88px", paddingBottom: 7, display: "flex", gap: 4 }}>
                <button onClick={() => moveAsset(i, -1)} disabled={i === 0} style={{ ...btnGhost, padding: "6px 8px" }}>↑</button>
                <button onClick={() => moveAsset(i, 1)} disabled={i === assets.length - 1} style={{ ...btnGhost, padding: "6px 8px" }}>↓</button>
              </div>
              <div style={{ flex: "2 1 200px", minWidth: 180 }}>
                <Label>Account</Label>
                <input style={inputStyle} value={a.name} onChange={(e) => updAsset(a.id, { name: e.target.value })} />
              </div>
              <div style={{ flex: "0 0 150px" }}>
                <Label>Value</Label>
                <Num value={a.value} onChange={(v) => updAsset(a.id, { value: v || 0 })} step={1000} />
              </div>
              <div style={{ flex: "0 0 150px" }}>
                <Label>Owed against</Label>
                <Num value={a.owed} onChange={(v) => updAsset(a.id, { owed: v || 0 })} step={1000} />
              </div>
              <div style={{ flex: "0 0 90px" }}>
                <Label>Rate %</Label>
                <Num value={a.apr} onChange={(v) => updAsset(a.id, { apr: v })} step={0.01} />
              </div>
              <div style={{ flex: "0 0 120px", paddingBottom: 7, fontFamily: T.mono, fontSize: 13, color: T.moss, fontWeight: 600 }}>
                = {fmt$((a.value || 0) - (a.owed || 0))}
              </div>
              <div style={{ flex: "1 1 220px", minWidth: 200 }}>
                <Label>Note</Label>
                <input style={inputStyle} value={a.note || ""} onChange={(e) => updAsset(a.id, { note: e.target.value })} />
              </div>
              <button onClick={() => setAssets(assets.filter((x) => x.id !== a.id))} style={{ ...btnGhost, color: T.rust, borderColor: T.rust }}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={addAsset} style={{ ...btnGhost, marginTop: 12 }}>+ Add account</button>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <button onClick={takeSnapshots} style={btnStyle}>Save this week's Snapshots</button>
        <span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>
          End of each weekly review: update debt balances and asset values, then save.
        </span>
      </div>

      {Snapshots.filter((s) => s.netWorth != null).length > 1 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Net worth & debt trend</div>
          <TrendChart Snapshots={Snapshots} />
        </div>
      )}

      {Snapshots.length > 0 ? (
        <div style={{ ...card, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: T.mono, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Date</th>
                {assets.map((a) => <th key={a.id} style={th}>{a.name}</th>)}
                {debts.map((d) => <th key={d.id} style={th}>{d.name}</th>)}
                <th style={th}>Assets</th>
                <th style={th}>Debt</th>
                <th style={th}>Net worth</th>
                <th style={{ borderBottom: `2px solid ${T.ink}` }} />
              </tr>
            </thead>
            <tbody>
              {[...Snapshots].reverse().map((s) => (
                <tr key={s.date}>
                  <td style={{ ...td, textAlign: "left" }}>{s.date}</td>
                  {assets.map((a) => {
                    const v = s.assets?.[a.id];
                    return <td key={a.id} style={{ ...td, color: T.moss }}>{v ? fmt$((v.value || 0) - (v.owed || 0)) : "·"}</td>;
                  })}
                  {debts.map((d) => (
                    <td key={d.id} style={{ ...td, color: T.rust }}>{s.debts?.[d.id] != null ? fmt$(s.debts[d.id]) : "·"}</td>
                  ))}
                  <td style={{ ...td, fontWeight: 600, color: T.moss }}>{s.totalAssets != null ? fmt$(s.totalAssets) : "·"}</td>
                  <td style={{ ...td, fontWeight: 600, color: T.rust }}>{fmt$(s.totalDebt)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{s.netWorth != null ? fmt$(s.netWorth) : "·"}</td>
                  <td style={td}>
                    <button onClick={() => setSnapshots(Snapshots.filter((x) => x.date !== s.date))}
                      style={{ border: "none", background: "none", color: T.rust, cursor: "pointer", fontFamily: T.mono }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ ...card, borderStyle: "dashed", padding: 32, textAlign: "center", fontFamily: T.mono, fontSize: 13, color: T.muted }}>
          No Snapshots yet. Fill in your accounts above and debt balances on the Debts tab, then save your first one.
        </div>
      )}
    </div>
  );
}

function CashFlowChart({ flow }) {
  // running balance line from a list of {date, amount, direction}
  if (!flow || flow.length === 0) return null;
  const pts = [];
  let running = 0;
  for (const f of flow) {
    running += f.direction === "income" ? f.amount : -f.amount;
    pts.push({ date: f.date, balance: running });
  }

  const W = 1000, H = 220, PAD = { l: 64, r: 16, t: 16, b: 26 };
  const vals = pts.map((p) => p.balance);
  const maxVal = Math.max(0, ...vals) * 1.1 || 10;
  const minVal = Math.min(0, ...vals) * 1.1;
  const span = maxVal - minVal || 1;

  const startTime = pts[0].date.getTime();
  const endTime = pts[pts.length - 1].date.getTime();
  const timeSpan = Math.max(1, endTime - startTime);

  const x = (d) => PAD.l + ((d.getTime() - startTime) / timeSpan) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - minVal) / span) * (H - PAD.t - PAD.b);

  const linePts = pts.map((p) => `${x(p.date)},${y(p.balance)}`).join(" ");
  const zeroY = y(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Projected cash flow, next 60 days">
      {[minVal, 0, maxVal].map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={T.line} strokeWidth="1" />
          <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fontFamily={T.mono} fill={T.muted}>{fmt$(v)}</text>
        </g>
      ))}
      <line x1={PAD.l} x2={W - PAD.r} y1={zeroY} y2={zeroY} stroke={T.ink} strokeWidth="1" strokeDasharray="4,3" />
      <polyline fill="none" stroke={T.ochre} strokeWidth="2.5" points={linePts} />
      {pts.map((p, i) => (
        <circle key={i} cx={x(p.date)} cy={y(p.balance)} r="3" fill={p.balance >= 0 ? T.moss : T.rust} />
      ))}
      {pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % Math.ceil(pts.length / 8) === 0).map((p, i) => (
        <text key={i} x={x(p.date)} y={H - 6} textAnchor="middle" fontSize="9" fontFamily={T.mono} fill={T.muted}>
          {MONTH_NAMES[p.date.getMonth()]} {p.date.getDate()}
        </text>
      ))}
    </svg>
  );
}

function TrendChart({ Snapshots }) {
  const pts = Snapshots.filter((s) => s.netWorth != null || s.totalDebt != null);
  if (pts.length < 2) return null;
  const W = 1000, H = 220, PAD = { l: 64, r: 16, t: 16, b: 26 };
  const vals = pts.flatMap((s) => [s.netWorth, s.totalDebt].filter((v) => v != null));
  const maxVal = Math.max(...vals) * 1.05;
  const minVal = Math.min(0, ...vals);
  const x = (i) => PAD.l + (i / Math.max(1, pts.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - minVal) / (maxVal - minVal)) * (H - PAD.t - PAD.b);

  const line = (getter, color) => {
    const p = pts.map((s, i) => (getter(s) != null ? `${x(i)},${y(getter(s))}` : null)).filter(Boolean);
    return <polyline fill="none" stroke={color} strokeWidth="2.5" points={p.join(" ")} />;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Net worth and debt trend">
      {[minVal, (minVal + maxVal) / 2, maxVal].map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={T.line} strokeWidth="1" />
          <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fontFamily={T.mono} fill={T.muted}>{fmt$(v)}</text>
        </g>
      ))}
      {line((s) => s.totalDebt, T.rust)}
      {line((s) => s.netWorth, T.moss)}
      {pts.map((s, i) => (
        <text key={s.date} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fontFamily={T.mono} fill={T.muted}>
          {s.date.slice(5)}
        </text>
      ))}
      <text x={W - PAD.r} y={PAD.t + 4} textAnchor="end" fontSize="11" fontFamily={T.mono} fill={T.moss}>— net worth</text>
      <text x={W - PAD.r} y={PAD.t + 20} textAnchor="end" fontSize="11" fontFamily={T.mono} fill={T.rust}>— debt</text>
    </svg>
  );
}
