export default function GlobalTravelerPanel({ traveler }: any) {
  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-semibold">
        {traveler.full_name}
      </h2>

      <div className="text-sm text-slate-600 space-y-1">
        <div>Email: {traveler.email}</div>
        <div>
          Creado:{' '}
          {new Date(traveler.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className="pt-4 border-t">
        <h3 className="font-medium mb-2">
          Agencias asociadas
        </h3>

        {traveler.agencies?.length ? (
          traveler.agencies.map((a: any, i: number) => (
            <div key={i} className="text-sm">
              {a.agency_id} ({a.status})
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-400">
            No asociado a ninguna agencia
          </div>
        )}
      </div>

      {/* TODO (FASE 2): resolver duplicados */}
      {/* TODO (FASE 3): preferencias globales */}
    </div>
  );
}
