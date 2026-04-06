"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { listTravelerAgencyHistory } from "@/features/travelers/api";
import type { TravelerAgencyHistoryRow } from "@/features/travelers/types";
import type { AgencyTraveler } from "./types";

export default function AgencyTravelerPanel({ data }: { data: AgencyTraveler }) {
  const traveler = data.traveler;
  const [history, setHistory] = useState<TravelerAgencyHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!data.traveler_id) {
        setHistory([]);
        return;
      }
      setLoadingHistory(true);
      try {
        const rows = await listTravelerAgencyHistory(data.traveler_id);
        if (!mounted) return;
        setHistory(rows);
      } catch (error) {
        console.error("Error cargando historial de traveler:", error);
        if (!mounted) return;
        setHistory([]);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [data.traveler_id]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{traveler?.full_name || "Traveler"}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ficha CRM del viajero vinculado a la agencia.</p>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Info label="Email" value={traveler?.email || "-"} />
        <Info label="Telefono" value={data.phone || "-"} />
        <Info label="Prioridad" value={data.priority || "normal"} />
        <Info label="Estado" value={data.status || "active"} />
        <Info label="Segmento" value={data.segment || "-"} />
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="mb-2 font-medium text-slate-800 dark:text-slate-100">Notas internas</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{data.notes || "-"}</p>
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="mb-2 font-medium text-slate-800 dark:text-slate-100">Historial en agencias</h3>
        {loadingHistory ? (
          <p className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando historial...
          </p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Sin historial adicional.</p>
        ) : (
          <div className="space-y-2">
            {history.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/40">
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {row.agency_name || row.agency_id} · {row.status || "active"}
                </p>
                <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                  Prioridad: {row.priority || "normal"} · Segmento: {row.segment || "-"}
                </p>
                <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                  Alta: {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"} · Ultima act.: {row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950/40">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{value}</div>
    </div>
  );
}
