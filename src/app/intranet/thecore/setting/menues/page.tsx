"use client";

import { motion } from "framer-motion";
import { Blocks, Code2, Info } from "lucide-react";

export default function MenuesGlobalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">Menus de herramientas</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Este modulo ya no crea herramientas nuevas. Las herramientas de agencia nacen en codigo, con su carpeta y su ruta real, y solo despues pueden publicarse en el sistema.
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
              <Blocks className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Nuevo flujo</h2>
              <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p>1. La herramienta se crea en codigo con su carpeta, pagina y metadata tecnica.</p>
                <p>2. Cuando el modulo es funcional, se registra en el catalogo tecnico de herramientas.</p>
                <p>3. Solo entonces se expone en Agency y se habilita por permisos.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <Code2 className="h-5 w-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Fuente de verdad</h3>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              La fuente de verdad ya no es este CRUD. La fuente de verdad es el modulo real implementado dentro de la app.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Estado actual</h3>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Esta pantalla queda solo como referencia del cambio de arquitectura. Las altas y bajas de herramientas se controlan desde el registro tecnico en codigo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
