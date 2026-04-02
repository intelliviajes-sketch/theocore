"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bot,
  Building2,
  Clock3,
  Loader2,
  Sparkles,
  UserCheck,
  Users,
  Settings,
  Package,
  Pipette,
} from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { theocoreSettingPath } from "@/lib/routes";

type DashboardMetrics = {
  activeAgencies: number;
  inactiveAgencies: number;
  totalTravelers: number;
  totalGlobalUsers: number;
  activeBrains: number;
  pendingInvites: number;
  travelersLast7Days: number;
};

type RecentActivityItem = {
  id: string;
  type: "agency" | "traveler" | "brain";
  title: string;
  subtitle: string;
  created_at: string;
};

type TeamRow = {
  user_id: string;
  active: boolean | null;
  email_confirmed_at: string | null;
};

const INITIAL_METRICS: DashboardMetrics = {
  activeAgencies: 0,
  inactiveAgencies: 0,
  totalTravelers: 0,
  totalGlobalUsers: 0,
  activeBrains: 0,
  pendingInvites: 0,
  travelersLast7Days: 0,
};

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Hace menos de 1 hora";
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays < 7) return `Hace ${diffDays} d`;
  return date.toLocaleDateString();
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{hint}</p>
    </div>
  );
}

const technicalLinks = [
  {
    title: "Catalogo de productos",
    href: theocoreSettingPath("productos"),
    icon: Package,
  },
  {
    title: "Amenities",
    href: theocoreSettingPath("amenities"),
    icon: Pipette,
  },
  {
    title: "Catalogos tecnicos",
    href: theocoreSettingPath(),
    icon: Settings,
  },
] as const;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>(INITIAL_METRICS);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        agenciesRes,
        travelersRes,
        recentTravelersRes,
        recentTravelersActivityRes,
        brainsRes,
        recentBrainsRes,
        recentAgenciesRes,
        teamRes,
      ] = await Promise.all([
        supabase.from("agencies").select("id, active", { count: "exact" }),
        supabase.from("travelers").select("id, active", { count: "exact" }).eq("active", true),
        supabase.from("travelers").select("id").eq("active", true).gte("created_at", sevenDaysAgo.toISOString()),
        supabase.from("travelers").select("id, full_name, created_at").eq("active", true).order("created_at", { ascending: false }).limit(4),
        supabase.from("ai_assistants").select("id, active"),
        supabase.from("ai_assistants").select("id, name, target_lang, created_at").order("created_at", { ascending: false }).limit(4),
        supabase.from("agencies").select("id, commercial_name, country_code, created_at").order("created_at", { ascending: false }).limit(4),
        supabase.rpc("get_global_users"),
      ]);

      if (agenciesRes.error) throw agenciesRes.error;
      if (travelersRes.error) throw travelersRes.error;
      if (recentTravelersRes.error) throw recentTravelersRes.error;
      if (recentTravelersActivityRes.error) throw recentTravelersActivityRes.error;
      if (brainsRes.error) throw brainsRes.error;
      if (recentBrainsRes.error) throw recentBrainsRes.error;
      if (recentAgenciesRes.error) throw recentAgenciesRes.error;
      if (teamRes.error) throw teamRes.error;

      const agencies = agenciesRes.data || [];
      const travelersTotal = travelersRes.count ?? 0;
      const travelersLast7Days = recentTravelersRes.data?.length ?? 0;
      const brains = brainsRes.data || [];
      const team = (teamRes.data as TeamRow[]) || [];

      const activeAgencies = agencies.filter((agency) => agency.active).length;
      const inactiveAgencies = agencies.length - activeAgencies;
      const activeBrains = brains.filter((brain) => brain.active).length;
      const totalGlobalUsers = team.length;
      const pendingInvites = team.filter((user) => !user.email_confirmed_at).length;

      setMetrics({
        activeAgencies,
        inactiveAgencies,
        totalTravelers: travelersTotal,
        totalGlobalUsers,
        activeBrains,
        pendingInvites,
        travelersLast7Days,
      });

      const travelerActivity = ((recentTravelersActivityRes.data || []) as Array<{
        id: string;
        full_name: string;
        created_at: string;
      }>).map((traveler) => ({
        id: traveler.id,
        type: "traveler" as const,
        title: traveler.full_name,
        subtitle: "Traveler nuevo registrado en la base global",
        created_at: traveler.created_at,
      }));

      const agencyActivity = ((recentAgenciesRes.data || []) as Array<{
        id: string;
        commercial_name: string;
        country_code: string | null;
        created_at: string;
      }>).map((agency) => ({
        id: agency.id,
        type: "agency" as const,
        title: agency.commercial_name,
        subtitle: `Nueva agencia registrada${agency.country_code ? ` / ${agency.country_code}` : ""}`,
        created_at: agency.created_at,
      }));

      const brainActivity = ((recentBrainsRes.data || []) as Array<{
        id: string;
        name: string;
        target_lang: string | null;
        created_at: string;
      }>).map((brain) => ({
        id: brain.id,
        type: "brain" as const,
        title: brain.name,
        subtitle: `Brain disponible${brain.target_lang ? ` / ${brain.target_lang}` : ""}`,
        created_at: brain.created_at,
      }));

      const combinedActivity = [...agencyActivity, ...travelerActivity, ...brainActivity].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRecentActivity(combinedActivity.slice(0, 8));
    } catch (error) {
      console.error("Dashboard load error:", error);
      setMetrics(INITIAL_METRICS);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  }

  const statusSummary = useMemo(
    () => [
      {
        label: "Agencias activas",
        value: `${metrics.activeAgencies}`,
        tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      },
      {
        label: "Agencias inactivas",
        value: `${metrics.inactiveAgencies}`,
        tone: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      },
      {
        label: "Invitaciones pendientes",
        value: `${metrics.pendingInvites}`,
        tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      },
    ],
    [metrics.activeAgencies, metrics.inactiveAgencies, metrics.pendingInvites]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
                <Sparkles className="h-4 w-4" />
                TheoCore Dashboard
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 md:text-4xl">Panel Global</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
                  Resumen operativo del ecosistema: agencias, travelers, equipo global y brains activos desde una sola vista.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {statusSummary.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${item.tone}`}>{item.label}</div>
                    <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-inner dark:border-slate-800">
              <div className="flex items-center gap-3 text-cyan-300">
                <Activity className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.2em]">Resumen rapido</span>
              </div>
              {loading ? (
                <div className="mt-8 flex items-center gap-3 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando metricas...
                </div>
              ) : (
                <div className="mt-6 space-y-4 text-sm text-slate-200">
                  <p>
                    Hay <strong className="text-white">{metrics.activeAgencies}</strong> agencias activas y <strong className="text-white">{metrics.totalTravelers}</strong> travelers en la base global.
                  </p>
                  <p>
                    El equipo operativo tiene <strong className="text-white">{metrics.totalGlobalUsers}</strong> usuarios y <strong className="text-white">{metrics.pendingInvites}</strong> invitaciones pendientes de activacion.
                  </p>
                  <p>
                    El ecosistema IA cuenta con <strong className="text-white">{metrics.activeBrains}</strong> brains activos.
                  </p>
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-cyan-50">
                    Travelers nuevos en 7 dias: <strong>{metrics.travelersLast7Days}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Agencias activas"
            value={loading ? "..." : String(metrics.activeAgencies)}
            hint={`${metrics.inactiveAgencies} inactivas en este momento`}
            icon={Building2}
            accent="bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
          />
          <MetricCard
            title="Travelers totales"
            value={loading ? "..." : String(metrics.totalTravelers)}
            hint={`${metrics.travelersLast7Days} nuevos en los ultimos 7 dias`}
            icon={Users}
            accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          />
          <MetricCard
            title="Usuarios globales"
            value={loading ? "..." : String(metrics.totalGlobalUsers)}
            hint={`${metrics.pendingInvites} pendientes de activacion`}
            icon={UserCheck}
            accent="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          />
          <MetricCard
            title="Brains activos"
            value={loading ? "..." : String(metrics.activeBrains)}
            hint="Agentes IA habilitados en el sistema"
            icon={Bot}
            accent="bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
            <div className="mb-4 flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Actividad reciente</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ultimos movimientos visibles con el esquema actual.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando actividad reciente...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Aun no hay actividad suficiente para mostrar un resumen.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.subtitle}</div>
                    </div>
                    <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{formatRelativeDate(item.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Catalogos tecnicos</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Configuracion base y estructuras del sistema, fuera del flujo principal.</p>
              </div>
              <div className="space-y-3">
                {technicalLinks.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-white"
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                      {item.title}
                    </span>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-400">tecnico</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
