"use client";

import { useState } from "react";
import { BellRing, Save } from "lucide-react";
import toast from "react-hot-toast";
import {
  isNativeRuntime,
  scheduleTravelerTestNotification,
} from "@/lib/mobile/local-notifications";
import {
  normalizeTravelerPreferences,
  readTravelerPreferences,
  writeTravelerPreferences,
  type TravelerPreferencesState,
} from "@/lib/traveler/preferences";

export default function TravelerPreferencesPage() {
  const [prefs, setPrefs] = useState<TravelerPreferencesState>(readTravelerPreferences);
  const [sendingTestNotification, setSendingTestNotification] = useState(false);

  function updatePref<K extends keyof TravelerPreferencesState>(
    key: K,
    value: TravelerPreferencesState[K],
  ) {
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  function savePreferences() {
    try {
      const normalized = normalizeTravelerPreferences(prefs);
      writeTravelerPreferences(normalized);
      setPrefs(normalized);
      toast.success("Preferencias guardadas.");
    } catch {
      toast.error("No se pudieron guardar las preferencias.");
    }
  }

  async function sendTestNotification() {
    setSendingTestNotification(true);
    const result = await scheduleTravelerTestNotification();
    setSendingTestNotification(false);

    if (result.ok) {
      toast.success("Notificacion programada. Revisa tu movil en 5 segundos.");
      return;
    }

    if (result.reason === "not_native") {
      toast("Solo disponible dentro de la APK (Android/iOS).");
      return;
    }

    if (result.reason === "permission_denied") {
      toast.error("Permiso de notificaciones denegado en el dispositivo.");
      return;
    }

    console.error("Error enviando notificacion local:", result.error);
    toast.error("No se pudo enviar la notificacion de prueba.");
  }

  return (
    <div className="trav-page">
      <div className="trav-container max-w-3xl">
        <div className="trav-panel p-6 shadow-sm sm:p-8">
          <p className="trav-kicker">Preferencias</p>
          <h1 className="trav-title">Ajustes de experiencia</h1>
          <p className="trav-subtitle">
            Controla como quieres que IVI se comporte contigo.
          </p>

          <div className="mt-6 space-y-4">
            <PreferenceRow
              title="Personalizacion IA"
              description="Permite recomendaciones ajustadas a tu historial y estilo."
              checked={prefs.aiPersonalization}
              onChange={(checked) => updatePref("aiPersonalization", checked)}
            />
            <PreferenceRow
              title="Emails de ofertas"
              description="Recibir novedades y campanas de productos."
              checked={prefs.marketingEmails}
              onChange={(checked) => updatePref("marketingEmails", checked)}
            />
            <PreferenceRow
              title="Alertas instantaneas"
              description="Avisos de cambios importantes y oportunidades de precio."
              checked={prefs.instantAlerts}
              onChange={(checked) => updatePref("instantAlerts", checked)}
            />

            <button
              type="button"
              onClick={savePreferences}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              <Save className="h-4 w-4" />
              Guardar preferencias
            </button>

            <button
              type="button"
              onClick={sendTestNotification}
              disabled={sendingTestNotification}
              className="ml-2 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BellRing className="h-4 w-4" />
              {sendingTestNotification ? "Enviando prueba..." : "Notificacion de prueba"}
            </button>

            {!isNativeRuntime() ? (
              <p className="text-xs text-slate-500">
                En navegador no se dispara local notification nativa. Pruebalo desde la APK.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferenceRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-xs text-slate-600">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500"
      />
    </label>
  );
}
