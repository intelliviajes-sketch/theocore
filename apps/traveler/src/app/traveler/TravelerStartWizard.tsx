"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BriefcaseBusiness,
  CalendarDays,
  Lightbulb,
  Plus,
  ReceiptText,
  Send,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/travelers";

type ProductTypeLite = {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  owner_agency_id: string | null;
  current_version: number;
};

type StartPlanningPayload = {
  typeId?: string;
  formData?: Record<string, unknown>;
};

const JOURNEY_STEPS = [
  {
    title: "Idea inicial",
    description: "Escribe tu objetivo de viaje con el mayor contexto posible.",
    icon: Lightbulb,
    tone: "text-amber-600 bg-amber-100 border-amber-200",
  },
  {
    title: "Destino y fechas",
    description: "Definimos ciudad, temporada y duracion para enfocar opciones.",
    icon: CalendarDays,
    tone: "text-sky-600 bg-sky-100 border-sky-200",
  },
  {
    title: "Tipo de producto",
    description: "Selecciona paquete, hotel, vuelo o excursion para activar su formulario.",
    icon: BriefcaseBusiness,
    tone: "text-indigo-600 bg-indigo-100 border-indigo-200",
  },
  {
    title: "Plan personalizado",
    description: "La IA propone alternativas adaptadas a presupuesto y estilo.",
    icon: Wand2,
    tone: "text-violet-600 bg-violet-100 border-violet-200",
  },
  {
    title: "Ajustes finos",
    description: "Refinamos detalles por preferencias, acompanantes y ritmo.",
    icon: SlidersHorizontal,
    tone: "text-teal-600 bg-teal-100 border-teal-200",
  },
  {
    title: "Cotizacion final",
    description: "Consolidamos la propuesta lista para pasar a booking.",
    icon: ReceiptText,
    tone: "text-emerald-600 bg-emerald-100 border-emerald-200",
  },
];

const PRIORITY_TYPE_KEYWORDS = [
  "paquete",
  "hotel",
  "vuelo",
  "tour",
  "excursion",
  "traslado",
];

function scoreType(name: string) {
  const value = name.toLowerCase();
  const index = PRIORITY_TYPE_KEYWORDS.findIndex((keyword) => value.includes(keyword));
  return index === -1 ? 999 : index;
}

function isSeguro(name: string) {
  return name.toLowerCase().includes("seguro");
}

function pickQuickTypes(types: ProductTypeLite[]) {
  return [...types]
    .filter((item) => !isSeguro(item.name))
    .sort((a, b) => {
      const scoreA = scoreType(a.name);
      const scoreB = scoreType(b.name);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    })
    .slice(0, 4);
}

export default function TravelerStartWizard({
  brandName,
  localeLabel,
  featuredItems,
  onStartChat,
  onStartPlanning,
  onStartChatWithProduct,
}: {
  brandName: string;
  localeLabel: string;
  featuredItems: CatalogProduct[];
  onStartChat: (initialMessage?: string) => void;
  onStartPlanning: (payload?: StartPlanningPayload) => void;
  onStartChatWithProduct: (productId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [productTypes, setProductTypes] = useState<ProductTypeLite[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [hoveredTypeId, setHoveredTypeId] = useState<string | null>(null);
  const featured = featuredItems.slice(0, 4);

  const quickTypes = useMemo(() => pickQuickTypes(productTypes), [productTypes]);
  const hoveredType = useMemo(
    () => quickTypes.find((item) => item.id === hoveredTypeId) || null,
    [quickTypes, hoveredTypeId],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingTypes(true);
      try {
        const response = await fetch("/api/traveler/product-types", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        const list = (Array.isArray(payload?.types) ? payload.types : []) as ProductTypeLite[];
        if (!cancelled) {
          setProductTypes(list);
        }
      } catch (loadError) {
        console.error("Error cargando tipos de producto en landing:", loadError);
        if (!cancelled) setProductTypes([]);
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChatSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    onStartChat(prompt.trim() || undefined);
  }

  function handleSuggestionClick(title: string) {
    setPrompt(title);
  }

  function handleOpenPlanning() {
    onStartPlanning();
  }

  return (
    <div className="flex min-h-[65vh] w-full max-w-6xl flex-col justify-center px-4 pt-8 sm:pt-2">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="text-center lg:text-left">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              Donde quieres ir?
            </h1>
            <p className="mx-auto mb-6 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg lg:mx-0">
              Cuentame tu plan de viaje y te ayudo a construirlo con {brandName}.
            </p>

            <div className="mb-5 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm lg:max-w-none">
              <div className="flex flex-wrap items-center gap-2">
                <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Un plan rapido
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onMouseEnter={() => setHoveredTypeId(type.id)}
                      onMouseLeave={() => setHoveredTypeId((current) => (current === type.id ? null : current))}
                      onFocus={() => setHoveredTypeId(type.id)}
                      onBlur={() => setHoveredTypeId((current) => (current === type.id ? null : current))}
                      onClick={() => onStartPlanning({ typeId: type.id })}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        hoveredTypeId === type.id
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title={type.description || "Abrir planning con este tipo"}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleOpenPlanning}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800"
                  title="Abrir planning completo"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-left text-xs text-slate-500">
                {loadingTypes
                  ? "Cargando tipos..."
                  : hoveredType?.description || "Hover en un tipo para ver descripcion. Click abre su formulario."}
              </p>
            </div>

            <form onSubmit={handleChatSubmit} className="group relative w-full max-w-2xl lg:max-w-none">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-orange-400 to-amber-300 opacity-20 blur transition duration-500 group-hover:opacity-40" />
              <div className="relative flex items-center rounded-[2rem] border border-slate-200 bg-white p-2 pl-6 shadow-sm transition-shadow focus-within:border-orange-300 focus-within:shadow-md">
                <Sparkles className="mr-3 h-6 w-6 flex-shrink-0 text-amber-500" />
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: viaje a Japon en primavera para dos personas..."
                  className="w-full flex-1 truncate border-none bg-transparent py-4 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none md:py-5 md:text-lg"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="group/btn ml-2 flex items-center justify-center rounded-full bg-slate-900 p-4 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                >
                  <Send className="h-5 w-5 -translate-x-[1px] transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              </div>
            </form>

            {featured.length > 0 && (
              <div className="mt-10 text-center lg:text-left">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Sugerencias populares en {localeLabel}
                </p>
                <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                  {featured.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSuggestionClick(item.title)}
                      onDoubleClick={() => onStartChatWithProduct(item.id)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
                      title="Doble click para abrir chat con este producto"
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="relative hidden overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/88 p-5 shadow-xl lg:flex lg:flex-col">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_240px_at_85%_10%,rgba(251,191,36,0.3),transparent_75%),radial-gradient(320px_180px_at_20%_80%,rgba(251,146,60,0.22),transparent_70%)]" />
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-amber-300/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-orange-300/25 blur-3xl" />
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ruta sugerida</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Viaje en 6 pasos</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Estructura rapida para pasar de idea a cotizacion sin perder contexto.
              </p>
            </div>
            <div className="relative z-10 mt-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Flujo guiado</p>
              <p className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">6/6</p>
            </div>
            <ol className="relative z-10 mt-4 space-y-2.5">
              {JOURNEY_STEPS.map((step, index) => (
                <li key={step.title} className="relative rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-2.5">
                  {index < JOURNEY_STEPS.length - 1 ? (
                    <span className="pointer-events-none absolute left-[22px] top-[36px] h-6 w-px bg-gradient-to-b from-slate-300 to-slate-200" />
                  ) : null}
                  <div className="flex items-start gap-2.5">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${step.tone}`}>
                      <step.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
                        Paso {index + 1}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{step.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}
