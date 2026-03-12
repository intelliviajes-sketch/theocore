// /src/app/[id]/catalog-ia/page.tsx
"use client";
import { useEffect, useRef, useState, Fragment, useCallback, useMemo } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, Transition } from "@headlessui/react";
// Importaciones de iconos
import { UploadCloud, FileText, Wand2, Save, AlertTriangle, CheckCircle2, Loader2, Map, Inbox, FileWarning, Sparkles } from "lucide-react";


const LECTOR_PDF_IA_ID = "d94c3c37-1fe6-4a8f-9381-794a1397f68a";

type ProductType = { id: string; name: string; description: string | null; active: boolean; current_version: number; };
type ProductField = { id: string; field_name: string; label: string; input_type: string; required: boolean; placeholder: string; options: { label: string; value: string }[] | null; };

type EnrichedData = {
  title?: string;
  summary?: string;
  typeGuess?: string;
  raw?: string; // Texto fuente completo (PDF OCR o texto pegado)
  sections?: { heading: string; content: string }[];
  extractedFields?: Record<string, any>;
  suggestedFields?: Record<string, any>;
  fileMimeType?: string;
};

// =============== Componente Principal ===============
export default function CatalogIAPage({ params }: { params: Promise<{ id: string }> }) {
  const [agencyId, setAgencyId] = useState<string>("");
  useEffect(() => {
    params.then(p => setAgencyId(p.id));
  }, [params]);

  // --- Estados de Entrada y Analisis ---
  const [mode, setMode] = useState<"manual" | "inbox">("manual");
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");

  const [editedText, setEditedText] = useState("");
  const [enriched, setEnriched] = useState<EnrichedData | null>(null);

  const [runningIA, setRunningIA] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<'initial' | 'analyzed' | 'corrected'>('initial');

  // --- Estados de Mapeo ---
  const [types, setTypes] = useState<ProductType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [productFields, setProductFields] = useState<ProductField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // --- Estados de Control de UX ---
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, kind: "success" as "success" | "error", message: "" });
  const [showMappingModal, setShowMappingModal] = useState(false);

  const dropAreaRef = useRef<HTMLDivElement | null>(null);

  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [modalTab, setModalTab] = useState<'viewer' | 'text'>('viewer');

  const showToast = useCallback((message: string, kind: "success" | "error" = "success") => {
    setToast({ show: true, kind, message });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  }, []);

  const generateTitle = useCallback(() => {
    const source = editedText.trim();
    if (!source) return;

    const firstLine = source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    const nextTitle = (firstLine || "Documento catalogado").slice(0, 90);
    setEnriched((prev) => ({ ...(prev || {}), title: nextTitle, raw: prev?.raw || source }));
    showToast("Titulo sugerido generado.");
  }, [editedText, showToast]);

  const generateSummary = useCallback(() => {
    const source = editedText.trim();
    if (!source) return;

    const normalized = source.replace(/\s+/g, " ").trim();
    const nextSummary = normalized.slice(0, 280);
    setEnriched((prev) => ({ ...(prev || {}), summary: nextSummary, raw: prev?.raw || source }));
    showToast("Descripcion breve generada.");
  }, [editedText, showToast]);

  // --- Carga de Tipos de Producto ---
  useEffect(() => {
    const fetchTypes = async () => {
      // Nota: Asumiendo que 'active' es un campo en product_types
      const { data, error } = await supabase.from("product_types").select("id, name, active, current_version").eq("active", true);
      if (error) showToast(error.message, "error");
      else setTypes(data as ProductType[]);
    };
    fetchTypes();
  }, [showToast]);

    // --- Logica de Extraccion de Texto por Archivo (OCR) ---
  const runOCRAndPopulateText = useCallback(async () => {
    if (!file || editedText.trim()) return;

    setRunningIA(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/brains/${LECTOR_PDF_IA_ID}`, { method: "POST", body: fd });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error del servidor IA: ${errorText}`);
      }

      const json = await res.json();
      const data: EnrichedData = {
        ...json.data,
        fileMimeType: file?.type,
      };

      if (!data || !data.raw) {
        throw new Error("La IA no devolvio contenido de texto.");
      }

      setEnriched((prev) => ({ ...prev, ...data }));
      setEditedText(data.raw);
      setAnalysisStep("analyzed");

      showToast("Extraccion de texto (OCR) completada.", "success");
    } catch (err: any) {
      console.error("Error IA:", err);
      showToast(err.message || "Fallo en la extraccion inicial", "error");
    } finally {
      setRunningIA(false);
      setModalTab("text");
    }
  }, [editedText, file, showToast]);

  // --- Logica Principal (Fase 1: Solo Carga. NO IA) ---
  const runInitialAnalysis = useCallback(async () => {
    if (mode === "inbox") return;

    setSelectedTypeId("");
    setProductFields([]);
    setFormData({});
    setEditedText("");
    setZoomLevel(1.0);
    setModalTab("viewer");

    const isFilePresent = !!file;
    const isTextPresent = pastedText.trim().length > 0;

    if (!isFilePresent && !isTextPresent) {
      showToast("Debes adjuntar un archivo o pegar texto.", "error");
      return;
    }

    const currentTab = isFilePresent ? "upload" : "paste";
    setTab(currentTab);

    if (currentTab === "paste") {
      const trimmedText = pastedText.trim();
      setEditedText(trimmedText);
      setEnriched({ raw: trimmedText, typeGuess: "N/A - Pendiente de Deteccion" });
      setAnalysisStep("analyzed");
      showToast("Texto cargado. Abre el modal para verificar y mapear.", "success");
      setShowMappingModal(true);
    }

    if (currentTab === "upload") {
      setEnriched({ raw: "", fileMimeType: file!.type, typeGuess: "N/A - Pendiente de Deteccion" });
      setAnalysisStep("analyzed");
      showToast(`Archivo (${file!.name}) cargado. Inicia el OCR en el Modal (Columna 1) si es necesario.`, "success");
      setShowMappingModal(true);
    }
  }, [file, mode, pastedText, showToast]);

  // --- Logica Principal (Fase 3: Carga de Formulario para Ingreso Manual) ---
  const handleTypeCorrection = useCallback(async (newTypeId: string) => {
    if (!newTypeId) {
      setSelectedTypeId("");
      setProductFields([]);
      setFormData({});
      return;
    }

    setRunningIA(false);
    setSelectedTypeId(newTypeId);
    setProductFields([]);
    setFormData({});

    const typeName = types.find((t) => t.id === newTypeId)?.name || "Producto Desconocido";
    let productFieldsData: ProductField[] = [];
    const finalFormData: Record<string, any> = {};

    try {
      const fieldsRes = await fetch(`/api/product-types/${newTypeId}/fields`);
      const fieldsData = await fieldsRes.json();

      if (!fieldsRes.ok) {
        showToast(fieldsData.error || "Error al cargar el esquema de campos.", "error");
        setSelectedTypeId("");
        return;
      }

      productFieldsData = fieldsData.fields;
      setProductFields(productFieldsData);

      productFieldsData.forEach((field) => {
        finalFormData[field.field_name] = "";
      });

      setFormData(finalFormData);
      setAnalysisStep("corrected");
      showToast(`Esquema de campos para '${typeName}' cargado. Por favor, rellena el formulario manualmente.`, "success");
    } catch (err: any) {
      showToast(err.message || "Error al cargar el esquema de campos.", "error");
      setSelectedTypeId("");
    } finally {
      setRunningIA(false);
    }
  }, [showToast, types]);

  // --- Guardado funcional: borrador local mientras no exista tabla destino ---
  const handleSave = useCallback(async () => {
    if (!selectedTypeId || !enriched || productFields.length === 0) {
      showToast("Debes seleccionar un tipo y mapear los campos antes de guardar.", "error");
      return;
    }

    setSaving(true);
    try {
      const storageKey = "catalogia_local_drafts";
      const typeName = types.find((type) => type.id === selectedTypeId)?.name || "Producto";
      const currentDraft = {
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        agencyId,
        selectedTypeId,
        typeName,
        fileName: file?.name || null,
        enriched: {
          ...enriched,
          raw: editedText || enriched.raw || "",
        },
        formData,
      };

      const existingDrafts = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const nextDrafts = [currentDraft, ...existingDrafts].slice(0, 50);
      localStorage.setItem(storageKey, JSON.stringify(nextDrafts));

      showToast("Borrador guardado localmente. La persistencia final en base de datos aun no esta implementada en este repo.");

      setShowMappingModal(false);
      setAnalysisStep('initial');
      setEditedText('');
      setEnriched(null);
      setSelectedTypeId('');
      setProductFields([]);
      setFormData({});
      setFile(null);
      setPastedText('');
      setZoomLevel(1.0);
      setModalTab('viewer');
    } catch (err: any) {
      showToast(err.message || "No se pudo guardar el borrador local.", "error");
    } finally {
      setSaving(false);
    }
  }, [agencyId, editedText, enriched, file?.name, formData, productFields.length, selectedTypeId, showToast, types]);

  // --- Logica del Viewer (sin cambios) ---
  const filePreviewUrl = useMemo(() => {
    if (file && (file.type.startsWith('image/') || file.type.includes('pdf'))) {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file]);

  const ViewerContent = () => {
    const isImage = enriched?.fileMimeType?.startsWith('image') && filePreviewUrl;
    const isPdf = enriched?.fileMimeType?.includes('pdf') && filePreviewUrl;

    if (isImage || isPdf) {
      return (
        <div
          className="h-full w-full"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', width: `${100 / zoomLevel}%`, height: `${100 / zoomLevel}%` }}
        >
          <iframe
            src={filePreviewUrl || ''}
            title="Previsualizacion de Documento"
            className="w-full h-full border-none"
          >
            {isImage && <img src={filePreviewUrl} alt="Previsualizacion de imagen" className="max-w-full h-auto max-h-full object-contain mx-auto" />}
          </iframe>
        </div>
      );
    }

    return (
      <div className="h-full grid place-items-center text-center text-gray-500 italic p-4">
        <p>Vista previa del documento no disponible.</p>
        <p className="mt-2 text-xs">Utilice la caja de texto editable de abajo para el contenido.</p>
      </div>
    );
  };

  // --- Renderizacion del contenido de la Columna 1 (Carga Pura) ---
  const renderInputModeContent = () => {

    // Logica para determinar si un input debe deshabilitar al otro
    const isFilePresent = !!file;
    const isTextPresent = pastedText.trim().length > 0;

    const disableUpload = isTextPresent;
    const disablePaste = isFilePresent;

    const isReady = isFilePresent || isTextPresent;

    if (mode === 'manual') {
      return (
        <>
          <div className="p-1 border rounded-xl bg-gray-50 space-y-4">

            {/* 1. ARCHIVO UPLOAD/DRAG & DROP AREA */}
            <div
              ref={dropAreaRef}
              onDragOver={(e) => disableUpload ? e.preventDefault() : e.preventDefault()}
              onDragLeave={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (disableUpload) return;
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) {
                  setFile(droppedFile);
                  setTab("upload");
                }
              }}
              className={`p-3 border-2 border-dashed rounded-xl text-center transition-colors ${disableUpload ? 'opacity-50 cursor-not-allowed border-gray-200' : file ? 'border-violet-400 bg-violet-50' : 'border-gray-300 hover:border-violet-400'}`}
            >
              <UploadCloud className={`w-5 h-5 mx-auto mb-3 ${disableUpload ? 'text-gray-300' : 'text-gray-500'}`} />
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  if (f) setTab("upload");
                }}
                className="hidden"
                id="file-upload"
                disabled={disableUpload}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer text-sm font-medium ${disableUpload ? 'text-gray-400' : 'text-violet-600 hover:text-violet-700'}`}
              >
                {file ? `Archivo Adjunto: ${file.name}` : "Haz clic para subir o arrastra un Archivo (.pdf, .img)"}
              </label>

              {disableUpload && <p className="mt-2 text-xs text-red-500 font-medium">Deshabilitado: Hay texto ingresado abajo.</p>}
            </div>

            {/* SEPARATOR "O" */}
            <div className="flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-xs font-medium">O</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* 2. TEXTO PASTE AREA */}
            <div className={`p-4 border rounded-xl ${disablePaste ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white'}`}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Pegar Contenido de Texto</h4>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  if (e.target.value.trim().length > 0) setTab("paste");
                  if (e.target.value.trim().length === 0) setTab("upload");
                }}
                placeholder="Pega aqui. el contenido del documento o texto..."
                className="w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                disabled={disablePaste}
              />
              {disablePaste && <p className="mt-2 text-xs text-red-500 font-medium">Deshabilitado: Hay un archivo adjunto.</p>}
            </div>
          </div>

          <button
            onClick={runInitialAnalysis}
            disabled={!isReady}
            className="mt-4 w-full bg-violet-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            {isFilePresent ? "Cargar Archivo y Abrir Mapeo" : isTextPresent ? "Cargar Texto y Abrir Mapeo" : "Cargar Archivo/Texto y Abrir Mapeo"}
          </button>
        </>
      );
    } else {
      return (
        <div className="space-y-3 h-[400px] grid place-items-center">
          <div className="text-center p-10 text-gray-500 border border-dashed rounded-xl bg-gray-50">
            <Inbox className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <h4 className="font-semibold text-gray-800">Modulo de Bandeja de Entrada</h4>
            <p className="text-sm mt-1">
              **PROXIMAMENTE:** La integracion con Gmail capturara automaticamente las ofertas aqui..
            </p>
            <p className="text-xs mt-3">
              Regresa al **Modo Manual** para continuar con la carga de documentos.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Asistente de Catalogacion IA</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Columna 1: Dashboard de Entrada (Fase 1: Carga) */}
          <div className="p-6 bg-white rounded-2xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              1) Entrada de Documento
            </h2>

            <div className="flex gap-2 mb-4 border-b pb-4">
              <button
                onClick={() => { setMode("manual"); setAnalysisStep('initial'); }}
                className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${mode === "manual" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"}`}
              >
                <UploadCloud className="w-4 h-4" /> Manual / Archivo
              </button>
              <button
                onClick={() => { setMode("inbox"); setAnalysisStep('initial'); }}
                className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${mode === "inbox" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"}`}
              >
                <Inbox className="w-4 h-4" /> Bandeja de Entrada
              </button>
            </div>

            {renderInputModeContent()}

          </div>

          {/* Columna 2: Analisis Rapido y Acceso al Mapeo */}
          <div className="p-6 bg-white rounded-2xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5" />2) Resultado Minimo y Acceso al Mapeo</h2>

            {analysisStep === 'initial' ? (
              <div className="h-[420px] grid place-items-center text-gray-400 border border-dashed rounded-xl">Inicia el proceso en la columna izquierda.</div>
            ) : (
              <div className="h-[420px] flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Resultado de Preparacion (Fase 1):</h4>
                  <p className="text-sm">
                    **Tipo de entrada:** {tab === 'paste' ? 'Texto Pegado' : `Archivo (${file?.name || 'N/A'})`}<br />
                    **Texto cargado inicialmente:** {editedText.length} caracteres
                  </p>
                  {enriched?.typeGuess && (
                    <p className="text-sm">
                      **Tipo Sugerido (si fue detectado):** <span className="font-semibold text-blue-600">{enriched.typeGuess}</span>
                    </p>
                  )}
                  <div className="bg-gray-100 p-3 rounded-lg text-xs overflow-x-auto h-48">
                    <p className="whitespace-pre-wrap">{editedText.substring(0, 400)}...</p>
                    {editedText.length === 0 && <p className="text-center text-gray-500">No hay contenido de texto extraido. Usa el modal para iniciar el OCR.</p>}
                  </div>
                </div>

                <button
                  onClick={() => setShowMappingModal(true)}
                  className="mt-4 w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={runningIA}
                >
                  <Map className="w-4 h-4" /> Entrar al Modo Mapeo Avanzado (Fase 2)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast (Notificaciones) */}
      <AnimatePresence>{toast.show && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white shadow-lg flex items-center gap-2 ${toast.kind === "success" ? "bg-green-600" : "bg-red-600"}`}>{toast.kind === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}<span>{toast.message}</span></motion.div>)}</AnimatePresence>


      {/* Componente Modal de Mapeo Avanzado (MappingModal) */}
      <Transition appear show={showMappingModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowMappingModal(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">

                <Dialog.Panel className="w-[90vw] max-w-[90vw] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">

                  <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 border-b pb-3 mb-4 flex items-center justify-between">
                    Modo Mapeo Avanzado: Ingreso Manual y Guardado
                    <button type="button" onClick={() => setShowMappingModal(false)} className="text-gray-400 hover:text-gray-600">
                      &times;
                    </button>
                  </Dialog.Title>

                  {/* GRID: 60% (3/5) para Viewer/Texto y 40% (2/5) para Formulario */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[90vh] max-h-[700px]">

                    {/* Columna A: Viewer y Texto Fuente (60%) CON TABS */}
                    <div className="lg:col-span-3 overflow-y-auto p-0 border rounded-xl bg-gray-50 flex flex-col">
                      <h4 className="font-semibold text-violet-700 mb-2 flex-shrink-0">1. Fuente de Datos</h4>

                      {/* Barra de Pestanas */}
                      <div className="flex gap-2 mb-4 border-b border-gray-300 flex-shrink-0">
                        <button
                          onClick={() => setModalTab('viewer')}
                          className={`px-0 py-0 text-sm font-medium transition-colors ${modalTab === 'viewer'
                              ? 'border-b-2 border-violet-600 text-violet-700'
                              : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                          Viewer del Archivo
                        </button>
                        <button
                          onClick={() => setModalTab('text')}
                          className={`px-3 py-0 text-sm font-medium transition-colors ${modalTab === 'text'
                              ? 'border-b-2 border-violet-600 text-violet-700'
                              : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                          Texto Fuente Editable
                        </button>
                      </div>

                      {/* Contenido de la Pestana 1: Viewer (PDF/Imagen) */}
                      {modalTab === 'viewer' && (
                        <div
                          className="mb-4 bg-gray-100 p-1 rounded-lg shadow-inner relative overflow-auto flex-1"
                        >
                          {ViewerContent()}
                        </div>
                      )}

                      {/* Contenido de la Pestana 2: Texto Fuente Editable y Controles OCR/Generacion */}
                      {modalTab === 'text' && (
                        <div className="flex flex-col flex-1">

                          {/* Boton de Extraccion de Texto (OCR/IA) */}
                          {(filePreviewUrl && editedText.length === 0) && (
                            <div className="mb-4 flex-shrink-0">
                              <button
                                onClick={runOCRAndPopulateText}
                                disabled={runningIA}
                                className="w-full bg-violet-600 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-violet-700 disabled:opacity-50"
                              >
                                {runningIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                {runningIA ? "Extrayendo Texto (OCR)..." : "Extraer Texto del Archivo (OCR/IA)"}
                              </button>
                            </div>
                          )}

                          {/* Botones de Generacion de Contenido */}
                          <div className="flex gap-2 mb-4 flex-shrink-0">
                            <button
                              onClick={generateTitle}
                              className="flex-1 bg-yellow-500 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-yellow-600 disabled:opacity-50"
                              disabled={runningIA || editedText.length === 0}
                            >
                              <Sparkles className="w-4 h-4" /> Generar Titulo
                            </button>
                            <button
                              onClick={generateSummary}
                              className="flex-1 bg-yellow-500 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-yellow-600 disabled:opacity-50"
                              disabled={runningIA || editedText.length === 0}
                            >
                              <Sparkles className="w-4 h-4" /> Generar Descripcion
                            </button>
                          </div>

                          {(enriched?.title || enriched?.summary) && (
                            <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-slate-700">
                              {enriched?.title ? <p><strong>Titulo:</strong> {enriched.title}</p> : null}
                              {enriched?.summary ? <p className="mt-1"><strong>Descripcion:</strong> {enriched.summary}</p> : null}
                            </div>
                          )}

                          <h5 className="font-medium text-gray-800 mt-2 flex-shrink-0">Texto Fuente Completo (Editable):</h5>
                          <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full h-full border border-gray-300 rounded-lg p-2 text-sm resize-none mt-2 flex-1"
                            placeholder="Edita el texto fuente aqui. para corregir errores de OCR o texto pegado."
                          />
                        </div>
                      )}
                    </div>

                    {/* Columna B: Formulario Mapeado, Seleccion de Tipo y Guardado (40%) */}
                    <div className="lg:col-span-2 overflow-y-auto p-4 border rounded-xl">
                      <h4 className="font-semibold text-emerald-700 mb-4">2. Campos para Ingreso Manual</h4>

                      {/* Selector de Tipo (SOLO CARGA EL FORMULARIO) */}
                      <div className="mb-4 bg-white p-3 rounded-lg shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona Tipo de Producto para cargar el Formulario</label>
                        <select
                          className="w-full border border-gray-300 rounded-lg p-2"
                          value={selectedTypeId}
                          onChange={(e) => handleTypeCorrection(e.target.value)}
                          disabled={runningIA}
                        >
                          <option value="">- Selecciona Tipo - (Sugerido: {enriched?.typeGuess || 'N/A'})</option>
                          {types.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                        </select>
                      </div>

                      {/* Formulario Dinamico (SOLO aparece si productFields.length > 0) */}
                      {productFields.length > 0 ? (
                        <div className="space-y-3">

                          {/* Formulario Dinamico Editable */}
                          {productFields.map((field) => (
                            <div key={field.id}>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{field.label} {field.required && '*'}</label>
                              <input
                                type={field.input_type}
                                value={formData[field.field_name] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                placeholder={field.placeholder}
                              />
                            </div>
                          ))}

                          {/* Boton de Guardar */}
                          <button
                            onClick={handleSave}
                            disabled={saving || !selectedTypeId}
                            className="mt-6 w-full bg-emerald-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? "Guardando..." : "Guardar Mapeo y Finalizar"}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 p-8 border border-dashed rounded-lg">
                          <FileWarning className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          **Selecciona un Tipo** para cargar el esquema del formulario y empezar el ingreso manual de datos.
                        </div>
                      )}
                    </div>
                  </div>

                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}





