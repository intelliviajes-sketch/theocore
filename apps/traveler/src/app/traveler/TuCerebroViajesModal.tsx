"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { BrainCircuit, X, Activity, Target, Zap, Bot } from "lucide-react";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";

export function TuCerebroViajesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { insight } = useTravelerWorkspace();

  const intentColor = 
    insight.intent === "high" ? "bg-emerald-500 shadow-emerald-500/30" :
    insight.intent === "medium" ? "bg-amber-500 shadow-amber-500/30" : 
    "bg-slate-400 shadow-slate-400/30";

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 backdrop-blur-none"
          enterTo="opacity-100 backdrop-blur-md"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 backdrop-blur-md"
          leaveTo="opacity-0 backdrop-blur-none"
        >
          <div className="fixed inset-0 bg-slate-900/60 transition-all" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-8"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-8"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/40 p-1 text-left align-middle shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transition-all">
                <div className="rounded-[1.8rem] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <Dialog.Title as="h3" className="text-xl font-black text-slate-800 flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-600 shadow-inner">
                        <BrainCircuit className="h-6 w-6" />
                      </div>
                      Tu Cerebro Viajes
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Context State */}
                  <div className="space-y-6">
                    <section>
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                        <Activity className="h-4 w-4" />
                        Diagnóstico IA en Tiempo Real
                      </h4>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                           <div className="flex items-center gap-2">
                             <div className={`h-2.5 w-2.5 rounded-full ${intentColor} shadow-md animate-pulse`} />
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                               Intención: {insight.intent}
                             </span>
                           </div>
                        </div>
                        
                        <div className="pr-20">
                          <p className="text-sm font-medium text-slate-700 leading-relaxed">
                            {insight.summary}
                          </p>
                          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
                             <Bot className="h-3.5 w-3.5" />
                             Confidence Score: {(insight.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                        <Target className="h-4 w-4" />
                        Variables Deducidas
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                         {/* Estos toggles en el futuro se podrían editar */}
                         <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 flex justify-between items-center cursor-pointer hover:bg-amber-100/50 transition-colors">
                           <span className="text-sm font-semibold text-amber-900">Destino Claro</span>
                           <div className="h-5 w-8 rounded-full bg-amber-400 flex p-0.5 justify-end shadow-inner">
                             <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                           </div>
                         </div>
                         <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors">
                           <span className="text-sm font-semibold text-slate-600">Presupuesto</span>
                           <div className="h-5 w-8 rounded-full bg-slate-300 flex p-0.5 justify-start shadow-inner">
                             <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                           </div>
                         </div>
                         <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors">
                           <span className="text-sm font-semibold text-slate-600">Estilo Lujo</span>
                           <div className="h-5 w-8 rounded-full bg-slate-300 flex p-0.5 justify-start shadow-inner">
                             <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                           </div>
                         </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                        <Zap className="h-4 w-4" />
                        Próximas Acciones Sugeridas
                      </h4>
                      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-4">
                        <ul className="flex flex-col gap-3">
                          {insight.nextActions.map((action, i) => (
                            <li key={i} className="flex gap-3 text-sm text-blue-900 font-medium">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200/60 text-[10px] font-bold text-blue-700">
                                {i + 1}
                              </span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  </div>
                  
                  <div className="mt-8">
                     <button className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition-all active:scale-[0.98]">
                       Entendido
                     </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
