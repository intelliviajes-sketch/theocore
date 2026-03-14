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

  return (
    <div className="trav-page bg-[radial-gradient(900px_360px_at_90%_-5%,rgba(251,191,36,0.16),transparent_60%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] h-[100dvh] overflow-hidden flex flex-col relative transition-colors duration-500">
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
        <div className="trav-grid flex-1 overflow-hidden transition-all duration-500 ease-in-out">
          <section className="trav-reveal h-full overflow-hidden relative transition-all duration-500 min-w-0">
            {left}
          </section>

          {hasRightPanel ? (
            <aside className="trav-reveal hidden xl:block h-full overflow-y-auto pr-1 pb-4 transition-all duration-500">
              {right}
            </aside>
          ) : null}
        </div>

        {hasRightPanel ? (
          <button
            onClick={() => setIsMobilePanelOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-xl shadow-amber-500/30 transition-transform active:scale-95 xl:hidden"
            aria-label="Abrir Panel de Control"
          >
            <Layers className="h-6 w-6 text-slate-900" />
          </button>
        ) : null}
      </div>

      {hasRightPanel ? (
        <BottomSheetModal
          isOpen={isMobilePanelOpen}
          onClose={() => setIsMobilePanelOpen(false)}
          title="Workspace y Cotizacion"
        >
          {right}
        </BottomSheetModal>
      ) : null}
    </div>
  );
}
