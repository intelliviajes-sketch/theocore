import React, { FormEventHandler, MutableRefObject, useMemo, useState } from "react";
import { Loader2, SendHorizontal, X, Sparkles } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Brain, ChatMessage, UserLite, cn } from "./types-and-utils";
import type { CatalogProduct } from "@/lib/catalog/travelers";
import { useTravelerPreferences } from "../useTravelerPreferences";
import { useTravelerWorkspace } from "../TravelerWorkspaceContext";
import { normalizeAssistantOutput } from "@/lib/traveler/assistant-output";
import type { StructuredChatResponse } from "@/lib/chat/structured";

interface ChatColumnProps {
  messages: ChatMessage[];
  input: string;
  sending: boolean;
  user: UserLite;
  centerRef: MutableRefObject<HTMLDivElement | null>;
  setInput: (value: string) => void;
  onSend: FormEventHandler<HTMLFormElement>;
  offers?: CatalogProduct[];
  activeBrain: Brain | null;
  structuredByMessageTs?: Record<number, StructuredChatResponse>;
  onSelectOffer?: (offer: CatalogProduct) => void;
  onQuickReplySelect?: (value: string) => void;
  onStructuredCardSelect?: (cardId: string, cardTitle: string) => void;
  onStructuredCta?: (action: string, label: string) => void;
  showSuggestedOffers?: boolean;
  isLandingPromptFlow?: boolean;
  showLandingProcessing?: boolean;
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

function renderAssistantMessage(
  content: string, 
  offers: CatalogProduct[], 
  onSelectOffer?: (offer: CatalogProduct) => void
) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={`sp-${index}`} className="h-1" />;
        }
        
        // --- Generative UI Injections ---
        const offerMatch = line.match(/\[OFFER:([a-zA-Z0-9_-]+)\]/);
        if (offerMatch) {
          const offerId = offerMatch[1];
          const matchedOffer = offers.find(o => o.id === offerId);
          if (matchedOffer) {
            const price = readOfferPrice(matchedOffer);
            return (
              <div key={`offer-gen-${index}`} className="my-3 overflow-hidden rounded-xl border border-amber-200/60 bg-white/80 shadow-sm transition-all hover:shadow-md hover:border-amber-300 group">
                {matchedOffer.coverImage && (
                   <div className="h-24 w-full overflow-hidden">
                     <img src={matchedOffer.coverImage} alt={matchedOffer.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   </div>
                )}
                <div className="p-3">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-slate-900 leading-tight">{matchedOffer.title}</h4>
                    {price && <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs whitespace-nowrap">{formatMoney(price)}</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{matchedOffer.summary}</p>
                  <button 
                    onClick={() => onSelectOffer?.(matchedOffer)}
                    className="mt-3 w-full rounded-lg bg-slate-900 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            );
          }
        }
        
        if (line === "---") {
          return <hr key={`hr-${index}`} className="my-2 border-slate-300" />;
        }
        if (line.startsWith("### ")) {
          return (
            <h4 key={`h4-${index}`} className="text-sm font-semibold text-slate-900 mt-3">
              {renderInlineMarkdown(line.replace(/^###\s+/, ""))}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={`h3-${index}`} className="text-base font-semibold text-slate-900 mt-4 mb-1">
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

function AssistantMessageRenderer({ 
  content, 
  offers, 
  onSelectOffer 
}: { 
  content: string; 
  offers: CatalogProduct[]; 
  onSelectOffer?: (offer: CatalogProduct) => void;
}) {
  const normalizedContent = useMemo(() => normalizeAssistantOutput(content), [content]);
  const isLong = normalizedContent.length > 600;
  const [expanded, setExpanded] = useState(!isLong);
  return (
    <div className="relative">
      <div className={cn("overflow-hidden transition-all duration-500", expanded ? "max-h-[10000px]" : "max-h-[220px]")}>
         {renderAssistantMessage(normalizedContent, offers, onSelectOffer)}
      </div>
      {!expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-2 rounded-b-2xl">
          <button onClick={() => setExpanded(true)} className="rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-all active:scale-95 border border-slate-200">
            Modo TL;DR (Leer todo)
          </button>
        </div>
      )}
      {isLong && expanded && (
        <button onClick={() => setExpanded(false)} className="mt-3 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors">
           Mostrar menos
        </button>
      )}
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
    <div className="flex flex-col gap-3 py-1">
      <div className="flex items-center gap-2 text-amber-500">
        <Sparkles className="h-4 w-4 animate-[pulse_2s_ease-in-out_infinite]" />
        <span className="text-sm font-medium animate-[pulse_2.5s_ease-in-out_infinite] bg-gradient-to-r from-amber-500 to-amber-300 bg-clip-text text-transparent">
          IVI esta disenando tu experiencia...
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-amber-200/60 via-amber-100/30 to-transparent" />
        <div className="h-2 w-3/4 animate-[pulse_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-amber-200/60 via-amber-100/30 to-transparent" />
      </div>
    </div>
  );
}

function StructuredResponseBlocks({
  structured,
  offers,
  onQuickReplySelect,
  onStructuredCardSelect,
  onStructuredCta,
}: {
  structured: StructuredChatResponse;
  offers: CatalogProduct[];
  onQuickReplySelect?: (value: string) => void;
  onStructuredCardSelect?: (cardId: string, cardTitle: string) => void;
  onStructuredCta?: (action: string, label: string) => void;
}) {
  const hasQuickReplies = structured.quickReplies.length > 0;
  const hasCatalogCards = structured.catalogCards.length > 0;
  const hasComparison = structured.comparisonItems.length > 0;
  const hasSnapshot = Boolean(structured.tripSnapshot?.summary);
  const hasCta = Boolean(structured.cta);

  if (!hasQuickReplies && !hasCatalogCards && !hasComparison && !hasSnapshot && !hasCta) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {hasSnapshot ? (
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/85 to-orange-50/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">Resumen del viaje</p>
          <p className="mt-1 text-xs text-slate-700">{structured.tripSnapshot?.summary}</p>
        </div>
      ) : null}

      {hasCatalogCards ? (
        <div className="grid gap-2">
          {structured.catalogCards.slice(0, 4).map((card) => {
            const linkedOffer = offers.find((offer) => offer.id === card.id) || null;
            const linkedPrice = linkedOffer ? readOfferPrice(linkedOffer) : null;
            return (
              <button
                key={`structured-card-${card.id}`}
                type="button"
                onClick={() => onStructuredCardSelect?.(card.id, card.title)}
                className="group w-full rounded-2xl border border-slate-200 bg-white/90 p-3 text-left transition-all hover:-translate-y-[1px] hover:border-amber-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-amber-700">{card.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{card.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(card.tags || []).slice(0, 3).map((tag) => (
                        <span key={`${card.id}-${tag}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {card.destination || linkedOffer?.destination || "Destino"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {linkedPrice !== null ? formatMoney(linkedPrice) : "Consultar"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {hasComparison ? (
        <div className="grid gap-2 md:grid-cols-2">
          {structured.comparisonItems.slice(0, 4).map((item) => (
            <div key={`comparison-${item.id}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold text-slate-900">{item.title}</p>
              {item.subtitle ? <p className="mt-1 text-[11px] text-slate-600">{item.subtitle}</p> : null}
              {item.highlights.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {item.highlights.slice(0, 3).map((line, index) => (
                    <li key={`${item.id}-h-${index}`} className="text-[11px] text-slate-700">
                      - {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {hasQuickReplies ? (
        <div className="flex flex-wrap gap-2">
          {structured.quickReplies.slice(0, 4).map((item) => (
            <button
              key={`quick-reply-${item.id}`}
              type="button"
              onClick={() => onQuickReplySelect?.(item.value)}
              className="rounded-full border border-amber-200 bg-amber-50/85 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {hasCta ? (
        <button
          type="button"
          onClick={() => onStructuredCta?.(structured.cta?.action || "continue", structured.cta?.label || "Continuar")}
          className="w-full rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:from-slate-800 hover:to-slate-700"
        >
          {structured.cta?.label || "Continuar"}
        </button>
      ) : null}
    </div>
  );
}

function DraggableOfferCard({ offer, children }: { offer: CatalogProduct, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `draggable-offer-${offer.id}`,
    data: { offer },
  });
  
  const { addBoardItem } = useTravelerWorkspace();
  const [swipedStatus, setSwipedStatus] = useState<"saved" | "dismissed" | null>(null);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 0, 150], [-10, 0, 10]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const saveStampOpacity = useTransform(x, [20, 100], [0, 1]);
  const dismissStampOpacity = useTransform(x, [-20, -100], [0, 1]);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  if (swipedStatus) return null;

  return (
    <motion.div
      ref={setNodeRef}
      style={{ ...style, x, rotate, opacity }}
      {...listeners}
      {...attributes}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(e, { offset }) => {
        if (offset.x > 100) {
          addBoardItem(offer);
          setSwipedStatus("saved");
        } else if (offset.x < -100) {
          setSwipedStatus("dismissed");
        }
      }}
      className={cn("trav-hover-card trav-glass-soft overflow-hidden rounded-xl cursor-grab active:cursor-grabbing relative touch-pan-y", isDragging ? "shadow-2xl ring-2 ring-amber-400 scale-[1.02]" : "")}
    >
      <motion.div 
        style={{ opacity: saveStampOpacity }}
        className="absolute top-4 left-4 z-20 rotate-[-15deg] rounded-lg border-[3px] border-emerald-500 bg-emerald-500/10 px-3 py-1 scale-110 shadow-sm backdrop-blur-sm pointer-events-none"
      >
        <span className="text-lg font-bold tracking-widest text-emerald-600 drop-shadow-sm">GUARDAR</span>
      </motion.div>
      <motion.div 
        style={{ opacity: dismissStampOpacity }}
        className="absolute top-4 right-4 z-20 rotate-[15deg] rounded-lg border-[3px] border-red-500 bg-red-500/10 px-3 py-1 scale-110 shadow-sm backdrop-blur-sm pointer-events-none"
      >
        <span className="text-lg font-bold tracking-widest text-red-600 drop-shadow-sm">PASO</span>
      </motion.div>
      
      {children}
    </motion.div>
  );
}

export default function ChatColumn({
  messages,
  input,
  sending,
  user,
  centerRef,
  setInput,
  onSend,
  offers = [],
  activeBrain,
  structuredByMessageTs = {},
  onSelectOffer,
  onQuickReplySelect,
  onStructuredCardSelect,
  onStructuredCta,
  showSuggestedOffers = true,
  isLandingPromptFlow = false,
  showLandingProcessing = true,
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
  const brainLabel = activeBrain?.name || "Traveler Brain";
  const emptyStateMessage = isLandingPromptFlow && showLandingProcessing
    ? "Procesando tu mensaje..."
    : "";

  return (
    <div className="trav-panel trav-glass trav-reveal flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl transition-shadow duration-300 focus-within:shadow-[0_22px_48px_-38px_rgba(15,23,42,0.38)]">
      <div className="relative border-b border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Asistente activo</p>
            <p className="line-clamp-1 text-sm font-semibold text-slate-900">{brainLabel}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600">
            <span className={cn("h-2 w-2 rounded-full", sending ? "animate-pulse bg-amber-400" : "bg-emerald-400")} />
            {sending ? "Pensando..." : "Acompanando"}
          </div>
        </div>
      </div>
      <div ref={centerRef} className="relative flex-1 min-h-0 space-y-3 overflow-auto overscroll-contain p-3 sm:p-5 scroll-smooth">
        {messages.length === 0 ? (
          emptyStateMessage ? (
            <div className="grid h-full place-items-start pt-2">
              <p className="text-sm font-medium text-slate-500">{emptyStateMessage}</p>
            </div>
          ) : null
        ) : (
          <>
            {messages.map((message, index) => {
              const structured = message.role === "assistant" ? structuredByMessageTs[message.ts] : undefined;
              const hasStructuredBlocks = Boolean(
                structured
                && (
                  structured.quickReplies.length > 0
                  || structured.catalogCards.length > 0
                  || structured.comparisonItems.length > 0
                  || structured.tripSnapshot
                  || structured.cta
                ),
              );

              return (
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
                      message.content.trim().length > 0 ? (
                        <AssistantMessageRenderer 
                          content={message.content} 
                          offers={offers}
                          onSelectOffer={(offer) => {
                            setOpenOffer(offer);
                            setOpenOfferTab("overview");
                          }}
                        />
                      ) : <AssistantTypingSkeleton />
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>

                {message.role === "assistant" && structured ? (
                  <StructuredResponseBlocks
                    structured={structured}
                    offers={offers}
                    onQuickReplySelect={onQuickReplySelect}
                    onStructuredCardSelect={onStructuredCardSelect}
                    onStructuredCta={onStructuredCta}
                  />
                ) : null}

                {showSuggestedOffers && message.role === "assistant" && !hasStructuredBlocks && index === lastAssistantIndex && topOffers.length > 0 ? (
                  <div className="trav-glass-soft rounded-2xl p-4 w-full">
                    <p className="text-xs font-semibold text-slate-700">
                      Opciones sugeridas
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Selecciona una opcion para continuar con IVI.
                    </p>
                    <div className="mt-4 flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide gap-3 pb-3 md:grid md:grid-cols-2 xl:grid-cols-3 md:snap-none md:overflow-x-visible md:pb-0">
                      {topOffers.map((offer) => {
                        const tag = offerTag(offer);
                        const price = readOfferPrice(offer);
                        return (
                          <div key={`wrapper-${offer.id}`} className="shrink-0 w-[85%] snap-center md:w-auto md:shrink">
                            <DraggableOfferCard key={`offer-card-${offer.id}`} offer={offer}>
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
                                  <div className="flex gap-2 relative z-10" onPointerDown={(e) => e.stopPropagation()}>
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
                            </DraggableOfferCard>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
            })}
          </>
        )}
      </div>

      <div className="border-t border-slate-200/70 bg-white/60 px-3 py-3 backdrop-blur-md sm:px-5 sm:py-4">
        <div className="trav-glass-soft rounded-[2rem] p-1.5 pr-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-slate-200/50">
          <form onSubmit={onSend} className="flex items-center gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={user.language === "en" ? "Type your message..." : "Escribe tu mensaje..."}
              className="flex-1 bg-transparent px-5 py-4 text-[15px] outline-none placeholder:text-slate-400 text-slate-800"
            />
            <button
              type="submit"
              disabled={sending || input.trim().length === 0}
              className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SendHorizontal className="h-5 w-5 ml-[-2px]" />
              )}
            </button>
          </form>
        </div>
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
                <p className="text-xs text-slate-500">Detalle de opcion</p>
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
