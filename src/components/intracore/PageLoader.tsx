"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import theoLogo from "@/theocore.png"; // Asegúrate que la ruta es correcta o ajusta según tu estructura

/**
 * 🎯 PageLoader
 * Componente de carga visual inteligente que aparece cuando:
 * - Se inicia el sistema
 * - Se cambia de Global a una Agencia o entre agencias
 *
 * Muestra:
 * ✅ Logo animado (flotante + glow)
 * ✅ Ondas expansivas (representando actividad de IA)
 * ✅ Partículas de energía
 * ✅ Texto dinámico "Conectando con {agencyName}..."
 * ✅ Barra de progreso animada
 */
export function PageLoader({ agencyName }: { agencyName: string }) {
  const displayText =
    agencyName.toLowerCase() === "entorno global"
      ? "Conectando con entorno global..."
      : `Conectando con ${agencyName}...`;

  return (
<div className="fixed inset-0 bg-transparent dark:bg-[#070f22] flex items-center justify-center overflow-hidden">

      <div className="relative flex flex-col items-center gap-10">
        {/* 🔵 Ondas circulares de activación IA */}
        <div className="relative">
         
          {/* 🧠 Logo animado */}
          <motion.div
            className="relative z-10"
            animate={{
              y: [0, -12, 0],
              rotate: [-2, 2, -2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Glow IA detrás del logo */}
            <motion.div
              className="absolute inset-0 bg-indigo-400 dark:bg-indigo-300 rounded-full blur-2xl opacity-40"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <Image
              src={theoLogo}
              alt="TheoCore Logo"
              width={120}
              height={120}
              className="relative z-10 drop-shadow-xl"
            />
          </motion.div>
        </div>

        {/* 🔵 Texto dinámico */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-4 relative z-10"
        >
          <motion.p
            className="text-gray-700 dark:text-gray-200 text-lg font-medium"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            {displayText}
          </motion.p>

          {/* Barra de progreso */}
          <div className="w-60 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-400 via-blue-500 to-indigo-400 dark:from-indigo-300 dark:via-blue-400 dark:to-indigo-300 rounded-full"
              animate={{ x: ["-100%", "200%"] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
