"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Pencil, Plus, Power, Search, Trash2, UserRound } from "lucide-react";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import CrudPageShell from "@/components/intracore/CrudPageShell";
import { useToast } from "@/components/system/ToastProvider";
import { validateTravelerForm } from "@/lib/validation/theocore";
import { downloadCsv } from "@/lib/utils/csv";
import {
  type TravelerRow,
  useGlobalTravelers,
} from "@/hooks/theocore/useGlobalTravelers";

const PAGE_SIZE = 10;

type TravelerFormState = {
  full_name: string;
  email: string;
  phone: string;
};

function TravelerFormModal({ open, traveler, onClose, onSave, onSaved }: { open: boolean; traveler: TravelerRow | null; onClose: () => void; onSave: (payload: { id?: string; full_name: string; email: string; phone: string | null; }) => Promise<void>; onSaved: (message: string) => Promise<void>; }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TravelerFormState>({ full_name: "", email: "", phone: "" });
  const { error } = useToast();

  useEffect(() => {
    if (!open) return;
    setForm({ full_name: traveler?.full_name ?? "", email: traveler?.email ?? "", phone: traveler?.phone ?? "" });
  }, [open, traveler]);

  const validation = useMemo(() => validateTravelerForm({ fullName: form.full_name, email: form.email, phone: form.phone }), [form]);

  if (!open) return null;

  const canSubmit = Object.keys(validation).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSave({
        id: traveler?.id,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      await onSaved(traveler ? "Traveler actualizado." : "Traveler creado.");
      onClose();
    } catch (saveError) {
      console.error(saveError);
      error(saveError instanceof Error ? saveError.message : "No se pudo guardar el traveler.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{traveler ? "Editar traveler" : "Nuevo traveler"}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Alta y mantenimiento de travelers globales desde modal.</p></div><button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cerrar</button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre completo *" error={validation.fullName}><input value={form.full_name} onChange={(e) => setForm((current) => ({ ...current, full_name: e.target.value }))} className={inputClass(validation.fullName)} /></Field>
          <Field label="Email *" error={validation.email}><input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} className={inputClass(validation.email)} /></Field>
          <Field label="Telefono" error={validation.phone}><input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} className={inputClass(validation.phone)} /></Field>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:opacity-90 dark:bg-slate-800 dark:text-slate-200">Cancelar</button><button type="submit" disabled={!canSubmit || saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{traveler ? "Guardar cambios" : "Crear traveler"}</button></div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}{error ? <span className="text-xs text-rose-600 dark:text-rose-300">{error}</span> : null}</label>;
}
function inputClass(error?: string) { return `h-11 w-full rounded-2xl border px-4 text-sm outline-none transition ${error ? "border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-100" : "border-slate-200 bg-white text-slate-800 focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"}`; }
function toolbarInputClass() { return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"; }
function pageCount(total: number) { return Math.max(1, Math.ceil(total / PAGE_SIZE)); }

export default function GlobalTravelersPage() {
  const [selectedTraveler, setSelectedTraveler] = useState<TravelerRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [travelerToDelete, setTravelerToDelete] = useState<TravelerRow | null>(null);
  const [search, setSearch] = useState("");
  const [linkFilter, setLinkFilter] = useState<"all" | "linked" | "unlinked">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<null | "archive" | "activate">(null);
  const { success, error } = useToast();
  const { loading, travelers, travelerLinkCount, reload, saveTraveler, toggleTraveler, deleteTraveler } = useGlobalTravelers();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(1);
      setSelectedIds([]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [linkFilter, search, statusFilter]);

  async function handleDeleteTraveler(traveler: TravelerRow) {
    try {
      await deleteTraveler(traveler.id);
      await reload();
      success("Traveler archivado.");
    } catch (deleteError) {
      console.error(deleteError);
      error("No se pudo archivar el traveler.");
    }
  }

  async function handleToggleTraveler(traveler: TravelerRow) {
    try {
      await toggleTraveler(traveler);
      await reload();
      success(traveler.active ? "Traveler desactivado." : "Traveler reactivado.");
    } catch (toggleError) {
      console.error(toggleError);
      error("No se pudo cambiar el estado del traveler.");
    }
  }

  const rows = useMemo(() => travelers.map((traveler) => ({ ...traveler, agencyCount: travelerLinkCount[traveler.id] || 0, createdLabel: new Date(traveler.created_at).toLocaleDateString() })), [travelerLinkCount, travelers]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((traveler) => {
      const matchesSearch = !term || [traveler.full_name, traveler.email, traveler.phone || "", traveler.id].join(" ").toLowerCase().includes(term);
      const matchesLink = linkFilter === "all" || (linkFilter === "linked" ? traveler.agencyCount > 0 : traveler.agencyCount === 0);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? traveler.active : !traveler.active);
      return matchesSearch && matchesLink && matchesStatus;
    });
  }, [linkFilter, rows, search, statusFilter]);

  const totalPages = pageCount(filteredRows.length);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filteredRows, safePage]);
  const visibleIds = paginatedRows.map((traveler) => traveler.id);
  const selectedRows = filteredRows.filter((traveler) => selectedIds.includes(traveler.id));
  const selectedInactive = selectedRows.filter((traveler) => !traveler.active);

  function toggleSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleSelectVisible() {
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds])));
  }

  async function handleBulkArchive() {
    try {
      for (const traveler of selectedRows) {
        if (traveler.active) {
          await deleteTraveler(traveler.id);
        }
      }
      await reload();
      setSelectedIds([]);
      setBulkAction(null);
      success("Travelers archivados.");
    } catch (bulkError) {
      console.error(bulkError);
      error("No se pudieron archivar los travelers seleccionados.");
    }
  }

  async function handleBulkActivate() {
    try {
      for (const traveler of selectedInactive) {
        await toggleTraveler(traveler);
      }
      await reload();
      setSelectedIds([]);
      setBulkAction(null);
      success("Travelers activados.");
    } catch (bulkError) {
      console.error(bulkError);
      error("No se pudieron activar los travelers seleccionados.");
    }
  }

  function handleExport() {
    downloadCsv(
      "theocore-travelers.csv",
      filteredRows.map((traveler) => ({
        nombre: traveler.full_name,
        email: traveler.email,
        telefono: traveler.phone || "",
        agencias: traveler.agencyCount,
        estado: traveler.active ? "Activo" : "Archivado",
        alta: traveler.createdLabel,
      }))
    );
    success("CSV de travelers exportado.");
  }

  const toolbar = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por traveler, email o telefono" className={`${toolbarInputClass()} pl-11`} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:flex">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "archived")} className={toolbarInputClass()}>
            <option value="active">Activos</option>
            <option value="archived">Archivados</option>
            <option value="all">Todos</option>
          </select>
          <select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value as "all" | "linked" | "unlinked")} className={toolbarInputClass()}>
            <option value="all">Todos</option>
            <option value="linked">Con agencias</option>
            <option value="unlinked">Sin agencias</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span>{filteredRows.length} travelers filtrados</span>
          <span>{selectedIds.length} seleccionados</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:opacity-90 dark:bg-slate-800 dark:text-slate-200"><Download className="h-4 w-4" />Exportar CSV</button>
          <button onClick={() => setBulkAction("activate")} disabled={selectedInactive.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Power className="h-4 w-4" />Activar seleccionados</button>
          <button onClick={() => setBulkAction("archive")} disabled={selectedIds.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Trash2 className="h-4 w-4" />Archivar seleccionados</button>
        </div>
      </div>
    </div>
  );

  const action = (
    <div className="flex flex-wrap gap-2">
      <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm"><Download className="h-4 w-4" />Exportar</button>
      <button onClick={() => { setSelectedTraveler(null); setIsModalOpen(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"><Plus className="h-4 w-4" />Nuevo traveler</button>
    </div>
  );

  return (<><CrudPageShell title="Travelers globales" description="Base global de travelers con filtros, exportacion y acciones masivas alineadas con el resto del panel." action={action} toolbar={toolbar}>
    {loading ? <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Cargando travelers...</div> : filteredRows.length === 0 ? <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">No hay travelers que coincidan con los filtros.</div> : <><div className="flex items-center justify-between px-6 py-4 text-sm text-slate-500 dark:text-slate-400"><span>{filteredRows.length} resultados</span><span>Pagina {safePage} de {totalPages}</span></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50/80 text-left text-slate-500 dark:bg-slate-800/60 dark:text-slate-300"><tr><th className="px-4 py-4 font-medium"><input type="checkbox" checked={visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))} onChange={toggleSelectVisible} /></th><th className="px-6 py-4 font-medium">Traveler</th><th className="px-6 py-4 font-medium">Contacto</th><th className="px-6 py-4 font-medium">Agencias</th><th className="px-6 py-4 font-medium">Estado</th><th className="px-6 py-4 font-medium">Alta</th><th className="px-6 py-4 font-medium">Acciones</th></tr></thead><tbody>{paginatedRows.map((traveler) => <tr key={traveler.id} className="border-t border-slate-200/70 dark:border-slate-800"><td className="px-4 py-4 align-top"><input type="checkbox" checked={selectedIds.includes(traveler.id)} onChange={() => toggleSelection(traveler.id)} /></td><td className="px-6 py-4 align-top"><div className="flex items-start gap-3"><div className="rounded-2xl bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"><UserRound className="h-4 w-4" /></div><div><div className="font-medium text-slate-900 dark:text-slate-100">{traveler.full_name}</div><div className="text-xs text-slate-500 dark:text-slate-400">ID: {traveler.id}</div></div></div></td><td className="px-6 py-4"><div className="text-slate-700 dark:text-slate-200">{traveler.email}</div><div className="text-xs text-slate-500 dark:text-slate-400">{traveler.phone || "Sin telefono"}</div></td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{traveler.agencyCount}</td><td className="px-6 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${traveler.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{traveler.active ? "Activo" : "Archivado"}</span></td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{traveler.createdLabel}</td><td className="px-6 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => { setSelectedTraveler(traveler); setIsModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white"><Pencil className="h-3.5 w-3.5" />Editar</button><button onClick={() => handleToggleTraveler(traveler)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-medium text-white"><Power className="h-3.5 w-3.5" />{traveler.active ? "Desactivar" : "Activar"}</button>{traveler.active ? <button onClick={() => setTravelerToDelete(traveler)} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white"><Trash2 className="h-3.5 w-3.5" />Archivar</button> : null}</div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-200/70 px-6 py-4 dark:border-slate-800"><button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Anterior</button><button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Siguiente</button></div></>}
  </CrudPageShell><TravelerFormModal open={isModalOpen} traveler={selectedTraveler} onClose={() => setIsModalOpen(false)} onSave={saveTraveler} onSaved={async (message) => { await reload(); success(message); }} />{travelerToDelete ? <ConfirmDialog title="Archivar traveler" message={`Se archivara ${travelerToDelete.full_name} y dejara de aparecer en el listado activo.`} confirmText="Archivar" confirmVariant="danger" onCancel={() => setTravelerToDelete(null)} onConfirm={async () => { const current = travelerToDelete; setTravelerToDelete(null); await handleDeleteTraveler(current); }} /> : null}{bulkAction ? <ConfirmDialog title={bulkAction === "archive" ? "Archivar travelers" : "Activar travelers"} message={bulkAction === "archive" ? `Se archivaran ${selectedRows.length} travelers seleccionados.` : `Se activaran ${selectedInactive.length} travelers seleccionados.`} confirmText={bulkAction === "archive" ? "Archivar" : "Activar"} confirmVariant={bulkAction === "archive" ? "danger" : "primary"} onCancel={() => setBulkAction(null)} onConfirm={bulkAction === "archive" ? handleBulkArchive : handleBulkActivate} /> : null}</>);
}
