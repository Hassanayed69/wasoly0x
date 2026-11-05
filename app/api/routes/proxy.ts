// Server-side proxy for the public Islamic/geo APIs (AlAdhan, Overpass, Nominatim).
// Client tries direct fetch first (CORS-enabled public APIs); this proxy is the fallback
// for networks where those hosts are unreachable from the browser.
import { Hono } from "hono";
import { log } from "../lib/logger";

export const proxyRoutes = new Hono();

const ALLOWED_HOSTS = new Set([
  "api.aladhan.com",
  "overpass-api.de",
  "overpass.kumi.systems",
  "nominatim.openstreetmap.org",
]);

const memCache = new Map<string, { at: number; ttl: number; body: string; ctype: string }>();

async function proxyFetch(c: { req: { url: string; raw: Request }; json: (v: unknown, s?: number) => Response; body: (b: string | null, s?: number, h?: Record<string, string>) => Response }) {
  const url = new URL(c.req.url);
  const target = url.searchParams.get("url");
  if (!target) return c.json({ error: "missing url" }, 400);
  let t: URL;
  try {
    t = new URL(target);
  } catch {
    return c.json({ error: "bad url" }, 400);
  }
  if (!ALLOWED_HOSTS.has(t.hostname)) return c.json({ error: "host not allowed" }, 403);

  const key = c.req.raw.method + ":" + target + (c.req.raw.method === "POST" ? ":" + (await c.req.raw.clone().text()) : "");
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) {
    return c.body(hit.body, 200, { "Content-Type": hit.ctype, "X-Cache": "hit" });
  }

  try {
    const init: RequestInit = {
      method: c.req.raw.method === "POST" ? "POST" : "GET",
      headers: { "User-Agent": "wusuli-app/1.0 (prayer-times & mosque finder)" },
    };
    if (c.req.raw.method === "POST") {
      (init.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
      init.body = await c.req.raw.text();
    }
    const res = await fetch(t.toString(), init);
    const body = await res.text();
    const ctype = res.headers.get("content-type") ?? "application/json";
    if (res.ok) memCache.set(key, { at: Date.now(), ttl: 10 * 60 * 1000, body, ctype });
    return c.body(body, res.status as 200, { "Content-Type": ctype });
  } catch (e) {
    log.error("proxy fetch failed", { target: t.hostname, error: String(e) });
    return c.json({ error: "upstream unavailable" }, 502);
  }
}

proxyRoutes.get("/", proxyFetch);
proxyRoutes.post("/", proxyFetch);
