// api/shorten.js — zkrácení URL přes Droplr (Create Drop – LINK).
// Vyžaduje Vercel env vars: DROPLR_EMAIL, DROPLR_PASSWORD (přihlašovací údaje účtu,
// pod kterým je nakonfigurovaná doména aktln.cz).
// Zkracuje pouze URL z domén aktualne.cz / ekonom.cz, aby endpoint nešel zneužít
// jako veřejný zkracovač.

import Droplr from "droplr-api";

const ALLOWED_HOST = /(^|\.)(aktualne\.cz|ekonom\.cz)$/i;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const email    = process.env.DROPLR_EMAIL;
  const password = process.env.DROPLR_PASSWORD;
  if (!email || !password) {
    return res.status(503).json({ error: "Zkracovač není nakonfigurován (chybí DROPLR_EMAIL / DROPLR_PASSWORD ve Vercel env)." });
  }

  const target = req.query && req.query.url;
  if (!target) return res.status(400).json({ error: "Chybí parametr url." });

  let u;
  try { u = new URL(target); } catch { return res.status(400).json({ error: "Neplatná URL." }); }
  if (u.protocol !== "https:" || !ALLOWED_HOST.test(u.hostname)) {
    return res.status(400).json({ error: "Zkracovat lze jen https adresy z domén aktualne.cz a ekonom.cz." });
  }

  try {
    const client = new Droplr.Client({ auth: new Droplr.BasicAuth(email, password) });
    const drop = await client.drops.create({ type: "LINK", content: u.toString() });
    const shortlink = drop && (drop.shortlink || drop.shortLink);
    if (!shortlink) {
      return res.status(502).json({ error: "Droplr nevrátil zkrácený odkaz.", raw: drop && drop.code });
    }
    return res.status(200).json({ shortlink });
  } catch (e) {
    const status = e && e.response && e.response.status;
    const msg    = e && e.response && e.response.data && e.response.data.message;
    if (status === 401) return res.status(502).json({ error: "Droplr odmítl přihlášení – zkontroluj DROPLR_EMAIL / DROPLR_PASSWORD." });
    return res.status(502).json({ error: `Zkrácení selhalo${msg ? `: ${msg}` : "."}` });
  }
}
