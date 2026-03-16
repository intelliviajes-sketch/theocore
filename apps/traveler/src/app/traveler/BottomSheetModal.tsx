"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export function BottomSheetModal({
  isOpen,
  onClose,
  children,
  title = "Panel de Control",
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);
  // Swipe-to-close state
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setDragOffset(0);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset drag offset when sheet opens
  useEffect(() => {
    if (isOpen) setDragOffset(0);
  }, [isOpen]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    dragCurrentY.current = 0;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    dragCurrentY.current = delta;
    // Only allow downward drag
    setDragOffset(Math.max(0, delta));
  }

  function handlePointerUp() {
    if (dragCurrentY.current > 100) {
      onClose();
    } else {
      setDragOffset(0);
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  }

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end lg:hidden transition-all duration-300 ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[3px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`relative flex w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          height: "92dvh",
          transform: isOpen
            ? `translateY(${dragOffset}px)`
            : "translateY(100%)",
          transition: dragOffset > 0 ? "none" : undefined,
        }}
      >
        {/* Drag handle + header */}
        <div
          className="flex flex-col items-center px-5 pb-0 pt-3 touch-none cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* iOS-style drag handle bar */}
          <div className="mb-3 h-1 w-10 rounded-full bg-slate-300" />

          <div className="flex w-full items-center justify-between pb-3 border-b border-amber-100/60">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-900 shadow-inner shrink-0">
                <span className="text-xs font-bold font-mono">IVI</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-slate-100/80 p-2 text-slate-600 transition-colors hover:bg-slate-200 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-safe-area-inset-bottom">
          {children}
        </div>
      </div>
    </div>
  );
}
