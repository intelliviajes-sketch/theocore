"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheoCore } from "@/contexts/page";
import EntityWorkspace from "@/components/system/EntityWorkspace";
import { listAgencyTravelers } from "@/features/travelers/api";
import type { AgencyTraveler } from "./types";
import AgencyTravelerPanel from "./TravelerDetailPanel";
import AgencyTravelerFormModal from "./TravelerFormModal";
import TravelerCard from "./TravelerCard";

export default function AgencyTravelersList() {
  const { selectedAgency } = useTheoCore();
  const [rows, setRows] = useState<AgencyTraveler[]>([]);
  const [selected, setSelected] = useState<AgencyTraveler | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedAgency) return;

    setLoading(true);
    try {
      const data = await listAgencyTravelers(selectedAgency.id);
      setRows(data);
      setSelected((current) => {
        if (!current) return data[0] ?? null;
        return data.find((row) => row.id === current.id) ?? data[0] ?? null;
      });
    } catch (error) {
      console.error("Error cargando viajeros de agencia:", error);
      setRows([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAgency]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(
    () => [
      { label: "Total", value: rows.length },
      { label: "Activos", value: rows.filter((row) => row.status === "active").length },
      { label: "Alta prioridad", value: rows.filter((row) => row.priority === "high").length },
    ],
    [rows],
  );

  const listPane = loading ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      Cargando CRM de viajeros...
    </div>
  ) : rows.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      No hay viajeros vinculados a esta agencia.
    </div>
  ) : (
    rows.map((row) => (
      <TravelerCard
        key={row.id}
        active={selected?.id === row.id}
        traveler={{
          id: row.traveler?.id || row.traveler_id,
          full_name: row.traveler?.full_name || "Traveler",
          email: row.traveler?.email || "",
          phone: row.phone,
          active: row.status === "active",
          created_at: "",
        }}
        onClick={() => setSelected(row)}
      />
    ))
  );

  const detailPane = selected ? (
    <AgencyTravelerPanel data={selected} />
  ) : (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      Selecciona un viajero para ver su ficha CRM.
    </div>
  );

  return (
    <>
      <EntityWorkspace
        title="CRM de viajeros"
        subtitle="Consulta, segmenta y da seguimiento a los viajeros registrados por la agencia."
        actionLabel="+ Nuevo viajero"
        onAction={() => setOpenForm(true)}
        summary={summary}
        listPane={listPane}
        detailPane={detailPane}
      />

      <AgencyTravelerFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSaved={() => {
          setOpenForm(false);
          void load();
        }}
        agencyId={selectedAgency?.id ?? ""}
      />
    </>
  );
}
