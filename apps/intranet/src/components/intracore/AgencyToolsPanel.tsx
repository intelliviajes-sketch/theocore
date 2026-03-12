"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { useTheoCore } from "@/contexts/page";
import { NON_LIVE_AGENCY_TOOLS } from "@/lib/agency-tools-registry";
import { listLiveAgencyTools, type AgencyToolDefinition } from "@/features/agency-tools/api";

type GlobalRole = "TheoCoreOwner" | null;
type AgencyRole = "AgencyOwner" | "TeamAgency" | null;

function getLucideIconByName(name?: string | null): ComponentType<any> {
  if (!name) return Lucide.Blocks;
  const Icon = (Lucide as unknown as Record<string, ComponentType<any> | undefined>)[name];
  return Icon || Lucide.Blocks;
}

function resolvePathWithAgencyId(template: string, agencyId: string) {
  return template.replace(/\{id\}|\[id\]/g, agencyId);
}

function safeJsonArray(str?: string | null): string[] | null {
  if (!str) return null;
  try {
    const value = JSON.parse(str);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export default function AgencyToolsPanel({ agencyId, showStandaloneTitle = false }: { agencyId: string; showStandaloneTitle?: boolean }) {
  const { globalRole } = useTheoCore() as { globalRole: GlobalRole };

  const [agencyRole, setAgencyRole] = useState<AgencyRole>(null);
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [tools, setTools] = useState<AgencyToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;

      if (!uid || !agencyId) {
        if (mounted) {
          setTools([]);
          setLoading(false);
        }
        return;
      }

      const { data: team } = await supabase
        .from("agency_team")
        .select("role, permissions")
        .eq("user_id", uid)
        .eq("agency_id", agencyId)
        .maybeSingle();

      const nextAgencyRole: AgencyRole =
        team?.role === "AgencyOwner" ? "AgencyOwner" : team?.role === "TeamAgency" ? "TeamAgency" : null;

      const liveTools = await listLiveAgencyTools();

      if (mounted) {
        setAgencyRole(nextAgencyRole);
        const perms = Array.isArray(team?.permissions)
          ? (team.permissions as string[])
          : typeof team?.permissions === "string"
            ? safeJsonArray(team.permissions)
            : null;
        setPermissions(perms);
        setTools(liveTools);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [agencyId]);

  const visibleTools = useMemo(() => {
    if (globalRole === "TheoCoreOwner" || agencyRole === "AgencyOwner") return tools;
    if (agencyRole === "TeamAgency") {
      if (!permissions || permissions.includes("*")) return tools;
      const allowed = new Set(permissions);
      return tools.filter((tool) => allowed.has(tool.tool_key));
    }
    return [] as AgencyToolDefinition[];
  }, [agencyRole, globalRole, permissions, tools]);

  return (
    <section className="space-y-6 rounded-[2rem] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 md:p-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Herramientas de agencia</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Este panel solo expone herramientas reales y operativas. Los modulos aun no implementados se mantienen fuera del menu de agencia.
        </p>
        {showStandaloneTitle ? (
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Vista operativa de herramientas publicadas.
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Cargando herramientas...
        </div>
      ) : visibleTools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          No hay herramientas operativas publicadas para esta agencia.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleTools.map((tool) => {
            const Icon = getLucideIconByName(tool.icon);
            const href = resolvePathWithAgencyId(tool.path, agencyId);

            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="group"
              >
                <Link
                  href={href}
                  className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-cyan-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{tool.label}</h3>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                        Herramienta operativa publicada para esta agencia.
                      </p>
                    </div>
                    <Lucide.ChevronRight className="mt-1 h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
                  </div>

                  <div className="mt-4 text-xs uppercase tracking-wide text-slate-400">{tool.tool_key}</div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Registro tecnico</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Estas herramientas existen como carpetas o modulos previstos, pero no estan publicadas en el menu hasta tener implementacion funcional.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {NON_LIVE_AGENCY_TOOLS.map((tool) => {
            const Icon = getLucideIconByName(tool.icon);
            return (
              <div key={tool.toolKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">{tool.label}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{tool.status}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{tool.summary}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
