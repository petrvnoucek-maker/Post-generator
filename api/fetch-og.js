export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: `Server vrátil HTTP ${response.status}` });
    }

    const html = await response.text();
    console.log("HTML length:", html.length);
    console.log("Has og:title:", html.includes("og:title"));

    const get = prop => {
      const escaped = prop.replace(":", "\\:");
      const patterns = [
        new RegExp(`<meta[^>]+property=["']og:${prop.split(":")[1]}["'][^>]+content=["']([^"'<>]+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']og:${prop.split(":")[1]}["']`, "i"),
        new RegExp(`property=["']${prop}["'][^>]+content=["']([^"'<>]+)["']`, "i"),
        new RegExp(`content=["']([^"'<>]+)["'][^>]+property=["']${prop}["']`, "i"),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1].trim();
      }
      return null;
    };

    const title       = get("og:title");
    const description = get("og:description");
    const image       = get("og:image");

    console.log("Result:", { title: title?.substring(0, 50), description: !!description, image: !!image });

    return res.status(200).json({ title, description, image });

  } catch (e) {
    clearTimeout(timeout);
    const isTimeout = e.name === "AbortError";
    console.error("Fetch error:", e.message);
    return res.status(500).json({
      error: isTimeout
        ? "Časový limit vypršel — server článku neodpovídá"
        : `Chyba: ${e.message}`
    });
  }
}
