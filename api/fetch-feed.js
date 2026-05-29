// api/fetch-feed.js — vrátí nejnovější články z RSS feedu aktualne.cz (po stránkách po 20).
// Server-side (bez CORS). Frontend volá /api/fetch-feed?page=N (same-origin → connect-src 'self').

const FEED_BASE = "https://www.aktualne.cz/rss";
const UA        = "Mozilla/5.0 (compatible; AktualnePostGenerator/1.0)";
const ART_HOST  = /(^|\.)aktualne\.cz$/i;

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
  const feedUrl = page <= 1 ? FEED_BASE : `${FEED_BASE}/?page=${page}`;

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
    try {
      if (ART_HOST.test(new URL(link).hostname) && title) items.push({ title, link });
    } catch { /* přeskoč nevalidní */ }
  }

  const hasMore = /rel=["']next["']/i.test(xml) && items.length > 0;

  return res.status(200).json({ items, page, hasMore });
}
