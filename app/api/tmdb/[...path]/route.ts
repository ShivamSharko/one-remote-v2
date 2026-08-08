import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.TMDB_API_KEY || "";
const limits = new Map<string, { count: number; reset: number }>();

export async function GET(req: NextRequest, ctx: any) {
  // 1) Only YOUR website may use this proxy
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = (req.headers.get("host") || "").split(":")[0];

  // Block if origin is present but wrong
  if (origin && !origin.includes(host)) {
    return NextResponse.json({ error: "blocked" }, { status: 403 });
  }
  // Block if no origin, but referer is present and wrong
  if (!origin && referer && !referer.includes(host)) {
    return NextResponse.json({ error: "blocked" }, { status: 403 });
  }
  // 2) Rate limit: 60 requests/minute per visitor
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "anon";
  const now = Date.now();
  const e = limits.get(ip) || { count: 0, reset: now + 60000 };
  if (now > e.reset) { e.count = 0; e.reset = now + 60000; }
  e.count++;
  limits.set(ip, e);
  if (e.count > 60) return NextResponse.json({ error: "slow down" }, { status: 429 });

  // 3) Forward to TMDB with the secret key (server-side only)
  const { path } = await ctx.params;
  const url = new URL(`https://api.themoviedb.org/3/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((v, k) => { if (k !== "api_key") url.searchParams.set(k, v); });
  url.searchParams.set("api_key", KEY);
  try {
    const res = await fetch(url.toString());
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "upstream error" }, { status: res.status || 502 });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: { "Cache-Control": "public, s-maxage=600" },
    });
  } catch {
    return NextResponse.json({ error: "proxy error" }, { status: 502 });
  }
}