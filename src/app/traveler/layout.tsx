"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpenText, ChevronDown, LogIn, LogOut, Settings, UserRound } from "lucide-react";
import { AuthProvider } from "./AuthContext";
import AuthModal from "@/components/traveler/AuthModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { Toaster } from "react-hot-toast";
import { useTenant } from "@/contexts/tenant";
import { TravelerCatalogProvider } from "@/contexts/traveler-catalog";
import { TravelerWorkspaceProvider } from "./TravelerWorkspaceContext";
import { getTenantBrandName, getTenantLocaleLabel } from "@/lib/tenant/presentation";
import { useTravelerPreferences } from "./useTravelerPreferences";

interface UserType {
  id: string;
  name: string;
  email: string;
}

function getInitials(nameOrEmail: string) {
  const clean = nameOrEmail.trim();
  if (!clean) return "IV";
  const tokens = clean.split(/\s+/).slice(0, 2);
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] || ""}${tokens[1][0] || ""}`.toUpperCase();
}

export default function TravelerLayout({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();
  const brandName = useMemo(() => getTenantBrandName(tenant), [tenant]);
  const localeLabel = useMemo(() => getTenantLocaleLabel(tenant), [tenant]);
  const { compactMode } = useTravelerPreferences();

  const [user, setUser] = useState<UserType | null>(null);
  const [openAuth, setOpenAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerElevated, setHeaderElevated] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("travelers")
      .select("id, full_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setUser({
        id: data.id,
        email: data.email,
        name: data.full_name || data.email || "Viajero",
      });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void fetchProfile(session.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setHeaderElevated(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleAuthSuccess = (u: { id: string; email: string; full_name?: string | null }) => {
    setUser({
      id: u.id,
      email: u.email,
      name: u.full_name || u.email || "Viajero",
    });
    setOpenAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const travelerStyle = useMemo(
    () =>
      ({
        "--trav-primary": "#f97316",
        "--trav-accent": "#f97316",
        "--trav-surface": "#ffffff",
        "--trav-surface-muted": "#fffaf7",
        "--trav-border": "#ece7e3",
        backgroundColor: "#fffaf7",
      }) as React.CSSProperties,
    [],
  );

  return (
    <AuthProvider user={user} onLoginRequest={() => setOpenAuth(true)} onLogoutRequest={handleLogout}>
      <TravelerCatalogProvider>
        <TravelerWorkspaceProvider userId={user?.id ?? null}>
          <div
            className={`traveler-shell flex min-h-[100dvh] w-full flex-col ${compactMode ? "traveler-compact" : ""}`}
            style={travelerStyle}
          >
            <Toaster position="top-center" />

            <header
              className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-300 ${
                headerElevated
                  ? "border-slate-200 bg-white/95 shadow-sm"
                  : "border-slate-200/70 bg-white/90"
              }`}
            >
              <div className="trav-container px-3 py-3 sm:px-5">
                <div className="flex items-center justify-between">
                  <Link href="/traveler" className="inline-flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-xs font-bold tracking-[0.08em] text-white">
                      IVI
                    </span>
                    <span className="hidden sm:block">
                      <p className="text-sm font-semibold text-slate-900">{brandName}</p>
                      <p className="text-[11px] text-slate-500">{localeLabel}</p>
                    </span>
                  </Link>

                  <div
                    ref={menuRef}
                    className="group relative"
                    onMouseEnter={() => setMenuOpen(true)}
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setMenuOpen((current) => !current)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                        aria-label="Menu de usuario"
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                      >
                        {user ? (
                          <span className="text-xs font-semibold">{getInitials(user.name || user.email)}</span>
                        ) : (
                          <UserRound className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuOpen((current) => !current)}
                        className="ml-1 hidden h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:inline-flex"
                        aria-label="Expandir menu de usuario"
                        aria-expanded={menuOpen}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    <div
                      className={`absolute right-0 top-12 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all duration-150 ${
                        menuOpen
                          ? "pointer-events-auto visible translate-y-0 opacity-100"
                          : "pointer-events-none invisible -translate-y-1 opacity-0"
                      }`}
                    >
                      {user ? (
                        <>
                          <div className="mb-1 rounded-xl bg-slate-50 px-3 py-2">
                            <p className="line-clamp-1 text-sm font-semibold text-slate-900">{user.name}</p>
                            <p className="line-clamp-1 text-xs text-slate-500">{user.email}</p>
                          </div>
                          <Link
                            href="/traveler/profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <UserRound className="h-4 w-4" />
                            Usuario
                          </Link>
                          <Link
                            href="/traveler/bookings"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <BookOpenText className="h-4 w-4" />
                            Historial
                          </Link>
                          <Link
                            href="/traveler/preferences"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Settings className="h-4 w-4" />
                            Preferencias
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleLogout()}
                            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                          >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesion
                          </button>
                        </>
                      ) : (
                        <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              setOpenAuth(true);
                            }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <LogIn className="h-4 w-4" />
                          Iniciar sesion
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto">{children}</main>

            <AuthModal open={openAuth} onClose={() => setOpenAuth(false)} onSuccess={handleAuthSuccess} />
          </div>
        </TravelerWorkspaceProvider>
      </TravelerCatalogProvider>
    </AuthProvider>
  );
}
