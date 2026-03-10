"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2, Wrench, ChevronDown } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/system/ToastProvider";
import { validateUserForm } from "@/lib/validation/theocore";
import { listLiveAgencyTools } from "@/features/agency-tools/api";

type Agency = { id: string; commercial_name: string; legal_name: string };
type Tool = { tool_key: string; label: string };

interface UpdateUserPayload {
  full_name: string;
  email: string;
  role: "AgencyOwner" | "TeamAgency";
  agency_id: string | null;
  permissions: string[];
  active: boolean;
}

function inputClass(hasError?: boolean) {
  return `w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border ${hasError ? "border-rose-400 text-rose-900 dark:border-rose-500 dark:text-rose-100" : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"}`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{message}</p>;
}

export default function UserEditModal({
  user,
  onClose,
  onUpdated,
}: {
  user: {
    user_id: string;
    full_name: string;
    email: string;
    role: "AgencyOwner" | "TeamAgency";
    agency_id: string | null;
    permissions: string[] | null;
    active: boolean | null;
    email_confirmed_at?: string | null;
  };
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(user.full_name.split(" ")[0] || "");
  const [lastName, setLastName] = useState(user.full_name.split(" ").slice(1).join(" "));
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"AgencyOwner" | "TeamAgency">(user.role);
  const [agencyId, setAgencyId] = useState<string>(user.agency_id || "");
  const [active, setActive] = useState<boolean>(!!user.active);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>(user.permissions || []);
  const { error } = useToast();

  const fullName = useMemo(
    () => `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim(),
    [firstName, lastName],
  );

  const statusDisplay = useMemo(() => {
    if (!user.email_confirmed_at) return "Pendiente de activacion";
    if (user.active === false) return "Desactivado";
    return "Activo";
  }, [user.email_confirmed_at, user.active]);

  const validation = useMemo(
    () =>
      validateUserForm({
        firstName,
        lastName,
        email,
        role,
        mode: "global",
        selectedAgency: role === "TeamAgency" ? agencyId : undefined,
        selectedAgencies: role === "AgencyOwner" && agencyId ? [agencyId] : undefined,
      }),
    [agencyId, email, firstName, lastName, role],
  );

  useEffect(() => {
    (async () => {
      const { data: ags } = await supabase
        .from("agencies")
        .select("id, commercial_name, legal_name")
        .order("commercial_name", { ascending: true });
      setAgencies((ags as Agency[]) || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const data = await listLiveAgencyTools();
      setTools(data.map((tool) => ({ tool_key: tool.tool_key, label: tool.label })));
    })();
  }, []);

  function toggleTool(key: string) {
    setSelectedTools((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(validation).length > 0) return;

    setSaving(true);

    const payload: UpdateUserPayload = {
      full_name: fullName,
      email: email.trim(),
      role,
      agency_id: agencyId || null,
      permissions: role === "TeamAgency" ? selectedTools : [],
      active,
    };

    try {
      let query = supabase.from("agency_team").update(payload).eq("user_id", user.user_id);
      if (user.agency_id !== null) {
        query = query.eq("agency_id", user.agency_id);
      }
      const { error: updateError } = await query;
      if (updateError) {
        console.error("Error actualizando usuario:", updateError, payload);
        error("No se pudo guardar el usuario. Revisa permisos o datos.");
      } else {
        await onUpdated();
      }
    } catch (err) {
      console.error("Excepcion en actualizacion:", err);
      error("Ocurrio un error inesperado al actualizar el usuario.");
    }

    setSaving(false);
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          initial={{ scale: 0.94, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 16 }}
          className="w-full max-w-2xl rounded-2xl border border-white/20 bg-white/90 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-900/85"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Editar usuario</h2>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Estado actual: <strong>{statusDisplay}</strong>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Nombre</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass(Boolean(validation.firstName))} />
                <FieldError message={validation.firstName} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Apellido</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass(Boolean(validation.lastName))} />
                <FieldError message={validation.lastName} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Correo</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass(Boolean(validation.email))} />
                <FieldError message={validation.email} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Rol</label>
                <div className="relative">
                  <select value={role} onChange={(e) => setRole(e.target.value as "AgencyOwner" | "TeamAgency")} className={`${inputClass()} appearance-none pr-9`}>
                    <option value="AgencyOwner">AgencyOwner</option>
                    <option value="TeamAgency">TeamAgency</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Agencia</label>
              <div className="relative">
                <select value={agencyId} onChange={(e) => setAgencyId(e.target.value)} className={`${inputClass(Boolean(validation.selectedAgency || validation.selectedAgencies))} appearance-none pr-9`}>
                  <option value="">Selecciona una agencia</option>
                  {agencies.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.commercial_name || ag.legal_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={validation.selectedAgency || validation.selectedAgencies} />
            </div>

            {role === "TeamAgency" ? (
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Permisos</label>
                <div className="max-h-52 overflow-auto rounded-xl border border-slate-300 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                  {tools.map((tool) => (
                    <label key={tool.tool_key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700">
                      <input type="checkbox" checked={selectedTools.includes(tool.tool_key)} onChange={() => toggleTool(tool.tool_key)} className="h-4 w-4" />
                      <Wrench className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {tool.label} <span className="text-xs text-slate-500">({tool.tool_key})</span>
                      </span>
                    </label>
                  ))}
                  {tools.length === 0 ? <div className="px-2 py-1.5 text-sm text-slate-500">No hay herramientas activas.</div> : null}
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={active} onChange={() => setActive((prev) => !prev)} />
              <span className="text-sm text-slate-700 dark:text-slate-300">Activo</span>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="rounded-lg bg-slate-200 px-4 py-2 text-slate-800 hover:opacity-90 dark:bg-slate-800 dark:text-slate-200">
                Cancelar
              </button>
              <button type="submit" disabled={Object.keys(validation).length > 0 || saving} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
