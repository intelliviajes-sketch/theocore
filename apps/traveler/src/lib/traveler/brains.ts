type LoadBrainsOptions = {
  executionLayer?: "frontend" | "backend";
  allowedCategories?: string[];
};

type TravelerBrainsResponse = {
  brains?: unknown[];
};

function applyClientSideGuard(brains: unknown[], options?: LoadBrainsOptions) {
  if (!options) return brains;

  return brains.filter((value) => {
    if (!value || typeof value !== "object") return false;
    const brain = value as Record<string, unknown>;

    if (options.executionLayer && brain.execution_layer !== options.executionLayer) {
      return false;
    }

    if (options.allowedCategories && options.allowedCategories.length > 0) {
      if (typeof brain.brain_category !== "string") return false;
      if (!options.allowedCategories.includes(brain.brain_category)) return false;
    }

    return true;
  });
}

export async function loadBrainsForTenant(_agencyId: string | null, options?: LoadBrainsOptions) {
  try {
    const response = await fetch("/api/traveler/brains", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Error cargando brains del tenant:", response.status);
      return [] as unknown[];
    }

    const payload = (await response.json()) as TravelerBrainsResponse;
    const list = Array.isArray(payload.brains) ? payload.brains : [];
    return applyClientSideGuard(list, options);
  } catch (error) {
    console.error("Error cargando brains del tenant:", error);
    return [] as unknown[];
  }
}
