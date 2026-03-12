"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Bot, Building2, Loader2, Mail, UserRound, Users, Wrench } from "lucide-react";
import { useTheoCore } from "@/contexts/page";
import AgencyProfileSummaryModal from "@/components/intracore/AgencyProfileSummaryModal";
import AgencyToolsPanel from "@/components/intracore/AgencyToolsPanel";
import { agencySectionPath } from "@/lib/routes";
import { INITIAL_AGENCY_DASHBOARD, loadAgencyDashboardData } from "@/features/agencies/dashboard";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { agencies, selectedAgency, selectAgency } = useTheoCore();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState(INITIAL_AGENCY_DASHBOARD);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (id && (!selectedAgency || selectedAgency.id !== id)) {
      const agency = agencies.find((agencyItem) => agencyItem.id === id);
      if (agency) {
        selectAgency(agency);
      }
    }
  }, [id, agencies, selectedAgency, selectAgency]);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setLoadError(null);
      try {
        const nextStats = await loadAgencyDashboardData(id);
        if (!mounted) return;
        setStats(nextStats);
      } catch (error) {
        console.error("Agency dashboard error:", error);
        if (!mounted) return;
        setStats(INITIAL_AGENCY_DASHBOARD);
        setLoadError("No se pudo cargar el dashboard de la agencia.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [id]);

  const currentAgency = useMemo(
    () => (selectedAgency?.id === id ? selectedAgency : agencies.find((agency) => agency.id === id) || null),
    [agencies, id, selectedAgency],
  );

  return (
    <>
      <div className="space-y-8">
          <section className="rounded-[2rem] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Dashboard operativo
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-800 dark:text-slate-100">
                    {currentAgency?.commercial_name || "Panel de agencia"}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-300">
                    {stats.countryCode ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{stats.countryCode}</span> : null}
                    {stats.legalName ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{stats.legalName}</span> : null}
                    {stats.emailContact ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{stats.emailContact}</span> : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => setProfileOpen(true)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  Ver perfil
                </button>
                <Link href={agencySectionPath(id, "ag_team")} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  Empleados
                </Link>
                <Link href={agencySectionPath(id, "registered-travelers")} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:col-span-2">
                  CRM de viajeros
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando indicadores de la agencia...
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
                  <StatCard label="Herramientas visibles" value={stats.toolsCount} icon={Wrench} />
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/40">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Resumen operativo
                    </h3>
                    <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <p>
                        La agencia opera con <strong className="text-slate-900 dark:text-slate-100">{stats.teamCount}</strong> usuarios activos,
                        <strong className="text-slate-900 dark:text-slate-100"> {stats.travelersCount}</strong> viajeros vinculados y
                        <strong className="text-slate-900 dark:text-slate-100"> {stats.brainsCount}</strong> brains asignados.
                      </p>
                      <p>
                        Actualmente tiene <strong className="text-slate-900 dark:text-slate-100">{stats.toolsCount}</strong> herramientas visibles dentro del entorno de agencia.
                      </p>
                      {stats.emailContact ? (
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Contacto principal: <strong className="text-slate-900 dark:text-slate-100">{stats.emailContact}</strong>
                        </p>
                      ) : null}
                      {stats.whatsapp ? <p>WhatsApp operativo: <strong className="text-slate-900 dark:text-slate-100">{stats.whatsapp}</strong></p> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/40">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Alertas y preparacion
                    </h3>
                    <div className="mt-4 space-y-3">
                      {stats.risks.length === 0 ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                          La agencia tiene lo minimo operativo para seguir creciendo.
                        </div>
                      ) : (
                        stats.risks.map((risk) => (
                          <div key={risk} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                            <span>{risk}</span>
                          </div>
                        ))
                      )}

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <div className="font-medium text-slate-800 dark:text-slate-100">Herramientas activas</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {stats.activeTools.length > 0 ? (
                            stats.activeTools.map((tool) => (
                              <span key={tool} className="rounded-full bg-white px-3 py-1 text-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                                {tool}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">Sin herramientas activas.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          <AgencyToolsPanel agencyId={id} />
      </div>

      <AgencyProfileSummaryModal
        open={profileOpen}
        agency={currentAgency}
        stats={stats}
        onClose={() => setProfileOpen(false)}
      />
    </>
  );
}
