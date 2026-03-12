"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ModalShell from "@/components/system/ModalShell";
import type { CatalogListItem } from "./types";

export default function CatalogQuickViewModal({
  item,
  open,
  onClose,
}: {
  item: CatalogListItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const fields = useMemo(() => {
    if (!item?.data || typeof item.data !== "object") return [] as Array<{ key: string; value: string }>;
    const rawFields =
      item.data && typeof item.data.fields === "object" && item.data.fields
        ? (item.data.fields as Record<string, unknown>)
        : (item.data as Record<string, unknown>);

    return Object.entries(rawFields)
      .map(([key, value]) => ({
        key,
        value: formatValue(value),
      }))
      .filter((entry) => entry.value.length > 0);
  }, [item]);

  const amenities = useMemo(() => {
    if (!item?.data || typeof item.data !== "object") {
      return [] as Array<{ key: string; values: Array<{ key: string; value: string }> }>;
    }

    const rawAmenities =
      item.data && typeof item.data.amenities === "object" && item.data.amenities
        ? (item.data.amenities as Record<string, unknown>)
        : null;

    if (!rawAmenities) return [] as Array<{ key: string; values: Array<{ key: string; value: string }> }>;

    return Object.entries(rawAmenities)
      .map(([amenityKey, amenityValue]) => {
        if (!amenityValue || typeof amenityValue !== "object" || Array.isArray(amenityValue)) {
          const formatted = formatValue(amenityValue);
          return formatted
            ? {
                key: amenityKey,
                values: [{ key: "value", value: formatted }],
              }
            : null;
        }

        const values = Object.entries(amenityValue as Record<string, unknown>)
          .map(([key, value]) => ({ key, value: formatValue(value) }))
          .filter((entry) => entry.value.length > 0);

        if (values.length === 0) return null;
        return {
          key: amenityKey,
          values,
        };
      })
      .filter((entry): entry is { key: string; values: Array<{ key: string; value: string }> } => !!entry);
  }, [item]);

  const images = item?.images ?? [];
  const safeIndex = images.length === 0 ? 0 : Math.min(activeIndex, images.length - 1);
  const activeImage = images[safeIndex] ?? null;

  if (!item) return null;

  function move(delta: number) {
    if (images.length <= 1) return;
    setActiveIndex((current) => {
      const next = current + delta;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={item.titleLabel}
      subtitle={item.summaryLabel}
      maxWidth="6xl"
      bodyClassName="min-h-0 flex-1 p-0"
      panelClassName="flex max-h-[92vh] flex-col dark:border dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.25fr_0.95fr]">
        <section className="min-h-0 border-b border-slate-200 p-6 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
            {activeImage ? (
              <img src={activeImage} alt={item.titleLabel} className="aspect-[16/10] h-full w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                Sin imagenes
              </div>
            )}

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-5">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`overflow-hidden rounded-2xl border ${index === safeIndex ? "border-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-900" : "border-slate-200 dark:border-slate-800"}`}
                >
                  <img src={image} alt={`${item.titleLabel} ${index + 1}`} className="aspect-square h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="min-h-0 overflow-y-auto p-6">
          <div className="grid gap-6">
            <InfoGrid item={item} />

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Campos
              </h3>
              {fields.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {fields.map((field) => (
                    <div key={field.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        {toLabel(field.key)}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{field.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Este producto todavia no tiene campos cargados.
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Amenities
              </h3>
              {amenities.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {amenities.map((amenity) => (
                    <div key={amenity.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        {toLabel(amenity.key)}
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {amenity.values.map((entry) => (
                          <div key={`${amenity.key}-${entry.key}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                              {entry.key === "value" ? "Detalle" : toLabel(entry.key)}
                            </div>
                            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{entry.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Este producto todavia no tiene amenities cargados.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </ModalShell>
  );
}

function InfoGrid({ item }: { item: CatalogListItem }) {
  const rows = [
    { label: "Tipo", value: item.productTypeName || "-" },
    { label: "Agencia", value: item.agencyName || "-" },
    { label: "Pais", value: item.country_code || "Global" },
    { label: "Origen", value: item.creation_source },
    { label: "Revision", value: item.review_status },
    { label: "Estado", value: item.active ? "Activo" : "Archivado" },
    { label: "Alta", value: item.createdLabel },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Resumen
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {row.label}
            </div>
            <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }
  return String(value).trim();
}

function toLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
