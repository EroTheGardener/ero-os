// One-time: trade a SimpleFIN setup token for an access URL.
// The setup token is base64 of a claim URL; claiming it once returns the access URL
// (with credentials) that bank-sync uses. Paste the result into the Vercel env var
// SIMPLEFIN_ACCESS_URL. Holds nothing itself.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST a {token}" });
  const token = String((req.body && req.body.token) || "").trim();
  if (!token) return res.status(400).json({ error: "missing token" });
  let claimUrl;
  try {
    claimUrl = Buffer.from(token, "base64").toString("utf8").trim();
    const u = new URL(claimUrl);
    if (!/simplefin\.org$/.test(u.hostname)) throw new Error("not a SimpleFIN host");
  } catch (e) {
    return res.status(400).json({ error: "bad token: " + e.message });
  }
  const r = await fetch(claimUrl, { method: "POST", headers: { "Content-Length": "0" } });
  const text = await r.text();
  if (!r.ok) return res.status(r.status).json({ error: "claim failed", detail: text.slice(0, 300) });
  return res.status(200).json({ accessUrl: text.trim() });
}
