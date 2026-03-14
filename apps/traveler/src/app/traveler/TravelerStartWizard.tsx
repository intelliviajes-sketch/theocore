"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Send, Sparkles } from "lucide-react";
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
    <div className="flex min-h-[65vh] w-full max-w-4xl flex-col items-center justify-center px-4 pt-10 sm:pt-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full text-center"
      >
        <h1 className="mb-5 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
          Donde quieres ir?
        </h1>
        <p className="mx-auto mb-7 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
          Cuentame tu plan de viaje y te ayudo a construirlo con {brandName}.
        </p>

        <div className="mx-auto mb-5 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Tipo rapido
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors hover:bg-slate-800"
              title="Abrir planning completo"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-left text-xs text-slate-500">
            {loadingTypes
              ? "Cargando tipos..."
              : hoveredType?.description || "Hover en un tipo para ver descripcion. Click abre su formulario."}
          </p>
        </div>

        <form onSubmit={handleChatSubmit} className="group relative mx-auto w-full max-w-2xl">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-orange-400 to-amber-300 opacity-20 blur transition duration-500 group-hover:opacity-40" />
          <div className="relative flex items-center rounded-[2rem] border border-slate-200 bg-white p-2 pl-6 shadow-sm transition-shadow focus-within:border-orange-300 focus-within:shadow-md">
            <Sparkles className="mr-3 h-6 w-6 flex-shrink-0 text-amber-500" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: viaje a Japon en primavera para dos personas..."
              className="w-full flex-1 truncate border-none bg-transparent py-3 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none md:py-4 md:text-lg"
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

        <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => handleChatSubmit()}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-6 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-500/20"
          >
            <ArrowRight className="h-4 w-4" />
            Conversar con IVI directo
          </button>
        </div>

        {featured.length > 0 && (
          <div className="mt-14 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Sugerencias populares en {localeLabel}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
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
      </motion.div>
    </div>
  );
}
