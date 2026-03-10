"use client";

import { motion } from "framer-motion";
import { Home, Package } from "lucide-react";
import Link from "next/link";
import { theocoreSettingPath } from "@/lib/routes";

export default function TheoCoreSettingHome() {
  const quickActions = [
    {
      title: "Productos",
      description: "Definir tipos, versiones y campos dinamicos de producto",
      icon: Package,
      color: "from-emerald-500 to-teal-600",
      hoverColor: "hover:shadow-emerald-500/50",
      href: theocoreSettingPath("productos"),
    },
    {
      title: "Amenities",
      description: "Administrar atributos y comodidades reutilizables",
      icon: Home,
      color: "from-pink-500 to-rose-600",
      hoverColor: "hover:shadow-pink-500/50",
      href: theocoreSettingPath("amenities"),
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
          <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">Catalogos tecnicos</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300">
            Este espacio agrupa catalogos tecnicos y estructuras base del sistema. No forma parte del flujo principal de operacion en TheoCore. Las herramientas de agencia ya no se crean desde aqui: nacen en codigo y solo se habilitan cuando existe su modulo real.
          </p>
          <p className="mt-2 max-w-2xl text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Menues queda fuera del flujo operativo.
          </p>
        </motion.div>

        <motion.div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" variants={container} initial="hidden" animate="show">
          {quickActions.map((action) => (
            <motion.div key={action.title} variants={item} whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.98 }} className="group relative">
              <Link href={action.href} className="block">
                <div
                  className={`relative cursor-pointer overflow-hidden rounded-2xl border border-white/30 bg-white/70 p-6 backdrop-blur transition-all duration-300 hover:shadow-2xl dark:border-white/10 dark:bg-slate-900/50 ${action.hoverColor}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 transition-opacity duration-300 group-hover:opacity-10`} />

                  <motion.div
                    className={`relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <action.icon className="h-7 w-7 text-white" />
                  </motion.div>

                  <div className="relative">
                    <h2 className="mb-2 text-lg font-semibold text-slate-800 transition-colors group-hover:text-slate-900 dark:text-slate-100 dark:group-hover:text-white">
                      {action.title}
                    </h2>
                    <p className="text-sm text-slate-500 transition-colors group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

