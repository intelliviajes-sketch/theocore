"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Download, Loader2, Pencil, Plus, Power, Search, Trash2, Users } from "lucide-react";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import CrudPageShell from "@/components/intracore/CrudPageShell";
import { useToast } from "@/components/system/ToastProvider";
import { validateAgencyForm } from "@/lib/validation/theocore";
import { downloadCsv } from "@/lib/utils/csv";
import {
  type Agency,
  type AgencyBrainAssignment,
  type AgencyBranding,
  type AgencyDomain,
  type AgencyMarketConfig,
  type AgencySavePayload,
  useGlobalAgencies,
} from "@/hooks/theocore/useGlobalAgencies";

const PAGE_SIZE = 10;

function AgencyFormModal({
  open,
  agency,
  countries,
  brains,
  assignedBrainIds,
  assignedBrainDetails,
  agencyDomains,
  agencyMarketConfigs,
  agencyBranding,
  onClose,
  onSave,
  onSaved,
}: {
  open: boolean;
  agency: Agency | null;
  countries: Array<{ code: string; name: string; emoji_flag: string }>;
  brains: Array<{
    id: string;
    name: string;
    logo_url: string | null;
    active: boolean;
    target_lang: string | null;
    scope: "global" | "agency" | null;
    owner_agency_id: string | null;
    created_for_agency_id: string | null;
    execution_layer: string | null;
    brain_category: string | null;
  }>;
  assignedBrainIds: string[];
  assignedBrainDetails: AgencyBrainAssignment[];
  agencyDomains: AgencyDomain[];
  agencyMarketConfigs: AgencyMarketConfig[];
  agencyBranding: AgencyBranding | null;
  onClose: () => void;
  onSave: (payload: AgencySavePayload) => Promise<void>;
  onSaved: (message: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [commercialName, setCommercialName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [countryCode, setCountryCode] = useState("ES");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [emailEmergency, setEmailEmergency] = useState("");
  const [taxId, setTaxId] = useState("");
  const [bankInformation, setBankInformation] = useState("{}");
  const [logoUrl, setLogoUrl] = useState("");
  const [mascotBrainId, setMascotBrainId] = useState("");
  const [mascotName, setMascotName] = useState("");
  const [mascotBrainLogoUrl, setMascotBrainLogoUrl] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [selectedBrains, setSelectedBrains] = useState<string[]>([]);
  const [domainsJson, setDomainsJson] = useState("[]");
  const [marketConfigJson, setMarketConfigJson] = useState("[]");
  const [brainAssignmentsJson, setBrainAssignmentsJson] = useState("[]");
  const { error } = useToast();

  const availableBrains = useMemo(() => {
    const agencyId = agency?.id ?? null;
    return brains.filter((brain) => {
      if (brain.scope === "global" || brain.scope === null) return true;
      if (!agencyId) return false;
      return brain.owner_agency_id === agencyId || brain.created_for_agency_id === agencyId;
    });
  }, [brains, agency?.id]);

  const availableBrainIds = useMemo(
    () => new Set(availableBrains.map((brain) => brain.id)),
    [availableBrains],
  );
  const availableMascotBrains = useMemo(
    () =>
      availableBrains.filter(
        (brain) => brain.active && brain.execution_layer === "frontend" && brain.brain_category === "traveler",
      ),
    [availableBrains],
  );

  useEffect(() => {
    if (!open) return;
    const nextCountryCode = agency?.country_code ?? countries[0]?.code ?? "ES";
    setCommercialName(agency?.commercial_name ?? "");
    setLegalName(agency?.legal_name ?? "");
    setCountryCode(nextCountryCode);
    setAddress(agency?.address ?? "");
    setWhatsapp(agency?.whatsapp ?? "");
    setEmailContact(agency?.email_contact ?? "");
    setEmailEmergency(agency?.email_emergency ?? "");
    setTaxId(agency?.tax_id ?? "");
    setBankInformation(JSON.stringify(agency?.bank_information ?? {}, null, 2));
    setLogoUrl(agencyBranding?.logo_url ?? "");
    setMascotBrainId(agencyBranding?.mascot_brain_id ?? "");
    setMascotName(agencyBranding?.mascot_name ?? "");
    setMascotBrainLogoUrl(agencyBranding?.mascot_brain_logo_url ?? null);
    setActive(agency?.active ?? true);
    setSelectedBrains(assignedBrainIds.filter((brainId) => availableBrainIds.has(brainId)));
    setDomainsJson(
      JSON.stringify(
        agencyDomains.length > 0
          ? agencyDomains
          : [{ domain: "", country_code: nextCountryCode, is_primary: true, active: true }],
        null,
        2,
      ),
    );
    setMarketConfigJson(
      JSON.stringify(
        agencyMarketConfigs.length > 0
          ? agencyMarketConfigs
          : [
              {
                country_code: nextCountryCode,
                language_code: "es",
                currency_code: "EUR",
                timezone: "Europe/Madrid",
                default_brain_id: null,
                active: true,
              },
            ],
        null,
        2,
      ),
    );
    setBrainAssignmentsJson(
      JSON.stringify(
        assignedBrainDetails.length > 0
          ? assignedBrainDetails
          : assignedBrainIds
              .filter((brainId) => availableBrainIds.has(brainId))
              .map((brainId) => ({
                ai_assistant_id: brainId,
                persona_profile: null,
                strategic_concept: null,
                market_segment: null,
                monetization_model: "commission",
                visibility_level: "agency_only",
                custom_business_rules: {},
                execution_overrides: {},
                language_overrides: null,
              })),
        null,
        2,
      ),
    );
  }, [
    agency,
    agencyBranding,
    agencyDomains,
    agencyMarketConfigs,
    assignedBrainDetails,
    assignedBrainIds,
    availableBrainIds,
    countries,
    open,
  ]);

  useEffect(() => {
    if (!open) return;
    if (!mascotBrainId) {
      setMascotBrainLogoUrl(null);
      return;
    }

    const selectedMascotBrain = availableMascotBrains.find((brain) => brain.id === mascotBrainId) || null;
    setMascotBrainLogoUrl(selectedMascotBrain?.logo_url ?? null);
    if (selectedMascotBrain && mascotName.trim().length === 0) {
      setMascotName(selectedMascotBrain.name);
    }
  }, [availableMascotBrains, mascotBrainId, mascotName, open]);

  const validation = useMemo(() => {
    const base = validateAgencyForm({
      commercialName,
      legalName,
      countryCode,
      emailContact,
      emailEmergency,
      whatsapp,
      bankInformation,
    });

    const extra: Record<string, string> = {};
    try {
      const parsedDomains = JSON.parse(domainsJson || "[]");
      if (!Array.isArray(parsedDomains)) {
        extra.domainsJson = "Dominios debe ser un arreglo JSON.";
      }
    } catch {
      extra.domainsJson = "Dominios debe ser JSON valido.";
    }
    try {
      const parsedMarkets = JSON.parse(marketConfigJson || "[]");
      if (!Array.isArray(parsedMarkets)) {
        extra.marketConfigJson = "Market config debe ser un arreglo JSON.";
      }
    } catch {
      extra.marketConfigJson = "Market config debe ser JSON valido.";
    }
    try {
      const parsedAssignments = JSON.parse(brainAssignmentsJson || "[]");
      if (!Array.isArray(parsedAssignments)) {
        extra.brainAssignmentsJson = "Brain assignments debe ser un arreglo JSON.";
      }
    } catch {
      extra.brainAssignmentsJson = "Brain assignments debe ser JSON valido.";
    }
    return { ...base, ...extra };
  }, [
    bankInformation,
    brainAssignmentsJson,
    commercialName,
    countryCode,
    domainsJson,
    emailContact,
    emailEmergency,
    legalName,
    marketConfigJson,
    whatsapp,
  ]);

  if (!open) return null;

  const canSubmit = Object.keys(validation).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const parsedDomains = parseJsonArray<AgencyDomain>(domainsJson);
      const parsedMarketConfigs = parseJsonArray<AgencyMarketConfig>(marketConfigJson);
      const parsedBrainAssignments = parseJsonArray<AgencyBrainAssignment>(brainAssignmentsJson);

      const normalizedBrainAssignments =
        parsedBrainAssignments.length > 0
          ? parsedBrainAssignments
          : selectedBrains.map((brainId) => ({
              ai_assistant_id: brainId,
              persona_profile: null,
              strategic_concept: null,
              market_segment: null,
              monetization_model: "commission",
              visibility_level: "agency_only",
              custom_business_rules: {},
              execution_overrides: {},
              language_overrides: null,
            }));

      await onSave({
        id: agency?.id,
        commercial_name: commercialName.trim(),
        legal_name: legalName.trim(),
        country_code: countryCode,
        address: address.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email_contact: emailContact.trim(),
        email_emergency: emailEmergency.trim() || null,
        tax_id: taxId.trim() || null,
        bank_information: parseJson(bankInformation),
        active,
        logo_url: logoUrl.trim() || null,
        mascot_brain_id: mascotBrainId || null,
        mascot_name: mascotName.trim() || null,
        mascot_brain_logo_url: mascotBrainLogoUrl || null,
        brain_ids: selectedBrains,
        brain_assignments: normalizedBrainAssignments,
        domains: parsedDomains,
        market_configs: parsedMarketConfigs,
      });
      await onSaved(agency ? "Agencia actualizada." : "Agencia creada.");
      onClose();
    } catch (saveError) {
      console.error(saveError);
      error(saveError instanceof Error ? saveError.message : "No se pudo guardar la agencia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{agency ? "Editar agencia" : "Nueva agencia"}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Gestiona datos comerciales y brains asignados desde un solo modal.</p></div><button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cerrar</button></div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre comercial *" error={validation.commercialName}>
              <input value={commercialName} onChange={(e) => setCommercialName(e.target.value)} className={inputClass(validation.commercialName)} />
            </Field>
            <Field label="Razon social *" error={validation.legalName}>
              <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputClass(validation.legalName)} />
            </Field>
            <Field label="Pais *" error={validation.countryCode}>
              <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={inputClass(validation.countryCode)}>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.emoji_flag} {country.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="WhatsApp" error={validation.whatsapp}>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass(validation.whatsapp)} />
            </Field>
            <Field label="Correo de contacto *" error={validation.emailContact}>
              <input type="email" value={emailContact} onChange={(e) => setEmailContact(e.target.value)} className={inputClass(validation.emailContact)} />
            </Field>
            <Field label="Correo de emergencia" error={validation.emailEmergency}>
              <input type="email" value={emailEmergency} onChange={(e) => setEmailEmergency(e.target.value)} className={inputClass(validation.emailEmergency)} />
            </Field>
            <Field label="URL del logo de la agencia">
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass()}
              />
            </Field>
            <Field label="Mascota-brain de la agencia">
              <select
                value={mascotBrainId}
                onChange={(e) => setMascotBrainId(e.target.value)}
                className={inputClass()}
              >
                <option value="">Sin mascota</option>
                {availableMascotBrains.map((brain) => (
                  <option key={brain.id} value={brain.id}>
                    {brain.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre de la mascota">
              <input
                value={mascotName}
                onChange={(e) => setMascotName(e.target.value)}
                placeholder="Ej: IVI"
                className={inputClass()}
              />
            </Field>
            <Field label="Tax ID">
              <input value={taxId} onChange={(e) => setTaxId(e.target.value)} className={inputClass()} />
            </Field>
            <Field label="Estado">
              <label className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 px-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Agencia activa
              </label>
            </Field>
          </div>
          {mascotBrainId ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Mascota configurada</p>
              <div className="mt-2 flex items-center gap-3">
                {mascotBrainLogoUrl ? (
                  <img src={mascotBrainLogoUrl} alt={mascotName || "Mascota"} className="h-10 w-10 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                    AI
                  </div>
                )}
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{mascotName || "Sin nombre de mascota"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Brain ID: {mascotBrainId}</p>
                </div>
              </div>
            </div>
          ) : null}
          <Field label="Direccion"><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass()} /></Field>
          <Field label="Informacion bancaria (JSON)" error={validation.bankInformation}><textarea rows={4} value={bankInformation} onChange={(e) => setBankInformation(e.target.value)} className={`${inputClass(validation.bankInformation)} h-auto py-3 font-mono text-xs`} /></Field>
          <Field label="Brains asignados"><div className="grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 dark:border-slate-700">{availableBrains.length === 0 ? <div className="text-sm text-slate-500 dark:text-slate-400">No hay brains disponibles para esta agencia.</div> : availableBrains.map((brain) => { const checked = selectedBrains.includes(brain.id); return <label key={brain.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><div><div className="font-medium text-slate-800 dark:text-slate-100">{brain.name}</div><div className="text-xs text-slate-500 dark:text-slate-400">{brain.target_lang || "Sin idioma"} · {brain.active ? "Activo" : "Inactivo"}</div></div><input type="checkbox" checked={checked} onChange={() => setSelectedBrains((current) => current.includes(brain.id) ? current.filter((item) => item !== brain.id) : [...current, brain.id])} /></label>; })}</div></Field>
          <Field label="Dominios (agency_domains JSON)" error={validation.domainsJson}><textarea rows={6} value={domainsJson} onChange={(e) => setDomainsJson(e.target.value)} className={`${inputClass(validation.domainsJson)} h-auto py-3 font-mono text-xs`} /></Field>
          <Field label="Market Config (agency_market_config JSON)" error={validation.marketConfigJson}><textarea rows={6} value={marketConfigJson} onChange={(e) => setMarketConfigJson(e.target.value)} className={`${inputClass(validation.marketConfigJson)} h-auto py-3 font-mono text-xs`} /></Field>
          <Field label="Brain Assignments (agencies_ai_assistants JSON)" error={validation.brainAssignmentsJson}><textarea rows={8} value={brainAssignmentsJson} onChange={(e) => setBrainAssignmentsJson(e.target.value)} className={`${inputClass(validation.brainAssignmentsJson)} h-auto py-3 font-mono text-xs`} /></Field>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Incluye objetos de estas tablas: `agency_domains`, `agency_market_config` y `agencies_ai_assistants`. Si dejas Brain Assignments vacio, se usaran los brains seleccionados arriba con valores por defecto.</div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:opacity-90 dark:bg-slate-800 dark:text-slate-200">Cancelar</button><button type="submit" disabled={!canSubmit || saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{agency ? "Guardar cambios" : "Crear agencia"}</button></div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}{error ? <span className="text-xs text-rose-600 dark:text-rose-300">{error}</span> : null}</label>;
}

function parseJson(value: string) { try { return JSON.parse(value || "{}"); } catch { return {}; } }
function parseJsonArray<T>(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [] as T[];
  }
}
function inputClass(error?: string) { return `h-11 w-full rounded-2xl border px-4 text-sm outline-none transition dark:bg-slate-950 dark:text-slate-100 ${error ? "border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500 dark:border-rose-500 dark:bg-rose-950/30" : "border-slate-200 bg-white text-slate-800 focus:border-cyan-500 dark:border-slate-700"}`; }
function toolbarInputClass() { return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"; }
function pageCount(total: number) { return Math.max(1, Math.ceil(total / PAGE_SIZE)); }

export default function AgenciesPage() {
  const [modalAgency, setModalAgency] = useState<Agency | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<null | { type: "delete" | "toggle"; agency: Agency }>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<null | "archive" | "activate">(null);
  const { success, error } = useToast();
  const { loading, agencies, countries, brains, brainAssignments, brainAssignmentDetailsByAgency, brandingByAgency, domainByAgency, marketConfigByAgency, teamCountByAgency, travelerCountByAgency, ownerByAgency, reload, saveAgency, deleteAgency, toggleAgency } = useGlobalAgencies();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(1);
      setSelectedIds([]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [search, statusFilter, countryFilter]);

  async function handleDeleteAgency(agency: Agency) {
    try {
      await deleteAgency(agency.id);
      await reload();
      success("Agencia archivada.");
    } catch (deleteError) {
      console.error(deleteError);
      error("No se pudo archivar la agencia.");
    }
  }

  async function handleToggleAgency(agency: Agency) {
    try {
      await toggleAgency(agency);
      await reload();
      success(agency.active ? "Agencia desactivada." : "Agencia activada.");
    } catch (toggleError) {
      console.error(toggleError);
      error("No se pudo cambiar el estado de la agencia.");
    }
  }

  const rows = useMemo(() => agencies.map((agency) => {
    const country = countries.find((item) => item.code === agency.country_code);
    return {
      ...agency,
      countryLabel: country ? `${country.emoji_flag} ${country.name}` : agency.country_code,
      brainCount: brainAssignments[agency.id]?.length || 0,
      teamCount: teamCountByAgency[agency.id] || 0,
      travelerCount: travelerCountByAgency[agency.id] || 0,
      owner: ownerByAgency[agency.id] || null,
      createdLabel: agency.created_at ? new Date(agency.created_at).toLocaleDateString() : "-",
    };
  }), [agencies, brainAssignments, countries, ownerByAgency, teamCountByAgency, travelerCountByAgency]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((agency) => {
      const matchesSearch = !term || [agency.commercial_name, agency.legal_name, agency.email_contact, agency.whatsapp || "", agency.countryLabel, agency.owner?.full_name || "", agency.owner?.email || ""].join(" ").toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? agency.active : !agency.active);
      const matchesCountry = countryFilter === "all" || agency.country_code === countryFilter;
      return matchesSearch && matchesStatus && matchesCountry;
    });
  }, [countryFilter, rows, search, statusFilter]);

  const totalPages = pageCount(filteredRows.length);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filteredRows, safePage]);
  const visibleIds = paginatedRows.map((agency) => agency.id);
  const selectedRows = filteredRows.filter((agency) => selectedIds.includes(agency.id));
  const selectedInactive = selectedRows.filter((agency) => !agency.active);

  function toggleSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleSelectVisible() {
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds])));
  }

  async function handleBulkArchive() {
    try {
      for (const agency of selectedRows) {
        if (agency.active) {
          await deleteAgency(agency.id);
        }
      }
      await reload();
      setSelectedIds([]);
      setBulkAction(null);
      success("Agencias archivadas.");
    } catch (bulkError) {
      console.error(bulkError);
      error("No se pudieron archivar las agencias seleccionadas.");
    }
  }

  async function handleBulkActivate() {
    try {
      for (const agency of selectedInactive) {
        await toggleAgency(agency);
      }
      await reload();
      setSelectedIds([]);
      setBulkAction(null);
      success("Agencias activadas.");
    } catch (bulkError) {
      console.error(bulkError);
      error("No se pudieron activar las agencias seleccionadas.");
    }
  }

  function handleExport() {
    downloadCsv(
      "theocore-agencias.csv",
      filteredRows.map((agency) => ({
        agencia: agency.commercial_name,
        razon_social: agency.legal_name,
        pais: agency.countryLabel,
        owner: agency.owner?.full_name || "Sin owner",
        owner_email: agency.owner?.email || "",
        equipo_activo: agency.teamCount,
        viajeros_activos: agency.travelerCount,
        brains: agency.brainCount,
        contacto: agency.email_contact,
        whatsapp: agency.whatsapp || "",
        estado: agency.active ? "Activa" : "Inactiva",
        alta: agency.createdLabel,
      }))
    );
    success("CSV de agencias exportado.");
  }

  const toolbar = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por agencia, owner o contacto" className={`${toolbarInputClass()} pl-11`} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:flex">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")} className={toolbarInputClass()}>
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className={toolbarInputClass()}>
            <option value="all">Todos los paises</option>
            {countries.map((country) => <option key={country.code} value={country.code}>{country.emoji_flag} {country.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span>{filteredRows.length} agencias filtradas</span>
          <span>{selectedIds.length} seleccionadas</span>
          <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />{filteredRows.reduce((total, agency) => total + agency.teamCount, 0)} usuarios activos</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:opacity-90 dark:bg-slate-800 dark:text-slate-200"><Download className="h-4 w-4" />Exportar CSV</button>
          <button onClick={() => setBulkAction("activate")} disabled={selectedInactive.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Power className="h-4 w-4" />Activar seleccionadas</button>
          <button onClick={() => setBulkAction("archive")} disabled={selectedIds.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Trash2 className="h-4 w-4" />Archivar seleccionadas</button>
        </div>
      </div>
    </div>
  );

  const action = (
    <div className="flex flex-wrap gap-2">
      <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm"><Download className="h-4 w-4" />Exportar</button>
      <button onClick={() => { setModalAgency(null); setIsModalOpen(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"><Plus className="h-4 w-4" />Nueva agencia</button>
    </div>
  );

  return (
    <>
      <CrudPageShell title="Agencias" description="Gestion centralizada de agencias, con owner principal, equipo, viajeros, brains y acciones operativas masivas." action={action} toolbar={toolbar}>
        {loading ? <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Cargando agencias...</div> : filteredRows.length === 0 ? <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">No hay agencias que coincidan con los filtros.</div> : <><div className="flex items-center justify-between px-6 py-4 text-sm text-slate-500 dark:text-slate-400"><span>{filteredRows.length} resultados</span><span>Pagina {safePage} de {totalPages}</span></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50/80 text-left text-slate-500 dark:bg-slate-800/60 dark:text-slate-300"><tr><th className="px-4 py-4 font-medium"><input type="checkbox" checked={visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))} onChange={toggleSelectVisible} /></th><th className="px-6 py-4 font-medium">Agencia</th><th className="px-6 py-4 font-medium">Owner</th><th className="px-6 py-4 font-medium">Pais</th><th className="px-6 py-4 font-medium">Equipo</th><th className="px-6 py-4 font-medium">Viajeros</th><th className="px-6 py-4 font-medium">Brains</th><th className="px-6 py-4 font-medium">Estado</th><th className="px-6 py-4 font-medium">Acciones</th></tr></thead><tbody>{paginatedRows.map((agency) => <tr key={agency.id} className="border-t border-slate-200/70 dark:border-slate-800"><td className="px-4 py-4 align-top"><input type="checkbox" checked={selectedIds.includes(agency.id)} onChange={() => toggleSelection(agency.id)} /></td><td className="px-6 py-4 align-top"><div className="flex items-start gap-3"><div className="rounded-2xl bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"><Building2 className="h-4 w-4" /></div><div><div className="font-medium text-slate-900 dark:text-slate-100">{agency.commercial_name}</div><div className="text-xs text-slate-500 dark:text-slate-400">{agency.legal_name}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{agency.email_contact}</div></div></div></td><td className="px-6 py-4 align-top"><div className="text-slate-700 dark:text-slate-200">{agency.owner?.full_name || "Sin owner"}</div><div className="text-xs text-slate-500 dark:text-slate-400">{agency.owner?.email || "Sin email"}</div></td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{agency.countryLabel}</td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{agency.teamCount}</td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{agency.travelerCount}</td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{agency.brainCount}</td><td className="px-6 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${agency.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{agency.active ? "Activa" : "Inactiva"}</span></td><td className="px-6 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => { setModalAgency(agency); setIsModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white"><Pencil className="h-3.5 w-3.5" />Editar</button><button onClick={() => setConfirmState({ type: "toggle", agency })} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-medium text-white"><Power className="h-3.5 w-3.5" />{agency.active ? "Desactivar" : "Activar"}</button><button onClick={() => setConfirmState({ type: "delete", agency })} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white"><Trash2 className="h-3.5 w-3.5" />Archivar</button></div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-200/70 px-6 py-4 dark:border-slate-800"><button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Anterior</button><button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Siguiente</button></div></>}
      </CrudPageShell>

      <AgencyFormModal open={isModalOpen} agency={modalAgency} countries={countries} brains={brains} assignedBrainIds={modalAgency ? brainAssignments[modalAgency.id] || [] : []} assignedBrainDetails={modalAgency ? brainAssignmentDetailsByAgency[modalAgency.id] || [] : []} agencyDomains={modalAgency ? domainByAgency[modalAgency.id] || [] : []} agencyMarketConfigs={modalAgency ? marketConfigByAgency[modalAgency.id] || [] : []} agencyBranding={modalAgency ? brandingByAgency[modalAgency.id] || null : null} onClose={() => setIsModalOpen(false)} onSave={saveAgency} onSaved={async (message) => { await reload(); success(message); }} />

      {confirmState ? <ConfirmDialog title={confirmState.type === "delete" ? "Archivar agencia" : "Cambiar estado de la agencia"} message={confirmState.type === "delete" ? `Se archivara ${confirmState.agency.commercial_name} y quedara inactiva sin borrar sus relaciones.` : `Se actualizara el estado de ${confirmState.agency.commercial_name}.`} confirmText={confirmState.type === "delete" ? "Archivar" : "Confirmar"} confirmVariant={confirmState.type === "delete" ? "danger" : "primary"} onCancel={() => setConfirmState(null)} onConfirm={async () => { const current = confirmState; setConfirmState(null); if (current.type === "delete") await handleDeleteAgency(current.agency); else await handleToggleAgency(current.agency); }} /> : null}

      {bulkAction ? <ConfirmDialog title={bulkAction === "archive" ? "Archivar agencias" : "Activar agencias"} message={bulkAction === "archive" ? `Se archivaran ${selectedRows.length} agencias seleccionadas.` : `Se activaran ${selectedInactive.length} agencias seleccionadas.`} confirmText={bulkAction === "archive" ? "Archivar" : "Activar"} confirmVariant={bulkAction === "archive" ? "danger" : "primary"} onCancel={() => setBulkAction(null)} onConfirm={bulkAction === "archive" ? handleBulkArchive : handleBulkActivate} /> : null}
    </>
  );
}

