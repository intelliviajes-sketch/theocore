export type MarketingCampaignStatus = "planned" | "active" | "paused" | "completed";

export type MarketingCampaign = {
  id: string;
  agency_id: string;
  market_code: string;
  domain: string | null;
  name: string;
  objective: string | null;
  budget_monthly: number | null;
  currency_code: string | null;
  start_date: string | null;
  end_date: string | null;
  channels: string[];
  kpi_targets: Record<string, unknown>;
  status: MarketingCampaignStatus;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingTrackingConfig = {
  id: string;
  agency_id: string;
  market_code: string;
  domain: string | null;
  ga4_measurement_id: string | null;
  gtm_container_id: string | null;
  meta_pixel_id: string | null;
  google_ads_customer_id: string | null;
  google_ads_conversion_label: string | null;
  tiktok_pixel_id: string | null;
  consent_mode: "basic" | "advanced" | "disabled";
  conversion_events: Array<Record<string, unknown>>;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingAudience = {
  id: string;
  agency_id: string;
  market_code: string;
  name: string;
  provider: "internal" | "meta" | "google" | "both";
  rule_json: Record<string, unknown>;
  size_estimate: number | null;
  status: "draft" | "synced" | "error";
  last_sync_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingAutomation = {
  id: string;
  agency_id: string;
  market_code: string;
  name: string;
  channel: "email" | "whatsapp" | "push" | "ads";
  trigger_event: string;
  template: string;
  status: "draft" | "active" | "paused";
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingExperiment = {
  id: string;
  agency_id: string;
  market_code: string;
  domain: string | null;
  name: string;
  hypothesis: string | null;
  variant_a: Record<string, unknown>;
  variant_b: Record<string, unknown>;
  metric_primary: string | null;
  status: "draft" | "running" | "completed" | "paused";
  winner: "A" | "B" | "none" | null;
  started_at: string | null;
  ended_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingMarketContent = {
  id: string;
  agency_id: string;
  market_code: string;
  domain: string | null;
  language_code: string;
  brand_name: string | null;
  logo_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  cta_primary: string | null;
  cta_secondary: string | null;
  footer_address: string | null;
  footer_email: string | null;
  footer_phone: string | null;
  legal_notice: string | null;
  sticky_bg_color: string | null;
  sticky_text_color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingOnboardingStep = {
  id: string;
  agency_id: string;
  market_code: string;
  step_key: string;
  title: string;
  description: string | null;
  is_required: boolean;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingPlaybookTemplate = {
  id: string;
  agency_id: string | null;
  market_code: string | null;
  name: string;
  objective: string | null;
  channels: string[];
  kpi_targets: Record<string, unknown>;
  blueprint: Record<string, unknown>;
  is_system: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingCampaignApproval = {
  id: string;
  agency_id: string;
  campaign_id: string;
  market_code: string;
  status: "pending" | "approved" | "rejected";
  requested_by: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingAlertRule = {
  id: string;
  agency_id: string;
  market_code: string;
  domain: string | null;
  name: string;
  metric_key: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  threshold: number;
  window_hours: number;
  channel: "dashboard" | "email" | "whatsapp";
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingAlertEvent = {
  id: string;
  agency_id: string;
  rule_id: string | null;
  market_code: string;
  domain: string | null;
  metric_key: string;
  metric_value: number;
  threshold: number;
  status: "open" | "acknowledged" | "resolved";
  message: string;
  triggered_at: string;
  resolved_at: string | null;
  created_at: string;
};

export type MarketingReportSnapshot = {
  id: string;
  agency_id: string;
  market_code: string;
  domain: string | null;
  name: string;
  period_start: string;
  period_end: string;
  kpis: Record<string, unknown>;
  highlights: Array<Record<string, unknown> | string>;
  share_token: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingMaturityScore = {
  score: number;
  completed_steps: number;
  total_steps: number;
  active_campaigns: number;
  tracking_ready: boolean;
  alert_rules: number;
  pending_approvals: number;
};

export type DomainInstallStatus = "pending" | "verified" | "failed";
export type DomainSslStatus = "pending" | "issued" | "failed";

export type AgencyDomainOperational = {
  id: string;
  agency_id: string;
  domain: string;
  country_code: string | null;
  is_primary: boolean;
  active: boolean;
  installation_status: DomainInstallStatus;
  ssl_status: DomainSslStatus;
  dns_target: string | null;
  verified_at: string | null;
  notes: string | null;
};

export type AgencyMarketConfigOperational = {
  id: string;
  agency_id: string;
  country_code: string;
  language_code: string;
  currency_code: string;
  timezone: string;
  default_brain_id: string | null;
  active: boolean;
};
