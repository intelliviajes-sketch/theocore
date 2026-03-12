"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { Transition, Listbox } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import ModalShell from "@/components/system/ModalShell";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  History,
  Settings2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";


/* =========================================================
   Tipos
========================================================= */
type ProductType = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  current_version: number;
  created_at: string;
  updated_at: string;
};

type ProductTypeVersion = {
  id: string;
  product_type_id: string;
  version_number: number;
  notes: string | null;
  created_at: string;
};

type FieldInputType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date";

type ProductTypeField = {
  id: string;
  product_type_version_id: string;
  field_name: string;
  label: string;
  help_text: string | null;
  input_type: FieldInputType;
  required: boolean;
  order: number;
  placeholder: string | null;
  options: any | null; // string[] cuando aplica
  validation: any | null;
  conditional_logic: any | null;
  created_at: string;
};

type AmenityOption = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

type ProductTypeAmenityLink = {
  id?: string;
  product_type_version_id: string;
  amenity_type_id: string;
  required: boolean;
  order: number;
};

/* =========================================================
   Utilidades UI
========================================================= */
function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="mb-4 flex items-start justify-between">
        <div className="h-6 w-1/2 rounded bg-gray-200" />
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="mb-4 h-4 w-5/6 rounded bg-gray-200" />
      <div className="flex items-center justify-between">
        <div className="h-5 w-10 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded bg-gray-200" />
          <div className="h-8 w-8 rounded bg-gray-200" />
          <div className="h-8 w-8 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      className={`fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg ${type === "success" ? "bg-green-600" : "bg-red-600"
        }`}
    >
      {type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
      <span className="text-sm">{message}</span>
    </motion.div>
  );
}

/* =========================================================
   Modal CRUD centrado (Create/Edit)
========================================================= */
function CenterModal({
  open,
  title,
  mode, // "create" | "edit"
  initialName,
  initialDesc,
  initialActive,
  saving,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  mode: "create" | "edit";
  initialName: string;
  initialDesc: string;
  initialActive: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (form: { name: string; description: string; active: boolean }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc);
  const [active, setActive] = useState(initialActive);

  const disabled = saving || name.trim().length === 0;

  return (
    <ModalShell
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="lg"
      bodyClassName="p-6"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ name, description: desc, active })}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre *</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:border-blue-500 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Tour, Hotel, Circuito..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripcion</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:border-blue-500 focus:ring-blue-500"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripcion corta del tipo de producto"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            id="active-switch"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <label htmlFor="active-switch" className="text-sm text-gray-900">
            Activo
          </label>
        </div>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   Editor de Campo (Create/Edit) con opciones amigables
========================================================= */
function FieldEditorModal({
  open,
  onClose,
  mode,
  versionId,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  versionId: string;
  initial?: Partial<ProductTypeField> | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const [fieldName, setFieldName] = useState(initial?.field_name ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [help, setHelp] = useState(initial?.help_text ?? "");
  const [type, setType] = useState<FieldInputType>((initial?.input_type as FieldInputType) ?? "text");
  const [required, setRequired] = useState<boolean>(!!initial?.required);
  const [placeholder, setPlaceholder] = useState(initial?.placeholder ?? "");
  const [order, setOrder] = useState<number>(initial?.order ?? 0);
  const [options, setOptions] = useState<string[]>(
    Array.isArray(initial?.options) ? initial?.options : []
  );

  useEffect(() => {
    if (open) {
      setFieldName(initial?.field_name ?? "");
      setLabel(initial?.label ?? "");
      setHelp(initial?.help_text ?? "");
      setType((initial?.input_type as FieldInputType) ?? "text");
      setRequired(!!initial?.required);
      setPlaceholder(initial?.placeholder ?? "");
      setOrder(initial?.order ?? 0);
      setOptions(Array.isArray(initial?.options) ? initial?.options : []);
    }
  }, [open, initial]);

  const fieldTypes: FieldInputType[] = ["text", "number", "textarea", "select", "radio", "checkbox", "date"];
  const needsOptions = type === "select" || type === "radio";

  const canSave =
    fieldName.trim().length > 0 &&
    label.trim().length > 0 &&
    (!needsOptions || options.length > 0) &&
    !saving;

  async function save() {
    setSaving(true);
    const payload: any = {
      product_type_version_id: versionId,
      field_name: fieldName.trim(),
      label: label.trim(),
      help_text: help.trim() || null,
      input_type: type,
      required,
      order,
      placeholder: placeholder.trim() || null,
      options: needsOptions ? options : null,
    };

    try {
      if (mode === "edit" && initial?.id) {
        const { error } = await supabase
          .from("product_type_fields")
          .update(payload)
          .eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_type_fields").insert(payload);
        if (error) throw error;
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Save field error:", err);
    } finally {
      setSaving(false);
    }
  }

  function addOption() {
    const v = prompt("Nueva opcion:");
    if (!v) return;
    setOptions((prev) => [...prev, v]);
  }
  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidth="2xl"
      title={mode === "create" ? "Nuevo campo" : `Editar campo: ${initial?.label ?? ""}`}
      bodyClassName="p-6"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Crear campo" : "Guardar cambios"}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Identificador (field_name) *</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="ej: precio, duracion, hotel_categoria"
          />
          <p className="mt-1 text-xs text-gray-500">Debe ser unico por version. Sin espacios.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Etiqueta visible (label) *</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: Precio por persona"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de campo *</label>
          <Listbox value={type} onChange={setType}>
            <div className="relative mt-1">
              <Listbox.Button className="relative w-full cursor-default rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <span className="block truncate">{type}</span>
              </Listbox.Button>
              <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                  {["text", "number", "textarea", "select", "radio", "checkbox", "date"].map((t) => (
                    <Listbox.Option key={t} value={t as FieldInputType} className="cursor-pointer select-none px-3 py-2 text-gray-700 hover:bg-gray-50">
                      {t}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Placeholder</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            placeholder="Ej: Ingrese el precio en USD"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Ayuda (help_text)</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            value={help}
            onChange={(e) => setHelp(e.target.value)}
            placeholder="Texto de ayuda para el usuario"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="required"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          <label htmlFor="required" className="text-sm text-gray-900">Obligatorio</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Orden</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value || "0", 10))}
          />
        </div>
      </div>

      {needsOptions && (
        <div className="mt-6 rounded-lg border border-gray-200 p-4">
          <div className="mb-2 text-sm font-medium text-gray-700">Opciones ({options.length})</div>
          <div className="flex flex-wrap gap-2">
            {options.map((opt, idx) => (
              <span key={idx} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
                {opt}
                <button
                  onClick={() => removeOption(idx)}
                  className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700 hover:bg-red-200"
                >
                  eliminar
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3">
            <button
              onClick={addOption}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + Anadir opcion
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* =========================================================
   Modal de Campos por Version + Vista previa "Card"
========================================================= */
function FieldsModal({
  open,
  onClose,
  version,
  productTypeName,
}: {
  open: boolean;
  onClose: () => void;
  version: ProductTypeVersion | null;
  productTypeName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<ProductTypeField[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingField, setEditingField] = useState<ProductTypeField | null>(null);

  async function loadFields() {
    if (!version) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_type_fields")
      .select("*")
      .eq("product_type_version_id", version.id)
      .order("order", { ascending: true })
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      console.error("Load fields error:", error);
      return;
    }
    setFields((data as ProductTypeField[]) || []);
  }

  useEffect(() => {
    if (open && version?.id) void loadFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, version?.id]);

  function openCreate() {
    setEditorMode("create");
    setEditingField(null);
    setEditorOpen(true);
  }
  function openEdit(field: ProductTypeField) {
    setEditorMode("edit");
    setEditingField(field);
    setEditorOpen(true);
  }

  async function deleteField(field: ProductTypeField) {
    if (!confirm(`Eliminar el campo "${field.label}"?`)) return;
    const { error } = await supabase.from("product_type_fields").delete().eq("id", field.id);
    if (error) {
      console.error("Delete field error:", error);
      return;
    }
    await loadFields();
  }

  async function moveField(field: ProductTypeField, dir: "up" | "down") {
    if (!fields.length) return;
    const idx = fields.findIndex((f) => f.id === field.id);
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= fields.length) return;

    const other = fields[newIdx];
    // swap "order"
    const f1 = { id: field.id, order: other.order };
    const f2 = { id: other.id, order: field.order };

    let { error } = await supabase.rpc("update_two_fields_order", {
      a_id: f1.id,
      a_order: f1.order,
      b_id: f2.id,
      b_order: f2.order,
    });

    if (error) {
      const e1 = await supabase.from("product_type_fields").update({ order: f1.order }).eq("id", f1.id);
      const e2 = await supabase.from("product_type_fields").update({ order: f2.order }).eq("id", f2.id);
      error = e1.error || e2.error;
    }

    if ((error as any)?.message) {
      console.error("Reorder error:", error);
    }
    await loadFields();
  }

  // Vista previa del formulario (card completa)
  // Vista previa del formulario (card completa)
  function PreviewCard() {
    // Funcion segura para mostrar opciones correctamente
    const resolveOptionLabel = (opt: any) => {
      if (typeof opt === "string") return opt;
      if (typeof opt === "number") return opt.toString();
      if (opt?.label) return opt.label;
      if (opt?.value) return opt.value;
      // Si es un objeto sin label/value, lo convertimos a string legible
      return JSON.stringify(opt);
    };

    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {productTypeName}  -  Vista previa (v{version?.version_number})
          </h3>
          <p className="text-sm text-gray-500">Asi vera el usuario final el formulario dinamico.</p>
        </div>
        <div className="space-y-4 p-4">
          {fields.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-500">
              No hay campos aun. Agrega algunos para ver la vista previa aqui..
            </div>
          ) : (
            fields.map((f) => (
              <div key={f.id} className="space-y-1">
                {/* Etiqueta */}
                <label className="block text-sm font-medium text-gray-700">
                  {f.label}
                  {f.required && <span className="ml-1 text-red-600">*</span>}
                </label>

                {/* Campo segun tipo */}
                {(() => {
                  switch (f.input_type) {
                    case "text":
                      return (
                        <input
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          placeholder={f.placeholder ?? ""}
                        />
                      );
                    case "number":
                      return (
                        <input
                          type="number"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          placeholder={f.placeholder ?? ""}
                        />
                      );
                    case "textarea":
                      return (
                        <textarea
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          placeholder={f.placeholder ?? ""}
                        />
                      );
                    case "select":
                      return (
                        <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                          <option value="">Selecciona una opcion</option>
                          {(Array.isArray(f.options) ? f.options : []).map((opt: any, i: number) => {
                            const value = resolveOptionLabel(opt);
                            return (
                              <option key={i} value={value}>
                                {value}
                              </option>
                            );
                          })}
                        </select>
                      );
                    case "radio":
                      return (
                        <div className="flex flex-wrap gap-3">
                          {(Array.isArray(f.options) ? f.options : []).map((opt: any, i: number) => {
                            const value = resolveOptionLabel(opt);
                            return (
                              <label key={i} className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input type="radio" name={f.field_name} className="text-blue-600 focus:ring-blue-500" />
                                {value}
                              </label>
                            );
                          })}
                        </div>
                      );
                    case "checkbox":
                      return (
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" className="text-blue-600 focus:ring-blue-500" />
                          {f.placeholder ?? "Marcar si aplica"}
                        </label>
                      );
                    case "date":
                      return (
                        <input
                          type="date"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      );
                    default:
                      return <div className="text-sm text-gray-500">Tipo de campo no soportado.</div>;
                  }
                })()}

                {f.help_text && <p className="text-xs text-gray-500">{f.help_text}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }


  return (
    <>
      <ModalShell
        open={open}
        onClose={onClose}
        maxWidth="5xl"
        title={`Campos - ${productTypeName} - v${version?.version_number ?? "-"}`}
        bodyClassName="p-6"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">Campos ({fields.length})</h4>
              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar campo
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="max-h-[60vh] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : fields.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">No hay campos en esta version.</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Orden", "Campo", "Tipo", "Req.", "Acciones"].map((h) => (
                          <th key={h} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {fields.map((f, i) => (
                        <tr key={f.id}>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <button
                                disabled={i === 0}
                                onClick={() => moveField(f, "up")}
                                className="rounded-md p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                                title="Subir"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                disabled={i === fields.length - 1}
                                onClick={() => moveField(f, "down")}
                                className="rounded-md p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                                title="Bajar"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <div className="font-medium text-gray-900">{f.label}</div>
                            <div className="text-xs text-gray-500">{f.field_name}</div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">{f.input_type}</td>
                          <td className="px-3 py-2 text-sm">{f.required ? "Si" : "No"}</td>
                          <td className="px-3 py-2 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEdit(f)}
                                className="rounded-md px-2 py-1 text-blue-700 hover:bg-blue-50"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => deleteField(f)}
                                className="rounded-md px-2 py-1 text-red-700 hover:bg-red-50"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div>
            <PreviewCard />
          </div>
        </div>
      </ModalShell>

      {/* Editor de campo */}
      <FieldEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        mode={editorMode}
        versionId={version?.id || ""}
        initial={editingField || undefined}
        onSaved={loadFields}
      />
    </>
  );
}

/* =========================================================
   Modal de Amenities por Version
========================================================= */
function AmenitiesModal({
  open,
  onClose,
  version,
}: {
  open: boolean;
  onClose: () => void;
  version: ProductTypeVersion | null;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [amenities, setAmenities] = useState<AmenityOption[]>([]);
  const [selected, setSelected] = useState<Record<string, { required: boolean; order: number }>>({});

  useEffect(() => {
    if (open && version?.id) {
      void loadAmenities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, version?.id]);

  async function loadAmenities() {
    if (!version) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const [amenitiesRes, linksRes] = await Promise.all([
        supabase
          .from('amenity_types')
          .select('id, name, description, active')
          .eq('active', true)
          .order('name', { ascending: true }),
        supabase
          .from('product_type_version_amenities')
          .select('id, product_type_version_id, amenity_type_id, required, order')
          .eq('product_type_version_id', version.id)
          .order('order', { ascending: true }),
      ]);

      if (amenitiesRes.error) throw amenitiesRes.error;
      if (linksRes.error) throw linksRes.error;

      setAmenities((amenitiesRes.data as AmenityOption[]) || []);
      const nextSelected = ((linksRes.data as ProductTypeAmenityLink[]) || []).reduce<
        Record<string, { required: boolean; order: number }>
      >((acc, link, index) => {
        acc[link.amenity_type_id] = {
          required: !!link.required,
          order: typeof link.order === 'number' ? link.order : index * 10 + 10,
        };
        return acc;
      }, {});
      setSelected(nextSelected);
    } catch (error) {
      console.error('Load amenities error:', error);
      setErrorMessage('Necesitas ejecutar la migracion product_type_version_amenities para usar esta seccion.');
      setAmenities([]);
      setSelected({});
    } finally {
      setLoading(false);
    }
  }

  function toggleAmenity(amenityId: string, checked: boolean, index: number) {
    setSelected((current) => {
      if (!checked) {
        const next = { ...current };
        delete next[amenityId];
        return next;
      }

      return {
        ...current,
        [amenityId]: current[amenityId] || { required: false, order: index * 10 + 10 },
      };
    });
  }

  function setAmenityRequired(amenityId: string, required: boolean) {
    setSelected((current) => {
      const entry = current[amenityId];
      if (!entry) return current;
      return {
        ...current,
        [amenityId]: {
          ...entry,
          required,
        },
      };
    });
  }

  async function saveAmenities() {
    if (!version) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      const payload = Object.entries(selected).map(([amenityTypeId, config]) => ({
        product_type_version_id: version.id,
        amenity_type_id: amenityTypeId,
        required: config.required,
        order: config.order,
      }));

      const { error: deleteError } = await supabase
        .from('product_type_version_amenities')
        .delete()
        .eq('product_type_version_id', version.id);
      if (deleteError) throw deleteError;

      if (payload.length > 0) {
        const { error: insertError } = await supabase.from('product_type_version_amenities').insert(payload);
        if (insertError) throw insertError;
      }

      onClose();
    } catch (error) {
      console.error('Save amenities error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron guardar los amenities.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidth="3xl"
      title={`Amenities de la version v${version?.version_number ?? "-"}`}
      subtitle="Define que amenities aplica este tipo de producto y cuales son obligatorios en catalogo."
      bodyClassName="p-6"
    >

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : amenities.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No hay amenities activos disponibles.</div>
          ) : (
            amenities.map((amenity, index) => {
              const entry = selected[amenity.id];
              const included = !!entry;
              return (
                <div key={amenity.id} className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">{amenity.name}</div>
                    <div className="text-sm text-gray-500">{amenity.description || "Sin descripcion"}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={included}
                        onChange={(event) => toggleAmenity(amenity.id, event.target.checked, index)}
                      />
                      Incluir
                    </label>
                    <label className={`inline-flex items-center gap-2 text-sm ${included ? "text-gray-700" : "text-gray-400"}`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                        checked={included && !!entry?.required}
                        disabled={!included}
                        onChange={(event) => setAmenityRequired(amenity.id, event.target.checked)}
                      />
                      Requerido
                    </label>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-sm text-gray-500">
          Seleccionados: <span className="font-medium text-gray-700">{Object.keys(selected).length}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => void saveAmenities()}
            disabled={saving || loading || !version}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar amenities
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   Modal de Versiones (centrado) con boton "Campos"
========================================================= */
function VersionsModal({
  open,
  onClose,
  productType,
  openFieldsForVersion,
  openAmenitiesForVersion,
}: {
  open: boolean;
  onClose: () => void;
  productType: ProductType | null;
  openFieldsForVersion: (v: ProductTypeVersion) => void;
  openAmenitiesForVersion: (v: ProductTypeVersion) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<ProductTypeVersion[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && productType) void loadVersions(productType.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productType?.id]);

  async function loadVersions(productTypeId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_type_versions")
      .select("id, product_type_id, version_number, notes, created_at")
      .eq("product_type_id", productTypeId)
      .order("version_number", { ascending: false });

    setLoading(false);
    if (error) {
      console.error("Load versions error:", error);
      return;
    }
    setVersions((data as ProductTypeVersion[]) || []);
  }

  async function createVersion() {
    if (!productType) return;
    try {
      setCreating(true);
      const nextVersion = (versions[0]?.version_number ?? productType.current_version ?? 0) + 1;
      const { error } = await supabase
        .from("product_type_versions")
        .insert({
          product_type_id: productType.id,
          version_number: nextVersion,
          notes: null,
        });
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("product_types")
        .update({ current_version: nextVersion })
        .eq("id", productType.id);
      if (updateError) throw updateError;

      await loadVersions(productType.id);
    } catch (err) {
      console.error("Create version error:", err);
    } finally {
      setCreating(false);
    }
  }
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidth="3xl"
      title={`Versiones - ${productType?.name ?? ""}`}
      bodyClassName="p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {productType && (
            <>
              Version activa actual: <b className="text-gray-800">v{productType.current_version}</b>
            </>
          )}
        </div>
        <button
          onClick={createVersion}
          disabled={creating}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Nueva version
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Este tipo no tiene versiones.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Version", "Creado", "Acciones"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">v{v.version_number}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{new Date(v.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openFieldsForVersion(v)}
                          className="rounded-md px-3 py-1.5 text-violet-700 hover:bg-violet-50"
                        >
                          Campos
                        </button>
                        <button
                          onClick={() => openAmenitiesForVersion(v)}
                          className="rounded-md px-3 py-1.5 text-emerald-700 hover:bg-emerald-50"
                        >
                          Amenities
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   Pagina principal (CRUD + Versiones + Campos)
========================================================= */
export default function ProductTypesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [search, setSearch] = useState("");

  // Modal CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<ProductType | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);

  // Versiones
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [focusedType, setFocusedType] = useState<ProductType | null>(null);

  // Campos (modal anidado)
  const [isFieldsOpen, setIsFieldsOpen] = useState(false);
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);
  const [focusedVersion, setFocusedVersion] = useState<ProductTypeVersion | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => [t.name, t.description ?? ""].some((s) => s.toLowerCase().includes(q)));
  }, [types, search]);

  useEffect(() => {
    void loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTypes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_types")
      .select("id, name, description, active, current_version, created_at, updated_at")
      .order("name", { ascending: true });

    setLoading(false);
    if (error) {
      console.error("Supabase load error:", error);
      showToast("Error al cargar tipos: " + (error.message || "Error"), "error");
      return;
    }
    setTypes((data as ProductType[]) || []);
  }

  function openCreate() {
    setMode("create");
    setEditing(null);
    setFormName("");
    setFormDesc("");
    setFormActive(true);
    setIsModalOpen(true);
  }

  function openEdit(item: ProductType) {
    setMode("edit");
    setEditing(item);
    setFormName(item.name ?? "");
    setFormDesc(item.description ?? "");
    setFormActive(!!item.active);
    setIsModalOpen(true);
  }

  function openVersions(item: ProductType) {
    setFocusedType(item);
    setIsVersionsOpen(true);
  }

  function openFieldsForVersion(version: ProductTypeVersion) {
    setFocusedVersion(version);
    setIsFieldsOpen(true);
  }

  function openAmenitiesForVersion(version: ProductTypeVersion) {
    setFocusedVersion(version);
    setIsAmenitiesOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }
  function closeVersions() {
    setIsVersionsOpen(false);
  }
  function closeFields() {
    setIsFieldsOpen(false);
  }
  function closeAmenities() {
    setIsAmenitiesOpen(false);
  }

  // Guardar (create|edit)
  async function saveType(form: { name: string; description: string; active: boolean }) {
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      active: form.active,
    };

    try {
      if (mode === "edit" && editing) {
        const { error } = await supabase.from("product_types").update(payload).eq("id", editing.id);
        if (error) throw error;
        await loadTypes();
        showToast("Tipo actualizado", "success");
      } else {
        const { data: createdType, error } = await supabase
          .from("product_types")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;

        const { error: versionError } = await supabase.from("product_type_versions").insert({
          product_type_id: createdType.id,
          version_number: 1,
          notes: "Version inicial",
        });
        if (versionError) throw versionError;

        const { error: currentVersionError } = await supabase
          .from("product_types")
          .update({ current_version: 1 })
          .eq("id", createdType.id);
        if (currentVersionError) throw currentVersionError;

        await loadTypes();
        showToast("Tipo creado con version inicial", "success");
      }
      closeModal();
    } catch (err: any) {
      console.error("Supabase save error:", err);
      const msg =
        err?.message?.toLowerCase?.().includes("duplicate key") ? "Ya existe un tipo con ese nombre." : err?.message || "No se pudo guardar";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  // Eliminar
  async function deleteType(item: ProductType) {
    if (!confirm(`Eliminar el tipo "${item.name}"?`)) return;
    try {
      const { error } = await supabase.from("product_types").delete().eq("id", item.id);
      if (error) throw error;
      await loadTypes();
      showToast("Tipo eliminado", "success");
    } catch (err: any) {
      console.error("Supabase delete error:", err);
      showToast(err?.message || "No se pudo eliminar", "error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-semibold text-gray-900">Settings  -  Tipos de Producto</h1>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 placeholder-gray-500 outline-none ring-1 ring-transparent transition focus:border-blue-500 focus:ring-blue-500"
                placeholder="Buscar tipo o descripcion"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo
            </button>
          </div>
        </div>

        {/* Listado */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }} className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pt) => (
              <motion.div key={pt.id} whileHover={{ y: -2 }} className="group overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex items-start justify-between">
                  <h2 className="truncate text-xl font-semibold text-gray-900">{pt.name}</h2>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pt.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {pt.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="mb-6 line-clamp-3 text-sm text-gray-600">{pt.description || "Sin descripcion"}</p>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">v{pt.current_version}</span>
                  <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => openVersions(pt)} className="rounded-md p-2 text-gray-600 transition hover:bg-violet-50 hover:text-violet-600" title="Versiones">
                      <History className="h-4 w-4" />
                    </button>
                    <button onClick={() => openEdit(pt)} className="rounded-md p-2 text-gray-600 transition hover:bg-blue-50 hover:text-blue-600" title="Editar">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteType(pt)} className="rounded-md p-2 text-gray-600 transition hover:bg-red-50 hover:text-red-600" title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && <div className="col-span-full py-12 text-center text-gray-500">No se encontraron tipos de producto.</div>}
          </motion.div>
        )}
      </div>

      {/* Modal CRUD centrado */}
      <CenterModal
        key={`${mode}:${editing?.id ?? "new"}:${isModalOpen ? "open" : "closed"}`}
        open={isModalOpen}
        title={mode === "create" ? "Nuevo tipo de producto" : `Editar: ${editing?.name ?? ""}`}
        mode={mode}
        initialName={formName}
        initialDesc={formDesc}
        initialActive={formActive}
        saving={saving}
        onCancel={closeModal}
        onSubmit={(form) => {
          setFormName(form.name);
          setFormDesc(form.description);
          setFormActive(form.active);
          void saveType(form);
        }}
      />

      {/* Modal Versiones */}
      <VersionsModal
        open={isVersionsOpen}
        onClose={closeVersions}
        productType={focusedType}
        openFieldsForVersion={(v) => {
          closeVersions();
          setTimeout(() => {
            openFieldsForVersion(v);
          }, 10);
        }}
        openAmenitiesForVersion={(v) => {
          closeVersions();
          setTimeout(() => {
            openAmenitiesForVersion(v);
          }, 10);
        }}
      />

      {/* Modal Campos por Version + Preview */}
      <FieldsModal
        open={isFieldsOpen}
        onClose={closeFields}
        version={focusedVersion}
        productTypeName={focusedType?.name ?? ""}
      />

      <AmenitiesModal open={isAmenitiesOpen} onClose={closeAmenities} version={focusedVersion} />

      {/* Toast */}
      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  );
}






