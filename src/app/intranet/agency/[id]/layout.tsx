"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import {
  CalendarCheck2,
  Bot,
  Building2,
  LifeBuoy,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  Share2,
  ShieldUser,
  UserRoundCog,
  Users,
  Wrench,
} from "lucide-react";
import { agencyHomePath, agencySectionPath } from "@/lib/routes";
import { useTheoCore } from "@/contexts/page";
import { AGENCY_TOOL_REGISTRY } from "@/lib/agency-tools-registry";
import CorporateSidebar, {
  CorporateMobileMenu,
  type CorporateNavSection,
} from "@/components/intracore/CorporateSidebar";
import CorporateTopbar from "@/components/intracore/CorporateTopbar";

function AgencyLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { agencies, selectedAgency, selectAgency, changeMode } = useTheoCore();

  useEffect(() => {
    if (!id) return;
    changeMode("agency");
    if (!selectedAgency || selectedAgency.id !== id) {
      const agency = agencies.find((agencyItem) => agencyItem.id === id) || null;
      if (agency) {
        selectAgency(agency, { force: true });
      }
    }
  }, [agencies, changeMode, id, selectAgency, selectedAgency]);

  const currentAgency =
    selectedAgency?.id === id ? selectedAgency : agencies.find((agency) => agency.id === id) || null;
  const baseAgencyPath = id ? agencyHomePath(id) : "";
  const toolStatusByKey = useMemo(
    () =>
      AGENCY_TOOL_REGISTRY.reduce<Record<string, string>>((acc, tool) => {
        acc[tool.toolKey] = tool.status;
        return acc;
      }, {}),
    [],
  );

  const toolLabel = useCallback(
    (base: string, toolKey: string, fallbackStatus: string) => {
      const status = toolStatusByKey[toolKey] || fallbackStatus;
      return status === "live" ? base : `${base} (${status})`;
    },
    [toolStatusByKey],
  );

  const sections: CorporateNavSection[] = useMemo(
    () => [
      {
        title: "Workspace",
        items: [
          { label: "Dashboard", href: baseAgencyPath, icon: LayoutDashboard, exact: true },
          { label: "CRM viajeros", href: agencySectionPath(id, "registered-travelers"), icon: Users },
          {
            label: toolLabel("Bookings", "ag_booking", "planned"),
            href: agencySectionPath(id, "ag_tools/ag_booking"),
            icon: CalendarCheck2,
            disabled: toolStatusByKey.ag_booking !== "live",
          },
          { label: "Catalogo", href: agencySectionPath(id, "ag_tools/catalog"), icon: PackageSearch },
        ],
      },
      {
        title: "Herramientas",
        items: [
          { label: "Herramientas", href: agencySectionPath(id, "ag_tools"), icon: Wrench, exact: true },
          {
            label: toolLabel("CatalogIA", "catalogia", "redesign"),
            href: agencySectionPath(id, "ag_tools/catalogia"),
            icon: Bot,
            disabled: toolStatusByKey.catalogia !== "live",
          },
          {
            label: toolLabel("Soporte", "ag_suport", "planned"),
            href: agencySectionPath(id, "ag_tools/ag_suport"),
            icon: LifeBuoy,
            disabled: toolStatusByKey.ag_suport !== "live",
          },
          {
            label: toolLabel("Travelers tools", "ag_travelers", "planned"),
            href: agencySectionPath(id, "ag_tools/ag_travelers"),
            icon: UserRoundCog,
            disabled: toolStatusByKey.ag_travelers !== "live",
          },
          {
            label: toolLabel("Marketing", "marketing", "planned"),
            href: agencySectionPath(id, "ag_tools/marketing"),
            icon: Megaphone,
            disabled: toolStatusByKey.marketing !== "live",
          },
          {
            label: toolLabel("Social media", "socialmedia", "planned"),
            href: agencySectionPath(id, "ag_tools/socialmedia"),
            icon: Share2,
            disabled: toolStatusByKey.socialmedia !== "live",
          },
        ],
      },
      {
        title: "Configuracion",
        items: [
          { label: "Equipo agencia", href: agencySectionPath(id, "ag_team"), icon: ShieldUser },
          { label: "Perfil", href: agencySectionPath(id, "profile"), icon: Building2 },
        ],
      },
    ],
    [baseAgencyPath, id, toolLabel, toolStatusByKey],
  );

  const modeLabel = pathname?.includes("/ag_team") ? "agency_team" : "agency";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <CorporateTopbar showBackToTheoCore />
      <CorporateMobileMenu sections={sections} />

      <div className="flex min-h-[calc(100dvh-68px)]">
        <CorporateSidebar
          contextLabel="Modo"
          contextName={currentAgency?.commercial_name || "Agency"}
          sections={sections}
          footer={`Menu corporativo - ${modeLabel}`}
        />
        <main className="intranet-mobile-scroll min-w-0 flex-1 px-3 py-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return <AgencyLayoutInner>{children}</AgencyLayoutInner>;
}
