export default async function handler(req, res) {
  // CORS headers — allow requests from any origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "cs,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!response.ok) return res.status(502).json({ error: `HTTP ${response.status}` });
    const html = await response.text();

    const get = prop => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"),
        new RegExp(`<meta[^>]+property=${prop}[^>]+content=["']([^"']+)["']`, "i"),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m) return m[1];
      }
      return null;
    };

    res.status(200).json({
      title: get("og:title"),
      description: get("og:description"),
      image: get("og:image"),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
