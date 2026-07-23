// api/_session.js — podpis a ověření session cookie (Node runtime).
// Formát tokenu: base64url(payload).base64url(HMAC-SHA256(payload, SESSION_SECRET))
// Stejný formát ověřuje i middleware.ts přes Web Crypto.

import crypto from "crypto";

export const COOKIE_NAME = "pg_session";
export const MAX_AGE_S   = 30 * 24 * 60 * 60; // 30 dní

const b64url = (buf) => Buffer.from(buf).toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function signSession(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const sig  = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token, secret) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  // časově konstantní porovnání
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (!data.exp || Date.now() / 1000 > data.exp) return null;
    return data;
  } catch { return null; }
}

// Přečte session z požadavku; vrací payload nebo null.
export function readSession(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const raw = req.headers.cookie || "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? verifySession(decodeURIComponent(m[1]), secret) : null;
}

// Vrátí true a odešle 401, pokud uživatel není přihlášen.
export function requireSession(req, res) {
  if (readSession(req)) return false;
  res.status(401).json({ error: "Nepřihlášený požadavek." });
  return true;
}

// Povolené hostitele pro redirect_uri (ochrana proti Host header injection).
export function safeOrigin(req) {
  const host  = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const ok = /^post-generator[a-z0-9-]*\.vercel\.app$/i.test(host)
          || /^post-generator-git-[a-z0-9-]+\.vercel\.app$/i.test(host)
          || /^localhost(:\d+)?$/i.test(host);
  if (!ok) return null;
  return `${proto === "http" && host.startsWith("localhost") ? "http" : "https"}://${host}`;
}
