export type Brain = {
  id: string;
  name: string;
  domaintraveler: string | null;
  brain_type: "inspira" | "planifica" | "acompana" | "evalua" | "operacional";
  execution_layer: "frontend" | "backend";
  brain_category: "traveler" | "agency" | "growth" | "data" | "operations";
  market_origin: string | null;
  market_destination: string | null | string[];
  language_priority: string[];
  capabilities: string[];
  model: string | null;
  target_lang: string | null;
  active: boolean;
  visibility_level: "public" | "agency_only" | "private";
  identity_profile: any;
  strategic_concept: string | null;
  knowledge_bases: string[];
  monetization_model: string | null;
  business_rules: any;
  task_automation: string[];
  data_sources: string[];
  output_targets: string[];
  scheduling: any | null;
  conversion_mode?: "direct_sales" | "ads_affiliate" | "mixed";
  allowed_markets?: string[];
  ads_strategy?: any;
  behavior_rules?: any;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  ts: number;
};

export type UserLite = {
  id: string | null;
  name?: string;
  country?: string | null;
  language?: string | null;
  prefs?: string[];
};

export const guessLang = () => {
  const language = typeof navigator !== "undefined" ? navigator.language || "es" : "es";
  return language.slice(0, 2).toLowerCase();
};

export function countryEmojiFromCode(code?: string | null) {
  if (!code) return "🌍";
  const cc = code.toUpperCase();
  const A = 0x1f1e6;
  return String.fromCodePoint(...cc.split("").map((c) => A + (c.charCodeAt(0) - 65)));
}

export function cn(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}
