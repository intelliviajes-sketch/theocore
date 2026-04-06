"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/system/ToastProvider";
import {
  acknowledgeMarketingAlertEvent,
  getMarketingMaturityScore,
  listAgencyOperationalScope,
  listMarketingAlertEvents,
  listMarketingAlertRules,
  listMarketingAudiences,
  listMarketingAutomations,
  listMarketingCampaignApprovals,
  listMarketingCampaigns,
  listMarketingExperiments,
  listMarketingMarketContent,
  listMarketingOnboardingSteps,
  listMarketingPlaybookTemplates,
  listMarketingReportSnapshots,
  loadMarketingTracking,
  saveMarketingAlertEvent,
  saveMarketingAlertRule,
  saveMarketingAudience,
  saveMarketingAutomation,
  saveMarketingCampaign,
  saveMarketingCampaignApproval,
  saveMarketingExperiment,
  saveMarketingMarketContent,
  saveMarketingOnboardingStep,
  saveMarketingPlaybookTemplate,
  saveMarketingReportSnapshot,
  saveMarketingTracking,
} from "./api";
import type {
  AgencyDomainOperational,
  AgencyMarketConfigOperational,
  MarketingAlertEvent,
  MarketingAlertRule,
  MarketingAudience,
  MarketingAutomation,
  MarketingCampaign,
  MarketingCampaignApproval,
  MarketingExperiment,
  MarketingMaturityScore,
  MarketingMarketContent,
  MarketingOnboardingStep,
  MarketingPlaybookTemplate,
  MarketingReportSnapshot,
  MarketingTrackingConfig,
} from "./types";

type Tab =
  | "planner"
  | "tracking"
  | "audiences"
  | "automations"
  | "experiments"
  | "content"
  | "onboarding"
  | "playbooks"
  | "approvals"
  | "alerts"
  | "reports"
  | "governance";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "planner", label: "Planner" },
  { id: "tracking", label: "Tracking" },
  { id: "audiences", label: "Audiencias" },
  { id: "automations", label: "Automations" },
  { id: "experiments", label: "A/B tests" },
  { id: "content", label: "Contenido" },
  { id: "onboarding", label: "Onboarding" },
  { id: "playbooks", label: "Playbooks" },
  { id: "approvals", label: "Approvals" },
  { id: "alerts", label: "Alertas" },
  { id: "reports", label: "Reportes" },
  { id: "governance", label: "Governance" },
];

function inputClass() {
  return "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
}

function textareaClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
}

function cardClass() {
  return "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900";
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function MarketingHub({ agencyId }: { agencyId: string }) {
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState<Tab>("planner");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [domains, setDomains] = useState<AgencyDomainOperational[]>([]);
  const [markets, setMarkets] = useState<AgencyMarketConfigOperational[]>([]);
  const [marketCode, setMarketCode] = useState("");
  const [domain, setDomain] = useState("");

  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [tracking, setTracking] = useState<MarketingTrackingConfig | null>(null);
  const [audiences, setAudiences] = useState<MarketingAudience[]>([]);
  const [automations, setAutomations] = useState<MarketingAutomation[]>([]);
  const [experiments, setExperiments] = useState<MarketingExperiment[]>([]);
  const [contents, setContents] = useState<MarketingMarketContent[]>([]);
  const [onboarding, setOnboarding] = useState<MarketingOnboardingStep[]>([]);
  const [playbooks, setPlaybooks] = useState<MarketingPlaybookTemplate[]>([]);
  const [approvals, setApprovals] = useState<MarketingCampaignApproval[]>([]);
  const [alertRules, setAlertRules] = useState<MarketingAlertRule[]>([]);
  const [alertEvents, setAlertEvents] = useState<MarketingAlertEvent[]>([]);
  const [reports, setReports] = useState<MarketingReportSnapshot[]>([]);
  const [maturity, setMaturity] = useState<MarketingMaturityScore | null>(null);

  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [jsonA, setJsonA] = useState("{}");
  const [jsonB, setJsonB] = useState("{}");
  const [jsonEvents, setJsonEvents] = useState("[]");
  const [ga4, setGa4] = useState("");
  const [pixel, setPixel] = useState("");
  const [lang, setLang] = useState("es");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [footerAddress, setFooterAddress] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [footerPhone, setFooterPhone] = useState("");
  const [stickyBg, setStickyBg] = useState("#000000");
  const [stickyText, setStickyText] = useState("#ffffff");
  const [kpiJson, setKpiJson] = useState('{"leads":0,"bookings":0}');

  const domainOptions = useMemo(
    () => domains.filter((item) => item.active && (item.country_code === marketCode || item.country_code === null)),
    [domains, marketCode],
  );

  const governance = useMemo(() => {
    const activeDomains = domains.filter((item) => item.active);
    const activeMarkets = markets.filter((item) => item.active);
    const missingMarkets = Array.from(
      new Set(
        activeDomains
          .map((item) => (item.country_code || "").toUpperCase())
          .filter(Boolean)
          .filter((code) => !activeMarkets.some((market) => market.country_code === code)),
      ),
    );
    return {
      activeDomains: activeDomains.length,
      activeMarkets: activeMarkets.length,
      missingMarkets,
      hasPrimary: Boolean(activeDomains.find((item) => item.is_primary)),
      failedDomains: activeDomains.filter((item) => item.installation_status === "failed" || item.ssl_status === "failed"),
    };
  }, [domains, markets]);

  const reloadScope = useCallback(async () => {
    setLoading(true);
    try {
      const scope = await listAgencyOperationalScope(agencyId);
      setDomains(scope.domains);
      setMarkets(scope.markets);
      setMarketCode((current) => current || scope.markets.find((item) => item.active)?.country_code || "");
      setDomain((current) => current || scope.domains.find((item) => item.is_primary)?.domain || "");
    } catch (error) {
      console.error(error);
      showError("No se pudo cargar dominios/mercados.");
    } finally {
      setLoading(false);
    }
  }, [agencyId, showError]);

  const reloadData = useCallback(async () => {
    if (!marketCode) return;
    setLoading(true);
    try {
      const [
        c1,
        t1,
        a1,
        au1,
        e1,
        mc1,
        ob1,
        pb1,
        ap1,
        ar1,
        ae1,
        rp1,
        mm1,
      ] = await Promise.all([
        listMarketingCampaigns(agencyId, marketCode),
        loadMarketingTracking(agencyId, marketCode, domain || null),
        listMarketingAudiences(agencyId, marketCode),
        listMarketingAutomations(agencyId, marketCode),
        listMarketingExperiments(agencyId, marketCode),
        listMarketingMarketContent(agencyId, marketCode),
        listMarketingOnboardingSteps(agencyId, marketCode),
        listMarketingPlaybookTemplates(agencyId, marketCode),
        listMarketingCampaignApprovals(agencyId, marketCode),
        listMarketingAlertRules(agencyId, marketCode, domain || null),
        listMarketingAlertEvents(agencyId, marketCode),
        listMarketingReportSnapshots(agencyId, marketCode),
        getMarketingMaturityScore(agencyId, marketCode),
      ]);
      setCampaigns(c1);
      setTracking(t1);
      setAudiences(a1);
      setAutomations(au1);
      setExperiments(e1);
      setContents(mc1);
      setOnboarding(ob1);
      setPlaybooks(pb1);
      setApprovals(ap1);
      setAlertRules(ar1);
      setAlertEvents(ae1);
      setReports(rp1);
      setMaturity(mm1);
      setGa4(t1?.ga4_measurement_id || "");
      setPixel(t1?.meta_pixel_id || "");
      setJsonEvents(JSON.stringify(t1?.conversion_events || [], null, 2));
    } catch (error) {
      console.error(error);
      showError("No se pudo cargar Marketing Hub.");
    } finally {
      setLoading(false);
    }
  }, [agencyId, domain, marketCode, showError]);

  useEffect(() => {
    void reloadScope();
  }, [reloadScope]);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  useEffect(() => {
    const selected =
      contents.find((item) => item.language_code === lang && ((domain && item.domain === domain) || (!domain && item.domain === null))) ||
      contents.find((item) => item.language_code === lang) ||
      contents[0];
    if (!selected) return;
    setHeroTitle(selected.hero_title || "");
    setHeroSubtitle(selected.hero_subtitle || "");
    setBrandName(selected.brand_name || "");
    setLogoUrl(selected.logo_url || "");
    setFooterAddress(selected.footer_address || "");
    setFooterEmail(selected.footer_email || "");
    setFooterPhone(selected.footer_phone || "");
    setStickyBg(selected.sticky_bg_color || "#000000");
    setStickyText(selected.sticky_text_color || "#ffffff");
  }, [contents, domain, lang]);

  async function saveCampaign() {
    if (!marketCode || !name.trim()) return;
    setSaving(true);
    try {
      await saveMarketingCampaign(agencyId, {
        market_code: marketCode,
        domain: domain || null,
        name,
        objective: objective || null,
      });
      setName("");
      setObjective("");
      await reloadData();
      success("Campana guardada.");
    } catch (error) {
      console.error(error);
      showError("No se pudo guardar campana.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTrackingConfig() {
    if (!marketCode) return;
    setSaving(true);
    try {
      await saveMarketingTracking(agencyId, {
        id: tracking?.id,
        market_code: marketCode,
        domain: domain || null,
        ga4_measurement_id: ga4 || null,
        meta_pixel_id: pixel || null,
        conversion_events: parseJsonArray(jsonEvents) as Array<Record<string, unknown>>,
      });
      await reloadData();
      success("Tracking guardado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo guardar tracking.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAudience() {
    if (!marketCode || !name.trim()) return;
    setSaving(true);
    try {
      await saveMarketingAudience(agencyId, {
        market_code: marketCode,
        name,
        provider: "internal",
        rule_json: { event: "start_chat" },
      });
      setName("");
      await reloadData();
      success("Audiencia guardada.");
    } catch (error) {
      console.error(error);
      showError("No se pudo guardar audiencia.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAutomation() {
    if (!marketCode || !name.trim()) return;
    setSaving(true);
    try {
      await saveMarketingAutomation(agencyId, {
        market_code: marketCode,
        name,
        channel: "email",
        trigger_event: "lead_created",
        template: "Mensaje automatico",
      });
      setName("");
      await reloadData();
      success("Automation guardada.");
    } catch (error) {
      console.error(error);
      showError("No se pudo guardar automation.");
    } finally {
      setSaving(false);
    }
  }

  async function saveExperiment() {
    if (!marketCode || !name.trim()) return;
    setSaving(true);
    try {
      await saveMarketingExperiment(agencyId, {
        market_code: marketCode,
        domain: domain || null,
        name,
        metric_primary: "lead_rate",
        variant_a: parseJsonObject(jsonA),
        variant_b: parseJsonObject(jsonB),
      });
      setName("");
      await reloadData();
      success("Experimento guardado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo guardar experimento.");
    } finally {
      setSaving(false);
    }
  }

  async function saveContent() {
    if (!marketCode) return;
    setSaving(true);
    try {
      await saveMarketingMarketContent(agencyId, {
        market_code: marketCode,
        domain: domain || null,
        language_code: lang,
        brand_name: brandName || null,
        logo_url: logoUrl || null,
        hero_title: heroTitle || null,
        hero_subtitle: heroSubtitle || null,
        footer_address: footerAddress || null,
        footer_email: footerEmail || null,
        footer_phone: footerPhone || null,
        sticky_bg_color: stickyBg || null,
        sticky_text_color: stickyText || null,
      });
      await reloadData();
      success("Contenido guardado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo guardar contenido.");
    } finally {
      setSaving(false);
    }
  }

  async function createOnboardingSeed() {
    if (!marketCode) return;
    setSaving(true);
    try {
      await Promise.all([
        saveMarketingOnboardingStep(agencyId, {
          market_code: marketCode,
          step_key: "domain_verified",
          title: "Dominio verificado",
          description: "Dominio principal y SSL emitidos.",
          order_index: 10,
          completed: false,
        }),
        saveMarketingOnboardingStep(agencyId, {
          market_code: marketCode,
          step_key: "tracking_ready",
          title: "Tracking operativo",
          description: "GA4 y Pixel activos.",
          order_index: 20,
          completed: false,
        }),
        saveMarketingOnboardingStep(agencyId, {
          market_code: marketCode,
          step_key: "first_campaign_live",
          title: "Primera campana activa",
          description: "Campana de entrada activada.",
          order_index: 30,
          completed: false,
        }),
      ]);
      await reloadData();
      success("Onboarding creado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo crear onboarding.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleOnboarding(item: MarketingOnboardingStep) {
    setSaving(true);
    try {
      await saveMarketingOnboardingStep(agencyId, {
        id: item.id,
        market_code: item.market_code,
        step_key: item.step_key,
        title: item.title,
        description: item.description,
        is_required: item.is_required,
        order_index: item.order_index,
        completed: !item.completed,
        completed_by: "intranet_user",
      });
      await reloadData();
      success("Onboarding actualizado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo actualizar onboarding.");
    } finally {
      setSaving(false);
    }
  }

  async function savePlaybook() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveMarketingPlaybookTemplate(agencyId, {
        market_code: marketCode || null,
        name,
        objective: objective || null,
        channels: ["google_ads", "meta_ads", "social"],
        kpi_targets: parseJsonObject(kpiJson),
        blueprint: { type: "premium_launch" },
      });
      setName("");
      setObjective("");
      await reloadData();
      success("Playbook guardado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo guardar playbook.");
    } finally {
      setSaving(false);
    }
  }

  async function applyPlaybook(item: MarketingPlaybookTemplate) {
    if (!marketCode) return;
    setSaving(true);
    try {
      await saveMarketingCampaign(agencyId, {
        market_code: marketCode,
        domain: domain || null,
        name: `${item.name} (${marketCode})`,
        objective: item.objective,
        channels: item.channels,
        kpi_targets: item.kpi_targets,
        status: "planned",
      });
      await reloadData();
      success("Playbook aplicado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo aplicar playbook.");
    } finally {
      setSaving(false);
    }
  }

  async function requestApproval(campaignId: string) {
    if (!marketCode) return;
    setSaving(true);
    try {
      await saveMarketingCampaignApproval(agencyId, {
        campaign_id: campaignId,
        market_code: marketCode,
        status: "pending",
        requested_by: "intranet_user",
      });
      await reloadData();
      success("Approval creado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo crear approval.");
    } finally {
      setSaving(false);
    }
  }

  async function resolveApproval(item: MarketingCampaignApproval, status: "approved" | "rejected") {
    setSaving(true);
    try {
      await saveMarketingCampaignApproval(agencyId, {
        id: item.id,
        campaign_id: item.campaign_id,
        market_code: item.market_code,
        status,
        requested_by: item.requested_by,
        reviewed_by: "intranet_reviewer",
      });
      await reloadData();
      success("Approval actualizado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo actualizar approval.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAlertRule() {
    if (!marketCode || !name.trim()) return;
    setSaving(true);
    try {
      await saveMarketingAlertRule(agencyId, {
        market_code: marketCode,
        domain: domain || null,
        name,
        metric_key: "cpl",
        operator: "gt",
        threshold: 45,
        window_hours: 24,
        channel: "dashboard",
      });
      setName("");
      await reloadData();
      success("Regla guardada.");
    } catch (error) {
      console.error(error);
      showError("No se pudo guardar regla.");
    } finally {
      setSaving(false);
    }
  }

  async function triggerAlertTest() {
    if (!marketCode || !alertRules[0]) return;
    setSaving(true);
    try {
      await saveMarketingAlertEvent(agencyId, {
        rule_id: alertRules[0].id,
        market_code: marketCode,
        domain: domain || null,
        metric_key: alertRules[0].metric_key,
        metric_value: alertRules[0].threshold + 5,
        threshold: alertRules[0].threshold,
        status: "open",
        message: "Evento de alerta test",
      });
      await reloadData();
      success("Alerta test creada.");
    } catch (error) {
      console.error(error);
      showError("No se pudo crear alerta test.");
    } finally {
      setSaving(false);
    }
  }

  async function changeAlertEventStatus(item: MarketingAlertEvent, status: "acknowledged" | "resolved") {
    setSaving(true);
    try {
      await acknowledgeMarketingAlertEvent(agencyId, item.id, status);
      await reloadData();
      success("Evento actualizado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo actualizar evento.");
    } finally {
      setSaving(false);
    }
  }

  async function saveReport() {
    if (!marketCode || !name.trim()) return;
    setSaving(true);
    try {
      await saveMarketingReportSnapshot(agencyId, {
        market_code: marketCode,
        domain: domain || null,
        name,
        period_start: new Date().toISOString().slice(0, 10),
        period_end: new Date().toISOString().slice(0, 10),
        kpis: parseJsonObject(kpiJson),
        highlights: ["Informe premium auto generado"],
      });
      setName("");
      await reloadData();
      success("Reporte guardado.");
    } catch (error) {
      console.error(error);
      showError("No se pudo guardar reporte.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Marketing Hub premium</h1>
          <div className="flex flex-wrap gap-2">
            <select value={marketCode} onChange={(e) => setMarketCode(e.target.value)} className={inputClass()}>
              {markets.map((market) => (
                <option key={market.id} value={market.country_code}>
                  {market.country_code} - {market.language_code.toUpperCase()} - {market.currency_code}
                </option>
              ))}
            </select>
            <select value={domain} onChange={(e) => setDomain(e.target.value)} className={inputClass()}>
              <option value="">Dominio default mercado</option>
              {domainOptions.map((item) => (
                <option key={item.id} value={item.domain}>
                  {item.domain}
                </option>
              ))}
            </select>
            <button onClick={() => void reloadData()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <RefreshCw className="h-3.5 w-3.5" />
              Recargar
            </button>
            <Link href={`/intranet/agency/${agencyId}/ag_tools/socialmedia`} className="inline-flex h-10 items-center rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white">
              Social Media
            </Link>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-900/40 dark:bg-cyan-950/30">
            <p className="text-xs text-cyan-700">Maturity</p>
            <p className="text-xl font-semibold text-cyan-900 dark:text-cyan-100">{maturity?.score ?? 0}/100</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Steps</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{maturity?.completed_steps ?? 0}/{maturity?.total_steps ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Campaigns</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{maturity?.active_campaigns ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Pending approvals</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{maturity?.pending_approvals ?? 0}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12">
          {TABS.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${tab === item.id ? "border-cyan-400 bg-cyan-50 text-cyan-900 dark:border-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando...</div> : null}

      {!loading && tab === "planner" ? (
        <section className={cardClass()}>
          <div className="grid gap-2 md:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre campana" className={inputClass()} />
            <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Objetivo" className={inputClass()} />
            <button onClick={saveCampaign} disabled={saving} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Guardar</button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {campaigns.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                <span>{item.name} - {item.status}</span>
                <button onClick={() => void requestApproval(item.id)} className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Solicitar approval</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && tab === "tracking" ? (
        <section className={cardClass()}>
          <div className="grid gap-2 md:grid-cols-2">
            <input value={ga4} onChange={(e) => setGa4(e.target.value)} placeholder="GA4 ID" className={inputClass()} />
            <input value={pixel} onChange={(e) => setPixel(e.target.value)} placeholder="Meta Pixel ID" className={inputClass()} />
          </div>
          <textarea value={jsonEvents} onChange={(e) => setJsonEvents(e.target.value)} rows={6} className={`${textareaClass()} mt-2`} />
          <button onClick={saveTrackingConfig} disabled={saving} className="mt-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Guardar tracking</button>
        </section>
      ) : null}

      {!loading && tab === "audiences" ? (
        <section className={cardClass()}>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre audiencia" className={inputClass()} />
            <button onClick={saveAudience} disabled={saving} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Guardar</button>
          </div>
          <div className="mt-3 space-y-2 text-xs">{audiences.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">{item.name} - {item.provider}</div>)}</div>
        </section>
      ) : null}

      {!loading && tab === "automations" ? (
        <section className={cardClass()}>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre automation" className={inputClass()} />
            <button onClick={saveAutomation} disabled={saving} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Guardar</button>
          </div>
          <div className="mt-3 space-y-2 text-xs">{automations.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">{item.name} - {item.channel}</div>)}</div>
        </section>
      ) : null}

      {!loading && tab === "experiments" ? (
        <section className={cardClass()}>
          <div className="grid gap-2 md:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre experimento" className={inputClass()} />
            <textarea value={jsonA} onChange={(e) => setJsonA(e.target.value)} rows={4} className={textareaClass()} />
            <textarea value={jsonB} onChange={(e) => setJsonB(e.target.value)} rows={4} className={textareaClass()} />
          </div>
          <button onClick={saveExperiment} disabled={saving} className="mt-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Guardar A/B</button>
          <div className="mt-3 space-y-2 text-xs">{experiments.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">{item.name} - {item.status}</div>)}</div>
        </section>
      ) : null}

      {!loading && tab === "content" ? (
        <section className={cardClass()}>
          <div className="grid gap-2 md:grid-cols-3">
            <input value={lang} onChange={(e) => setLang(e.target.value.toLowerCase())} placeholder="Idioma" className={inputClass()} />
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand" className={inputClass()} />
            <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL" className={inputClass()} />
            <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Hero title" className={inputClass()} />
            <input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Hero subtitle" className={inputClass()} />
            <input value={footerAddress} onChange={(e) => setFooterAddress(e.target.value)} placeholder="Direccion footer" className={inputClass()} />
            <input value={footerEmail} onChange={(e) => setFooterEmail(e.target.value)} placeholder="Email footer" className={inputClass()} />
            <input value={footerPhone} onChange={(e) => setFooterPhone(e.target.value)} placeholder="Telefono footer" className={inputClass()} />
            <div className="grid grid-cols-2 gap-2">
              <input type="color" value={stickyBg} onChange={(e) => setStickyBg(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 p-1 dark:border-slate-700" />
              <input type="color" value={stickyText} onChange={(e) => setStickyText(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 p-1 dark:border-slate-700" />
            </div>
          </div>
          <button onClick={saveContent} disabled={saving} className="mt-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Guardar contenido</button>
          <div className="mt-3 space-y-2 text-xs">{contents.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">{item.domain || "default"} - {item.language_code}</div>)}</div>
        </section>
      ) : null}

      {!loading && tab === "onboarding" ? (
        <section className={cardClass()}>
          <button onClick={createOnboardingSeed} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Seed onboarding</button>
          <div className="mt-3 space-y-2 text-xs">{onboarding.map((item) => <button key={item.id} onClick={() => void toggleOnboarding(item)} className="block w-full rounded-xl border border-slate-200 p-2 text-left dark:border-slate-700">{item.title} - {item.completed ? "ok" : "pendiente"}</button>)}</div>
        </section>
      ) : null}

      {!loading && tab === "playbooks" ? (
        <section className={cardClass()}>
          <div className="grid gap-2 md:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre playbook" className={inputClass()} />
            <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Objetivo" className={inputClass()} />
            <textarea value={kpiJson} onChange={(e) => setKpiJson(e.target.value)} rows={2} className={textareaClass()} />
          </div>
          <button onClick={savePlaybook} disabled={saving} className="mt-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Guardar playbook</button>
          <div className="mt-3 space-y-2 text-xs">{playbooks.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2 dark:border-slate-700"><span>{item.name}</span><button onClick={() => void applyPlaybook(item)} className="rounded-lg bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white">Aplicar</button></div>)}</div>
        </section>
      ) : null}

      {!loading && tab === "approvals" ? (
        <section className={cardClass()}>
          <div className="space-y-2 text-xs">{approvals.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"><div className="flex items-center justify-between"><span>{item.campaign_id.slice(0, 8)} - {item.status}</span><div className="flex gap-1"><button onClick={() => void resolveApproval(item, "approved")} className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">Aprobar</button><button onClick={() => void resolveApproval(item, "rejected")} className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white">Rechazar</button></div></div></div>)}</div>
        </section>
      ) : null}

      {!loading && tab === "alerts" ? (
        <section className={cardClass()}>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre regla" className={inputClass()} />
            <button onClick={saveAlertRule} disabled={saving} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Guardar regla</button>
            <button onClick={triggerAlertTest} disabled={saving || !alertRules[0]} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Alerta test</button>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="space-y-2 text-xs">{alertRules.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">{item.name} - {item.metric_key}</div>)}</div>
            <div className="space-y-2 text-xs">{alertEvents.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"><div className="flex items-center justify-between"><span>{item.metric_key} - {item.status}</span><div className="flex gap-1"><button onClick={() => void changeAlertEventStatus(item, "acknowledged")} className="rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white">Ack</button><button onClick={() => void changeAlertEventStatus(item, "resolved")} className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">Resolve</button></div></div></div>)}</div>
          </div>
        </section>
      ) : null}

      {!loading && tab === "reports" ? (
        <section className={cardClass()}>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre reporte" className={inputClass()} />
            <textarea value={kpiJson} onChange={(e) => setKpiJson(e.target.value)} rows={2} className={textareaClass()} />
            <button onClick={saveReport} disabled={saving} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Guardar reporte</button>
          </div>
          <div className="mt-3 space-y-2 text-xs">{reports.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">{item.name} - {item.share_token}</div>)}</div>
        </section>
      ) : null}

      {!loading && tab === "governance" ? (
        <section className={cardClass()}>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <ShieldCheck className="h-4 w-4" />
            Validaciones operativas
          </p>
          <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <p>Dominios activos: <b>{governance.activeDomains}</b></p>
            <p>Mercados activos: <b>{governance.activeMarkets}</b></p>
            <p>Dominio principal configurado: <b>{governance.hasPrimary ? "si" : "no"}</b></p>
            <p>Mercados faltantes por dominio: <b>{governance.missingMarkets.join(", ") || "ninguno"}</b></p>
            <p>Dominios con fallo SSL/instalacion: <b>{governance.failedDomains.length}</b></p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
