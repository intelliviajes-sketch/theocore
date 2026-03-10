export type ChatStage = "discover" | "qualify" | "compare" | "decide" | "prepare";

export type ChatMessageRole = "system" | "user" | "assistant";

export type ChatMessageInput = {
  role: ChatMessageRole;
  content: string;
};

export type ChatQuickReply = {
  id: string;
  label: string;
  value: string;
};

export type ChatCatalogCard = {
  id: string;
  title: string;
  summary: string;
  destination?: string | null;
  tags?: string[];
  ctaLabel?: string | null;
  ctaAction?: string | null;
};

export type ChatComparisonItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  highlights: string[];
};

export type ChatSnapshot = {
  summary: string;
  destination?: string | null;
  budgetLevel?: string | null;
  travelParty?: string | null;
  dates?: string | null;
};

export type ChatStatePatch = {
  stage?: ChatStage;
  origin?: string | null;
  destinationCandidates?: string[];
  budgetLevel?: string | null;
  travelParty?: string | null;
  dates?: string | null;
  interests?: string[];
  constraints?: string[];
  selectedProductIds?: string[];
};

export type StructuredChatResponse = {
  message: string;
  messageType: "text" | "catalog_cards" | "comparison" | "trip_snapshot";
  quickReplies: ChatQuickReply[];
  catalogCards: ChatCatalogCard[];
  comparisonItems: ChatComparisonItem[];
  tripSnapshot: ChatSnapshot | null;
  tripStatePatch: ChatStatePatch;
  cta: {
    label: string;
    action: string;
  } | null;
};

export type ChatResponseFormat = "text" | "structured";

export const STRUCTURED_CHAT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    messageType: {
      type: "string",
      enum: ["text", "catalog_cards", "comparison", "trip_snapshot"],
    },
    quickReplies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          value: { type: "string" },
        },
        required: ["id", "label", "value"],
      },
    },
    catalogCards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          destination: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          ctaLabel: { type: "string", nullable: true },
          ctaAction: { type: "string", nullable: true },
        },
        required: ["id", "title", "summary"],
      },
    },
    comparisonItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string", nullable: true },
          highlights: { type: "array", items: { type: "string" } },
        },
        required: ["id", "title", "highlights"],
      },
    },
    tripSnapshot: {
      type: ["object", "null"],
      properties: {
        summary: { type: "string" },
        destination: { type: "string", nullable: true },
        budgetLevel: { type: "string", nullable: true },
        travelParty: { type: "string", nullable: true },
        dates: { type: "string", nullable: true },
      },
      required: ["summary"],
    },
    tripStatePatch: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          enum: ["discover", "qualify", "compare", "decide", "prepare"],
        },
        origin: { type: "string", nullable: true },
        destinationCandidates: { type: "array", items: { type: "string" } },
        budgetLevel: { type: "string", nullable: true },
        travelParty: { type: "string", nullable: true },
        dates: { type: "string", nullable: true },
        interests: { type: "array", items: { type: "string" } },
        constraints: { type: "array", items: { type: "string" } },
        selectedProductIds: { type: "array", items: { type: "string" } },
      },
    },
    cta: {
      type: ["object", "null"],
      properties: {
        label: { type: "string" },
        action: { type: "string" },
      },
      required: ["label", "action"],
    },
  },
  required: [
    "message",
    "messageType",
    "quickReplies",
    "catalogCards",
    "comparisonItems",
    "tripSnapshot",
    "tripStatePatch",
    "cta",
  ],
} as const;

export function normalizeStructuredChatResponse(value: unknown): StructuredChatResponse {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : {};

  const quickReplies = Array.isArray(input.quickReplies)
    ? input.quickReplies
        .map((item) => (typeof item === "object" && item ? item as Record<string, unknown> : null))
        .filter(Boolean)
        .map((item) => ({
          id: String(item!.id ?? crypto.randomUUID()),
          label: String(item!.label ?? "Continuar"),
          value: String(item!.value ?? item!.label ?? "Continuar"),
        }))
    : [];

  const catalogCards = Array.isArray(input.catalogCards)
    ? input.catalogCards
        .map((item) => (typeof item === "object" && item ? item as Record<string, unknown> : null))
        .filter(Boolean)
        .map((item) => ({
          id: String(item!.id ?? crypto.randomUUID()),
          title: String(item!.title ?? "Opcion"),
          summary: String(item!.summary ?? ""),
          destination: item!.destination ? String(item!.destination) : null,
          tags: Array.isArray(item!.tags) ? item!.tags.map((tag) => String(tag)) : [],
          ctaLabel: item!.ctaLabel ? String(item!.ctaLabel) : null,
          ctaAction: item!.ctaAction ? String(item!.ctaAction) : null,
        }))
    : [];

  const comparisonItems = Array.isArray(input.comparisonItems)
    ? input.comparisonItems
        .map((item) => (typeof item === "object" && item ? item as Record<string, unknown> : null))
        .filter(Boolean)
        .map((item) => ({
          id: String(item!.id ?? crypto.randomUUID()),
          title: String(item!.title ?? "Comparativa"),
          subtitle: item!.subtitle ? String(item!.subtitle) : null,
          highlights: Array.isArray(item!.highlights) ? item!.highlights.map((highlight) => String(highlight)) : [],
        }))
    : [];

  const tripSnapshot = input.tripSnapshot && typeof input.tripSnapshot === "object"
    ? {
        summary: String((input.tripSnapshot as Record<string, unknown>).summary ?? ""),
        destination: (input.tripSnapshot as Record<string, unknown>).destination ? String((input.tripSnapshot as Record<string, unknown>).destination) : null,
        budgetLevel: (input.tripSnapshot as Record<string, unknown>).budgetLevel ? String((input.tripSnapshot as Record<string, unknown>).budgetLevel) : null,
        travelParty: (input.tripSnapshot as Record<string, unknown>).travelParty ? String((input.tripSnapshot as Record<string, unknown>).travelParty) : null,
        dates: (input.tripSnapshot as Record<string, unknown>).dates ? String((input.tripSnapshot as Record<string, unknown>).dates) : null,
      }
    : null;

  const tripStatePatch = input.tripStatePatch && typeof input.tripStatePatch === "object"
    ? {
        stage: (input.tripStatePatch as Record<string, unknown>).stage ? String((input.tripStatePatch as Record<string, unknown>).stage) as ChatStage : undefined,
        origin: (input.tripStatePatch as Record<string, unknown>).origin ? String((input.tripStatePatch as Record<string, unknown>).origin) : null,
        destinationCandidates: Array.isArray((input.tripStatePatch as Record<string, unknown>).destinationCandidates)
          ? ((input.tripStatePatch as Record<string, unknown>).destinationCandidates as unknown[]).map((item) => String(item))
          : undefined,
        budgetLevel: (input.tripStatePatch as Record<string, unknown>).budgetLevel ? String((input.tripStatePatch as Record<string, unknown>).budgetLevel) : null,
        travelParty: (input.tripStatePatch as Record<string, unknown>).travelParty ? String((input.tripStatePatch as Record<string, unknown>).travelParty) : null,
        dates: (input.tripStatePatch as Record<string, unknown>).dates ? String((input.tripStatePatch as Record<string, unknown>).dates) : null,
        interests: Array.isArray((input.tripStatePatch as Record<string, unknown>).interests)
          ? ((input.tripStatePatch as Record<string, unknown>).interests as unknown[]).map((item) => String(item))
          : undefined,
        constraints: Array.isArray((input.tripStatePatch as Record<string, unknown>).constraints)
          ? ((input.tripStatePatch as Record<string, unknown>).constraints as unknown[]).map((item) => String(item))
          : undefined,
        selectedProductIds: Array.isArray((input.tripStatePatch as Record<string, unknown>).selectedProductIds)
          ? ((input.tripStatePatch as Record<string, unknown>).selectedProductIds as unknown[]).map((item) => String(item))
          : undefined,
      }
    : {};

  const cta = input.cta && typeof input.cta === "object"
    ? {
        label: String((input.cta as Record<string, unknown>).label ?? "Continuar"),
        action: String((input.cta as Record<string, unknown>).action ?? "continue"),
      }
    : null;

  const rawMessageType = String(input.messageType ?? "text");
  const messageType = rawMessageType === "catalog_cards" || rawMessageType === "comparison" || rawMessageType === "trip_snapshot"
    ? rawMessageType
    : "text";

  return {
    message: String(input.message ?? ""),
    messageType,
    quickReplies,
    catalogCards,
    comparisonItems,
    tripSnapshot,
    tripStatePatch,
    cta,
  };
}
