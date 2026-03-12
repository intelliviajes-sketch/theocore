"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Lock, Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import CrudPageShell from "@/components/intracore/CrudPageShell";
import { useToast } from "@/components/system/ToastProvider";
import { downloadCsv } from "@/lib/utils/csv";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { useTheoCore } from "@/contexts/page";
import { archiveCatalogItem, listCatalogItems, loadCatalogOptions, setCatalogItemActive } from "./api";
import CatalogFormModal from "./CatalogFormModal";
import CatalogQuickViewModal from "./CatalogQuickViewModal";
import type { CatalogAgency, CatalogCountry, CatalogItemRow, CatalogListItem, CatalogProductType } from "./types";

const PAGE_SIZE = 10;

type AgencyMembership = {
  role: "AgencyOwner" | "TeamAgency" | null;
  permissions: string[] | null;
};

function hasCatalogAccess(globalRole: string | null, membership: AgencyMembership | null) {
  if (globalRole === "TheoCoreOwner") return true;
  if (!membership) return false;
  if (membership.role === "AgencyOwner") return true;
  if (membership.role === "TeamAgency") {
    if (!membership.permissions || membership.permissions.includes("*")) return true;
    return membership.permissions.includes("catalog");
  }
  return false;
}

export default function CatalogManager({
  mode,
  agencyId,
}: {
  mode: "agency" | "theocore";
  agencyId?: string;
}) {
  const { globalRole } = useTheoCore() as { globalRole: string | null };
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(mode === "theocore");
  const [items, setItems] = useState<CatalogListItem[]>([]);
  const [agencies, setAgencies] = useState<CatalogAgency[]>([]);
  const [countries, setCountries] = useState<CatalogCountry[]>([]);
  const [productTypes, setProductTypes] = useState<CatalogProductType[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CatalogItemRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<CatalogListItem | null>(null);
  const [itemToArchive, setItemToArchive] = useState<CatalogListItem | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "ai" | "imported">("all");
  const [reviewFilter, setReviewFilter] = useState<"all" | "draft" | "reviewed" | "published" | "archived">("all");
  const [agencyFilter, setAgencyFilter] = useState<string>(agencyId || "all");
  const [currentPage, setCurrentPage] = useState(1);
  const { success, error } = useToast();

  const resolveAgencyMembership = useCallback(async (userId: string): Promise<AgencyMembership | null> => {
    if (!agencyId) return null;
    const { data, error: membershipError } = await supabase
      .from("agency_team")
      .select("role, permissions")
      .eq("user_id", userId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!data) return null;

    const permissions = Array.isArray(data.permissions)
      ? (data.permissions as string[])
      : typeof data.permissions === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(data.permissions);
              return Array.isArray(parsed) ? parsed : null;
            } catch {
              return null;
            }
          })()
        : null;

    return {
      role: data.role === "AgencyOwner" || data.role === "TeamAgency" ? data.role : null,
      permissions,
    };
  }, [agencyId]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const userId = authData.user?.id ?? null;
      setCurrentUserId(userId);

      if (mode === "agency") {
        const membership = userId ? await resolveAgencyMembership(userId) : null;
        const canAccess = hasCatalogAccess(globalRole, membership);
        setAllowed(canAccess);
        if (!canAccess) {
          setItems([]);
          setAgencies([]);
          setCountries([]);
          setProductTypes([]);
          return;
        }
      } else {
        setAllowed(true);
      }

      const [catalogItems, options] = await Promise.all([
        listCatalogItems({ agencyId }),
        loadCatalogOptions({ agencyId }),
      ]);

      setItems(catalogItems);
      setAgencies(options.agencies);
      setCountries(options.countries);
      setProductTypes(options.productTypes);
    } catch (loadError) {
      console.error(loadError);
      setItems([]);
      error("No se pudo cargar el catalogo.");
    } finally {
      setLoading(false);
    }
  }, [agencyId, error, globalRole, mode, resolveAgencyMembership]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, statusFilter, sourceFilter, reviewFilter, agencyFilter]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        [item.titleLabel, item.summaryLabel, item.productTypeName || "", item.agencyName || "", item.country_code || ""]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesType = typeFilter === "all" || item.product_type_id === typeFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? item.active : !item.active);
      const matchesSource = sourceFilter === "all" || item.creation_source === sourceFilter;
      const matchesReview = reviewFilter === "all" || item.review_status === reviewFilter;
      const matchesAgency = mode === "agency" || agencyFilter === "all" || item.agency_id === agencyFilter;
      return matchesSearch && matchesType && matchesStatus && matchesSource && matchesReview && matchesAgency;
    });
  }, [agencyFilter, items, mode, reviewFilter, search, sourceFilter, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filteredRows, safePage]);

  async function handleToggle(item: CatalogListItem) {
    try {
      await setCatalogItemActive(item.id, !item.active);
      await reload();
      success(item.active ? "Catalogo desactivado." : "Catalogo activado.");
    } catch (toggleError) {
      console.error(toggleError);
      error("No se pudo cambiar el estado del catalogo.");
    }
  }

  async function handleArchive() {
    if (!itemToArchive) return;
    const current = itemToArchive;
    setItemToArchive(null);
    try {
      await archiveCatalogItem(current.id);
      await reload();
      success("Catalogo archivado.");
    } catch (archiveError) {
      console.error(archiveError);
      error("No se pudo archivar el catalogo.");
    }
  }

  function handleExport() {
    downloadCsv(
      mode === "agency" ? "agency-catalog.csv" : "theocore-catalog.csv",
      filteredRows.map((item) => ({
        titulo: item.titleLabel,
        tipo: item.productTypeName || "",
        agencia: item.agencyName || "",
        pais: item.country_code || "",
        origen: item.creation_source,
        revision: item.review_status,
        estado: item.active ? "Activo" : "Inactivo",
        fecha: item.createdLabel,
      })),
    );
    success("CSV de catalogo exportado.");
  }

  const toolbar = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por titulo, tipo, agencia o pais" className={`${toolbarInputClass()} pl-11`} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {mode === "theocore" ? (
            <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className={toolbarInputClass()}>
              <option value="all">Todas las agencias</option>
              {agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.commercial_name}</option>)}
            </select>
          ) : null}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={toolbarInputClass()}>
            <option value="all">Todos los tipos</option>
            {productTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")} className={toolbarInputClass()}>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="all">Todos</option>
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)} className={toolbarInputClass()}>
            <option value="all">Todos los origenes</option>
            <option value="manual">Manual</option>
            <option value="ai">IA</option>
            <option value="imported">Importado</option>
          </select>
          <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value as typeof reviewFilter)} className={toolbarInputClass()}>
            <option value="all">Todas las revisiones</option>
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
    </div>
  );

  const action = (
    <div className="flex flex-wrap gap-2">
      <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm"><Download className="h-4 w-4" />Exportar</button>
      <button onClick={() => { setSelectedItem(null); setModalOpen(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"><Plus className="h-4 w-4" />Nuevo catalogo</button>
    </div>
  );

  const accessDenied = (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">Sin acceso al catalogo manual</p>
          <p className="mt-2">Esta herramienta depende del permiso <code>catalog</code>. Solo AgencyOwner, TheoCoreOwner o miembros del equipo con ese permiso pueden entrar.</p>
        </div>
      </div>
    </div>
  );

  const content = loading ? (
    <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Cargando catalogo...</div>
  ) : mode === "agency" && !allowed ? (
    <div className="px-6 py-8">{accessDenied}</div>
  ) : filteredRows.length === 0 ? (
    <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">No hay productos de catalogo que coincidan con los filtros.</div>
  ) : (
    <>
      <div className="flex items-center justify-between px-6 py-4 text-sm text-slate-500 dark:text-slate-400"><span>{filteredRows.length} resultados</span><span>Pagina {safePage} de {totalPages}</span></div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/80 text-left text-slate-500 dark:bg-slate-800/60 dark:text-slate-300">
            <tr>
              <th className="px-6 py-4 font-medium">Catalogo</th>
              {mode === "theocore" ? <th className="px-6 py-4 font-medium">Agencia</th> : null}
              <th className="px-6 py-4 font-medium">Tipo</th>
              <th className="px-6 py-4 font-medium">Pais</th>
              <th className="px-6 py-4 font-medium">Origen</th>
              <th className="px-6 py-4 font-medium">Revision</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium">Alta</th>
              <th className="px-6 py-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((item) => (
              <tr key={item.id} className="border-t border-slate-200/70 dark:border-slate-800">
                <td className="px-6 py-4 align-top">
                  <div className="flex items-start gap-4">
                    <button type="button" onClick={() => setPreviewItem(item)} className="h-16 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-left transition hover:opacity-90 dark:border-slate-800 dark:bg-slate-900">
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={item.titleLabel} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-medium text-slate-400 dark:text-slate-500">Sin imagen</div>
                      )}
                    </button>
                    <div className="min-w-0">
                      <button type="button" onClick={() => setPreviewItem(item)} className="text-left font-medium text-slate-900 transition hover:text-cyan-700 dark:text-slate-100 dark:hover:text-cyan-300">{item.titleLabel}</button>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{item.summaryLabel}</div>
                      {item.images.length > 1 ? <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{item.images.length} imagenes</div> : null}
                      <button type="button" onClick={() => setPreviewItem(item)} className="mt-2 text-xs font-medium text-cyan-700 hover:underline dark:text-cyan-300">Ver detalle</button>
                    </div>
                  </div>
                </td>
                {mode === "theocore" ? <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{item.agencyName || "-"}</td> : null}
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{item.productTypeName || "-"}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{item.country_code || "Global"}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{item.creation_source}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{item.review_status}</td>
                <td className="px-6 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${item.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{item.active ? "Activo" : "Archivado"}</span></td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{item.createdLabel}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setSelectedItem(item); setModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white"><Pencil className="h-3.5 w-3.5" />Editar</button>
                    <button onClick={() => void handleToggle(item)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-medium text-white"><Power className="h-3.5 w-3.5" />{item.active ? "Desactivar" : "Activar"}</button>
                    {item.active ? <button onClick={() => setItemToArchive(item)} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white"><Trash2 className="h-3.5 w-3.5" />Archivar</button> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200/70 px-6 py-4 dark:border-slate-800">
        <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Anterior</button>
        <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Siguiente</button>
      </div>
    </>
  );

  if (mode === "theocore") {
    return (
      <>
        <CrudPageShell title="Catalogo global" description="CRUD manual compartido del catalogo. Los registros conservan su origen para distinguir carga manual, IA o importaciones." action={action} toolbar={toolbar}>
          {content}
        </CrudPageShell>
        <CatalogFormModal open={modalOpen} mode={mode} item={selectedItem} agencies={agencies} countries={countries} productTypes={productTypes} createdBy={currentUserId} onClose={() => setModalOpen(false)} onSaved={reload} />
        {itemToArchive ? <ConfirmDialog title="Archivar catalogo" message={`Se archivara ${itemToArchive.titleLabel} y dejara de estar activo.`} confirmText="Archivar" confirmVariant="danger" onCancel={() => setItemToArchive(null)} onConfirm={handleArchive} /> : null}
        <CatalogQuickViewModal key={previewItem?.id ?? "catalog-preview"} open={Boolean(previewItem)} item={previewItem} onClose={() => setPreviewItem(null)} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 rounded-[2rem] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">Agency</p>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 md:text-3xl">Catalogo manual</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Gestion manual del catalogo de la agencia. Los productos creados aqui quedan marcados como manuales.</p>
            </div>
          </div>
          {allowed ? action : null}
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
          <div className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">{toolbar}</div>
          {content}
        </div>
      </div>
      {allowed ? <CatalogFormModal open={modalOpen} mode={mode} fixedAgencyId={agencyId} item={selectedItem} agencies={agencies} countries={countries} productTypes={productTypes} createdBy={currentUserId} onClose={() => setModalOpen(false)} onSaved={reload} /> : null}
      {itemToArchive ? <ConfirmDialog title="Archivar catalogo" message={`Se archivara ${itemToArchive.titleLabel} y dejara de estar activo.`} confirmText="Archivar" confirmVariant="danger" onCancel={() => setItemToArchive(null)} onConfirm={handleArchive} /> : null}
      <CatalogQuickViewModal key={previewItem?.id ?? "catalog-preview"} open={Boolean(previewItem)} item={previewItem} onClose={() => setPreviewItem(null)} />
    </>
  );
}

function toolbarInputClass() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
}
