import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isIntranetPath(pathname: string) {
  return pathname === "/intranet" || pathname.startsWith("/intranet/");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isIntranetPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/intranet/login")) {
    return NextResponse.next();
  }

  let res = NextResponse.next({
    request: { headers: req.headers },
  });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: { headers: req.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
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
  matcher: ["/intranet/:path*"],
};
