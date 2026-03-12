"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import EntityWorkspace from "@/components/system/EntityWorkspace";
import UserFormModal from "@/components/modals/UserFormModal";
import UserEditModal from "@/components/modals/UserEditModal";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";

type TeamRow = {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "AgencyOwner" | "TeamAgency";
  agency_id: string;
  permissions: string[] | null;
  active: boolean | null;
};

export default function AgencyTeamPage() {
  const params = useParams<{ id: string }>();
  const agencyId = params.id;

  const [team, setTeam] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<false | { action: "toggle" | "delete"; user: TeamRow }>(false);

  const loadTeam = useCallback(async () => {
    if (!agencyId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("agency_team")
      .select("user_id, full_name, email, phone, role, agency_id, permissions, active")
      .eq("agency_id", agencyId)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error cargando el equipo de agencia:", error);
      setTeam([]);
      setSelectedUser(null);
      setLoading(false);
      return;
    }

    const rows = (data as TeamRow[]) || [];
    setTeam(rows);
    setSelectedUser((current) => {
      if (!current) return rows[0] ?? null;
      return rows.find((row) => row.user_id === current.user_id) ?? rows[0] ?? null;
    });
    setLoading(false);
  }, [agencyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTeam();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTeam]);

  const summary = useMemo(
    () => [
      { label: "Total", value: team.length },
      { label: "Activos", value: team.filter((member) => member.active).length },
      { label: "Pendientes / inactivos", value: team.filter((member) => !member.active).length },
    ],
    [team],
  );

  async function handleConfirm() {
    if (!confirmOpen) return;

    const { action, user } = confirmOpen;

    if (action === "toggle") {
      const { error } = await supabase
        .from("agency_team")
        .update({ active: !user.active })
        .eq("user_id", user.user_id)
        .eq("agency_id", user.agency_id);

      if (error) console.error("Error cambiando estado del usuario:", error);
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("agency_team")
        .delete()
        .eq("user_id", user.user_id)
        .eq("agency_id", user.agency_id);

      if (error) console.error("Error eliminando usuario de agencia:", error);
    }

    setConfirmOpen(false);
    await loadTeam();
  }

  const listPane = loading ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      Cargando equipo...
    </div>
  ) : team.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      No hay colaboradores registrados para esta agencia.
    </div>
  ) : (
    team.map((user) => (
      <button
        key={user.user_id}
        type="button"
        onClick={() => setSelectedUser(user)}
        className={`w-full rounded-2xl border bg-white p-4 text-left transition hover:shadow ${
          selectedUser?.user_id === user.user_id ? "border-cyan-400 shadow-md ring-2 ring-cyan-100" : "border-slate-200"
        }`}
      >
        <div className="font-medium text-slate-800">{user.full_name}</div>
        <div className="mt-1 text-sm text-slate-500">{user.email}</div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
          <span>{user.role}</span>
          <span>{user.active ? "Activo" : "Pendiente / inactivo"}</span>
        </div>
      </button>
    ))
  );

  const detailPane = selectedUser ? (
    <TeamMemberPanel
      user={selectedUser}
      onEdit={() => setEditOpen(true)}
      onToggle={() => setConfirmOpen({ action: "toggle", user: selectedUser })}
      onDelete={() => setConfirmOpen({ action: "delete", user: selectedUser })}
    />
  ) : (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      Selecciona un colaborador para ver su ficha operativa.
    </div>
  );

  return (
    <div className="p-6">
      <EntityWorkspace
        title="Empleados de la agencia"
        subtitle="Gestiona colaboradores, permisos y estado operativo del equipo."
        actionLabel="+ Anadir colaborador"
        onAction={() => setCreateOpen(true)}
        summary={summary}
        listPane={listPane}
        detailPane={detailPane}
      />

      {createOpen ? (
        <UserFormModal
          mode="agency"
          fixedRole="TeamAgency"
          fixedAgency={agencyId}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await loadTeam();
          }}
        />
      ) : null}

      {editOpen && selectedUser ? (
        <UserEditModal
          user={selectedUser}
          onClose={() => {
            setEditOpen(false);
          }}
          onUpdated={async () => {
            setEditOpen(false);
            await loadTeam();
          }}
        />
      ) : null}

      {confirmOpen ? (
        <ConfirmDialog
          title={confirmOpen.action === "delete" ? "Eliminar usuario" : "Cambiar estado"}
          message={
            confirmOpen.action === "delete"
              ? "Se eliminara este colaborador de la agencia."
              : "Se actualizara el estado activo del colaborador."
          }
          confirmText={confirmOpen.action === "delete" ? "Eliminar" : "Confirmar"}
          confirmVariant={confirmOpen.action === "delete" ? "danger" : "primary"}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
        />
      ) : null}
    </div>
  );
}

function TeamMemberPanel({
  user,
  onEdit,
  onToggle,
  onDelete,
}: {
  user: TeamRow;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{user.full_name}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ficha operativa del colaborador dentro de la agencia.</p>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Info label="Correo" value={user.email} />
        <Info label="Telefono" value={user.phone || "-"} />
        <Info label="Rol" value={user.role} />
        <Info label="Estado" value={user.active ? "Activo" : "Pendiente / inactivo"} />
        <Info label="Permisos" value={user.role === "AgencyOwner" ? "Control total" : user.permissions?.length ? user.permissions.join(", ") : "Sin permisos especificos"} />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button onClick={onEdit} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Editar</button>
        <button onClick={onToggle} className={`rounded-xl px-3 py-2 text-sm font-medium text-white hover:opacity-90 ${user.active ? "bg-amber-600" : "bg-emerald-600"}`}>
          {user.active ? "Desactivar" : "Activar"}
        </button>
        <button onClick={onDelete} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Eliminar</button>
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
