"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  UserCog,
  Wrench,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { validateUserForm } from "@/lib/validation/theocore";
import { listLiveAgencyTools } from "@/features/agency-tools/api";

type Mode = "global" | "agency";
type RoleOpt = "AgencyOwner" | "TeamAgency";

type Agency = { id: string; commercial_name: string; legal_name: string };
type Tool = {
  id: string;
  tool_key: string;
  label: string;
  path: string;
  icon: string | null;
  active: boolean | null;
};

export default function UserFormModal({
  mode,
  fixedRole = null,
  fixedAgency = null,
  onClose,
  onCreated,
}: {
  mode: Mode;
  fixedRole?: RoleOpt | null;
  fixedAgency?: string | null;
  onClose: () => void;
  onCreated?: (payload: { user_id: string; role: RoleOpt }) => void;
}) {
  const params = useParams();
  const agencyIdFromUrl = mode === "agency" ? String(params?.id ?? "") : null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<RoleOpt>(fixedRole ?? (mode === "global" ? "AgencyOwner" : "TeamAgency"));
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>();
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const currentAgencyId =
    mode === "agency"
      ? (fixedAgency || agencyIdFromUrl || "")
      : role === "TeamAgency"
        ? selectedAgency
        : "";

  useEffect(() => {
    (async () => {
      if (mode !== "global") return;
      const { data, error: loadError } = await supabase
        .from("agencies")
        .select("id,commercial_name,legal_name")
        .order("commercial_name", { ascending: true });

      if (loadError) {
        console.error("Error loading agencies:", loadError);
        return;
      }
      setAgencies((data as Agency[]) || []);
    })();
  }, [mode]);

  useEffect(() => {
    (async () => {
      if (mode === "global" && role === "AgencyOwner") {
        setTools([]);
        setSelectedTools([]);
        return;
      }

      if (role === "TeamAgency" || mode === "agency") {
        const data = await listLiveAgencyTools();
        setTools(data.map((tool) => ({
          id: tool.id,
          tool_key: tool.tool_key,
          label: tool.label,
          path: tool.path,
          icon: tool.icon,
          active: tool.active,
        })));
      }
    })();
  }, [mode, role]);

  const fullName = useMemo(
    () => `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim(),
    [firstName, lastName],
  );

  function toggleAgency(id: string) {
    setSelectedAgencies((prev = []) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleTool(key: string) {
    setSelectedTools((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }

  const validation = useMemo(
    () =>
      validateUserForm({
        firstName,
        lastName,
        email,
        phone,
        role,
        mode,
        selectedAgency,
        selectedAgencies,
        currentAgencyId,
      }),
    [currentAgencyId, email, firstName, lastName, mode, phone, role, selectedAgency, selectedAgencies],
  );

  const canSubmit = Object.keys(validation).length === 0;

  const header = useMemo(() => {
    if (mode === "agency") {
      return {
        title: "Agregar colaborador a tu agencia",
        subtitle: "Invita a un miembro operativo. Tendra acceso solo a las herramientas seleccionadas.",
        Icon: UserCog,
      };
    }
    if (role === "AgencyOwner") {
      return {
        title: "Crear administrador de agencia",
        subtitle: "Este usuario podra gestionar una o varias agencias en nombre de TheoCore.",
        Icon: ShieldCheck,
      };
    }
    return {
      title: "Crear colaborador de agencia",
      subtitle: "Acceso limitado a las herramientas que selecciones para la agencia.",
      Icon: UserCog,
    };
  }, [mode, role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError(Object.values(validation)[0] || "Revisa los datos del formulario.");
      return;
    }
    setError(null);

    try {
      setSaving(true);

      const meta: Record<string, unknown> = {
        full_name: fullName,
        phone: phone || undefined,
        role,
      };

      if (role === "TeamAgency" && mode === "global") {
        const agency = agencies.find((item) => item.id === currentAgencyId);
        if (agency) {
          meta.agency_name = agency.commercial_name || agency.legal_name || undefined;
        }
      }

      const inviteRes = await fetch("/api/admin/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          meta,
          redirectTo: `${window.location.origin}/intranet/auth/activate`,
        }),
      });
      if (!inviteRes.ok) {
        const message = await inviteRes.text();
        throw new Error(message || "No se pudo enviar la invitacion.");
      }
      const { user_id } = await inviteRes.json();
      if (!user_id) throw new Error("No se obtuvo user_id de la invitacion.");

      if (mode === "global") {
        if (role === "AgencyOwner") {
          const rows = (selectedAgencies ?? []).map((agencyId) => ({
            agency_id: agencyId,
            user_id,
            full_name: fullName,
            email,
            phone: phone || null,
            role: "AgencyOwner" as const,
            permissions: [] as string[],
            active: false,
          }));
          const { error: insertError } = await supabase.from("agency_team").insert(rows);
          if (insertError) throw insertError;
        } else {
          const { error: insertError } = await supabase.from("agency_team").insert([
            {
              agency_id: currentAgencyId,
              user_id,
              full_name: fullName,
              email,
              phone: phone || null,
              role: "TeamAgency" as const,
              permissions: selectedTools,
              active: false,
            },
          ]);
          if (insertError) throw insertError;
        }
      } else {
        const { error: insertError } = await supabase.from("agency_team").insert([
          {
            agency_id: currentAgencyId,
            user_id,
            full_name: fullName,
            email,
            phone: phone || null,
            role: "TeamAgency" as const,
            permissions: selectedTools,
            active: false,
          },
        ]);
        if (insertError) throw insertError;
      }

      setDone(true);
      onCreated?.({ user_id, role });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Error al crear el usuario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.94, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 16 }}
          className="w-full max-w-2xl rounded-2xl border border-white/20 bg-white/90 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-900/85"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 p-2 text-white">
                <header.Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {header.title} {mode === "global" ? "(TheoCoreOwner)" : "(AgencyOwner)"}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">{header.subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Nombre</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" placeholder="Nombre" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Apellido</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" placeholder="Apellido" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Correo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-100 py-2 pl-9 pr-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" placeholder="usuario@dominio.com" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Telefono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-100 py-2 pl-9 pr-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" placeholder="+34 600 000 000" />
                </div>
              </div>
            </div>

            {mode === "global" ? (
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Rol</label>
                <div className="relative">
                  <select value={role} onChange={(e) => setRole(e.target.value as RoleOpt)} className="w-full appearance-none rounded-xl border border-slate-300 bg-slate-100 py-2 pl-3 pr-9 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <option value="AgencyOwner">AgencyOwner</option>
                    <option value="TeamAgency">TeamAgency</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/20 bg-white/60 p-3 text-sm dark:border-white/10 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <UserCog className="h-4 w-4" />
                  Rol: <strong>TeamAgency</strong> (fijo en modo AgencyOwner)
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Agencia actual: <code>{currentAgencyId || "(sin id)"}</code>
                </div>
              </div>
            )}

            {mode === "global" && role === "AgencyOwner" ? (
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Agencias (puedes elegir varias)</label>
                <div className="max-h-44 overflow-auto rounded-xl border border-slate-300 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                  {agencies.map((agency) => (
                    <label key={agency.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700">
                      <input type="checkbox" checked={(selectedAgencies ?? []).includes(agency.id)} onChange={() => toggleAgency(agency.id)} className="h-4 w-4" />
                      <Building2 className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{agency.commercial_name || agency.legal_name || agency.id}</span>
                    </label>
                  ))}
                  {agencies.length === 0 ? <div className="px-2 py-1.5 text-sm text-slate-500">No hay agencias registradas.</div> : null}
                </div>
              </div>
            ) : null}

            {mode === "global" && role === "TeamAgency" ? (
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Agencia</label>
                <div className="relative">
                  <select value={selectedAgency} onChange={(e) => setSelectedAgency(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-300 bg-slate-100 py-2 pl-3 pr-9 dark:border-slate-700 dark:bg-slate-800">
                    <option value="">Selecciona una agencia</option>
                    {agencies.map((agency) => (
                      <option key={agency.id} value={agency.id}>
                        {agency.commercial_name || agency.legal_name || agency.id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            ) : null}

            {role === "TeamAgency" ? (
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Herramientas (para TeamAgency)</label>
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

            {error ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200/60 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-900/20">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="rounded-lg bg-slate-200 px-4 py-2 text-slate-800 hover:opacity-90 dark:bg-slate-800 dark:text-slate-200">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? "Creando..." : "Crear usuario e invitar"}
              </button>
            </div>

            <AnimatePresence>
              {done ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mt-4 rounded-xl border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                >
                  Usuario creado e invitacion enviada correctamente.
                </motion.div>
              ) : null}
            </AnimatePresence>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
