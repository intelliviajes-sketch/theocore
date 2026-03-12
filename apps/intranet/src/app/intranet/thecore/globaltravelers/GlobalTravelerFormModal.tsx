'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from '@/components/system/ToastProvider';

export default function GlobalTravelerFormModal() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
  });
  const { success, error } = useToast();

  const save = async () => {
    const { error: saveError } = await supabaseBrowser
      .from('travelers')
      .insert(form);

    if (saveError) {
      error(saveError.message);
      return;
    }

    success('Traveler global creado.');
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
      >
        + Nuevo traveler
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">
              Nuevo traveler global
            </h3>

            <input
              className="input"
              placeholder="Nombre completo"
              onChange={e =>
                setForm({ ...form, full_name: e.target.value })
              }
            />

            <input
              className="input"
              placeholder="Email"
              onChange={e =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setOpen(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                className="btn-primary"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
