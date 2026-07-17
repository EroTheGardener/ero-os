/* ============================================================
   SUPABASE STORAGE SHIM
   Drop-in replacement for the old localStorage-only shim. Keeps
   the exact same window.storage.get/set/delete/list interface
   every module already calls, but backs it with a shared Supabase
   table ("app_storage") instead of the local browser's storage.

   This means the SAME DATA now shows up on every device that
   loads this app pointed at the same Supabase project — phone
   and computer both read/write the same rows.

   Local caching: each key is also mirrored into localStorage as a
   fast local cache and offline fallback. On load, the shim serves
   the local cache immediately (so the UI doesn't sit blank) and
   kicks off a background refresh from Supabase, updating once the
   network responds. Every write goes to Supabase first (source of
   truth), then updates the local cache.

   Config: reads window.__SUPABASE_URL__ and window.__SUPABASE_KEY__,
   set in index.html before this script loads.
   ============================================================ */

(function () {
  const SUPABASE_URL = window.__SUPABASE_URL__;
  const SUPABASE_KEY = window.__SUPABASE_KEY__;
  const TABLE = "app_storage";
  const LOCAL_PREFIX = "sb-cache:";

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      "Supabase config missing. Set window.__SUPABASE_URL__ and window.__SUPABASE_KEY__ before loading storage-shim.js."
    );
  }

  const restUrl = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  function localGet(key) {
    const raw = localStorage.getItem(LOCAL_PREFIX + key);
    return raw === null ? null : raw;
  }
  function localSet(key, value) {
    try {
      localStorage.setItem(LOCAL_PREFIX + key, value);
    } catch {
      // local cache is best-effort; Supabase remains source of truth
    }
  }
  function localDelete(key) {
    localStorage.removeItem(LOCAL_PREFIX + key);
  }

  async function fetchRemote(key) {
    const res = await fetch(
      restUrl(`${TABLE}?key=eq.${encodeURIComponent(key)}&select=value`),
      { headers }
    );
    if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
    const rows = await res.json();
    if (!rows.length) return null;
    // value column is jsonb; our callers store JSON-stringified text,
    // so we stored it as a jsonb string — unwrap back to the raw string.
    const v = rows[0].value;
    return typeof v === "string" ? v : JSON.stringify(v);
  }

  async function upsertRemote(key, value) {
    const res = await fetch(restUrl(`${TABLE}?on_conflict=key`), {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([{ key, value, updated_at: new Date().toISOString() }]),
    });
    if (!res.ok) throw new Error(`Supabase write failed (${res.status})`);
  }

  async function deleteRemote(key) {
    const res = await fetch(restUrl(`${TABLE}?key=eq.${encodeURIComponent(key)}`), {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error(`Supabase delete failed (${res.status})`);
  }

  async function listRemote(prefix) {
    const res = await fetch(
      restUrl(`${TABLE}?key=like.${encodeURIComponent(prefix)}*&select=key`),
      { headers }
    );
    if (!res.ok) throw new Error(`Supabase list failed (${res.status})`);
    const rows = await res.json();
    return rows.map((r) => r.key);
  }

  window.storage = {
    // Returns the local cache immediately if present; if nothing local,
    // waits on the network. Either way, a background refresh runs so
    // subsequent reads (or a manual reload) pick up remote changes made
    // from another device.
    async get(key) {
      const cached = localGet(key);
      if (cached !== null) {
        // background refresh, don't block the caller
        fetchRemote(key)
          .then((remoteVal) => {
            if (remoteVal !== null && remoteVal !== cached) localSet(key, remoteVal);
          })
          .catch(() => {});
        return { key, value: cached, shared: false };
      }
      const remoteVal = await fetchRemote(key);
      if (remoteVal === null) throw new Error(`Key not found: ${key}`);
      localSet(key, remoteVal);
      return { key, value: remoteVal, shared: false };
    },

    async set(key, value) {
      localSet(key, value); // update local cache immediately for snappy UI
      await upsertRemote(key, value); // then push to shared store
      return { key, value, shared: false };
    },

    async delete(key) {
      localDelete(key);
      await deleteRemote(key);
      return { key, deleted: true, shared: false };
    },

    async list(prefix = "") {
      const keys = await listRemote(prefix);
      return { keys, prefix, shared: false };
    },
  };
})();
