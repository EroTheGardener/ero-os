// Pull new transactions from every bank linked in SimpleFIN and merge them into the
// Financials data in Supabase (same app_storage row the app reads). Runs daily from
// vercel.json cron; also callable from the app's "Sync banks" button.
//
// Env: SIMPLEFIN_ACCESS_URL (from /api/simplefin-claim). Supabase URL/key are the same
// public ones the browser app uses.
const SUPABASE_URL = "https://ujtzfwyvapckcutfpzwy.supabase.co";
const SUPABASE_KEY = "sb_publishable_0jfwfDGmGLQLm1muTQCIjQ_rFTGw9BT";
const KEY = "eroOS.debtPayoff.v2";
const BAL_KEY = "eroOS.bankBalances.v1";
// History before this came from CSV imports; only sync forward from here so
// SimpleFIN's differently-worded descriptions don't duplicate old rows.
const SYNC_START = "2026-10-10";
// Personal budget only. Business accounts (GNWS, Earthcare, Nexus Garden) and
// retirement/brokerage accounts still report balances but their transactions stay out.
const EXCLUDE_TXNS = /gnws|business credit card|earthcare|nexus garden|\bira\b|brokerage/i;

const sb = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });

async function readKey(key) {
  const r = await sb(`app_storage?key=eq.${encodeURIComponent(key)}&select=value`);
  if (!r.ok) throw new Error(`supabase read ${r.status}`);
  const rows = await r.json();
  if (!rows.length) return null;
  const v = rows[0].value;
  return typeof v === "string" ? JSON.parse(v) : v;
}

async function writeKey(key, obj) {
  const r = await sb("app_storage?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ key, value: JSON.stringify(obj), updated_at: new Date().toISOString() }]),
  });
  if (!r.ok) throw new Error(`supabase write ${r.status}`);
}

function simplefinRequest(accessUrl, path) {
  const u = new URL(accessUrl);
  const auth = Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString("base64");
  u.username = "";
  u.password = "";
  return fetch(`${u.toString().replace(/\/$/, "")}${path}`, { headers: { Authorization: `Basic ${auth}` } });
}

const isoDay = (unix) => new Date(unix * 1000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.abs(new Date(a) - new Date(b)) / 864e5;

export default async function handler(req, res) {
  const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!accessUrl) return res.status(500).json({ error: "SIMPLEFIN_ACCESS_URL not set in Vercel env" });

  try {
    const state = await readKey(KEY);
    if (!state) return res.status(500).json({ error: "no Financials data yet" });
    state.txns = state.txns || [];
    // Clean out anything an earlier run pulled from an excluded account.
    const before = state.txns.length;
    state.txns = state.txns.filter((t) => !(String(t.key || "").startsWith("sf|") && EXCLUDE_TXNS.test(String(t.source || ""))));
    const removed = before - state.txns.length;

    // Look back 30 days each run (SimpleFIN caps ranges at 90). Re-runs are safe:
    // every synced row is keyed by its SimpleFIN id.
    const startDate = Math.max(Date.parse(SYNC_START), Date.now() - 30 * 864e5);
    const r = await simplefinRequest(accessUrl, `/accounts?start-date=${Math.floor(startDate / 1000)}`);
    if (!r.ok) return res.status(502).json({ error: `simplefin ${r.status}`, detail: (await r.text()).slice(0, 300) });
    const data = await r.json();

    const keys = new Set(state.txns.map((t) => t.key));
    let added = 0, skippedDup = 0;
    const balances = [];

    for (const acct of data.accounts || []) {
      const acctName = `${acct.org?.name || ""} ${acct.name || ""}`.trim();
      balances.push({ id: acct.id, name: acctName, balance: Number(acct.balance), available: acct["available-balance"] != null ? Number(acct["available-balance"]) : null, asOf: isoDay(acct["balance-date"]) });

      if (EXCLUDE_TXNS.test(acctName)) continue;
      for (const tx of acct.transactions || []) {
        if (tx.pending) continue;
        const date = isoDay(tx.posted || tx.transacted_at);
        if (date < SYNC_START) continue;
        const key = `sf|${tx.id}`;
        if (keys.has(key)) continue;
        const amount = Math.round(Number(tx.amount) * 100) / 100;
        if (!amount) continue;
        const desc = String(tx.description || tx.payee || tx.memo || "").trim();

        // Already imported from a CSV or statement? Same amount within 3 days and a
        // non-SimpleFIN row counts as the same transaction.
        const dup = state.txns.find((t) => !String(t.key || "").startsWith("sf|") && Math.abs(Number(t.amount) - amount) < 0.005 && t.date && daysBetween(t.date, date) <= 3);
        if (dup) { skippedDup++; continue; }

        state.txns.push({ key, date, ym: date.slice(0, 7), desc, amount, source: `SimpleFIN: ${acctName}` });
        keys.add(key);
        added++;
      }
    }

    if (added || removed) {
      state.__savedAt = Date.now();
      await writeKey(KEY, state);
    }
    await writeKey(BAL_KEY, { syncedAt: new Date().toISOString(), accounts: balances, errors: data.errors || [] });

    return res.status(200).json({ ok: true, added, removed, skippedDup, accounts: balances.length, errors: data.errors || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
