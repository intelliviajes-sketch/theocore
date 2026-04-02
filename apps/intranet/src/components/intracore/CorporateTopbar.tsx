"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Command, ArrowLeft } from "lucide-react";
import { useTheoCore } from "@/contexts/page";
import AgencyQuickViewModal from "./AgencyQuickViewModal";
import UserMenu from "./UserMenu";
import ThemeToggle from "./ThemeToggle";
import { THEOCORE_HOME, agencyHomePath } from "@/lib/routes";

const LABELS: Record<string, string> = {
  thecore: "TheoCore",
  setting: "Configuracion",
  agencias: "Agencias",
  brain: "Brains",
  productos: "Productos",
  amenities: "Amenities",
  menues: "Menus",
  catalog: "Catalogo",
  globalteam: "Team global",
  globaltravelers: "Usuarios globales",
  agency: "Agencia",
  profile: "Perfil",
  ag_team: "Equipo agencia",
  ag_tools: "Herramientas",
  "registered-travelers": "CRM viajeros",
  catalogia: "CatalogIA",
};

function resolveSegmentLabel(segment: string) {
  return LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default function CorporateTopbar({
  showBackToTheoCore = false,
}: {
  showBackToTheoCore?: boolean;
}) {
  const { agencies, selectedAgency, selectAgency, changeMode, globalRole, setLoading } = useTheoCore();
  const router = useRouter();
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState(false);
  const [previewAgency, setPreviewAgency] = useState<(typeof agencies)[number] | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isTheoCoreView = pathname?.startsWith("/intranet/thecore") ?? false;

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const items = useMemo(() => {
    const agencyItems = agencies.map((agency) => ({ id: agency.id, label: agency.commercial_name }));
    if (globalRole === "TheoCoreOwner") {
      return [{ id: "global", label: "TheoCore" }, ...agencyItems];
    }
    return agencyItems;
  }, [agencies, globalRole]);

  const activeItem = useMemo(() => {
    if (isTheoCoreView) return { id: "global", label: "TheoCore" };
    if (selectedAgency) return { id: selectedAgency.id, label: selectedAgency.commercial_name };
    return items[0] || { id: "global", label: "TheoCore" };
  }, [isTheoCoreView, items, selectedAgency]);

  const breadcrumb = useMemo(() => {
    if (!pathname) return [];
    const raw = pathname.split("/").filter(Boolean).slice(1);
    const resolved: Array<{ label: string; href: string }> = [];
    let acc = "/intranet";

    raw.forEach((segment) => {
      acc += `/${segment}`;
      if (segment === "agency") return;
      if (selectedAgency && segment === selectedAgency.id) {
        resolved.push({ label: selectedAgency.commercial_name, href: acc });
        return;
      }
      resolved.push({ label: resolveSegmentLabel(segment), href: acc });
    });

    return resolved;
  }, [pathname, selectedAgency]);

  function enterAgencyPanel(agency: (typeof agencies)[number]) {
    setLoading(true);
    changeMode("agency");
    selectAgency(agency, { force: true });
    router.push(agencyHomePath(agency.id));
  }

  function onSelectEnvironment(targetId: string) {
    setOpenDropdown(false);
    if (targetId === "global") {
      setLoading(true);
      changeMode("global");
      selectAgency(null, { force: true });
      router.push(THEOCORE_HOME);
      return;
    }

    const agency = agencies.find((entry) => entry.id === targetId) || null;
    if (!agency) return;
    if (isTheoCoreView) {
      setPreviewAgency(agency);
      return;
    }
    enterAgencyPanel(agency);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-900 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/95 dark:text-slate-100">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                <Image src="/theocore-logo.png" alt="TheoCore" width={22} height={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Control Center
                </p>
                <nav className="flex flex-wrap items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                  {breadcrumb.map((part, index) => {
                    const isLast = index === breadcrumb.length - 1;
                    return (
                      <span key={`${part.href}-${part.label}`} className="inline-flex items-center gap-1">
                        {index > 0 ? <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" /> : null}
                        {isLast ? (
                          <span className="font-medium text-slate-900 dark:text-slate-100">{part.label}</span>
                        ) : (
                          <Link href={part.href} className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
                            {part.label}
                          </Link>
                        )}
                      </span>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {showBackToTheoCore ? (
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  changeMode("global");
                  selectAgency(null, { force: true });
                  router.push(THEOCORE_HOME);
                }}
                className="hidden items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 md:inline-flex"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                TheoCore
              </button>
            ) : null}

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setOpenDropdown((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Command className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="max-w-[130px] truncate">{activeItem.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              </button>

              {openDropdown ? (
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="border-b border-slate-200 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Entornos
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1.5">
                    {items.map((item) => {
                      const active = item.id === activeItem.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectEnvironment(item.id)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                            active
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {active ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-300" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <AgencyQuickViewModal
        open={Boolean(previewAgency)}
        agency={previewAgency}
        onClose={() => setPreviewAgency(null)}
        onEnterPanel={(agency) => {
          setPreviewAgency(null);
          enterAgencyPanel(agency);
        }}
      />
    </>
  );
}
