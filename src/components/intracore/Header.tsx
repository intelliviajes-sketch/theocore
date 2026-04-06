"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Bars3Icon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import UserMenu from "./UserMenu";
import AgencyQuickViewModal from "./AgencyQuickViewModal";
import { useTheoCore } from "../../contexts/page";
import { THEOCORE_HOME, agencyHomePath } from "@/lib/routes";

const LABELS: Record<string, string> = {
  intranet: "Inicio",
  theocore: "TheoCore",
  intracore: "TheoCore",
  agency: "Agencia",
  dashboard: "Dashboard",
  profile: "Perfil de agencia",
  finance: "Finanzas",
  customers: "Clientes",
  travelers: "Travelers",
  "registered-travelers": "Viajeros registrados",
  ag_team: "Team agencia",
  policies: "Politicas",
  ag_tools: "Herramientas",
  socialmedia: "Social media",
  marketing: "Marketing",
  ag_booking: "Bookings",
  ag_suport: "Soporte",
  ag_travelers: "Travelers tools",
  notifications: "Notificaciones",
  setting: "Configuracion",
  globalteam: "Team global",
  globalagencies: "Agencias",
  globaltravelers: "Usuarios",
  globalcatalogs: "Catalogos",
};

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { agencies, selectedAgency, selectAgency, changeMode, globalRole, setLoading } = useTheoCore();
  const router = useRouter();
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState(false);
  const [previewAgency, setPreviewAgency] = useState<(typeof agencies)[number] | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function getSelectorLabel() {
    if (pathname?.startsWith("/intranet/thecore")) return "Entorno:";
    if (agencies.length === 0) return "Entorno global:";
    if (agencies.length === 1) return "Agencia:";
    return "Seleccionar agencia:";
  }

  const isTheoCoreView = pathname?.startsWith("/intranet/thecore") ?? false;

  const breadcrumb = useMemo(() => {
    if (!pathname) return null;

    const segments = pathname
      .split("/")
      .filter((seg) => seg && seg !== "intranet" && seg !== "intracore" && seg !== "thecore");

    const parts: { label: string; href?: string }[] = [];
    let pathAcc = THEOCORE_HOME;

    if (segments[0] === "agency" && segments[1]) {
      const agencyId = segments[1];
      const agencyLabel = selectedAgency?.commercial_name || "Agencia";
      pathAcc = agencyHomePath(agencyId);
      parts.push({ label: agencyLabel, href: agencyHomePath(agencyId) });
      segments.splice(0, 2);
    }

    for (const seg of segments) {
      pathAcc += `/${seg}`;
      const label = LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
      parts.push({ label, href: pathAcc });
    }

    return (
      <nav className="flex flex-wrap items-center gap-1 text-sm text-white/80">
        {parts.map((part, index) => (
          <span key={`${part.label}-${index}`} className="flex items-center">
            {index > 0 && <ChevronRightIcon className="mx-1 h-4 w-4 text-white/50" />}
            {index === parts.length - 1 ? (
              <span className="font-medium">{part.label}</span>
            ) : (
              <Link
                href={part.href || "#"}
                onClick={(e) => {
                  e.preventDefault();
                  if (part.href) router.push(part.href);
                }}
                className="opacity-70 underline-offset-2 hover:opacity-100 hover:underline"
              >
                {part.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    );
  }, [pathname, router, selectedAgency?.commercial_name]);

  const items = useMemo(() => {
    const agencyItems = agencies.map((agency) => ({ id: agency.id, label: agency.commercial_name }));

    if (globalRole === "TheoCoreOwner") {
      return [{ id: "global", label: "Entorno global" }, ...agencyItems];
    }

    return agencyItems;
  }, [agencies, globalRole]);

  const activeItem = useMemo(() => {
    if (isTheoCoreView) {
      return { id: "global", label: "TheoCore" };
    }

    if (selectedAgency) {
      return { id: selectedAgency.id, label: selectedAgency.commercial_name };
    }

    if (items.length === 0) return null;
    return items[0];
  }, [isTheoCoreView, items, selectedAgency]);

  function enterAgencyPanel(agency: (typeof agencies)[number]) {
    setLoading(true);
    changeMode("agency");
    selectAgency(agency, { force: true });
    router.push(agencyHomePath(agency.id));
  }

  if (!activeItem) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#083768] text-white shadow-[0_0_15px_rgba(14,165,233,0.4)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr] items-center gap-6 px-4 py-2">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-3">
            {onMenuClick && (
              <button onClick={onMenuClick} className="rounded-lg p-2 transition hover:bg-white/10 lg:hidden">
                <Bars3Icon className="h-6 w-6" />
              </button>
            )}
            <Image src="/theocore-logo.png" alt="TheoCore Logo" width={50} height={50} />
            <span className="hidden text-sm italic text-white/80 md:block">
              Acceso limitado o sin asignacion de agencia
            </span>
          </motion.div>
          <div className="flex items-center justify-self-end">
            <UserMenu />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#083768] text-white shadow-[0_0_15px_rgba(14,165,233,0.4)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr] items-center gap-6 px-4 py-2">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-3">
            {onMenuClick && (
              <button onClick={onMenuClick} className="rounded-lg p-2 transition hover:bg-white/10 lg:hidden">
                <Bars3Icon className="h-6 w-6" />
              </button>
            )}
            <Image src="/theocore-logo.png" alt="TheoCore Logo" width={50} height={50} />
          </motion.div>

          <div className="flex w-full flex-col">
            <div className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-4">
              <div className="mt-1 truncate">{breadcrumb}</div>

              <div className="relative flex items-center gap-1 justify-self-end" ref={dropdownRef}>
                <span className="text-sm text-white/80">{getSelectorLabel()}</span>
                <motion.button
                  onClick={() => setOpenDropdown((prev) => !prev)}
                  className="flex items-center gap-2 px-4 py-2 text-sm shadow-md transition hover:bg-[#0a478d]"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span>{activeItem.label}</span>
                  <ChevronDownIcon className={`h-4 w-4 ${openDropdown ? "rotate-180" : ""}`} />
                </motion.button>

                <AnimatePresence>
                  {openDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-white/30 bg-[#083768] shadow-xl"
                    >
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setOpenDropdown(false);

                            if (item.id === "global") {
                              setLoading(true);
                              changeMode("global");
                              selectAgency(null, { force: true });
                              router.push(THEOCORE_HOME);
                              return;
                            }

                            const agency = agencies.find((entry) => entry.id === item.id) || null;
                            if (!agency) return;

                            if (isTheoCoreView) {
                              setPreviewAgency(agency);
                              return;
                            }

                            enterAgencyPanel(agency);
                          }}
                          className={`block w-full px-4 py-2 text-left transition hover:bg-white/10 ${
                            item.id === activeItem.id ? "bg-white/10 font-semibold" : ""
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-self-end">
                <UserMenu />
              </div>
            </div>
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
