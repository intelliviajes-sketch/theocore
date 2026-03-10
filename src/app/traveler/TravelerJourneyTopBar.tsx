"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, MessageSquarePlus, Ticket } from "lucide-react";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";

function isActive(pathname: string, href: string) {
  if (href === "/traveler") return pathname === "/traveler";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function TravelerJourneyTopBar() {
  return <TravelerJourneyTopBarContent variant="panel" />;
}

export function TravelerJourneyTopBarContent({
  variant = "panel",
}: {
  variant?: "panel" | "header";
}) {
  const pathname = usePathname();
  const { planningState, journeyState } = useTravelerWorkspace();

  const items = [
    { href: "/traveler/chat", label: "Chat IA", icon: <MessageSquarePlus className="h-4 w-4" /> },
    {
      href: "/traveler/planning",
      label: "Planning",
      icon: <FileText className="h-4 w-4" />,
      meta: planningState.dirty ? "Borrador" : null,
    },
    {
      href: "/traveler/bookings",
      label: "Reservas",
      icon: <Ticket className="h-4 w-4" />,
      meta: journeyState.reservation?.status || null,
    },
  ];

  const wrapperClass =
    variant === "header"
      ? "flex flex-wrap items-center justify-end gap-2"
      : "trav-panel p-3 sm:p-4";
  const listClass = variant === "header" ? "flex flex-wrap items-center gap-1.5" : "flex flex-wrap items-center gap-2";

  return (
    <div className={wrapperClass}>
      <div className={listClass}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-xl font-medium transition ${
                variant === "header"
                  ? `px-2.5 py-1.5 text-xs ${
                      active
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`
                  : `${
                      active
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    } px-3 py-2 text-sm`
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.meta ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.meta}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
