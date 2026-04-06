"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/components/system/ToastProvider";
import { validateTravelerForm } from "@/lib/validation/theocore";
import { createTravelerForAgency, findTravelerMatchByEmail } from "@/features/travelers/api";
import type { TravelerExistingMatch } from "@/features/travelers/types";

function inputClass(hasError?: boolean) {
  return `input ${hasError ? "border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500" : ""}`.trim();
}

export default function TravelerFormModal({
  open,
  onClose,
  onSaved,
  agencyId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  agencyId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [checkingMatch, setCheckingMatch] = useState(false);
  const [existingMatch, setExistingMatch] = useState<TravelerExistingMatch | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const { success, error } = useToast();

  const validation = useMemo(
    () => validateTravelerForm({ fullName: form.full_name, email: form.email, phone: form.phone }),
    [form.email, form.full_name, form.phone],
  );

  useEffect(() => {
    if (!open) {
      setExistingMatch(null);
      setCheckingMatch(false);
      setForm({ full_name: "", email: "", phone: "" });
    }
  }, [open]);

  if (!open) return null;

  const canSubmit = Object.keys(validation).length === 0;

  const checkExisting = async () => {
    const email = form.email.trim();
    if (!email || validation.email) {
      setExistingMatch(null);
      return;
    }
    setCheckingMatch(true);
    try {
      const match = await findTravelerMatchByEmail(email);
      setExistingMatch(match);
      if (match && !form.full_name.trim()) {
        setForm((current) => ({
          ...current,
          full_name: match.full_name || current.full_name,
          phone: current.phone || match.phone || "",
        }));
      }
    } catch (findError) {
      console.error(findError);
      setExistingMatch(null);
    } finally {
      setCheckingMatch(false);
    }
  };

  const save = async () => {
    if (!canSubmit) return;
    setSaving(true);

    try {
      await createTravelerForAgency(agencyId, {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });

      success(existingMatch ? "Traveler existente vinculado/actualizado en la agencia." : "Viajero vinculado a la agencia.");
      onSaved();
      onClose();
    } catch (saveError) {
      console.error(saveError);
      error(saveError instanceof Error ? saveError.message : "No se pudo guardar el viajero.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nuevo Traveler</h3>

        <div>
          <input
            className={inputClass(Boolean(validation.fullName))}
            placeholder="Nombre completo"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          {validation.fullName ? <p className="mt-1 text-xs text-rose-600">{validation.fullName}</p> : null}
        </div>

        <div>
          <input
            className={inputClass(Boolean(validation.email))}
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onBlur={() => void checkExisting()}
          />
          {validation.email ? <p className="mt-1 text-xs text-rose-600">{validation.email}</p> : null}
          {checkingMatch ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando coincidencias...
            </p>
          ) : null}
          {existingMatch ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <p className="inline-flex items-center gap-1 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Traveler ya existe
              </p>
              <p className="mt-1">{existingMatch.full_name} ({existingMatch.email})</p>
              <p className="mt-0.5">Vinculos actuales: {existingMatch.agency_links}</p>
              <p className="mt-1">Al guardar, se reutilizara este traveler en lugar de crear un duplicado.</p>
            </div>
          ) : null}
        </div>

        <div>
          <input
            className={inputClass(Boolean(validation.phone))}
            placeholder="Telefono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          {validation.phone ? <p className="mt-1 text-xs text-rose-600">{validation.phone}</p> : null}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancelar
          </button>
          <button onClick={() => void save()} className="btn-primary" disabled={!canSubmit || saving}>
            {saving ? "Guardando..." : existingMatch ? "Vincular traveler existente" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
