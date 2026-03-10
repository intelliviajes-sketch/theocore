"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Mail, Pencil, Plus, Power, Search, Trash2, Users } from "lucide-react";
import UserFormModal from "@/components/modals/UserFormModal";
import UserEditModal from "@/components/modals/UserEditModal";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import CrudPageShell from "@/components/intracore/CrudPageShell";
import { useToast } from "@/components/system/ToastProvider";
import { downloadCsv } from "@/lib/utils/csv";
import {
  type TeamRow,
  useGlobalTeam,
} from "@/hooks/theocore/useGlobalTeam";

const PAGE_SIZE = 10;
function toolbarInputClass() { return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"; }
function pageCount(total: number) { return Math.max(1, Math.ceil(total / PAGE_SIZE)); }

export default function GlobalTeamPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<false | { action: "toggle" | "delete"; user: TeamRow }>(false);
  const [resendUser, setResendUser] = useState<TeamRow | null>(null);
  const [selectedUser, setSelectedUser] = useState<TeamRow | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "AgencyOwner" | "TeamAgency">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pendiente" | "activo" | "desactivado">("all");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<null | "archive" | "activate">(null);
  const { success, error } = useToast();
  const { loading, team, agencies, loadTeam, toggleUser, deleteUser, resendInvite } = useGlobalTeam();

  useEffect(() => {
    setCurrentPage(1);
    setSelectedKeys([]);
  }, [agencyFilter, roleFilter, search, statusFilter]);

  function openEdit(user: TeamRow) {
    setSelectedUser(user);
    setIsEditOpen(true);
  }

  function rowKey(user: TeamRow) {
    return `${user.user_id}-${user.agency_id || 'global'}`;
  }

  async function handleConfirm() {
    if (!confirmOpen) return;
    const { action, user } = confirmOpen;

    try {
      if (action === "toggle") {
        await toggleUser(user);
      }
      if (action === "delete") {
        await deleteUser(user);
      }
      await loadTeam();
      success(action === "delete" ? "Usuario archivado." : "Estado actualizado.");
    } catch (actionError) {
      console.error(actionError);
      error("No se pudo completar la accion.");
    } finally {
      setConfirmOpen(false);
    }
  }

  async function handleResendInvite(user: TeamRow) {
    try {
      await resendInvite(user);
      success("Invitacion reenviada.");
    } catch (inviteError) {
      console.error(inviteError);
      error("No se pudo reenviar la invitacion.");
    }
  }

  const agencyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const agency of agencies) map.set(agency.id, agency.commercial_name || agency.legal_name || agency.id);
    return map;
  }, [agencies]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return team.filter((user) => {
      const matchesSearch = !term || [user.full_name, user.email, user.user_id, user.agency_id || ""].join(" ").toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status_display === statusFilter;
      const matchesAgency = agencyFilter === "all" || user.agency_id === agencyFilter;
      return matchesSearch && matchesRole && matchesStatus && matchesAgency;
    });
  }, [agencyFilter, roleFilter, search, statusFilter, team]);

  const totalPages = pageCount(filteredRows.length);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filteredRows, safePage]);
  const visibleKeys = paginatedRows.map(rowKey);
  const selectedRows = filteredRows.filter((user) => selectedKeys.includes(rowKey(user)));
  const selectedInactive = selectedRows.filter((user) => user.status_display === "desactivado");

  function toggleSelection(key: string) {
    setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function toggleSelectVisible() {
    const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.includes(key));
    setSelectedKeys((current) => allVisibleSelected ? current.filter((key) => !visibleKeys.includes(key)) : Array.from(new Set([...current, ...visibleKeys])));
  }

  async function handleBulkArchive() {
    try {
      for (const user of selectedRows) {
        await deleteUser(user);
      }
      await loadTeam();
      setSelectedKeys([]);
      setBulkAction(null);
      success("Usuarios archivados.");
    } catch (bulkError) {
      console.error(bulkError);
      error("No se pudieron archivar los usuarios seleccionados.");
    }
  }

  async function handleBulkActivate() {
    try {
      for (const user of selectedInactive) {
        await toggleUser(user);
      }
      await loadTeam();
      setSelectedKeys([]);
      setBulkAction(null);
      success("Usuarios activados.");
    } catch (bulkError) {
      console.error(bulkError);
      error("No se pudieron activar los usuarios seleccionados.");
    }
  }

  function handleExport() {
    downloadCsv(
      "theocore-global-team.csv",
      filteredRows.map((user) => ({
        nombre: user.full_name,
        email: user.email,
        rol: user.role,
        agencia: user.agency_id ? agencyNameById.get(user.agency_id) || user.agency_id : "Sin agencia",
        estado: user.status_display || "-",
        permisos: (user.permissions || []).join(" | "),
      }))
    );
    success("CSV de usuarios exportado.");
  }

  const toolbar = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por usuario, email o id" className={`${toolbarInputClass()} pl-11`} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:flex">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "all" | "AgencyOwner" | "TeamAgency")} className={toolbarInputClass()}>
            <option value="all">Todos los roles</option>
            <option value="AgencyOwner">AgencyOwner</option>
            <option value="TeamAgency">TeamAgency</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "pendiente" | "activo" | "desactivado")} className={toolbarInputClass()}>
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="activo">Activo</option>
            <option value="desactivado">Desactivado</option>
          </select>
          <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className={toolbarInputClass()}>
            <option value="all">Todas las agencias</option>
            {agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.commercial_name || agency.legal_name || agency.id}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span>{filteredRows.length} usuarios filtrados</span>
          <span>{selectedKeys.length} seleccionados</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:opacity-90 dark:bg-slate-800 dark:text-slate-200"><Download className="h-4 w-4" />Exportar CSV</button>
          <button onClick={() => setBulkAction("activate")} disabled={selectedInactive.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Power className="h-4 w-4" />Activar seleccionados</button>
          <button onClick={() => setBulkAction("archive")} disabled={selectedKeys.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Trash2 className="h-4 w-4" />Archivar seleccionados</button>
        </div>
      </div>
    </div>
  );

  const action = (
    <div className="flex flex-wrap gap-2">
      <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm"><Download className="h-4 w-4" />Exportar</button>
      <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"><Plus className="h-4 w-4" />Crear usuario</button>
    </div>
  );

  return (
    <>
      <CrudPageShell title="Global team" description="Gestion de usuarios internos con filtros, exportacion y acciones masivas sobre el equipo global." action={action} toolbar={toolbar}>
        {loading ? <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Cargando equipo global...</div> : filteredRows.length === 0 ? <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">No hay usuarios que coincidan con los filtros.</div> : <><div className="flex items-center justify-between px-6 py-4 text-sm text-slate-500 dark:text-slate-400"><span>{filteredRows.length} resultados</span><span>Pagina {safePage} de {totalPages}</span></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50/80 text-left text-slate-500 dark:bg-slate-800/60 dark:text-slate-300"><tr><th className="px-4 py-4 font-medium"><input type="checkbox" checked={visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.includes(key))} onChange={toggleSelectVisible} /></th><th className="px-6 py-4 font-medium">Usuario</th><th className="px-6 py-4 font-medium">Rol</th><th className="px-6 py-4 font-medium">Agencia</th><th className="px-6 py-4 font-medium">Estado</th><th className="px-6 py-4 font-medium">Acciones</th></tr></thead><tbody>{paginatedRows.map((user) => <tr key={rowKey(user)} className="border-t border-slate-200/70 dark:border-slate-800"><td className="px-4 py-4 align-top"><input type="checkbox" checked={selectedKeys.includes(rowKey(user))} onChange={() => toggleSelection(rowKey(user))} /></td><td className="px-6 py-4 align-top"><div className="flex items-start gap-3"><div className="rounded-2xl bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"><Users className="h-4 w-4" /></div><div><div className="font-medium text-slate-900 dark:text-slate-100">{user.full_name}</div><div className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Mail className="h-3.5 w-3.5" />{user.email}</div></div></div></td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{user.role}</td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{user.agency_id ? agencyNameById.get(user.agency_id) || user.agency_id : "Sin agencia"}</td><td className="px-6 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${user.status_display === "activo" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : user.status_display === "pendiente" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{user.status_display === "activo" ? "Activo" : user.status_display === "pendiente" ? "Pendiente" : "Desactivado"}</span></td><td className="px-6 py-4"><div className="flex flex-wrap gap-2">{user.status_display === "pendiente" ? <button onClick={() => setResendUser(user)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white"><Mail className="h-3.5 w-3.5" />Reenviar</button> : null}<button onClick={() => setConfirmOpen({ action: "toggle", user })} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-medium text-white"><Power className="h-3.5 w-3.5" />{user.status_display === "activo" ? "Desactivar" : "Activar"}</button><button onClick={() => openEdit(user)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white"><Pencil className="h-3.5 w-3.5" />Editar</button><button onClick={() => setConfirmOpen({ action: "delete", user })} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white"><Trash2 className="h-3.5 w-3.5" />Archivar</button></div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-200/70 px-6 py-4 dark:border-slate-800"><button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Anterior</button><button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Siguiente</button></div></>}
      </CrudPageShell>

      {isCreateOpen ? <UserFormModal mode="global" fixedRole={null} fixedAgency={null} onClose={() => setIsCreateOpen(false)} onCreated={async () => { setIsCreateOpen(false); await loadTeam(); success("Usuario creado."); }} /> : null}
      {isEditOpen && selectedUser ? <UserEditModal user={selectedUser} onClose={() => { setIsEditOpen(false); setSelectedUser(null); }} onUpdated={async () => { setIsEditOpen(false); setSelectedUser(null); await loadTeam(); success("Usuario actualizado."); }} /> : null}
      {confirmOpen ? <ConfirmDialog title={confirmOpen.action === "delete" ? "Archivar usuario" : "Cambiar estado del usuario"} message={confirmOpen.action === "delete" ? `Se archivara ${confirmOpen.user.full_name} y quedara desactivado en la agencia.` : `Se actualizara el estado de ${confirmOpen.user.full_name}.`} confirmText={confirmOpen.action === "delete" ? "Archivar" : "Confirmar"} confirmVariant={confirmOpen.action === "delete" ? "danger" : "primary"} onCancel={() => setConfirmOpen(false)} onConfirm={handleConfirm} /> : null}
      {resendUser ? <ConfirmDialog title="Reenviar invitacion" message={`Se reenviara la invitacion a ${resendUser.email}.`} confirmText="Reenviar" confirmVariant="primary" onCancel={() => setResendUser(null)} onConfirm={async () => { const current = resendUser; setResendUser(null); await handleResendInvite(current); }} /> : null}
      {bulkAction ? <ConfirmDialog title={bulkAction === "archive" ? "Archivar usuarios" : "Activar usuarios"} message={bulkAction === "archive" ? `Se archivaran ${selectedRows.length} usuarios seleccionados.` : `Se activaran ${selectedInactive.length} usuarios seleccionados.`} confirmText={bulkAction === "archive" ? "Archivar" : "Activar"} confirmVariant={bulkAction === "archive" ? "danger" : "primary"} onCancel={() => setBulkAction(null)} onConfirm={bulkAction === "archive" ? handleBulkArchive : handleBulkActivate} /> : null}
    </>
  );
}
