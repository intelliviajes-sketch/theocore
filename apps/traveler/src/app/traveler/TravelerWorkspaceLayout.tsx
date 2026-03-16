"use client";

import { useState, useMemo, type ReactNode } from "react";
import { BottomSheetModal } from "./BottomSheetModal";
import { Layers } from "lucide-react";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";
import { useTravelerCatalog } from "@/contexts/traveler-catalog";
import { motion, AnimatePresence } from "motion/react";

export default function TravelerWorkspaceLayout({
  topBar,
  left,
  right,
}: {
  topBar?: ReactNode;
  left: ReactNode;
  right: ReactNode;
}) {
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const hasRightPanel = right !== null && right !== undefined && right !== false;

  const { journeyState } = useTravelerWorkspace();
  const { featured } = useTravelerCatalog();

  const activeProduct = useMemo(() => {
    if (!journeyState.selectedProductId) return null;
    return featured.find((p) => p.id === journeyState.selectedProductId) || null;
  }, [journeyState.selectedProductId, featured]);

  const bgImage = activeProduct?.coverImage || null;
  const selectedDestination = activeProduct?.destination || journeyState.selectedDestination || null;
  const stageLabel = useMemo(() => {
    const map: Record<string, string> = {
      explore: "Explorando",
      design: "Disenando",
      decide: "Decidiendo",
      booked: "Reservado",
      traveling: "Viajando",
    };
    return map[journeyState.activeStage] || "Explorando";
  }, [journeyState.activeStage]);
  const boardCount = journeyState.boardItems.length;

  return (
    <div className="trav-page bg-[radial-gradient(980px_420px_at_92%_-8%,rgba(251,191,36,0.17),transparent_62%),radial-gradient(860px_340px_at_8%_0%,rgba(14,165,233,0.1),transparent_60%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] h-full min-h-0 overflow-hidden flex flex-col relative transition-colors duration-500">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute -left-24 bottom-8 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
      </div>
      <AnimatePresence>
        {bgImage && (
          <motion.div
            key={bgImage}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.15, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 z-0 pointer-events-none"
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-[6px] saturate-150 mix-blend-multiply"
              style={{ backgroundImage: `url(${bgImage})` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="trav-container flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {topBar ? <div className="mb-3 shrink-0">{topBar}</div> : null}
        {hasRightPanel ? (
          <div className="mb-2 lg:hidden">
            <button
              onClick={() => setIsMobilePanelOpen(true)}
              className="trav-glass-soft flex w-full items-center justify-between rounded-2xl border border-slate-200/80 px-3 py-2.5 text-left"
              aria-label="Abrir resumen del viaje"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Resumen en vivo</p>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedDestination || "Aun sin destino definido"}
                </p>
                <p className="text-[11px] text-slate-600">
                  {stageLabel} · {boardCount} en pizarron
                </p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500">
                <Layers className="h-4 w-4 text-slate-900" />
              </span>
            </button>
          </div>
        ) : null}
        <div className="trav-grid trav-layout-divider flex-1 overflow-hidden transition-all duration-500 ease-in-out">
          <section className="trav-reveal trav-layout-pane h-full overflow-hidden relative transition-all duration-500 min-w-0">
            {left}
          </section>

          {hasRightPanel ? (
            <aside className="trav-reveal trav-layout-pane trav-layout-pane--right hidden lg:block h-full overflow-y-auto pr-1 pb-4 transition-all duration-500">
              {right}
            </aside>
          ) : null}
        </div>

      </div>

      {hasRightPanel ? (
        <BottomSheetModal
          isOpen={isMobilePanelOpen}
          onClose={() => setIsMobilePanelOpen(false)}
          title="Resumen del viaje"
        >
          {right}
        </BottomSheetModal>
      ) : null}
    </div>
  );
}
