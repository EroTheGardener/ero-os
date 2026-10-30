import React, { useEffect, useMemo, useState } from "react";
import { Card, SectionTitle, PageHeader, Bar, Row, List, Segmented, Button, Sheet, input } from "./ui.jsx";
import {
  loadAll, saveMoney, saveBills, fmt, summarize, categoryOf, quarterOf, accountGroup, last4, txnLast4,
  liveDebts, SEED_BILLS, upcoming, addPeriod,
} from "./store.js";
import { isIncomeCategory, categorySort, merchantKey, simulate, prettyYM } from "../DebtPayoff.jsx";

const TABS = [
  ["home", "Home", "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"],
  ["accounts", "Accounts", "M3 9h18M5 9v9m4.5-9v9m5-9v9M19 9v9M2 20h20M12 3l9 5H3z"],
  ["spending", "Spending", "M12 3v18m5-14H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
  ["bills", "Bills", "M8 2v4m8-4v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"],
  ["reports", "Reports", "M4 20V10m6 10V4m6 16v-7m4 7H2"],
  ["debt", "Debt plan", "M3 17l6-6 4 4 8-8m0 0v6m0-6h-6"],
];

const Icon = ({ d, className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const todayISO = () => new Date().toISOString().slice(0, 10);
const thisYM = () => todayISO().slice(0, 7);
const niceDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const daysUntil = (iso) => Math.round((new Date(iso + "T12:00:00") - new Date(todayISO() + "T12:00:00")) / 864e5);
const cleanAcct = (name) => name.replace(/\s*\(X*\d{4}\)\s*$/, "").replace(/�+/g, "").replace(/\s{2,}/g, " ").trim();

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(() => { try { return localStorage.getItem("money.tab") || "home"; } catch { return "home"; } });
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { loadAll().then((d) => setData({ ...d, bills: d.bills || SEED_BILLS })); }, []);
  useEffect(() => { try { localStorage.setItem("money.tab", tab); } catch { /* private mode */ } }, [tab]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); } }, [toast]);

  const updateState = (fn) => setData((d) => { const state = fn(d.state); saveMoney(state); return { ...d, state }; });
  const updateBills = (fn) => setData((d) => { const bills = fn(d.bills); saveBills(bills); return { ...d, bills }; });

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await fetch("/api/bank-sync");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      const fresh = await loadAll();
      setData((d) => ({ ...d, state: fresh.state, balances: fresh.balances }));
      setToast(j.added ? `${j.added} new transaction${j.added === 1 ? "" : "s"}` : "Everything's up to date");
    } catch (e) {
      setToast(`Sync failed: ${e.message}`);
    }
    setSyncing(false);
  };

  if (!data) return <div className="min-h-screen grid place-items-center text-[var(--muted)]">Loading…</div>;

  const props = { data, updateState, updateBills, setTab, sync, syncing };
  const Page = { home: Home, accounts: Accounts, spending: Spending, bills: Bills, reports: Reports, debt: DebtPlan }[tab] || Home;

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 p-3 bg-[var(--side)] backdrop-blur-xl border-r border-[var(--hair)]">
        <div className="px-3 pt-3 pb-5 text-[17px] font-semibold">Ero's Money</div>
        {TABS.map(([id, label, d]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[15px] text-left transition ${tab === id ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--hover)]"}`}>
            <Icon d={d} className="w-[18px] h-[18px]" />{label}
          </button>
        ))}
        <div className="mt-auto px-3 pb-2 text-[12px] text-[var(--muted)]">
          <SyncLine data={data} sync={sync} syncing={syncing} />
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 sm:px-8 pt-6 pb-28 md:pb-12 max-w-4xl mx-auto w-full">
        <Page {...props} />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-6 bg-[var(--side)] backdrop-blur-xl border-t border-[var(--hair)] pb-[env(safe-area-inset-bottom)]">
        {TABS.map(([id, label, d]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${tab === id ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
            <Icon d={d} className="w-[22px] h-[22px]" />{label.split(" ")[0]}
          </button>
        ))}
      </nav>

      {toast && <div className="fixed z-50 left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 px-4 py-2 rounded-full bg-[var(--text)] text-[var(--bg)] text-[14px] shadow-lg">{toast}</div>}
    </div>
  );
}

function SyncLine({ data, sync, syncing }) {
  const at = data.balances.syncedAt;
  return (
    <button onClick={sync} disabled={syncing} className="text-left hover:text-[var(--text)]">
      {syncing ? "Syncing banks…" : at ? `Banks synced ${new Date(at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · Sync now` : "Sync banks"}
    </button>
  );
}

/* ================= HOME ================= */

function Home({ data, setTab, sync, syncing }) {
  const { state, balances, bills } = data;
  const accts = balances.accounts || [];
  const cash = accts.filter((a) => accountGroup(a) === "Cash").reduce((s, a) => s + a.balance, 0);
  const cards = accts.filter((a) => accountGroup(a) === "Credit cards").reduce((s, a) => s + a.balance, 0);
  const ym = thisYM();
  const month = useMemo(() => summarize(state.txns, state.rules, (t) => t.ym === ym), [state, ym]);
  const next30 = upcoming(bills, 30);
  const known30 = next30.reduce((s, b) => s + (b.amount || 0), 0);
  const unknown30 = next30.filter((b) => b.amount == null).length;
  const spendCats = Object.values(month.byCat).filter((c) => !c.income).sort((a, b) => b.total - a.total);
  const over = spendCats.filter((c) => state.budgets[c.cat] && c.total > state.budgets[c.cat]);
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  return (
    <>
      <PageHeader title="Ero's Money" sub={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        right={<Button onClick={sync} disabled={syncing} className="md:hidden">{syncing ? "Syncing…" : "Sync"}</Button>} />

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4" onClick={() => setTab("accounts")}>
          <div className="text-[13px] text-[var(--muted)]">Cash</div>
          <div className="text-[28px] font-semibold tabular-nums tracking-tight">{fmt(cash)}</div>
          <div className="text-[12px] text-[var(--muted)]">personal accounts</div>
        </Card>
        <Card className="p-4" onClick={() => setTab("debt")}>
          <div className="text-[13px] text-[var(--muted)]">Owed on cards</div>
          <div className="text-[28px] font-semibold tabular-nums tracking-tight text-[var(--red)]">{fmt(Math.abs(cards))}</div>
          <div className="text-[12px] text-[var(--muted)]">all credit cards</div>
        </Card>
      </div>

      <SectionTitle>{prettyYM(ym)} so far</SectionTitle>
      <Card className="p-4" onClick={() => setTab("spending")}>
        <div className="flex justify-between text-[15px]"><span>Spent</span><span className="tabular-nums font-semibold">{fmt(month.spent)}</span></div>
        <div className="flex justify-between text-[15px] mt-1"><span>Came in</span><span className="tabular-nums font-semibold text-[var(--green)]">{fmt(month.income)}</span></div>
        <div className="mt-3"><Bar value={month.spent} max={Math.max(month.income, month.spent)} tone={month.spent > month.income ? "red" : "accent"} /></div>
        <div className="text-[13px] text-[var(--muted)] mt-2">
          Day {dayOfMonth} of {daysInMonth} · {month.net >= 0 ? `${fmt(month.net)} ahead` : `${fmt(-month.net)} more out than in`}
        </div>
      </Card>

      <SectionTitle right={<button onClick={() => setTab("bills")} className="text-[13px] text-[var(--accent)]">All bills</button>}>Next 30 days</SectionTitle>
      <Card className="p-4">
        <div className="flex justify-between text-[15px]"><span>Bills due</span><span className="tabular-nums font-semibold">{fmt(known30)}{unknown30 ? ` + ${unknown30} TBD` : ""}</span></div>
        <div className="flex justify-between text-[15px] mt-1"><span>Cash after bills</span>
          <span className={`tabular-nums font-semibold ${cash - known30 < 1000 ? "text-[var(--red)]" : ""}`}>{fmt(cash - known30)}</span></div>
        <div className="text-[12px] text-[var(--muted)] mt-1">Before any income comes in.</div>
      </Card>
      <List className="mt-3">
        {next30.slice(0, 6).map((b, i) => (
          <Row key={b.id + i} left={b.name} sub={b.overdue ? "Overdue" : daysUntil(b.due) === 0 ? "Today" : `${niceDate(b.due)} · in ${daysUntil(b.due)} days`}
            right={b.amount == null ? "TBD" : fmt(b.amount)} />
        ))}
        {!next30.length && <Row left="Nothing due" />}
      </List>

      <SectionTitle right={<button onClick={() => setTab("spending")} className="text-[13px] text-[var(--accent)]">See all</button>}>Where it went</SectionTitle>
      {over.length > 0 && <div className="text-[13px] text-[var(--red)] px-1 mb-2">Over budget: {over.map((c) => c.cat).join(", ")}</div>}
      <List>
        {spendCats.slice(0, 5).map((c) => {
          const b = state.budgets[c.cat];
          return (
            <div key={c.cat} className="px-4 py-3">
              <div className="flex justify-between text-[15px]"><span>{c.cat}</span><span className="tabular-nums">{fmt(c.total)}{b ? <span className="text-[var(--muted)]"> / {fmt(b)}</span> : null}</span></div>
              {b ? <div className="mt-2"><Bar value={c.total} max={b} tone={c.total > b ? "red" : c.total > b * 0.8 ? "orange" : "green"} /></div> : null}
            </div>
          );
        })}
        {!spendCats.length && <Row left="No spending yet this month" />}
      </List>
    </>
  );
}

/* ================= ACCOUNTS ================= */

const GROUP_ORDER = ["Cash", "Credit cards", "Loans", "Retirement & investing", "Business"];

function Accounts({ data, sync, syncing }) {
  const { balances, state } = data;
  const [open, setOpen] = useState(null);
  const [showBiz, setShowBiz] = useState(false);
  const groups = {};
  for (const a of balances.accounts || []) (groups[accountGroup(a)] ||= []).push(a);

  return (
    <>
      <PageHeader title="Accounts" sub={balances.syncedAt ? `Updated ${new Date(balances.syncedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Not synced yet"}
        right={<Button onClick={sync} disabled={syncing}>{syncing ? "Syncing…" : "Sync"}</Button>} />
      {GROUP_ORDER.filter((g) => groups[g]).map((g) => {
        const list = groups[g].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
        const total = list.reduce((s, a) => s + a.balance, 0);
        const hidden = g === "Business" && !showBiz;
        return (
          <div key={g}>
            <SectionTitle right={<span className={`text-[13px] tabular-nums font-medium ${total < 0 ? "text-[var(--red)]" : ""}`}>{fmt(total)}</span>}>
              {g === "Business" ? <button onClick={() => setShowBiz(!showBiz)}>{g} {showBiz ? "▾" : "▸"}</button> : g}
            </SectionTitle>
            {!hidden && (
              <List>
                {list.map((a) => (
                  <Row key={a.id} left={cleanAcct(a.name).replace(new RegExp(`\\s*-\\s*${last4(a.name)}$`), "")} sub={last4(a.name) ? `•• ${last4(a.name)}` : null}
                    right={<span className={a.balance < 0 ? "text-[var(--red)]" : ""}>{fmt(a.balance, true)}</span>}
                    onClick={g === "Business" ? undefined : () => setOpen(a)} />
                ))}
              </List>
            )}
          </div>
        );
      })}
      {!(balances.accounts || []).length && <Card className="p-6 text-center text-[var(--muted)]">No accounts yet. Tap Sync.</Card>}
      {open && <AccountSheet account={open} state={state} onClose={() => setOpen(null)} />}
    </>
  );
}

function AccountSheet({ account, state, onClose }) {
  const l4 = last4(account.name);
  const txns = state.txns.filter((t) => txnLast4(t) === l4).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80);
  return (
    <Sheet title={cleanAcct(account.name)} onClose={onClose}>
      <div className="text-[34px] font-semibold tabular-nums mb-4">{fmt(account.balance, true)}</div>
      <List>
        {txns.map((t) => <Row key={t.key} left={t.desc} sub={`${niceDate(t.date)} · ${categoryOf(t, state.rules)}`} right={<span className={t.amount > 0 ? "text-[var(--green)]" : ""}>{fmt(t.amount, true)}</span>} />)}
        {!txns.length && <Row left="No transactions here yet" />}
      </List>
    </Sheet>
  );
}

/* ================= SPENDING ================= */

function Spending({ data, updateState }) {
  const { state } = data;
  const months = useMemo(() => [...new Set(state.txns.map((t) => t.ym))].filter(Boolean).sort().reverse().slice(0, 18), [state.txns]);
  const [ym, setYm] = useState(months[0] || thisYM());
  const [cat, setCat] = useState(null);
  const sum = useMemo(() => summarize(state.txns, state.rules, (t) => t.ym === ym), [state, ym]);
  const spend = Object.values(sum.byCat).filter((c) => !c.income).sort((a, b) => b.total - a.total);
  const inc = Object.values(sum.byCat).filter((c) => c.income).sort((a, b) => b.total - a.total);
  const budgeted = Object.keys(state.budgets).filter((c) => state.budgets[c] && !sum.byCat[c]);

  return (
    <>
      <PageHeader title="Spending" sub={`${fmt(sum.spent)} out · ${fmt(sum.income)} in`} />
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
        {months.map((m) => (
          <button key={m} onClick={() => setYm(m)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[14px] ${m === ym ? "bg-[var(--accent)] text-white" : "bg-[var(--fill)]"}`}>{prettyYM(m)}</button>
        ))}
      </div>

      <SectionTitle>Spending by category</SectionTitle>
      <List>
        {[...spend, ...budgeted.map((c) => ({ cat: c, total: 0, n: 0 }))].map((c) => {
          const b = state.budgets[c.cat];
          return (
            <div key={c.cat} onClick={() => setCat(c.cat)} className="px-4 py-3 cursor-pointer hover:bg-[var(--hover)]">
              <div className="flex justify-between text-[15px]">
                <span>{c.cat} <span className="text-[var(--muted)] text-[13px]">· {c.n}</span></span>
                <span className="tabular-nums">{fmt(c.total)}{b ? <span className="text-[var(--muted)]"> / {fmt(b)}</span> : null}</span>
              </div>
              {b ? <div className="mt-2"><Bar value={c.total} max={b} tone={c.total > b ? "red" : c.total > b * 0.8 ? "orange" : "green"} /></div> : null}
            </div>
          );
        })}
      </List>

      <SectionTitle>Income</SectionTitle>
      <List>
        {inc.map((c) => <Row key={c.cat} left={c.cat} sub={`${c.n} deposits`} right={<span className="text-[var(--green)]">{fmt(c.total)}</span>} onClick={() => setCat(c.cat)} />)}
        {!inc.length && <Row left="No income this month yet" />}
      </List>

      {cat && <CategorySheet cat={cat} ym={ym} state={state} updateState={updateState} onClose={() => setCat(null)} />}
    </>
  );
}

function CategorySheet({ cat, ym, state, updateState, onClose }) {
  const txns = state.txns.filter((t) => t.ym === ym && categoryOf(t, state.rules) === cat).sort((a, b) => b.date.localeCompare(a.date));
  const allCats = useMemo(() => {
    const s = new Set([...state.categories, ...state.rules.map((r) => r.category), ...Object.keys(state.budgets), "Uncategorized"]);
    return [...s].filter(Boolean).sort(categorySort);
  }, [state]);
  const [budget, setBudget] = useState(state.budgets[cat] ?? "");
  const [always, setAlways] = useState(false);

  const recat = (t, newCat) => updateState((s) => {
    const txnsNext = s.txns.map((x) => (x.key === t.key ? { ...x, category: newCat } : x));
    const rules = always ? [{ keyword: merchantKey(t.desc), category: newCat }, ...s.rules] : s.rules;
    const categories = s.categories.includes(newCat) ? s.categories : [...s.categories, newCat];
    return { ...s, txns: txnsNext, rules, categories };
  });
  const saveBudget = () => updateState((s) => ({ ...s, budgets: { ...s.budgets, [cat]: Number(budget) || 0 } }));

  return (
    <Sheet title={`${cat} · ${prettyYM(ym)}`} onClose={onClose}>
      {!isIncomeCategory(cat) && (
        <Card className="p-4 mb-4 flex items-center gap-3">
          <div className="flex-1 text-[15px]">Monthly budget</div>
          <input className={`${input} text-right`} style={{ width: 112 }} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} onBlur={saveBudget} placeholder="None" />
        </Card>
      )}
      <label className="flex items-center gap-2 text-[13px] text-[var(--muted)] mb-2 px-1">
        <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} /> When I change a category, do it for that merchant from now on
      </label>
      <List>
        {txns.map((t) => (
          <div key={t.key} className="px-4 py-3">
            <div className="flex justify-between gap-3 text-[15px]"><span className="truncate">{t.desc}</span><span className={`tabular-nums shrink-0 ${t.amount > 0 ? "text-[var(--green)]" : ""}`}>{fmt(t.amount, true)}</span></div>
            <div className="flex items-center justify-between gap-3 mt-1">
              <span className="text-[13px] text-[var(--muted)]">{niceDate(t.date)}</span>
              <select value={cat} onChange={(e) => recat(t, e.target.value)} className="text-[13px] bg-[var(--fill)] rounded-md px-2 py-1 outline-none max-w-[55%]">
                {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        ))}
        {!txns.length && <Row left="Nothing in this category this month" />}
      </List>
    </Sheet>
  );
}

/* ================= BILLS ================= */

const REPEATS = [["once", "Once"], ["monthly", "Monthly"], ["yearly", "Yearly"]];

function Bills({ data, updateBills }) {
  const { bills } = data;
  const [edit, setEdit] = useState(null);
  const soon = upcoming(bills, 60);
  const later = bills.filter((b) => !(b.paid && b.repeat === "once") && !soon.some((s) => s.id === b.id)).sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  const total60 = soon.reduce((s, b) => s + (b.amount || 0), 0);

  const markPaid = (b) => updateBills((list) => list.map((x) => (x.id !== b.id ? x : x.repeat === "once" ? { ...x, paid: true } : { ...x, due: addPeriod(x.due, x.repeat) })));
  const save = (b) => updateBills((list) => (list.some((x) => x.id === b.id) ? list.map((x) => (x.id === b.id ? b : x)) : [...list, b]));
  const remove = (b) => updateBills((list) => list.filter((x) => x.id !== b.id));

  return (
    <>
      <PageHeader title="Bills" sub={`${fmt(total60)} due in the next 60 days`}
        right={<Button kind="primary" onClick={() => setEdit({ id: `b${Date.now()}`, name: "", amount: null, due: todayISO(), repeat: "once", note: "" })}>Add bill</Button>} />
      <SectionTitle>Next 60 days</SectionTitle>
      <List>
        {soon.map((b, i) => (
          <div key={b.id + i} className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => markPaid(b)} title="Mark paid" className="w-6 h-6 rounded-full ring-2 ring-[var(--hair-strong)] hover:ring-[var(--green)] shrink-0" />
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEdit(bills.find((x) => x.id === b.id))}>
              <div className="text-[15px] truncate">{b.name}</div>
              <div className={`text-[13px] truncate ${b.overdue ? "text-[var(--red)]" : "text-[var(--muted)]"}`}>
                {b.overdue ? "Overdue · " : ""}{niceDate(b.due)}{b.repeat !== "once" ? ` · ${b.repeat}` : ""}{b.note ? ` · ${b.note}` : ""}
              </div>
            </div>
            <div className="text-[15px] tabular-nums">{b.amount == null ? <span className="text-[var(--orange)]">TBD</span> : fmt(b.amount)}</div>
          </div>
        ))}
      </List>
      {later.length > 0 && <>
        <SectionTitle>Later</SectionTitle>
        <List>{later.map((b) => <Row key={b.id} left={b.name} sub={`${niceDate(b.due)}${b.note ? ` · ${b.note}` : ""}`} right={b.amount == null ? "TBD" : fmt(b.amount)} onClick={() => setEdit(b)} />)}</List>
      </>}
      <div className="text-[13px] text-[var(--muted)] px-1 mt-3">Tap the circle when a bill is paid. Monthly bills roll to next month.</div>
      {edit && <BillSheet bill={edit} onSave={(b) => { save(b); setEdit(null); }} onDelete={(b) => { remove(b); setEdit(null); }} onClose={() => setEdit(null)} />}
    </>
  );
}

function BillSheet({ bill, onSave, onDelete, onClose }) {
  const [b, setB] = useState({ ...bill });
  const set = (k, v) => setB((x) => ({ ...x, [k]: v }));
  return (
    <Sheet title={bill.name ? "Edit bill" : "New bill"} onClose={onClose}>
      <div className="space-y-3">
        <input className={input} placeholder="What is it?" value={b.name} onChange={(e) => set("name", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className={input} inputMode="decimal" placeholder="Amount (blank = TBD)" value={b.amount ?? ""} onChange={(e) => set("amount", e.target.value === "" ? null : Number(e.target.value))} />
          <input className={input} type="date" value={b.due || ""} onChange={(e) => set("due", e.target.value)} />
        </div>
        <Segmented value={b.repeat || "once"} onChange={(v) => set("repeat", v)} options={REPEATS} />
        <input className={input} placeholder="Note" value={b.note || ""} onChange={(e) => set("note", e.target.value)} />
        <div className="flex justify-between pt-2">
          {bill.name ? <Button kind="danger" onClick={() => onDelete(b)}>Delete</Button> : <span />}
          <Button kind="primary" disabled={!b.name || !b.due} onClick={() => onSave({ ...b, paid: false })}>Save</Button>
        </div>
      </div>
    </Sheet>
  );
}

/* ================= REPORTS ================= */

function Reports({ data }) {
  const { state } = data;
  const [period, setPeriod] = useState("month");
  const rows = useMemo(() => {
    const keyOf = (ym) => (period === "month" ? ym : period === "quarter" ? quarterOf(ym) : ym.slice(0, 4));
    const keys = [...new Set(state.txns.map((t) => t.ym && keyOf(t.ym)).filter(Boolean))].sort().reverse();
    const n = period === "month" ? 12 : period === "quarter" ? 8 : 5;
    return keys.slice(0, n).map((k) => ({ k, ...summarize(state.txns, state.rules, (t) => t.ym && keyOf(t.ym) === k) }));
  }, [state, period]);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.income, r.spent)));
  const label = (k) => (period === "month" ? prettyYM(k) : k);
  const chart = [...rows].reverse();

  return (
    <>
      <PageHeader title="Reports" right={<Segmented value={period} onChange={setPeriod} options={[["month", "Month"], ["quarter", "Quarter"], ["year", "Year"]]} />} />
      <Card className="p-4">
        <div className="flex items-end gap-2 h-44">
          {chart.map((r) => (
            <div key={r.k} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-end gap-0.5 h-36 w-full justify-center">
                <div className="w-1/2 max-w-[14px] rounded-t bg-[var(--green)]" style={{ height: `${(r.income / max) * 100}%` }} title={`In ${fmt(r.income)}`} />
                <div className="w-1/2 max-w-[14px] rounded-t bg-[var(--red)] opacity-80" style={{ height: `${(r.spent / max) * 100}%` }} title={`Out ${fmt(r.spent)}`} />
              </div>
              <div className="text-[10px] text-[var(--muted)] truncate w-full text-center">{period === "month" ? prettyYM(r.k).slice(0, 3) : r.k.replace(/^\d{2}/, "'")}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-[12px] text-[var(--muted)] mt-2">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--green)]" />Came in</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--red)] opacity-80" />Spent</span>
        </div>
      </Card>
      <SectionTitle>By {period}</SectionTitle>
      <List>
        {rows.map((r) => (
          <Row key={r.k} left={label(r.k)} sub={`In ${fmt(r.income)} · Out ${fmt(r.spent)}`}
            right={<span className={r.net >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}>{r.net >= 0 ? "+" : ""}{fmt(r.net)}</span>} />
        ))}
      </List>
      <div className="text-[13px] text-[var(--muted)] px-1 mt-3">Transfers between your own accounts and card payments are left out, so this is real money in and out.</div>
    </>
  );
}

/* ================= DEBT PLAN ================= */

function DebtPlan({ data, updateState }) {
  const { state, balances } = data;
  const debts = liveDebts(state.debts, balances.accounts || []).filter((d) => d.balance > 0.5);
  const [budget, setBudget] = useState(state.budget ?? 1600);
  const res = useMemo(() => simulate(debts, Number(budget) || 0, "avalanche", thisYM()), [debts, budget]);
  const total = debts.reduce((s, d) => s + d.balance, 0);
  const minTotal = debts.reduce((s, d) => s + (d.minPayment || 0), 0);
  const ordered = [...debts].sort((a, b) => (b.apr || 0) - (a.apr || 0));
  const payoff = Object.fromEntries((res.order || []).map((o) => [o.id, o.ym]));

  return (
    <>
      <PageHeader title="Debt plan" sub={`${fmt(total)} across ${debts.length} debts · highest rate first`} />
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 text-[15px]">Monthly toward debt</div>
          <input className={`${input} text-right`} style={{ width: 120 }} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)}
            onBlur={() => updateState((s) => ({ ...s, budget: Number(budget) || 0 }))} />
        </div>
        <div className="text-[13px] text-[var(--muted)] mt-2">Minimums add up to {fmt(minTotal)}.</div>
        {res.infeasible ? (
          <div className="mt-3 text-[15px] text-[var(--red)]">That's below your minimums.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div><div className="text-[13px] text-[var(--muted)]">Debt-free</div><div className="text-[22px] font-semibold">{prettyYM(res.debtFree)}</div></div>
            <div><div className="text-[13px] text-[var(--muted)]">Interest to pay</div><div className="text-[22px] font-semibold tabular-nums">{fmt(res.totalInterest)}</div></div>
          </div>
        )}
      </Card>
      <SectionTitle>Pay in this order</SectionTitle>
      <List>
        {ordered.map((d, i) => (
          <Row key={d.id} left={`${i + 1}. ${d.name}`} sub={`${d.apr || 0}% · min ${fmt(d.minPayment || 0)}${d.live ? " · live balance" : ""}`}
            right={fmt(d.balance)} rightSub={payoff[d.id] ? `paid off ${prettyYM(payoff[d.id])}` : ""} />
        ))}
      </List>
      <div className="text-[13px] text-[var(--muted)] px-1 mt-3">Pay minimums on everything, then every extra dollar goes to #1. When it's gone, roll its payment into #2.</div>
    </>
  );
}

