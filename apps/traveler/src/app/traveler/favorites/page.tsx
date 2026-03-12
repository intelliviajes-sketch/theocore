"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTravelerCatalog } from "@/contexts/traveler-catalog";
import { useTravelerWorkspace } from "../TravelerWorkspaceContext";
import { useAuth } from "../AuthContext";
import { useTravelerPreferences } from "../useTravelerPreferences";

function getStorageKey(userId: string | null) {
  return `traveler:favorites:${userId || "guest"}`;
}

function readFavoriteIds(storageKey: string) {
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [] as string[];
  }
}

export default function TravelerFavoritesPage() {
  const router = useRouter();
  const { items } = useTravelerCatalog();
  const { beginJourneyFromMode } = useTravelerWorkspace();
  const { user } = useAuth();
  const { compactMode } = useTravelerPreferences();
  const storageKey = getStorageKey(user?.id || null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds(storageKey));
  const compactCards = compactMode;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFavoriteIds(readFavoriteIds(storageKey));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(favoriteIds));
    } catch {
      // ignore storage write errors
    }
  }, [favoriteIds, storageKey]);

  const favoriteItems = useMemo(
    () => items.filter((item) => favoriteIds.includes(item.id)),
    [items, favoriteIds],
  );

  const suggestions = useMemo(
    () => items.filter((item) => !favoriteIds.includes(item.id)).slice(0, 6),
    [items, favoriteIds],
  );

  function toggleFavorite(productId: string) {
    setFavoriteIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function openInChat(productId: string) {
    beginJourneyFromMode("chat");
    router.push(`/traveler/chat?product=${productId}`);
  }

  return (
    <div className="trav-page">
      <div className="trav-container max-w-6xl">
        <div className="trav-panel p-6 sm:p-8">
          <p className="trav-kicker">Favoritos</p>
          <h1 className="trav-title">Tus productos guardados</h1>
          <p className="trav-subtitle">
            Guarda ideas para retomarlas rapido en chat o planning.
          </p>

          <div className="mt-6">
            {favoriteItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                Aun no tienes favoritos guardados.
              </div>
            ) : (
              <div className={compactCards ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
                {favoriteItems.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className={compactCards ? "h-28 w-full bg-slate-100" : "h-36 w-full bg-slate-100"}>
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className={compactCards ? "p-3" : "p-4"}>
                      <h2 className={compactCards ? "line-clamp-2 text-xs font-semibold text-slate-900" : "line-clamp-2 text-sm font-semibold text-slate-900"}>{item.title}</h2>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.summary}</p>
                      <div className={compactCards ? "mt-2 flex items-center gap-2" : "mt-3 flex items-center gap-2"}>
                        <button
                          type="button"
                          onClick={() => openInChat(item.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Ver en chat
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <Heart className="h-3.5 w-3.5" />
                          Quitar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="trav-panel mt-6 p-6 sm:p-8">
          <p className="trav-kicker">Sugerencias</p>
          <h2 className="trav-title">Agrega mas ideas</h2>
          <div className={compactCards ? "mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" : "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleFavorite(item.id)}
                className={compactCards ? "rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left hover:bg-slate-100" : "rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-slate-100"}
              >
                <p className={compactCards ? "line-clamp-1 text-xs font-semibold text-slate-900" : "line-clamp-1 text-sm font-semibold text-slate-900"}>{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.summary}</p>
                <p className="mt-2 text-[11px] font-semibold text-emerald-700">Agregar a favoritos</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
