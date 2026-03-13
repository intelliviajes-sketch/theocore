import React, { FormEventHandler, MutableRefObject, useMemo, useState } from "react";
import { Loader2, SendHorizontal, X } from "lucide-react";
import { Brain, ChatMessage, UserLite, cn } from "./types-and-utils";
import type { CatalogProduct } from "@/lib/catalog/travelers";
import { useTravelerPreferences } from "../useTravelerPreferences";

interface ChatColumnProps {
  messages: ChatMessage[];
  input: string;
  sending: boolean;
  activeBrain: Brain | null;
  user: UserLite;
  centerRef: MutableRefObject<HTMLDivElement | null>;
  setInput: (value: string) => void;
  onSend: FormEventHandler<HTMLFormElement>;
  offers?: CatalogProduct[];
  onSelectOffer?: (offer: CatalogProduct) => void;
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const bold = part.slice(2, -2);
      return <strong key={`${bold}-${index}`}>{bold}</strong>;
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

function renderAssistantMessage(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={`sp-${index}`} className="h-1" />;
        }
        if (line === "---") {
          return <hr key={`hr-${index}`} className="my-2 border-slate-300" />;
        }
        if (line.startsWith("### ")) {
          return (
            <h4 key={`h4-${index}`} className="text-sm font-semibold text-slate-900">
              {renderInlineMarkdown(line.replace(/^###\s+/, ""))}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={`h3-${index}`} className="text-base font-semibold text-slate-900">
              {renderInlineMarkdown(line.replace(/^##\s+/, ""))}
            </h3>
          );
        }
        if (/^\d+\.\s+/.test(line)) {
          return (
            <p key={`ol-${index}`} className="pl-1 text-slate-800">
              <span className="font-semibold text-slate-900">
                {line.match(/^\d+\./)?.[0]}{" "}
              </span>
              {renderInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}
            </p>
          );
        }
        if (/^(?:[-*]|\u2022)\s+/.test(line)) {
          return (
            <p key={`ul-${index}`} className="pl-1 text-slate-800">
              <span className="mr-1 font-semibold text-slate-900">-</span>
              {renderInlineMarkdown(line.replace(/^(?:[-*]|\u2022)\s+/, ""))}
            </p>
          );
        }
        return (
          <p key={`p-${index}`} className="text-slate-800">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

function readOfferPrice(offer: CatalogProduct) {
  const keys = ["price", "precio", "amount", "total", "base_price", "price_from"];
  for (const key of keys) {
    const value = offer.data?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const normalized = Number(value.replace(",", ".").replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(normalized)) return normalized;
    }
  }
  return null;
}

function formatMoney(value: number | null) {
  if (value === null) return "Consultar";
  return `EUR ${Math.round(value)}`;
}

type OfferTier = "own" | "adapted" | "sponsored";
type OfferTab = "overview" | "itinerary" | "costs" | "conditions";
const QUICK_PROMPTS = [
  "Quiero un plan de 3 dias en Madrid con presupuesto medio.",
  "Busco una escapada romantica para fin de semana.",
  "Comparame 3 opciones para viajar con mi familia.",
];

function offerTierPriority(tier: OfferTier) {
  if (tier === "own") return 0;
  if (tier === "adapted") return 1;
  return 2;
}

function resolveOfferTier(offer: CatalogProduct): OfferTier {
  return offer.monetizationTier || "own";
}

function offerTag(offer: CatalogProduct) {
  const tier = resolveOfferTier(offer);
  if (tier === "own") {
    return { label: "Propio", classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" };
  }
  if (tier === "adapted") {
    return { label: "Adaptado", classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-100" };
  }
  return { label: "Patrocinado", classes: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" };
}

function offerCoverClass(offer: CatalogProduct) {
  const tier = resolveOfferTier(offer);
  if (tier === "own") return "from-[#fbbf24] to-[#f59e0b]";
  if (tier === "adapted") return "from-[#facc15] to-[#f59e0b]";
  return "from-[#64748b] to-[#334155]";
}

function normalizeLines(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const entry = item as Record<string, unknown>;
          const title = ["title", "name", "day", "label", "step"].find(
            (key) => typeof entry[key] === "string" && String(entry[key]).trim(),
          );
          const description = ["description", "summary", "details", "content", "value"].find(
            (key) => typeof entry[key] === "string" && String(entry[key]).trim(),
          );
          if (title && description) {
            return `${entry[title]}: ${entry[description]}`;
          }
          if (title) return String(entry[title]).trim();
        }
        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n|;|\|/)
      .map((item) => item.replace(/^(?:[-*\u2022]\s+|\d+\.\s+)/, "").trim())
      .filter(Boolean);
  }

  return [] as string[];
}

function pickLines(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const items = normalizeLines(data[key]);
    if (items.length > 0) return items;
  }
  return [] as string[];
}

function pickText(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readTabData(offer: CatalogProduct) {
  const itinerary = pickLines(offer.data, ["itinerary", "plan", "schedule", "program", "agenda", "days"]);
  const included = pickLines(offer.data, ["included", "includes", "include", "what_includes"]);
  const excluded = pickLines(offer.data, ["excluded", "not_included", "excludes"]);
  const conditions = [
    pickText(offer.data, ["cancellation_policy", "cancellation", "politica_cancelacion"]),
    pickText(offer.data, ["booking_policy", "terms", "condiciones"]),
    pickText(offer.data, ["requirements", "requisitos"]),
    pickText(offer.data, ["notes", "important_notes"]),
  ].filter((item): item is string => Boolean(item));
  const currency =
    pickText(offer.data, ["currency", "currency_code"]) ||
    pickText(offer.data, ["moneda"]) ||
    "EUR";

  return {
    itinerary,
    included,
    excluded,
    conditions,
    currency,
  };
}

function rankOffers(offers: CatalogProduct[]) {
  return [...offers].sort((a, b) => {
    const tierOrder = offerTierPriority(resolveOfferTier(a)) - offerTierPriority(resolveOfferTier(b));
    if (tierOrder !== 0) return tierOrder;

    const aPrice = readOfferPrice(a);
    const bPrice = readOfferPrice(b);
    if (aPrice !== null && bPrice !== null && aPrice !== bPrice) {
      return aPrice - bPrice;
    }
    if (aPrice !== null && bPrice === null) return -1;
    if (aPrice === null && bPrice !== null) return 1;

    return b.createdAt.localeCompare(a.createdAt);
  });
}

function AssistantTypingSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3.5 w-4/5 animate-pulse rounded-md bg-slate-200" />
      <div className="h-3.5 w-3/5 animate-pulse rounded-md bg-slate-200" />
      <div className="h-3.5 w-2/3 animate-pulse rounded-md bg-slate-200" />
    </div>
  );
}

export default function ChatColumn({
  messages,
  input,
  sending,
  activeBrain,
  user,
  centerRef,
  setInput,
  onSend,
  offers = [],
  onSelectOffer,
}: ChatColumnProps) {
  const [openOffer, setOpenOffer] = useState<CatalogProduct | null>(null);
  const [openOfferTab, setOpenOfferTab] = useState<OfferTab>("overview");
  const { compactMode } = useTravelerPreferences();

  const lastAssistantIndex = useMemo(() => {
    let index = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant" && messages[i].content.trim().length > 0) {
        index = i;
        break;
      }
    }
    return index;
  }, [messages]);

  const topOffers = useMemo(() => rankOffers(offers).slice(0, 3), [offers]);
  const openOfferData = useMemo(() => (openOffer ? readTabData(openOffer) : null), [openOffer]);
  const compactCards = compactMode;
  const cardsGridClass = "mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="trav-panel trav-glass trav-reveal flex h-[clamp(320px,calc(100dvh-17rem),780px)] w-full flex-col overflow-hidden rounded-3xl transition-shadow duration-300 focus-within:shadow-[0_22px_48px_-38px_rgba(15,23,42,0.38)] sm:h-[clamp(380px,calc(100dvh-15.5rem),820px)] lg:h-[calc(100dvh-13.75rem)]">
      <div className="border-b border-amber-100/70 bg-white/62 px-4 py-3 backdrop-blur-lg sm:px-5 sm:py-4">
        <p className="text-xs text-slate-500">Sandbox de conversación</p>
        <p className="mt-1 text-sm font-medium text-slate-800">
          {activeBrain ? `Brain activo: ${activeBrain.name}` : "Modo general IVI"}
        </p>
      </div>

      <div ref={centerRef} className="flex-1 space-y-4 overflow-auto overscroll-contain p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="trav-glass-soft w-full max-w-2xl rounded-2xl p-5 text-center sm:p-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-300 to-amber-500 text-sm font-semibold text-slate-900 ring-1 ring-amber-200/80 sm:h-20 sm:w-20 sm:text-base">
                AI
              </div>
              <p className="text-sm text-slate-500">
                {activeBrain
                  ? `Iniciando tu experiencia personalizada con ${activeBrain.name}...`
                  : "Iniciando tu experiencia con IVI..."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-full border border-amber-100 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-amber-200 hover:bg-amber-50/60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={message.ts + "_" + index}
                className={cn("space-y-3", message.role === "user" ? "items-end" : "items-start")}
              >
                <div className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      compactMode
                        ? "max-w-[95%] rounded-2xl px-3 py-2.5 sm:max-w-[86%] sm:px-4"
                        : "max-w-[95%] rounded-2xl px-4 py-3 sm:max-w-[86%] sm:px-5",
                      "transition-all duration-200",
                      message.role === "assistant"
                        ? "trav-glass-soft border border-slate-200/85 text-slate-800 hover:border-amber-200"
                        : message.role === "user"
                          ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow-sm"
                          : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {message.role === "assistant" ? (
                      message.content.trim().length > 0 ? renderAssistantMessage(message.content) : <AssistantTypingSkeleton />
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>

                {message.role === "assistant" && index === lastAssistantIndex && topOffers.length > 0 ? (
                  <div className="trav-glass-soft rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-700">
                      Opciones sugeridas
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Selecciona una opcion para continuar con IVI.
                    </p>
                    <div className={cardsGridClass}>
                      {topOffers.map((offer) => {
                        const tag = offerTag(offer);
                        const price = readOfferPrice(offer);
                        return (
                          <div
                            key={`offer-card-${offer.id}`}
                            className="trav-hover-card trav-glass-soft overflow-hidden rounded-xl"
                          >
                            {offer.coverImage ? (
                              <img
                                src={offer.coverImage}
                                alt={offer.title}
                                className={compactCards ? "h-20 w-full object-cover" : "h-24 w-full object-cover"}
                              />
                            ) : (
                              <div
                                className={`${compactCards ? "h-20 p-2.5" : "h-24 p-3"} w-full bg-gradient-to-br ${offerCoverClass(offer)}`}
                              >
                                <p className="text-xs font-semibold text-white/90">
                                  {tag.label}
                                </p>
                                <p className={compactCards ? "mt-1 text-xs font-semibold text-white" : "mt-2 text-sm font-semibold text-white"}>
                                  {offer.productTypeName || "Experiencia"}
                                </p>
                              </div>
                            )}
                            <div className={compactCards ? "p-2.5" : "p-3"}>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${tag.classes}`}
                              >
                                {tag.label}
                              </span>
                              <p className={compactCards ? "mt-1 line-clamp-2 text-xs font-semibold text-slate-900" : "mt-2 line-clamp-2 text-sm font-semibold text-slate-900"}>
                                {offer.title}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                                {offer.summary}
                              </p>
                              <div className={compactCards ? "mt-2 flex items-center justify-between gap-2" : "mt-3 flex items-center justify-between gap-2"}>
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatMoney(price)}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenOffer(offer);
                                      setOpenOfferTab("overview");
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    Ver mas
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onSelectOffer?.(offer)}
                                    className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 transition-all hover:from-amber-300 hover:to-amber-500 active:scale-[0.98]"
                                  >
                                    Quiero esta opcion
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-amber-100/70 bg-white/72 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-lg sm:p-5">
        <form onSubmit={onSend} className="flex items-center gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={user.language === "en" ? "Type your message..." : "Escribe tu mensaje..."}
            className="flex-1 rounded-2xl border border-slate-200/90 bg-white/86 px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100 sm:px-5 sm:py-4"
          />
          <button
            type="submit"
            disabled={sending || input.trim().length === 0}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 transition-all hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] disabled:opacity-50 sm:h-14 sm:w-14"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
            ) : (
              <SendHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </form>
      </div>

      {openOffer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="Cerrar modal"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[5px]"
            onClick={() => setOpenOffer(null)}
          />
          <div className="trav-panel trav-glass relative z-10 flex h-[min(88vh,780px)] w-[min(920px,96vw)] flex-col overflow-hidden rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-100/70 bg-white/70 px-4 py-3 backdrop-blur-lg sm:px-5 sm:py-4">
              <div>
                <p className="text-xs text-slate-500">Detalle de opción</p>
                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{openOffer.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenOffer(null)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-amber-200 hover:bg-amber-50/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-amber-100/70 bg-white/58 px-4 py-2.5 backdrop-blur-lg sm:px-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOpenOfferTab("overview")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold",
                    openOfferTab === "overview"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900"
                      : "bg-white/85 text-slate-600 hover:bg-amber-50/80",
                  )}
                >
                  Resumen
                </button>
                <button
                  type="button"
                  onClick={() => setOpenOfferTab("itinerary")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold",
                    openOfferTab === "itinerary"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900"
                      : "bg-white/85 text-slate-600 hover:bg-amber-50/80",
                  )}
                >
                  Itinerario
                </button>
                <button
                  type="button"
                  onClick={() => setOpenOfferTab("costs")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold",
                    openOfferTab === "costs"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900"
                      : "bg-white/85 text-slate-600 hover:bg-amber-50/80",
                  )}
                >
                  Costos
                </button>
                <button
                  type="button"
                  onClick={() => setOpenOfferTab("conditions")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold",
                    openOfferTab === "conditions"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900"
                      : "bg-white/85 text-slate-600 hover:bg-amber-50/80",
                  )}
                >
                  Condiciones
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {openOffer.coverImage ? (
                <img
                  src={openOffer.coverImage}
                  alt={openOffer.title}
                  className="h-52 w-full rounded-xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-52 w-full items-center justify-center rounded-xl border border-amber-100 bg-gradient-to-br from-amber-300 to-amber-500">
                  <p className="text-lg font-semibold text-slate-900">
                    {openOffer.productTypeName || "Experiencia recomendada"}
                  </p>
                </div>
              )}

              {openOfferTab === "overview" ? (
                <div className="trav-glass-soft mt-4 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Resumen</p>
                  <p className="mt-2 text-sm text-slate-700">{openOffer.summary}</p>
                  {openOffer.destination ? (
                    <p className="mt-3 text-xs font-medium text-slate-600">
                      Destino: {openOffer.destination}
                    </p>
                  ) : null}
                  {openOffer.tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {openOffer.tags.slice(0, 6).map((tag) => (
                        <span
                          key={`${openOffer.id}-${tag}`}
                          className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {openOfferTab === "itinerary" ? (
                <div className="trav-glass-soft mt-4 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Itinerario</p>
                  {openOfferData && openOfferData.itinerary.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {openOfferData.itinerary.slice(0, 12).map((line, index) => (
                        <div
                          key={`${openOffer.id}-it-${index}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      Esta opcion no tiene itinerario detallado cargado todavia.
                    </p>
                  )}
                </div>
              ) : null}

              {openOfferTab === "costs" ? (
                <div className="trav-glass-soft mt-4 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Costos</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Precio estimado: {formatMoney(readOfferPrice(openOffer))}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Incluye
                      </p>
                      {openOfferData && openOfferData.included.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {openOfferData.included.slice(0, 6).map((line, index) => (
                            <li key={`${openOffer.id}-inc-${index}`} className="text-xs text-slate-700">
                              - {line}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Sin detalle de inclusiones.</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        No incluye
                      </p>
                      {openOfferData && openOfferData.excluded.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {openOfferData.excluded.slice(0, 6).map((line, index) => (
                            <li key={`${openOffer.id}-exc-${index}`} className="text-xs text-slate-700">
                              - {line}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Sin exclusiones informadas.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {openOfferTab === "conditions" ? (
                <div className="trav-glass-soft mt-4 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Condiciones</p>
                  {openOfferData && openOfferData.conditions.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {openOfferData.conditions.slice(0, 8).map((line, index) => (
                        <div
                          key={`${openOffer.id}-cond-${index}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      No hay terminos cargados para esta opcion.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
            <div className="border-t border-amber-100/70 bg-white/62 px-4 py-3 backdrop-blur-lg sm:px-5 sm:py-4">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenOffer(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-amber-200 hover:bg-amber-50/70"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectOffer?.(openOffer);
                    setOpenOffer(null);
                  }}
                  className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:from-amber-300 hover:to-amber-500"
                >
                  Quiero esta opcion
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



