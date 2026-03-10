import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Exclusión: permite el acceso a /intranet/login
  if (pathname.startsWith("/intranet/login")) {
    return NextResponse.next();
  }

  // 2. Inicialización del Cliente Supabase (Solución a la advertencia 'deprecated'):
  // Creamos la respuesta que contendrá los headers de las cookies (para refresco de sesión).
  let res = NextResponse.next(); // Usamos 'let' para poder reasignar 'res'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        // 🚨 Patrón actualizado: Reasignamos 'res' para actualizar las cookies
        set(name: string, value: string, options: any) {
          // 1. Añadimos la cookie al Request
          req.cookies.set({ name, value, ...options });

          // 2. Creamos un nuevo NextResponse para actualizar la Respuesta
          res = NextResponse.next({
            request: { headers: req.headers },
          });

          // 3. Establecemos la cookie en la nueva Respuesta
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          // 1. Eliminamos del Request
          req.cookies.set({ name, value: "", ...options });

          // 2. Creamos un nuevo NextResponse
          res = NextResponse.next({
            request: { headers: req.headers },
          });

          // 3. Eliminamos de la Respuesta
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 3. Verificación de Autenticación
  // Esta llamada refresca la sesión y actualiza las cookies mediante las funciones 'set' y 'remove' de arriba.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Redirección si el Usuario NO está Autenticado
  if (!user) {
    const loginUrl = new URL("/intranet/login", req.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // 5. Continuar si Autenticado (devolvemos 'res' con las cookies actualizadas)
  return res;
}

export const config = {
  matcher: ["/intranet/:path*"],
};