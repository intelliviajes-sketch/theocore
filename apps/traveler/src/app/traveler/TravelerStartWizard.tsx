"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Sparkles, Send } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/travelers";

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
  onStartPlanning: () => void;
  onStartChatWithProduct: (productId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const featured = featuredItems.slice(0, 4);

  const handleChatSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onStartChat(prompt.trim() || undefined);
  };

  const handleSuggestionClick = (title: string) => {
    setPrompt(title);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-4xl mx-auto w-full px-4 pt-10 sm:pt-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center w-full"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-5">
          ¿A dónde quieres ir?
        </h1>
        <p className="text-base md:text-lg text-slate-600 mb-10 max-w-xl mx-auto leading-relaxed">
          Dime tu destino ideal, la vibra que buscas o con quién viajas. Yo me encargo de armar el viaje perfecto con {brandName}.
        </p>

        {/* Search Bar Container */}
        <form onSubmit={handleChatSubmit} className="relative w-full max-w-2xl mx-auto group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-300 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative bg-white border border-slate-200 shadow-sm rounded-[2rem] flex items-center p-2 pl-6 transition-shadow focus-within:shadow-md focus-within:border-orange-300">
            <Sparkles className="w-6 h-6 text-amber-500 mr-3 flex-shrink-0" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Viaje a Japón en primavera para dos personas..."
              className="flex-1 bg-transparent border-none text-slate-800 text-base md:text-lg focus:outline-none placeholder:text-slate-400 py-3 md:py-4 w-full truncate"
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="ml-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full p-4 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed group/btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
            >
              <Send className="w-5 h-5 translate-x-[-1px] group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onStartPlanning()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white shadow-sm px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <CalendarDays className="h-4 w-4 text-slate-500" />
            Planificar paso a paso
          </button>
          <button
            type="button"
            onClick={() => handleChatSubmit()}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 border border-orange-500/20 px-6 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-500/20 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            Conversar con IVI directo
          </button>
        </div>

        {/* Suggestions / Featured */}
        {featured.length > 0 && (
          <div className="mt-16 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">
              Sugerencias populares en {localeLabel}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {featured.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSuggestionClick(item.title)}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-full px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
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
