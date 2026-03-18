export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const response = await fetch("https://www.aktualne.cz/mrss", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
    });
    const xml = await response.text();

    // Parse <item> elements
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
      const item = match[1];
      const get = tag => { const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i")); return m ? (m[1] || m[2] || "").trim() : null; };
      const getAttr = (tag, attr) => { const m = item.match(new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, "i")); return m ? m[1] : null; };
      items.push({
        title:       get("title"),
        description: get("description"),
        link:        get("link"),
        image:       getAttr("media:content", "url") || getAttr("media:thumbnail", "url") || getAttr("enclosure", "url"),
        pubDate:     get("pubDate"),
      });
    }

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
