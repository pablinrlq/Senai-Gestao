import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BODY_SIZE_LIMIT = 1_000_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const RATE_LIMIT_MAX_ENTRIES = 1000;

type RateEntry = { count: number; expires: number };

const rateLimitStore = new Map<string, RateEntry>();

const pruneRateLimitStore = (now: number) => {
  if (rateLimitStore.size <= RATE_LIMIT_MAX_ENTRIES) return;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.expires <= now) rateLimitStore.delete(key);
  }
};

const applySecurityHeaders = (res: NextResponse) => {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.headers.set("X-XSS-Protection", "0");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  const connectSources = ["'self'", "https:"];
  if (process.env.NEXT_PUBLIC_API_EXTERNAL) connectSources.push(process.env.NEXT_PUBLIC_API_EXTERNAL);
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSources.join(" ")}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  return res;
};

const getClientIdentifier = (req: NextRequest) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  if (req.ip) return req.ip;
  return "unknown";
};

const isRateLimited = (id: string) => {
  const now = Date.now();
  pruneRateLimitStore(now);
  const entry = rateLimitStore.get(id);

  if (!entry || entry.expires <= now) {
    rateLimitStore.set(id, { count: 1, expires: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count + 1 > RATE_LIMIT_MAX) return true;

  entry.count += 1;
  return false;
};

export function middleware(req: NextRequest) {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const size = Number(contentLength);
    if (Number.isFinite(size) && size > BODY_SIZE_LIMIT) {
      const res = new NextResponse("Payload Too Large", { status: 413 });
      return applySecurityHeaders(res);
    }
  }

  const clientId = getClientIdentifier(req);
  if (isRateLimited(clientId)) {
    const res = new NextResponse("Too Many Requests", { status: 429 });
    return applySecurityHeaders(res);
  }

  const res = NextResponse.next();
  return applySecurityHeaders(res);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
