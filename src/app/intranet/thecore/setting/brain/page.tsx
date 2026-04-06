"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit3,
  Trash2,
  Copy,
  BarChart2,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import ModalShell from "@/components/system/ModalShell";

type Country = { code: string; name: string; emoji_flag: string };

type BrainType = "inspira" | "planifica" | "acompana" | "evalua" | "operacional";
type ExecutionLayer = "frontend" | "backend";
type BrainCategory = "traveler" | "agency" | "growth" | "data" | "operations";
type VisibilityLevel = "public" | "agency_only" | "private";
type BrainScope = "global" | "agency";

type Brain = {
  id?: string;
  name: string;
  domaintraveler: string | null;
  brain_type: BrainType;
  execution_layer: ExecutionLayer;
  brain_category: BrainCategory;
  scope: BrainScope;
  market_origin: string | null;
  market_destination: string | null;
  market_segment: string | null;
  language_priority: string[];
  capabilities: string[];
  model: string | null;
  target_lang: string | null;
  active: boolean;
  visibility_level: VisibilityLevel;
  identity_profile: Record<string, unknown>;
  strategic_concept: string;
  knowledge_bases: string[];
  monetization_model: string | null;
  business_rules: Record<string, unknown>;
  task_automation: string[];
  data_sources: string[];
  output_targets: string[];
  scheduling: Record<string, unknown> | null;
};

const BRAIN_TYPES: BrainType[] = ["inspira", "planifica", "acompana", "evalua", "operacional"];
const BRAIN_TYPE_LABELS: Record<BrainType, string> = {
  inspira: "Inspira",
  planifica: "Planifica",
  acompana: "Acompana",
  evalua: "Evalua",
  operacional: "Operacional",
};
const EXECUTION_LAYERS: ExecutionLayer[] = ["frontend", "backend"];
const EXECUTION_LAYER_LABELS: Record<ExecutionLayer, string> = {
  frontend: "Frontend",
  backend: "Backend",
};
const BRAIN_CATEGORIES: BrainCategory[] = ["traveler", "agency", "growth", "data", "operations"];
const BRAIN_CATEGORY_LABELS: Record<BrainCategory, string> = {
  traveler: "Traveler",
  agency: "Agency",
  growth: "Growth",
  data: "Data",
  operations: "Operations",
};
const VISIBILITY: VisibilityLevel[] = ["public", "agency_only", "private"];
const VISIBILITY_LABELS: Record<VisibilityLevel, string> = {
  public: "Publico",
  agency_only: "Solo agencia",
  private: "Privado",
};
const SCOPE_OPTIONS: BrainScope[] = ["global", "agency"];
const SCOPE_LABELS: Record<BrainScope, string> = {
  global: "Global",
  agency: "Por agencia",
};
const MONETIZATION_OPTIONS = ["commission", "service_fee", "subscription", "lead_gen", "internal"] as const;
const CAPABILITIES = [
  "inspire_content",
  "trip_planner",
  "flight_search",
  "hotel_search",
  "booking_manager",
  "auto_booking",
  "price_optimizer",
  "seo_generator",
  "ads_optimizer",
  "data_collector",
  "pdf_ingestion",
  "catalog_update",
  "catalog_recommendation",
  "quick_replies",
  "planning_handoff",
  "field_autofill",
  "validation_assistant",
  "catalog_draft_generation",
] as const;
const BACKEND_TASKS = ["seo_generator", "ads_optimizer", "data_collector", "pdf_ingestion", "catalog_update"] as const;
const DATA_SOURCES = ["google_trends", "search_console", "analytics", "supabase_logs"] as const;
const OUTPUT_TARGETS = ["google_ads", "blog_generator", "crm", "catalog_api"] as const;
const MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-5-turbo", "gemini-2.5-flash", "gemini-2.5-pro", "claude-3.5"];
const LANGUAGE_OPTIONS = ["es", "en", "ja", "fr", "de", "pt", "it"] as const;

function cn(...s: (string | false | undefined)[]) {
  return s.filter(Boolean).join(" ");
}

function ensureRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function createDefaultIdentityProfile(): Record<string, unknown> {
  return {
    tone: "cercano y experto",
    audience: "viajeros",
    persona: "concierge de viajes",
    style: "claro, directo y accionable",
  };
}

function createDefaultBusinessRules(): Record<string, unknown> {
  return {
    prioritize_catalog: true,
    avoid_fake_inventory: true,
    suggest_max_options: 3,
    channels: {
      chat: {
        enabled: true,
        objective: "Descubrir intencion, recomendar y cerrar siguiente paso.",
        ask_max_questions: 4,
        output_style: "markdown_claro",
      },
      planning: {
        enabled: true,
        objective: "Transformar necesidades en plan accionable y validado.",
        required_fields: ["destination", "travel_dates", "travelers", "budget_range"],
        validation_mode: "strict",
        output_style: "resumen_y_checklist",
      },
    },
  };
}

function normalizeIdentityProfile(value: unknown): Record<string, unknown> {
  return {
    ...createDefaultIdentityProfile(),
    ...ensureRecord(value),
  };
}

function normalizeBusinessRules(value: unknown): Record<string, unknown> {
  const base = createDefaultBusinessRules();
  const source = ensureRecord(value);

  const baseChannels = ensureRecord(base.channels);
  const sourceChannels = ensureRecord(source.channels);

  const baseChat = ensureRecord(baseChannels.chat);
  const sourceChat = ensureRecord(sourceChannels.chat);

  const basePlanning = ensureRecord(baseChannels.planning);
  const sourcePlanning = ensureRecord(sourceChannels.planning);

  return {
    ...base,
    ...source,
    channels: {
      ...baseChannels,
      ...sourceChannels,
      chat: {
        ...baseChat,
        ...sourceChat,
      },
      planning: {
        ...basePlanning,
        ...sourcePlanning,
      },
    },
  };
}

function isJSON(s: string) {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

function mdPreview(md: string) {
  let s = md || "";
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  s = s.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  s = s.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  s = s.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  s = s.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  s = s.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/^\- (.*)$/gm, "<li>$1</li>");
  s = s.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  s = s.replace(/\n/g, "<br/>");
  return s;
}

function createEmptyBrain(): Brain {
  return {
    name: "",
    domaintraveler: "",
    brain_type: "planifica",
    execution_layer: "frontend",
    brain_category: "traveler",
    scope: "global",
    market_origin: null,
    market_destination: null,
    market_segment: null,
    language_priority: ["es"],
    capabilities: ["inspire_content", "trip_planner"],
    model: "gemini-2.5-flash",
    target_lang: null,
    active: true,
    visibility_level: "public",
    identity_profile: createDefaultIdentityProfile(),
    strategic_concept: "# Travel Connector\n- Inspira y planifica\n- Usa catalogo real cuando exista\n- No inventes inventario ni precios.",
    knowledge_bases: [],
    monetization_model: "commission",
    business_rules: createDefaultBusinessRules(),
    task_automation: [],
    data_sources: [],
    output_targets: [],
    scheduling: null,
  };
}

function toJsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function normalizeBrain(row: Partial<Brain> & Record<string, unknown>): Brain {
  const empty = createEmptyBrain();
  return {
    ...empty,
    ...row,
    brain_type: (row.brain_type as BrainType) ?? empty.brain_type,
    execution_layer: (row.execution_layer as ExecutionLayer) ?? empty.execution_layer,
    brain_category: (row.brain_category as BrainCategory) ?? empty.brain_category,
    scope: (row.scope as BrainScope) ?? empty.scope,
    visibility_level: (row.visibility_level as VisibilityLevel) ?? empty.visibility_level,
    domaintraveler: ((row.execution_layer as ExecutionLayer) ?? empty.execution_layer) === "frontend" ? ((row.domaintraveler as string | null) ?? "") : null,
    market_origin: (row.market_origin as string | null) ?? null,
    market_destination: (row.market_destination as string | null) ?? null,
    market_segment: (row.market_segment as string | null) ?? null,
    language_priority: (row.language_priority as string[]) ?? [],
    capabilities: (row.capabilities as string[]) ?? [],
    model: (row.model as string | null) ?? empty.model,
    target_lang: (row.target_lang as string | null) ?? null,
    active: (row.active as boolean | null) ?? true,
    identity_profile: normalizeIdentityProfile(row.identity_profile),
    strategic_concept: (row.strategic_concept as string) ?? "",
    knowledge_bases: (row.knowledge_bases as string[]) ?? [],
    monetization_model: (row.monetization_model as string | null) ?? null,
    business_rules: normalizeBusinessRules(row.business_rules),
    task_automation: (row.task_automation as string[]) ?? [],
    data_sources: (row.data_sources as string[]) ?? [],
    output_targets: (row.output_targets as string[]) ?? [],
    scheduling: (row.scheduling as Record<string, unknown> | null) ?? null,
  };
}

function parseCommaList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      className={cn(
        "fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg",
        type === "success" ? "bg-green-600" : "bg-red-600"
      )}
    >
      {type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
      <span className="text-sm">{msg}</span>
    </motion.div>
  );
}

function StatsModal({ open, onClose, brain }: { open: boolean; onClose: () => void; brain: Brain | null }) {
  return (
    <ModalShell open={open} onClose={onClose} maxWidth="3xl" title={`Estadisticas - ${brain?.name ?? "-"}`} bodyClassName="p-6">
      <div className="rounded-lg border border-gray-200 p-6 text-sm text-gray-700">
        Este panel sigue en desarrollo. Aqui iran sesiones, uso por idioma, conversion y handoff a planning.
      </div>
    </ModalShell>
  );
}

function BrainWizardModal({ open, onClose, brainId, onSaved }: { open: boolean; onClose: () => void; brainId: string | null; onSaved: () => void }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Brain>(createEmptyBrain());
  const [identityText, setIdentityText] = useState(toJsonText(createEmptyBrain().identity_profile));
  const [businessRulesText, setBusinessRulesText] = useState(toJsonText(createEmptyBrain().business_rules));
  const [schedulingText, setSchedulingText] = useState("");
  const [knowledgeBasesText, setKnowledgeBasesText] = useState("");

  const isFrontend = form.execution_layer === "frontend";
  const identityIsJSON = isJSON(identityText);
  const businessIsJSON = isJSON(businessRulesText);
  const schedulingIsJSON = !schedulingText || isJSON(schedulingText);
  const canSave = form.name.trim().length > 0 && (!isFrontend || (form.domaintraveler || "").trim().length > 0) && identityIsJSON && businessIsJSON && schedulingIsJSON;

  useEffect(() => {
    if (!open) return;
    async function loadRefs() {
      const { data: countryRows } = await supabase.from("countries").select("code, name, emoji_flag").order("name");
      setCountries((countryRows as Country[]) || []);
    }
    void loadRefs();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    async function loadBrain() {
      if (!brainId) {
        const empty = createEmptyBrain();
        setForm(empty);
        setIdentityText(toJsonText(empty.identity_profile));
        setBusinessRulesText(toJsonText(empty.business_rules));
        setSchedulingText("");
        setKnowledgeBasesText("");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.from("ai_assistants").select("*").eq("id", brainId).single();
        if (error) throw error;
        const normalized = normalizeBrain((data as Record<string, unknown>) || {});
        setForm(normalized);
        setIdentityText(toJsonText(normalized.identity_profile));
        setBusinessRulesText(toJsonText(normalized.business_rules));
        setSchedulingText(normalized.scheduling ? toJsonText(normalized.scheduling) : "");
        setKnowledgeBasesText(normalized.knowledge_bases.join(", "));
      } catch (error) {
        console.error("Load brain error:", error);
      } finally {
        setLoading(false);
      }
    }
    void loadBrain();
  }, [open, brainId]);

  function update<K extends keyof Brain>(key: K, value: Brain[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(field: keyof Pick<Brain, "capabilities" | "language_priority" | "task_automation" | "data_sources" | "output_targets">, value: string) {
    setForm((prev) => {
      const current = new Set(prev[field] || []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [field]: Array.from(current) as Brain[typeof field] };
    });
  }

  async function onSave() {
    if (!canSave) return;
    setLoading(true);
    try {
      const parsedIdentity = normalizeIdentityProfile(JSON.parse(identityText));
      const parsedBusinessRules = normalizeBusinessRules(JSON.parse(businessRulesText));
      const payload = {
        name: form.name.trim(),
        domaintraveler: isFrontend ? (form.domaintraveler || "").trim() : null,
        brain_type: form.brain_type,
        execution_layer: form.execution_layer,
        brain_category: form.brain_category,
        scope: form.scope,
        owner_agency_id: null,
        created_for_agency_id: null,
        market_origin: form.market_origin,
        market_destination: form.market_destination,
        market_segment: form.market_segment,
        language_priority: form.language_priority,
        capabilities: form.capabilities,
        model: form.model,
        target_lang: form.target_lang,
        active: form.active,
        visibility_level: form.visibility_level,
        identity_profile: parsedIdentity,
        strategic_concept: form.strategic_concept,
        knowledge_bases: parseCommaList(knowledgeBasesText),
        monetization_model: form.monetization_model,
        business_rules: parsedBusinessRules,
        task_automation: form.task_automation,
        data_sources: form.data_sources,
        output_targets: form.output_targets,
        scheduling: schedulingText ? JSON.parse(schedulingText) : null,
      };

      if (brainId) {
        const { error } = await supabase.from("ai_assistants").update(payload).eq("id", brainId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_assistants").insert(payload);
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Save brain error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidth="6xl"
      title={brainId ? "Editar Brain" : "Crear Brain"}
      bodyClassName="max-h-[86vh] overflow-y-auto p-5"
    >

                <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-base font-semibold text-gray-900">Paso 1 · Identidad</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="text-sm text-gray-700">Nombre *</label>
                      <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.name} onChange={(e) => update("name", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Tipo *</label>
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.brain_type} onChange={(e) => update("brain_type", e.target.value as BrainType)}>
                        {BRAIN_TYPES.map((type) => <option key={type} value={type}>{BRAIN_TYPE_LABELS[type]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Capa *</label>
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.execution_layer} onChange={(e) => update("execution_layer", e.target.value as ExecutionLayer)}>
                        {EXECUTION_LAYERS.map((layer) => <option key={layer} value={layer}>{EXECUTION_LAYER_LABELS[layer]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Categoria *</label>
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.brain_category} onChange={(e) => update("brain_category", e.target.value as BrainCategory)}>
                        {BRAIN_CATEGORIES.map((category) => <option key={category} value={category}>{BRAIN_CATEGORY_LABELS[category]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Scope</label>
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.scope} onChange={(e) => update("scope", e.target.value as BrainScope)}>
                        {SCOPE_OPTIONS.map((scope) => <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Modelo IA</label>
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.model || ""} onChange={(e) => update("model", e.target.value || null)}>
                        {MODELS.map((model) => <option key={model} value={model}>{model}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Visibilidad</label>
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.visibility_level} onChange={(e) => update("visibility_level", e.target.value as VisibilityLevel)}>
                        {VISIBILITY.map((visibility) => <option key={visibility} value={visibility}>{VISIBILITY_LABELS[visibility]}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-7">
                      <input id="active" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600" checked={form.active} onChange={(e) => update("active", e.target.checked)} />
                      <label htmlFor="active" className="text-sm text-gray-700">Activo</label>
                    </div>
                    {isFrontend && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="text-sm text-gray-700">Domain logico frontend *</label>
                        <input className={cn("mt-1 w-full rounded-lg border px-3 py-2 text-sm", (form.domaintraveler || "").trim() ? "border-gray-300" : "border-red-400")} placeholder="ej. traveler.chat.intelliviajes" value={form.domaintraveler || ""} onChange={(e) => update("domaintraveler", e.target.value)} />
                        {!(form.domaintraveler || "").trim() && <p className="mt-1 text-xs text-red-600">Este campo es obligatorio para brains frontend.</p>}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    La asignacion de brains a agencias se gestiona solo en Setting &gt; Agencias.
                  </p>
                </section>

                <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-base font-semibold text-gray-900">Paso 2 · Mercado e idioma</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="text-sm text-gray-700">Pais de origen</label>
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.market_origin || ""} onChange={(e) => update("market_origin", e.target.value || null)}>
                        <option value="">-</option>
                        {countries.map((country) => <option key={country.code} value={country.code}>{country.emoji_flag} {country.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Pais destino</label>
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.market_destination || ""} onChange={(e) => update("market_destination", e.target.value || null)}>
                        <option value="">-</option>
                        {countries.map((country) => <option key={country.code} value={country.code}>{country.emoji_flag} {country.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Segmento de mercado</label>
                      <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="ej. family, premium, aventura" value={form.market_segment || ""} onChange={(e) => update("market_segment", e.target.value || null)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Idioma objetivo</label>
                      <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="ej. es, en, ja" value={form.target_lang || ""} onChange={(e) => update("target_lang", e.target.value || null)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Monetizacion</label>
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.monetization_model || ""} onChange={(e) => update("monetization_model", e.target.value || null)}>
                        <option value="">Sin definir</option>
                        {MONETIZATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm text-gray-700">Idiomas activos</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((lang) => {
                        const selected = form.language_priority.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => toggleArray("language_priority", lang)}
                            className={cn(
                              "rounded-full px-3 py-1 text-xs ring-1 transition",
                              selected ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                            )}
                          >
                            {lang.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-base font-semibold text-gray-900">Paso 3 · Capacidades y estrategia</h3>

                  <div className="mb-4">
                    <label className="text-sm text-gray-700">Capacidades</label>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {CAPABILITIES.map((capability) => {
                        const selected = form.capabilities.includes(capability);
                        return (
                          <label key={capability} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-50">
                            <input type="checkbox" className="h-4 w-4" checked={selected} onChange={() => toggleArray("capabilities", capability)} />
                            <span className="text-sm text-gray-800">{capability}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-gray-700">Strategic Concept (Markdown)</label>
                      <textarea rows={8} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.strategic_concept} onChange={(e) => update("strategic_concept", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Vista previa</label>
                      <div className="prose prose-sm mt-1 max-w-none rounded-lg border border-gray-200 p-3" dangerouslySetInnerHTML={{ __html: mdPreview(form.strategic_concept) }} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm text-gray-700">Identity Profile (JSON compartido)</label>
                        <button type="button" onClick={() => setIdentityText(toJsonText(createDefaultIdentityProfile()))} className="text-xs text-blue-700 hover:text-blue-800">
                          Restablecer plantilla
                        </button>
                      </div>
                      <textarea rows={8} className={cn("mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono", identityIsJSON ? "border-gray-300" : "border-red-400")} value={identityText} onChange={(e) => setIdentityText(e.target.value)} />
                      <p className="mt-1 text-xs text-gray-500">Define tono y voz global para chat y planning.</p>
                      {!identityIsJSON && <p className="mt-1 text-xs text-red-600">JSON invalido</p>}
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm text-gray-700">Business Rules (JSON por canal)</label>
                        <button type="button" onClick={() => setBusinessRulesText(toJsonText(createDefaultBusinessRules()))} className="text-xs text-blue-700 hover:text-blue-800">
                          Restablecer plantilla
                        </button>
                      </div>
                      <textarea rows={8} className={cn("mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono", businessIsJSON ? "border-gray-300" : "border-red-400")} value={businessRulesText} onChange={(e) => setBusinessRulesText(e.target.value)} />
                      <p className="mt-1 text-xs text-gray-500">
                        Usa `channels.chat` y `channels.planning` para activar/desactivar y definir objetivos/campos requeridos.
                      </p>
                      {!businessIsJSON && <p className="mt-1 text-xs text-red-600">JSON invalido</p>}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-gray-700">Knowledge Bases</label>
                      <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="ej. faq-japon, productos-premium, docs-operacion" value={knowledgeBasesText} onChange={(e) => setKnowledgeBasesText(e.target.value)} />
                      <p className="mt-1 text-xs text-gray-500">Separadas por coma.</p>
                    </div>
                  </div>
                </section>

                {form.execution_layer === "backend" && (
                  <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
                    <h3 className="mb-3 text-base font-semibold text-gray-900">Paso 4 · Automatizacion</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm text-gray-700">Tareas automaticas</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {BACKEND_TASKS.map((task) => {
                            const selected = form.task_automation.includes(task);
                            return (
                              <button key={task} type="button" onClick={() => toggleArray("task_automation", task)} className={cn("rounded-full px-3 py-1 text-xs ring-1 transition", selected ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50")}>
                                {task}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Fuentes de datos</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {DATA_SOURCES.map((source) => {
                            const selected = form.data_sources.includes(source);
                            return (
                              <button key={source} type="button" onClick={() => toggleArray("data_sources", source)} className={cn("rounded-full px-3 py-1 text-xs ring-1 transition", selected ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50")}>
                                {source}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Destinos</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {OUTPUT_TARGETS.map((target) => {
                            const selected = form.output_targets.includes(target);
                            return (
                              <button key={target} type="button" onClick={() => toggleArray("output_targets", target)} className={cn("rounded-full px-3 py-1 text-xs ring-1 transition", selected ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50")}>
                                {target}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Scheduling (JSON)</label>
                        <textarea rows={6} className={cn("mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono", schedulingIsJSON ? "border-gray-300" : "border-red-400")} value={schedulingText} onChange={(e) => setSchedulingText(e.target.value)} />
                        {!!schedulingText && !schedulingIsJSON && <p className="mt-1 text-xs text-red-600">JSON invalido</p>}
                      </div>
                    </div>
                  </section>
                )}

                <div className="mt-2 flex justify-end gap-3">
                  <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm">Cancelar</button>
                  <button onClick={onSave} disabled={loading || !canSave} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Guardar Brain
                  </button>
                </div>
    </ModalShell>
  );
}

export default function BrainsPage() {
  const [brains, setBrains] = useState<Brain[]>([]);
  const [filter, setFilter] = useState<"all" | "frontend" | "backend">("all");
  const [openWizard, setOpenWizard] = useState(false);
  const [editingBrainId, setEditingBrainId] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsBrain, setStatsBrain] = useState<Brain | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    void loadBrains();
  }, []);

  async function loadBrains() {
    const { data, error } = await supabase.from("ai_assistants").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Load brains error:", error);
      setBrains([]);
      return;
    }
    setBrains(((data as Record<string, unknown>[]) || []).map(normalizeBrain));
  }

  const filteredBrains = useMemo(() => {
    if (filter === "all") return brains;
    return brains.filter((brain) => brain.execution_layer === filter);
  }, [brains, filter]);

  function openCreate() {
    setEditingBrainId(null);
    setOpenWizard(true);
  }

  function openEdit(brainId: string) {
    setEditingBrainId(brainId);
    setOpenWizard(true);
  }

  async function onDelete(brain: Brain) {
    try {
      const { data: rels, error: relErr } = await supabase.from("agencies_ai_assistants").select("agency_id").eq("ai_assistant_id", brain.id);
      if (relErr) throw relErr;
      if ((rels || []).length > 0) {
        setToast({ msg: "No puedes eliminar este brain: esta asignado a una o mas agencias.", type: "error" });
        return;
      }
      if (!confirm(`Eliminar "${brain.name}"? Esta accion no se puede deshacer.`)) return;
      const { error } = await supabase.from("ai_assistants").delete().eq("id", brain.id);
      if (error) throw error;
      setToast({ msg: "Brain eliminado", type: "success" });
      await loadBrains();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el brain";
      console.error("Delete brain error:", error);
      setToast({ msg: message, type: "error" });
    }
  }

  async function onCopy(brain: Brain) {
    try {
      const payload = {
        ...brain,
        id: undefined,
        name: `${brain.name} (copia)`,
        active: false,
        domaintraveler: brain.execution_layer === "frontend" && brain.domaintraveler ? `${brain.domaintraveler}-copy` : null,
      };
      const { error } = await supabase.from("ai_assistants").insert({ ...payload, id: undefined });
      if (error) throw error;
      setToast({ msg: "Brain copiado", type: "success" });
      await loadBrains();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo copiar el brain";
      console.error("Copy brain error:", error);
      setToast({ msg: message, type: "error" });
    }
  }

  function openStats(brain: Brain) {
    setStatsBrain(brain);
    setStatsOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Brains</h1>
            <p className="text-sm text-gray-500">Gestiona brains por capa, alcance, mercado y comportamiento.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {(["all", "frontend", "backend"] as const).map((item) => (
                <button key={item} onClick={() => setFilter(item)} className={cn("rounded-full px-3 py-1.5 text-xs ring-1 transition", filter === item ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50")}>
                  {item === "all" ? "Todos" : EXECUTION_LAYER_LABELS[item]}
                </button>
              ))}
            </div>
            <button onClick={openCreate} className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Crear Brain
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredBrains.map((brain) => (
            <motion.div key={brain.id} whileHover={{ scale: 1.01 }} transition={{ duration: 0.12 }} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-gray-900">{brain.name}</div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs", brain.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{brain.active ? "Activo" : "Inactivo"}</span>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <div>Tipo: <span className="font-medium text-gray-800">{BRAIN_TYPE_LABELS[brain.brain_type]}</span> · Capa: <span className="font-medium text-gray-800">{EXECUTION_LAYER_LABELS[brain.execution_layer]}</span></div>
                <div>Categoria: <span className="font-medium text-gray-800">{BRAIN_CATEGORY_LABELS[brain.brain_category]}</span> · Scope: <span className="font-medium text-gray-800">{SCOPE_LABELS[brain.scope]}</span></div>
                <div>Mercado: <span className="font-medium text-gray-800">{(brain.market_origin || "-") + " -> " + (brain.market_destination || "-")}</span></div>
                <div>Idiomas: <span className="font-medium text-gray-800">{brain.language_priority.length ? brain.language_priority.map((item) => item.toUpperCase()).join(" · ") : "-"}</span></div>
                {brain.execution_layer === "frontend" && brain.domaintraveler && <div>Domain: <span className="font-medium text-gray-800">{brain.domaintraveler}</span></div>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => openEdit(brain.id!)} className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"><Edit3 className="mr-1.5 h-4 w-4" />Editar</button>
                <button onClick={() => onCopy(brain)} className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"><Copy className="mr-1.5 h-4 w-4" />Copiar</button>
                <button onClick={() => onDelete(brain)} className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-red-300 hover:bg-red-50"><Trash2 className="mr-1.5 h-4 w-4" />Eliminar</button>
                <button onClick={() => openStats(brain)} className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"><BarChart2 className="mr-1.5 h-4 w-4" />Estadisticas</button>
              </div>
            </motion.div>
          ))}

          {filteredBrains.length === 0 && <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">No hay brains para el filtro seleccionado.</div>}
        </div>
      </div>

      <BrainWizardModal open={openWizard} onClose={() => setOpenWizard(false)} brainId={editingBrainId} onSaved={async () => { await loadBrains(); setToast({ msg: "Brain guardado", type: "success" }); }} />
      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} brain={statsBrain} />
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  );
}

function X(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

