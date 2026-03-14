"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Compass,
  FileText,
  Map,
  Mountain,
  Plane,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/travelers";

type ProductTypeLite = {
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

type StartPlanningPayload = {
  typeId?: string;
  formData?: Record<string, unknown>;
};

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
    default:
      return "text";
  }
}

function getDefaultFieldValue(inputType: string) {
  if (inputType === "multiselect") return [];
  if (inputType === "boolean" || inputType === "checkbox") return false;
  return "";
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return String(value ?? "").trim().length > 0;
}

function getTypeIcon(name: string) {
  const value = name.toLowerCase();
  if (value.includes("hotel") || value.includes("aloj")) return Building2;
  if (value.includes("avent") || value.includes("mont")) return Mountain;
  if (value.includes("ruta") || value.includes("itiner")) return Map;
  if (value.includes("circuit") || value.includes("tour")) return Compass;
  return Plane;
}

export default function TravelerStartWizard({
  brandName,
  localeLabel,
  featuredItems,
  onStartChat,
  onStartPlanning,
  onStartChatWithProduct,
}: {
  brandName: string;
  localeLabel: string;
  featuredItems: CatalogProduct[];
  onStartChat: (initialMessage?: string) => void;
  onStartPlanning: (payload?: StartPlanningPayload) => void;
  onStartChatWithProduct: (productId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [productTypes, setProductTypes] = useState<ProductTypeLite[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [hoveredTypeId, setHoveredTypeId] = useState<string | null>(null);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [fieldsByTypeId, setFieldsByTypeId] = useState<Record<string, ProductField[]>>({});
  const [loadingFieldsByTypeId, setLoadingFieldsByTypeId] = useState<Record<string, boolean>>({});
  const [formDataByTypeId, setFormDataByTypeId] = useState<Record<string, Record<string, unknown>>>({});

  const featured = featuredItems.slice(0, 4);

  const shouldShowTypePanel = Boolean(hoveredTypeId || activeTypeId);
  const previewTypeId = activeTypeId || hoveredTypeId;
  const previewType = useMemo(
    () => productTypes.find((item) => item.id === previewTypeId) || null,
    [productTypes, previewTypeId],
  );
  const previewFields = previewType ? fieldsByTypeId[previewType.id] || [] : [];
  const previewFormData = previewType ? formDataByTypeId[previewType.id] || {} : {};

  const missingRequired = previewFields.filter((field) => field.required && !hasValue(previewFormData[field.field_name]));

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingTypes(true);
      try {
        const response = await fetch("/api/traveler/product-types", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        const filtered = (Array.isArray(payload?.types) ? payload.types : []) as ProductTypeLite[];

        if (!cancelled) {
          setProductTypes(filtered);
        }
      } catch (loadError) {
        console.error("Error cargando tipos de producto en landing:", loadError);
        if (!cancelled) setProductTypes([]);
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function ensureTypeFields(typeId: string) {
    if (fieldsByTypeId[typeId] || loadingFieldsByTypeId[typeId]) return;

    setLoadingFieldsByTypeId((current) => ({ ...current, [typeId]: true }));
    try {
      const response = await fetch(`/api/product-types/${typeId}/fields`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudieron cargar campos.");
      }

      const fields = (Array.isArray(payload.fields) ? payload.fields : []) as ProductField[];
      setFieldsByTypeId((current) => ({ ...current, [typeId]: fields }));
      setFormDataByTypeId((current) => {
        if (current[typeId]) return current;
        const initial = fields.reduce((acc: Record<string, unknown>, field) => {
          acc[field.field_name] = getDefaultFieldValue(field.input_type);
          return acc;
        }, {});
        return { ...current, [typeId]: initial };
      });
    } catch (loadError) {
      console.error("Error cargando fields del tipo:", loadError);
      setFieldsByTypeId((current) => ({ ...current, [typeId]: [] }));
    } finally {
      setLoadingFieldsByTypeId((current) => ({ ...current, [typeId]: false }));
    }
  }

  function handleChatSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    onStartChat(prompt.trim() || undefined);
  }

  function handleSuggestionClick(title: string) {
    setPrompt(title);
  }

  function activateType(typeId: string) {
    setActiveTypeId(typeId);
    void ensureTypeFields(typeId);
  }

  function closeTypePanel() {
    setActiveTypeId(null);
    setHoveredTypeId(null);
  }

  function updateFormField(typeId: string, fieldName: string, value: unknown) {
    setFormDataByTypeId((current) => ({
      ...current,
      [typeId]: {
        ...(current[typeId] || {}),
        [fieldName]: value,
      },
    }));
  }

  function handleStartPlanningWithType() {
    if (!previewType) return;
    onStartPlanning({
      typeId: previewType.id,
      formData: previewFormData,
    });
  }

  return (
    <div className="flex min-h-[65vh] w-full max-w-5xl flex-col items-center justify-center px-4 pt-10 sm:pt-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full text-center"
      >
        <h1 className="mb-5 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
          Donde quieres ir?
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
          Cuentame tu plan de viaje y te ayudo a construirlo con {brandName}.
        </p>

        <div className="mx-auto mb-5 w-full max-w-4xl rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Tipos de producto para crear
            </p>
            <p className="text-xs text-slate-400">{loadingTypes ? "Cargando..." : `${productTypes.length} tipos`}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {productTypes.map((type) => {
              const Icon = getTypeIcon(type.name);
              const active = activeTypeId === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onMouseEnter={() => {
                    setHoveredTypeId(type.id);
                    void ensureTypeFields(type.id);
                  }}
                  onMouseLeave={() => setHoveredTypeId((current) => (current === type.id ? null : current))}
                  onFocus={() => {
                    setHoveredTypeId(type.id);
                    void ensureTypeFields(type.id);
                  }}
                  onBlur={() => setHoveredTypeId((current) => (current === type.id ? null : current))}
                  onClick={() => activateType(type.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-orange-400 bg-orange-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{type.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                    {type.description || "Crea este tipo de producto con formulario guiado."}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {shouldShowTypePanel && previewType ? (
          <div className="mx-auto mb-6 w-full max-w-4xl rounded-3xl border border-orange-200 bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4 text-left">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Formulario dinamico</p>
                <h3 className="text-lg font-semibold text-slate-900">{previewType.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {previewType.description || "Completa algunos campos y luego sigue en Planning."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTypePanel}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingFieldsByTypeId[previewType.id] ? (
              <div className="grid gap-2 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="h-11 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : previewFields.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Este tipo no tiene campos configurados todavia. Puedes abrir planning para configurarlo.
              </div>
            ) : (
              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1 text-left">
                {previewFields.map((field) => {
                  const value = previewFormData[field.field_name];
                  const options = normalizeOptions(field.options);
                  return (
                    <label key={field.id} className="block space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">
                        {field.label || field.field_name}
                        {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
                      </span>
                      {field.input_type === "textarea" ? (
                        <textarea
                          rows={3}
                          value={String(value ?? "")}
                          onChange={(e) => updateFormField(previewType.id, field.field_name, e.target.value)}
                          placeholder={field.placeholder || `Completa ${field.label?.toLowerCase() || field.field_name}`}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-orange-400"
                        />
                      ) : field.input_type === "select" || field.input_type === "radio" ? (
                        <select
                          value={String(value ?? "")}
                          onChange={(e) => updateFormField(previewType.id, field.field_name, e.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-orange-400"
                        >
                          <option value="">Selecciona una opcion</option>
                          {options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.input_type === "multiselect" ? (
                        <select
                          multiple
                          value={Array.isArray(value) ? value.map((item) => String(item)) : []}
                          onChange={(e) =>
                            updateFormField(
                              previewType.id,
                              field.field_name,
                              Array.from(e.target.selectedOptions).map((option) => option.value),
                            )
                          }
                          className="min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-orange-400"
                        >
                          {options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.input_type === "boolean" || field.input_type === "checkbox" ? (
                        <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(e) => updateFormField(previewType.id, field.field_name, e.target.checked)}
                          />
                          Activar
                        </label>
                      ) : (
                        <input
                          type={getInputType(field.input_type)}
                          value={String(value ?? "")}
                          onChange={(e) => updateFormField(previewType.id, field.field_name, e.target.value)}
                          placeholder={field.placeholder || `Completa ${field.label?.toLowerCase() || field.field_name}`}
                          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-orange-400"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-left">
              <p className="text-xs text-slate-500">
                {missingRequired.length > 0
                  ? `Campos requeridos pendientes: ${missingRequired.length}`
                  : "Campos requeridos completos."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={closeTypePanel}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Volver al chat
                </button>
                <button
                  type="button"
                  onClick={handleStartPlanningWithType}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <FileText className="h-4 w-4" />
                  Abrir planning con este formulario
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!shouldShowTypePanel ? (
          <form onSubmit={handleChatSubmit} className="group relative mx-auto w-full max-w-2xl">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-orange-400 to-amber-300 opacity-20 blur transition duration-500 group-hover:opacity-40" />
            <div className="relative flex items-center rounded-[2rem] border border-slate-200 bg-white p-2 pl-6 shadow-sm transition-shadow focus-within:border-orange-300 focus-within:shadow-md">
              <Sparkles className="mr-3 h-6 w-6 flex-shrink-0 text-amber-500" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: viaje a Japon en primavera para dos personas..."
                className="w-full flex-1 truncate border-none bg-transparent py-3 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none md:py-4 md:text-lg"
              />
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="group/btn ml-2 flex items-center justify-center rounded-full bg-slate-900 p-4 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              >
                <Send className="h-5 w-5 -translate-x-[1px] transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onStartPlanning()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <CalendarDays className="h-4 w-4 text-slate-500" />
            Planning clasico
          </button>
          <button
            type="button"
            onClick={() => handleChatSubmit()}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-6 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-500/20"
          >
            <ArrowRight className="h-4 w-4" />
            Conversar con IVI directo
          </button>
        </div>

        {featured.length > 0 && (
          <div className="mt-14 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Sugerencias populares en {localeLabel}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {featured.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSuggestionClick(item.title)}
                  onDoubleClick={() => onStartChatWithProduct(item.id)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
                  title="Doble click para abrir chat con este producto"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
