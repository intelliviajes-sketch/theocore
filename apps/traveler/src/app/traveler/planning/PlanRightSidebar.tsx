// src/app/traveler/planning/PlanRightSidebar.tsx

import React from "react";
import { Brain } from "./types-and-utils";
import type { CatalogProduct } from "@/lib/catalog/travelers";

interface RightSidebarProps {
  inspo: string;
  activeBrain: Brain | null;
  offers: CatalogProduct[];
}

export default function RightSidebar({ inspo, activeBrain, offers }: RightSidebarProps) {
  return (
    <aside className="w-60 lg:col-span-3">
      <div className="sticky top-0 space-y-0">
        <div className="overflow-hidden border border-amber-100 bg-white p-1">
          <div className="mb-3 flex items-center gap-1">
            <span className="text-2xl">🌟</span>
            <h3 className="text-sm text-slate-900">Inspiracion</h3>
          </div>

          {inspo ? (
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-5">
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{inspo}</pre>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Cargando inspiracion desde IA...</div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl">🧳</span>
            <h3 className="text-sm text-green-800">Producto sugerido</h3>
          </div>
          {offers[0] ? (
            <div className="text-green-900">
              <p className="font-semibold">{offers[0].title}</p>
              <p className="mt-1 text-sm">{offers[0].summary}</p>
              <p className="mt-2 text-xs font-medium text-green-700">
                {offers[0].destination || activeBrain?.market_destination || "Destino sugerido"}
              </p>
              <button className="mt-3 w-full rounded-xl bg-green-600/90 py-2 text-xs text-white transition-all hover:bg-green-700">
                Agregar al plan
              </button>
            </div>
          ) : (
            <div className="text-sm text-green-800">Todavia no hay productos cargados para este mercado.</div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-600 p-6">
          <div className="mb-3 text-2xl">🗺️</div>
          <h3 className="mb-2 text-white">Ideas del catalogo</h3>
          {offers.length > 0 ? (
            <ul className="mb-4 space-y-2 text-sm text-blue-100">
              {offers.slice(0, 3).map((offer) => (
                <li key={offer.id}>• {offer.title}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-blue-100">Cuando haya catalogo para esta agencia, el planificador lo usara como base de sugerencias.</p>
          )}
          <button className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-blue-700 transition-all">Explorar opciones →</button>
        </div>
      </div>
    </aside>
  );
}
