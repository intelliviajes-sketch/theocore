import type { CatalogProduct } from "@/lib/catalog/travelers";

export type IntentLevel = "low" | "medium" | "high";

export type CommercialInsight = {
  intent: IntentLevel;
  confidence: number;
  summary: string;
  nextActions: string[];
  recommendedProductIds: string[];
  updatedAt: number | null;
};

const HIGH_INTENT_TERMS = [
  "reservar",
  "compra",
  "comprar",
  "pagar",
  "precio final",
  "quiero viajar",
  "confirmar",
  "cotizacion",
  "tarjeta",
  "link de pago",
];

const MEDIUM_INTENT_TERMS = [
  "presupuesto",
  "oferta",
  "itinerario",
  "plan",
  "comparar",
  "disponible",
  "fecha",
  "recomienda",
  "hotel",
  "tour",
];

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function scoreIntent(text: string): { intent: IntentLevel; confidence: number } {
  const normalized = normalizeText(text);
  if (!normalized) return { intent: "low", confidence: 0.2 };

  const highMatches = HIGH_INTENT_TERMS.filter((term) =>
    normalized.includes(term),
  ).length;
  const mediumMatches = MEDIUM_INTENT_TERMS.filter((term) =>
    normalized.includes(term),
  ).length;

  if (highMatches >= 1 || mediumMatches >= 4) {
    return {
      intent: "high",
      confidence: Math.min(0.95, 0.6 + highMatches * 0.12 + mediumMatches * 0.06),
    };
  }
  if (mediumMatches >= 1) {
    return { intent: "medium", confidence: Math.min(0.82, 0.45 + mediumMatches * 0.1) };
  }
  return { intent: "low", confidence: 0.3 };
}

function detectRecommendedProducts(text: string, offers: CatalogProduct[]) {
  const normalized = normalizeText(text);
  const byMention = offers
    .filter((offer) =>
      normalizeText(offer.title)
        .split(" ")
        .some((token) => token.length > 3 && normalized.includes(token)),
    )
    .map((offer) => offer.id);

  if (byMention.length > 0) return Array.from(new Set(byMention)).slice(0, 4);
  return offers.slice(0, 3).map((offer) => offer.id);
}

function deriveNextActions(intent: IntentLevel, hasRecommendations: boolean) {
  if (intent === "high") {
    return [
      "Cerrar cotizacion con precio final y condiciones.",
      "Solicitar datos para pago y confirmacion.",
      "Activar soporte post-reserva en el mismo flujo.",
    ];
  }
  if (intent === "medium") {
    return [
      "Comparar 2-3 opciones por presupuesto y fecha.",
      hasRecommendations
        ? "Mover al usuario a planning con productos sugeridos."
        : "Generar recomendaciones concretas desde catalogo.",
      "Pedir fecha tentativa para avanzar a cotizacion.",
    ];
  }
  return [
    "Descubrir intereses: destino, fechas y estilo.",
    "Mostrar productos destacados del catalogo.",
    "Invitar a iniciar planning guiado.",
  ];
}

export function buildEmptyInsight(): CommercialInsight {
  return {
    intent: "low",
    confidence: 0.2,
    summary: "Aun no hay suficiente interaccion para estimar intencion comercial.",
    nextActions: ["Iniciar conversacion o planning para activar recomendaciones."],
    recommendedProductIds: [],
    updatedAt: null,
  };
}

export function deriveCommercialInsightFromText(
  text: string,
  offers: CatalogProduct[],
): CommercialInsight {
  const { intent, confidence } = scoreIntent(text);
  const recommendedProductIds = detectRecommendedProducts(text, offers);
  const nextActions = deriveNextActions(intent, recommendedProductIds.length > 0);

  const summary =
    intent === "high"
      ? "Intencion alta detectada: hay senales claras de cierre."
      : intent === "medium"
        ? "Intencion media: el usuario esta evaluando opciones con potencial de compra."
        : "Intencion inicial: fase de descubrimiento.";

  return {
    intent,
    confidence,
    summary,
    nextActions,
    recommendedProductIds,
    updatedAt: Date.now(),
  };
}
