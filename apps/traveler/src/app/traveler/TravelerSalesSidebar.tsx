"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Compass, Globe2, MapPinned } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog/travelers";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";
import { trackTravelerEvent } from "@/lib/traveler/tracking";

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

export default function TravelerSalesSidebar({
  mode,
  offers,
  currencyCode = "EUR",
  hideRecommendations = false,
}: {
  mode: "chat" | "planning";
  offers: CatalogProduct[];
  planningProgress?: { completed: number; total: number };
  currencyCode?: string;
  brandName?: string;
  hideRecommendations?: boolean;
}) {
  const router = useRouter();
  const { insight, journeyState, selectJourneyProduct } = useTravelerWorkspace();

  const recommendedOffers = useMemo(() => {
    if (hideRecommendations) return [] as CatalogProduct[];

    const prioritized = insight.recommendedProductIds
      .map((id) => offers.find((offer) => offer.id === id))
      .filter((offer): offer is CatalogProduct => Boolean(offer));

    if (prioritized.length > 0) return prioritized.slice(0, 4);
    return offers.slice(0, 4);
  }, [hideRecommendations, insight.recommendedProductIds, offers]);

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.id === journeyState.selectedProductId) ?? recommendedOffers[0] ?? null,
    [offers, journeyState.selectedProductId, recommendedOffers],
  );

  const displayOffers = useMemo(
    () => Array.from(new Map([...journeyState.boardItems, ...recommendedOffers].map((offer) => [offer.id, offer])).values()),
    [journeyState.boardItems, recommendedOffers],
  );

  const destination = selectedOffer?.destination || null;
  const mapUrl = destination ? `https://www.google.com/maps?q=${encodeURIComponent(destination)}` : null;
  const mapEmbedUrl = destination ? `${mapUrl}&output=embed` : null;

  const { setNodeRef, isOver } = useDroppable({ id: "board-droppable" });

  function handleFocusOffer(offer: CatalogProduct) {
    selectJourneyProduct(offer);
    trackTravelerEvent("select_product", {
      productId: offer.id,
      title: offer.title,
      source: `${mode}-board`,
    });
    router.push(`/traveler/chat?product=${offer.id}`);
  }

  return (
    <div className="trav-reveal overflow-hidden border border-slate-200/70 bg-white/70 pb-8 backdrop-blur-sm xl:pb-4">
      <section className="overflow-hidden px-4 py-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Destino actual</p>
          <MapPinned className="h-4 w-4 text-slate-400" />
        </div>

        {destination ? (
          <div className="relative group">
            <h4 className="absolute left-3 top-3 z-10 rounded-lg bg-white/75 px-3 py-1 text-sm font-bold text-slate-900 backdrop-blur-md">
              {destination}
            </h4>
            <div className="h-48 w-full overflow-hidden rounded-2xl border border-slate-200">
              {mapEmbedUrl ? (
                <iframe
                  title="Mapa de destino"
                  src={mapEmbedUrl}
                  className="h-full w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="h-full w-full bg-slate-100" />
              )}
            </div>
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-white"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Abrir Maps
              </a>
            ) : null}
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-300">
            <p className="px-4 text-center text-xs font-medium text-slate-400">
              Selecciona una oferta para fijar el destino.
            </p>
          </div>
        )}
      </section>

      <section
        ref={setNodeRef}
        className={cn(
          "border-t border-slate-200/70 px-4 py-5 transition-all duration-300",
          isOver && "ring-2 ring-amber-400 bg-amber-50/40 shadow-xl shadow-amber-500/10 scale-[1.01]",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pizarron</p>
          <Compass className="h-4 w-4 text-slate-400" />
        </div>

        {displayOffers.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {displayOffers.map((offer) => {
              const tag = sourceBadge(offer);
              const isSaved = journeyState.boardItems.some((item) => item.id === offer.id);

              return (
                <article
                  key={offer.id}
                  onClick={() => handleFocusOffer(offer)}
                  className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white/70 p-3 transition-all hover:border-amber-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-amber-600">
                          {offer.title}
                        </p>
                        {isSaved ? <span className="h-2 w-2 rounded-full bg-amber-400" title="Guardado" /> : null}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatMoney(readOfferPrice(offer), currencyCode)}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold ${tag.classes}`}>
                      {tag.label}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-8 text-center">
            <div className="mb-3 rounded-full bg-amber-100/60 p-3">
              <Compass className="h-5 w-5 text-amber-500/80" />
            </div>
            <p className="text-xs font-medium text-slate-500">Arrastra ofertas aqui</p>
            <p className="mt-1 px-4 text-[11px] text-slate-400">Guarda sugerencias del chat en tu pizarron.</p>
          </div>
        )}
      </section>
    </div>
  );
}
