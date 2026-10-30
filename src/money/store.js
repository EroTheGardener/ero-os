// Data layer for Ero's Money. Reads the same Supabase rows the old Financials app used,
// so nothing is migrated or lost:
//   eroOS.debtPayoff.v2   txns, rules, budgets, categories, debts (+ other legacy keys, preserved)
//   eroOS.bankBalances.v1 live balances written by /api/bank-sync
//   eroOS.bills.v1        upcoming bills (new)
import {
  LS_KEY, SEED_DEBTS, SEED_RULES, normalizeSavedTxns, mergeAppendedRules,
  normalizeSavedCategories, applyDebtCorrections, displayCategoryForTxn,
  isIncomeCategory, isTransferCategory,
} from "../DebtPayoff.jsx";

export const BAL_KEY = "eroOS.bankBalances.v1";
export const BILLS_KEY = "eroOS.bills.v1";

async function getJSON(key) {
  try {
    const r = await window.storage.get(key);
    if (!r || r.value == null) return null;
    return typeof r.value === "string" ? JSON.parse(r.value) : r.value;
  } catch {
    return null;
  }
}

export async function loadAll() {
  const [money, balances, bills] = await Promise.all([getJSON(LS_KEY), getJSON(BAL_KEY), getJSON(BILLS_KEY)]);
  const raw = money || {};
  const state = {
    ...raw,
    debts: applyDebtCorrections(raw.debts || SEED_DEBTS),
    rules: mergeAppendedRules(raw.rules || SEED_RULES),
    budgets: { "Property Projects": 1000, ...(raw.budgets || {}) },
    categories: normalizeSavedCategories(raw.categories || []),
    txns: normalizeSavedTxns(raw.txns || []),
  };
  return { state, balances: balances || { accounts: [] }, bills: bills || null };
}

export function saveMoney(state) {
  return window.storage.set(LS_KEY, JSON.stringify({ ...state, __savedAt: Date.now() }));
}
export function saveBills(bills) {
  return window.storage.set(BILLS_KEY, JSON.stringify(bills));
}

/* ---------- money math ---------- */

export const fmt = (n, cents = false) => {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  return (v < 0 ? "-$" : "$") + s;
};

export function categoryOf(t, rules) {
  return displayCategoryForTxn(t, rules);
}

// Splits transactions into income / spending per category, skipping transfers.
// Refunds in a spending category reduce that category.
export function summarize(txns, rules, filter = () => true) {
  let income = 0, spent = 0;
  const byCat = {};
  for (const t of txns) {
    if (!filter(t)) continue;
    const cat = categoryOf(t, rules);
    // Transfers, and money set aside into savings/IRAs, aren't spending.
    if (isTransferCategory(cat) || cat === "Savings & Investing") continue;
    const amt = Number(t.amount) || 0;
    if (isIncomeCategory(cat)) {
      income += amt;
      byCat[cat] = byCat[cat] || { cat, income: true, total: 0, n: 0 };
      byCat[cat].total += amt;
    } else {
      spent += -amt;
      byCat[cat] = byCat[cat] || { cat, income: false, total: 0, n: 0 };
      byCat[cat].total += -amt;
    }
    byCat[cat].n++;
  }
  return { income, spent, net: income - spent, byCat };
}

export const ymOf = (d) => d.toISOString().slice(0, 7);
export const quarterOf = (ym) => `${ym.slice(0, 4)} Q${Math.floor((Number(ym.slice(5, 7)) - 1) / 3) + 1}`;

/* ---------- accounts ---------- */

// Groups SimpleFIN accounts the way QuickBooks banking does.
export function accountGroup(a) {
  const n = a.name.toLowerCase();
  if (/gnws|earthcare|nexus garden|business credit/.test(n)) return "Business";
  if (/ira|brokerage/.test(n)) return "Retirement & investing";
  if (/loan/.test(n)) return "Loans";
  if (a.balance < 0 || /credit card|visa|card|thrive|reflect|rewards cred/.test(n)) return "Credit cards";
  return "Cash";
}

export function last4(name) {
  const m = String(name).match(/\((?:X*)(\d{4})\)\s*$/) || String(name).match(/(\d{4})\)?\s*$/);
  return m ? m[1] : null;
}

// Older CSV-imported rows carry the file name as source; map them to an account's last 4.
const FILE_TO_LAST4 = [
  [/sofi.?checking|0638/i, "0638"], [/sofi.?savings|1595/i, "1595"], [/checking.*2240|2240/i, "2240"],
  [/8391/i, "8391"], [/0292/i, "0292"], [/0452/i, "0452"], [/chase7407|7407/i, "7407"],
  [/^creditcard/i, "8560"], [/download_[14]|download_4|travel/i, "4805"], [/^download\.csv/i, "2509"],
];
export function txnLast4(t) {
  const src = String(t.source || "");
  if (src.startsWith("SimpleFIN:")) return last4(src);
  for (const [re, l4] of FILE_TO_LAST4) if (re.test(src)) return l4;
  return null;
}

// Debts in the payoff plan, refreshed with live balances when the bank sync knows them.
const DEBT_LAST4 = { "usb-0452": "0452", "usb-0292": "0292", "chase-amzn": "7407", "wf-reflect": "8560", "excite-cc": "4805", "excite-loan": "7562" };
export function liveDebts(debts, accounts) {
  return debts.map((d) => {
    const l4 = DEBT_LAST4[d.id];
    const a = l4 && accounts.find((x) => last4(x.name) === l4);
    return a ? { ...d, balance: Math.abs(a.balance), live: true } : d;
  });
}

/* ---------- bills ---------- */

export const SEED_BILLS = [
  { id: "mortgage", name: "Mortgage (AmeriHome)", amount: 2997, due: "2026-11-01", repeat: "monthly", account: "SoFi Savings", note: "Autopay" },
  { id: "proptax-1", name: "Property tax - 1st half", amount: 1850, due: "2026-12-10", repeat: "once", note: "Nevada County. Estimate from last year. Late after Dec 10." },
  { id: "proptax-2", name: "Property tax - 2nd half", amount: 1850, due: "2027-04-10", repeat: "once", note: "Nevada County. Estimate. Late after Apr 10." },
  { id: "earthcare-ftb", name: "Earthcare CA franchise tax", amount: 853, due: "2026-11-15", repeat: "once", note: "2025 return still needs to be filed" },
  { id: "income-tax-2025", name: "2025 personal income tax", amount: null, due: "2026-12-15", repeat: "once", note: "Amount TBD once the new accountant files. Ask about a payment plan." },
  { id: "dmv", name: "DMV registrations", amount: null, due: "2026-11-30", repeat: "once", note: "Find the letter" },
  { id: "rats", name: "Rat treatment", amount: 400, due: "2026-11-15", repeat: "once" },
  { id: "melody-bday", name: "Melody's birthday + Airbnb share", amount: null, due: "2026-11-20", repeat: "once", note: "Set the real date and amount" },
  { id: "braces", name: "Braces", amount: null, due: "2027-01-15", repeat: "once", note: "$6,000 total - set the monthly payment once the plan is picked" },
  { id: "usb-0292", name: "US Bank 0292 minimum", amount: 367, due: "2026-11-03", repeat: "monthly", note: "Autopay" },
  { id: "usb-0452", name: "US Bank 0452 minimum", amount: 124, due: "2026-11-22", repeat: "monthly", note: "Autopay" },
  { id: "excite-loan", name: "Excite loan", amount: 503, due: "2026-12-01", repeat: "monthly", note: "Paid ahead - $0 due 11/1" },
  { id: "excite-visa", name: "Excite Visa payment", amount: 548, due: "2026-11-13", repeat: "monthly" },
  { id: "chase", name: "Chase Amazon minimum", amount: 35, due: "2026-11-23", repeat: "monthly", note: "Autopay" },
  { id: "wf", name: "Wells Fargo Reflect", amount: 26, due: "2026-11-14", repeat: "monthly", note: "Autopay" },
  { id: "pge", name: "PG&E", amount: 242, due: "2026-11-14", repeat: "monthly", note: "Autopay from DuPage" },
  { id: "starlink", name: "Starlink", amount: 130, due: "2026-11-09", repeat: "monthly" },
];

export function addPeriod(date, repeat) {
  const d = new Date(date + "T12:00:00");
  if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  else if (repeat === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// Occurrences of every bill between today and `days` ahead (unpaid only).
export function upcoming(bills, days = 45, today = new Date()) {
  const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const start = local(today);
  const end = local(new Date(today.getTime() + days * 864e5));
  const out = [];
  for (const b of bills) {
    if (b.paid && b.repeat === "once") continue;
    let due = b.due;
    let guard = 0;
    while (due && due <= end && guard++ < 24) {
      out.push({ ...b, due, overdue: due < start });
      if (b.repeat === "once" || !b.repeat) break;
      due = addPeriod(due, b.repeat);
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

/* ---------- extra stores ---------- */

export const MANUAL_KEY = "eroOS.manual.v1"; // { cashOnHand, cashUpdatedAt }
export const SELL_KEY = "eroOS.sell.v1"; // [{ id, name, price, status, soldFor, soldOn, note }]
export const HISTORY_KEY = "eroOS.history.v1"; // { points: [{ date, net, score, experian, transunion, equifax }] }

export async function loadExtras() {
  const [manual, sell, history] = await Promise.all([getJSON(MANUAL_KEY), getJSON(SELL_KEY), getJSON(HISTORY_KEY)]);
  return { manual: manual || { cashOnHand: 0 }, sell: sell || [], history: history || { points: [] } };
}
export const saveKey = (key, obj) => window.storage.set(key, JSON.stringify(obj));

/* ---------- periods (QuickBooks-style) ---------- */

export const PERIODS = [
  ["mtd", "This month"],
  ["last-month", "Last month"],
  ["7d", "Last 7 days"],
  ["14d", "Last 14 days"],
  ["30d", "Last 30 days"],
  ["90d", "Last 90 days"],
  ["qtd", "Quarter to date"],
  ["ytd", "Year to date"],
  ["all", "All time"],
];

// Local calendar date (not UTC), so evenings in California don't roll to tomorrow.
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export function periodRange(p, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  const today = iso(now);
  const ago = (n) => iso(new Date(now.getTime() - (n - 1) * 864e5));
  switch (p) {
    case "last-month": return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
    case "7d": return [ago(7), today];
    case "14d": return [ago(14), today];
    case "30d": return [ago(30), today];
    case "90d": return [ago(90), today];
    case "qtd": return [iso(new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1))), today];
    case "ytd": return [`${y}-01-01`, today];
    case "all": return ["0000-01-01", today];
    default: return [iso(new Date(y, m, 1)), today];
  }
}
export const inRange = ([a, b]) => (t) => t.date && t.date >= a && t.date <= b;
export const monthsIn = ([a, b]) => Math.max(1, (new Date(b) - new Date(a === "0000-01-01" ? b : a)) / 864e5 / 30.44);

// Average monthly spend per category over the last 6 full months. Used as the
// budget wherever a real budget hasn't been set.
export function categoryAverages(txns, rules, now = new Date()) {
  const months = [];
  for (let i = 1; i <= 6; i++) months.push(iso(new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1))).slice(0, 7));
  const s = summarize(txns, rules, (t) => months.includes(t.ym));
  const out = {};
  for (const c of Object.values(s.byCat)) if (!c.income) out[c.cat] = Math.max(0, c.total / 6);
  return out;
}
export const budgetFor = (cat, budgets, avgs) => (budgets[cat] ? { amount: budgets[cat], avg: false } : avgs[cat] ? { amount: avgs[cat], avg: true } : null);

/* ---------- cash flow forecast ---------- */

// Day-by-day projected cash for the next `days`: today's cash, minus bills,
// plus your paycheck (every 14 days from the last one) and rent (3-month average, on the 1st).
export function forecast({ cash, bills, txns, rules, days = 90, now = new Date() }) {
  const pay = txns.filter((t) => categoryOf(t, rules) === "Paycheck" && t.amount > 0).sort((a, b) => b.date.localeCompare(a.date))[0];
  const months = [1, 2, 3].map((i) => iso(new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1))).slice(0, 7));
  const rent = summarize(txns, rules, (t) => months.includes(t.ym)).byCat["Rental Income"];
  const rentMonthly = rent ? rent.total / 3 : 0;
  const events = [];
  for (const b of upcoming(bills, days, now)) if (b.amount) events.push({ date: b.due, amt: -b.amount, label: b.name });
  if (pay) {
    let d = new Date(pay.date + "T12:00:00");
    for (let i = 0; i < 12; i++) {
      d = new Date(d.getTime() + 14 * 864e5);
      if (iso(d) > iso(new Date(now.getTime() + days * 864e5))) break;
      if (iso(d) >= iso(now)) events.push({ date: iso(d), amt: pay.amount, label: "Paycheck" });
    }
  }
  for (let i = 1; i <= Math.ceil(days / 30) + 1; i++) {
    const d = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth() + i, 1)));
    if (rentMonthly && d <= iso(new Date(now.getTime() + days * 864e5))) events.push({ date: d, amt: rentMonthly, label: "Rent (avg)" });
  }
  const pts = [];
  let bal = cash;
  for (let i = 0; i <= days; i++) {
    const d = iso(new Date(now.getTime() + i * 864e5));
    for (const e of events) if (e.date === d || (i === 0 && e.date < d)) bal += e.amt;
    pts.push({ date: d, bal });
  }
  return { pts, events: events.sort((a, b) => a.date.localeCompare(b.date)), rentMonthly, paycheck: pay?.amount || 0 };
}
