export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PostGenerator/1.0)" },
    });
    if (!response.ok) return res.status(502).json({ error: "Fetch failed" });
    const html = await response.text();
    const get = prop => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
             || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"));
      return m ? m[1] : null;
    };
    res.status(200).json({ title: get("og:title"), description: get("og:description"), image: get("og:image") });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
