"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Compass,
  MessageCircle,
  NotebookPen,
  ShoppingBag,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/travelers";
import { trackTravelerEvent } from "@/lib/traveler/tracking";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

type IntentTone = "low" | "medium" | "high";
const STAGE_LABELS: Record<string, string> = {
  explore: "Explorar",
  design: "Disenar",
  decide: "Decidir",
  booked: "Reservado",
  traveling: "En viaje",
};

function intentBadge(intent: IntentTone) {
  if (intent === "high") return "bg-emerald-100 text-emerald-700";
  if (intent === "medium") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function intentLabel(intent: IntentTone) {
  if (intent === "high") return "Intencion alta";
  if (intent === "medium") return "Intencion media";
  return "Fase de exploracion";
}

export default function WelcomePanel({
  onLogin,
  brandName,
  localeLabel,
  catalogItems,
  featuredItems,
  catalogLoading,
  catalogError,
}: {
  onLogin: () => void;
  brandName: string;
  localeLabel: string;
  catalogItems: CatalogProduct[];
  featuredItems: CatalogProduct[];
  catalogLoading: boolean;
  catalogError: string | null;
}) {
  const router = useRouter();
  const { insight, journeyState } = useTravelerWorkspace();

  const recommended = useMemo(() => {
    const byIds = insight.recommendedProductIds
      .map((id) => featuredItems.find((item) => item.id === id))
      .filter((item): item is CatalogProduct => Boolean(item));
    if (byIds.length > 0) return byIds.slice(0, 4);
    return featuredItems.slice(0, 4);
  }, [featuredItems, insight.recommendedProductIds]);

  function openChat() {
    trackTravelerEvent("open_chat", { source: "home" });
    router.push("/traveler/chat");
  }

  function openPlanning() {
    trackTravelerEvent("start_planning", { source: "home" });
    router.push("/traveler/planning");
  }

  function startCheckout() {
    trackTravelerEvent("start_checkout", {
      source: "home",
      offers: recommended.map((item) => item.id),
      intent: insight.intent,
    });
    router.push("/traveler/chat");
  }

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden border-slate-300 bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 text-white">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
              Portal de viajes asistido por IA
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-4xl">
              De idea a reserva en un flujo continuo.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              El brain de {brandName} te acompana para descubrir opciones,
              construir el viaje y convertirlo en compra.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openChat}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                <Bot className="h-4 w-4" />
                Empezar en chat
              </button>
              <button
                type="button"
                onClick={openPlanning}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                <NotebookPen className="h-4 w-4" />
                Ir a planning
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/90">
              Ruta recomendada
            </p>
            <div className="space-y-2 text-sm text-cyan-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                Conversa y detecta preferencia
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                Completa planning con datos reales
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                Activa cierre cuando haya intencion
              </div>
            </div>
            <div className="pt-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${intentBadge(insight.intent as IntentTone)}`}
              >
                {intentLabel(insight.intent as IntentTone)}
              </span>
            </div>
            <p className="text-xs text-cyan-100/85">
              {localeLabel} - {catalogItems.length} productos activos
            </p>
            <p className="text-xs text-cyan-100/85">
              Etapa: {STAGE_LABELS[journeyState.activeStage] || "Explorar"} - Reserva:{" "}
              {journeyState.reservation?.status || "sin cotizacion"}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel>
          <div className="mb-3 inline-flex rounded-2xl bg-cyan-50 p-3 text-cyan-700">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">1. Descubrir</h3>
          <p className="mt-2 text-sm text-slate-600">
            Modo conversacional para explorar destinos, presupuesto y
            preferencias en tiempo real.
          </p>
          <button
            type="button"
            onClick={openChat}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Abrir chat
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </Panel>

        <Panel>
          <div className="mb-3 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">2. Disenar</h3>
          <p className="mt-2 text-sm text-slate-600">
            Formulario guiado por tipo de producto para convertir ideas en
            propuesta comercial lista.
          </p>
          <button
            type="button"
            onClick={openPlanning}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Ir a planning
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </Panel>

        <Panel>
          <div className="mb-3 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">3. Cerrar</h3>
          <p className="mt-2 text-sm text-slate-600">
            Cuando la intencion sube, empuja el siguiente paso comercial sin
            perder contexto.
          </p>
          <button
            type="button"
            onClick={startCheckout}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Iniciar reserva
            <TicketCheck className="h-3.5 w-3.5" />
          </button>
        </Panel>
      </div>

      <Panel>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Productos recomendados
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
            {catalogItems.length} activos
          </span>
        </div>

        {catalogLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Cargando catalogo...
          </div>
        ) : catalogError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
            {catalogError}
          </div>
        ) : recommended.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recommended.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="h-36 w-full bg-slate-100">
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <Compass className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {item.productTypeName || "Catalogo"}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                    {item.summary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    trackTravelerEvent("view_product", {
                      source: "home-grid",
                      productId: item.id,
                      title: item.title,
                    });
                    router.push(`/traveler/chat?product=${item.id}`);
                  }}
                  className="mb-4 ml-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  Ver en chat
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aun no hay productos disponibles para este mercado.
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openChat}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Continuar en chat
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Iniciar sesion
          </button>
        </div>
      </Panel>

      <Panel className="border-slate-200 bg-slate-50/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Siguiente paso sugerido
            </p>
            <p className="mt-1 text-sm text-slate-700">{insight.summary}</p>
          </div>
          <button
            type="button"
            onClick={startCheckout}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Sparkles className="h-4 w-4" />
            Activar cierre comercial
            <TicketCheck className="h-4 w-4" />
          </button>
        </div>
      </Panel>
    </div>
  );
}
