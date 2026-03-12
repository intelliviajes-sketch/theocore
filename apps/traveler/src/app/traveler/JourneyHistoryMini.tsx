"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";

function formatUpdatedAt(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function JourneyHistoryMini({
  title = "Historial reciente",
  maxItems = 3,
}: {
  title?: string;
  maxItems?: number;
}) {
  const router = useRouter();
  const { journeyHistory, activateJourneyEntry } = useTravelerWorkspace();
  const items = journeyHistory.filter((entry) => !entry.archived).slice(0, maxItems);

  function openEntry(entryId: string, route: string) {
    activateJourneyEntry(entryId);
    router.push(route || "/traveler");
  }

  return (
    <section className="trav-panel mt-6 p-4">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        <Clock3 className="h-3.5 w-3.5" />
        {title}
      </p>

      {items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Aun no hay actividad para mostrar.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => openEntry(entry.id, entry.route)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {entry.mode === "chat" ? "CHAT" : "PLAN"} - {entry.status}
                </p>
                <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-800">
                  {entry.title}
                </p>
              </div>
              <div className="ml-3 inline-flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span>{formatUpdatedAt(entry.updatedAt)}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
