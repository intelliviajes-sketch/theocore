"use client";

import { ReactNode } from "react";
import {
  BrainCircuit,
  Building2,
  Grid2x2,
  Handshake,
  Layers3,
  Pipette,
  SlidersHorizontal,
  Users2,
} from "lucide-react";
import CorporateSidebar, {
  CorporateMobileMenu,
  type CorporateNavSection,
} from "@/components/intracore/CorporateSidebar";
import CorporateTopbar from "@/components/intracore/CorporateTopbar";
import { theocorePath, theocoreSettingPath } from "@/lib/routes";

function LayoutInner({ children }: { children: ReactNode }) {
  const sections: CorporateNavSection[] = [
    {
      title: "Workspace",
      items: [
        { label: "Dashboard", href: theocorePath(), icon: Grid2x2, exact: true },
        { label: "Travelers Global", href: theocorePath("globaltravelers"), icon: Users2 },
        { label: "Catalogo global", href: theocorePath("catalog"), icon: Layers3 },
        { label: "Equipo global", href: theocorePath("globalteam"), icon: Handshake },
      ],
    },
    {
      title: "Configuracion",
      items: [
        { label: "Agencias", href: theocoreSettingPath("agencias"), icon: Building2 },
        { label: "Brains", href: theocoreSettingPath("brain"), icon: BrainCircuit },
        { label: "Productos", href: theocoreSettingPath("productos"), icon: SlidersHorizontal },
        { label: "Amenities", href: theocoreSettingPath("amenities"), icon: Pipette },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <CorporateTopbar />
      <CorporateMobileMenu sections={sections} />

      <div className="flex min-h-[calc(100dvh-68px)]">
        <CorporateSidebar
          contextLabel="Modo"
          contextName="TheoCore"
          sections={sections}
          footer="Menu corporativo - estilo operativo"
        />
        <main className="intranet-mobile-scroll min-w-0 flex-1 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export default function IntranetTheoCoreLayout({ children }: { children: ReactNode }) {
  return <LayoutInner>{children}</LayoutInner>;
}
