import type { FormEventHandler, MutableRefObject } from "react";
import { Brain, PlanMessage, UserLite, cn } from "./types-and-utils";

type PlanColumnProps = {
  messages: PlanMessage[];
  input: string;
  sending: boolean;
  activeBrain: Brain | null;
  user: UserLite;
  centerRef: MutableRefObject<HTMLDivElement | null>;
  setInput: (value: string) => void;
  onSend: FormEventHandler<HTMLFormElement>;
};

export default function PlanColumn({
  messages,
  input,
  sending,
  activeBrain,
  user,
  centerRef,
  setInput,
  onSend,
}: PlanColumnProps) {
  return (
    <section className="flex h-screen w-full transition-all duration-300">
      <div className="h-full w-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl">
        <div className="flex h-full w-full flex-col overflow-hidden border border-blue-100 bg-white">
          <div ref={centerRef} className="flex-1 space-y-1 overflow-auto p-6">
            {messages.length === 0 && (
              <div className="grid h-full place-items-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-cyan-100 text-4xl">
                    ✨
                  </div>
                  <p className="text-sm text-slate-500">
                    {activeBrain
                      ? `Iniciando tu experiencia personalizada con ${activeBrain.name}...`
                      : "Cargando agente..."}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((m, i) => (
                <div
                  key={`${m.ts}_${i}`}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-5 py-3",
                      m.role === "assistant"
                        ? "border border-blue-100 bg-gradient-to-br from-white to-blue-50 text-slate-800"
                        : m.role === "user"
                          ? "bg-gradient-to-r from-[#00D4FF] to-[#00B8E6] text-white shadow-lg shadow-cyan-500/20"
                          : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-blue-100 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 p-5">
            <form onSubmit={onSend} className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  user.language === "en"
                    ? "Type your message..."
                    : user.language === "ja"
                      ? "メッセージを入力..."
                      : "Escribe tu mensaje..."
                }
                className="flex-1 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={sending || !activeBrain}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-2xl text-white transition-all disabled:opacity-50"
              >
                {sending ? "⌛" : "🚀"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
