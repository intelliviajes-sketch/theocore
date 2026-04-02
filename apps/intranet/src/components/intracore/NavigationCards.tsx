"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Lucide from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { useTheoCore } from "../../contexts/page";
import { theocorePath, theocoreSettingPath } from "@/lib/routes";
import { listLiveAgencyTools, type AgencyToolDefinition } from "@/features/agency-tools/api";

type GlobalRole = "TheoCoreOwner" | null;
type AgencyRole = "AgencyOwner" | "TeamAgency" | null;

type AgencyLite = {
  id: string;
  commercial_name?: string | null;
};

type CardItem = { title: string; description: string; href: string; icon?: string | null };

function resolvePathWithAgencyId(template: string, agencyId: string) {
  return template.replace(/\{id\}|\[id\]/g, agencyId);
}

function getLucideIconByName(name?: string | null): ComponentType<any> {
  if (!name) return Lucide.Circle;
  const Icon = (Lucide as unknown as Record<string, ComponentType<any> | undefined>)[name];
  return Icon || Lucide.Circle;
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

const rootMenu = [
  { name: "Agencias", path: theocoreSettingPath("agencias"), icon: "Building2" },
  { name: "Travelers globales", path: theocorePath("globaltravelers"), icon: "Users" },
  { name: "Global team", path: theocorePath("globalteam"), icon: "Users" },
  { name: "Brains IA", path: theocoreSettingPath("brain"), icon: "Brain" },
  { name: "Catalogo global", path: theocorePath("catalog"), icon: "PackageSearch" },
] as const;

const coreModules = [
  {
    key: "registered-travelers",
    label: "CRM de viajeros",
    path: "/intranet/agency/{id}/registered-travelers",
    icon: "UserRound",
  },
  { key: "ag_team", label: "Empleados de la agencia", path: "/intranet/agency/{id}/ag_team", icon: "Users" },
] as const;

function LoaderPro({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <motion.div
        className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-cyan-300/50"
        animate={{ rotate: 360 }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
      >
        <motion.div
          className="absolute inset-0 rounded-full border-t-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]"
          animate={{ rotate: -360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        />
        <Lucide.Cpu className="h-10 w-10 text-cyan-300" />
      </motion.div>
      <motion.div
        className="mt-4 text-base text-slate-600 dark:text-slate-300"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {message}
      </motion.div>
    </div>
  );
}

export default function NavigationCards() {
  const { selectedAgency, globalRole: contextGlobalRole } = useTheoCore() as {
    selectedAgency: AgencyLite | null;
    globalRole: GlobalRole;
  };
  const pathname = usePathname();
  const isTheoCoreView = pathname?.startsWith("/intranet/thecore") ?? false;
  const effectiveSelectedAgency = isTheoCoreView ? null : selectedAgency;

  const [agencyRole, setAgencyRole] = useState<AgencyRole>(null);
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [tools, setTools] = useState<AgencyToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const globalRole = contextGlobalRole;

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;

      if (!uid) {
        if (mounted) {
          setAgencyRole(null);
          setPermissions(null);
          setTools([]);
          setLoading(false);
        }
        return;
      }

      if (effectiveSelectedAgency?.id) {
        const { data: team } = await supabase
          .from("agency_team")
          .select("role, permissions")
          .eq("user_id", uid)
          .eq("agency_id", effectiveSelectedAgency.id)
          .maybeSingle();

        const nextAgencyRole: AgencyRole =
          team?.role === "AgencyOwner"
            ? "AgencyOwner"
            : team?.role === "TeamAgency"
              ? "TeamAgency"
              : null;

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
        }
      } else if (mounted) {
        setAgencyRole(null);
        setPermissions(null);
        setTools([]);
      }

      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [effectiveSelectedAgency?.id]);

  const visibleTools = useMemo(() => {
    if (!effectiveSelectedAgency?.id) return [] as AgencyToolDefinition[];
    if (agencyRole === "AgencyOwner") return tools;
    if (agencyRole === "TeamAgency") {
      if (!permissions || permissions.includes("*")) return tools;
      const allowed = new Set(permissions);
      return tools.filter((tool) => allowed.has(tool.tool_key));
    }
    if (globalRole === "TheoCoreOwner") return tools;
    return [] as AgencyToolDefinition[];
  }, [effectiveSelectedAgency?.id, agencyRole, permissions, tools, globalRole]);

  const cards: CardItem[] = !effectiveSelectedAgency?.id
    ? globalRole === "TheoCoreOwner"
      ? rootMenu.map((item) => ({
          title: item.name,
          description: "Acceso global",
          href: item.path,
          icon: item.icon,
        }))
      : []
    : [
        ...((globalRole === "TheoCoreOwner" || agencyRole === "AgencyOwner"
          ? coreModules.map((moduleItem) => ({
              title: moduleItem.label,
              description: "Modulo de gestion",
              href: resolvePathWithAgencyId(moduleItem.path, effectiveSelectedAgency.id),
              icon: moduleItem.icon,
            }))
          : []) as CardItem[]),
        ...visibleTools.map((tool) => ({
          title: tool.label,
          description: "Herramienta disponible",
          href: resolvePathWithAgencyId(tool.path, effectiveSelectedAgency.id),
          icon: tool.icon ?? undefined,
        })),
      ];

  const loaderMessage = effectiveSelectedAgency?.id ? "Cargando modulos de la agencia..." : "Cargando entorno global...";

  const agencyColor = "#08c7e0ff";
  const coreColor = "#417ee0ff";
  const gradientCore = "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(6,182,212,0.15) 100%)";
  const gradientAgency = "linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(6,182,212,0.15) 100%)";

  const isAgency = !!effectiveSelectedAgency?.id;
  const activeColor = isAgency ? agencyColor : coreColor;
  const activeGradient = isAgency ? gradientAgency : gradientCore;

  return (
    <div className="min-h-[60vh]">
      {loading ? (
        <LoaderPro message={loaderMessage} />
      ) : cards.length === 0 ? (
        <div className="hidden" />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
        >
          {cards.map((card, index) => {
            const Icon = getLucideIconByName(card.icon);
            return (
              <motion.div
                key={`${card.href}-${index}`}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                whileHover={{ scale: 1.04, y: -6 }}
                whileTap={{ scale: 0.98 }}
                className="group relative"
              >
                <Link href={card.href} className="block">
                  <motion.div
                    className="relative rounded-2xl p-[1px]"
                    style={{
                      backgroundImage: activeGradient,
                      backgroundSize: "30% 30%",
                      filter: `drop-shadow(0 0 5px ${activeColor}33) drop-shadow(0 0 10px ${activeColor}22)`,
                    }}
                    animate={{ backgroundPosition: ["0% 30%", "100% 50%", "0% 50%"] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div
                      className="relative min-h-[180px] overflow-hidden rounded-2xl border bg-white p-8 transition-all duration-300 dark:bg-slate-900/70"
                      style={{ borderColor: activeColor }}
                    >
                      <div className="pointer-events-none absolute -inset-16 opacity-40">
                        <div
                          className="absolute -right-16 -top-20 h-[260px] w-[260px] rounded-full blur-3xl"
                          style={{ backgroundImage: activeGradient }}
                        />
                        <div
                          className="absolute -bottom-24 -left-20 h-[220px] w-[220px] rounded-full blur-3xl opacity-70"
                          style={{ backgroundImage: activeGradient }}
                        />
                      </div>

                      <div className="relative grid grid-cols-[80px_1fr] items-center gap-6">
                        <motion.div
                          className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg"
                          style={{ backgroundColor: activeColor }}
                          whileHover={{ rotate: [0, -6, 6, -6, 0] }}
                          transition={{ duration: 0.6 }}
                        >
                          <Icon className="h-10 w-10 text-white" />
                        </motion.div>

                        <div className="relative">
                          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{card.title}</h3>
                          <p className="text-base text-slate-600 dark:text-slate-300">{card.description}</p>
                        </div>
                      </div>

                      <motion.div
                        className="absolute bottom-6 right-6 opacity-0 transition-opacity group-hover:opacity-100"
                        initial={{ x: -10 }}
                        whileHover={{ x: 0 }}
                        transition={{ duration: 0.6 }}
                      >
                        <svg className="h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
