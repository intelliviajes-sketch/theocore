import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // En thecore-traveler ya no hay intranet, no necesitamos auth forzado
  // ni chequeos de appScope de intranet.
  
  const { pathname } = req.nextUrl;
  
  if (pathname === '/') {
    return NextResponse.redirect(new URL("/traveler", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
