"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { THEOCORE_HOME, TRAVELER_HOME, agencyHomePath } from "@/lib/routes";

type Particle = {
  top: string;
  left: string;
  duration: string;
  delay: string;
};

const logoMotion = {
  initial: { opacity: 0, scale: 0.9, rotateX: -10, rotateY: 8 },
  animate: {
    opacity: 1,
    scale: [1, 1.06, 1],
    rotateX: [-10, -6, -10],
    rotateY: [8, 12, 8],
  },
  transition: {
    duration: 2.2,
    ease: "easeInOut" as const,
    repeat: Infinity,
    repeatType: "reverse" as const,
    repeatDelay: 1,
  },
};

export default function TheoCoreLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  const redirectAccordingToRole = useCallback(
    async (userId: string) => {
      const { data: coreUser } = await supabase.from("core_users").select("role").eq("user_id", userId).maybeSingle();

      if (coreUser?.role === "TheoCoreOwner" || coreUser?.role === "CoreAdmin") {
        router.replace(THEOCORE_HOME);
        return;
      }

      const { data: teamUser } = await supabase
        .from("agency_team")
        .select("agency_id")
        .eq("user_id", userId)
        .eq("active", true)
        .maybeSingle();

      if (teamUser?.agency_id) {
        router.replace(agencyHomePath(teamUser.agency_id));
        return;
      }

      const { data: traveler } = await supabase.from("agency_travelers").select("agency_id").eq("traveler_id", userId).maybeSingle();

      if (traveler?.agency_id) {
        router.replace(TRAVELER_HOME);
        return;
      }

      setMsg("Tu usuario no tiene rol asignado. Contacta al administrador.");
    },
    [router],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const isMobile = window.innerWidth <= 768;
      const count = isMobile ? 14 : 36;
      const arr: Particle[] = Array.from({ length: count }).map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        duration: `${6 + Math.random() * 8}s`,
        delay: `${Math.random() * 4}s`,
      }));
      setParticles(arr);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await redirectAccordingToRole(data.user.id);
      }
    })();
  }, [redirectAccordingToRole]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMsg("Credenciales incorrectas.");
      setLoading(false);
      return;
    }

    if (data?.user) {
      await redirectAccordingToRole(data.user.id);
    }
    setLoading(false);
  }

  const containerMotion = useMemo(
    () => ({
      initial: { opacity: 0, scale: 0.98, y: 10 },
      animate: { opacity: 1, scale: 1, y: 0 },
      transition: { duration: 0.4, ease: "easeOut" as const },
    }),
    [],
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#0B2E52] via-[#0B224D] to-[#0A1830]">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute block h-[2px] w-[2px] rounded-full bg-cyan-200/60 shadow-[0_0_8px_rgba(34,211,238,0.75)] blur-[0.2px]"
          style={{
            top: p.top,
            left: p.left,
            animation: `floatY ${p.duration} ease-in-out ${p.delay} infinite`,
            opacity: 0.6,
          }}
        />
      ))}

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 text-white">
        <motion.div {...containerMotion} className="w-full max-w-md">
          <div className="mb-8 space-y-4 text-center">
            <motion.div
              initial={logoMotion.initial}
              animate={logoMotion.animate}
              transition={logoMotion.transition}
              className="relative mx-auto h-32 w-32 will-change-transform"
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.50),transparent)] opacity-0 blur-xl"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              <Image
                src="/theocore-logosinfondo.png"
                alt="TheoCore Logo"
                fill
                sizes="128px"
                className="relative object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]"
                style={{ filter: "brightness(1.15) contrast(1.1)" }}
              />
            </motion.div>

            <h1 className="text-2xl font-bold text-white">Acceso al Nucleo</h1>
            <p className="text-sm text-cyan-200/80">Intranet - Motor IA para gestion de viajes</p>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-white/5 p-8 shadow-2xl backdrop-blur-xl transition-all hover:border-cyan-400/40">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-white/80">
                  Correo electronico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/70" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 py-2 pl-10 pr-3 text-white transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-white/80">
                  Contrasena
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/70" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 py-2 pl-10 pr-3 text-white transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-lg font-bold text-white shadow-lg shadow-cyan-500/30 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
                  initial={{ x: "-100%" }}
                  animate={loading ? { x: ["-100%", "100%"] } : {}}
                  transition={{ repeat: loading ? Infinity : 0, duration: 1.5, ease: "linear" }}
                />
                <span className="relative z-10">{loading ? "Conectando al Nucleo..." : "Iniciar sesion"}</span>
              </motion.button>

              {msg && <p className="mt-4 text-center text-sm font-semibold text-red-300">{msg}</p>}

              <p className="pt-2 text-center text-xs text-white/60">
                Olvidaste tu contrasena? <a href="#" className="text-cyan-400 hover:underline">Recuperar acceso.</a>
              </p>
            </form>
          </div>

          <p className="mt-8 text-center text-xs text-white/40">(c) {new Date().getFullYear()} TheoCore - Inteligencia para agencias.</p>
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes floatY {
          0% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-12px); opacity: 0.9; }
          100% { transform: translateY(0); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
