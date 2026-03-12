import type { AgencyTraveler } from "./types";

export default function AgencyTravelerPanel({ data }: { data: AgencyTraveler }) {
  const traveler = data.traveler;

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
