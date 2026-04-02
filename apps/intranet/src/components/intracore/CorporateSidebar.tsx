"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CorporateNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
};

export type CorporateNavSection = {
  title?: string;
  items: CorporateNavItem[];
};

function itemIsActive(pathname: string, item: CorporateNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type SidebarProps = {
  contextLabel: string;
  contextName: string;
  sections: CorporateNavSection[];
  footer?: React.ReactNode;
  className?: string;
};

export function CorporateMobileMenu({
  sections,
  className,
}: {
  sections: CorporateNavSection[];
  className?: string;
}) {
  const pathname = usePathname();
  const flatItems = sections.flatMap((section) => section.items);

  return (
    <div
      className={cn(
        "lg:hidden border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95",
        className,
      )}
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {flatItems.map((item) => {
          const Icon = item.icon;
          const active = itemIsActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              aria-disabled={item.disabled}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition",
                active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                item.disabled && "pointer-events-none opacity-50",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function CorporateSidebar({
  contextLabel,
  contextName,
  sections,
  footer,
  className,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:w-[292px] lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-slate-50 dark:lg:border-slate-800/90 dark:lg:bg-[linear-gradient(180deg,#030712_0%,#0b1220_52%,#0f172a_100%)]",
        className,
      )}
    >
      <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800/90">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{contextLabel}</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{contextName}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <nav className="space-y-6">
          {sections.map((section) => (
            <div key={section.title || section.items.map((item) => item.href).join("|")} className="space-y-2">
              {section.title ? (
                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-500">
                  {section.title}
                </p>
              ) : null}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = itemIsActive(pathname, item);

                  return (
                    <Link
                      key={item.href}
                      href={item.disabled ? "#" : item.href}
                      aria-disabled={item.disabled}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                        active
                          ? "bg-emerald-500/14 text-emerald-700 ring-1 ring-emerald-300/45 dark:text-emerald-300 dark:ring-emerald-300/25"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white",
                        item.disabled && "pointer-events-none opacity-40",
                      )}
                    >
                      {active ? <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500 dark:bg-emerald-300" /> : null}
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          active
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-slate-500 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300",
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {footer ? <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800/90 dark:text-slate-400">{footer}</div> : null}
    </aside>
  );
}
