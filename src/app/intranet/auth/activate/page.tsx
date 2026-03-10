"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import Image from "next/image";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { THEOCORE_HOME, agencyHomePath } from "@/lib/routes";

export default function ActivatePage() {
  const router = useRouter();

  const [stage, setStage] = useState<"checking" | "ready" | "saving" | "done" | "error">("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    (async () => {
      setError(null);
      setStage("checking");

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("Error estableciendo sesion:", sessionError);
          router.replace("/intranet");
          return;
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        router.replace("/intranet");
        return;
      }

      setStage("ready");
    })();
  }, [router]);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== password2) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setStage("saving");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStage("ready");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setError("No se pudo recuperar el usuario.");
      setStage("error");
      return;
    }

    const { data: coreUser } = await supabase.from("core_users").select("role").eq("user_id", user.id).maybeSingle();

    if (coreUser?.role === "TheoCoreOwner") {
      router.replace(THEOCORE_HOME);
      setStage("done");
      return;
    }

    const { data: teamData } = await supabase
      .from("agency_team")
      .select("agency_id, role")
      .eq("user_id", user.id)
      .limit(1);

    if (teamData && teamData.length > 0) {
      router.replace(agencyHomePath(teamData[0].agency_id));
      setStage("done");
      return;
    }

    router.replace(THEOCORE_HOME);
    setStage("done");
  }

  const disabled = useMemo(() => stage !== "ready" || !password || !password2, [stage, password, password2]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Particles />

      <div className="relative z-10 mx-auto max-w-lg px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/30 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image src="/theocore-logo.png" alt="TheoCore" fill sizes="40px" className="object-contain drop-shadow" priority />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Activar cuenta</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Crea tu contrasena para comenzar.</p>
            </div>
          </div>

          {stage === "checking" && (
            <div className="mb-4 flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Lucide.Loader2 className="h-4 w-4 animate-spin" /> Verificando enlace...
            </div>
          )}

          {stage === "error" && (
            <div className="mb-4 rounded-lg border border-rose-400/40 bg-rose-50 px-4 py-2 text-sm text-red-600 dark:bg-rose-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {stage !== "error" && (
            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Nueva contrasena</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimo 8 caracteres"
                    className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <Lucide.EyeOff className="h-5 w-5" /> : <Lucide.Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Confirmar contrasena</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              {stage === "ready" && error && <div className="text-sm text-rose-600">{error}</div>}

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={disabled}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-white shadow-lg transition ${
                  disabled
                    ? "cursor-not-allowed bg-slate-400"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-[1.02] hover:opacity-90"
                }`}
              >
                {stage === "saving" ? (
                  <>
                    <Lucide.Loader2 className="h-4 w-4 animate-spin" /> Activando...
                  </>
                ) : (
                  <>Activar cuenta</>
                )}
              </motion.button>
            </form>
          )}
        </motion.div>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          (c) {new Date().getFullYear()} TheoCore - Inteligencia artificial para agencias de viajes
        </div>
      </div>
    </div>
  );
}

function Particles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
        animate={{ x: [0, 15, -10, 0], y: [0, 10, -12, 0], opacity: [0.4, 0.6, 0.35, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ x: [0, -20, 15, 0], y: [0, -10, 18, 0], opacity: [0.35, 0.55, 0.3, 0.35] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
