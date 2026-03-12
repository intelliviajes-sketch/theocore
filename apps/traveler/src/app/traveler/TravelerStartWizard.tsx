"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Compass,
  Sparkles,
  Star,
  Ticket,
} from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/travelers";

function sourceBadge(product: CatalogProduct) {
  if (product.monetizationTier === "own") {
    return { label: "Propio", classes: "bg-emerald-100 text-emerald-700" };
  }
  if (product.monetizationTier === "adapted") {
    return { label: "Adaptado", classes: "bg-rose-100 text-rose-700" };
  }
  return { label: "Patrocinado", classes: "bg-amber-100 text-amber-700" };
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
  onStartChat: () => void;
  onStartPlanning: () => void;
  onStartChatWithProduct: (productId: string) => void;
}) {
  const featured = featuredItems.slice(0, 3);

  return (
    <div className="trav-reveal space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"
      >

        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs text-slate-500">
              Traveler Experience
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Planifica como conversas:
              <br />
              rapido, visual y con cierre real.
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
              IVI es la guia IA de {brandName}. Te ayuda a descubrir opciones,
              aterrizar itinerario y llevarlo a cotizacion sin salir del flujo.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onStartChat}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Conversar con IVI
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onStartPlanning}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Planear directo
                <CalendarDays className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              Activacion rapida
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Define objetivo del viaje en 1 mensaje
              </p>
              <p className="flex items-center gap-2">
                <Compass className="h-4 w-4" />
                Recibe opciones y rutas recomendadas
              </p>
              <p className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Convierte a reserva con contexto guardado
              </p>
            </div>
            <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
              Mercado activo: {localeLabel}
            </p>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-600">
            <Bot className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">Explorar con IVI</h3>
          <p className="mt-2 text-sm text-slate-600">
            Si aun no tienes todo definido, empieza en chat. IVI te guia con
            preguntas simples para destino, fechas, ritmo y presupuesto.
          </p>
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Resultado: recomendacion personalizada + siguientes pasos claros.
          </p>
          <button
            type="button"
            onClick={onStartChat}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Empezar chat
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-600">
            <CalendarDays className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">
            Ya tengo idea, quiero planear
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Si ya tienes objetivo claro, entra al planning para construir
            propuesta paso a paso con formato comercial listo.
          </p>
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Resultado: estructura lista para cotizar y cerrar.
          </p>
          <button
            type="button"
            onClick={onStartPlanning}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Ir a planning
            <Sparkles className="h-4 w-4" />
          </button>
        </motion.article>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">
              Inspiracion inmediata
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              Ideas destacadas para arrancar ahora
            </h3>
          </div>
          <button
            type="button"
            onClick={onStartChat}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver mas en chat
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {featured.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {featured.map((item) => {
              const badge = sourceBadge(item);
              return (
                <article
                  key={item.id}
                  className="trav-hover-card overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="h-32 w-full bg-slate-100">
                    {item.coverImage ? (
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Star className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${badge.classes}`}
                    >
                      {badge.label}
                    </span>
                    <h4 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
                      {item.title}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {item.summary}
                    </p>
                    <button
                      type="button"
                      onClick={() => onStartChatWithProduct(item.id)}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                    >
                      Quiero esta idea
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            Aun no hay productos cargados para este mercado. Puedes iniciar en
            chat para definir el viaje y crear propuesta con IVI.
          </div>
        )}
      </motion.section>
    </div>
  );
}
