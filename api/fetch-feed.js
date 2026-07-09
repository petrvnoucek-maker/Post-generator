// api/fetch-feed.js — vrátí nejnovější články z RSS feedu aktualne.cz (po stránkách po 20).
// Server-side (bez CORS). Frontend volá /api/fetch-feed?page=N (same-origin → connect-src 'self').

const FEED_BASE = "https://www.aktualne.cz/rss";
const ZENA_FEED   = "https://zena.aktualne.cz/rss";
const EKONOM_FEED = "https://ekonom.cz/?m=rss";
const UA        = "Mozilla/5.0 (compatible; AktualnePostGenerator/1.0)";
const ART_HOST  = /(^|\.)(aktualne\.cz|ekonom\.cz)$/i;

function decode(s) {
  if (!s) return s;
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, "&");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");

  let page = parseInt((req.query && req.query.page) || "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > 50) page = 50; // pojistka
  const source = (req.query && req.query.source) || "";
  const base = source === "zena" ? ZENA_FEED : FEED_BASE;
  // Ekonom feed nemá stránkování a používá jiný formát URL
  const feedUrl = source === "ekonom" ? EKONOM_FEED : (page <= 1 ? base : `${base}/?page=${page}`);

  let xml;
  try {
    const r = await fetch(feedUrl, {
      headers: { "User-Agent": UA, "Accept-Language": "cs,en;q=0.8" },
      redirect: "follow",
    });
    if (!r.ok) return res.status(502).json({ error: `Feed nelze načíst (HTTP ${r.status}).` });
    xml = await r.text();
  } catch {
    return res.status(502).json({ error: "Feed se nepodařilo stáhnout." });
  }

  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < 20) {
    const block = m[1];
    const t = block.match(/<title>([\s\S]*?)<\/title>/);
    const l = block.match(/<link>([\s\S]*?)<\/link>/);
    if (!t || !l) continue;
    const title = decode(t[1]).trim();
    const link  = decode(l[1]).trim();
    // Čas vydání (HH:MM) – pubDate je už v místním (pražském) čase díky offsetu
    let time = "", ts = 0;
    const pd = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (pd) {
      const tm = pd[1].match(/(\d{2}):(\d{2}):\d{2}/);
      if (tm) time = `${tm[1]}:${tm[2]}`;
      const parsed = Date.parse(pd[1].trim());
      if (Number.isFinite(parsed)) ts = parsed;
    }
    try {
      if (ART_HOST.test(new URL(link).hostname) && title) items.push({ title, link, time, ts });
    } catch { /* přeskoč nevalidní */ }
  }

  const hasMore = /rel=["']next["']/i.test(xml) && items.length > 0;

  return res.status(200).json({ items, page, hasMore });
}
