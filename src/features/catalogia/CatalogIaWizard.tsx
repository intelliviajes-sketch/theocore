"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, ImageIcon, Loader2, Mail, Save, Sparkles, UploadCloud, Wand2 } from "lucide-react";
import { useToast } from "@/components/system/ToastProvider";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import {
  createCatalogItemFromIa,
  createCatalogItemsFromIa,
  loadCatalogIaDefinition,
  loadCatalogIaOptions,
  normalizeFieldStateForDefinition,
  runCatalogIaExtraction,
} from "./api";
import type {
  CatalogIaDefinition,
  CatalogIaExtraction,
  CatalogIaFormState,
  CatalogIaOfferCandidate,
  CatalogIaSourceType,
} from "./types";
import type { CatalogField, CatalogReviewStatus } from "@/features/catalog/types";
import { toLabel } from "@/features/catalog/api";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Ingesta",
  2: "Analisis IA",
  3: "Relay manual",
  4: "Publicar",
};

const SOURCE_LABELS: Record<CatalogIaSourceType, string> = {
  text: "Texto libre",
  email: "Correo",
  pdf: "PDF",
  image: "Imagen (OCR)",
};

const FIELD_SYNONYMS: Record<string, string[]> = {
  title: ["titulo", "name", "nombre"],
  summary: ["resumen", "description", "descripcion"],
  duration: ["duracion", "dias", "noches"],
  itinerary: ["itinerario", "ruta"],
  includes: ["incluye", "incluidos"],
  excludes: ["no_incluye", "excluye", "noincluye"],
  price: ["precio", "tarifa", "coste"],
  destination: ["destino", "pais", "country"],
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
}

function inputTypeForField(type: string) {
  switch (type) {
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

function optionsForField(field: CatalogField) {
  if (!field.options) return [] as Array<{ label: string; value: string }>;
  return field.options.map((item) => {
    if (typeof item === "string") return { label: item, value: item };
    return { label: item.label || item.value || "Opcion", value: item.value || item.label || "opcion" };
  });
}

function fieldValueFromSuggestions(field: CatalogField, suggestions: Record<string, unknown>) {
  const expected = [
    normalizeKey(field.field_name),
    normalizeKey(field.label || ""),
    normalizeKey(toLabel(field.field_name)),
    ...(FIELD_SYNONYMS[normalizeKey(field.field_name)] ?? []),
  ].filter(Boolean);

  for (const [rawKey, rawValue] of Object.entries(suggestions)) {
    const key = normalizeKey(rawKey);
    if (!key) continue;
    if (expected.includes(key)) return rawValue;
    if (expected.some((token) => key.includes(token) || token.includes(key))) return rawValue;
  }
  return undefined;
}

function offerFromExtraction(extraction: CatalogIaExtraction | null, selectedOfferId: string | null) {
  if (!extraction) return null;
  const offers = extraction.detected_offers || [];
  if (offers.length === 0) return null;
  return offers.find((offer) => offer.candidate_id === selectedOfferId) || offers[0];
}

export default function CatalogIaWizard({ agencyId }: { agencyId: string }) {
  const { success, error: showError } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const [sourceType, setSourceType] = useState<CatalogIaSourceType>("text");
  const [rawText, setRawText] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [productTypes, setProductTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [countries, setCountries] = useState<Array<{ code: string; name: string }>>([]);
  const [markets, setMarkets] = useState<Array<{ id: string; country_code: string; language_code: string; currency_code: string; timezone: string }>>([]);
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [definition, setDefinition] = useState<CatalogIaDefinition | null>(null);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [extraction, setExtraction] = useState<CatalogIaExtraction | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);

  const [form, setForm] = useState<CatalogIaFormState>({
    title: "",
    summary: "",
    countryCode: "",
    reviewStatus: "draft",
    active: true,
    images: [],
    fields: {},
    amenities: {},
  });
  const [imageDraft, setImageDraft] = useState("");

  const selectedOffer = useMemo(
    () => offerFromExtraction(extraction, selectedOfferId),
    [extraction, selectedOfferId],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [options, userResult] = await Promise.all([
          loadCatalogIaOptions(agencyId),
          supabase.auth.getUser(),
        ]);
        if (!mounted) return;
        setProductTypes(options.productTypes.map((item) => ({ id: item.id, name: item.name })));
        setCountries(options.countries);
        setMarkets(options.markets);
        setSelectedMarketId(options.markets[0]?.id || "");
        setCreatedBy(userResult.data.user?.id || null);
      } catch (loadError) {
        console.error(loadError);
        showError("No se pudo cargar CatalogIA.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [agencyId, showError]);

  useEffect(() => {
    if (!selectedTypeId || !selectedOffer) {
      setDefinition(null);
      return;
    }
    let mounted = true;
    (async () => {
      setLoadingDefinition(true);
      try {
        const nextDefinition = await loadCatalogIaDefinition(selectedTypeId);
        if (!mounted) return;
        setDefinition(nextDefinition);
        const empty = normalizeFieldStateForDefinition(nextDefinition);
        const fieldSuggestions = selectedOffer.field_suggestions || {};
        const amenitySuggestions = selectedOffer.amenity_suggestions || {};

        const fields: Record<string, unknown> = { ...empty.fields };
        for (const field of nextDefinition.fields) {
          const v = fieldValueFromSuggestions(field, fieldSuggestions);
          if (v !== undefined && v !== null) fields[field.field_name] = v;
        }

        const amenities: Record<string, Record<string, unknown>> = { ...empty.amenities };
        for (const amenity of nextDefinition.amenities) {
          const match = Object.entries(amenitySuggestions).find(([key]) => {
            const normalized = normalizeKey(key);
            return normalized === normalizeKey(amenity.name) || normalized === normalizeKey(amenity.amenity_type_id) || normalized.includes(normalizeKey(amenity.name));
          });
          const values = match?.[1] && typeof match[1] === "object" ? (match[1] as Record<string, unknown>) : {};
          amenities[amenity.amenity_type_id] = { ...empty.amenities[amenity.amenity_type_id] };
          for (const field of amenity.fields) {
            const v = fieldValueFromSuggestions(field, values);
            if (v !== undefined && v !== null) amenities[amenity.amenity_type_id][field.field_name] = v;
          }
        }

        setForm((current) => ({
          ...current,
          title: selectedOffer.title || current.title,
          summary: selectedOffer.summary || current.summary,
          countryCode: selectedOffer.country_code || current.countryCode,
          fields,
          amenities,
        }));
      } catch (definitionError) {
        console.error(definitionError);
        setDefinition(null);
        showError("No se pudo cargar el esquema del tipo.");
      } finally {
        if (mounted) setLoadingDefinition(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedTypeId, selectedOffer, showError]);

  async function handleAnalyze() {
    if ((sourceType === "pdf" || sourceType === "image") && files.length === 0) {
      showError(sourceType === "pdf" ? "Adjunta un PDF para continuar." : "Adjunta imagen(es) para continuar.");
      return;
    }
    if (sourceType !== "pdf" && sourceType !== "image" && !rawText.trim()) {
      showError("Pega el contenido para continuar.");
      return;
    }

    setAnalyzing(true);
    try {
      const result = await runCatalogIaExtraction({ agencyId, sourceType, rawText, files, file: files[0] || null });
      setExtraction(result);
      const first = result.detected_offers?.[0] || null;
      setSelectedOfferId(first?.candidate_id || null);
      setForm((current) => ({
        ...current,
        title: first?.title || result.title || current.title,
        summary: first?.summary || result.summary || current.summary,
        countryCode: first?.country_code || result.country_code || current.countryCode,
      }));
      const suggestedTypeName = first?.suggested_product_type_name || result.suggested_product_type_name || "";
      const suggestedType = productTypes.find((item) => normalizeKey(item.name) === normalizeKey(suggestedTypeName));
      setSelectedTypeId(suggestedType?.id || "");
      setStep(2);
      success("Analisis IA completado.");
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "No se pudo ejecutar CatalogIA.");
    } finally {
      setAnalyzing(false);
    }
  }

  function addImage() {
    const value = imageDraft.trim();
    if (!value) return;
    setForm((current) => ({ ...current, images: current.images.includes(value) ? current.images : [...current.images, value] }));
    setImageDraft("");
  }

  function buildPayloadForOffer(offer: CatalogIaOfferCandidate) {
    if (!definition || !createdBy) return null;
    const market = markets.find((row) => row.id === selectedMarketId);
    return {
      agency_id: agencyId,
      country_code: market?.country_code || form.countryCode || offer.country_code || null,
      product_type_id: selectedTypeId,
      product_type_version_id: definition.versionId,
      title: offer.commercial_copy?.title || offer.title || form.title,
      summary: offer.commercial_copy?.summary || offer.summary || form.summary,
      images: form.images,
      fields: form.fields,
      amenities: form.amenities,
      review_status: form.reviewStatus as CatalogReviewStatus,
      active: form.active,
      created_by: createdBy,
      market_context: market
        ? {
            market_config_id: market.id,
            country_code: market.country_code,
            language_code: market.language_code,
            currency_code: market.currency_code,
            timezone: market.timezone,
          }
        : null,
      raw_ai_output: {
        run_id: extraction?.run_id || null,
        candidate_id: offer.candidate_id,
        confidence: offer.suggested_confidence,
        duplicates: offer.duplicates,
      },
    } as const;
  }

  async function publishCurrent() {
    if (!selectedOffer || !createdBy || !selectedTypeId || !definition) {
      showError("Falta informacion para publicar.");
      return;
    }
    const payload = buildPayloadForOffer(selectedOffer);
    if (!payload) return;
    setSaving(true);
    try {
      const id = await createCatalogItemFromIa(payload);
      success(`Producto publicado (${id.slice(0, 8)}).`);
      setStep(4);
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "No se pudo publicar.");
    } finally {
      setSaving(false);
    }
  }

  async function publishAllDetected() {
    if (!extraction?.detected_offers?.length || !selectedTypeId || !definition || !createdBy) {
      showError("No hay ofertas detectadas para publicar.");
      return;
    }
    setSavingAll(true);
    try {
      const payloads = extraction.detected_offers
        .map((offer) => buildPayloadForOffer(offer))
        .filter((item): item is NonNullable<ReturnType<typeof buildPayloadForOffer>> => Boolean(item));
      const ids = await createCatalogItemsFromIa(payloads);
      success(`Publicados ${ids.length} productos desde deteccion multiple.`);
      setStep(4);
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "No se pudo publicar todo.");
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <div className="space-y-6 rounded-[2rem] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700 dark:text-violet-300">CatalogIA</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 md:text-3xl">Wizard IA premium</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">OCR imagen/PDF, deteccion multiple, duplicados, confianza por campo y publicacion por mercado.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">Paso {step}: {STEP_LABELS[step]}</div>
      </div>

      {loading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando...</div> : null}

      {!loading && step === 1 ? (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="grid gap-3 md:grid-cols-4">
            {(["text", "email", "pdf", "image"] as CatalogIaSourceType[]).map((source) => (
              <button key={source} onClick={() => setSourceType(source)} className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${sourceType === source ? "border-violet-400 bg-violet-50 text-violet-900 dark:border-violet-500 dark:bg-violet-950/30 dark:text-violet-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"}`}>
                <span className="inline-flex items-center gap-2">
                  {source === "pdf" ? <UploadCloud className="h-4 w-4" /> : source === "image" ? <ImageIcon className="h-4 w-4" /> : source === "email" ? <Mail className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  {SOURCE_LABELS[source]}
                </span>
              </button>
            ))}
          </div>
          {sourceType === "pdf" || sourceType === "image" ? (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              {sourceType === "pdf" ? <UploadCloud className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              {files.length > 0 ? `${files.length} archivo(s)` : sourceType === "pdf" ? "Seleccionar PDF" : "Seleccionar imagen(es)"}
              <input type="file" accept={sourceType === "pdf" ? "application/pdf" : "image/png,image/jpeg,image/webp,image/gif,image/jpg"} multiple={sourceType === "image"} className="hidden" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
            </label>
          ) : (
            <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} rows={12} placeholder={sourceType === "email" ? "Pega aqui el correo..." : "Pega aqui el texto..."} className={`${inputClass()} min-h-[220px] py-3`} />
          )}
          <button onClick={() => void handleAnalyze()} disabled={analyzing} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Analizar con IA
          </button>
        </section>
      ) : null}

      {!loading && step === 2 && extraction ? (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-100">
            <p className="inline-flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4" />Deteccion IA</p>
            <p className="mt-2">Fuente idioma: <b>{extraction.source_language || "N/D"}</b> | Ofertas detectadas: <b>{extraction.detected_offers.length}</b></p>
          </div>
          <div className="space-y-3">
            {extraction.detected_offers.map((offer) => (
              <button key={offer.candidate_id} onClick={() => setSelectedOfferId(offer.candidate_id)} className={`w-full rounded-2xl border p-3 text-left ${selectedOfferId === offer.candidate_id ? "border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"}`}>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{offer.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{offer.summary}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tipo: {offer.suggested_product_type_name || "N/D"} ({offer.suggested_confidence ?? 0}%) | Duplicados: {offer.duplicates.length}</p>
                {offer.duplicates.length > 0 ? <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />Revisar antes de publicar.</p> : null}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(3)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Continuar a relay manual</button>
        </section>
      ) : null}

      {!loading && step === 3 && selectedOffer ? (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Titulo" className={inputClass()} />
            <select value={form.countryCode} onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value }))} className={inputClass()}>
              <option value="">Sin pais</option>
              {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
          </div>
          <textarea value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} rows={4} placeholder="Resumen" className={`${inputClass()} min-h-[120px] py-3`} />
          <div className="grid gap-4 md:grid-cols-3">
            <select value={selectedTypeId} onChange={(event) => setSelectedTypeId(event.target.value)} className={inputClass()}>
              <option value="">Selecciona tipo producto</option>
              {productTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={selectedMarketId} onChange={(event) => setSelectedMarketId(event.target.value)} className={inputClass()}>
              <option value="">Mercado (opcional)</option>
              {markets.map((market) => <option key={market.id} value={market.id}>{market.country_code} · {market.language_code} · {market.currency_code}</option>)}
            </select>
            <select value={form.reviewStatus} onChange={(event) => setForm((current) => ({ ...current, reviewStatus: event.target.value as CatalogReviewStatus }))} className={inputClass()}>
              <option value="draft">Draft</option>
              <option value="reviewed">Reviewed</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input type="url" value={imageDraft} onChange={(event) => setImageDraft(event.target.value)} placeholder="https://... imagen portada" className={inputClass()} />
            <button type="button" onClick={addImage} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Agregar imagen</button>
          </div>
          {form.images.length > 0 ? <div className="flex flex-wrap gap-2">{form.images.map((image) => <span key={image} className="rounded-xl bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{image}</span>)}</div> : null}
          {loadingDefinition ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando esquema...</div> : null}
          {definition?.fields.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {definition.fields.map((field) => (
                <FieldRenderer key={field.id} field={field} value={form.fields[field.field_name]} onChange={(value) => setForm((current) => ({ ...current, fields: { ...current.fields, [field.field_name]: value } }))} />
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void publishCurrent()} disabled={saving || !selectedTypeId || !definition} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Publicar seleccion actual
            </button>
            <button onClick={() => void publishAllDetected()} disabled={savingAll || !selectedTypeId || !definition || (extraction?.detected_offers.length || 0) === 0} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
              {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Publicar todas detectadas
            </button>
          </div>
        </section>
      ) : null}

      {!loading && step === 4 ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
          <p className="inline-flex items-center gap-2 text-lg font-semibold"><CheckCircle2 className="h-5 w-5" />Publicacion completada en catalogo</p>
          <p className="mt-2 text-sm">El producto se guardo con origen IA, metadata de mercado y contexto de run/candidato.</p>
        </section>
      ) : null}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: CatalogField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const options = optionsForField(field);
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{field.label || toLabel(field.field_name)}{field.required ? " *" : ""}</span>
      {field.input_type === "textarea" ? (
        <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} rows={4} className={`${inputClass()} min-h-[110px] py-3`} />
      ) : field.input_type === "select" || field.input_type === "radio" ? (
        <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={inputClass()}>
          <option value="">Selecciona una opcion</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : field.input_type === "multiselect" ? (
        <select multiple value={Array.isArray(value) ? value.map((item) => String(item)) : []} onChange={(event) => onChange(Array.from(event.target.selectedOptions).map((option) => option.value))} className={`${inputClass()} min-h-[120px] py-3`}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : field.input_type === "boolean" || field.input_type === "checkbox" ? (
        <label className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
          <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
          Marcar como si
        </label>
      ) : (
        <input type={inputTypeForField(field.input_type)} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || ""} className={inputClass()} />
      )}
    </label>
  );
}
