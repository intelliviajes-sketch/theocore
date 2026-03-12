"use client";

import type { ReactNode } from "react";

export default function CrudPageShell({
  title,
  description,
  action,
  toolbar,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
              TheoCore
            </p>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 md:text-3xl">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{description}</p>
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
          {toolbar ? <div className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">{toolbar}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

