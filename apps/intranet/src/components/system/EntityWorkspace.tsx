"use client";

import type { ReactNode } from "react";

type SummaryItem = {
  label: string;
  value: number;
};

export default function EntityWorkspace({
  title,
  subtitle,
  actionLabel,
  onAction,
  summary,
  listPane,
  detailPane,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  summary: SummaryItem[];
  listPane: ReactNode;
  detailPane: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{subtitle}</p>
        </div>

        <button
          onClick={onAction}
          className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-white shadow-lg transition hover:scale-[1.02]"
        >
          {actionLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm text-slate-500 dark:text-slate-300">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-3">{listPane}</div>
        <div className="md:col-span-2">{detailPane}</div>
      </div>
    </div>
  );
}
