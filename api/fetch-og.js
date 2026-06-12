// api/fetch-og.js — Vercel Node serverless funkce
// Načte článek z aktualne.cz (a subdomén), vrátí titulek, perex, kredit fotografa
// a hlavní fotografii jako base64 data URL.
//
// Proč data URL: serverless běží server-side (žádné CORS), obrázek vrácený jako
// data: URL je povolen CSP (img-src data:) a nezašpiní canvas → export PNG funguje.
// Jediný požadavek na CSP: connect-src musí povolit 'self'.

const ARTICLE_HOST = /(^|\.)aktualne\.cz$/i;
const IMG_HOST     = /(^|\.)(aktualne\.cz|eco-files\.cz|xsd\.cz)$/i;
const UA           = "Mozilla/5.0 (compatible; AktualnePostGenerator/1.0)";
const MAX_IMG_BYTES = 8 * 1024 * 1024;

function decode(s) {
  if (!s) return s;
  return s
    .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, "&");
}

function metaContent(html, attr, val) {
  // pořadí atributů (content vs property/name) je u aktualne.cz proměnlivé → matchujeme celý tag
  const re = new RegExp(`<meta[^>]*${attr}=["']${val}["'][^>]*>`, "i");
  const m = html.match(re);
  if (!m) return null;
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? decode(c[1]) : null;
}

function stripSite(t) {
  if (!t) return t;
  return t.replace(/\s*[|\u2013-]\s*Aktuálně\.cz\s*$/i, "").trim();
}

// JSON-LD: kredit hlavní fotky z NewsArticle.image.creditText.
// Struktura může být: objekt s @graph, samotný NewsArticle, nebo pole;
// image může být string, ImageObject, nebo pole obojího.
function extractJsonLdCredit(html) {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const tag of scripts) {
    const raw = tag.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    const nodes = [];
    const collect = d => {
      if (!d) return;
      if (Array.isArray(d)) { d.forEach(collect); return; }
      if (typeof d === "object") { nodes.push(d); if (d["@graph"]) collect(d["@graph"]); }
    };
    collect(data);
    for (const n of nodes) {
      const t = n["@type"];
      const isArticle = t === "NewsArticle" || t === "Article" ||
                        (Array.isArray(t) && (t.includes("NewsArticle") || t.includes("Article")));
      if (!isArticle || !n.image) continue;
      const imgs = Array.isArray(n.image) ? n.image : [n.image];
      for (const im of imgs) {
        if (im && typeof im === "object" && im.creditText && String(im.creditText).trim()) {
          // dedup po segmentech ("Profimedia / Profimedia" → "Profimedia")
          return String(im.creditText).trim()
            .split(/\s*\/\s*/)
            .filter((seg, i, arr) => seg && seg !== arr[i - 1])
            .join(" / ");
        }
      }
    }
  }
  return "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const target = req.query && req.query.url;
  if (!target) return res.status(400).json({ error: "Chybí parametr url." });

  let u;
  try { u = new URL(target); } catch { return res.status(400).json({ error: "Neplatná URL." }); }
  if (u.protocol !== "https:") return res.status(400).json({ error: "Povolené jsou jen https adresy." });
  if (!ARTICLE_HOST.test(u.hostname)) {
    return res.status(400).json({ error: "Podporovány jsou jen adresy z domény aktualne.cz." });
  }

  // 1) Stáhnout HTML článku (server-side → bez CORS)
  let html;
  try {
    const r = await fetch(u.toString(), {
      headers: { "User-Agent": UA, "Accept-Language": "cs,en;q=0.8" },
      redirect: "follow",
    });
    if (!r.ok) return res.status(502).json({ error: `Článek nelze načíst (HTTP ${r.status}).` });
    html = await r.text();
  } catch {
    return res.status(502).json({ error: "Článek se nepodařilo stáhnout." });
  }

  // 2) Titulek + perex
  const title = stripSite(metaContent(html, "property", "og:title") || metaContent(html, "name", "twitter:title"));
  const perex = metaContent(html, "name", "description") || metaContent(html, "property", "og:description");

  // 3) Hlavní foto + kredit – primárně z photoswipe JSON v hlavičkovém <figure>
  let imgUrl = null, credit = "";
  const ps = html.match(/e-web-aktualne-articles-show-header__image[\s\S]{0,500}?data-photoswipe="([^"]*)"/i);
  if (ps) {
    try {
      const d = JSON.parse(decode(ps[1]));
      if (d.src) imgUrl = d.src;
      if (d.author && String(d.author).trim()) credit = String(d.author).trim();
    } catch { /* fallthrough */ }
  }
  // zena.aktualne.cz – jiný header (bez photoswipe): vezmi <img src> z hlavičkového figure
  if (!imgUrl) {
    const zh = html.match(/e-web-zena-articles-show-header__image[\s\S]{0,1500}?<img[^>]*\ssrc="([^"]+)"/i);
    if (zh) imgUrl = zh[1];
  }
  // fallback na og:image (typicky poutací foto pro sdílení)
  if (!imgUrl) imgUrl = metaContent(html, "property", "og:image") || metaContent(html, "name", "twitter:image");
  // fallback kreditu z JSON-LD (strukturovaná data – spolehlivější než text)
  if (!credit) credit = extractJsonLdCredit(html);
  // fallback kreditu z textu "Foto: …"
  if (!credit) {
    const fc = html.match(/Foto:\s*([^<\n]{1,80})/);
    if (fc) credit = decode(fc[1]).trim();
  }

  // 4) Autoři článku (info navíc)
  let authors = [];
  const am = html.match(/"author":\[(.*?)\]/s);
  if (am) authors = Array.from(am[1].matchAll(/"name":"([^"]+)"/g)).map(x => decode(x[1]));

  // 5) Proxy obrázku → base64 data URL
  let imageDataUrl = null;
  if (imgUrl) {
    try {
      const iu = new URL(imgUrl, u);
      if (iu.protocol === "https:" && IMG_HOST.test(iu.hostname)) {
        const ir = await fetch(iu.toString(), { headers: { "User-Agent": UA }, redirect: "follow" });
        if (ir.ok) {
          const ct = (ir.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
          if (ct.startsWith("image/")) {
            const buf = Buffer.from(await ir.arrayBuffer());
            if (buf.length > 0 && buf.length <= MAX_IMG_BYTES) {
              imageDataUrl = `data:${ct};base64,${buf.toString("base64")}`;
            }
          }
        }
      }
    } catch { /* obrázek volitelný */ }
  }

  return res.status(200).json({
    title: title || "",
    perex: perex || "",
    credit: credit || "",
    authors,
    imageDataUrl,
  });
}
