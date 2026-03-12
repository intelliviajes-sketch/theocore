import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isIntranetPath(pathname: string) {
  return pathname === "/intranet" || pathname.startsWith("/intranet/");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Redirigir el root a intranet
  if (pathname === '/') {
    return NextResponse.redirect(new URL("/intranet", req.url));
  }

  // Si no es ruta de intranet, continuar
  if (!isIntranetPath(pathname)) {
    return NextResponse.next();
  }

  // Rutas publicas de intranet
  if (pathname.startsWith("/intranet/login")) {
    return NextResponse.next();
  }

  // Autenticacion Supabase para /intranet/*
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
