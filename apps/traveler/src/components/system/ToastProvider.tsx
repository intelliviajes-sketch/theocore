"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
};

type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => {
          const palette =
            toast.variant === "success"
              ? {
                  card: "border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-100",
                  icon: CheckCircle2,
                  iconClass: "text-emerald-600 dark:text-emerald-300",
                }
              : toast.variant === "error"
                ? {
                    card: "border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/90 dark:text-rose-100",
                    icon: AlertCircle,
                    iconClass: "text-rose-600 dark:text-rose-300",
                  }
                : {
                    card: "border-cyan-200 bg-cyan-50/95 text-cyan-900 dark:border-cyan-900/60 dark:bg-cyan-950/90 dark:text-cyan-100",
                    icon: AlertCircle,
                    iconClass: "text-cyan-600 dark:text-cyan-300",
                  };

          const Icon = palette.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto rounded-2xl border p-4 shadow-lg backdrop-blur ${palette.card}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <Icon className={`h-5 w-5 ${palette.iconClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                  {toast.title ? <div className="text-sm font-semibold">{toast.title}</div> : null}
                  <div className="text-sm opacity-90">{toast.message}</div>
                </div>
                <button
                  onClick={() => onDismiss(toast.id)}
                  className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, variant = "info" }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [...current, { id, title, message, variant }]);
      window.setTimeout(() => dismiss(id), 3600);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, title) => showToast({ message, title, variant: "success" }),
      error: (message, title) => showToast({ message, title, variant: "error" }),
      info: (message, title) => showToast({ message, title, variant: "info" }),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return context;
}
