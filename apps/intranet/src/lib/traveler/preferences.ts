export type TravelerCardDensity = "comfortable" | "cozy" | "compact";

export type TravelerPreferencesState = {
  aiPersonalization: boolean;
  marketingEmails: boolean;
  instantAlerts: boolean;
  compactCards: boolean;
  cardDensity: TravelerCardDensity;
};

export const TRAVELER_PREFERENCES_STORAGE_KEY = "traveler:preferences:v1";
export const TRAVELER_PREFERENCES_EVENT = "traveler:preferences:changed";

export const DEFAULT_TRAVELER_PREFERENCES: TravelerPreferencesState = {
  aiPersonalization: true,
  marketingEmails: true,
  instantAlerts: true,
  compactCards: false,
  cardDensity: "comfortable",
};

function isCardDensity(value: unknown): value is TravelerCardDensity {
  return value === "comfortable" || value === "cozy" || value === "compact";
}

export function normalizeTravelerPreferences(
  raw?: Partial<TravelerPreferencesState> | null,
): TravelerPreferencesState {
  const compactCards = raw?.compactCards ?? false;
  const fallbackDensity: TravelerCardDensity = compactCards ? "compact" : "comfortable";
  return {
    aiPersonalization: raw?.aiPersonalization ?? DEFAULT_TRAVELER_PREFERENCES.aiPersonalization,
    marketingEmails: raw?.marketingEmails ?? DEFAULT_TRAVELER_PREFERENCES.marketingEmails,
    instantAlerts: raw?.instantAlerts ?? DEFAULT_TRAVELER_PREFERENCES.instantAlerts,
    compactCards,
    cardDensity: isCardDensity(raw?.cardDensity) ? raw.cardDensity : fallbackDensity,
  };
}

export function readTravelerPreferences(): TravelerPreferencesState {
  if (typeof window === "undefined") return DEFAULT_TRAVELER_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(TRAVELER_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_TRAVELER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<TravelerPreferencesState>;
    return normalizeTravelerPreferences(parsed);
  } catch {
    return DEFAULT_TRAVELER_PREFERENCES;
  }
}

export function writeTravelerPreferences(next: TravelerPreferencesState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRAVELER_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent(TRAVELER_PREFERENCES_EVENT, {
      detail: next,
    }),
  );
}

