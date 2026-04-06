export const SOCIAL_CHANNELS = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube_shorts",
] as const;

export type SocialChannel = (typeof SOCIAL_CHANNELS)[number];

export const SOCIAL_POST_STATUSES = [
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "archived",
] as const;

export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export type SocialCampaignStatus = "draft" | "active" | "paused" | "completed";

export type SocialCampaign = {
  id: string;
  agency_id: string;
  name: string;
  objective: string | null;
  target_audience: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  status: SocialCampaignStatus;
  brain_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialPost = {
  id: string;
  agency_id: string;
  campaign_id: string | null;
  related_catalog_id: string | null;
  title: string;
  hook: string | null;
  caption: string | null;
  channels: SocialChannel[];
  hashtags: string[];
  status: SocialPostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  cta_text: string | null;
  cta_url: string | null;
  destination_city: string | null;
  destination_country: string | null;
  tone: string | null;
  language_code: string | null;
  primary_language: string;
  market_code: string | null;
  asset_urls: string[];
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  impressions: number;
  clicks: number;
  leads: number;
  bookings: number;
  engagement_rate: number;
  quality_score: number;
  quality_flags: string[];
  brand_safety_status: "pending" | "approved" | "flagged";
  sync_status: "pending" | "synced" | "failed";
  best_publish_at: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialAccount = {
  id: string;
  agency_id: string;
  channel: SocialChannel;
  handle: string;
  account_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialCatalogOption = {
  id: string;
  title: string | null;
  summary: string | null;
  country_code: string | null;
  images: string[];
  coverImage: string | null;
};

export type SocialBrainContext = {
  id: string;
  name: string;
  system_prompt: string | null;
  strategic_concept: string | null;
  target_lang: string | null;
};

export type SocialAgencyContext = {
  agencyName: string;
  countryCode: string | null;
  marketCode?: string | null;
  languageCode: string;
  currencyCode?: string | null;
  timezone?: string | null;
  logoUrl: string | null;
  mascotName: string | null;
  brain: SocialBrainContext | null;
};

export type SocialPostDraft = {
  id?: string;
  campaign_id: string | null;
  related_catalog_id: string | null;
  title: string;
  hook: string;
  caption: string;
  channels: SocialChannel[];
  hashtags: string[];
  status: SocialPostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  cta_text: string;
  cta_url: string;
  destination_city: string;
  destination_country: string;
  market_code: string;
  tone: string;
  language_code: string;
  asset_urls: string[];
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  impressions: number;
  clicks: number;
  leads: number;
  bookings: number;
  engagement_rate: number;
  active: boolean;
};

export type SocialMarketConfig = {
  id: string;
  agency_id: string;
  country_code: string;
  language_code: string;
  currency_code: string;
  timezone: string;
  default_brain_id: string | null;
  active: boolean;
};

export type SocialAiSuggestion = {
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta_text: string;
  cta_url: string;
};

export type SocialGoogleAdsAsset = {
  headlines: string[];
  descriptions: string[];
  path1: string;
  path2: string;
  final_url: string;
  callouts: string[];
  sitelinks: Array<{
    title: string;
    description: string;
    url: string;
  }>;
};

export type SocialFacebookAdsAsset = {
  primary_texts: string[];
  headlines: string[];
  descriptions: string[];
  cta_texts: string[];
};

export type SocialPaidAdsSuggestion = {
  google: SocialGoogleAdsAsset;
  facebook: SocialFacebookAdsAsset;
};

export type SocialQualityReport = {
  score: number;
  flags: string[];
  readyForSchedule: boolean;
  readyForPublish: boolean;
};

export type SocialPostVariant = {
  id: string;
  agency_id: string;
  post_id: string;
  variant_label: string;
  channel: SocialChannel | null;
  hook: string | null;
  caption: string | null;
  cta_text: string | null;
  score: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialAsset = {
  id: string;
  agency_id: string;
  title: string;
  asset_url: string;
  destination_tags: string[];
  channels: SocialChannel[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialTemplate = {
  id: string;
  agency_id: string;
  name: string;
  product_type: string | null;
  title_template: string | null;
  hook_template: string | null;
  caption_template: string | null;
  default_tone: string | null;
  default_channels: SocialChannel[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialPublishLog = {
  id: string;
  agency_id: string;
  post_id: string;
  status: "queued" | "published" | "failed";
  message: string | null;
  provider: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type SocialPermissions = {
  agency_id: string;
  can_create_posts: boolean;
  can_edit_posts: boolean;
  can_approve_posts: boolean;
  can_publish_posts: boolean;
  can_manage_assets: boolean;
  can_manage_templates: boolean;
};

export type SocialImageDirection = {
  channel: SocialChannel;
  aspect_ratio: string;
  visual_style: string;
  prompt: string;
  negative_prompt: string;
  alt_text: string;
  query: string;
  preview_url: string;
};

export type SocialUtmRule = {
  id: string;
  agency_id: string;
  channel: SocialChannel | null;
  source: string;
  medium: string;
  campaign_prefix: string;
  enforce_campaign: boolean;
  enforce_channel_suffix: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialBrandSafetyRule = {
  id: string;
  agency_id: string;
  blocked_terms: string[];
  required_terms: string[];
  max_caps_ratio: number;
  max_emojis: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialHookLibraryItem = {
  id: string;
  agency_id: string;
  channel: SocialChannel | null;
  hook_text: string;
  destination_city: string | null;
  product_type: string | null;
  wins: number;
  uses: number;
  ctr: number;
  lead_rate: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialPostLocalization = {
  id: string;
  agency_id: string;
  post_id: string;
  language_code: string;
  market_code: string | null;
  localized_title: string;
  localized_hook: string | null;
  localized_caption: string | null;
  localized_cta_text: string | null;
  localized_hashtags: string[];
  status: "draft" | "ready" | "published";
  created_at: string;
  updated_at: string;
};

export type SocialPostingWindow = {
  id: string;
  agency_id: string;
  channel: SocialChannel;
  weekday: number;
  hour: number;
  score: number;
  sample_size: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialBrief = {
  id: string;
  agency_id: string;
  campaign_id: string | null;
  catalog_id: string | null;
  title: string;
  objective: string | null;
  audience: string | null;
  value_props: string[];
  suggested_sequence: Array<Record<string, unknown>>;
  status: "draft" | "ready" | "applied";
  created_at: string;
  updated_at: string;
};

export type SocialCommentInbox = {
  id: string;
  agency_id: string;
  channel: SocialChannel;
  post_id: string | null;
  author_handle: string | null;
  content: string;
  sentiment: "positive" | "neutral" | "negative";
  intent: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "ignored";
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialLead = {
  id: string;
  agency_id: string;
  source_comment_id: string | null;
  source_post_id: string | null;
  traveler_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  destination_interest: string | null;
  budget_estimate: number | null;
  travelers_count: number | null;
  score: number;
  temperature: "cold" | "warm" | "hot";
  status: "new" | "qualified" | "proposal" | "won" | "lost";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialPlaybook = {
  id: string;
  agency_id: string;
  campaign_id: string | null;
  name: string;
  objective: string | null;
  audience: string | null;
  stages: Array<Record<string, unknown>>;
  kpis: Record<string, unknown>;
  status: "draft" | "active" | "completed" | "paused";
  created_at: string;
  updated_at: string;
};

export type SocialExecutiveSummary = {
  pipeline: number;
  published: number;
  leads: number;
  hot_leads: number;
  bookings: number;
  avg_ctr: number;
  avg_cpl: number;
  top_channel: SocialChannel | null;
  recommendation: string;
};
