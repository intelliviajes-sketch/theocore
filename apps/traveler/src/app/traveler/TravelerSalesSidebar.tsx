"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  Compass,
  Globe2,
  MapPinned,
  ShoppingCart,
  Sparkles,
  Wallet,
  Share2,
  Users,
  Check,
} from "lucide-react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog/travelers";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";
import { trackTravelerEvent } from "@/lib/traveler/tracking";
import { ShareTicketModal } from "./ShareTicketModal";
import { TuCerebroViajesModal } from "./TuCerebroViajesModal";

const PRICE_KEYS = ["price", "precio", "amount", "total", "base_price", "price_from"];

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readOfferPrice(offer: CatalogProduct) {
  for (const key of PRICE_KEYS) {
    const value = offer.data?.[key];
    const parsed = parseNumber(value);
    if (parsed !== null) return parsed;
  }
  return 0;
}

function formatMoney(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toFixed(0)} ${currencyCode}`;
  }
}

function sourceBadge(product: CatalogProduct) {
  if (product.monetizationTier === "own") {
    return { label: "Propio", classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" };
  }
  if (product.monetizationTier === "adapted") {
    return { label: "Adaptado", classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-100" };
  }
  return { label: "Patrocinado", classes: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" };
}

function AnimatedMoney({ value, currencyCode }: { value: number; currencyCode: string }) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => formatMoney(current, currencyCode));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display as any}</motion.span>;
}

export default function TravelerSalesSidebar({
  mode,
  offers,
  planningProgress,
  currencyCode = "EUR",
}: {
  mode: "chat" | "planning";
  offers: CatalogProduct[];
  planningProgress?: { completed: number; total: number };
  currencyCode?: string;
  brandName?: string;
}) {
  const router = useRouter();
  const {
    insight,
    journeyState,
    selectJourneyProduct,
    createJourneyQuote,
    setJourneyReservationStatus,
  } = useTravelerWorkspace();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCerebroModalOpen, setIsCerebroModalOpen] = useState(false);

  const recommendedOffers = useMemo(() => {
    const prioritized = insight.recommendedProductIds
      .map((id) => offers.find((offer) => offer.id === id))
      .filter((offer): offer is CatalogProduct => Boolean(offer));
    if (prioritized.length > 0) return prioritized.slice(0, 4);
    return offers.slice(0, 4);
  }, [insight.recommendedProductIds, offers]);

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.id === journeyState.selectedProductId) ?? recommendedOffers[0] ?? null,
    [offers, journeyState.selectedProductId, recommendedOffers],
  );

  const { setNodeRef, isOver } = useDroppable({
    id: "board-droppable",
  });

  const displayOffers = Array.from(
    new Map([...journeyState.boardItems, ...recommendedOffers].map((o) => [o.id, o])).values()
  );

  const destination = selectedOffer?.destination || null;
  const mapUrl = destination ? `https://www.google.com/maps?q=${encodeURIComponent(destination)}` : null;
  const mapEmbedUrl = destination
    ? `https://www.google.com/maps?q=${encodeURIComponent(destination)}&output=embed`
    : null;

  function handleFocusOffer(offer: CatalogProduct) {
    selectJourneyProduct(offer);
    trackTravelerEvent("select_product", {
      productId: offer.id,
      title: offer.title,
      source: `${mode}-inspiration`,
    });
    router.push(`/traveler/chat?product=${offer.id}`);
  }

  function handleCreateQuote() {
    if (!selectedOffer) return;
    createJourneyQuote({
      currencyCode,
      items: [
        {
          productId: selectedOffer.id,
          title: selectedOffer.title,
          price: readOfferPrice(selectedOffer),
        },
      ],
    });
  }

  const stages = [
    { id: "explore", label: "Explorar" },
    { id: "design", label: "Diseñar" },
    { id: "decide", label: "Cotizar" },
    { id: "booked", label: "Compra" },
  ];
  const currentStageIndex = stages.findIndex(s => s.id === journeyState.activeStage) >= 0 
    ? stages.findIndex(s => s.id === journeyState.activeStage) 
    : 0;

  return (
    <div className="trav-reveal flex flex-col gap-4 pb-12 xl:pb-6">
      {/* 👥 Multiplayer Collaboration Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex -space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-amber-400 to-amber-600 text-[11px] font-bold text-white shadow-sm ring-1 ring-slate-900/5">
            TU
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-slate-500 shadow-sm ring-1 ring-slate-900/5 transition-colors">
            <Users className="h-3.5 w-3.5" />
          </div>
          {/* Agent Avatar mockup (animates in when needed or just shows offline) */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm ring-1 ring-slate-900/5 relative">
            <span className="text-[11px] font-bold text-white">SO</span>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" title="Agente Online" />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>
          <p className="text-xs font-semibold text-slate-700">Viaje a Italia 2026</p>
        </div>
      </div>

      {/* 📍 Journey Progression Gage */}
      <div className="trav-panel trav-glass rounded-[2rem] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Progreso del Viaje</p>
          <span className="text-xs font-bold text-amber-600">{Math.round(((currentStageIndex + 1) / stages.length) * 100)}%</span>
        </div>
        <div className="relative mt-4 flex justify-between">
          <div className="absolute top-1/2 left-0 h-1 w-full -translate-y-1/2 rounded-full bg-slate-200/60" />
          <div 
            className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-amber-400 transition-all duration-700 ease-out" 
            style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
          />
          {stages.map((stage, i) => {
            const isCompleted = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-500 bg-white",
                  isCompleted ? "border-amber-500 bg-amber-500 text-white" : 
                  isCurrent ? "border-amber-400 ring-4 ring-amber-100/50" : "border-slate-200 text-transparent"
                )}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : <div className={cn("h-1.5 w-1.5 rounded-full", isCurrent ? "bg-amber-500" : "bg-slate-200")} />}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider transition-colors",
                  isCurrent ? "text-amber-700" : isCompleted ? "text-slate-600" : "text-slate-400"
                )}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🚀 AI Insight Widget */}
      <section 
        onClick={() => setIsCerebroModalOpen(true)}
        className="col-span-1 rounded-3xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-amber-300 transition-all active:scale-[0.98]"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200/60 shadow-inner">
               <Sparkles className="h-3.5 w-3.5 text-amber-800" />
            </div>
            <h3 className="text-sm font-bold text-amber-900">Analítica Activa</h3>
          </div>
          <span className="rounded-full bg-white/60 px-2.5 py-1 text-[10px] uppercase font-bold text-amber-800 border border-amber-200 shadow-sm">
            Fase: {journeyState.activeStage}
          </span>
        </div>
        <p className="mt-3 text-[13px] font-medium text-amber-800/80 leading-relaxed">
          Intención detectada: <strong className="text-amber-900">{insight.intent}</strong>. 
          {insight.summary ? ` ${insight.summary}` : " Analizando tu conversación para predecir tus preferencias."}
        </p>
      </section>

      {/* 💰 Presupuesto y Cotizador Animado */}
      <section className="trav-panel trav-glass rounded-[2rem] p-6 transition-all duration-300">
        <div className="flex items-center justify-between">
           <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cotización</p>
           <Wallet className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-3">
          <p className="text-[2.2rem] font-black tracking-tight text-slate-900">
             <AnimatedMoney 
               value={selectedOffer ? readOfferPrice(selectedOffer) : 0} 
               currencyCode={currencyCode} 
             />
          </p>
          <p className="text-sm font-medium text-slate-500 mt-1">Estimación en tiempo real</p>
        </div>
        
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleCreateQuote}
            disabled={!selectedOffer}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-[13px] font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          >
            <ShoppingCart className="h-4 w-4" />
            Formalizar Cotización
          </button>

          {selectedOffer && (
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-100 px-4 py-3.5 text-[13px] font-bold text-amber-900 shadow-sm transition-all hover:bg-amber-200 active:scale-[0.98]"
            >
              <Share2 className="h-4 w-4" />
              Compartir Ticket
            </button>
          )}

          {journeyState.reservation ? (
            <button
              type="button"
              onClick={() => {
                confetti({
                  particleCount: 150,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444']
                });
                setJourneyReservationStatus("confirmed");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 text-[13px] font-bold text-white shadow-xl shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-[0.98]"
            >
              <BadgeDollarSign className="h-4 w-4" />
              Pagar y Confirmar
            </button>
          ) : null}
        </div>
      </section>

      {/* 🗺️ Mapa Expandible */}
      <section className="trav-panel trav-glass rounded-[2rem] p-6 transition-all duration-300 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Destino Actual</p>
          <MapPinned className="h-4 w-4 text-slate-400" />
        </div>
        {destination ? (
          <div className="relative group">
            <h4 className="text-lg font-bold text-slate-900 absolute top-3 left-3 z-10 drop-shadow-md bg-white/70 backdrop-blur-md px-3 py-1 rounded-lg">{destination}</h4>
            <div className="h-48 w-full overflow-hidden rounded-2xl border border-slate-200">
              {mapEmbedUrl ? (
                <iframe
                  title="Mapa de destino"
                  src={mapEmbedUrl}
                  className="h-full w-full pointer-events-none group-hover:pointer-events-auto transition-opacity"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="bg-slate-100 h-full w-full" />
              )}
            </div>
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl border border-slate-200/50 bg-white/90 backdrop-blur-md px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-white transition-all"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Abrir Maps
              </a>
            ) : null}
          </div>
        ) : (
          <div className="h-32 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center">
            <p className="text-xs font-medium text-slate-400 px-4 text-center">La IA deducirá el destino de la charla</p>
          </div>
        )}
      </section>

      {/* ✨ Pizarrón de Ideas (Grid) */}
      <section 
        ref={setNodeRef}
        className={cn(
          "trav-panel trav-glass rounded-[2rem] p-6 transition-all duration-300",
          isOver && "ring-2 ring-amber-400 bg-amber-50/40 shadow-xl shadow-amber-500/10 scale-[1.01]"
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pizarrón Mágico</p>
          <Compass className="h-4 w-4 text-slate-400" />
        </div>
        
        {displayOffers.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {displayOffers.map((offer) => {
              const tag = sourceBadge(offer);
              const isSaved = journeyState.boardItems.some((b: any) => b.id === offer.id);
              return (
                <article key={offer.id} className="group flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/60 p-3 hover:bg-white hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/50 transition-all cursor-pointer" onClick={() => handleFocusOffer(offer)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="line-clamp-1 text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{offer.title}</p>
                        {isSaved && <span className="flex h-2 w-2 rounded-full bg-amber-400" title="Guardado manualmente" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 mt-0.5 block">{formatMoney(readOfferPrice(offer), currencyCode)}</span>
                    </div>
                    <span className={`shrink-0 inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold shadow-sm ${tag.classes}`}>
                      {tag.label}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-amber-100/50 p-3 mb-3">
              <Compass className="h-6 w-6 text-amber-500/70" />
            </div>
            <p className="text-[13px] font-medium text-slate-600">
              Arrastra items aquí
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Guarda las sugerencias del chat en tu pizarrón.
            </p>
          </div>
        )}
      </section>

      <ShareTicketModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        offer={selectedOffer} 
        currencyCode={currencyCode} 
      />

      <TuCerebroViajesModal 
        isOpen={isCerebroModalOpen} 
        onClose={() => setIsCerebroModalOpen(false)} 
      />
    </div>
  );
}

