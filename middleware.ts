// middleware.ts — brána celé aplikace. Bez platné session přesměruje na Google přihlášení.
// Běží na Edge runtime, proto Web Crypto (ne node:crypto).

export const config = {
  // Vše kromě přihlašovacích endpointů a statických assetů.
  matcher: "/((?!api/auth|_next/static|_next/image|favicon.ico|assets/).*)",
};

const COOKIE_NAME = "pg_session";

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function verify(token: string, secret: string): Promise<boolean> {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), new TextEncoder().encode(body));
  if (!ok) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    return !!data.exp && Date.now() / 1000 <= data.exp;
  } catch { return false; }
}

export default async function middleware(request: Request) {
  const secret = process.env.SESSION_SECRET;
  // Bez nakonfigurovaného tajemství aplikaci raději zamkneme, než abychom ji nechali otevřenou.
  if (!secret) {
    return new Response("Autentizace není nakonfigurována (chybí SESSION_SECRET).", { status: 503 });
  }

  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const token = m ? decodeURIComponent(m[1]) : "";

  if (await verify(token, secret)) return; // pokračuj na aplikaci

  const url = new URL(request.url);
  const next = encodeURIComponent(url.pathname + url.search);
  return new Response(null, {
    status: 302,
    headers: { Location: `/api/auth/login?next=${next}` },
  });
}
