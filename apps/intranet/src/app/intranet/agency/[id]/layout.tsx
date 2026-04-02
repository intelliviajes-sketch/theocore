"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import {
  Bot,
  Building2,
  LayoutDashboard,
  PackageSearch,
  ShieldUser,
  Users,
  Wrench,
} from "lucide-react";
import { agencyHomePath, agencySectionPath } from "@/lib/routes";
import { useTheoCore } from "@/contexts/page";
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

  const sections: CorporateNavSection[] = useMemo(
    () => [
      {
        title: "Workspace",
        items: [
          { label: "Dashboard", href: baseAgencyPath, icon: LayoutDashboard, exact: true },
          { label: "Perfil", href: agencySectionPath(id, "profile"), icon: Building2 },
          { label: "Equipo agencia", href: agencySectionPath(id, "ag_team"), icon: ShieldUser },
          { label: "CRM viajeros", href: agencySectionPath(id, "registered-travelers"), icon: Users },
        ],
      },
      {
        title: "Herramientas",
        items: [
          { label: "Panel de herramientas", href: agencySectionPath(id, "ag_tools"), icon: Wrench, exact: true },
          { label: "Catalogo manual", href: agencySectionPath(id, "ag_tools/catalog"), icon: PackageSearch },
          { label: "CatalogIA", href: agencySectionPath(id, "ag_tools/catalogia"), icon: Bot },
        ],
      },
    ],
    [baseAgencyPath, id],
  );

  const modeLabel = pathname?.includes("/ag_team") ? "agency_team" : "agency";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <CorporateTopbar showBackToTheoCore />
      <CorporateMobileMenu sections={sections} />

      <div className="flex min-h-[calc(100vh-68px)]">
        <CorporateSidebar
          contextLabel="Modo"
          contextName={currentAgency?.commercial_name || "Agency"}
          sections={sections}
          footer={`Menu corporativo - ${modeLabel}`}
        />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return <AgencyLayoutInner>{children}</AgencyLayoutInner>;
}
