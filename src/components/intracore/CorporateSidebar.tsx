"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

export type CorporateNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
};

export type CorporateNavSection = {
  title: string;
  items: CorporateNavItem[];
};

function isActiveItem(pathname: string, item: CorporateNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarSections({
  sections,
  collapsed,
}: {
  sections: CorporateNavSection[];
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const currentPath = pathname || "";

  return (
    <nav className="space-y-5">
      {sections.map((section) => (
        <section key={section.title} className="space-y-2.5">
          <h3
            className={`px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition-all dark:text-slate-400 ${
              collapsed ? "pointer-events-none h-0 overflow-hidden opacity-0" : "opacity-100"
            }`}
          >
            {section.title}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActiveItem(currentPath, item);
              const baseClass = `group flex items-center rounded-xl py-2.5 text-sm transition ${
                collapsed ? "justify-center px-2" : "gap-2.5 px-3"
              }`;

              if (item.disabled) {
                return (
                  <span
                    key={item.href}
                    className={`${baseClass} cursor-not-allowed text-slate-400 dark:text-slate-500`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                    className={`${baseClass} ${
                      active
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span
                      className={`truncate transition-all ${
                        collapsed ? "pointer-events-none max-w-0 overflow-hidden opacity-0" : "max-w-[200px] opacity-100"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
      ))}
    </nav>
  );
}

export default function CorporateSidebar({
  contextLabel,
  contextName,
  sections,
  footer,
}: {
  contextLabel?: string;
  contextName?: string;
  sections: CorporateNavSection[];
  footer?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsed = !expanded;
  const contextShort = (contextName || "TC")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setExpanded(false);
        }
      }}
      className={`hidden shrink-0 border-r border-slate-200 bg-white/85 py-5 backdrop-blur transition-[width,padding] duration-200 dark:border-slate-800 dark:bg-slate-950/75 md:block ${
        collapsed ? "w-[86px] px-2" : "w-72 px-4"
      }`}
    >
      <div
        className={`mb-5 rounded-xl border border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900 ${
          collapsed ? "px-2 py-3 text-center" : "px-3 py-2"
        }`}
      >
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition-all dark:text-slate-400 ${
            collapsed ? "pointer-events-none h-0 overflow-hidden opacity-0" : "opacity-100"
          }`}
        >
          {contextLabel || "Contexto"}
        </p>
        <p
          className={`mt-1 truncate font-medium text-slate-800 dark:text-slate-100 ${
            collapsed ? "text-sm" : "text-sm"
          }`}
          title={collapsed ? contextName || "TheoCore" : undefined}
        >
          {collapsed ? contextShort : contextName || "TheoCore"}
        </p>
      </div>

      <SidebarSections sections={sections} collapsed={collapsed} />

      {footer ? (
        <p
          className={`mt-6 border-t border-slate-200 px-2 pt-4 text-xs text-slate-500 transition-all dark:border-slate-800 dark:text-slate-400 ${
            collapsed ? "pointer-events-none h-0 overflow-hidden opacity-0" : "opacity-100"
          }`}
        >
          {footer}
        </p>
      ) : null}
    </aside>
  );
}

export function CorporateMobileMenu({ sections }: { sections: CorporateNavSection[] }) {
  const [open, setOpen] = useState(false);
  const hasItems = useMemo(
    () => sections.some((section) => section.items.length > 0),
    [sections],
  );

  if (!hasItems) return null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-lg transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <Menu className="h-4 w-4" />
        Menu
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Cerrar menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-80 max-w-[92vw] overflow-y-auto border-r border-slate-200 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Navegacion</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div onClick={() => setOpen(false)}>
              <SidebarSections sections={sections} collapsed={false} />
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
