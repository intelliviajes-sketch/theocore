"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";

export default function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (mounted) {
        setEmail(user?.email ?? null);
        const fullName =
          (user?.user_metadata?.full_name as string | undefined) ??
          (user?.user_metadata?.name as string | undefined) ??
          user?.email ??
          null;
        setName(fullName);
        setLoading(false);
      }
    })();

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const getInitials = (fullName: string | null): string => {
    if (!fullName) return "U";
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-200">
        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-300 dark:bg-slate-700" />
      </div>
    );
  }

  if (!email) {
    return (
      <button
        onClick={() => router.push("/intranet/login")}
        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Iniciar sesion
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <div
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 shadow transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        title={name ?? email}
      >
        {getInitials(name ?? email)}
      </div>

      {open && (
        <div className="animate-fadeIn absolute right-0 z-50 mt-2 flex min-w-[180px] flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 border-b border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {name ?? email}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Cerrar sesion
          </button>
        </div>
      )}
    </div>
  );
}
