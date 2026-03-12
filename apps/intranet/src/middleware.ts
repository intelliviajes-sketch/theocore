import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isIntranetPath(pathname: string) {
  return pathname === "/intranet" || pathname.startsWith("/intranet/");
}

function isTravelerPath(pathname: string) {
  return pathname === "/traveler" || pathname.startsWith("/traveler/");
}

function redirect(req: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, req.url));
}

function parseHosts(value: string | undefined, fallback: string[]) {
  const raw = (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return raw.length > 0 ? raw : fallback;
}

function hostMatches(host: string, expectedHosts: string[]) {
  return expectedHosts.some((item) => host === item || host.endsWith(`.${item}`));
}

function resolveScope(req: NextRequest) {
  const envScope = (process.env.APP_SCOPE ?? "").toUpperCase();
  if (envScope === "INTRANET" || envScope === "TRAVELER") {
    return envScope;
  }

  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const intranetHosts = parseHosts(process.env.INTRANET_HOSTS, ["theocore.app"]);
  const travelerHosts = parseHosts(process.env.TRAVELER_HOSTS, ["collaviajes.com", "nusta.pe"]);

  if (hostMatches(host, intranetHosts)) return "INTRANET";
  if (hostMatches(host, travelerHosts)) return "TRAVELER";
  return "";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const appScope = resolveScope(req);

  // Scope-based blocking:
  // INTRANET => block /traveler/*
  // TRAVELER => block /intranet/*
  if (appScope === "INTRANET" && isTravelerPath(pathname)) {
    return redirect(req, "/intranet");
  }
  if (appScope === "TRAVELER" && isIntranetPath(pathname)) {
    return redirect(req, "/traveler");
  }

  // For non-intranet routes, continue normally.
  if (!isIntranetPath(pathname)) {
    return NextResponse.next();
  }

  // Public intranet login route.
  if (pathname.startsWith("/intranet/login")) {
    return NextResponse.next();
  }

  // Protect intranet with Supabase session validation.
  let res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({
            request: { headers: req.headers },
          });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          req.cookies.set({ name, value: "", ...options });
          res = NextResponse.next({
            request: { headers: req.headers },
          });
          res.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/intranet/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/intranet/:path*", "/traveler/:path*"],
};
