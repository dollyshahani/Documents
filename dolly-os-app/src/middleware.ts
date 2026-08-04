import { NextRequest, NextResponse } from "next/server";

// Single-user passphrase gate. The cookie stores the passphrase value
// directly (single user, HTTPS, httpOnly — good enough for a personal app).
export function middleware(req: NextRequest) {
  const pass = process.env.APP_PASSPHRASE;
  if (!pass) return NextResponse.next(); // not configured — open (dev)
  const cookie = req.cookies.get("dolly_key")?.value;
  if (cookie === pass) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // everything except: static assets, login, cron (cron uses CRON_SECRET)
    "/((?!_next|icons|manifest\\.json|sw\\.js|favicon|login|api/login|api/cron).*)",
  ],
};
