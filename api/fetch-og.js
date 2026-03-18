export default async function handler(req, res) {
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
      // Matches any attribute order, single or double quotes
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

    const title       = get("og:title");
    const description = get("og:description");
    const image       = get("og:image");

    // Debug: log what we found
    console.log("OG fetch result:", { url, title: !!title, description: !!description, image: !!image });

    res.status(200).json({ title, description, image });
  } catch (e) {
    console.error("OG fetch error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
