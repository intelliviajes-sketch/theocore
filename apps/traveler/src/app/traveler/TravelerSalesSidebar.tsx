"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudSun, Compass, Globe2, MapPinned, Sparkles, Thermometer, Wind } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog/travelers";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";
import { trackTravelerEvent } from "@/lib/traveler/tracking";

const PRICE_KEYS = ["price", "precio", "amount", "total", "base_price", "price_from"];
const FALLBACK_TRAVEL_VISUALS = [
  "https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
];
const IMAGE_CONTEXT_BLOCKLIST = ["fruit", "food", "dish", "bean", "verdura", "vegetable", "drink", "cocktail"];

type WeatherSnapshot = {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  code: number;
  label: string;
};

type DestinationContext = {
  city: string;
  country: string | null;
  region: string | null;
};

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

function stageLabel(stage: string) {
  const map: Record<string, string> = {
    explore: "Explorar",
    design: "Disenar",
    decide: "Decidir",
    booked: "Reservado",
    traveling: "Viajando",
  };
  return map[stage] || "Explorar";
}

function weatherCodeToLabel(code: number) {
  if ([0, 1].includes(code)) return "Despejado";
  if ([2, 3].includes(code)) return "Parcialmente nublado";
  if ([45, 48].includes(code)) return "Niebla";
  if ([51, 53, 55, 56, 57].includes(code)) return "Llovizna";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "Lluvia";
  if ([66, 67].includes(code)) return "Lluvia helada";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Nieve";
  if ([95, 96, 99].includes(code)) return "Tormenta";
  return "Variable";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const normalized = value.trim();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
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
  const { insight, journeyState, selectJourneyProduct, chatMessages } = useTravelerWorkspace();
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [contextImages, setContextImages] = useState<string[]>([]);
  const [destinationContext, setDestinationContext] = useState<DestinationContext | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

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

  const destination = selectedOffer?.destination || journeyState.selectedDestination || null;
  const destinationToken = useMemo(() => {
    if (!destination) return null;
    return destination.split(",")[0]?.trim() || destination;
  }, [destination]);
  const mapUrl = destination ? `https://www.google.com/maps?q=${encodeURIComponent(destination)}` : null;
  const mapEmbedUrl = destination ? `${mapUrl}&output=embed` : null;

  const intentMeta = useMemo(() => {
    if (insight.intent === "high") {
      return { label: "Alta intencion", classes: "bg-emerald-100 text-emerald-700" };
    }
    if (insight.intent === "medium") {
      return { label: "Intencion media", classes: "bg-amber-100 text-amber-700" };
    }
    return { label: "Descubrimiento", classes: "bg-slate-100 text-slate-600" };
  }, [insight.intent]);

  const visualGallery = useMemo(() => {
    const offerImages = uniqueStrings([
      selectedOffer?.coverImage,
      ...(selectedOffer?.images || []),
      ...displayOffers.flatMap((offer) => [offer.coverImage, ...(offer.images || [])]),
    ]);

    return uniqueStrings([...offerImages, ...contextImages, ...FALLBACK_TRAVEL_VISUALS]).slice(0, 5);
  }, [contextImages, displayOffers, selectedOffer]);
  const heroImage = useMemo(
    () => visualGallery.find((image) => !failedImages[image]) || null,
    [failedImages, visualGallery],
  );
  const thumbnailImages = useMemo(
    () => visualGallery.filter((image) => !failedImages[image]).slice(0, 4),
    [failedImages, visualGallery],
  );

  const interestTags = useMemo(() => {
    const raw = uniqueStrings([
      ...(selectedOffer?.tags || []),
      ...displayOffers.flatMap((offer) => offer.tags || []),
    ]);

    if (raw.length > 0) return raw.slice(0, 8);

    if (journeyState.activeStage === "decide") {
      return ["Presupuesto", "Condiciones", "Fechas", "Confirmacion"];
    }
    if (journeyState.activeStage === "design") {
      return ["Alojamientos", "Experiencias", "Traslados", "Ritmo"];
    }
    return ["Inspiracion", "Destinos", "Ideas", "Estilo de viaje"];
  }, [displayOffers, journeyState.activeStage, selectedOffer]);

  const lastUserMessage = useMemo(() => {
    for (let i = chatMessages.length - 1; i >= 0; i -= 1) {
      const message = chatMessages[i];
      if (message.role === "user" && message.content.trim().length > 0) {
        return message.content.trim();
      }
    }
    return null;
  }, [chatMessages]);

  const { setNodeRef, isOver } = useDroppable({ id: "board-droppable" });

  useEffect(() => {
    if (!destinationToken) {
      setWeather(null);
      setContextImages([]);
      setDestinationContext(null);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        setWeatherLoading(true);
        setFailedImages({});
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destinationToken)}&count=1&language=es&format=json`,
          { signal: controller.signal },
        );
        if (!geoRes.ok) throw new Error(`Geo ${geoRes.status}`);
        const geoPayload = (await geoRes.json()) as {
          results?: Array<{
            latitude: number;
            longitude: number;
            name?: string;
            country?: string;
            admin1?: string;
          }>;
        };
        const geo = geoPayload.results?.[0];
        if (!geo) throw new Error("Sin coordenadas");
        const context: DestinationContext = {
          city: typeof geo.name === "string" && geo.name.trim().length > 0 ? geo.name.trim() : destinationToken,
          country: typeof geo.country === "string" && geo.country.trim().length > 0 ? geo.country.trim() : null,
          region: typeof geo.admin1 === "string" && geo.admin1.trim().length > 0 ? geo.admin1.trim() : null,
        };
        setDestinationContext(context);

        const commonsQuery = [
          context.city,
          context.region || "",
          context.country || "",
          "city skyline tourism landmark mountain hiking travel",
          "-fruit -food -recipe",
        ]
          .filter(Boolean)
          .join(" ");

        const commonsRes = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(commonsQuery)}&prop=imageinfo&iiprop=url`,
          { signal: controller.signal },
        );
        if (commonsRes.ok) {
          const commonsPayload = (await commonsRes.json()) as {
            query?: {
              pages?: Record<string, { title?: string; imageinfo?: Array<{ url?: string }> }>;
            };
          };
          const pages = commonsPayload.query?.pages || {};
          const images = Object.values(pages)
            .map((page) => page.imageinfo?.[0]?.url || null)
            .filter((url): url is string => Boolean(url))
            .filter((url) => /\.(jpg|jpeg|png|webp)(?:\?|$)/i.test(url))
            .filter((url) => {
              const normalized = url.toLowerCase();
              return !IMAGE_CONTEXT_BLOCKLIST.some((word) => normalized.includes(word));
            })
            .slice(0, 6);
          setContextImages(images);
        } else {
          setContextImages([]);
        }

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&timezone=auto&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m`,
          { signal: controller.signal },
        );
        if (!weatherRes.ok) throw new Error(`Weather ${weatherRes.status}`);
        const weatherPayload = (await weatherRes.json()) as {
          current?: {
            temperature_2m?: number;
            apparent_temperature?: number;
            weather_code?: number;
            wind_speed_10m?: number;
          };
        };

        const current = weatherPayload.current;
        if (!current) throw new Error("Sin datos actuales");

        const code = Math.round(current.weather_code ?? 0);
        setWeather({
          temperature: Math.round(current.temperature_2m ?? 0),
          feelsLike: Math.round(current.apparent_temperature ?? 0),
          windSpeed: Math.round(current.wind_speed_10m ?? 0),
          code,
          label: weatherCodeToLabel(code),
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setWeather(null);
        setContextImages([]);
        setDestinationContext(null);
        console.warn("No se pudo cargar clima para destino traveler:", error);
      } finally {
        if (!controller.signal.aborted) {
          setWeatherLoading(false);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [destinationToken]);

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
    <div className="trav-reveal overflow-hidden border border-slate-200/70 bg-white/70 backdrop-blur-sm">
      <section className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Resumen en vivo</p>
          <Sparkles className="h-4 w-4 text-amber-500" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90">
          <div className="relative h-28 w-full overflow-hidden bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200">
            {heroImage ? (
              <img
                src={heroImage}
                alt={destination || "Destino sugerido"}
                className="h-full w-full object-cover"
                onError={() => {
                  setFailedImages((current) => ({ ...current, [heroImage]: true }));
                }}
              />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/55 to-transparent px-3 py-2">
              <p className="line-clamp-1 text-xs font-semibold text-white">
                {destinationContext
                  ? `${destinationContext.city}${destinationContext.country ? `, ${destinationContext.country}` : ""}`
                  : destination || "Inspiracion de viaje personalizada"}
              </p>
            </div>
          </div>
          <div className="p-3">
            <p className="line-clamp-1 text-sm font-semibold text-slate-900">
              {destination || "Personalizando tu viaje"}
            </p>
            <p className="mt-1 text-xs text-slate-600">{insight.summary}</p>
            {lastUserMessage ? (
              <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">
                Ultimo pedido: "{lastUserMessage}"
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                Etapa: {stageLabel(journeyState.activeStage)}
              </span>
              <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", intentMeta.classes)}>
                {intentMeta.label}
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">
                Confianza {Math.round(insight.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Destino actual</p>
          <MapPinned className="h-4 w-4 text-slate-400" />
        </div>

        {destination ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {thumbnailImages.map((image, index) => (
                <div key={`${image}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <img
                    src={image}
                    alt={`Vista ${index + 1} de ${destination}`}
                    className="h-20 w-full object-cover transition-transform duration-500 hover:scale-105"
                    onError={() => {
                      setFailedImages((current) => ({ ...current, [image]: true }));
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Clima actual</p>
                <CloudSun className="h-4 w-4 text-amber-500" />
              </div>

              {weatherLoading ? (
                <p className="mt-2 text-xs text-slate-500">Cargando clima de {destinationToken}...</p>
              ) : weather ? (
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-700">
                  <div className="rounded-lg bg-slate-50 px-2 py-2">
                    <p className="text-[10px] text-slate-500">Estado</p>
                    <p className="mt-1 font-semibold">{weather.label}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Thermometer className="h-3 w-3" />
                      Temp
                    </div>
                    <p className="mt-1 font-semibold">{weather.temperature}C</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Wind className="h-3 w-3" />
                      Viento
                    </div>
                    <p className="mt-1 font-semibold">{weather.windSpeed} km/h</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No se pudo cargar el clima en este momento.</p>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Temas de interes</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {interestTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {mapEmbedUrl ? (
              <div className="mt-3 h-40 w-full overflow-hidden rounded-2xl border border-slate-200">
                <iframe
                  title="Mapa de destino"
                  src={mapEmbedUrl}
                  className="h-full w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : null}
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Abrir en Maps
              </a>
            ) : null}
          </>
        ) : (
          <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-300">
            <p className="px-4 text-center text-xs font-medium text-slate-400">
              Conversa con IVI y selecciona una oferta para construir tu guia visual del destino.
            </p>
          </div>
        )}
      </section>

      <section
        ref={setNodeRef}
        className={cn(
          "border-t border-slate-200/70 px-4 py-3 transition-all duration-300",
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
