"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Plane, Share2, X, MapPin, Calendar, Users, QrCode } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/travelers";

export function ShareTicketModal({
  isOpen,
  onClose,
  offer,
  currencyCode = "EUR",
}: {
  isOpen: boolean;
  onClose: () => void;
  offer: CatalogProduct | null;
  currencyCode?: string;
}) {
  const [sharing, setSharing] = useState(false);

  if (!offer) return null;

  const handleShare = async () => {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `¡Mira este viaje: ${offer.title}!`,
          text: `He encontrado esta increíble opción para viajar a ${offer.destination || "nuestro destino"}. ¡Echa un vistazo!`,
          url: window.location.href, // Or a specific public link if implemented
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Enlace copiado al portapapeles");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] transition-all">
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title as="h3" className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Plane className="h-5 w-5 text-amber-500" />
                    Boarding Pass
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-[2px] shadow-2xl">
                  {/* Outer glowing border effect wrapper */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 via-transparent to-amber-500/20 opacity-50 blur-xl"></div>
                  
                  <div className="relative flex flex-col rounded-[2rem] bg-amber-50 overflow-hidden">
                    {/* Top Section - Visuals */}
                    <div className="relative h-32 w-full bg-slate-200">
                      {offer.coverImage ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center" 
                          style={{ backgroundImage: `url(${offer.coverImage})` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600" />
                      )}
                      <div className="absolute inset-0 p-5 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold text-white border border-white/30">
                            VIP PASS
                          </span>
                          <Plane className="h-6 w-6 text-white/80 transform rotate-45" />
                        </div>
                        <h4 className="text-lg font-bold text-white leading-tight drop-shadow-md line-clamp-2">
                          {offer.title}
                        </h4>
                      </div>
                    </div>

                    {/* Middle Section - Details */}
                    <div className="relative px-5 py-6 bg-white border-b border-dashed border-slate-300">
                      <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-900 shadow-inner"></div>
                      <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-900 shadow-inner"></div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Destino</p>
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3.5 w-3.5 text-amber-500" />
                            {offer.destination || "Por definir"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Modalidad</p>
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                            <Users className="h-3.5 w-3.5 text-amber-500" />
                            {offer.productTypeName || "Viaje"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Fecha Estimada</p>
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3.5 w-3.5 text-amber-500" />
                            Flexible / A coordinar
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section - Action */}
                    <div className="px-5 py-5 bg-slate-50 flex items-center justify-between">
                      <div className="flex gap-2 items-center">
                        <QrCode className="h-10 w-10 text-slate-400" />
                        <div className="flex flex-col">
                           <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Booking Ref</span>
                           <span className="text-xs font-mono font-bold text-slate-700">{offer.id.substring(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-300 hover:to-amber-500 hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
                  >
                    {sharing ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {sharing ? "Generando link..." : "Compartir con un clic"}
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Copia un enlace mágico para enviarlo a tus compañeros de viaje.
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
