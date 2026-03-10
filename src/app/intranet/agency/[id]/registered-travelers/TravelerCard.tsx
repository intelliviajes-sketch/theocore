import type { Traveler } from './types';

export default function TravelerCard({
  traveler,
  active = false,
  onClick,
}: {
  traveler: Traveler;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border bg-white p-4 text-left transition hover:shadow ${
        active ? 'border-cyan-400 shadow-md ring-2 ring-cyan-100' : 'border-slate-200'
      }`}
    >
      <div className="font-medium text-slate-800">{traveler.full_name}</div>
      <div className="mt-1 text-sm text-slate-500">{traveler.email}</div>
      {traveler.phone ? <div className="mt-2 text-xs text-slate-400">{traveler.phone}</div> : null}
    </button>
  );
}
