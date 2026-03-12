"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function ConfirmDialog({
  title,
  message,
  confirmText = "Confirmar",
  confirmVariant = "primary", // "primary" | "danger"
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const color =
    confirmVariant === "danger"
      ? "from-rose-600 to-red-600"
      : "from-emerald-600 to-teal-600";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.94, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 16 }}
          className="w-full max-w-md rounded-2xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-slate-900/85 backdrop-blur p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:opacity-90"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={`px-5 py-2 rounded-lg bg-gradient-to-r ${color} text-white shadow-lg hover:shadow-xl hover:scale-[1.01] transition`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
