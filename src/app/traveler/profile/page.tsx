"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../AuthContext";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import JourneyHistoryMini from "../JourneyHistoryMini";

const TRAVEL_STYLE_OPTIONS = [
  "Cultural",
  "Aventura",
  "Relax",
  "Gastronomico",
  "Familiar",
  "Lujo",
];

type ProfileForm = {
  fullName: string;
  email: string;
  country: string;
  language: string;
  travelStyle: string[];
};

const INITIAL_FORM: ProfileForm = {
  fullName: "",
  email: "",
  country: "",
  language: "es",
  travelStyle: [],
};

export default function TravelerProfilePage() {
  const { user, onLoginRequest } = useAuth();
  const [form, setForm] = useState<ProfileForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(
    () => Boolean(form.fullName.trim() && form.email.trim()),
    [form.fullName, form.email],
  );

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("travelers")
          .select("full_name, email, country, language, travel_style")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;

        setForm({
          fullName: data?.full_name || user.name || "",
          email: data?.email || user.email || "",
          country: data?.country || "",
          language: data?.language || "es",
          travelStyle: Array.isArray(data?.travel_style)
            ? data.travel_style.filter((item): item is string => typeof item === "string")
            : [],
        });
      } catch (profileError) {
        console.error("Error cargando perfil traveler:", profileError);
        setForm((current) => ({
          ...current,
          fullName: user.name || "",
          email: user.email || "",
        }));
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, [user?.id, user?.email, user?.name]);

  function toggleStyle(style: string) {
    setForm((current) => {
      const next = current.travelStyle.includes(style)
        ? current.travelStyle.filter((item) => item !== style)
        : [...current.travelStyle, style];
      return { ...current, travelStyle: next };
    });
  }

  async function handleSave() {
    if (!user?.id || !canSave) return;
    setSaving(true);
    try {
      const payload = {
        id: user.id,
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        country: form.country.trim() || null,
        language: form.language.trim() || null,
        travel_style: form.travelStyle,
        active: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("travelers").upsert(payload, {
        onConflict: "id",
      });
      if (error) throw error;
      toast.success("Perfil actualizado.");
    } catch (saveError) {
      console.error("Error guardando perfil traveler:", saveError);
      toast.error("No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="trav-page">
        <div className="trav-container max-w-3xl">
          <div className="trav-panel p-6">
            <p className="trav-kicker">Perfil viajero</p>
            <h1 className="trav-title">Inicia sesion para continuar</h1>
            <p className="trav-subtitle">
              Necesitas una sesion activa para editar tu perfil de viajero.
            </p>
            <button
              type="button"
              onClick={onLoginRequest}
              className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Iniciar sesion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trav-page">
      <div className="trav-container max-w-3xl">
        <div className="trav-panel p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="trav-kicker">Perfil viajero</p>
            <h1 className="trav-title">Tu perfil</h1>
            <p className="trav-subtitle">
              Esta informacion ayuda a IVI a recomendar mejor tus opciones de viaje.
            </p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <UserRound className="h-5 w-5" />
          </span>
        </div>

        {loading ? (
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando perfil...
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Nombre completo</span>
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Email</span>
                <input
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Pais</span>
                <input
                  value={form.country}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, country: event.target.value }))
                  }
                  placeholder="Ej: ES"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Idioma preferido</span>
                <select
                  value={form.language}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, language: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                >
                  <option value="es">es</option>
                  <option value="en">en</option>
                  <option value="pt">pt</option>
                </select>
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Estilo de viaje</p>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_STYLE_OPTIONS.map((style) => {
                  const active = form.travelStyle.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleStyle(style)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}
      </div>

        <JourneyHistoryMini title="Historial del viajero" maxItems={4} />
      </div>
    </div>
  );
}
