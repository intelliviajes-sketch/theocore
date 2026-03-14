"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Loader2, Save, Sparkles, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { useAuth } from "../AuthContext";
import { useTenant } from "@/contexts/tenant";
import { useTravelerCatalog } from "@/contexts/traveler-catalog";
import { getTenantBrandName } from "@/lib/tenant/presentation";
import { useToast } from "@/components/system/ToastProvider";
import { guessLang, type Brain } from "./types-and-utils";
import TravelerWorkspaceLayout from "../TravelerWorkspaceLayout";
import { useTravelerWorkspace } from "../TravelerWorkspaceContext";
import TravelerSalesSidebar from "../TravelerSalesSidebar";
import { loadBrainsForTenant } from "@/lib/traveler/brains";
import { normalizeAssistantOutput } from "@/lib/traveler/assistant-output";
import { trackTravelerEvent } from "@/lib/traveler/tracking";

type ProductType = {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  owner_agency_id: string | null;
  current_version: number;
};

type ProductField = {
  id: string;
  field_name: string;
  label: string;
  input_type: string;
  required: boolean;
  placeholder: string | null;
  options: { label?: string; value?: string }[] | string[] | null;
};

type ProductTypeVersion = {
  id: string;
  version_number: number;
};

type PreviewModel = {
  title: string;
  summary: string;
  fields: Record<string, unknown>;
  ai: {
    generated_summary: string;
    validation_notes: string[];
  };
};

const DEFAULT_STATUS = "draft";
const PANEL_CLASS = "rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur";
const INPUT_CLASS =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50";
const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

function slugToLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInputType(inputType: string) {
  switch (inputType) {
    case "number":
    case "integer":
    case "currency":
      return "number";
    case "date":
      return "date";
    case "datetime":
      return "datetime-local";
    case "time":
      return "time";
    case "url":
      return "url";
    default:
      return "text";
  }
}

function normalizeOptions(options: ProductField["options"]) {
  if (!options) return [] as { label: string; value: string }[];
  return options.map((item) => {
    if (typeof item === "string") {
      return { label: item, value: item };
    }
    return {
      label: item.label || item.value || "Opcion",
      value: item.value || item.label || "opcion",
    };
  });
}

function getFieldDisplayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function computePreview(selectedType: ProductType | null, formData: Record<string, unknown>, generatedSummary: string, validationNotes: string[]): PreviewModel {
  const titleCandidates = ["title", "nombre", "name", "product_name"];
  const summaryCandidates = ["summary", "description", "descripcion", "overview"];

  const title = titleCandidates.map((key) => formData[key]).find((value) => typeof value === "string" && value.trim()) as string | undefined;
  const summary = summaryCandidates.map((key) => formData[key]).find((value) => typeof value === "string" && value.trim()) as string | undefined;

  return {
    title: title || selectedType?.name || "Producto en construccion",
    summary: generatedSummary || summary || "Todavia no hay resumen generado para este producto.",
    fields: formData,
    ai: {
      generated_summary: generatedSummary,
      validation_notes: validationNotes,
    },
  };
}

function pickBestPlanningBrain(brains: Brain[], preferredBrainId: string | null | undefined) {
  if (preferredBrainId) {
    const preferred = brains.find((brain) => brain.id === preferredBrainId);
    if (preferred) return preferred;
  }

  return (
    brains.find((brain) => brain.brain_type === "planifica")
    ?? brains.find((brain) => brain.brain_type === "acompana")
    ?? brains[0]
    ?? null
  );
}

export default function TravelerPlanningPage() {
  const { user: authUser, onLoginRequest } = useAuth();
  const tenant = useTenant();
  const { reload: reloadCatalog, featured } = useTravelerCatalog();
  const { success, error: showError, info } = useToast();
  const brandName = getTenantBrandName(tenant);
  const {
    planningState,
    updatePlanningState,
    markPlanningSaved,
    setInsightFromAiText,
    markPlanningStarted,
  } = useTravelerWorkspace();
  const pushPlanningStateUpdate = useEffectEvent(updatePlanningState);

  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [fields, setFields] = useState<ProductField[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState(planningState.selectedTypeId);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(planningState.selectedVersionId);
  const [formData, setFormData] = useState<Record<string, unknown>>(planningState.formData);
  const [brains, setBrains] = useState<Brain[]>([]);
  const [activeBrainId, setActiveBrainId] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState(planningState.generatedSummary);
  const [assistantNotes, setAssistantNotes] = useState<string[]>(planningState.assistantNotes);
  const [assistantReply, setAssistantReply] = useState(planningState.assistantReply);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningAI, setRunningAI] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(planningState.draftId);
  const previousTypeIdRef = useRef<string>(planningState.selectedTypeId || "");

  const selectedType = useMemo(
    () => productTypes.find((item) => item.id === selectedTypeId) || null,
    [productTypes, selectedTypeId],
  );

  const activeBrain = useMemo(
    () => brains.find((item) => item.id === activeBrainId) || null,
    [brains, activeBrainId],
  );

  const requiredMissing = useMemo(
    () => fields.filter((field) => field.required && !getFieldDisplayValue(formData[field.field_name]).trim()),
    [fields, formData],
  );

  const preview = useMemo(
    () => computePreview(selectedType, formData, generatedSummary, assistantNotes),
    [selectedType, formData, generatedSummary, assistantNotes],
  );

  useEffect(() => {
    trackTravelerEvent("start_planning", {
      tenantKind: tenant.kind,
      agencyId: tenant.agency?.id ?? null,
    });
    markPlanningStarted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pushPlanningStateUpdate({
      selectedTypeId,
      selectedVersionId,
      formData,
      generatedSummary,
      assistantNotes,
      assistantReply,
      draftId,
    });
  }, [
    assistantNotes,
    assistantReply,
    draftId,
    formData,
    generatedSummary,
    selectedTypeId,
    selectedVersionId,
  ]);

  useEffect(() => {
    (async () => {
      setLoadingTypes(true);
      try {
        const { data, error } = await supabase
          .from("product_types")
          .select("id, name, description, scope, owner_agency_id, current_version")
          .eq("active", true)
          .order("name", { ascending: true });

        if (error) throw error;

        const filtered = ((data ?? []) as ProductType[]).filter((item) => {
          if (item.scope === "global") return true;
          return tenant.agency?.id && item.owner_agency_id === tenant.agency.id;
        });

        setProductTypes(filtered);
      } catch (loadError) {
        console.error("Error cargando tipos de producto:", loadError);
        showError("No se pudieron cargar los tipos de producto.");
      } finally {
        setLoadingTypes(false);
      }
    })();
  }, [tenant.agency?.id, showError]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const agencyId = tenant.kind === "agency" ? tenant.agency?.id ?? null : null;
      const list = (await loadBrainsForTenant(agencyId)) as Brain[];
      if (cancelled) return;
      setBrains(list);
      const nextBrain = pickBestPlanningBrain(list, tenant.market?.defaultBrainId);
      setActiveBrainId(nextBrain?.id ?? null);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [tenant.kind, tenant.agency?.id, tenant.market?.defaultBrainId]);

  useEffect(() => {
    if (!selectedType) {
      setFields([]);
      setSelectedVersionId(null);
      setFormData({});
      setGeneratedSummary("");
      setAssistantNotes([]);
      setAssistantReply("");
      setDraftId(null);
      return;
    }

    (async () => {
      setLoadingFields(true);
      try {
        const [fieldsResponse, versionResponse] = await Promise.all([
          fetch(`/api/product-types/${selectedType.id}/fields`),
          supabase
            .from("product_type_versions")
            .select("id, version_number")
            .eq("product_type_id", selectedType.id)
            .eq("version_number", selectedType.current_version)
            .single(),
        ]);

        const fieldsPayload = await fieldsResponse.json();
        if (!fieldsResponse.ok) {
          throw new Error(fieldsPayload.error || "No se pudieron cargar los campos.");
        }
        if (versionResponse.error) throw versionResponse.error;

        setFields((fieldsPayload.fields ?? []) as ProductField[]);
        const resolvedVersionId = (versionResponse.data as ProductTypeVersion | null)?.id ?? null;
        setSelectedVersionId(resolvedVersionId);

        const initialData = (fieldsPayload.fields ?? []).reduce((acc: Record<string, unknown>, field: ProductField) => {
          acc[field.field_name] = field.input_type === "multiselect" ? [] : field.input_type === "boolean" || field.input_type === "checkbox" ? false : "";
          return acc;
        }, {});

        const typeChanged = Boolean(previousTypeIdRef.current) && previousTypeIdRef.current !== selectedType.id;
        previousTypeIdRef.current = selectedType.id;

        setFormData((current) => {
          if (!typeChanged && Object.keys(current).length > 0) {
            return { ...initialData, ...current };
          }
          return initialData;
        });

        if (typeChanged) {
          setGeneratedSummary("");
          setAssistantNotes([]);
          setAssistantReply("");
          setDraftId(null);
        }
      } catch (loadError) {
        console.error("Error cargando campos de planning:", loadError);
        showError("No se pudo cargar la estructura del producto.");
      } finally {
        setLoadingFields(false);
      }
    })();
  }, [selectedType, showError]);

  function updateField(field: ProductField, value: unknown) {
    setFormData((current) => ({ ...current, [field.field_name]: value }));
  }

  function renderField(field: ProductField) {
    const value = formData[field.field_name];
    const options = normalizeOptions(field.options);

    if (field.input_type === "textarea") {
      return (
        <textarea
          value={String(value ?? "")}
          onChange={(event) => updateField(field, event.target.value)}
          placeholder={field.placeholder || `Completa ${field.label.toLowerCase()}`}
          className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
      );
    }

    if (field.input_type === "select" || field.input_type === "radio") {
      return (
        <select
          value={String(value ?? "")}
          onChange={(event) => updateField(field, event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        >
          <option value="">Selecciona una opcion</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }

    if (field.input_type === "multiselect") {
      const currentValue = Array.isArray(value) ? value.map((item) => String(item)) : [];
      return (
        <select
          multiple
          value={currentValue}
          onChange={(event) => updateField(field, Array.from(event.target.selectedOptions).map((option) => option.value))}
          className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }

    if (field.input_type === "boolean" || field.input_type === "checkbox") {
      return (
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => updateField(field, event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Marcar como activo/aplicable</span>
        </label>
      );
    }

    return (
      <input
        type={getInputType(field.input_type)}
        value={String(value ?? "")}
        onChange={(event) => updateField(field, event.target.value)}
        placeholder={field.placeholder || `Completa ${field.label.toLowerCase()}`}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    );
  }

  async function runPlanningAssistant(mode: "summary" | "review") {
    if (!selectedType || !activeBrain) {
      showError("Selecciona un tipo de producto y un brain activo.");
      return;
    }

    setRunningAI(true);
    try {
      const lang = tenant.market?.languageCode || guessLang();
      const payload = JSON.stringify(formData, null, 2);
      const instruction = mode === "summary"
        ? `Genera un resumen comercial breve y claro para un producto de tipo ${selectedType.name}. Usa idioma ${lang}. Si faltan datos, dilo de forma util.`
        : `Revisa este formulario de producto tipo ${selectedType.name}. Devuelve observaciones concretas sobre datos faltantes, inconsistencias o mejoras. Usa idioma ${lang}.`;

      const systemMessage = {
        role: "system" as const,
        content: `${instruction} CONTEXT: ${activeBrain.strategic_concept || "Eres un asistente experto en producto turistico."}`,
      };

      const userMessage = {
        role: "user" as const,
        content: `Tipo de producto: ${selectedType.name}\nMarca: ${brandName}\nDatos del formulario:\n${payload}`,
      };

      const response = await fetch("/api/chat?stream=0", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: activeBrain.model || "gemini-flash-lite-latest",
          brain: activeBrain,
          stream: false,
          messages: [systemMessage, userMessage],
        }),
      });

      const result = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        const apiError = typeof result.error === "string" ? result.error : "No se pudo generar respuesta con IA.";
        throw new Error(apiError);
      }

      const reply = normalizeAssistantOutput(result.reply);

      if (!reply) {
        showError("La IA no devolvio contenido util.");
        return;
      }

      setAssistantReply(reply);
      setInsightFromAiText(reply, featured);
      if (mode === "summary") {
        setGeneratedSummary(reply);
        success("Resumen generado con IA.");
      } else {
        const notes = reply.split(/\n+/).map((item) => item.replace(/^[-•\d.\s]+/, "").trim()).filter(Boolean);
        setAssistantNotes(notes.length > 0 ? notes : [reply]);
        info("Revision de planning generada.");
      }
    } catch (assistantError) {
      console.error("Error ejecutando planning assistant:", assistantError);
      showError("No se pudo ejecutar la ayuda IA.");
    } finally {
      setRunningAI(false);
    }
  }

  async function handleSaveDraft() {
    if (!tenant.agency?.id) {
      showError("Este planning solo puede guardar borradores en un portal de agencia.");
      return;
    }
    if (!authUser?.id) {
      showError("Debes iniciar sesion para guardar un borrador.");
      onLoginRequest();
      return;
    }
    if (!selectedType || !selectedVersionId) {
      showError("Selecciona un tipo de producto valido.");
      return;
    }

    setSaving(true);
    try {
      let savedDraftId = draftId;
      const payload = {
        agency_id: tenant.agency.id,
        country_code: tenant.market?.countryCode ?? null,
        created_by: authUser.id,
        status: DEFAULT_STATUS,
        product_type_id: selectedType.id,
        product_type_version_id: selectedVersionId,
        source_name: preview.title,
        source_ai_brain_id: activeBrain?.id ?? null,
        data: preview,
        raw_ai_output: assistantReply ? { assistantReply, validationNotes: assistantNotes } : null,
      };

      if (draftId) {
        const { error } = await supabase.from("catalog_global").update(payload).eq("id", draftId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("catalog_global").insert(payload).select("id").single();
        if (error) throw error;
        savedDraftId = data.id;
        setDraftId(data.id);
      }

      await reloadCatalog();
      markPlanningSaved(savedDraftId ?? undefined);
      trackTravelerEvent("save_draft", {
        draftId: savedDraftId ?? null,
        typeId: selectedType.id,
      });
      success("Borrador guardado en catalogo global.");
    } catch (saveError) {
      console.error("Error guardando borrador de planning:", saveError);
      showError("No se pudo guardar el borrador.");
    } finally {
      setSaving(false);
    }
  }

  const requiredTotal = fields.filter((field) => field.required).length;
  const completedRequired = requiredTotal - requiredMissing.length;
  const progress = requiredTotal === 0 ? 0 : (completedRequired / requiredTotal) * 100;

  return (
    <TravelerWorkspaceLayout
      left={
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-10">
          <section className="xl:col-span-4">
            <div className={PANEL_CLASS}>
              <h3 className="text-lg font-semibold text-slate-900">Tipo de producto</h3>
              <p className="mt-1 text-sm text-slate-600">Elige la estructura base del producto.</p>

              <div className="mt-4 space-y-3">
                {loadingTypes ? (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="h-4 w-3/5 animate-pulse rounded-md bg-slate-200" />
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200" />
                  </div>
                ) : (
                  <select
                    value={selectedTypeId}
                    onChange={(event) => setSelectedTypeId(event.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">Selecciona un tipo</option>
                    {productTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedType ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{selectedType.name}</p>
                  <p className="mt-2">{selectedType.description || "Sin descripcion definida para este tipo."}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.15em] text-slate-400">Version activa {selectedType.current_version}</p>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">Progreso del borrador</p>
                <div className="mt-3 flex items-center justify-between">
                  <span>Campos requeridos</span>
                  <span className="font-semibold text-slate-900">{requiredTotal === 0 ? "0/0" : `${completedRequired}/${requiredTotal}`}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section className="xl:col-span-6">
            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Formulario dinamico</h3>
                  <p className="mt-1 text-sm text-slate-600">Completa los campos del tipo seleccionado.</p>
                </div>
                {loadingFields ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
              </div>

              <div className="mt-5 space-y-4">
                {!selectedType ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Selecciona un tipo de producto para cargar el formulario.
                  </div>
                ) : loadingFields ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={`field-skeleton-${index}`} className="space-y-2">
                        <div className="h-3.5 w-2/5 animate-pulse rounded-md bg-slate-200" />
                        <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200" />
                      </div>
                    ))}
                  </div>
                ) : fields.length === 0 && !loadingFields ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Este tipo no tiene campos configurados todavia.
                  </div>
                ) : (
                  fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        {field.label || slugToLabel(field.field_name)} {field.required ? <span className="text-rose-500">*</span> : null}
                      </label>
                      {renderField(field)}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 space-y-3 xl:hidden">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Brain activo</p>
                  <p className="mt-1 font-medium text-slate-900">{activeBrain?.name || "Sin brain disponible"}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => void runPlanningAssistant("summary")}
                    disabled={runningAI || !activeBrain || !selectedType}
                    className={BTN_PRIMARY}
                  >
                    <FileText className="h-4 w-4" /> Resumen
                  </button>
                  <button
                    onClick={() => void runPlanningAssistant("review")}
                    disabled={runningAI || !activeBrain || !selectedType}
                    className={BTN_SECONDARY}
                  >
                    <Sparkles className="h-4 w-4" /> Revisar
                  </button>
                </div>
                <button
                  onClick={() => void handleSaveDraft()}
                  disabled={saving || !selectedType || !selectedVersionId}
                  className={`${BTN_PRIMARY} w-full`}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Guardando..." : draftId ? "Actualizar borrador" : "Guardar borrador"}
                </button>
              </div>
            </div>
          </section>
        </div>
      }
      right={
        <div className="space-y-4">
          <TravelerSalesSidebar
            mode="planning"
            offers={featured}
            planningProgress={{ completed: completedRequired, total: requiredTotal }}
            brandName={brandName}
            currencyCode={tenant.market?.currencyCode || "EUR"}
          />

          <div className={PANEL_CLASS}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Copiloto IA</h3>
                <p className="mt-1 text-sm text-slate-600">Resumen y revision de completitud.</p>
              </div>
              {runningAI ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <Sparkles className="h-5 w-5 text-amber-500" />}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Brain activo</p>
              <p className="mt-1">{activeBrain?.name || "Sin brain disponible"}</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={() => void runPlanningAssistant("summary")}
                disabled={runningAI || !activeBrain || !selectedType}
                className={BTN_PRIMARY}
              >
                <FileText className="h-4 w-4" /> Resumen
              </button>
              <button
                onClick={() => void runPlanningAssistant("review")}
                disabled={runningAI || !activeBrain || !selectedType}
                className={BTN_SECONDARY}
              >
                <Sparkles className="h-4 w-4" /> Revisar
              </button>
            </div>

            {assistantReply ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
                {assistantReply}
              </div>
            ) : null}
          </div>

          <div className={PANEL_CLASS}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Preview</h3>
                <p className="mt-1 text-sm text-slate-600">Estructura que se guardara en catalogo.</p>
              </div>
              {requiredMissing.length === 0 && selectedType ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Titulo</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{preview.title}</p>
              <p className="mt-3 text-sm text-slate-600">{preview.summary}</p>
            </div>

            <div className="mt-4 space-y-3">
              {fields.slice(0, 5).map((field) => {
                const displayValue = getFieldDisplayValue(formData[field.field_name]);
                return (
                  <div key={field.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{field.label}</p>
                    <p className="mt-1 text-slate-700">{displayValue || "Sin completar"}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Observaciones IA</p>
              {assistantNotes.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {assistantNotes.map((note, index) => (
                    <li key={`${note}-${index}`}>• {note}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Todavia no hay observaciones generadas.</p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => void handleSaveDraft()}
                disabled={saving || !selectedType || !selectedVersionId}
                className={BTN_PRIMARY}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Guardando..." : draftId ? "Actualizar borrador" : "Guardar borrador"}
              </button>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                Estado: <span className="font-medium text-slate-900">{DEFAULT_STATUS}</span>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}
