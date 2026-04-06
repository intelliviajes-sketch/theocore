import { supabaseBrowser as supabase } from "@/lib/supabase/client";
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

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asInteger(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asObjectArray(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<Record<string, unknown>>;
  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => item as Record<string, unknown>);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asHighlightArray(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<Record<string, unknown> | string>;
  return value.filter(
    (item): item is Record<string, unknown> | string =>
      typeof item === "string" || (Boolean(item) && typeof item === "object" && !Array.isArray(item)),
  );
}

function normalizeCampaign(row: Record<string, unknown>): MarketingCampaign {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    market_code: asString(row.market_code).toUpperCase(),
    domain: asNullableString(row.domain),
    name: asString(row.name),
    objective: asNullableString(row.objective),
    budget_monthly: asNumber(row.budget_monthly),
    currency_code: asNullableString(row.currency_code),
    start_date: asNullableString(row.start_date),
    end_date: asNullableString(row.end_date),
    channels: asStringArray(row.channels),
    kpi_targets: asObject(row.kpi_targets),
    status:
      row.status === "active" || row.status === "paused" || row.status === "completed"
        ? row.status
        : "planned",
    notes: asNullableString(row.notes),
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeTracking(row: Record<string, unknown>): MarketingTrackingConfig {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    market_code: asString(row.market_code).toUpperCase(),
    domain: asNullableString(row.domain),
    ga4_measurement_id: asNullableString(row.ga4_measurement_id),
    gtm_container_id: asNullableString(row.gtm_container_id),
    meta_pixel_id: asNullableString(row.meta_pixel_id),
    google_ads_customer_id: asNullableString(row.google_ads_customer_id),
    google_ads_conversion_label: asNullableString(row.google_ads_conversion_label),
    tiktok_pixel_id: asNullableString(row.tiktok_pixel_id),
    consent_mode:
      row.consent_mode === "advanced" || row.consent_mode === "disabled"
        ? row.consent_mode
        : "basic",
    conversion_events: asObjectArray(row.conversion_events),
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeAudience(row: Record<string, unknown>): MarketingAudience {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    market_code: asString(row.market_code).toUpperCase(),
    name: asString(row.name),
    provider:
      row.provider === "meta" || row.provider === "google" || row.provider === "both"
        ? row.provider
        : "internal",
    rule_json: asObject(row.rule_json),
    size_estimate: asNumber(row.size_estimate),
    status: row.status === "synced" || row.status === "error" ? row.status : "draft",
    last_sync_at: asNullableString(row.last_sync_at),
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeAutomation(row: Record<string, unknown>): MarketingAutomation {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    market_code: asString(row.market_code).toUpperCase(),
    name: asString(row.name),
    channel:
      row.channel === "whatsapp" || row.channel === "push" || row.channel === "ads"
        ? row.channel
        : "email",
    trigger_event: asString(row.trigger_event),
    template: asString(row.template),
    status: row.status === "active" || row.status === "paused" ? row.status : "draft",
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeExperiment(row: Record<string, unknown>): MarketingExperiment {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    market_code: asString(row.market_code).toUpperCase(),
    domain: asNullableString(row.domain),
    name: asString(row.name),
    hypothesis: asNullableString(row.hypothesis),
    variant_a: asObject(row.variant_a),
    variant_b: asObject(row.variant_b),
    metric_primary: asNullableString(row.metric_primary),
    status:
      row.status === "running" || row.status === "completed" || row.status === "paused"
        ? row.status
        : "draft",
    winner: row.winner === "A" || row.winner === "B" || row.winner === "none" ? row.winner : null,
    started_at: asNullableString(row.started_at),
    ended_at: asNullableString(row.ended_at),
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeMarketContent(row: Record<string, unknown>): MarketingMarketContent {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    market_code: asString(row.market_code).toUpperCase(),
    domain: asNullableString(row.domain),
    language_code: asString(row.language_code || "es").toLowerCase(),
    brand_name: asNullableString(row.brand_name),
    logo_url: asNullableString(row.logo_url),
    hero_title: asNullableString(row.hero_title),
    hero_subtitle: asNullableString(row.hero_subtitle),
    cta_primary: asNullableString(row.cta_primary),
    cta_secondary: asNullableString(row.cta_secondary),
    footer_address: asNullableString(row.footer_address),
    footer_email: asNullableString(row.footer_email),
    footer_phone: asNullableString(row.footer_phone),
    legal_notice: asNullableString(row.legal_notice),
    sticky_bg_color: asNullableString(row.sticky_bg_color),
    sticky_text_color: asNullableString(row.sticky_text_color),
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeOnboardingStep(row: Record<string, unknown>): MarketingOnboardingStep {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    market_code: asString(row.market_code).toUpperCase(),
    step_key: asString(row.step_key),
    title: asString(row.title),
    description: asNullableString(row.description),
    is_required: asBoolean(row.is_required, true),
    completed: asBoolean(row.completed, false),
    completed_at: asNullableString(row.completed_at),
    completed_by: asNullableString(row.completed_by),
    order_index: asInteger(row.order_index),
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizePlaybook(row: Record<string, unknown>): MarketingPlaybookTemplate {
  return {
    id: asString(row.id),
    agency_id: asNullableString(row.agency_id),
    market_code: asNullableString(row.market_code),
    name: asString(row.name),
    objective: asNullableString(row.objective),
    channels: asStringArray(row.channels),
    kpi_targets: asObject(row.kpi_targets),
    blueprint: asObject(row.blueprint),
    is_system: asBoolean(row.is_system, false),
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeApproval(row: Record<string, unknown>): MarketingCampaignApproval {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    campaign_id: asString(row.campaign_id),
    market_code: asString(row.market_code).toUpperCase(),
    status: row.status === "approved" || row.status === "rejected" ? row.status : "pending",
    requested_by: asNullableString(row.requested_by),
    requested_at: asString(row.requested_at),
    reviewed_by: asNullableString(row.reviewed_by),
    reviewed_at: asNullableString(row.reviewed_at),
    notes: asNullableString(row.notes),
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeAlertRule(row: Record<string, unknown>): MarketingAlertRule {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    market_code: asString(row.market_code).toUpperCase(),
    domain: asNullableString(row.domain),
    name: asString(row.name),
    metric_key: asString(row.metric_key),
    operator:
      row.operator === "gte" ||
      row.operator === "lt" ||
      row.operator === "lte" ||
      row.operator === "eq" ||
      row.operator === "neq"
        ? row.operator
        : "gt",
    threshold: asNumber(row.threshold) ?? 0,
    window_hours: asInteger(row.window_hours, 24),
    channel: row.channel === "email" || row.channel === "whatsapp" ? row.channel : "dashboard",
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeAlertEvent(row: Record<string, unknown>): MarketingAlertEvent {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    rule_id: asNullableString(row.rule_id),
    market_code: asString(row.market_code).toUpperCase(),
    domain: asNullableString(row.domain),
    metric_key: asString(row.metric_key),
    metric_value: asNumber(row.metric_value) ?? 0,
    threshold: asNumber(row.threshold) ?? 0,
    status: row.status === "acknowledged" || row.status === "resolved" ? row.status : "open",
    message: asString(row.message),
    triggered_at: asString(row.triggered_at),
    resolved_at: asNullableString(row.resolved_at),
    created_at: asString(row.created_at),
  };
}

function normalizeReportSnapshot(row: Record<string, unknown>): MarketingReportSnapshot {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    market_code: asString(row.market_code).toUpperCase(),
    domain: asNullableString(row.domain),
    name: asString(row.name),
    period_start: asString(row.period_start),
    period_end: asString(row.period_end),
    kpis: asObject(row.kpis),
    highlights: asHighlightArray(row.highlights),
    share_token: asString(row.share_token),
    active: asBoolean(row.active, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function normalizeMaturityScore(row: Record<string, unknown>): MarketingMaturityScore {
  return {
    score: asInteger(row.score, 0),
    completed_steps: asInteger(row.completed_steps, 0),
    total_steps: asInteger(row.total_steps, 0),
    active_campaigns: asInteger(row.active_campaigns, 0),
    tracking_ready: asBoolean(row.tracking_ready, false),
    alert_rules: asInteger(row.alert_rules, 0),
    pending_approvals: asInteger(row.pending_approvals, 0),
  };
}

function normalizeDomain(row: Record<string, unknown>): AgencyDomainOperational {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    domain: asString(row.domain),
    country_code: asNullableString(row.country_code),
    is_primary: asBoolean(row.is_primary, false),
    active: asBoolean(row.active, true),
    installation_status:
      row.installation_status === "verified" || row.installation_status === "failed"
        ? row.installation_status
        : "pending",
    ssl_status: row.ssl_status === "issued" || row.ssl_status === "failed" ? row.ssl_status : "pending",
    dns_target: asNullableString(row.dns_target),
    verified_at: asNullableString(row.verified_at),
    notes: asNullableString(row.notes),
  };
}

function normalizeMarket(row: Record<string, unknown>): AgencyMarketConfigOperational {
  return {
    id: asString(row.id),
    agency_id: asString(row.agency_id),
    country_code: asString(row.country_code).toUpperCase(),
    language_code: asString(row.language_code || "es").toLowerCase(),
    currency_code: asString(row.currency_code || "EUR").toUpperCase(),
    timezone: asString(row.timezone || "Europe/Madrid"),
    default_brain_id: asNullableString(row.default_brain_id),
    active: asBoolean(row.active, true),
  };
}

export async function listAgencyOperationalScope(agencyId: string) {
  const [domainsRes, marketsRes] = await Promise.all([
    supabase
      .from("agency_domains")
      .select(
        "id, agency_id, domain, country_code, is_primary, active, installation_status, ssl_status, dns_target, verified_at, notes",
      )
      .eq("agency_id", agencyId)
      .order("is_primary", { ascending: false })
      .order("domain", { ascending: true }),
    supabase
      .from("agency_market_config")
      .select("id, agency_id, country_code, language_code, currency_code, timezone, default_brain_id, active")
      .eq("agency_id", agencyId)
      .order("country_code", { ascending: true }),
  ]);

  if (domainsRes.error) throw domainsRes.error;
  if (marketsRes.error) throw marketsRes.error;

  return {
    domains: ((domainsRes.data ?? []) as Record<string, unknown>[]).map(normalizeDomain),
    markets: ((marketsRes.data ?? []) as Record<string, unknown>[]).map(normalizeMarket),
  };
}

export async function listMarketingCampaigns(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_marketing_campaigns")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeCampaign);
}

export async function saveMarketingCampaign(
  agencyId: string,
  payload: {
    id?: string;
    market_code: string;
    domain?: string | null;
    name: string;
    objective?: string | null;
    budget_monthly?: number | null;
    currency_code?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    channels?: string[];
    kpi_targets?: Record<string, unknown>;
    status?: MarketingCampaign["status"];
    notes?: string | null;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: payload.market_code.toUpperCase(),
    domain: asNullableString(payload.domain),
    name: payload.name.trim(),
    objective: asNullableString(payload.objective),
    budget_monthly: payload.budget_monthly ?? null,
    currency_code: asNullableString(payload.currency_code),
    start_date: asNullableString(payload.start_date),
    end_date: asNullableString(payload.end_date),
    channels: payload.channels ?? [],
    kpi_targets: payload.kpi_targets ?? {},
    status: payload.status || "planned",
    notes: asNullableString(payload.notes),
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_campaigns")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_marketing_campaigns")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function loadMarketingTracking(
  agencyId: string,
  marketCode: string,
  domain?: string | null,
) {
  const normalizedDomain = asNullableString(domain);
  let query = supabase
    .from("agency_marketing_tracking")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase());
  query = normalizedDomain === null ? query.is("domain", null) : query.eq("domain", normalizedDomain);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? normalizeTracking(data as Record<string, unknown>) : null;
}

export async function saveMarketingTracking(
  agencyId: string,
  payload: {
    id?: string;
    market_code: string;
    domain?: string | null;
    ga4_measurement_id?: string | null;
    gtm_container_id?: string | null;
    meta_pixel_id?: string | null;
    google_ads_customer_id?: string | null;
    google_ads_conversion_label?: string | null;
    tiktok_pixel_id?: string | null;
    consent_mode?: MarketingTrackingConfig["consent_mode"];
    conversion_events?: Array<Record<string, unknown>>;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: payload.market_code.toUpperCase(),
    domain: asNullableString(payload.domain),
    ga4_measurement_id: asNullableString(payload.ga4_measurement_id),
    gtm_container_id: asNullableString(payload.gtm_container_id),
    meta_pixel_id: asNullableString(payload.meta_pixel_id),
    google_ads_customer_id: asNullableString(payload.google_ads_customer_id),
    google_ads_conversion_label: asNullableString(payload.google_ads_conversion_label),
    tiktok_pixel_id: asNullableString(payload.tiktok_pixel_id),
    consent_mode: payload.consent_mode || "basic",
    conversion_events: payload.conversion_events || [],
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_tracking")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const domain = asNullableString(payload.domain);
  let existingQuery = supabase
    .from("agency_marketing_tracking")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("market_code", payload.market_code.toUpperCase());
  existingQuery =
    domain === null ? existingQuery.is("domain", null) : existingQuery.eq("domain", domain);

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("agency_marketing_tracking")
      .update(row)
      .eq("id", existing.id)
      .eq("agency_id", agencyId);
    if (updateError) throw updateError;
    return String(existing.id);
  }

  const { data, error } = await supabase
    .from("agency_marketing_tracking")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listMarketingAudiences(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_marketing_audiences")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeAudience);
}

export async function saveMarketingAudience(
  agencyId: string,
  payload: {
    id?: string;
    market_code: string;
    name: string;
    provider?: MarketingAudience["provider"];
    rule_json?: Record<string, unknown>;
    size_estimate?: number | null;
    status?: MarketingAudience["status"];
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: payload.market_code.toUpperCase(),
    name: payload.name.trim(),
    provider: payload.provider || "internal",
    rule_json: payload.rule_json || {},
    size_estimate: payload.size_estimate ?? null,
    status: payload.status || "draft",
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_audiences")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_marketing_audiences")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listMarketingAutomations(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_marketing_automations")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeAutomation);
}

export async function saveMarketingAutomation(
  agencyId: string,
  payload: {
    id?: string;
    market_code: string;
    name: string;
    channel?: MarketingAutomation["channel"];
    trigger_event: string;
    template: string;
    status?: MarketingAutomation["status"];
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: payload.market_code.toUpperCase(),
    name: payload.name.trim(),
    channel: payload.channel || "email",
    trigger_event: payload.trigger_event.trim(),
    template: payload.template.trim(),
    status: payload.status || "draft",
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_automations")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_marketing_automations")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listMarketingExperiments(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_marketing_experiments")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeExperiment);
}

export async function saveMarketingExperiment(
  agencyId: string,
  payload: {
    id?: string;
    market_code: string;
    domain?: string | null;
    name: string;
    hypothesis?: string | null;
    metric_primary?: string | null;
    status?: MarketingExperiment["status"];
    winner?: MarketingExperiment["winner"];
    variant_a?: Record<string, unknown>;
    variant_b?: Record<string, unknown>;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: payload.market_code.toUpperCase(),
    domain: asNullableString(payload.domain),
    name: payload.name.trim(),
    hypothesis: asNullableString(payload.hypothesis),
    metric_primary: asNullableString(payload.metric_primary),
    status: payload.status || "draft",
    winner: payload.winner || null,
    variant_a: payload.variant_a || {},
    variant_b: payload.variant_b || {},
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_experiments")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_marketing_experiments")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listMarketingMarketContent(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_market_content")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .eq("active", true)
    .order("domain", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeMarketContent);
}

export async function saveMarketingMarketContent(
  agencyId: string,
  payload: {
    id?: string;
    market_code: string;
    domain?: string | null;
    language_code: string;
    brand_name?: string | null;
    logo_url?: string | null;
    hero_title?: string | null;
    hero_subtitle?: string | null;
    cta_primary?: string | null;
    cta_secondary?: string | null;
    footer_address?: string | null;
    footer_email?: string | null;
    footer_phone?: string | null;
    legal_notice?: string | null;
    sticky_bg_color?: string | null;
    sticky_text_color?: string | null;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: payload.market_code.toUpperCase(),
    domain: asNullableString(payload.domain),
    language_code: payload.language_code.trim().toLowerCase() || "es",
    brand_name: asNullableString(payload.brand_name),
    logo_url: asNullableString(payload.logo_url),
    hero_title: asNullableString(payload.hero_title),
    hero_subtitle: asNullableString(payload.hero_subtitle),
    cta_primary: asNullableString(payload.cta_primary),
    cta_secondary: asNullableString(payload.cta_secondary),
    footer_address: asNullableString(payload.footer_address),
    footer_email: asNullableString(payload.footer_email),
    footer_phone: asNullableString(payload.footer_phone),
    legal_notice: asNullableString(payload.legal_notice),
    sticky_bg_color: asNullableString(payload.sticky_bg_color),
    sticky_text_color: asNullableString(payload.sticky_text_color),
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_market_content")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const domain = asNullableString(payload.domain);
  let existingQuery = supabase
    .from("agency_market_content")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("market_code", payload.market_code.toUpperCase())
    .eq("language_code", payload.language_code.trim().toLowerCase() || "es");
  existingQuery =
    domain === null ? existingQuery.is("domain", null) : existingQuery.eq("domain", domain);

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("agency_market_content")
      .update(row)
      .eq("id", existing.id)
      .eq("agency_id", agencyId);
    if (updateError) throw updateError;
    return String(existing.id);
  }

  const { data, error } = await supabase
    .from("agency_market_content")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listMarketingOnboardingSteps(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_marketing_onboarding_steps")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .eq("active", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeOnboardingStep);
}

export async function saveMarketingOnboardingStep(
  agencyId: string,
  payload: {
    id?: string;
    market_code: string;
    step_key: string;
    title: string;
    description?: string | null;
    is_required?: boolean;
    completed?: boolean;
    completed_at?: string | null;
    completed_by?: string | null;
    order_index?: number;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: payload.market_code.toUpperCase(),
    step_key: payload.step_key.trim(),
    title: payload.title.trim(),
    description: asNullableString(payload.description),
    is_required: payload.is_required !== false,
    completed: payload.completed === true,
    completed_at: payload.completed === true ? asNullableString(payload.completed_at) ?? new Date().toISOString() : null,
    completed_by: payload.completed === true ? asNullableString(payload.completed_by) : null,
    order_index: payload.order_index ?? 0,
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_onboarding_steps")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_marketing_onboarding_steps")
    .upsert(row, { onConflict: "agency_id,market_code,step_key" })
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listMarketingPlaybookTemplates(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_marketing_playbook_templates")
    .select("*")
    .eq("active", true)
    .order("is_system", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const normalizedMarket = marketCode.toUpperCase();
  const filtered = ((data ?? []) as Record<string, unknown>[]).filter((row) => {
    const isSystem = asBoolean(row.is_system, false);
    if (isSystem) return true;
    const rowAgencyId = asNullableString(row.agency_id);
    const rowMarket = asNullableString(row.market_code);
    if (rowAgencyId && rowAgencyId !== agencyId) return false;
    if (rowMarket && rowMarket.toUpperCase() !== normalizedMarket) return false;
    return true;
  });
  return filtered.map(normalizePlaybook);
}

export async function saveMarketingPlaybookTemplate(
  agencyId: string,
  payload: {
    id?: string;
    market_code?: string | null;
    name: string;
    objective?: string | null;
    channels?: string[];
    kpi_targets?: Record<string, unknown>;
    blueprint?: Record<string, unknown>;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: asNullableString(payload.market_code)?.toUpperCase() ?? null,
    name: payload.name.trim(),
    objective: asNullableString(payload.objective),
    channels: payload.channels ?? [],
    kpi_targets: payload.kpi_targets ?? {},
    blueprint: payload.blueprint ?? {},
    is_system: false,
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_playbook_templates")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_marketing_playbook_templates")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listMarketingCampaignApprovals(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_marketing_campaign_approvals")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .eq("active", true)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeApproval);
}

export async function saveMarketingCampaignApproval(
  agencyId: string,
  payload: {
    id?: string;
    campaign_id: string;
    market_code: string;
    status?: MarketingCampaignApproval["status"];
    requested_by?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    notes?: string | null;
    active?: boolean;
  },
) {
  const status = payload.status || "pending";
  const row = {
    agency_id: agencyId,
    campaign_id: payload.campaign_id,
    market_code: payload.market_code.toUpperCase(),
    status,
    requested_by: asNullableString(payload.requested_by),
    reviewed_by: status === "pending" ? null : asNullableString(payload.reviewed_by),
    reviewed_at:
      status === "pending"
        ? null
        : asNullableString(payload.reviewed_at) ?? new Date().toISOString(),
    notes: asNullableString(payload.notes),
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_campaign_approvals")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_marketing_campaign_approvals")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listMarketingAlertRules(
  agencyId: string,
  marketCode: string,
  domain?: string | null,
) {
  const { data, error } = await supabase
    .from("agency_marketing_alert_rules")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const normalizedDomain = asNullableString(domain);
  const rows = ((data ?? []) as Record<string, unknown>[]).filter((row) => {
    if (!normalizedDomain) return true;
    const rowDomain = asNullableString(row.domain);
    return rowDomain === null || rowDomain === normalizedDomain;
  });
  return rows.map(normalizeAlertRule);
}

export async function saveMarketingAlertRule(
  agencyId: string,
  payload: {
    id?: string;
    market_code: string;
    domain?: string | null;
    name: string;
    metric_key: string;
    operator?: MarketingAlertRule["operator"];
    threshold: number;
    window_hours?: number;
    channel?: MarketingAlertRule["channel"];
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: payload.market_code.toUpperCase(),
    domain: asNullableString(payload.domain),
    name: payload.name.trim(),
    metric_key: payload.metric_key.trim(),
    operator: payload.operator || "gt",
    threshold: payload.threshold,
    window_hours: payload.window_hours ?? 24,
    channel: payload.channel || "dashboard",
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_alert_rules")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_marketing_alert_rules")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listMarketingAlertEvents(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_marketing_alert_events")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .order("triggered_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeAlertEvent);
}

export async function saveMarketingAlertEvent(
  agencyId: string,
  payload: {
    rule_id?: string | null;
    market_code: string;
    domain?: string | null;
    metric_key: string;
    metric_value: number;
    threshold: number;
    status?: MarketingAlertEvent["status"];
    message: string;
    resolved_at?: string | null;
  },
) {
  const row = {
    agency_id: agencyId,
    rule_id: asNullableString(payload.rule_id),
    market_code: payload.market_code.toUpperCase(),
    domain: asNullableString(payload.domain),
    metric_key: payload.metric_key.trim(),
    metric_value: payload.metric_value,
    threshold: payload.threshold,
    status: payload.status || "open",
    message: payload.message.trim(),
    resolved_at:
      payload.status === "resolved"
        ? asNullableString(payload.resolved_at) ?? new Date().toISOString()
        : null,
  };

  const { data, error } = await supabase
    .from("agency_marketing_alert_events")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function acknowledgeMarketingAlertEvent(
  agencyId: string,
  eventId: string,
  status: "acknowledged" | "resolved",
) {
  const row = {
    status,
    resolved_at: status === "resolved" ? new Date().toISOString() : null,
  };
  const { error } = await supabase
    .from("agency_marketing_alert_events")
    .update(row)
    .eq("id", eventId)
    .eq("agency_id", agencyId);
  if (error) throw error;
}

export async function listMarketingReportSnapshots(agencyId: string, marketCode: string) {
  const { data, error } = await supabase
    .from("agency_marketing_report_snapshots")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("market_code", marketCode.toUpperCase())
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeReportSnapshot);
}

export async function saveMarketingReportSnapshot(
  agencyId: string,
  payload: {
    id?: string;
    market_code: string;
    domain?: string | null;
    name: string;
    period_start: string;
    period_end: string;
    kpis?: Record<string, unknown>;
    highlights?: Array<Record<string, unknown> | string>;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    market_code: payload.market_code.toUpperCase(),
    domain: asNullableString(payload.domain),
    name: payload.name.trim(),
    period_start: payload.period_start,
    period_end: payload.period_end,
    kpis: payload.kpis ?? {},
    highlights: payload.highlights ?? [],
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_marketing_report_snapshots")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_marketing_report_snapshots")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function getMarketingMaturityScore(
  agencyId: string,
  marketCode: string,
): Promise<MarketingMaturityScore> {
  const { data, error } = await supabase.rpc("get_agency_marketing_maturity_score", {
    p_agency_id: agencyId,
    p_market_code: marketCode.toUpperCase(),
  });
  if (error) throw error;

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  if (!rows[0]) {
    return {
      score: 0,
      completed_steps: 0,
      total_steps: 0,
      active_campaigns: 0,
      tracking_ready: false,
      alert_rules: 0,
      pending_approvals: 0,
    };
  }
  return normalizeMaturityScore(rows[0]);
}
