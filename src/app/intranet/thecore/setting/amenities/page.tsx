"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import ModalShell from "@/components/system/ModalShell";



// --- Tipos TS para Amenities ---
export type AmenityType = {
  id: string;
  name: string;
  description: string | null;
  scope: "global" | "agency";
  owner_agency_id: string | null;
  current_version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AmenityTypeField = {
  id?: string;
  amenity_type_version_id?: string;
  field_name: string;
  label: string;
  help_text?: string | null;
  input_type:
  | "text"
  | "textarea"
  | "number"
  | "integer"
  | "date"
  | "datetime"
  | "boolean"
  | "select"
  | "multiselect"
  | "url"
  | "currency"
  | "time";
  required: boolean;
  order: number;
  placeholder?: string | null;
  options?: any | null;
  validation?: any | null;
  conditional_logic?: any | null;
};

export type AmenityTypeComponent = {
  id?: string;
  amenity_type_version_id?: string;
  component_amenity_type_id: string;
  is_required: boolean;
  is_repeatable: boolean;
  order: number;
  relation_label?: string | null;
};

// --- Componente Skeleton para la carga ---
function AmenityCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 bg-gray-300 rounded w-1/2"></div>
        <div className="h-5 bg-gray-300 rounded-full w-16"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
      </div>
      <div className="flex justify-between items-center">
        <div className="h-5 bg-gray-300 rounded w-12"></div>
        <div className="flex space-x-2">
          <div className="h-8 bg-gray-300 rounded w-16"></div>
          <div className="h-8 bg-gray-300 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

export default function TheoCoreSettingsAmenitiesPage() {
  // --- estado principal ---
  const [loading, setLoading] = useState(true);
  const [amenities, setAmenities] = useState<AmenityType[]>([]);
  const [search, setSearch] = useState("");

  // modal state
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<AmenityType | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "fields" | "components">("general");

  // form state for General
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);

  // schema state
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [fields, setFields] = useState<AmenityTypeField[]>([]);
  const [components, setComponents] = useState<AmenityTypeComponent[]>([]);
  const [allAmenities, setAllAmenities] = useState<AmenityType[]>([]);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return amenities;
    const q = search.toLowerCase();
    return amenities.filter((t) =>
      [t.name, t.description ?? ""].some((s) => s.toLowerCase().includes(q))
    );
  }, [search, amenities]);

  // --- Toast notification ---
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAmenities = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("amenity_types")
      .select("*")
      .order("name", { ascending: true });
    setLoading(false);
    if (error) {
      console.error(error);
      showToast("Error al cargar amenities: " + error.message, "error");
      return;
    }
    setAmenities((data as AmenityType[]) || []);
  }, []);

  const loadAllAmenities = useCallback(async () => {
    const { data, error } = await supabase
      .from("amenity_types")
      .select("id, name, scope, current_version")
      .order("name", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setAllAmenities((data as AmenityType[]) || []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAmenities();
      void loadAllAmenities();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAmenities, loadAllAmenities]);

  async function openEditSlideOver(at: AmenityType) {
    setEditingAmenity(at);
    setFormName(at.name);
    setFormDesc(at.description ?? "");
    setFormActive(!!at.active);
    setActiveTab("general");
    await loadActiveSchema(at);
    setIsSlideOverOpen(true);
  }

  function closeSlideOver() {
    setIsSlideOverOpen(false);
    setTimeout(() => {
      setEditingAmenity(null);
      setFields([]);
      setComponents([]);
    }, 300);
  }

  async function loadActiveSchema(at: AmenityType) {
    setSchemaLoading(true);
    const { data: atv, error: eV } = await supabase
      .from("amenity_type_versions")
      .select("id, version_number")
      .eq("amenity_type_id", at.id)
      .eq("version_number", at.current_version)
      .maybeSingle();
    if (eV || !atv) {
      setSchemaLoading(false);
      if (eV) console.error(eV);
      return;
    }

    const [{ data: fData, error: fErr }, { data: cData, error: cErr }] = await Promise.all([
      supabase.from("amenity_type_fields").select("*").eq("amenity_type_version_id", atv.id).order("order", { ascending: true }),
      supabase.from("amenity_type_components").select("*").eq("amenity_type_version_id", atv.id).order("order", { ascending: true }),
    ]);

    if (fErr) console.error(fErr);
    if (cErr) console.error(cErr);

    setFields((fData as AmenityTypeField[]) || []);
    setComponents((cData as AmenityTypeComponent[]) || []);
    setSchemaLoading(false);
  }

  async function saveGeneral() {
    if (!editingAmenity) return;
    const { error } = await supabase
      .from("amenity_types")
      .update({ name: formName, description: formDesc, active: formActive })
      .eq("id", editingAmenity.id);
    if (error) {
      showToast("Error guardando la amenidad: " + error.message, "error");
      return;
    }
    await loadAmenities();
    showToast("Guardado con éxito", "success");
  }

  async function saveSchemaChanges() {
    if (!editingAmenity) return;
    const { data: newVersionNum, error: vErr } = await supabase.rpc("create_new_amenity_type_version", {
      p_amenity_type_id: editingAmenity.id,
      p_created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      p_notes: "Actualización desde UI (TheoCore)",
    });
    if (vErr) {
      showToast("Error creando nueva versión: " + vErr.message, "error");
      return;
    }

    const { data: atv, error: eV } = await supabase
      .from("amenity_type_versions")
      .select("id")
      .eq("amenity_type_id", editingAmenity.id)
      .eq("version_number", newVersionNum)
      .maybeSingle();
    if (eV || !atv) {
      showToast("No se pudo recuperar la nueva versión", "error");
      return;
    }

    await supabase.from("amenity_type_fields").delete().eq("amenity_type_version_id", atv.id);
    await supabase.from("amenity_type_components").delete().eq("amenity_type_version_id", atv.id);

    if (fields.length > 0) {
      const payloadFields = fields.map((f, idx) => ({
        amenity_type_version_id: atv.id,
        field_name: f.field_name,
        label: f.label,
        help_text: f.help_text ?? null,
        input_type: f.input_type,
        required: !!f.required,
        order: typeof f.order === "number" ? f.order : idx * 10 + 10,
        placeholder: f.placeholder ?? null,
        options: f.options ?? null,
        validation: f.validation ?? null,
        conditional_logic: f.conditional_logic ?? null,
      }));
      const { error: fErr } = await supabase.from("amenity_type_fields").insert(payloadFields);
      if (fErr) {
        showToast("Error insertando campos: " + fErr.message, "error");
        return;
      }
    }

    if (components.length > 0) {
      const payloadComps = components.map((c, idx) => ({
        amenity_type_version_id: atv.id,
        component_amenity_type_id: c.component_amenity_type_id,
        is_required: !!c.is_required,
        is_repeatable: !!c.is_repeatable,
        order: typeof c.order === "number" ? c.order : idx * 10 + 10,
        relation_label: c.relation_label ?? null,
      }));
      const { error: cErr } = await supabase.from("amenity_type_components").insert(payloadComps);
      if (cErr) {
        showToast("Error insertando componentes: " + cErr.message, "error");
        return;
      }
    }

    await loadAmenities();
    const a = (await supabase.from("amenity_types").select("*").eq("id", editingAmenity.id).maybeSingle())
      .data as AmenityType | null;
    if (a) {
      setEditingAmenity(a);
      await loadActiveSchema(a);
    }

    showToast("Esquema guardado y versionado con éxito", "success");
  }

  // --- utilidades UI para Fields ---
  function addField() {
    setFields((prev) => [
      ...prev,
      {
        field_name: "nuevo_campo_" + (prev.length + 1),
        label: "Nuevo campo",
        input_type: "text",
        required: false,
        order: (prev.length + 1) * 10,
      },
    ]);
  }
  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateField<K extends keyof AmenityTypeField>(idx: number, key: K, value: AmenityTypeField[K]) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  }

  // --- utilidades UI para Components ---
  function addComponent() {
    const firstAmenity = allAmenities[0]?.id ?? "";
    setComponents((prev) => [
      ...prev,
      {
        component_amenity_type_id: firstAmenity,
        is_required: false,
        is_repeatable: false,
        order: (prev.length + 1) * 10,
        relation_label: "Sub-componente",
      },
    ]);
  }
  function removeComponent(idx: number) {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateComponent<K extends keyof AmenityTypeComponent>(idx: number, key: K, value: AmenityTypeComponent[K]) {
    setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, [key]: value } : c)));
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setCreateName("");
    setCreateDesc("");
    setCreateActive(true);
  }

  async function createNewAmenity() {
    const name = createName.trim();
    if (!name) {
      showToast("El nombre es obligatorio", "error");
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from("amenity_types")
      .insert({ name, description: createDesc.trim() || null, active: createActive, scope: "global" })
      .select("*")
      .single();

    if (error) {
      setCreating(false);
      showToast("Error creando amenidad: " + error.message, "error");
      return;
    }

    await supabase.rpc("create_new_amenity_type_version", {
      p_amenity_type_id: data.id,
      p_created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      p_notes: "Version inicial (UI)",
    });

    await loadAmenities();
    setCreating(false);
    closeCreateModal();
    showToast("Amenidad creada", "success");
  }

  async function deleteAmenity(at: AmenityType) {
    if (!confirm(`¿Eliminar la amenidad "${at.name}" y todas sus versiones?`)) return;
    const { error } = await supabase.from("amenity_types").delete().eq("id", at.id);
    if (error) {
      showToast("No se pudo eliminar: " + error.message, "error");
      return;
    }
    await loadAmenities();
    showToast("Amenidad eliminada", "success");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Settings · Amenities</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
                placeholder="Buscar amenidad o descripción"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition active:scale-95"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Nueva Amenidad
            </button>
          </div>
        </div>

        {/* Amenity List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <AmenityCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((at) => (
              <div
                key={at.id}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 truncate">{at.name}</h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${at.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {at.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-6 flex-grow line-clamp-3">{at.description || "Sin descripción"}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">v{at.current_version}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                      onClick={() => openEditSlideOver(at)}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                      onClick={() => deleteAmenity(at)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No se encontraron amenities.
              </div>
            )}
          </div>
        )}
      </div>

      <ModalShell
        open={isCreateModalOpen}
        onClose={closeCreateModal}
        maxWidth="lg"
        title="Nueva amenidad"
        bodyClassName="p-5"
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={closeCreateModal}
            >
              Cancelar
            </button>
            <button
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void createNewAmenity()}
              disabled={creating}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre *</label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ej: Wifi, Transporte, Guia..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripcion</label>
            <textarea
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="Descripcion corta de la amenidad"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="create-active"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={createActive}
              onChange={(e) => setCreateActive(e.target.checked)}
            />
            <label htmlFor="create-active" className="text-sm text-gray-700">
              Activa
            </label>
          </div>
        </div>
      </ModalShell>

      {/* Slide-Over Modal */}
      <div className={`fixed inset-0 z-50 ${isSlideOverOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 ${isSlideOverOpen ? '' : 'pointer-events-none'}`}>
          {/* Fondo oscuro */}
          <div className={`absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity ${isSlideOverOpen ? 'opacity-100' : 'opacity-0'}`} onClick={closeSlideOver}></div>

          {/* Modal centrado */}
          <section className={`absolute inset-0 flex items-center justify-center p-4 transition-all duration-300 ${isSlideOverOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="flex flex-col h-full">
                {/* Header del modal */}
                <div className="bg-white px-5 py-4 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-semibold text-gray-900" id="slide-over-title">
                      Editar: {editingAmenity?.name}
                    </h2>
                    <div className="ml-3 h-7 flex items-center">
                      <button className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" onClick={closeSlideOver}>
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-4 sm:px-6">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {(["general", "fields", "components"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`${activeTab === tab
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors`}
                      >
                        {tab === "general" ? "General" : tab === "fields" ? "Campos" : "Componentes"}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Contenido del modal */}
                <div className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto">
                  {/* (El contenido de las pestañas es idéntico al del modal de productos, solo cambia el estado) */}
                  {activeTab === "general" && (
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-gray-700">Nombre</label><input className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
                      <div><label className="block text-sm font-medium text-gray-700">Descripción</label><textarea rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>
                      <div className="flex items-center"><input id="active-switch" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} /><label htmlFor="active-switch" className="ml-2 block text-sm text-gray-900">Activo</label></div>
                    </div>
                  )}
                  {activeTab === "fields" && (
                    <div>
                      <div className="flex justify-between items-center mb-4"><h4 className="text-lg font-medium text-gray-900">Campos de la versión activa</h4><button className="btn btn-sm btn-outline-primary" onClick={addField}><Plus className="h-4 w-4 mr-1" /> Añadir campo</button></div>
                      {schemaLoading ? (<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>) : (
                        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50"><tr>{["#", "Clave", "Etiqueta", "Tipo", "Req", "Orden", "Placeholder", "Opciones", "Validación", "Condicional", ""].map((h) => (<th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>))}</tr></thead>
                          <tbody className="bg-white divide-y divide-gray-200">{fields.map((f, idx) => (<tr key={idx}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2 whitespace-nowrap"><input className="form-input w-full" value={f.field_name} onChange={(e) => updateField(idx, "field_name", e.target.value)} /></td>
                            <td className="px-3 py-2 whitespace-nowrap"><input className="form-input w-full" value={f.label} onChange={(e) => updateField(idx, "label", e.target.value)} /></td>
                            <td className="px-3 py-2 whitespace-nowrap"><select className="form-select w-full" value={f.input_type} onChange={(e) => updateField(idx, "input_type", e.target.value as any)}>{["text", "textarea", "number", "integer", "date", "datetime", "boolean", "select", "multiselect", "url", "currency", "time"].map((opt) => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
                            <td className="px-3 py-2 whitespace-nowrap text-center"><input type="checkbox" className="form-checkbox" checked={!!f.required} onChange={(e) => updateField(idx, "required", e.target.checked)} /></td>
                            <td className="px-3 py-2 whitespace-nowrap"><input type="number" className="form-input w-20" value={f.order} onChange={(e) => updateField(idx, "order", Number(e.target.value))} /></td>
                            <td className="px-3 py-2 whitespace-nowrap"><input className="form-input w-full" value={f.placeholder ?? ""} onChange={(e) => updateField(idx, "placeholder", e.target.value)} /></td>
                            <td className="px-3 py-2 whitespace-nowrap"><textarea className="form-input w-full text-xs" rows={1} value={JSON.stringify(f.options ?? null) || ""} onChange={(e) => { try { updateField(idx, "options", JSON.parse(e.target.value || "null")); } catch { } }} /></td>
                            <td className="px-3 py-2 whitespace-nowrap"><textarea className="form-input w-full text-xs" rows={1} value={JSON.stringify(f.validation ?? null) || ""} onChange={(e) => { try { updateField(idx, "validation", JSON.parse(e.target.value || "null")); } catch { } }} /></td>
                            <td className="px-3 py-2 whitespace-nowrap"><textarea className="form-input w-full text-xs" rows={1} value={JSON.stringify(f.conditional_logic ?? null) || ""} onChange={(e) => { try { updateField(idx, "conditional_logic", JSON.parse(e.target.value || "null")); } catch { } }} /></td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => removeField(idx)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button></td>
                          </tr>))}</tbody>
                        </table></div>
                      )}
                    </div>
                  )}
                  {activeTab === "components" && (
                    <div>
                      <div className="flex justify-between items-center mb-4"><h4 className="text-lg font-medium text-gray-900">Componentes de la versión activa</h4><button className="btn btn-sm btn-outline-primary" onClick={addComponent}><Plus className="h-4 w-4 mr-1" /> Añadir componente</button></div>
                      {schemaLoading ? (<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>) : (
                        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50"><tr>{["#", "Tipo de componente", "Requerido", "Repetible", "Orden", "Etiqueta relación", ""].map((h) => (<th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>))}</tr></thead>
                          <tbody className="bg-white divide-y divide-gray-200">{components.map((c, idx) => (<tr key={idx}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2 whitespace-nowrap"><select className="form-select w-full" value={c.component_amenity_type_id} onChange={(e) => updateComponent(idx, "component_amenity_type_id", e.target.value)}>{allAmenities.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></td>
                            <td className="px-3 py-2 whitespace-nowrap text-center"><input type="checkbox" className="form-checkbox" checked={!!c.is_required} onChange={(e) => updateComponent(idx, "is_required", e.target.checked)} /></td>
                            <td className="px-3 py-2 whitespace-nowrap text-center"><input type="checkbox" className="form-checkbox" checked={!!c.is_repeatable} onChange={(e) => updateComponent(idx, "is_repeatable", e.target.checked)} /></td>
                            <td className="px-3 py-2 whitespace-nowrap"><input type="number" className="form-input w-20" value={c.order} onChange={(e) => updateComponent(idx, "order", Number(e.target.value))} /></td>
                            <td className="px-3 py-2 whitespace-nowrap"><input className="form-input w-full" value={c.relation_label ?? ""} onChange={(e) => updateComponent(idx, "relation_label", e.target.value)} /></td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => removeComponent(idx)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button></td>
                          </tr>))}</tbody>
                        </table></div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer del modal */}
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <div className="flex justify-end space-x-3">
                    {activeTab !== "general" ? (
                      <button type="button" className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:w-auto sm:text-sm" onClick={saveSchemaChanges}>Guardar esquema (crea nueva versión)</button>
                    ) : (
                      <button type="button" className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm" onClick={saveGeneral}>Guardar General</button>
                    )}
                    <button type="button" className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm" onClick={closeSlideOver}>Cerrar</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg transition-all transform ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.type === "success" ? <CheckCircle className="h-5 w-5 mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
