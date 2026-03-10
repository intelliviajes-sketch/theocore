"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_TRAVELER_PREFERENCES,
  normalizeTravelerPreferences,
  readTravelerPreferences,
  TRAVELER_PREFERENCES_EVENT,
  TRAVELER_PREFERENCES_STORAGE_KEY,
  writeTravelerPreferences,
  type TravelerCardDensity,
  type TravelerPreferencesState,
} from "@/lib/traveler/preferences";

export function useTravelerPreferences() {
  const [preferences, setPreferences] = useState<TravelerPreferencesState>(readTravelerPreferences);
  const skipNextPersistRef = useRef(false);
  const hydrated = true;

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TRAVELER_PREFERENCES_STORAGE_KEY) return;
      if (!event.newValue) {
        skipNextPersistRef.current = true;
        setPreferences(DEFAULT_TRAVELER_PREFERENCES);
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue) as Partial<TravelerPreferencesState>;
        skipNextPersistRef.current = true;
        setPreferences(normalizeTravelerPreferences(parsed));
      } catch {
        skipNextPersistRef.current = true;
        setPreferences(DEFAULT_TRAVELER_PREFERENCES);
      }
    };

    const onCustomEvent = (event: Event) => {
      const custom = event as CustomEvent<TravelerPreferencesState>;
      skipNextPersistRef.current = true;
      setPreferences(normalizeTravelerPreferences(custom.detail));
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(TRAVELER_PREFERENCES_EVENT, onCustomEvent as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TRAVELER_PREFERENCES_EVENT, onCustomEvent as EventListener);
    };
  }, []);

  const compactMode = false;
  const density: TravelerCardDensity = "cozy";

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    writeTravelerPreferences(preferences);
  }, [preferences, hydrated]);

  function updatePreferences(
    updater:
      | TravelerPreferencesState
      | ((current: TravelerPreferencesState) => TravelerPreferencesState),
  ) {
    setPreferences((current) => {
      const draft = typeof updater === "function" ? updater(current) : updater;
      return normalizeTravelerPreferences(draft);
    });
  }

  function setDensity(density: TravelerCardDensity) {
    updatePreferences((current) => normalizeTravelerPreferences({ ...current, cardDensity: density }));
  }

  function setCompactCards(compact: boolean) {
    updatePreferences((current) => normalizeTravelerPreferences({ ...current, compactCards: compact }));
  }

  return {
    preferences,
    hydrated,
    compactMode,
    density,
    updatePreferences,
    setDensity,
    setCompactCards,
  };
}
