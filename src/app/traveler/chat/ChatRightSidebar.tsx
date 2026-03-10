// src/app/traveler/chat/ChatRightSidebar.tsx

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
    <div className="space-y-4 lg:sticky lg:top-24">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Inspiracion</h3>
        {inspo ? (
          <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{inspo}</pre>
        ) : (
          <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Cargando inspiracion desde IA...</p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Oferta destacada</h3>
        {offers[0] ? (
          <div className="mt-3">
            <p className="font-semibold text-slate-900">{offers[0].title}</p>
            <p className="mt-2 text-sm text-slate-600">{offers[0].summary}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">
              {offers[0].destination || activeBrain?.market_destination || "Destino sugerido"}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Todavia no hay ofertas cargadas para este mercado.</p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Contexto comercial</h3>
        {offers.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {offers.slice(0, 4).map((offer) => (
              <li key={offer.id}>• {offer.title}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">El asistente respondera con contexto general hasta que haya catalogo para esta agencia.</p>
        )}
      </div>
    </div>
  );
}
