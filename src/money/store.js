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
  { id: "braces", name: "Braces", amount: 6000, due: "2027-01-15", repeat: "once", note: "Plan on a 0% payment plan" },
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
  const start = today.toISOString().slice(0, 10);
  const end = new Date(today.getTime() + days * 864e5).toISOString().slice(0, 10);
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
