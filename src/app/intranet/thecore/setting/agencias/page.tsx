"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Download, Loader2, Pencil, Plus, Power, Search, Trash2, Upload, Users } from "lucide-react";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import CrudPageShell from "@/components/intracore/CrudPageShell";
import { useToast } from "@/components/system/ToastProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { validateAgencyForm } from "@/lib/validation/theocore";
import { downloadCsv } from "@/lib/utils/csv";
import {
  type Agency,
  type AgencyBranding,
  type AgencyDomain,
  type AgencyMarketConfig,
  type AgencySavePayload,
  useGlobalAgencies,
} from "@/hooks/theocore/useGlobalAgencies";

const PAGE_SIZE = 10;
const BRAND_THEME_STORAGE_KEY = "theocore.branding.themes.v1";
const DEFAULT_BRANDING_COLORS = {
  primary: "#f97316",
  secondary: "#0f172a",
  accent: "#06b6d4",
  stickyBg: "#ffffff",
  stickyText: "#0f172a",
} as const;
const MARKET_DEFAULTS: Record<string, { language_code: string; currency_code: string; timezone: string }> = {
  ES: { language_code: "es", currency_code: "EUR", timezone: "Europe/Madrid" },
  JP: { language_code: "ja", currency_code: "JPY", timezone: "Asia/Tokyo" },
  PE: { language_code: "es", currency_code: "PEN", timezone: "America/Lima" },
  US: { language_code: "en", currency_code: "USD", timezone: "America/New_York" },
  MX: { language_code: "es", currency_code: "MXN", timezone: "America/Mexico_City" },
};
type AgencyModalTab = "general" | "domains" | "branding" | "brains";

type LogoCropMode = "horizontal" | "square";
type AgencyBrandTheme = {
  id: string;
  name: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  stickyBgColor: string;
  stickyTextColor: string;
  createdAt: string;
};

function parseTravelerHomeConfig(heroConfig: Record<string, unknown> | null | undefined) {
  const safeHero = heroConfig && typeof heroConfig === "object" ? heroConfig : {};
  const travelerHome =
    safeHero &&
    typeof safeHero === "object" &&
    "traveler_home" in safeHero &&
    safeHero.traveler_home &&
    typeof safeHero.traveler_home === "object"
      ? (safeHero.traveler_home as Record<string, unknown>)
      : {};

  return {
    stickyBgColor:
      typeof travelerHome.sticky_bg_color === "string" ? travelerHome.sticky_bg_color : "",
    stickyTextColor:
      typeof travelerHome.sticky_text_color === "string" ? travelerHome.sticky_text_color : "",
  };
}

function AgencyFormModal({
  open,
  agency,
  branding,
  countries,
  brains,
  assignedBrainIds,
  assignedDomains,
  assignedMarkets,
  onClose,
  onSave,
  onSaved,
}: {
  open: boolean;
  agency: Agency | null;
  branding: AgencyBranding | null;
  countries: Array<{ code: string; name: string; emoji_flag: string }>;
  brains: Array<{ id: string; name: string; active: boolean; target_lang: string | null }>;
  assignedBrainIds: string[];
  assignedDomains: AgencyDomain[];
  assignedMarkets: AgencyMarketConfig[];
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
  const [active, setActive] = useState(true);
  const [selectedBrains, setSelectedBrains] = useState<string[]>([]);
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [stickyBgColor, setStickyBgColor] = useState("");
  const [stickyTextColor, setStickyTextColor] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoCropMode, setLogoCropMode] = useState<LogoCropMode>("horizontal");
  const [themeName, setThemeName] = useState("");
  const [savedThemes, setSavedThemes] = useState<AgencyBrandTheme[]>([]);
  const [domains, setDomains] = useState<Array<{ id?: string; domain: string; country_code: string | null; is_primary: boolean; active: boolean }>>([]);
  const [markets, setMarkets] = useState<Array<{
    id?: string;
    country_code: string;
    language_code: string;
    currency_code: string;
    timezone: string;
    default_brain_id: string | null;
    active: boolean;
  }>>([]);
  const [domainDraft, setDomainDraft] = useState("");
  const [newMarketCountry, setNewMarketCountry] = useState("");
  const [activeTab, setActiveTab] = useState<AgencyModalTab>("general");
  const { error, success } = useToast();

  useEffect(() => {
    setSavedThemes(loadStoredThemes());
  }, []);

  useEffect(() => {
    if (!open) return;
    const travelerHomeConfig = parseTravelerHomeConfig(branding?.hero_config);
    setCommercialName(agency?.commercial_name ?? "");
    setLegalName(agency?.legal_name ?? "");
    setCountryCode(agency?.country_code ?? countries[0]?.code ?? "ES");
    setAddress(agency?.address ?? "");
    setWhatsapp(agency?.whatsapp ?? "");
    setEmailContact(agency?.email_contact ?? "");
    setEmailEmergency(agency?.email_emergency ?? "");
    setTaxId(agency?.tax_id ?? "");
    setBankInformation(JSON.stringify(agency?.bank_information ?? {}, null, 2));
    setActive(agency?.active ?? true);
    setSelectedBrains(assignedBrainIds);
    setBrandName(branding?.brand_name ?? "");
    setLogoUrl(branding?.logo_url ?? "");
    setPrimaryColor(branding?.primary_color ?? "");
    setSecondaryColor(branding?.secondary_color ?? "");
    setAccentColor(branding?.accent_color ?? "");
    setStickyBgColor(travelerHomeConfig.stickyBgColor);
    setStickyTextColor(travelerHomeConfig.stickyTextColor);
    setThemeName(branding?.brand_name || agency?.commercial_name || "");
    setDomains(
      (assignedDomains || []).map((item, index) => ({
        id: item.id,
        domain: normalizeDomainInput(item.domain),
        country_code: item.country_code ?? agency?.country_code ?? null,
        is_primary: item.is_primary || index === 0,
        active: item.active ?? true,
      }))
    );
    setMarkets(
      (assignedMarkets || []).map((item) => ({
        id: item.id,
        country_code: (item.country_code || agency?.country_code || "ES").toUpperCase(),
        language_code: (item.language_code || "es").toLowerCase(),
        currency_code: (item.currency_code || "EUR").toUpperCase(),
        timezone: item.timezone || "Europe/Madrid",
        default_brain_id: item.default_brain_id || null,
        active: item.active !== false,
      }))
    );
    setDomainDraft("");
    setNewMarketCountry(agency?.country_code ?? countries[0]?.code ?? "ES");
    setActiveTab("general");
  }, [agency, assignedBrainIds, assignedDomains, assignedMarkets, branding, countries, open]);

  const stickyContrast = useMemo(
    () => getContrastAssessment(stickyBgColor, stickyTextColor),
    [stickyBgColor, stickyTextColor]
  );

  const validation = useMemo(
    () =>
      validateAgencyForm({
        commercialName,
        legalName,
        countryCode,
        emailContact,
        emailEmergency,
        whatsapp,
        bankInformation,
        brandName,
        logoUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        stickyBgColor,
        stickyTextColor,
      }),
    [
      commercialName,
      legalName,
      countryCode,
      emailContact,
      emailEmergency,
      whatsapp,
      bankInformation,
      brandName,
      logoUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      stickyBgColor,
      stickyTextColor,
    ]
  );

  if (!open) return null;

  const invalidDomain = domains.find((item) => !isValidDomain(item.domain));
  const missingDomainForActive = active && domains.length === 0;
  const missingPrimaryDomain = domains.length > 0 && !domains.some((item) => item.is_primary);
  const requiredMarketCountries = Array.from(new Set(domains.map((item) => item.country_code || countryCode).filter(Boolean)));
  const missingMarketsForDomains = requiredMarketCountries.filter((code) => !markets.some((market) => market.active && market.country_code === code));
  const canSubmit =
    Object.keys(validation).length === 0 &&
    !invalidDomain &&
    !missingDomainForActive &&
    !missingPrimaryDomain &&
    !(active && missingMarketsForDomains.length > 0);
  const tabs: Array<{ id: AgencyModalTab; label: string; hint: string }> = [
    { id: "general", label: "Datos", hint: "Comercial y contacto" },
    { id: "domains", label: "Dominios", hint: "Host y mercados" },
    { id: "branding", label: "Branding", hint: "Portada traveler" },
    { id: "brains", label: "Brains", hint: "Asignacion y JSON" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
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
        brain_ids: selectedBrains,
        domains: domains.map((item, index) => ({
          id: item.id,
          domain: normalizeDomainInput(item.domain),
          country_code: item.country_code || countryCode,
          is_primary: item.is_primary || index === 0,
          active: true,
        })),
        markets: markets.map((item) => ({
          id: item.id,
          country_code: item.country_code,
          language_code: item.language_code,
          currency_code: item.currency_code,
          timezone: item.timezone,
          default_brain_id: item.default_brain_id || null,
          active: item.active !== false,
        })),
        branding: {
          brand_name: brandName.trim() || null,
          logo_url: logoUrl.trim() || null,
          primary_color: primaryColor.trim() || null,
          secondary_color: secondaryColor.trim() || null,
          accent_color: accentColor.trim() || null,
          sticky_bg_color: stickyBgColor.trim() || null,
          sticky_text_color: stickyTextColor.trim() || null,
        },
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

  function restoreDefaultColors() {
    setPrimaryColor(DEFAULT_BRANDING_COLORS.primary);
    setSecondaryColor(DEFAULT_BRANDING_COLORS.secondary);
    setAccentColor(DEFAULT_BRANDING_COLORS.accent);
    setStickyBgColor(DEFAULT_BRANDING_COLORS.stickyBg);
    setStickyTextColor(DEFAULT_BRANDING_COLORS.stickyText);
    success("Colores restaurados a valores por defecto.");
  }

  function addDomain() {
    const normalized = normalizeDomainInput(domainDraft);
    if (!normalized) return;
    if (!isValidDomain(normalized)) {
      error("Dominio invalido. Ejemplo: subdominio.midominio.com");
      return;
    }

    setDomains((current) => {
      if (current.some((item) => item.domain === normalized)) return current;
      const isFirst = current.length === 0;
      return [
        ...current,
        {
          domain: normalized,
          country_code: countryCode,
          is_primary: isFirst,
          active: true,
        },
      ];
    });
    setDomainDraft("");
  }

  function removeDomain(domain: string) {
    setDomains((current) => {
      const next = current.filter((item) => item.domain !== domain);
      if (next.length > 0 && !next.some((item) => item.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
  }

  function setPrimaryDomain(domain: string) {
    setDomains((current) => current.map((item) => ({ ...item, is_primary: item.domain === domain })));
  }

  function setDomainCountry(domain: string, nextCountryCode: string) {
    setDomains((current) =>
      current.map((item) =>
        item.domain === domain
          ? { ...item, country_code: nextCountryCode || null }
          : item
      )
    );
  }

  function addMarketForCountry(nextCountryCode: string) {
    const code = (nextCountryCode || "").trim().toUpperCase();
    if (!code) return;

    setMarkets((current) => {
      if (current.some((item) => item.country_code === code)) return current;
      const defaults = getMarketDefaults(code);
      return [
        ...current,
        {
          country_code: code,
          language_code: defaults.language_code,
          currency_code: defaults.currency_code,
          timezone: defaults.timezone,
          default_brain_id: null,
          active: true,
        },
      ];
    });
  }

  function removeMarket(countryCode: string) {
    setMarkets((current) => current.filter((item) => item.country_code !== countryCode));
  }

  function updateMarket(
    countryCode: string,
    patch: Partial<{
      country_code: string;
      language_code: string;
      currency_code: string;
      timezone: string;
      default_brain_id: string | null;
      active: boolean;
    }>
  ) {
    setMarkets((current) =>
      current.map((item) =>
        item.country_code === countryCode
          ? {
              ...item,
              ...patch,
              country_code: patch.country_code ? patch.country_code.toUpperCase() : item.country_code,
              language_code: patch.language_code ? patch.language_code.toLowerCase() : item.language_code,
              currency_code: patch.currency_code ? patch.currency_code.toUpperCase() : item.currency_code,
            }
          : item
      )
    );
  }

  function addMissingMarketsFromDomains() {
    for (const code of requiredMarketCountries) {
      addMarketForCountry(code);
    }
  }

  function saveTheme() {
    const nextName = themeName.trim();
    if (!nextName) {
      error("Escribe un nombre para guardar el tema.");
      return;
    }

    const normalizedName = nextName.toLowerCase();
    const nextTheme: AgencyBrandTheme = {
      id: crypto.randomUUID(),
      name: nextName,
      brandName: brandName.trim(),
      logoUrl: logoUrl.trim(),
      primaryColor: normalizeColorForPicker(primaryColor, DEFAULT_BRANDING_COLORS.primary),
      secondaryColor: normalizeColorForPicker(secondaryColor, DEFAULT_BRANDING_COLORS.secondary),
      accentColor: normalizeColorForPicker(accentColor, DEFAULT_BRANDING_COLORS.accent),
      stickyBgColor: normalizeColorForPicker(stickyBgColor, DEFAULT_BRANDING_COLORS.stickyBg),
      stickyTextColor: normalizeColorForPicker(stickyTextColor, DEFAULT_BRANDING_COLORS.stickyText),
      createdAt: new Date().toISOString(),
    };

    setSavedThemes((current) => {
      const withoutSameName = current.filter((theme) => theme.name.toLowerCase() !== normalizedName);
      const nextThemes = [nextTheme, ...withoutSameName].slice(0, 25);
      storeThemes(nextThemes);
      return nextThemes;
    });
    success("Tema guardado y disponible para otras agencias.");
  }

  function applyTheme(theme: AgencyBrandTheme) {
    setBrandName(theme.brandName);
    setLogoUrl(theme.logoUrl);
    setPrimaryColor(theme.primaryColor);
    setSecondaryColor(theme.secondaryColor);
    setAccentColor(theme.accentColor);
    setStickyBgColor(theme.stickyBgColor);
    setStickyTextColor(theme.stickyTextColor);
    setThemeName(theme.name);
    success(`Tema "${theme.name}" aplicado.`);
  }

  function deleteTheme(themeId: string) {
    setSavedThemes((current) => {
      const nextThemes = current.filter((theme) => theme.id !== themeId);
      storeThemes(nextThemes);
      return nextThemes;
    });
    success("Tema eliminado.");
  }

  async function uploadLogo(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const sourceFile = fileList[0];
    setUploadingLogo(true);
    try {
      const file = await cropLogoFile(sourceFile, logoCropMode);
      const body = new FormData();
      body.append("files", file);
      if (agency?.id) body.append("agencyId", agency.id);

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/catalog/upload-image", {
        method: "POST",
        body,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No se pudo subir el logo.");

      const uploadedLogo =
        Array.isArray(payload?.files) &&
        typeof payload.files[0]?.url === "string" &&
        payload.files[0].url.trim().length > 0
          ? payload.files[0].url
          : null;

      if (!uploadedLogo) throw new Error("No se recibio URL del logo subido.");
      setLogoUrl(uploadedLogo);
      success(`Logo subido con recorte ${logoCropMode === "horizontal" ? "horizontal 3:1" : "cuadrado 1:1"}.`);
    } catch (uploadError) {
      console.error(uploadError);
      error(uploadError instanceof Error ? uploadError.message : "No se pudo subir el logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{agency ? "Editar agencia" : "Nueva agencia"}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Gestiona datos comerciales, branding de /traveler y brains asignados.</p></div><button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cerrar</button></div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl border px-3 py-2 text-left transition ${
                  activeTab === tab.id
                    ? "border-cyan-400 bg-cyan-50 dark:border-cyan-500 dark:bg-cyan-950/40"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                }`}
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tab.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{tab.hint}</div>
              </button>
            ))}
          </div>
          {activeTab === "general" ? (
            <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre comercial *" error={validation.commercialName}><input value={commercialName} onChange={(e) => setCommercialName(e.target.value)} className={inputClass(validation.commercialName)} /></Field>
            <Field label="Razon social *" error={validation.legalName}><input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputClass(validation.legalName)} /></Field>
            <Field label="Pais *" error={validation.countryCode}><select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={inputClass(validation.countryCode)}>{countries.map((country) => (<option key={country.code} value={country.code}>{country.emoji_flag} {country.name}</option>))}</select></Field>
            <Field label="WhatsApp" error={validation.whatsapp}><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass(validation.whatsapp)} /></Field>
            <Field label="Correo de contacto *" error={validation.emailContact}><input type="email" value={emailContact} onChange={(e) => setEmailContact(e.target.value)} className={inputClass(validation.emailContact)} /></Field>
            <Field label="Correo de emergencia" error={validation.emailEmergency}><input type="email" value={emailEmergency} onChange={(e) => setEmailEmergency(e.target.value)} className={inputClass(validation.emailEmergency)} /></Field>
            <Field label="Tax ID"><input value={taxId} onChange={(e) => setTaxId(e.target.value)} className={inputClass()} /></Field>
            <Field label="Estado"><label className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 px-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Agencia activa</label></Field>
              </div>
              <Field label="Direccion (footer /traveler)"><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass()} /></Field>
            </>
          ) : null}
          {activeTab === "domains" ? (
            <>
              <Field label="Dominios / subdominios de traveler">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={domainDraft}
                  onChange={(e) => setDomainDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDomain();
                    }
                  }}
                  className={inputClass()}
                  placeholder="ej: collaviajes.com o japan.collaviajes.com"
                />
                <button type="button" onClick={addDomain} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-slate-100 dark:text-slate-900">Agregar</button>
              </div>
              {invalidDomain ? <div className="text-xs text-rose-600 dark:text-rose-300">Hay dominios invalidos. Usa solo host, sin ruta.</div> : null}
              {missingDomainForActive ? <div className="text-xs text-rose-600 dark:text-rose-300">La agencia activa necesita al menos un dominio principal.</div> : null}
              {missingPrimaryDomain ? <div className="text-xs text-rose-600 dark:text-rose-300">Marca un dominio como principal.</div> : null}
              <div className="space-y-2">
                {domains.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Sin dominios. Si no agregas uno, ese host no resolvera la agencia.
                  </div>
                ) : (
                  domains.map((item) => (
                    <div key={item.domain} className="flex flex-col gap-2 rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <input type="radio" name="primary-domain" checked={item.is_primary} onChange={() => setPrimaryDomain(item.domain)} className="mt-1" />
                        <div>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.domain}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.is_primary ? "Primario" : "Secundario"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={item.country_code || countryCode}
                          onChange={(e) => setDomainCountry(item.domain, e.target.value)}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                          {countries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.emoji_flag} {country.code}
                            </option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removeDomain(item.domain)} className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-medium text-white">Quitar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Para que funcione, el dominio tambien debe estar agregado en Vercel y apuntando por DNS.</div>
            </div>
          </Field>
          <Field label="Mercados traveler (por pais)">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <select
                    value={newMarketCountry}
                    onChange={(e) => setNewMarketCountry(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {countries.map((country) => (
                      <option key={`market-country-${country.code}`} value={country.code}>
                        {country.emoji_flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => addMarketForCountry(newMarketCountry)}
                    className="rounded-xl bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white transition hover:opacity-90 dark:bg-slate-100 dark:text-slate-900"
                  >
                    Agregar mercado
                  </button>
                </div>
                {requiredMarketCountries.map((code) => (
                  <button
                    key={`ensure-market-${code}`}
                    type="button"
                    onClick={() => addMarketForCountry(code)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Crear mercado {code}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addMissingMarketsFromDomains}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Crear faltantes
                </button>
              </div>
              {active && missingMarketsForDomains.length > 0 ? (
                <div className="text-xs text-rose-600 dark:text-rose-300">
                  Faltan mercados activos para: {missingMarketsForDomains.join(", ")}.
                </div>
              ) : null}
              <div className="space-y-2">
                {markets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Sin mercados configurados.
                  </div>
                ) : (
                  markets.map((market) => (
                    <div key={`${market.id || "new"}-${market.country_code}`} className="grid gap-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-6">
                      <select
                        value={market.country_code}
                        onChange={(e) => updateMarket(market.country_code, { country_code: e.target.value })}
                        className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.emoji_flag} {country.code}
                          </option>
                        ))}
                      </select>
                      <input value={market.language_code} onChange={(e) => updateMarket(market.country_code, { language_code: e.target.value })} className="h-9 rounded-xl border border-slate-200 px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder="idioma (ja)" />
                      <input value={market.currency_code} onChange={(e) => updateMarket(market.country_code, { currency_code: e.target.value })} className="h-9 rounded-xl border border-slate-200 px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder="moneda (JPY)" />
                      <input value={market.timezone} onChange={(e) => updateMarket(market.country_code, { timezone: e.target.value })} className="h-9 rounded-xl border border-slate-200 px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder="timezone" />
                      <select
                        value={market.default_brain_id || ""}
                        onChange={(e) => updateMarket(market.country_code, { default_brain_id: e.target.value || null })}
                        className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="">Brain por defecto</option>
                        {brains.map((brain) => (
                          <option key={brain.id} value={brain.id}>
                            {brain.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <input type="checkbox" checked={market.active} onChange={(e) => updateMarket(market.country_code, { active: e.target.checked })} />
                          Activo
                        </label>
                        <button type="button" onClick={() => removeMarket(market.country_code)} className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-medium text-white">Quitar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Field>
            </>
          ) : null}
          {activeTab === "branding" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
            <Field label="Brand / Nombre mostrado" error={validation.brandName}><input value={brandName} onChange={(e) => setBrandName(e.target.value)} className={inputClass(validation.brandName)} placeholder="Ej: Colla Viajes" /></Field>
            <Field label="Logo (URL o subida)" error={validation.logoUrl}>
              <div className="space-y-3">
                <div className="inline-flex rounded-2xl border border-slate-200 p-1 text-xs dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLogoCropMode("horizontal")}
                    className={`rounded-xl px-3 py-1.5 font-medium transition ${logoCropMode === "horizontal" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                  >
                    Horizontal 3:1
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoCropMode("square")}
                    className={`rounded-xl px-3 py-1.5 font-medium transition ${logoCropMode === "square" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                  >
                    Cuadrado 1:1
                  </button>
                </div>
                <div className="flex gap-2">
                  <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className={inputClass(validation.logoUrl)} placeholder="https://.../logo.png" />
                  <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingLogo ? "Subiendo..." : "Subir"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        void uploadLogo(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">El logo se recorta automaticamente al formato seleccionado antes de subir.</p>
                {logoUrl ? <a href={logoUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-700 underline dark:text-cyan-300">Ver logo actual</a> : null}
              </div>
            </Field>
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
              <span className="text-xs text-slate-600 dark:text-slate-300">Paleta de traveler</span>
              <button type="button" onClick={restoreDefaultColors} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">Restaurar colores por defecto</button>
            </div>
            <ColorField label="Color primario" value={primaryColor} onChange={setPrimaryColor} error={validation.primaryColor} placeholder="#f97316" fallback="#f97316" />
            <ColorField label="Color secundario" value={secondaryColor} onChange={setSecondaryColor} error={validation.secondaryColor} placeholder="#0f172a" fallback="#0f172a" />
            <ColorField label="Color acento" value={accentColor} onChange={setAccentColor} error={validation.accentColor} placeholder="#06b6d4" fallback="#06b6d4" />
            <ColorField label="Sticky fondo" value={stickyBgColor} onChange={setStickyBgColor} error={validation.stickyBgColor} placeholder="#ffffff" fallback="#ffffff" />
            <ColorField label="Sticky texto" value={stickyTextColor} onChange={setStickyTextColor} error={validation.stickyTextColor} placeholder="#0f172a" fallback="#0f172a" />
            <Field label="Contraste Sticky (fondo/texto)">
              <div className={`rounded-2xl border px-3 py-3 text-xs ${stickyContrast.status === "fail" ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200" : stickyContrast.status === "warn" ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200" : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"}`}>
                <div className="font-semibold">{stickyContrast.label}</div>
                <div className="mt-1">{stickyContrast.message}</div>
                <div className="mt-1 text-[11px]">Ratio actual: {stickyContrast.ratioLabel}</div>
                <div className="mt-2 text-[11px] opacity-80">Recomendado para texto normal: 4.5:1 o superior.</div>
              </div>
            </Field>
            <Field label="Temas guardados">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input value={themeName} onChange={(e) => setThemeName(e.target.value)} className={inputClass()} placeholder="Nombre del tema" />
                  <button type="button" onClick={saveTheme} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-slate-100 dark:text-slate-900">Guardar</button>
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {savedThemes.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">Todavia no hay temas guardados.</div> : savedThemes.map((theme) => <div key={theme.id} className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700"><div className="text-xs font-medium text-slate-800 dark:text-slate-100">{theme.name}</div><div className="mt-1 flex items-center gap-1">{[theme.primaryColor, theme.secondaryColor, theme.accentColor, theme.stickyBgColor, theme.stickyTextColor].map((item, index) => <span key={`${theme.id}-${index}`} className="h-3 w-3 rounded-full border border-slate-300 dark:border-slate-700" style={{ backgroundColor: item }} />)}</div><div className="mt-2 flex gap-2"><button type="button" onClick={() => applyTheme(theme)} className="rounded-lg bg-cyan-600 px-2 py-1 text-[11px] font-medium text-white">Aplicar</button><button type="button" onClick={() => deleteTheme(theme.id)} className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-medium text-white">Eliminar</button></div></div>)}
                </div>
              </div>
            </Field>
          </div>
          <TravelerLandingPreview
            active={active}
            brandName={brandName || commercialName}
            logoUrl={logoUrl}
            address={address}
            emailContact={emailContact}
            whatsapp={whatsapp}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            accentColor={accentColor}
            stickyBgColor={stickyBgColor}
            stickyTextColor={stickyTextColor}
          />
            </>
          ) : null}
          {activeTab === "brains" ? (
            <>
              <Field label="Informacion bancaria (JSON)" error={validation.bankInformation}><textarea rows={4} value={bankInformation} onChange={(e) => setBankInformation(e.target.value)} className={`${inputClass(validation.bankInformation)} h-auto py-3 font-mono text-xs`} /></Field>
              <Field label="Brains asignados"><div className="grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 dark:border-slate-700">{brains.length === 0 ? <div className="text-sm text-slate-500 dark:text-slate-400">No hay brains disponibles.</div> : brains.map((brain) => { const checked = selectedBrains.includes(brain.id); return <label key={brain.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><div><div className="font-medium text-slate-800 dark:text-slate-100">{brain.name}</div><div className="text-xs text-slate-500 dark:text-slate-400">{brain.target_lang || "Sin idioma"} · {brain.active ? "Activo" : "Inactivo"}</div></div><input type="checkbox" checked={checked} onChange={() => setSelectedBrains((current) => current.includes(brain.id) ? current.filter((item) => item !== brain.id) : [...current, brain.id])} /></label>; })}</div></Field>
            </>
          ) : null}
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:opacity-90 dark:bg-slate-800 dark:text-slate-200">Cancelar</button><button type="submit" disabled={!canSubmit || saving || uploadingLogo} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{agency ? "Guardar cambios" : "Crear agencia"}</button></div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}{error ? <span className="text-xs text-rose-600 dark:text-rose-300">{error}</span> : null}</label>;
}

function ColorField({
  label,
  value,
  onChange,
  error,
  placeholder,
  fallback = "#0f172a",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  fallback?: string;
}) {
  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizeColorForPicker(value, fallback)}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950"
          aria-label={`${label} picker`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass(error)}
          placeholder={placeholder}
        />
      </div>
    </Field>
  );
}

function normalizeColorForPicker(value: string, fallback = "#0f172a") {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function normalizeDomainInput(rawDomain: string | null | undefined) {
  const value = (rawDomain ?? "").trim().toLowerCase();
  if (!value) return "";

  const withoutProtocol = value.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? "";
  const [hostname] = withoutPath.split(":");
  if (!hostname) return "";
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function isValidDomain(domain: string) {
  if (!domain) return false;
  return /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i.test(domain);
}

function getMarketDefaults(countryCode: string) {
  const code = (countryCode || "").trim().toUpperCase();
  return MARKET_DEFAULTS[code] || {
    language_code: "en",
    currency_code: "USD",
    timezone: "UTC",
  };
}

function loadStoredThemes() {
  if (typeof window === "undefined") return [] as AgencyBrandTheme[];
  try {
    const raw = window.localStorage.getItem(BRAND_THEME_STORAGE_KEY);
    if (!raw) return [] as AgencyBrandTheme[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as AgencyBrandTheme[];
    return parsed.filter(isValidTheme);
  } catch {
    return [] as AgencyBrandTheme[];
  }
}

function storeThemes(themes: AgencyBrandTheme[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BRAND_THEME_STORAGE_KEY, JSON.stringify(themes));
}

function isValidTheme(value: unknown): value is AgencyBrandTheme {
  if (!value || typeof value !== "object") return false;
  const theme = value as Partial<AgencyBrandTheme>;
  return typeof theme.id === "string" && typeof theme.name === "string";
}

async function cropLogoFile(file: File, mode: LogoCropMode) {
  const image = await loadImageFile(file);
  const ratio = mode === "square" ? 1 : 3;
  const crop = getCenteredCrop(image.width, image.height, ratio);
  const outputSize = mode === "square" ? { width: 800, height: 800 } : { width: 1500, height: 500 };
  const canvas = document.createElement("canvas");
  canvas.width = outputSize.width;
  canvas.height = outputSize.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar el recorte del logo.");
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize.width,
    outputSize.height
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("No se pudo generar el archivo recortado."));
        return;
      }
      resolve(result);
    }, "image/png", 0.92);
  });

  const cleanName = (file.name || "logo").replace(/\.[^/.]+$/, "");
  return new File([blob], `${cleanName}-${mode}.png`, { type: "image/png" });
}

function getCenteredCrop(sourceWidth: number, sourceHeight: number, targetRatio: number) {
  const sourceRatio = sourceWidth / sourceHeight;
  if (sourceRatio > targetRatio) {
    const width = Math.round(sourceHeight * targetRatio);
    return { x: Math.round((sourceWidth - width) / 2), y: 0, width, height: sourceHeight };
  }
  const height = Math.round(sourceWidth / targetRatio);
  return { x: 0, y: Math.round((sourceHeight - height) / 2), width: sourceWidth, height };
}

function loadImageFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen del logo."));
    };
    image.src = url;
  });
}

function getContrastAssessment(background: string, foreground: string) {
  const ratio = calculateContrast(background, foreground);
  if (ratio === null) {
    return {
      ratioLabel: "-",
      label: "Contraste no calculable",
      message: "Introduce colores HEX validos para calcular el contraste.",
      status: "warn" as const,
    };
  }
  if (ratio >= 7) {
    return {
      ratioLabel: `${ratio.toFixed(2)}:1`,
      label: "Excelente (AAA)",
      message: "Legibilidad alta para cualquier tamano de texto.",
      status: "pass" as const,
    };
  }
  if (ratio >= 4.5) {
    return {
      ratioLabel: `${ratio.toFixed(2)}:1`,
      label: "Correcto (AA)",
      message: "Cumple para texto normal.",
      status: "pass" as const,
    };
  }
  if (ratio >= 3) {
    return {
      ratioLabel: `${ratio.toFixed(2)}:1`,
      label: "Aceptable solo en texto grande",
      message: "Sube el contraste para parrafos o textos pequenos.",
      status: "warn" as const,
    };
  }
  return {
    ratioLabel: `${ratio.toFixed(2)}:1`,
    label: "Contraste insuficiente",
    message: "Puede costar leerlo. Ajusta fondo o texto sticky.",
    status: "fail" as const,
  };
}

function calculateContrast(background: string, foreground: string) {
  const bg = hexToRgb(normalizeColorForPicker(background, ""));
  const fg = hexToRgb(normalizeColorForPicker(foreground, ""));
  if (!bg || !fg) return null;
  const l1 = getLuminance(bg.r, bg.g, bg.b);
  const l2 = getLuminance(fg.r, fg.g, fg.b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function hexToRgb(hex: string) {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function getLuminance(red: number, green: number, blue: number) {
  const toLinear = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
}

function TravelerLandingPreview({
  active,
  brandName,
  logoUrl,
  address,
  emailContact,
  whatsapp,
  primaryColor,
  secondaryColor,
  accentColor,
  stickyBgColor,
  stickyTextColor,
}: {
  active: boolean;
  brandName: string;
  logoUrl: string;
  address: string;
  emailContact: string;
  whatsapp: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  stickyBgColor: string;
  stickyTextColor: string;
}) {
  const primary = normalizeColorForPicker(primaryColor, DEFAULT_BRANDING_COLORS.primary);
  const secondary = normalizeColorForPicker(secondaryColor, DEFAULT_BRANDING_COLORS.secondary);
  const accent = normalizeColorForPicker(accentColor, DEFAULT_BRANDING_COLORS.accent);
  const stickyBg = normalizeColorForPicker(stickyBgColor, DEFAULT_BRANDING_COLORS.stickyBg);
  const stickyText = normalizeColorForPicker(stickyTextColor, DEFAULT_BRANDING_COLORS.stickyText);
  const displayName = brandName.trim() || "Tu Agencia";

  return (
    <Field label="Vista previa /traveler (live)">
      <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm dark:border-slate-700">
        <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold" style={{ backgroundColor: stickyBg, color: stickyText }}>
          <div className="flex items-center gap-2">
            {logoUrl ? <img src={logoUrl} alt="Logo de agencia" className="h-6 w-6 rounded object-cover" /> : <div className="h-6 w-6 rounded" style={{ backgroundColor: accent }} />}
            <span>{displayName}</span>
          </div>
          <span>Sticky traveler</span>
        </div>
        <div className="px-4 py-8 text-white" style={{ background: `linear-gradient(130deg, ${primary}, ${secondary})` }}>
          <div className="text-lg font-semibold">Explora tu proximo viaje</div>
          <div className="mt-1 text-xs opacity-90">Preview de portada con branding aplicado.</div>
          <button type="button" className="mt-4 rounded-xl px-3 py-2 text-xs font-semibold" style={{ backgroundColor: accent, color: "#0f172a" }}>Boton CTA</button>
        </div>
        <div className="space-y-1 bg-slate-950 px-4 py-3 text-xs text-slate-200">
          <div className="font-medium">{displayName}</div>
          <div>{address.trim() || "Direccion de la agencia"}</div>
          <div>{emailContact.trim() || "correo@agencia.com"} · {whatsapp.trim() || "+34 600 000 000"}</div>
          {!active ? <div className="mt-2 rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] text-amber-200">Agencia desactivada: traveler mostraria landing de inactividad.</div> : null}
        </div>
      </div>
    </Field>
  );
}

function parseJson(value: string) { try { return JSON.parse(value || "{}"); } catch { return {}; } }
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
  const { loading, agencies, countries, brains, brandingByAgency, domainsByAgency, marketConfigsByAgency, brainAssignments, teamCountByAgency, travelerCountByAgency, ownerByAgency, reload, saveAgency, deleteAgency, toggleAgency } = useGlobalAgencies();

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
    const branding = brandingByAgency[agency.id];
    const domains = (domainsByAgency[agency.id] || []).map((item) => item.domain);
    const primaryDomain = domainsByAgency[agency.id]?.find((item) => item.is_primary)?.domain || domains[0] || "";
    return {
      ...agency,
      countryLabel: country ? `${country.emoji_flag} ${country.name}` : agency.country_code,
      brandName: branding?.brand_name || agency.commercial_name,
      primaryDomain,
      domains,
      brainCount: brainAssignments[agency.id]?.length || 0,
      teamCount: teamCountByAgency[agency.id] || 0,
      travelerCount: travelerCountByAgency[agency.id] || 0,
      owner: ownerByAgency[agency.id] || null,
      createdLabel: agency.created_at ? new Date(agency.created_at).toLocaleDateString() : "-",
    };
  }), [agencies, brainAssignments, brandingByAgency, countries, domainsByAgency, ownerByAgency, teamCountByAgency, travelerCountByAgency]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((agency) => {
      const matchesSearch = !term || [agency.commercial_name, agency.brandName, agency.legal_name, agency.email_contact, agency.whatsapp || "", agency.countryLabel, agency.owner?.full_name || "", agency.owner?.email || "", agency.primaryDomain, agency.domains.join(" ")].join(" ").toLowerCase().includes(term);
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
        marca_traveler: agency.brandName || "",
        dominio_primario: agency.primaryDomain || "",
        dominios: agency.domains.join(", "),
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por agencia, brand, owner o contacto" className={`${toolbarInputClass()} pl-11`} />
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
        {loading ? <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Cargando agencias...</div> : filteredRows.length === 0 ? <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">No hay agencias que coincidan con los filtros.</div> : <><div className="flex items-center justify-between px-6 py-4 text-sm text-slate-500 dark:text-slate-400"><span>{filteredRows.length} resultados</span><span>Pagina {safePage} de {totalPages}</span></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50/80 text-left text-slate-500 dark:bg-slate-800/60 dark:text-slate-300"><tr><th className="px-4 py-4 font-medium"><input type="checkbox" checked={visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))} onChange={toggleSelectVisible} /></th><th className="px-6 py-4 font-medium">Agencia</th><th className="px-6 py-4 font-medium">Owner</th><th className="px-6 py-4 font-medium">Pais</th><th className="px-6 py-4 font-medium">Equipo</th><th className="px-6 py-4 font-medium">Viajeros</th><th className="px-6 py-4 font-medium">Brains</th><th className="px-6 py-4 font-medium">Estado</th><th className="px-6 py-4 font-medium">Acciones</th></tr></thead><tbody>{paginatedRows.map((agency) => <tr key={agency.id} className="border-t border-slate-200/70 dark:border-slate-800"><td className="px-4 py-4 align-top"><input type="checkbox" checked={selectedIds.includes(agency.id)} onChange={() => toggleSelection(agency.id)} /></td><td className="px-6 py-4 align-top"><div className="flex items-start gap-3"><div className="rounded-2xl bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"><Building2 className="h-4 w-4" /></div><div><div className="font-medium text-slate-900 dark:text-slate-100">{agency.commercial_name}</div><div className="text-xs text-slate-500 dark:text-slate-400">{agency.legal_name}</div><div className="text-xs text-slate-500 dark:text-slate-400">Brand traveler: {agency.brandName}</div><div className="text-xs text-slate-500 dark:text-slate-400">Dominio: {agency.primaryDomain || "Sin dominio"}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{agency.email_contact}</div></div></div></td><td className="px-6 py-4 align-top"><div className="text-slate-700 dark:text-slate-200">{agency.owner?.full_name || "Sin owner"}</div><div className="text-xs text-slate-500 dark:text-slate-400">{agency.owner?.email || "Sin email"}</div></td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{agency.countryLabel}</td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{agency.teamCount}</td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{agency.travelerCount}</td><td className="px-6 py-4 text-slate-700 dark:text-slate-200">{agency.brainCount}</td><td className="px-6 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${agency.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{agency.active ? "Activa" : "Inactiva"}</span></td><td className="px-6 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => { setModalAgency(agency); setIsModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white"><Pencil className="h-3.5 w-3.5" />Editar</button><button onClick={() => setConfirmState({ type: "toggle", agency })} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-medium text-white"><Power className="h-3.5 w-3.5" />{agency.active ? "Desactivar" : "Activar"}</button><button onClick={() => setConfirmState({ type: "delete", agency })} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white"><Trash2 className="h-3.5 w-3.5" />Archivar</button></div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-200/70 px-6 py-4 dark:border-slate-800"><button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Anterior</button><button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">Siguiente</button></div></>}
      </CrudPageShell>

      <AgencyFormModal open={isModalOpen} agency={modalAgency} branding={modalAgency ? brandingByAgency[modalAgency.id] || null : null} countries={countries} brains={brains} assignedBrainIds={modalAgency ? brainAssignments[modalAgency.id] || [] : []} assignedDomains={modalAgency ? domainsByAgency[modalAgency.id] || [] : []} assignedMarkets={modalAgency ? marketConfigsByAgency[modalAgency.id] || [] : []} onClose={() => setIsModalOpen(false)} onSave={saveAgency} onSaved={async (message) => { await reload(); success(message); }} />

      {confirmState ? <ConfirmDialog title={confirmState.type === "delete" ? "Archivar agencia" : "Cambiar estado de la agencia"} message={confirmState.type === "delete" ? `Se archivara ${confirmState.agency.commercial_name} y quedara inactiva sin borrar sus relaciones.` : `Se actualizara el estado de ${confirmState.agency.commercial_name}.`} confirmText={confirmState.type === "delete" ? "Archivar" : "Confirmar"} confirmVariant={confirmState.type === "delete" ? "danger" : "primary"} onCancel={() => setConfirmState(null)} onConfirm={async () => { const current = confirmState; setConfirmState(null); if (current.type === "delete") await handleDeleteAgency(current.agency); else await handleToggleAgency(current.agency); }} /> : null}

      {bulkAction ? <ConfirmDialog title={bulkAction === "archive" ? "Archivar agencias" : "Activar agencias"} message={bulkAction === "archive" ? `Se archivaran ${selectedRows.length} agencias seleccionadas.` : `Se activaran ${selectedInactive.length} agencias seleccionadas.`} confirmText={bulkAction === "archive" ? "Archivar" : "Activar"} confirmVariant={bulkAction === "archive" ? "danger" : "primary"} onCancel={() => setBulkAction(null)} onConfirm={bulkAction === "archive" ? handleBulkArchive : handleBulkActivate} /> : null}
    </>
  );
}
