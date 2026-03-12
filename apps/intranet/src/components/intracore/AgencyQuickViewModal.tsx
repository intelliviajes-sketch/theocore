"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Bot, Building2, Loader2, MapPin, UserRound, Users, Wrench, X } from "lucide-react";
import { agencySectionPath } from "@/lib/routes";
import { INITIAL_AGENCY_DASHBOARD, loadAgencyDashboardData } from "@/features/agencies/dashboard";

type AgencyPreview = {
  id: string;
  commercial_name: string;
  active: boolean;
};

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

export default function AgencyQuickViewModal({
  agency,
  open,
  onClose,
  onEnterPanel,
}: {
  agency: AgencyPreview | null;
  open: boolean;
  onClose: () => void;
  onEnterPanel: (agency: AgencyPreview) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(INITIAL_AGENCY_DASHBOARD);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !agency) return;

    const currentAgency = agency;

    async function loadQuickView() {
      setLoading(true);
      setLoadError(null);
      try {
        const nextStats = await loadAgencyDashboardData(currentAgency.id);
        setStats(nextStats);
      } catch (error) {
        console.error("Agency quick view error:", error);
        setStats(INITIAL_AGENCY_DASHBOARD);
        setLoadError("No se pudo cargar la vista rapida de la agencia.");
      } finally {
        setLoading(false);
      }
    }

    void loadQuickView();
  }, [agency, open]);

  const statusLabel = useMemo(() => (agency?.active ? "Activa" : "Inactiva"), [agency?.active]);

  if (!open || !agency) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[2rem] border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Vista rapida de agencia
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{agency.commercial_name}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Estado: {statusLabel}</span>
                {stats.countryCode ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{stats.countryCode}</span> : null}
                {stats.legalName ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{stats.legalName}</span> : null}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando dashboard de agencia...
          </div>
        ) : loadError ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
            {loadError}
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Equipo activo" value={stats.teamCount} icon={Users} />
              <StatCard label="Viajeros activos" value={stats.travelersCount} icon={UserRound} />
              <StatCard label="Brains asignados" value={stats.brainsCount} icon={Bot} />
              <StatCard label="Herramientas disponibles" value={stats.toolsCount} icon={Wrench} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Resumen</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <p>Esta agencia tiene <strong className="text-slate-900 dark:text-slate-100">{stats.teamCount}</strong> usuarios activos y <strong className="text-slate-900 dark:text-slate-100">{stats.travelersCount}</strong> viajeros vinculados.</p>
                  <p>Opera con <strong className="text-slate-900 dark:text-slate-100">{stats.brainsCount}</strong> brains y tiene <strong className="text-slate-900 dark:text-slate-100">{stats.toolsCount}</strong> herramientas disponibles en el catalogo global.</p>
                  {stats.emailContact ? <p>Contacto principal: <strong className="text-slate-900 dark:text-slate-100">{stats.emailContact}</strong></p> : null}
                  {stats.whatsapp ? <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />WhatsApp: <strong className="text-slate-900 dark:text-slate-100">{stats.whatsapp}</strong></p> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Accesos directos</h3>
                <div className="mt-4 grid gap-2">
                  <a href={agencySectionPath(agency.id, "profile")} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Ver perfil</a>
                  <a href={agencySectionPath(agency.id, "ag_team")} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Ver equipo</a>
                  <a href={agencySectionPath(agency.id, "registered-travelers")} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Ver viajeros</a>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:opacity-90 dark:bg-slate-800 dark:text-slate-200">
            Cerrar
          </button>
          <button onClick={() => onEnterPanel(agency)} className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md">
            Entrar al panel de agencia
          </button>
        </div>
      </div>
    </div>
  );
}
