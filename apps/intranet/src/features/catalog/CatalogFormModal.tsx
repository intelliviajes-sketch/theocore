"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, ImagePlus, Images, Layers3, Loader2, Settings2, Trash2, Upload } from "lucide-react";
import ModalShell from "@/components/system/ModalShell";
import { supabaseBrowser } from "@/lib/supabase/client";
import type {
  CatalogAgency,
  CatalogAmenityDefinition,
  CatalogCountry,
  CatalogDefinition,
  CatalogField,
  CatalogItemRow,
  CatalogProductType,
  CatalogReviewStatus,
  CatalogSavePayload,
} from "./types";
import {
  buildEmptyAmenityState,
  buildEmptyFieldState,
  getDefaultSummary,
  getDefaultTitle,
  loadCatalogDefinition,
  normalizeFieldValue,
  saveCatalogItem,
  toLabel,
} from "./api";

type CatalogFormModalProps = {
  open: boolean;
  mode: "agency" | "theocore";
  fixedAgencyId?: string;
  item: CatalogItemRow | null;
  agencies: CatalogAgency[];
  countries: CatalogCountry[];
  productTypes: CatalogProductType[];
  createdBy: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type FormState = {
  agencyId: string;
  countryCode: string;
  productTypeId: string;
  title: string;
  summary: string;
  reviewStatus: CatalogReviewStatus;
  active: boolean;
  creationSource: CatalogSavePayload["creation_source"];
  createdViaTool: string;
  images: string[];
  fields: Record<string, unknown>;
  amenities: Record<string, Record<string, unknown>>;
};

type TabKey = "basic" | "images" | "fields" | "amenities" | "publication";

const TABS: Array<{ key: TabKey; label: string; icon: typeof Layers3 }> = [
  { key: "basic", label: "Basico", icon: Layers3 },
  { key: "images", label: "Imagenes", icon: Images },
  { key: "fields", label: "Campos", icon: Settings2 },
  { key: "amenities", label: "Amenities", icon: Settings2 },
  { key: "publication", label: "Publicacion", icon: CheckCircle2 },
];

function optionsForField(field: CatalogField) {
  if (!field.options) return [] as { label: string; value: string }[];
  return field.options.map((item) => {
    if (typeof item === "string") return { label: item, value: item };
    return {
      label: item.label || item.value || "Opcion",
      value: item.value || item.label || "opcion",
    };
  });
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

function readImages(data: Record<string, unknown>) {
  const value = data.images;
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  }
  return [] as string[];
}

function readAmenities(data: Record<string, unknown>) {
  const value = data.amenities;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, Record<string, unknown>>;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, Record<string, unknown>>>((acc, [amenityId, amenityValue]) => {
    if (amenityValue && typeof amenityValue === "object" && !Array.isArray(amenityValue)) {
      acc[amenityId] = amenityValue as Record<string, unknown>;
    }
    return acc;
  }, {});
}

export default function CatalogFormModal({
  open,
  mode,
  fixedAgencyId,
  item,
  agencies,
  countries,
  productTypes,
  createdBy,
  onClose,
  onSaved,
}: CatalogFormModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [form, setForm] = useState<FormState>({
    agencyId: fixedAgencyId || "",
    countryCode: "",
    productTypeId: "",
    title: "",
    summary: "",
    reviewStatus: "draft",
    active: true,
    creationSource: "manual",
    createdViaTool: mode === "agency" ? "catalog" : "theocore-catalog",
    images: [],
    fields: {},
    amenities: {},
  });
  const [imageDraft, setImageDraft] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [definition, setDefinition] = useState<CatalogDefinition | null>(null);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const currentAgencyId = fixedAgencyId || item?.agency_id || "";
    const rawData = (item?.data ?? {}) as Record<string, unknown>;
    const rawFields = ((rawData.fields as Record<string, unknown> | undefined) ?? rawData) as Record<string, unknown>;
    setForm({
      agencyId: currentAgencyId,
      countryCode: item?.country_code || "",
      productTypeId: item?.product_type_id || "",
      title: item?.title || getDefaultTitle("", rawFields),
      summary: item?.summary || getDefaultSummary(rawFields),
      reviewStatus: item?.review_status || "draft",
      active: item?.active ?? true,
      creationSource: item?.creation_source || "manual",
      createdViaTool: item?.created_via_tool || (mode === "agency" ? "catalog" : "theocore-catalog"),
      images: readImages(rawData),
      fields: rawFields,
      amenities: readAmenities(rawData),
    });
    setImageDraft("");
    setActiveTab("basic");
    setError(null);
  }, [fixedAgencyId, item, mode, open]);

  useEffect(() => {
    if (!open || !form.productTypeId) {
      setDefinition(null);
      return;
    }

    let mounted = true;

    (async () => {
      setLoadingDefinition(true);
      try {
        const nextDefinition = await loadCatalogDefinition(form.productTypeId);
        if (!mounted) return;
        setDefinition(nextDefinition);
        setForm((current) => {
          const hasExistingFields = current.productTypeId === (item?.product_type_id || "") && Object.keys(current.fields).length > 0;
          const hasExistingAmenities = current.productTypeId === (item?.product_type_id || "") && Object.keys(current.amenities).length > 0;
          const nextFields = hasExistingFields ? { ...buildEmptyFieldState(nextDefinition.fields), ...current.fields } : buildEmptyFieldState(nextDefinition.fields);
          const nextAmenities = hasExistingAmenities ? mergeAmenityState(nextDefinition.amenities, current.amenities) : buildEmptyAmenityState(nextDefinition.amenities);
          const fallbackTypeName = productTypes.find((productType) => productType.id === current.productTypeId)?.name || "Producto";
          return {
            ...current,
            title: current.title || getDefaultTitle(fallbackTypeName, nextFields),
            summary: current.summary || getDefaultSummary(nextFields),
            fields: nextFields,
            amenities: nextAmenities,
          };
        });
      } catch (definitionError) {
        console.error("Catalog definition error:", definitionError);
        if (mounted) {
          setDefinition(null);
          setError("No se pudo cargar la estructura del tipo de producto.");
        }
      } finally {
        if (mounted) setLoadingDefinition(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [form.productTypeId, item?.product_type_id, open, productTypes]);
  const canSubmit = useMemo(() => {
    if (!createdBy) return false;
    if (!form.agencyId) return false;
    if (!form.productTypeId) return false;
    if (!form.title.trim()) return false;
    if (!definition) return false;

    const fieldsOk = definition.fields.every((field) => {
      if (!field.required) return true;
      const value = form.fields[field.field_name];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean") return value;
      return normalizeFieldValue(value).trim().length > 0;
    });

    const amenitiesOk = definition.amenities.every((amenity) => {
      if (!amenity.required) return true;
      const amenityValues = form.amenities[amenity.amenity_type_id] || {};
      return amenity.fields.every((field) => {
        if (!field.required) return true;
        const value = amenityValues[field.field_name];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "boolean") return value;
        return normalizeFieldValue(value).trim().length > 0;
      });
    });

    return fieldsOk && amenitiesOk;
  }, [createdBy, definition, form.agencyId, form.amenities, form.fields, form.productTypeId, form.title]);

  const completion = useMemo(() => {
    const requiredFields = definition?.fields.filter((field) => field.required) ?? [];
    const completedRequired = requiredFields.filter((field) => {
      const value = form.fields[field.field_name];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean") return value;
      return normalizeFieldValue(value).trim().length > 0;
    }).length;

    const requiredAmenities = definition?.amenities.filter((amenity) => amenity.required) ?? [];
    const completedAmenities = requiredAmenities.filter((amenity) => {
      const amenityValues = form.amenities[amenity.amenity_type_id] || {};
      return amenity.fields.every((field) => {
        if (!field.required) return true;
        const value = amenityValues[field.field_name];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "boolean") return value;
        return normalizeFieldValue(value).trim().length > 0;
      });
    }).length;

    return {
      hasBasic: Boolean(form.title.trim() && form.productTypeId && form.agencyId),
      imageCount: form.images.length,
      requiredCompleted: completedRequired,
      requiredTotal: requiredFields.length,
      amenitiesCompleted: completedAmenities,
      amenitiesTotal: requiredAmenities.length,
    };
  }, [definition?.amenities, definition?.fields, form.agencyId, form.amenities, form.fields, form.images.length, form.productTypeId, form.title]);

  function updateField(fieldName: string, value: unknown) {
    setForm((current) => ({ ...current, fields: { ...current.fields, [fieldName]: value } }));
  }

  function updateAmenityField(amenityId: string, fieldName: string, value: unknown) {
    setForm((current) => ({
      ...current,
      amenities: {
        ...current.amenities,
        [amenityId]: {
          ...(current.amenities[amenityId] || {}),
          [fieldName]: value,
        },
      },
    }));
  }

  function addImage() {
    const value = imageDraft.trim();
    if (!value) return;
    setForm((current) => ({
      ...current,
      images: current.images.includes(value) ? current.images : [...current.images, value],
    }));
    setImageDraft("");
  }

  async function uploadSelectedFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setUploadingImages(true);
    setError(null);
    try {
      const body = new FormData();
      if (form.agencyId) body.append("agencyId", form.agencyId);
      Array.from(fileList).forEach((file) => body.append("files", file));

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("/api/catalog/upload-image", {
        method: "POST",
        body,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudieron subir las imagenes.");

      const uploadedUrls = Array.isArray(payload?.files)
        ? payload.files.map((file: { url?: string }) => (typeof file?.url === "string" ? file.url : null)).filter((entry: string | null): entry is string => Boolean(entry))
        : [];

      setForm((current) => ({
        ...current,
        images: [...new Set([...current.images, ...uploadedUrls])],
      }));
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "No se pudieron subir las imagenes.");
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(imageUrl: string) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((item) => item !== imageUrl),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createdBy) {
      setError("No se pudo resolver el usuario autenticado.");
      return;
    }
    if (!definition) {
      setError("Selecciona un tipo de producto valido.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveCatalogItem({
        id: item?.id,
        agency_id: form.agencyId,
        country_code: form.countryCode || null,
        product_type_id: form.productTypeId,
        product_type_version_id: definition.versionId,
        title: form.title.trim(),
        summary: form.summary.trim(),
        images: form.images,
        fields: form.fields,
        amenities: form.amenities,
        review_status: form.reviewStatus,
        active: form.active,
        created_by: createdBy,
        creation_source: form.creationSource,
        created_via_tool: form.createdViaTool,
      });
      await onSaved();
      onClose();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el catalogo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={item ? "Editar catalogo" : "Nuevo catalogo manual"}
      subtitle="Carga manual de productos en el catalogo compartido. Los amenities se heredan desde el tipo de producto y se completan aqui."
      maxWidth="6xl"
      bodyClassName="min-h-0 flex-1 p-0"
      panelClassName="flex max-h-[92vh] flex-col dark:border dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40 lg:border-b-0 lg:border-r">
          <div className="space-y-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"}`}>
                  <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <div className="flex items-center justify-between"><span>Basico</span><span>{completion.hasBasic ? "OK" : "Pendiente"}</span></div>
            <div className="flex items-center justify-between"><span>Imagenes</span><span>{completion.imageCount}</span></div>
            <div className="flex items-center justify-between"><span>Campos requeridos</span><span>{completion.requiredCompleted}/{completion.requiredTotal}</span></div>
            <div className="flex items-center justify-between"><span>Amenities requeridos</span><span>{completion.amenitiesCompleted}/{completion.amenitiesTotal}</span></div>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto p-6">
          <div className="space-y-6">
            {activeTab === "basic" ? (
              <section className="space-y-6">
                <SectionHeader title="Datos base" description="Define a que agencia, pais y tipo pertenece este producto." />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {mode === "theocore" ? (
                    <Field label="Agencia *">
                      <select value={form.agencyId} onChange={(event) => setForm((current) => ({ ...current, agencyId: event.target.value }))} className={inputClass()}>
                        <option value="">Selecciona una agencia</option>
                        {agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.commercial_name}</option>)}
                      </select>
                    </Field>
                  ) : null}
                  <Field label="Pais">
                    <select value={form.countryCode} onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value }))} className={inputClass()}>
                      <option value="">Sin pais</option>
                      {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Tipo de producto *">
                    <select value={form.productTypeId} onChange={(event) => setForm((current) => ({ ...current, productTypeId: event.target.value, fields: {}, amenities: {} }))} className={inputClass()}>
                      <option value="">Selecciona un tipo</option>
                      {productTypes.map((productType) => <option key={productType.id} value={productType.id}>{productType.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Origen">
                    <input value={form.creationSource} readOnly className={`${inputClass()} bg-slate-100 text-slate-500`} />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Titulo *"><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass()} /></Field>
                  <Field label="Activo">
                    <label className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                      Mantener visible dentro del catalogo interno
                    </label>
                  </Field>
                </div>

                <Field label="Resumen">
                  <textarea value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} rows={5} className={`${inputClass()} min-h-[140px] py-3`} />
                </Field>
              </section>
            ) : null}

            {activeTab === "images" ? (
              <section className="space-y-6">
                <SectionHeader title="Galeria" description="Sube archivos al storage o agrega URLs externas para la galeria del producto." />
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Subir archivos</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">JPEG, PNG, WEBP o GIF de hasta 5MB por archivo.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                      {uploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingImages ? "Subiendo..." : "Seleccionar imagenes"}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" disabled={uploadingImages} onChange={(event) => { void uploadSelectedFiles(event.target.files); event.currentTarget.value = ""; }} />
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <input type="url" value={imageDraft} onChange={(event) => setImageDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addImage(); } }} placeholder="https://..." className={inputClass()} />
                  <button type="button" onClick={addImage} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"><ImagePlus className="h-4 w-4" />Agregar URL</button>
                </div>

                {form.images.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {form.images.map((imageUrl, index) => (
                      <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800"><img src={imageUrl} alt={`Imagen ${index + 1}`} className="h-full w-full object-cover" /></div>
                        <div className="space-y-3 p-4">
                          <p className="break-all text-xs text-slate-500 dark:text-slate-400">{imageUrl}</p>
                          <button type="button" onClick={() => removeImage(imageUrl)} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white"><Trash2 className="h-3.5 w-3.5" />Quitar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState text="Todavia no has agregado imagenes a este producto." />}
              </section>
            ) : null}

            {activeTab === "fields" ? (
              <section className="space-y-6">
                <SectionHeader title="Campos dinamicos" description="Se cargan desde la version activa del tipo de producto." />
                {!form.productTypeId ? <EmptyState text="Selecciona un tipo de producto en la pestana Basico para habilitar el formulario." /> : definition && definition.fields.length === 0 ? <EmptyState text="Este tipo todavia no tiene campos configurados." /> : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {definition?.fields.map((field) => (
                      <FieldRenderer key={field.id} field={field} value={form.fields[field.field_name]} onChange={(value) => updateField(field.field_name, value)} />
                    ))}
                  </div>
                )}
                {loadingDefinition ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando campos...</div> : null}
              </section>
            ) : null}

            {activeTab === "amenities" ? (
              <section className="space-y-6">
                <SectionHeader title="Amenities" description="Se definen desde el tipo de producto en TheoCore y aqui rellenas sus valores concretos." />
                {!form.productTypeId ? <EmptyState text="Selecciona un tipo de producto en la pestana Basico para habilitar los amenities." /> : definition && definition.amenities.length === 0 ? <EmptyState text="Este tipo de producto todavia no tiene amenities asociados." /> : (
                  <div className="space-y-5">
                    {definition?.amenities.map((amenity) => (
                      <AmenityCard key={amenity.amenity_type_id} amenity={amenity} values={form.amenities[amenity.amenity_type_id] || {}} onChange={(fieldName, value) => updateAmenityField(amenity.amenity_type_id, fieldName, value)} />
                    ))}
                  </div>
                )}
                {loadingDefinition ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando amenities...</div> : null}
              </section>
            ) : null}

            {activeTab === "publication" ? (
              <section className="space-y-6">
                <SectionHeader title="Publicacion" description="Controla revision, estado y resumen final del registro." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Revision">
                    <select value={form.reviewStatus} onChange={(event) => setForm((current) => ({ ...current, reviewStatus: event.target.value as CatalogReviewStatus }))} className={inputClass()}>
                      <option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="published">Published</option><option value="archived">Archived</option>
                    </select>
                  </Field>
                  <Field label="Activo">
                    <label className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                      Visible dentro del catalogo interno
                    </label>
                  </Field>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div><span className="font-medium text-slate-800 dark:text-slate-100">Titulo:</span> {form.title || "Sin definir"}</div>
                    <div><span className="font-medium text-slate-800 dark:text-slate-100">Imagenes:</span> {form.images.length}</div>
                    <div><span className="font-medium text-slate-800 dark:text-slate-100">Campos obligatorios:</span> {completion.requiredCompleted}/{completion.requiredTotal}</div>
                    <div><span className="font-medium text-slate-800 dark:text-slate-100">Amenities requeridos:</span> {completion.amenitiesCompleted}/{completion.amenitiesTotal}</div>
                    <div><span className="font-medium text-slate-800 dark:text-slate-100">Origen:</span> {form.creationSource}</div>
                  </div>
                </div>
              </section>
            ) : null}

            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">{activeTab === "basic" ? "Completa la base del producto." : activeTab === "images" ? "Sube o agrega la galeria." : activeTab === "fields" ? "Rellena los campos del tipo." : activeTab === "amenities" ? "Completa los amenities asociados." : "Revisa antes de guardar."}</div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">Cancelar</button>
              <button type="submit" disabled={!canSubmit || saving || uploadingImages} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{item ? "Guardar cambios" : "Crear catalogo"}</button>
            </div>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
function mergeAmenityState(amenities: CatalogAmenityDefinition[], current: Record<string, Record<string, unknown>>) {
  const empty = buildEmptyAmenityState(amenities);
  const next = { ...empty };
  for (const amenity of amenities) {
    next[amenity.amenity_type_id] = {
      ...empty[amenity.amenity_type_id],
      ...(current[amenity.amenity_type_id] || {}),
    };
  }
  return next;
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{text}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function FieldRenderer({ field, value, onChange }: { field: CatalogField; value: unknown; onChange: (value: unknown) => void }) {
  const options = optionsForField(field);
  return (
    <Field label={`${field.label || toLabel(field.field_name)}${field.required ? " *" : ""}`}>
      {field.input_type === "textarea" ? (
        <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} rows={4} placeholder={field.placeholder || ""} className={`${inputClass()} min-h-[110px] py-3`} />
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
    </Field>
  );
}

function AmenityCard({ amenity, values, onChange }: { amenity: CatalogAmenityDefinition; values: Record<string, unknown>; onChange: (fieldName: string, value: unknown) => void }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{amenity.name}</h4>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{amenity.description || "Amenity sin descripcion"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${amenity.required ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{amenity.required ? "Requerido" : "Opcional"}</span>
      </div>
      {amenity.fields.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {amenity.fields.map((field) => <FieldRenderer key={`${amenity.amenity_type_id}-${field.id}`} field={field} value={values[field.field_name]} onChange={(value) => onChange(field.field_name, value)} />)}
        </div>
      ) : <EmptyState text="Este amenity no tiene campos configurados." />}
    </div>
  );
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
}
