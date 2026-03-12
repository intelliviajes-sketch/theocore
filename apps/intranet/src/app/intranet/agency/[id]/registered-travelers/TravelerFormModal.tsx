'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/system/ToastProvider';
import { validateTravelerForm } from '@/lib/validation/theocore';
import { createTravelerForAgency } from '@/features/travelers/api';

function inputClass(hasError?: boolean) {
  return `input ${hasError ? 'border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500' : ''}`.trim();
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
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const { success, error } = useToast();

  const validation = useMemo(
    () => validateTravelerForm({ fullName: form.full_name, email: form.email, phone: form.phone }),
    [form.email, form.full_name, form.phone]
  );

  if (!open) return null;

  const canSubmit = Object.keys(validation).length === 0;

  const save = async () => {
    if (!canSubmit) return;
    setSaving(true);

    try {
      await createTravelerForAgency(agencyId, {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });

      success('Viajero vinculado a la agencia.');
      onSaved();
      onClose();
    } catch (saveError) {
      console.error(saveError);
      error(saveError instanceof Error ? saveError.message : 'No se pudo guardar el viajero.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6">
        <h3 className="text-lg font-semibold">Nuevo Traveler</h3>

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
          />
          {validation.email ? <p className="mt-1 text-xs text-rose-600">{validation.email}</p> : null}
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
          <button onClick={save} className="btn-primary" disabled={!canSubmit || saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
