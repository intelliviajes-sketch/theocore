"use client";

import { useEffect, useState, useRef } from "react";
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
      <div className="flex items-center gap-3 text-sm text-white">
        <div className="h-8 w-8 rounded-full bg-white/20 animate-pulse" />
        <div className="h-3 w-24 rounded bg-white/20 animate-pulse" />
      </div>
    );
  }

  if (!email) {
    return (
      <button
        onClick={() => router.push("/intranet/login")}
        className="rounded-xl border border-white/30 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 transition"
      >
        Iniciar sesión
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <div
        onClick={() => setOpen((prev) => !prev)}
        className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 text-white text-sm font-semibold cursor-pointer hover:bg-white/30 transition shadow-lg"
        title={name ?? email}
      >
        {getInitials(name ?? email)}
      </div>

      {open && (
        <div className="absolute right-0 mt-2 flex flex-col bg-[#083768] border border-white/20 rounded-xl shadow-2xl p-2 min-w-[160px] z-50 animate-fadeIn">
          <div className="px-3 py-2 text-white text-xs border-b border-white/20 mb-2">
            {name ?? email}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-white px-3 py-2 rounded-lg hover:bg-white/20 transition text-left"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
