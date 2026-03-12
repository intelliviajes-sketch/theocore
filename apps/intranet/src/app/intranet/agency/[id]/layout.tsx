"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Building2, ChevronRight } from "lucide-react";
import { THEOCORE_HOME, agencyHomePath } from "@/lib/routes";
import { useTheoCore } from "@/contexts/page";

const AGENCY_BREADCRUMB_LABELS: Record<string, string> = {
  profile: "Perfil",
  "registered-travelers": "CRM de viajeros",
  ag_team: "Empleados",
  ag_tools: "Herramientas",
  catalog: "Catalogo",
  catalogia: "Catalogia",
};

function AgencyLayoutInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { agencies, selectedAgency, selectAgency, changeMode } = useTheoCore();
  const isLeavingAgencyRef = useRef(false);

  useEffect(() => {
    if (!id || isLeavingAgencyRef.current) return;

    changeMode("agency");

    if (!selectedAgency || selectedAgency.id !== id) {
      const agency = agencies.find((agencyItem) => agencyItem.id === id) || null;
      if (agency) {
        selectAgency(agency, { force: true });
      }
    }
  }, [agencies, changeMode, id, selectAgency, selectedAgency]);

  const currentAgency = selectedAgency?.id === id ? selectedAgency : agencies.find((agency) => agency.id === id) || null;
  const baseAgencyPath = id ? agencyHomePath(id) : "";
  const parts = pathname
    ?.split("/")
    .filter(Boolean)
    .slice(4) // /intranet/agency/:id
    .map((segment, index, all) => {
      const href = `${baseAgencyPath}/${all.slice(0, index + 1).join("/")}`;
      return {
        href,
        label: AGENCY_BREADCRUMB_LABELS[segment] || segment,
      };
    }) ?? [];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {currentAgency?.commercial_name || "Panel de agencia"}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">Entorno operativo de agencia</p>
              </div>
            </div>

            <button
              onClick={() => {
                isLeavingAgencyRef.current = true;
                changeMode("global");
                selectAgency(null, { force: true });
                router.push(THEOCORE_HOME);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a TheoCore
            </button>
          </div>

          <nav className="mt-4 flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-300">
            <Link href={baseAgencyPath} className="rounded-md px-1 py-0.5 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100">
              Dashboard
            </Link>
            {parts.map((part, index) => {
              const isLast = index === parts.length - 1;
              return (
                <span key={part.href} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                  {isLast ? (
                    <span className="font-medium text-slate-700 dark:text-slate-100">{part.label}</span>
                  ) : (
                    <Link href={part.href} className="rounded-md px-1 py-0.5 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                      {part.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return <AgencyLayoutInner>{children}</AgencyLayoutInner>;
}
