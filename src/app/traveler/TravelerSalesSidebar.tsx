"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  Compass,
  Globe2,
  MapPinned,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
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
    return { label: "Propio", classes: "bg-emerald-100 text-emerald-700" };
  }
  if (product.monetizationTier === "adapted") {
    return { label: "Adaptado", classes: "bg-rose-100 text-rose-700" };
  }
  return { label: "Patrocinado", classes: "bg-amber-100 text-amber-700" };
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

  return (
    <div className="trav-reveal space-y-4 xl:sticky xl:top-24">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-sm">
        <p className="text-xs font-semibold text-slate-500">Inspiracion</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">Ideas para avanzar</h3>
        <p className="mt-1 text-xs text-slate-600">
          Ofertas relevantes para continuar la conversacion y cerrar mas rapido.
        </p>

        {recommendedOffers.length > 0 ? (
          <div className="mt-4 space-y-3">
            {recommendedOffers.map((offer) => {
              const tag = sourceBadge(offer);
              return (
                <article key={offer.id} className="trav-hover-card rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${tag.classes}`}>
                      {tag.label}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {formatMoney(readOfferPrice(offer), currencyCode)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{offer.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{offer.summary}</p>
                  <button
                    type="button"
                    onClick={() => handleFocusOffer(offer)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-orange-600 active:scale-[0.98]"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    Ver en sandbox
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No hay productos publicados todavia.</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-500">Destino</p>
          <MapPinned className="h-4 w-4 text-slate-500" />
        </div>
        {destination ? (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-800">{destination}</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
              {mapEmbedUrl ? (
                <iframe
                  title="Mapa de destino"
                  src={mapEmbedUrl}
                  className="h-36 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : null}
            </div>
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Abrir mapa
              </a>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-xs text-slate-500">Selecciona una opcion para ver inspiracion geolocalizada.</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-sm">
        <p className="text-xs font-semibold text-slate-500">Acciones</p>
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={() => router.push("/traveler/planning")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Abrir planning
          </button>
          <button
            type="button"
            onClick={handleCreateQuote}
            disabled={!selectedOffer}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Crear cotizacion
          </button>
          {journeyState.reservation ? (
            <button
              type="button"
              onClick={() => setJourneyReservationStatus("confirmed")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
            >
              <BadgeDollarSign className="h-3.5 w-3.5" />
              Confirmar reserva
            </button>
          ) : null}
        </div>

        {planningProgress ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
            Progreso planning: {planningProgress.total === 0 ? "0/0" : `${planningProgress.completed}/${planningProgress.total}`}
          </p>
        ) : null}

        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600">
          <Sparkles className="h-3.5 w-3.5" />
          Intencion detectada: {insight.intent}
        </p>
      </section>
    </div>
  );
}
