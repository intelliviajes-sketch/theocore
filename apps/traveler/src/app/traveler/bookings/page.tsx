"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, ReceiptText } from "lucide-react";
import { useTravelerWorkspace } from "../TravelerWorkspaceContext";
import JourneyHistoryMini from "../JourneyHistoryMini";

function formatMoney(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toFixed(0)} ${currencyCode}`;
  }
}

export default function TravelerBookingsPage() {
  const router = useRouter();
  const { journeyState, setJourneyReservationStatus } = useTravelerWorkspace();
  const reservation = journeyState.reservation;

  const total = useMemo(() => {
    if (!reservation) return null;
    return formatMoney(reservation.subtotal, reservation.currencyCode);
  }, [reservation]);

  if (!reservation) {
    return (
      <div className="trav-page">
        <div className="trav-container max-w-4xl">
          <div className="trav-panel p-6 sm:p-8">
            <p className="trav-kicker">Reservas</p>
            <h1 className="trav-title">Sin reserva activa</h1>
            <p className="trav-subtitle">
              Aun no tienes una cotizacion creada. Puedes iniciar desde chat o planning.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/traveler/chat")}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Ir a chat
              </button>
              <button
                type="button"
                onClick={() => router.push("/traveler/planning")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ir a planning
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trav-page">
      <div className="trav-container max-w-5xl">
        <div className="trav-panel p-6 sm:p-8">
          <p className="trav-kicker">Reservas</p>
          <h1 className="trav-title">Tu cotizacion activa</h1>
          <p className="trav-subtitle">
            Estado actual: <span className="font-semibold">{reservation.status}</span>
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard title="Items" value={String(reservation.items.length)} />
            <StatCard title="Total" value={total || "-"} />
            <StatCard title="Estado" value={reservation.status} />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Detalle de items</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {reservation.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.productId}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatMoney(item.price, item.currencyCode)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setJourneyReservationStatus("pending_payment")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <CreditCard className="h-4 w-4" />
              Marcar pago pendiente
            </button>
            <button
              type="button"
              onClick={() => setJourneyReservationStatus("confirmed")}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar reserva
            </button>
            <button
              type="button"
              onClick={() => router.push("/traveler/chat")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <ArrowRight className="h-4 w-4" />
              Volver a chat
            </button>
          </div>

          {journeyState.supportCases.length > 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ReceiptText className="h-4 w-4" />
                Casos de soporte
              </p>
              <div className="mt-3 space-y-2">
                {journeyState.supportCases.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                      {item.type} - {item.status}
                    </p>
                    <p className="mt-1 text-xs text-slate-700">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <JourneyHistoryMini title="Historial de reservas y planning" maxItems={4} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
