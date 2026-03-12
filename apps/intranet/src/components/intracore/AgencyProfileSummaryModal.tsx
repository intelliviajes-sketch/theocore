"use client";

import Link from "next/link";
import type { AgencyDashboardData } from "@/features/agencies/dashboard";
import { agencySectionPath } from "@/lib/routes";

type AgencyPreview = {
  id: string;
  commercial_name?: string | null;
  active?: boolean | null;
};

export default function AgencyProfileSummaryModal({
  open,
  agency,
  stats,
  onClose,
}: {
  open: boolean;
  agency: AgencyPreview | null;
  stats: AgencyDashboardData;
  onClose: () => void;
}) {
  if (!open || !agency) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Perfil de agencia
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{agency.commercial_name || "Agencia"}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Resumen institucional y operativo de la agencia seleccionada.</p>
          </div>

          <button onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            Cerrar
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Info label="Nombre comercial" value={agency.commercial_name || "-"} />
          <Info label="Estado" value={agency.active ? "Activa" : "Inactiva"} />
          <Info label="Nombre legal" value={stats.legalName || "-"} />
          <Info label="Codigo pais" value={stats.countryCode || "-"} />
          <Info label="Email contacto" value={stats.emailContact || "-"} />
          <Info label="WhatsApp" value={stats.whatsapp || "-"} />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          <div>
            Equipo activo: <strong className="text-slate-900 dark:text-slate-100">{stats.teamCount}</strong>
          </div>
          <div>
            Viajeros activos: <strong className="text-slate-900 dark:text-slate-100">{stats.travelersCount}</strong>
          </div>
          <div>
            Brains asignados: <strong className="text-slate-900 dark:text-slate-100">{stats.brainsCount}</strong>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link href={agencySectionPath(agency.id, "profile")} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            Abrir ficha completa
          </Link>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{value}</div>
    </div>
  );
}
