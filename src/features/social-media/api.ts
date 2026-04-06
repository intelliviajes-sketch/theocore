import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import type {
  SocialAccount,
  SocialAgencyContext,
  SocialAiSuggestion,
  SocialAsset,
  SocialBrandSafetyRule,
  SocialBrief,
  SocialCampaign,
  SocialCatalogOption,
  SocialChannel,
  SocialCommentInbox,
  SocialExecutiveSummary,
  SocialHookLibraryItem,
  SocialImageDirection,
  SocialLead,
  SocialMarketConfig,
  SocialPermissions,
  SocialPlaybook,
  SocialPostingWindow,
  SocialPost,
  SocialPostDraft,
  SocialPostLocalization,
  SocialPaidAdsSuggestion,
  SocialPostVariant,
  SocialPublishLog,
  SocialQualityReport,
  SocialTemplate,
  SocialUtmRule,
} from "./types";

function asArrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toNullableString(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCountryCode(value: string | null | undefined) {
  const normalized = toNullableString(value);
  return normalized ? normalized.toUpperCase() : null;
}

function isMissingRelationError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message || "")
      : "";
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code || "")
      : "";
  return code === "PGRST205" || message.toLowerCase().includes("agency_social_");
}

function sanitizeHashtags(hashtags: string[]) {
  return hashtags
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => (item.startsWith("#") ? item : `#${item}`))
    .slice(0, 12);
}

function extractJsonBlock(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) return cleaned;
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

function sanitizeTextList(value: unknown, maxItems: number, fallback: string[] = []) {
  const raw = asArrayOfStrings(value);
  if (raw.length === 0) return fallback;
  return raw.slice(0, maxItems);
}

function toSlugToken(value: string | null | undefined, fallback: string) {
  const base = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || fallback).slice(0, 15);
}

function normalizePostRow(row: Record<string, unknown>): SocialPost {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    related_catalog_id:
      typeof row.related_catalog_id === "string" ? row.related_catalog_id : null,
    title: String(row.title || ""),
    hook: typeof row.hook === "string" ? row.hook : null,
    caption: typeof row.caption === "string" ? row.caption : null,
    channels: asArrayOfStrings(row.channels) as SocialChannel[],
    hashtags: sanitizeHashtags(asArrayOfStrings(row.hashtags)),
    status: String(row.status || "draft") as SocialPost["status"],
    scheduled_at: typeof row.scheduled_at === "string" ? row.scheduled_at : null,
    published_at: typeof row.published_at === "string" ? row.published_at : null,
    cta_text: typeof row.cta_text === "string" ? row.cta_text : null,
    cta_url: typeof row.cta_url === "string" ? row.cta_url : null,
    destination_city:
      typeof row.destination_city === "string" ? row.destination_city : null,
    destination_country:
      typeof row.destination_country === "string" ? row.destination_country : null,
    tone: typeof row.tone === "string" ? row.tone : null,
    language_code:
      typeof row.language_code === "string" ? row.language_code : null,
    primary_language:
      typeof row.primary_language === "string" ? row.primary_language : "es",
    market_code: typeof row.market_code === "string" ? row.market_code : null,
    asset_urls: asArrayOfStrings(row.asset_urls),
    utm_source: typeof row.utm_source === "string" ? row.utm_source : null,
    utm_medium: typeof row.utm_medium === "string" ? row.utm_medium : null,
    utm_campaign: typeof row.utm_campaign === "string" ? row.utm_campaign : null,
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    leads: Number(row.leads || 0),
    bookings: Number(row.bookings || 0),
    engagement_rate: Number(row.engagement_rate || 0),
    quality_score: Number(row.quality_score || 0),
    quality_flags: asArrayOfStrings(row.quality_flags),
    brand_safety_status:
      row.brand_safety_status === "approved" || row.brand_safety_status === "flagged"
        ? row.brand_safety_status
        : "pending",
    sync_status:
      row.sync_status === "synced" || row.sync_status === "failed"
        ? row.sync_status
        : "pending",
    best_publish_at:
      typeof row.best_publish_at === "string" ? row.best_publish_at : null,
    last_sync_at: typeof row.last_sync_at === "string" ? row.last_sync_at : null,
    last_sync_error:
      typeof row.last_sync_error === "string" ? row.last_sync_error : null,
    active: row.active !== false,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeVariantRow(row: Record<string, unknown>): SocialPostVariant {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    post_id: String(row.post_id),
    variant_label: String(row.variant_label || "A"),
    channel: typeof row.channel === "string" ? (row.channel as SocialChannel) : null,
    hook: typeof row.hook === "string" ? row.hook : null,
    caption: typeof row.caption === "string" ? row.caption : null,
    cta_text: typeof row.cta_text === "string" ? row.cta_text : null,
    score: Number(row.score || 0),
    active: row.active !== false,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeAssetRow(row: Record<string, unknown>): SocialAsset {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    title: String(row.title || ""),
    asset_url: String(row.asset_url || ""),
    destination_tags: asArrayOfStrings(row.destination_tags),
    channels: asArrayOfStrings(row.channels) as SocialChannel[],
    active: row.active !== false,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeTemplateRow(row: Record<string, unknown>): SocialTemplate {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    name: String(row.name || ""),
    product_type: typeof row.product_type === "string" ? row.product_type : null,
    title_template:
      typeof row.title_template === "string" ? row.title_template : null,
    hook_template:
      typeof row.hook_template === "string" ? row.hook_template : null,
    caption_template:
      typeof row.caption_template === "string" ? row.caption_template : null,
    default_tone:
      typeof row.default_tone === "string" ? row.default_tone : null,
    default_channels: asArrayOfStrings(row.default_channels) as SocialChannel[],
    active: row.active !== false,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizePublishLogRow(row: Record<string, unknown>): SocialPublishLog {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    post_id: String(row.post_id),
    status:
      row.status === "published" || row.status === "failed"
        ? row.status
        : "queued",
    message: typeof row.message === "string" ? row.message : null,
    provider: typeof row.provider === "string" ? row.provider : null,
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
    created_at: String(row.created_at || ""),
  };
}

function normalizeUtmRuleRow(row: Record<string, unknown>): SocialUtmRule {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    channel:
      typeof row.channel === "string" ? (row.channel as SocialChannel) : null,
    source: String(row.source || "social"),
    medium: String(row.medium || "organic"),
    campaign_prefix: String(row.campaign_prefix || "launch_"),
    enforce_campaign: row.enforce_campaign !== false,
    enforce_channel_suffix: row.enforce_channel_suffix !== false,
    active: row.active !== false,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeBrandSafetyRuleRow(
  row: Record<string, unknown>,
): SocialBrandSafetyRule {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    blocked_terms: asArrayOfStrings(row.blocked_terms),
    required_terms: asArrayOfStrings(row.required_terms),
    max_caps_ratio: Number(row.max_caps_ratio || 0.35),
    max_emojis: Number(row.max_emojis || 8),
    active: row.active !== false,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeHookRow(row: Record<string, unknown>): SocialHookLibraryItem {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    channel:
      typeof row.channel === "string" ? (row.channel as SocialChannel) : null,
    hook_text: String(row.hook_text || ""),
    destination_city:
      typeof row.destination_city === "string" ? row.destination_city : null,
    product_type: typeof row.product_type === "string" ? row.product_type : null,
    wins: Number(row.wins || 0),
    uses: Number(row.uses || 0),
    ctr: Number(row.ctr || 0),
    lead_rate: Number(row.lead_rate || 0),
    active: row.active !== false,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeLocalizationRow(
  row: Record<string, unknown>,
): SocialPostLocalization {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    post_id: String(row.post_id),
    language_code: String(row.language_code || "es"),
    market_code: typeof row.market_code === "string" ? row.market_code : null,
    localized_title: String(row.localized_title || ""),
    localized_hook:
      typeof row.localized_hook === "string" ? row.localized_hook : null,
    localized_caption:
      typeof row.localized_caption === "string" ? row.localized_caption : null,
    localized_cta_text:
      typeof row.localized_cta_text === "string" ? row.localized_cta_text : null,
    localized_hashtags: asArrayOfStrings(row.localized_hashtags),
    status:
      row.status === "ready" || row.status === "published"
        ? row.status
        : "draft",
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizePostingWindowRow(
  row: Record<string, unknown>,
): SocialPostingWindow {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    channel: String(row.channel || "instagram") as SocialChannel,
    weekday: Number(row.weekday || 0),
    hour: Number(row.hour || 0),
    score: Number(row.score || 0),
    sample_size: Number(row.sample_size || 0),
    active: row.active !== false,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeBriefRow(row: Record<string, unknown>): SocialBrief {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    catalog_id: typeof row.catalog_id === "string" ? row.catalog_id : null,
    title: String(row.title || ""),
    objective: typeof row.objective === "string" ? row.objective : null,
    audience: typeof row.audience === "string" ? row.audience : null,
    value_props: asArrayOfStrings(row.value_props),
    suggested_sequence: Array.isArray(row.suggested_sequence)
      ? (row.suggested_sequence as Array<Record<string, unknown>>)
      : [],
    status:
      row.status === "ready" || row.status === "applied"
        ? row.status
        : "draft",
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeCommentRow(row: Record<string, unknown>): SocialCommentInbox {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    channel: String(row.channel || "instagram") as SocialChannel,
    post_id: typeof row.post_id === "string" ? row.post_id : null,
    author_handle:
      typeof row.author_handle === "string" ? row.author_handle : null,
    content: String(row.content || ""),
    sentiment:
      row.sentiment === "positive" || row.sentiment === "negative"
        ? row.sentiment
        : "neutral",
    intent: typeof row.intent === "string" ? row.intent : null,
    priority:
      row.priority === "low" || row.priority === "high" || row.priority === "urgent"
        ? row.priority
        : "normal",
    status:
      row.status === "in_progress" ||
      row.status === "resolved" ||
      row.status === "ignored"
        ? row.status
        : "open",
    assigned_to: typeof row.assigned_to === "string" ? row.assigned_to : null,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeLeadRow(row: Record<string, unknown>): SocialLead {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    source_comment_id:
      typeof row.source_comment_id === "string" ? row.source_comment_id : null,
    source_post_id:
      typeof row.source_post_id === "string" ? row.source_post_id : null,
    traveler_id: typeof row.traveler_id === "string" ? row.traveler_id : null,
    contact_name: typeof row.contact_name === "string" ? row.contact_name : null,
    contact_email:
      typeof row.contact_email === "string" ? row.contact_email : null,
    contact_phone:
      typeof row.contact_phone === "string" ? row.contact_phone : null,
    destination_interest:
      typeof row.destination_interest === "string"
        ? row.destination_interest
        : null,
    budget_estimate:
      typeof row.budget_estimate === "number" ? row.budget_estimate : null,
    travelers_count:
      typeof row.travelers_count === "number" ? row.travelers_count : null,
    score: Number(row.score || 0),
    temperature:
      row.temperature === "warm" || row.temperature === "hot"
        ? row.temperature
        : "cold",
    status:
      row.status === "qualified" ||
      row.status === "proposal" ||
      row.status === "won" ||
      row.status === "lost"
        ? row.status
        : "new",
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizePlaybookRow(row: Record<string, unknown>): SocialPlaybook {
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    name: String(row.name || ""),
    objective: typeof row.objective === "string" ? row.objective : null,
    audience: typeof row.audience === "string" ? row.audience : null,
    stages: Array.isArray(row.stages) ? (row.stages as Array<Record<string, unknown>>) : [],
    kpis: row.kpis && typeof row.kpis === "object" ? (row.kpis as Record<string, unknown>) : {},
    status:
      row.status === "active" || row.status === "completed" || row.status === "paused"
        ? row.status
        : "draft",
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function getCapsRatio(value: string) {
  if (!value) return 0;
  const letters = value.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, "");
  if (letters.length === 0) return 0;
  const caps = letters.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, "");
  return caps.length / letters.length;
}

function countEmojiLike(value: string) {
  const matches = value.match(/[\u{1F300}-\u{1FAFF}]/gu);
  return matches ? matches.length : 0;
}

export function evaluateSocialPostQuality(draft: SocialPostDraft): SocialQualityReport {
  const flags: string[] = [];

  const title = draft.title.trim();
  const caption = draft.caption.trim();
  const ctaText = draft.cta_text.trim();
  const ctaUrl = draft.cta_url.trim();
  const utmCampaign = draft.utm_campaign.trim();
  const hasEnoughHashtags = draft.hashtags.length >= 2;
  const hasDestination = Boolean(
    draft.destination_city.trim() || draft.destination_country.trim(),
  );

  if (title.length < 8) flags.push("Titulo corto");
  if (caption.length < 80) flags.push("Caption corto");
  if (!ctaText) flags.push("CTA texto faltante");
  if (!ctaUrl.startsWith("http")) flags.push("CTA URL invalida");
  if (!draft.utm_source.trim()) flags.push("UTM source faltante");
  if (!draft.utm_medium.trim()) flags.push("UTM medium faltante");
  if (!utmCampaign) flags.push("UTM campaign faltante");
  if (!hasEnoughHashtags) flags.push("Minimo 2 hashtags");
  if (!hasDestination) flags.push("Destino sin contexto");
  if (draft.channels.length === 0) flags.push("Selecciona al menos un canal");

  const score = Math.max(0, 100 - flags.length * 11);
  const hardBlockers = flags.filter((item) =>
    [
      "CTA texto faltante",
      "CTA URL invalida",
      "UTM campaign faltante",
      "Selecciona al menos un canal",
    ].includes(item),
  );

  return {
    score,
    flags,
    readyForSchedule: hardBlockers.length === 0 && score >= 65,
    readyForPublish: hardBlockers.length === 0 && score >= 75,
  };
}

export async function listSocialCampaigns(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_campaigns")
    .select(
      "id, agency_id, name, objective, target_audience, budget, start_date, end_date, status, brain_id, created_at, updated_at",
    )
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as SocialCampaign[]).map((row) => ({ ...row }));
}

export async function saveSocialCampaign(
  agencyId: string,
  payload: {
    id?: string;
    name: string;
    objective?: string;
    target_audience?: string;
    budget?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: SocialCampaign["status"];
    brain_id?: string | null;
  },
) {
  const row = {
    agency_id: agencyId,
    name: payload.name.trim(),
    objective: toNullableString(payload.objective),
    target_audience: toNullableString(payload.target_audience),
    budget: payload.budget ?? null,
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
    status: payload.status || "draft",
    brain_id: payload.brain_id || null,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_campaigns")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_social_campaigns")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listSocialPosts(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_posts")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizePostRow);
}

export async function updateSocialPostSyncStatus(
  agencyId: string,
  postId: string,
  payload: {
    sync_status: "pending" | "synced" | "failed";
    last_sync_error?: string | null;
  },
) {
  const row = {
    sync_status: payload.sync_status,
    last_sync_at: new Date().toISOString(),
    last_sync_error: toNullableString(payload.last_sync_error || null),
  };

  const { error } = await supabase
    .from("agency_social_posts")
    .update(row)
    .eq("agency_id", agencyId)
    .eq("id", postId);
  if (error) throw error;
}

export async function registerSocialPublishLog(
  agencyId: string,
  payload: {
    post_id: string;
    status: "queued" | "published" | "failed";
    message?: string | null;
    provider?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  const row = {
    agency_id: agencyId,
    post_id: payload.post_id,
    status: payload.status,
    message: toNullableString(payload.message || null),
    provider: toNullableString(payload.provider || null),
    payload: payload.payload || {},
  };

  const { error } = await supabase.from("agency_social_publish_logs").insert(row);
  if (error) throw error;
}

export async function listSocialPublishLogs(agencyId: string, postId: string) {
  const { data, error } = await supabase
    .from("agency_social_publish_logs")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizePublishLogRow);
}

export async function saveSocialPost(agencyId: string, draft: SocialPostDraft) {
  const quality = evaluateSocialPostQuality(draft);
  const draftStatus =
    draft.status === "scheduled" && !draft.scheduled_at ? "draft" : draft.status;
  const primaryChannel: SocialChannel =
    draft.channels.length > 0 ? draft.channels[0] : "instagram";

  const utmRules = await listSocialUtmRules(agencyId);
  const utmRule =
    utmRules.find((item) => item.channel === primaryChannel) ||
    utmRules.find((item) => item.channel === null) ||
    null;

  let utmSource = toNullableString(draft.utm_source) || "social";
  let utmMedium = toNullableString(draft.utm_medium) || "organic";
  let utmCampaign = toNullableString(draft.utm_campaign);
  if (utmRule) {
    utmSource = utmRule.source;
    utmMedium = utmRule.medium;
    if (utmRule.enforce_campaign) {
      const rawCampaign = (utmCampaign || "default").toLowerCase().replace(/[^a-z0-9_]+/g, "_");
      utmCampaign = `${utmRule.campaign_prefix}${rawCampaign}`;
      if (utmRule.enforce_channel_suffix) {
        utmCampaign = `${utmCampaign}_${primaryChannel}`;
      }
    }
  }

  const brandSafety = await evaluateBrandSafetyForPost(
    agencyId,
    [draft.title, draft.hook, draft.caption].filter(Boolean).join("\n"),
  );
  const mergedQualityFlags = [...quality.flags, ...brandSafety.flags];
  const bestPublishAt = await predictBestPublishAt(agencyId, primaryChannel);
  const normalizedMarketCode =
    normalizeCountryCode(draft.market_code) || normalizeCountryCode(draft.destination_country);

  if (draftStatus === "scheduled" && !quality.readyForSchedule) {
    throw new Error(
      "No cumple calidad minima para programar. Revisa CTA, UTM y consistencia.",
    );
  }
  if (draftStatus === "published" && !quality.readyForPublish) {
    throw new Error(
      "No cumple calidad minima para publicar. Mejora el contenido antes de continuar.",
    );
  }
  if (brandSafety.status === "flagged" && draftStatus !== "draft") {
    throw new Error(
      `Brand safety detecto bloqueos: ${brandSafety.flags.join(" | ")}.`,
    );
  }

  const row = {
    agency_id: agencyId,
    campaign_id: draft.campaign_id,
    related_catalog_id: draft.related_catalog_id,
    title: draft.title.trim(),
    hook: toNullableString(draft.hook),
    caption: toNullableString(draft.caption),
    channels: draft.channels,
    hashtags: sanitizeHashtags(draft.hashtags),
    status: draftStatus,
    scheduled_at: draft.scheduled_at,
    published_at:
      draftStatus === "published"
        ? draft.published_at || new Date().toISOString()
        : null,
    cta_text: toNullableString(draft.cta_text),
    cta_url: toNullableString(draft.cta_url),
    destination_city: toNullableString(draft.destination_city),
    destination_country: toNullableString(draft.destination_country),
    tone: toNullableString(draft.tone),
    language_code: toNullableString(draft.language_code),
    primary_language: toNullableString(draft.language_code) || "es",
    market_code: normalizedMarketCode,
    asset_urls: draft.asset_urls,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    impressions: Number.isFinite(draft.impressions) ? draft.impressions : 0,
    clicks: Number.isFinite(draft.clicks) ? draft.clicks : 0,
    leads: Number.isFinite(draft.leads) ? draft.leads : 0,
    bookings: Number.isFinite(draft.bookings) ? draft.bookings : 0,
    engagement_rate: Number.isFinite(draft.engagement_rate)
      ? draft.engagement_rate
      : 0,
    quality_score: quality.score,
    quality_flags: mergedQualityFlags,
    sync_status:
      draftStatus === "published" || draftStatus === "scheduled"
        ? "pending"
        : "synced",
    brand_safety_status: brandSafety.status,
    best_publish_at: bestPublishAt,
    last_sync_at: null,
    last_sync_error: null,
    active: draft.active !== false,
  };

  let postId = draft.id;
  if (postId) {
    const { error } = await supabase
      .from("agency_social_posts")
      .update(row)
      .eq("id", postId)
      .eq("agency_id", agencyId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("agency_social_posts")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    postId = String(data.id);
  }

  if (postId && (draftStatus === "scheduled" || draftStatus === "published")) {
    await registerSocialPublishLog(agencyId, {
      post_id: postId,
      status: "queued",
      provider: "manual",
      message:
        draftStatus === "published"
          ? "Publicacion marcada como lista para sincronizacion."
          : "Publicacion programada, pendiente de sincronizacion.",
      payload: { status: draftStatus },
    });
  }

  return postId;
}

export async function archiveSocialPost(agencyId: string, postId: string) {
  const { error } = await supabase
    .from("agency_social_posts")
    .update({ active: false, status: "archived" })
    .eq("id", postId)
    .eq("agency_id", agencyId);
  if (error) throw error;
}

export async function listSocialAccounts(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_accounts")
    .select("id, agency_id, channel, handle, account_name, active, created_at, updated_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as SocialAccount[]).map((row) => ({ ...row }));
}

export async function saveSocialAccount(
  agencyId: string,
  payload: {
    id?: string;
    channel: SocialChannel;
    handle: string;
    account_name?: string | null;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    channel: payload.channel,
    handle: payload.handle.trim(),
    account_name: toNullableString(payload.account_name || null),
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_accounts")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_social_accounts")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listSocialCatalogOptions(agencyId: string) {
  const { data, error } = await supabase
    .from("catalog_global")
    .select("id, title, summary, country_code, data, active")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const dataObj =
      row.data && typeof row.data === "object"
        ? (row.data as Record<string, unknown>)
        : null;
    const images = asArrayOfStrings(dataObj?.images);
    return {
      id: String(row.id),
      title: typeof row.title === "string" ? row.title : null,
      summary: typeof row.summary === "string" ? row.summary : null,
      country_code: typeof row.country_code === "string" ? row.country_code : null,
      images,
      coverImage: images[0] ?? null,
    } as SocialCatalogOption;
  });
}

export async function listSocialPostVariants(agencyId: string, postId: string) {
  const { data, error } = await supabase
    .from("agency_social_post_variants")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("post_id", postId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeVariantRow);
}

export async function saveSocialPostVariant(
  agencyId: string,
  payload: {
    id?: string;
    post_id: string;
    variant_label: string;
    channel?: SocialChannel | null;
    hook?: string | null;
    caption?: string | null;
    cta_text?: string | null;
    score?: number;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    post_id: payload.post_id,
    variant_label: payload.variant_label.trim() || "A",
    channel: payload.channel || null,
    hook: toNullableString(payload.hook || null),
    caption: toNullableString(payload.caption || null),
    cta_text: toNullableString(payload.cta_text || null),
    score: Number.isFinite(payload.score) ? payload.score : 0,
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_post_variants")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_social_post_variants")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listSocialAssets(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_assets")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeAssetRow);
}

export async function saveSocialAsset(
  agencyId: string,
  payload: {
    id?: string;
    title: string;
    asset_url: string;
    destination_tags?: string[];
    channels?: SocialChannel[];
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    title: payload.title.trim(),
    asset_url: payload.asset_url.trim(),
    destination_tags: payload.destination_tags || [],
    channels: payload.channels || [],
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_assets")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_social_assets")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listSocialTemplates(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_templates")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeTemplateRow);
}

export async function saveSocialTemplate(
  agencyId: string,
  payload: {
    id?: string;
    name: string;
    product_type?: string | null;
    title_template?: string | null;
    hook_template?: string | null;
    caption_template?: string | null;
    default_tone?: string | null;
    default_channels?: SocialChannel[];
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    name: payload.name.trim(),
    product_type: toNullableString(payload.product_type || null),
    title_template: toNullableString(payload.title_template || null),
    hook_template: toNullableString(payload.hook_template || null),
    caption_template: toNullableString(payload.caption_template || null),
    default_tone: toNullableString(payload.default_tone || null),
    default_channels: payload.default_channels || [],
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_templates")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_social_templates")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listSocialUtmRules(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_utm_rules")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeUtmRuleRow);
}

export async function saveSocialUtmRule(
  agencyId: string,
  payload: {
    id?: string;
    channel?: SocialChannel | null;
    source: string;
    medium: string;
    campaign_prefix: string;
    enforce_campaign: boolean;
    enforce_channel_suffix: boolean;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    channel: payload.channel || null,
    source: payload.source.trim() || "social",
    medium: payload.medium.trim() || "organic",
    campaign_prefix: payload.campaign_prefix.trim() || "launch_",
    enforce_campaign: payload.enforce_campaign !== false,
    enforce_channel_suffix: payload.enforce_channel_suffix !== false,
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_utm_rules")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_social_utm_rules")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listSocialBrandSafetyRules(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_brand_safety_rules")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data
    ? normalizeBrandSafetyRuleRow(data as Record<string, unknown>)
    : null;
}

export async function saveSocialBrandSafetyRule(
  agencyId: string,
  payload: {
    id?: string;
    blocked_terms: string[];
    required_terms: string[];
    max_caps_ratio: number;
    max_emojis: number;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    blocked_terms: payload.blocked_terms.map((item) => item.trim()).filter(Boolean),
    required_terms: payload.required_terms.map((item) => item.trim()).filter(Boolean),
    max_caps_ratio: Number.isFinite(payload.max_caps_ratio) ? payload.max_caps_ratio : 0.35,
    max_emojis: Number.isFinite(payload.max_emojis) ? payload.max_emojis : 8,
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_brand_safety_rules")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_social_brand_safety_rules")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function evaluateBrandSafetyForPost(
  agencyId: string,
  content: string,
) {
  const rule = await listSocialBrandSafetyRules(agencyId);
  if (!rule) {
    return { status: "approved" as const, flags: [] as string[] };
  }

  const lower = content.toLowerCase();
  const flags: string[] = [];

  rule.blocked_terms.forEach((term) => {
    if (term && lower.includes(term.toLowerCase())) flags.push(`Termino bloqueado: ${term}`);
  });
  rule.required_terms.forEach((term) => {
    if (term && !lower.includes(term.toLowerCase())) flags.push(`Falta termino requerido: ${term}`);
  });

  const capsRatio = getCapsRatio(content);
  if (capsRatio > rule.max_caps_ratio) {
    flags.push(`Exceso de mayusculas (${(capsRatio * 100).toFixed(1)}%)`);
  }

  const emojiCount = countEmojiLike(content);
  if (emojiCount > rule.max_emojis) {
    flags.push(`Exceso de emojis (${emojiCount})`);
  }

  return {
    status: flags.length === 0 ? ("approved" as const) : ("flagged" as const),
    flags,
  };
}

export async function listSocialHookLibrary(agencyId: string, channel?: SocialChannel) {
  let query = supabase
    .from("agency_social_hook_library")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("ctr", { ascending: false })
    .limit(40);

  if (channel) query = query.eq("channel", channel);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeHookRow);
}

export async function saveSocialHookLibraryItem(
  agencyId: string,
  payload: {
    id?: string;
    channel?: SocialChannel | null;
    hook_text: string;
    destination_city?: string | null;
    product_type?: string | null;
    wins?: number;
    uses?: number;
    ctr?: number;
    lead_rate?: number;
    active?: boolean;
  },
) {
  const row = {
    agency_id: agencyId,
    channel: payload.channel || null,
    hook_text: payload.hook_text.trim(),
    destination_city: toNullableString(payload.destination_city || null),
    product_type: toNullableString(payload.product_type || null),
    wins: Number.isFinite(payload.wins) ? payload.wins : 0,
    uses: Number.isFinite(payload.uses) ? payload.uses : 0,
    ctr: Number.isFinite(payload.ctr) ? payload.ctr : 0,
    lead_rate: Number.isFinite(payload.lead_rate) ? payload.lead_rate : 0,
    active: payload.active !== false,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_hook_library")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_social_hook_library")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listSocialPostingWindows(
  agencyId: string,
  channel?: SocialChannel,
) {
  let query = supabase
    .from("agency_social_posting_windows")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("score", { ascending: false })
    .limit(30);
  if (channel) query = query.eq("channel", channel);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizePostingWindowRow);
}

export async function predictBestPublishAt(
  agencyId: string,
  channel: SocialChannel,
) {
  const windows = await listSocialPostingWindows(agencyId, channel);
  if (windows.length === 0) return null;
  const top = windows[0];

  const now = new Date();
  const dayDiff = (top.weekday - now.getDay() + 7) % 7;
  const candidate = new Date(now);
  candidate.setDate(now.getDate() + dayDiff);
  candidate.setHours(top.hour, 0, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 7);
  }
  return candidate.toISOString();
}

export async function listSocialPostLocalizations(
  agencyId: string,
  postId: string,
) {
  const { data, error } = await supabase
    .from("agency_social_post_localizations")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("post_id", postId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeLocalizationRow);
}

export async function saveSocialPostLocalization(
  agencyId: string,
  payload: {
    id?: string;
    post_id: string;
    language_code: string;
    market_code?: string | null;
    localized_title: string;
    localized_hook?: string | null;
    localized_caption?: string | null;
    localized_cta_text?: string | null;
    localized_hashtags?: string[];
    status?: "draft" | "ready" | "published";
  },
) {
  const row = {
    agency_id: agencyId,
    post_id: payload.post_id,
    language_code: payload.language_code.trim().toLowerCase(),
    market_code: toNullableString(payload.market_code || null),
    localized_title: payload.localized_title.trim(),
    localized_hook: toNullableString(payload.localized_hook || null),
    localized_caption: toNullableString(payload.localized_caption || null),
    localized_cta_text: toNullableString(payload.localized_cta_text || null),
    localized_hashtags: sanitizeHashtags(payload.localized_hashtags || []),
    status: payload.status || "draft",
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_post_localizations")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("agency_social_post_localizations")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function generateSocialLocalizations(input: {
  agencyId: string;
  context: SocialAgencyContext;
  postId: string;
  base: Pick<
    SocialPostDraft,
    "title" | "hook" | "caption" | "cta_text" | "hashtags" | "destination_city" | "destination_country"
  >;
  targets: Array<{ language_code: string; market_code?: string | null }>;
}) {
  const { agencyId, context, postId, base, targets } = input;
  if (targets.length === 0) return [];

  const systemInstruction = [
    "Eres especialista en localizacion de marketing de viajes.",
    `Agencia: ${context.agencyName}.`,
    "Responde SOLO JSON valido.",
    "Formato: {\"localizations\":[{\"language_code\":\"\",\"market_code\":\"\",\"localized_title\":\"\",\"localized_hook\":\"\",\"localized_caption\":\"\",\"localized_cta_text\":\"\",\"localized_hashtags\":[\"#...\"]}]}",
  ].join("\n");

  const userPrompt = [
    "Traduce y localiza este contenido social manteniendo conversion.",
    `Titulo: ${base.title}`,
    `Hook: ${base.hook}`,
    `Caption: ${base.caption}`,
    `CTA: ${base.cta_text}`,
    `Hashtags: ${base.hashtags.join(", ")}`,
    `Destino: ${base.destination_city} ${base.destination_country}`,
    `Targets: ${targets.map((t) => `${t.language_code}${t.market_code ? `-${t.market_code}` : ""}`).join(", ")}`,
  ].join("\n");

  const response = await fetch("/api/chat?stream=0", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stream: false,
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) throw new Error("No se pudo generar localizacion.");
  const payload = (await response.json()) as { reply?: string };
  const raw = String(payload.reply || "");

  let items: Array<{
    language_code: string;
    market_code?: string | null;
    localized_title: string;
    localized_hook?: string | null;
    localized_caption?: string | null;
    localized_cta_text?: string | null;
    localized_hashtags?: string[];
  }> = [];

  try {
    const parsed = JSON.parse(extractJsonBlock(raw)) as {
      localizations?: Array<Record<string, unknown>>;
    };
    items = (parsed.localizations || []).map((item) => ({
      language_code: String(item.language_code || "es"),
      market_code: typeof item.market_code === "string" ? item.market_code : null,
      localized_title: String(item.localized_title || base.title),
      localized_hook: typeof item.localized_hook === "string" ? item.localized_hook : base.hook,
      localized_caption: typeof item.localized_caption === "string" ? item.localized_caption : base.caption,
      localized_cta_text: typeof item.localized_cta_text === "string" ? item.localized_cta_text : base.cta_text,
      localized_hashtags: asArrayOfStrings(item.localized_hashtags),
    }));
  } catch {
    items = targets.map((target) => ({
      language_code: target.language_code,
      market_code: target.market_code || null,
      localized_title: base.title,
      localized_hook: base.hook,
      localized_caption: base.caption,
      localized_cta_text: base.cta_text,
      localized_hashtags: base.hashtags,
    }));
  }

  const savedIds: string[] = [];
  for (const item of items) {
    const id = await saveSocialPostLocalization(agencyId, {
      post_id: postId,
      language_code: item.language_code,
      market_code: item.market_code || null,
      localized_title: item.localized_title,
      localized_hook: item.localized_hook || null,
      localized_caption: item.localized_caption || null,
      localized_cta_text: item.localized_cta_text || null,
      localized_hashtags: item.localized_hashtags || [],
      status: "ready",
    });
    savedIds.push(id);
  }
  return savedIds;
}

export async function listSocialBriefs(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_briefs")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeBriefRow);
}

export async function saveSocialBrief(
  agencyId: string,
  payload: {
    id?: string;
    campaign_id?: string | null;
    catalog_id?: string | null;
    title: string;
    objective?: string | null;
    audience?: string | null;
    value_props?: string[];
    suggested_sequence?: Array<Record<string, unknown>>;
    status?: "draft" | "ready" | "applied";
  },
) {
  const row = {
    agency_id: agencyId,
    campaign_id: payload.campaign_id || null,
    catalog_id: payload.catalog_id || null,
    title: payload.title.trim(),
    objective: toNullableString(payload.objective || null),
    audience: toNullableString(payload.audience || null),
    value_props: (payload.value_props || []).map((item) => item.trim()).filter(Boolean),
    suggested_sequence: payload.suggested_sequence || [],
    status: payload.status || "draft",
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_briefs")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }
  const { data, error } = await supabase
    .from("agency_social_briefs")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function generateBriefFromCatalog(input: {
  agencyId: string;
  context: SocialAgencyContext;
  campaignId?: string | null;
  catalogId: string;
  catalogTitle: string;
  catalogSummary: string;
}) {
  const systemInstruction = [
    "Eres estratega social y performance para turismo.",
    "Responde SOLO JSON.",
    "Formato: {\"title\":\"\",\"objective\":\"\",\"audience\":\"\",\"value_props\":[\"\"],\"suggested_sequence\":[{\"stage\":\"\",\"goal\":\"\",\"channels\":[\"\"]}]}",
  ].join("\n");
  const userPrompt = [
    `Agencia: ${input.context.agencyName}`,
    `Producto: ${input.catalogTitle}`,
    `Resumen: ${input.catalogSummary}`,
    "Crea un brief accionable para redes con secuencia de conversion.",
  ].join("\n");

  const response = await fetch("/api/chat?stream=0", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stream: false,
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!response.ok) throw new Error("No se pudo generar brief.");
  const payload = (await response.json()) as { reply?: string };
  const raw = String(payload.reply || "");

  let parsed: {
    title: string;
    objective?: string;
    audience?: string;
    value_props?: string[];
    suggested_sequence?: Array<Record<string, unknown>>;
  } = {
    title: `Brief social - ${input.catalogTitle}`,
    objective: "Generar leads calificados",
    audience: "Viajeros con interes en experiencias premium",
    value_props: [input.catalogSummary],
    suggested_sequence: [],
  };

  try {
    const obj = JSON.parse(extractJsonBlock(raw)) as Record<string, unknown>;
    parsed = {
      title: String(obj.title || parsed.title),
      objective: typeof obj.objective === "string" ? obj.objective : parsed.objective,
      audience: typeof obj.audience === "string" ? obj.audience : parsed.audience,
      value_props: asArrayOfStrings(obj.value_props),
      suggested_sequence: Array.isArray(obj.suggested_sequence) ? (obj.suggested_sequence as Array<Record<string, unknown>>) : [],
    };
  } catch {
    // fallback parsed
  }

  return saveSocialBrief(input.agencyId, {
    campaign_id: input.campaignId || null,
    catalog_id: input.catalogId,
    title: parsed.title,
    objective: parsed.objective || null,
    audience: parsed.audience || null,
    value_props: parsed.value_props || [],
    suggested_sequence: parsed.suggested_sequence || [],
    status: "ready",
  });
}

export async function listSocialCommentsInbox(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_comments_inbox")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeCommentRow);
}

export async function saveSocialCommentInboxItem(
  agencyId: string,
  payload: {
    id?: string;
    channel: SocialChannel;
    post_id?: string | null;
    author_handle?: string | null;
    content: string;
    sentiment?: "positive" | "neutral" | "negative";
    intent?: string | null;
    priority?: "low" | "normal" | "high" | "urgent";
    status?: "open" | "in_progress" | "resolved" | "ignored";
    assigned_to?: string | null;
  },
) {
  const row = {
    agency_id: agencyId,
    channel: payload.channel,
    post_id: payload.post_id || null,
    author_handle: toNullableString(payload.author_handle || null),
    content: payload.content.trim(),
    sentiment: payload.sentiment || "neutral",
    intent: toNullableString(payload.intent || null),
    priority: payload.priority || "normal",
    status: payload.status || "open",
    assigned_to: payload.assigned_to || null,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_comments_inbox")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }
  const { data, error } = await supabase
    .from("agency_social_comments_inbox")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listSocialLeads(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_leads")
    .select("*")
    .eq("agency_id", agencyId)
    .order("score", { ascending: false })
    .limit(80);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeLeadRow);
}

export async function saveSocialLead(
  agencyId: string,
  payload: {
    id?: string;
    source_comment_id?: string | null;
    source_post_id?: string | null;
    traveler_id?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    destination_interest?: string | null;
    budget_estimate?: number | null;
    travelers_count?: number | null;
    status?: "new" | "qualified" | "proposal" | "won" | "lost";
    notes?: string | null;
  },
) {
  const { data: scoreRpc, error: scoreError } = await supabase.rpc(
    "compute_social_lead_score",
    {
      budget: payload.budget_estimate || 0,
      travelers: payload.travelers_count || 0,
      has_email: Boolean(payload.contact_email),
      has_phone: Boolean(payload.contact_phone),
    },
  );
  if (scoreError) throw scoreError;
  const score = Number(scoreRpc || 0);
  const temperature = score >= 70 ? "hot" : score >= 45 ? "warm" : "cold";

  const row = {
    agency_id: agencyId,
    source_comment_id: payload.source_comment_id || null,
    source_post_id: payload.source_post_id || null,
    traveler_id: payload.traveler_id || null,
    contact_name: toNullableString(payload.contact_name || null),
    contact_email: toNullableString(payload.contact_email || null),
    contact_phone: toNullableString(payload.contact_phone || null),
    destination_interest: toNullableString(payload.destination_interest || null),
    budget_estimate: payload.budget_estimate || null,
    travelers_count: payload.travelers_count || null,
    score,
    temperature,
    status: payload.status || "new",
    notes: toNullableString(payload.notes || null),
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_leads")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }
  const { data, error } = await supabase
    .from("agency_social_leads")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listSocialPlaybooks(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_social_playbooks")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizePlaybookRow);
}

export async function saveSocialPlaybook(
  agencyId: string,
  payload: {
    id?: string;
    campaign_id?: string | null;
    name: string;
    objective?: string | null;
    audience?: string | null;
    stages?: Array<Record<string, unknown>>;
    kpis?: Record<string, unknown>;
    status?: "draft" | "active" | "completed" | "paused";
  },
) {
  const row = {
    agency_id: agencyId,
    campaign_id: payload.campaign_id || null,
    name: payload.name.trim(),
    objective: toNullableString(payload.objective || null),
    audience: toNullableString(payload.audience || null),
    stages: payload.stages || [],
    kpis: payload.kpis || {},
    status: payload.status || "draft",
  };

  if (payload.id) {
    const { error } = await supabase
      .from("agency_social_playbooks")
      .update(row)
      .eq("id", payload.id)
      .eq("agency_id", agencyId);
    if (error) throw error;
    return payload.id;
  }
  const { data, error } = await supabase
    .from("agency_social_playbooks")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function generateCampaign360Playbook(input: {
  agencyId: string;
  context: SocialAgencyContext;
  campaignId?: string | null;
  name: string;
  objective: string;
  audience: string;
}) {
  const systemInstruction = [
    "Eres estratega de growth para turismo.",
    "Responde SOLO JSON.",
    "Formato: {\"stages\":[{\"stage\":\"\",\"days\":0,\"goal\":\"\",\"channels\":[\"\"],\"message\":\"\"}],\"kpis\":{\"target_ctr\":0,\"target_cpl\":0,\"target_bookings\":0}}",
  ].join("\n");
  const userPrompt = [
    `Agencia: ${input.context.agencyName}`,
    `Campana: ${input.name}`,
    `Objetivo: ${input.objective}`,
    `Audiencia: ${input.audience}`,
    "Construye una secuencia 360 de 4 fases: teaser, prueba_social, oferta, retarget.",
  ].join("\n");

  const response = await fetch("/api/chat?stream=0", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stream: false,
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!response.ok) throw new Error("No se pudo generar playbook 360.");
  const payload = (await response.json()) as { reply?: string };
  const raw = String(payload.reply || "");

  let stages: Array<Record<string, unknown>> = [];
  let kpis: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(extractJsonBlock(raw)) as Record<string, unknown>;
    stages = Array.isArray(parsed.stages)
      ? (parsed.stages as Array<Record<string, unknown>>)
      : [];
    kpis =
      parsed.kpis && typeof parsed.kpis === "object"
        ? (parsed.kpis as Record<string, unknown>)
        : {};
  } catch {
    stages = [
      { stage: "teaser", days: 3, goal: "awareness", channels: ["instagram", "tiktok"] },
      { stage: "prueba_social", days: 4, goal: "trust", channels: ["instagram", "facebook"] },
      { stage: "oferta", days: 3, goal: "conversion", channels: ["instagram", "facebook", "youtube_shorts"] },
      { stage: "retarget", days: 5, goal: "recovery", channels: ["facebook", "instagram"] },
    ];
    kpis = { target_ctr: 0.08, target_cpl: 35, target_bookings: 10 };
  }

  return saveSocialPlaybook(input.agencyId, {
    campaign_id: input.campaignId || null,
    name: input.name,
    objective: input.objective,
    audience: input.audience,
    stages,
    kpis,
    status: "draft",
  });
}

export async function getSocialExecutiveSummary(
  agencyId: string,
): Promise<SocialExecutiveSummary> {
  const [posts, leads, playbooks] = await Promise.all([
    listSocialPosts(agencyId),
    listSocialLeads(agencyId),
    listSocialPlaybooks(agencyId),
  ]);

  const pipeline = posts.length;
  const published = posts.filter((item) => item.status === "published").length;
  const bookings = posts.reduce((acc, item) => acc + item.bookings, 0);
  const totalImpressions = posts.reduce((acc, item) => acc + item.impressions, 0);
  const totalClicks = posts.reduce((acc, item) => acc + item.clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const leadCount = leads.length;
  const hotLeads = leads.filter((item) => item.temperature === "hot").length;
  const avgCpl = leadCount > 0 ? 1200 / leadCount : 0;

  const channelStats = posts.reduce(
    (acc, post) => {
      post.channels.forEach((channel) => {
        acc[channel] = (acc[channel] || 0) + post.clicks;
      });
      return acc;
    },
    {} as Record<string, number>,
  );
  const topChannelEntry = Object.entries(channelStats).sort((a, b) => b[1] - a[1])[0];
  const topChannel = topChannelEntry ? (topChannelEntry[0] as SocialChannel) : null;

  const recommendation =
    playbooks.length === 0
      ? "Activa un playbook 360 para orquestar teaser, oferta y retarget."
      : hotLeads < 5
        ? "Refuerza contenido de conversion y retarget para subir leads calientes."
        : "Escala la campana ganadora al siguiente mercado con localizacion.";

  return {
    pipeline,
    published,
    leads: leadCount,
    hot_leads: hotLeads,
    bookings,
    avg_ctr: avgCtr,
    avg_cpl: avgCpl,
    top_channel: topChannel,
    recommendation,
  };
}

export async function loadSocialPermissions(
  agencyId: string,
): Promise<SocialPermissions> {
  const fallback: SocialPermissions = {
    agency_id: agencyId,
    can_create_posts: true,
    can_edit_posts: true,
    can_approve_posts: true,
    can_publish_posts: true,
    can_manage_assets: true,
    can_manage_templates: true,
  };

  const { data, error } = await supabase
    .from("agency_social_permissions")
    .select(
      "agency_id, can_create_posts, can_edit_posts, can_approve_posts, can_publish_posts, can_manage_assets, can_manage_templates",
    )
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) return fallback;
    throw error;
  }

  if (!data) return fallback;
  return {
    agency_id: String(data.agency_id || agencyId),
    can_create_posts: data.can_create_posts !== false,
    can_edit_posts: data.can_edit_posts !== false,
    can_approve_posts: data.can_approve_posts !== false,
    can_publish_posts: data.can_publish_posts !== false,
    can_manage_assets: data.can_manage_assets !== false,
    can_manage_templates: data.can_manage_templates !== false,
  };
}

export async function listAgencySocialMarkets(
  agencyId: string,
): Promise<SocialMarketConfig[]> {
  const { data, error } = await supabase
    .from("agency_market_config")
    .select(
      "id, agency_id, country_code, language_code, currency_code, timezone, default_brain_id, active",
    )
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("country_code", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows
    .map((row) => ({
      id: String(row.id),
      agency_id: String(row.agency_id),
      country_code: String(row.country_code || "").toUpperCase(),
      language_code: String(row.language_code || "es").toLowerCase(),
      currency_code: String(row.currency_code || "EUR").toUpperCase(),
      timezone: String(row.timezone || "Europe/Madrid"),
      default_brain_id:
        typeof row.default_brain_id === "string" ? row.default_brain_id : null,
      active: row.active !== false,
    }))
    .filter((item) => Boolean(item.country_code));
}

export async function loadAgencySocialContext(
  agencyId: string,
  marketCode?: string | null,
): Promise<SocialAgencyContext> {
  const [
    { data: agencyData, error: agencyError },
    { data: brandingData, error: brandingError },
    { data: assignmentData, error: assignmentError },
    marketConfigs,
  ] = await Promise.all([
    supabase
      .from("agencies")
      .select("commercial_name, country_code")
      .eq("id", agencyId)
      .single(),
    supabase
      .from("agency_branding")
      .select("logo_url, hero_config")
      .eq("agency_id", agencyId)
      .maybeSingle(),
    supabase
      .from("agencies_ai_assistants")
      .select(
        "ai_assistant_id, ai_assistants!fk_agencies_ai_assistants_brain(id, name, system_prompt, strategic_concept, target_lang, active)",
      )
      .eq("agency_id", agencyId),
    listAgencySocialMarkets(agencyId),
  ]);

  if (agencyError) throw agencyError;
  if (brandingError) throw brandingError;
  if (assignmentError) throw assignmentError;

  const normalizedMarketCode = normalizeCountryCode(marketCode);
  const selectedMarket =
    marketConfigs.find((item) => item.country_code === normalizedMarketCode) ||
    marketConfigs[0] ||
    null;

  const defaultBrainId =
    typeof selectedMarket?.default_brain_id === "string" ? selectedMarket.default_brain_id : null;
  const assignments = (assignmentData ?? []) as Array<{
    ai_assistant_id: string;
    ai_assistants: Record<string, unknown> | Record<string, unknown>[] | null;
  }>;

  const normalizedBrains = assignments
    .map((row) => {
      const brainObj = Array.isArray(row.ai_assistants)
        ? row.ai_assistants[0]
        : row.ai_assistants;
      if (!brainObj || brainObj.active === false) return null;
      return {
        id: String(brainObj.id),
        name: String(brainObj.name || "Brain"),
        system_prompt:
          typeof brainObj.system_prompt === "string"
            ? brainObj.system_prompt
            : null,
        strategic_concept:
          typeof brainObj.strategic_concept === "string"
            ? brainObj.strategic_concept
            : null,
        target_lang:
          typeof brainObj.target_lang === "string" ? brainObj.target_lang : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const selectedBrain =
    normalizedBrains.find((brain) => brain.id === defaultBrainId) ||
    normalizedBrains[0] ||
    null;

  const heroConfig =
    brandingData?.hero_config && typeof brandingData.hero_config === "object"
      ? (brandingData.hero_config as Record<string, unknown>)
      : null;

  return {
    agencyName: String(agencyData?.commercial_name || "Agencia"),
    countryCode:
      selectedMarket?.country_code ||
      (typeof agencyData?.country_code === "string" ? agencyData.country_code : null),
    marketCode: selectedMarket?.country_code || null,
    languageCode:
      selectedMarket?.language_code || "es",
    currencyCode: selectedMarket?.currency_code || null,
    timezone: selectedMarket?.timezone || null,
    logoUrl: typeof brandingData?.logo_url === "string" ? brandingData.logo_url : null,
    mascotName:
      typeof heroConfig?.mascot_name === "string" ? heroConfig.mascot_name : null,
    brain: selectedBrain,
  };
}

export async function generateSocialPostSuggestion(input: {
  context: SocialAgencyContext;
  post: Pick<
    SocialPostDraft,
    | "title"
    | "destination_city"
    | "destination_country"
    | "tone"
    | "channels"
    | "cta_url"
    | "utm_campaign"
  >;
  campaignName?: string | null;
  catalogSummary?: string | null;
}) {
  const { context, post, campaignName, catalogSummary } = input;
  const systemInstruction = [
    "Eres estratega senior de social media para turismo.",
    `Agencia: ${context.agencyName}.`,
    `Idioma objetivo: ${context.languageCode}.`,
    context.mascotName ? `Mascota de marca: ${context.mascotName}.` : "",
    context.brain?.strategic_concept
      ? `Concepto estrategico: ${context.brain.strategic_concept}`
      : "",
    context.brain?.system_prompt
      ? `Lineamientos de personalidad: ${context.brain.system_prompt}`
      : "",
    "Debes responder SOLO con JSON valido.",
    "Formato JSON obligatorio: {\"title\":\"\", \"hook\":\"\", \"caption\":\"\", \"hashtags\":[\"#...\"], \"cta_text\":\"\", \"cta_url\":\"\"}",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    "Genera una pieza social premium para captar leads de viajes.",
    `Canales: ${post.channels.join(", ") || "instagram"}.`,
    `Titulo base: ${post.title || "Experiencia de viaje personalizada"}.`,
    `Destino: ${post.destination_city || "-"} / ${post.destination_country || "-"}.`,
    `Tono deseado: ${post.tone || "inspirador"}.`,
    campaignName ? `Campana: ${campaignName}.` : "",
    catalogSummary ? `Contexto de producto: ${catalogSummary}.` : "",
    `URL CTA: ${post.cta_url || "https://www.collaviajes.com/traveler"}.`,
    `UTM campaign: ${post.utm_campaign || "social_launch"}.`,
    "Longitud caption: entre 90 y 170 palabras.",
    "Incluye una propuesta de valor, urgencia suave y cierre accionable.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("/api/chat?stream=0", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stream: false,
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "No se pudo generar copy con IA.");
  }

  const payload = (await response.json()) as { reply?: string };
  const raw = String(payload.reply || "").trim();

  try {
    const parsed = JSON.parse(extractJsonBlock(raw)) as Partial<SocialAiSuggestion>;
    return {
      title: String(parsed.title || post.title || "Nueva idea de viaje"),
      hook: String(parsed.hook || ""),
      caption: String(parsed.caption || raw),
      hashtags: sanitizeHashtags(asArrayOfStrings(parsed.hashtags).slice(0, 8)),
      cta_text: String(parsed.cta_text || "Quiero mi propuesta"),
      cta_url: String(parsed.cta_url || post.cta_url || ""),
    } satisfies SocialAiSuggestion;
  } catch {
    return {
      title: post.title || "Nueva idea de viaje",
      hook: "",
      caption: raw,
      hashtags: [],
      cta_text: "Quiero mi propuesta",
      cta_url: post.cta_url || "",
    } satisfies SocialAiSuggestion;
  }
}

export async function generatePaidAdsSuggestion(input: {
  context: SocialAgencyContext;
  post: Pick<
    SocialPostDraft,
    | "title"
    | "hook"
    | "caption"
    | "destination_city"
    | "destination_country"
    | "tone"
    | "cta_text"
    | "cta_url"
    | "utm_campaign"
    | "language_code"
  >;
  campaignName?: string | null;
  catalogSummary?: string | null;
}): Promise<SocialPaidAdsSuggestion> {
  const { context, post, campaignName, catalogSummary } = input;
  const finalUrl = post.cta_url || "https://www.collaviajes.com/traveler";
  const systemInstruction = [
    "Eres media buyer senior en turismo (Google Ads y Meta Ads).",
    `Agencia: ${context.agencyName}.`,
    `Idioma objetivo: ${post.language_code || context.languageCode || "es"}.`,
    context.brain?.strategic_concept
      ? `Concepto estrategico: ${context.brain.strategic_concept}`
      : "",
    "Responde SOLO JSON valido.",
    "Formato obligatorio:",
    "{\"google\":{\"headlines\":[\"\"],\"descriptions\":[\"\"],\"path1\":\"\",\"path2\":\"\",\"final_url\":\"\",\"callouts\":[\"\"],\"sitelinks\":[{\"title\":\"\",\"description\":\"\",\"url\":\"\"}]},\"facebook\":{\"primary_texts\":[\"\"],\"headlines\":[\"\"],\"descriptions\":[\"\"],\"cta_texts\":[\"\"]}}",
    "Reglas Google: 8 headlines (max 30 chars aprox), 4 descriptions (max 90 chars aprox), 4 callouts, 3 sitelinks.",
    "Reglas Facebook: 3 primary_texts, 3 headlines, 3 descriptions, 3 cta_texts.",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    "Genera creatives de pago listos para performance en turismo.",
    `Titulo base: ${post.title || "Experiencia de viaje personalizada"}.`,
    `Hook: ${post.hook || "-"}.`,
    `Caption base: ${post.caption || "-"}.`,
    `Destino: ${post.destination_city || "-"} / ${post.destination_country || "-"}.`,
    `Tono: ${post.tone || "inspirador y premium"}.`,
    `CTA base: ${post.cta_text || "Quiero mi propuesta"}.`,
    `URL final: ${finalUrl}.`,
    `UTM campaign: ${post.utm_campaign || "paid_launch"}.`,
    campaignName ? `Campana: ${campaignName}.` : "",
    catalogSummary ? `Contexto de producto: ${catalogSummary}.` : "",
    "No inventes precios ni condiciones no dadas.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("/api/chat?stream=0", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stream: false,
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "No se pudieron generar anuncios de pago.");
  }

  const fallback: SocialPaidAdsSuggestion = {
    google: {
      headlines: [
        (post.title || "Viaje a medida").slice(0, 30),
        `Viaja a ${post.destination_city || post.destination_country || "tu destino"}`.slice(
          0,
          30,
        ),
        "Asesoria experta en viajes",
        "Reserva con acompanamiento",
      ],
      descriptions: [
        "Disenamos tu viaje con asesoria humana y seguimiento completo.",
        "Recibe propuesta personalizada y asegura tu mejor itinerario.",
      ],
      path1: toSlugToken(post.destination_country || context.countryCode, "travel"),
      path2: toSlugToken(post.destination_city || "oferta", "oferta"),
      final_url: finalUrl,
      callouts: ["Atencion personalizada", "Soporte por WhatsApp", "Pago seguro", "Equipo experto"],
      sitelinks: [
        {
          title: "Habla con asesor",
          description: "Resolucion rapida por chat",
          url: finalUrl,
        },
        {
          title: "Ver itinerarios",
          description: "Opciones segun tu estilo",
          url: finalUrl,
        },
        {
          title: "Solicitar propuesta",
          description: "Plan a medida sin friccion",
          url: finalUrl,
        },
      ],
    },
    facebook: {
      primary_texts: [
        `Te ayudamos a planear ${post.destination_city || "tu viaje"} con una propuesta personalizada.`,
        "Viaja con acompanamiento experto y opciones adaptadas a tu presupuesto.",
      ],
      headlines: [
        (post.title || "Tu proximo viaje").slice(0, 40),
        "Recibe tu propuesta en minutos",
      ],
      descriptions: [
        "Equipo experto, rutas optimizadas y soporte de principio a fin.",
        "Consulta por WhatsApp y cierra tu viaje con tranquilidad.",
      ],
      cta_texts: [post.cta_text || "Quiero mi propuesta", "Enviar mensaje", "Reservar ahora"],
    },
  };

  const payload = (await response.json()) as { reply?: string };
  const raw = String(payload.reply || "").trim();

  try {
    const parsed = JSON.parse(extractJsonBlock(raw)) as Partial<SocialPaidAdsSuggestion>;
    const google = parsed.google || ({} as SocialPaidAdsSuggestion["google"]);
    const facebook = parsed.facebook || ({} as SocialPaidAdsSuggestion["facebook"]);

    return {
      google: {
        headlines: sanitizeTextList(google.headlines, 8, fallback.google.headlines),
        descriptions: sanitizeTextList(
          google.descriptions,
          4,
          fallback.google.descriptions,
        ),
        path1:
          toNullableString(google.path1) ||
          toSlugToken(post.destination_country || context.countryCode, "travel"),
        path2:
          toNullableString(google.path2) ||
          toSlugToken(post.destination_city || "oferta", "oferta"),
        final_url: toNullableString(google.final_url) || finalUrl,
        callouts: sanitizeTextList(google.callouts, 4, fallback.google.callouts),
        sitelinks: Array.isArray(google.sitelinks)
          ? google.sitelinks
              .map((item) => {
                if (!item || typeof item !== "object") return null;
                const row = item as Record<string, unknown>;
                const title = toNullableString(String(row.title || ""));
                if (!title) return null;
                return {
                  title,
                  description:
                    toNullableString(String(row.description || "")) ||
                    "Mas informacion",
                  url: toNullableString(String(row.url || "")) || finalUrl,
                };
              })
              .filter(
                (
                  item,
                ): item is SocialPaidAdsSuggestion["google"]["sitelinks"][number] =>
                  Boolean(item),
              )
              .slice(0, 3)
          : fallback.google.sitelinks,
      },
      facebook: {
        primary_texts: sanitizeTextList(
          facebook.primary_texts,
          3,
          fallback.facebook.primary_texts,
        ),
        headlines: sanitizeTextList(facebook.headlines, 3, fallback.facebook.headlines),
        descriptions: sanitizeTextList(
          facebook.descriptions,
          3,
          fallback.facebook.descriptions,
        ),
        cta_texts: sanitizeTextList(
          facebook.cta_texts,
          3,
          fallback.facebook.cta_texts,
        ),
      },
    };
  } catch {
    return fallback;
  }
}

const CHANNEL_IMAGE_SPECS: Record<SocialChannel, { aspectRatio: string; dimensions: string; styleHint: string }> = {
  instagram: {
    aspectRatio: "4:5",
    dimensions: "1080x1350",
    styleHint: "editorial premium, luz natural, enfoque emocional",
  },
  facebook: {
    aspectRatio: "1.91:1",
    dimensions: "1200x628",
    styleHint: "comercial informativo, escena amplia con contexto de destino",
  },
  tiktok: {
    aspectRatio: "9:16",
    dimensions: "1080x1920",
    styleHint: "dinamico vertical, accion y energia, encuadre cercano",
  },
  youtube_shorts: {
    aspectRatio: "9:16",
    dimensions: "1080x1920",
    styleHint: "cinematic vertical, alto contraste, storytelling visual",
  },
};

function normalizeChannel(value: string): SocialChannel | null {
  if (value === "instagram" || value === "facebook" || value === "tiktok" || value === "youtube_shorts") {
    return value;
  }
  return null;
}

function buildUnsplashPreviewUrl(query: string, channel: SocialChannel) {
  const dim = CHANNEL_IMAGE_SPECS[channel].dimensions;
  const safeQuery = encodeURIComponent(`${query},travel,tourism,destination`);
  return `https://source.unsplash.com/${dim}/?${safeQuery}`;
}

export async function generateSocialImageDirections(input: {
  context: SocialAgencyContext;
  post: Pick<
    SocialPostDraft,
    "title" | "destination_city" | "destination_country" | "tone" | "channels" | "caption"
  >;
}) {
  const { context, post } = input;
  const channels: SocialChannel[] =
    post.channels.length > 0 ? post.channels : ["instagram"];
  const specsPrompt = channels
    .map((channel) => {
      const spec = CHANNEL_IMAGE_SPECS[channel];
      return `${channel}: ratio ${spec.aspectRatio}, estilo ${spec.styleHint}`;
    })
    .join("\n");

  const systemInstruction = [
    "Eres director creativo de imagen para marketing de viajes.",
    `Agencia: ${context.agencyName}.`,
    context.brain?.system_prompt ? `Tono de marca: ${context.brain.system_prompt}` : "",
    "Responde SOLO JSON valido.",
    "Formato: {\"images\":[{\"channel\":\"instagram|facebook|tiktok|youtube_shorts\",\"visual_style\":\"\",\"prompt\":\"\",\"negative_prompt\":\"\",\"alt_text\":\"\",\"query\":\"\"}]}",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    "Genera direccion visual por canal para publicar una oferta de viajes.",
    `Canales: ${channels.join(", ")}.`,
    `Titulo: ${post.title || "Viaje personalizado premium"}.`,
    `Destino: ${post.destination_city || "-"} ${post.destination_country || "-"}.`,
    `Tono: ${post.tone || "inspirador y premium"}.`,
    `Contexto de caption: ${post.caption || "-"}.`,
    "Para cada canal entrega: visual_style, prompt, negative_prompt, alt_text, query.",
    "La query debe ser de turismo real del destino, evitar ambiguedad semantica.",
    "Usa estas especificaciones:",
    specsPrompt,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("/api/chat?stream=0", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stream: false,
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "No se pudieron generar imagenes por canal.");
  }

  const payload = (await response.json()) as { reply?: string };
  const raw = String(payload.reply || "").trim();
  const fallbackQuery = `${post.destination_city || "city"} ${post.destination_country || "travel"} tourism landscape`;

  try {
    const parsed = JSON.parse(extractJsonBlock(raw)) as {
      images?: Array<Record<string, unknown>>;
    };
    const result = (parsed.images || [])
      .map((item) => {
        const channel = normalizeChannel(String(item.channel || ""));
        if (!channel) return null;
        const spec = CHANNEL_IMAGE_SPECS[channel];
        const query = String(item.query || fallbackQuery);
        return {
          channel,
          aspect_ratio: spec.aspectRatio,
          visual_style: String(item.visual_style || spec.styleHint),
          prompt: String(item.prompt || `${post.title} in ${post.destination_city}`),
          negative_prompt: String(item.negative_prompt || "fruit, logo watermark, low quality"),
          alt_text: String(item.alt_text || `${post.destination_city || "Destino"} viaje ${channel}`),
          query,
          preview_url: buildUnsplashPreviewUrl(query, channel),
        } satisfies SocialImageDirection;
      })
      .filter((item): item is SocialImageDirection => Boolean(item));

    if (result.length > 0) return result;
  } catch {
    // fallback below
  }

  return channels.map((channel) => {
    const spec = CHANNEL_IMAGE_SPECS[channel];
    const query = `${post.destination_city || "city"} ${post.destination_country || ""} tourism ${channel}`;
    return {
      channel,
      aspect_ratio: spec.aspectRatio,
      visual_style: spec.styleHint,
      prompt: `${post.title || "Viaje premium"} en ${post.destination_city || "destino"} (${spec.aspectRatio})`,
      negative_prompt: "fruit, food close-up, blurred, watermark",
      alt_text: `${post.destination_city || "Destino"} experiencia turistica en formato ${spec.aspectRatio}`,
      query,
      preview_url: buildUnsplashPreviewUrl(query, channel),
    } satisfies SocialImageDirection;
  });
}

export function isMissingSocialMediaSchemaError(error: unknown) {
  return isMissingRelationError(error);
}
