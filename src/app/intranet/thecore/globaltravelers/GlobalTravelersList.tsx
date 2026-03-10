'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import GlobalTravelerPanel from './GlobalTravelerPanel';

export default function GlobalTravelersList() {
  const [travelers, setTravelers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser
      .from('travelers')
      .select(`
        id,
        full_name,
        email,
        created_at,
        agencies:agency_travelers (
          agency_id,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setTravelers(data || []);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* LISTADO */}
      <div className="space-y-3">
        {travelers.map(t => (
          <div
            key={t.id}
            onClick={() => setSelected(t)}
            className="p-4 bg-white border rounded-lg cursor-pointer hover:shadow"
          >
            <div className="font-medium">{t.full_name}</div>
            <div className="text-sm text-slate-500">{t.email}</div>
            <div className="text-xs text-slate-400">
              Agencias: {t.agencies?.length || 0}
            </div>
          </div>
        ))}
      </div>

      {/* PANEL */}
      <div className="md:col-span-2">
        {selected ? (
          <GlobalTravelerPanel traveler={selected} />
        ) : (
          <div className="text-slate-500 text-sm">
            Selecciona un traveler
          </div>
        )}
      </div>
    </div>
  );
}
