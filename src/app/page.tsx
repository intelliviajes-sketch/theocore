"use client";

import { ImageWithFallback } from "../components/igma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Brain, Globe, Users, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTenant } from "@/contexts/tenant";
import { getTenantBrandName, getTenantLocaleLabel } from "@/lib/tenant/presentation";

/* =========================
   Hook: media query (SSR-safe)
========================= */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [query]);
  return matches;
}

/* =========================
   Tipos
========================= */
type Particle = {
  top: string;
  left: string;
  duration: string;
  delay: string;
  size: number;
  opacity: number;
};

/* =========================
   Pagina
========================= */
export default function Page() {
  const tenant = useTenant();
  const brandName = getTenantBrandName(tenant);
  const localeLabel = getTenantLocaleLabel(tenant);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const particleCount = isMobile ? 30 : 80;
  const starCount = 20; // Constante para el numero de estrellas de fondo

  const [particles, setParticles] = useState<Particle[]>([]);
  const [stars, setStars] = useState<Particle[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const arr: Particle[] = Array.from({ length: particleCount }).map(() => {
        const top = `${Math.random() * 100}%`;
        const left = `${Math.random() * 100}%`;
        const duration = `${5 + Math.random() * 10}s`;
        const delay = `${Math.random() * 5}s`;
        const size = Math.random() > 0.7 ? 3 : 2;
        const opacity = 0.4 + Math.random() * 0.5;
        return { top, left, duration, delay, size, opacity };
      });
      setParticles(arr);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [particleCount]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const starArr: Particle[] = Array.from({ length: starCount }).map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        duration: `${2 + Math.random() * 3}s`,
        delay: `${Math.random() * 2}s`,
        size: 1,
        opacity: 0.2,
      }));
      setStars(starArr);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [starCount]);

  // Loader 2s con portal energetico
  const [showMain, setShowMain] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowMain(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Transicion Zoom-in IA al ir al login
  const [exiting, setExiting] = useState(false);
  const goLogin = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      window.location.href = "/intranet/login";
    }, 600);
  }, []);

  // Animacion del logo mejorada
  const logoMotion = useMemo(
    () => ({
      initial: { opacity: 0, scale: 0.9, rotateX: -10, rotateY: 8 },
      animate: {
        opacity: 1,
        scale: [1, 1.06, 1],
        rotateX: [-10, -6, -10],
        rotateY: [8, 12, 8],
      },
      transition: {
        duration: 1.4,
        ease: "easeInOut" as const,
        repeat: Infinity,
        repeatType: "reverse" as const,
        repeatDelay: 0.8,
      },
    }),
    []
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0B2E52] via-[#0B224D] to-[#0A1830] text-white antialiased">
      {/* Glow global mejorado */}
      <div className="pointer-events-none absolute -inset-40 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.18),rgba(6,182,212,0.08),rgba(0,0,0,0))] animate-pulse-slow" />

      {/* Segundo glow con offset */}
      <div className="pointer-events-none absolute -inset-60 opacity-60 rounded-[100%] bg-[radial-gradient(ellipse_at_70%_30%,rgba(34,211,238,0.15),rgba(0,0,0,0))]" />

      {/* Grid de fondo sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Particulas holograficas mejoradas */}
      <div aria-hidden className="pointer-events-none absolute inset-0 will-change-transform">
        {particles.map((p, i) => (
          <motion.span
            key={i}
            className="absolute block rounded-full"
            style={{
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: `radial-gradient(circle, rgba(34,211,238,${p.opacity}) 0%, rgba(125,211,252,${p.opacity * 0.6}) 100%)`,
              boxShadow: `0 0 ${p.size * 4}px rgba(34,211,238,${p.opacity * 0.8})`,
              animation: `floatY ${p.duration} ease-in-out ${p.delay} infinite`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [p.opacity * 0.6, p.opacity, p.opacity * 0.6],
            }}
            transition={{
              duration: parseFloat(p.duration) * 0.5,
              repeat: Infinity,
              ease: "easeInOut" as const,
            }}
          />
        ))}
      </div>

      {/* Estrellas de fondo adicionales */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {stars.map((p, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: p.top,
              left: p.left,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: parseFloat(p.duration),
              repeat: Infinity,
              delay: parseFloat(p.delay),
            }}
          />
        ))}
      </div>

      {/* ===== Loader Cinematico con Portal mejorado (2s) ===== */}
      {!showMain && (
        <section className="relative z-20 flex min-h-[100svh] items-center justify-center">
          {/* Portal energetico multiple */}
          <motion.div
            initial={{ clipPath: "circle(0% at 50% 50%)", opacity: 0 }}
            animate={{ clipPath: "circle(70% at 50% 50%)", opacity: 1 }}
            transition={{ duration: 1.4, ease: "easeInOut", delay: 0.3 }}
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(closest-side, rgba(34,211,238,0.40) 0%, rgba(34,211,238,0.15) 40%, transparent 70%)",
              filter: "blur(3px)",
            }}
          />

          {/* Portal secundario */}
          <motion.div
            initial={{ clipPath: "circle(0% at 50% 50%)", opacity: 0 }}
            animate={{ clipPath: "circle(50% at 50% 50%)", opacity: 0.6 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(closest-side, rgba(6,182,212,0.35) 0%, transparent 60%)",
              filter: "blur(5px)",
            }}
          />

          {/* Anillos giratorios en el loader */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full border-2 border-cyan-400/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full border border-cyan-300/10"
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Logo 400px con efectos incandescentes mejorados */}
          <motion.div
            initial={logoMotion.initial}
            animate={logoMotion.animate}
            transition={logoMotion.transition}
            className="relative will-change-transform"
          >
            {/* Multiples capas de glow */}
            <motion.div
              className="absolute -inset-16 rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.60),transparent)] blur-3xl"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut" as const,
              }}
            />
            <motion.div
              className="absolute -inset-12 rounded-full bg-[radial-gradient(closest-side,rgba(6,182,212,0.50),transparent)] blur-2xl"
              animate={{
                scale: [1.1, 1, 1.1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut" as const,
                delay: 0.3,
              }}
            />

            {/* Destellos de luz */}

            {/* Pulsos de energia */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-2 border-cyan-400/30 rounded-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{
                  scale: [0.9, 2.2],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 1,
                  ease: "easeOut",
                }}
              />
            ))}

            <ImageWithFallback
              src="/theocore-logosinfondo.png"
              alt="TheoCore"
              width={400}
              height={400}
              className="relative drop-shadow-[0_0_35px_rgba(34,211,238,0.85)]"
              style={{
                filter: 'brightness(1.2) contrast(1.15)',
              }}
            />
          </motion.div>
        </section>
      )}

      {/* ===== Contenido principal ===== */}
      {showMain && (
        <>
          {/* HERO */}
          <section className="relative z-10 flex min-h-[30svh] flex-col items-center justify-center px-6 text-center pt-5">
            {/* Logo 300px con efectos incandescentes */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, rotateX: -8, rotateY: 6 }}
              animate={{
                opacity: 1,
                scale: [1, 1.04, 1],
                rotateX: [-8, -5, -8],
                rotateY: [6, 10, 6],
              }}
              transition={{
                duration: 1.1,
                ease: "easeInOut" as const,
                repeat: Infinity,
                repeatType: "reverse" as const,
                repeatDelay: 0.2,
              }}
              className="relative mb-8 will-change-transform"
            >
              {/* Anillos giratorios */}
              <motion.div
                className="absolute -inset-12 rounded-full border border-cyan-400/15"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute -inset-16 rounded-full border border-cyan-300/10"
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              />

            {/* Multiples capas de glow */}
              <motion.div
                className="absolute -inset-14 rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.45),transparent)] blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut" as const,
                }}
              />
              <motion.div
                className="absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgba(6,182,212,0.40),transparent)] blur-xl"
                animate={{
                  scale: [1.1, 0.95, 1.1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut" as const,
                  delay: 0.4,
                }}
              />

              {/* Destellos */}


              <ImageWithFallback
                src="/theocore-logosinfondo.png"
                alt="TheoCore"
                width={250}
                height={250}
                className="relative drop-shadow-[0_0_28px_rgba(34,211,238,0.75)]"
                style={{
                  filter: 'brightness(1.15) contrast(1.1)',
                }}
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="mx-auto max-w-2xl bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl"
            >
              <motion.span
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  backgroundImage: 'linear-gradient(90deg, #fff 0%, #67e8f9 25%, #22d3ee 50%, #67e8f9 75%, #fff 100%)',
                  backgroundSize: '200% auto',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                TheoCore: Inteligencia central para la gestion global de agencias
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
              className="mx-auto mt-2 max-w-2xl text-white/80"
            >
              Unifica, automatiza y expande operaciones en multiples paises bajo el
              dominio de la IA. Decisiones impulsadas por datos, control corporativo
              en tiempo real.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
              className="mt-4 inline-flex items-center gap-3 rounded-full border border-cyan-300/30 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-md"
            >
              <span>{brandName}</span>
              <span className="h-1 w-1 rounded-full bg-cyan-200" />
              <span>{localeLabel}</span>
            </motion.div>

            {/* Icono decorativo */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: 1,
                rotate: [0, 180, 360],
              }}
              transition={{
                opacity: { duration: 2, repeat: Infinity },
                rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                scale: { delay: 0.5, duration: 0.5 }
              }}
              className="mt-4"
            >
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </motion.div>
          </section>

          {/* DIAGRAMA FUTURISTA: TheoCore -> Agencias -> Clientes */}
          <section className="relative z-10 mx-auto max-w-6xl px-6 pb-14 pt-2">


            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
              className="relative rounded-3xl border border-white/20 bg-white/5 p-8 backdrop-blur-xl shadow-[0_0_80px_rgba(34,211,238,0.15)]"
            >
              {/* Glow del contenedor */}
              <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 blur-xl -z-10" />

              {/* Conexiones con energia IA mejoradas */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 1200 360"
                preserveAspectRatio="xMidYMid slice"
              >
                {/* Lineas base */}
                <path
                  d="M200,120 C400,160 800,160 1000,120"
                  stroke="rgba(226, 242, 255, 0.15)"
                  strokeWidth="3"
                  fill="none"
                />
                <path
                  d="M200,200 C420,240 780,240 1000,200"
                  stroke="rgba(226, 242, 255, 0.15)"
                  strokeWidth="3"
                  fill="none"
                />

                {/* Gradientes mejorados */}
                <defs>
                  <linearGradient id="g1" x1="0" x2="1">
                    <stop offset="0%" stopColor="rgba(59,130,246,0.0)" />
                    <stop offset="40%" stopColor="rgba(34,211,238,0.6)" />
                    <stop offset="50%" stopColor="rgba(34,211,238,1)" />
                    <stop offset="60%" stopColor="rgba(34,211,238,0.6)" />
                    <stop offset="100%" stopColor="rgba(59,130,246,0.0)" />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" x2="1">
                    <stop offset="0%" stopColor="rgba(59,130,246,0.0)" />
                    <stop offset="40%" stopColor="rgba(125,211,252,0.6)" />
                    <stop offset="50%" stopColor="rgba(165,243,252,1)" />
                    <stop offset="60%" stopColor="rgba(125,211,252,0.6)" />
                    <stop offset="100%" stopColor="rgba(59,130,246,0.0)" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Lineas animadas con glow */}
                <path
                  d="M200,120 C400,160 800,160 1000,120"
                  stroke="url(#g1)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#glow)"
                  style={{
                    strokeDasharray: "180 560",
                    animation: "dashMove 2.5s linear infinite",
                  }}
                />
                <path
                  d="M200,200 C420,240 780,240 1000,200"
                  stroke="url(#g2)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#glow)"
                  style={{
                    strokeDasharray: "180 560",
                    animation: "dashMove 3s linear infinite",
                    animationDelay: "0.6s",
                  }}
                />
              </svg>

              {/* Nodos mejorados */}
              <div className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-3">
                {/* TheoCore */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex flex-col items-center text-center cursor-pointer"
                >
                  <div className="relative group">
                    {/* Glow animado */}
                    <motion.div
                      className="absolute -inset-8 rounded-2xl bg-[radial-gradient(closest-side,rgba(14,165,233,0.45),transparent)] blur-2xl"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut" as const,
                      }}
                    />

                    {/* Anillo giratorio */}
                    <motion.div
                      className="absolute -inset-6 rounded-2xl border border-cyan-400/20"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />

                    <motion.div
                      className="rounded-2xl border border-white/30 bg-white/10 p-6 backdrop-blur-lg shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-all group-hover:border-cyan-400/50 group-hover:shadow-[0_0_50px_rgba(14,165,233,0.5)]"
                      whileHover={{ borderColor: "rgba(34,211,238,0.5)" }}
                    >
                      <Brain className="h-10 w-10 text-cyan-300" />
                    </motion.div>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">TheoCore (IA)</h3>
                  <p className="mt-1 max-w-xs text-sm text-white/75">
                    Nucleo que analiza, orquesta y aprende de cada interaccion del
                    ecosistema.
                  </p>
                </motion.div>

                {/* Agencias */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex flex-col items-center text-center cursor-pointer"
                >
                  <div className="relative group">
                    <motion.div
                      className="absolute -inset-8 rounded-2xl bg-[radial-gradient(closest-side,rgba(99,102,241,0.45),transparent)] blur-2xl"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut" as const,
                        delay: 0.5,
                      }}
                    />

                    <motion.div
                      className="absolute -inset-6 rounded-2xl border border-indigo-400/20"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    />

                    <motion.div
                      className="rounded-2xl border border-white/30 bg-white/10 p-6 backdrop-blur-lg shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all group-hover:border-indigo-400/50 group-hover:shadow-[0_0_50px_rgba(99,102,241,0.5)]"
                      whileHover={{ borderColor: "rgba(129,140,248,0.5)" }}
                    >
                      <Globe className="h-10 w-10 text-indigo-300" />
                    </motion.div>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Agencias Multipais</h3>
                  <p className="mt-1 max-w-xs text-sm text-white/75">
                    Operaciones, equipos y catalogos coordinados en diferentes paises y marcas.
                  </p>
                </motion.div>

                {/* Viajeros / Clientes */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex flex-col items-center text-center cursor-pointer"
                >
                  <div className="relative group">
                    <motion.div
                      className="absolute -inset-8 rounded-2xl bg-[radial-gradient(closest-side,rgba(125,211,252,0.45),transparent)] blur-2xl"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{
                        duration: 2.8,
                        repeat: Infinity,
                        ease: "easeInOut" as const,
                        delay: 1,
                      }}
                    />

                    <motion.div
                      className="absolute -inset-6 rounded-2xl border border-sky-400/20"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />

                    <motion.div
                      className="rounded-2xl border border-white/30 bg-white/10 p-6 backdrop-blur-lg shadow-[0_0_30px_rgba(125,211,252,0.3)] transition-all group-hover:border-sky-400/50 group-hover:shadow-[0_0_50px_rgba(125,211,252,0.5)]"
                      whileHover={{ borderColor: "rgba(125,211,252,0.5)" }}
                    >
                      <Users className="h-10 w-10 text-sky-200" />
                    </motion.div>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Viajeros y Clientes</h3>
                  <p className="mt-1 max-w-xs text-sm text-white/75">
                    Experiencias personalizadas, comunicacion 24/7 y valor medible en cada interaccion.
                  </p>
                </motion.div>
              </div>

              {/* CTA final mejorado */}
              <motion.div
                className="mt-8 text-center"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <motion.button
                  onClick={goLogin}
                  className="group relative inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-10 py-3 text-sm font-semibold text-white backdrop-blur-lg transition-all overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Glow en hover */}
                  <motion.div
                    className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-cyan-500/50 opacity-0 blur-lg transition-opacity group-hover:opacity-100"
                  />

                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-1000"
                  />

                  <span className="relative">Entrar al panel administrativo</span>
                  <ArrowRight className="relative h-2 w-2 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </motion.div>
            </motion.div>
          </section>
        </>
      )}


      {/* Animaciones CSS clave mejoradas */}
      <style jsx global>{`
        @keyframes floatY {
          0% { transform: translateY(0) translateX(0); opacity: 0.6; }
          50% { transform: translateY(-18px) translateX(4px); opacity: 0.95; }
          100% { transform: translateY(0) translateX(0); opacity: 0.6; }
        }
        @keyframes dashMove {
          0% { stroke-dashoffset: 740; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </main>
  );
}








