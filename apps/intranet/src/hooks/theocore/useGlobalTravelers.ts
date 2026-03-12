"use client";

import { useCallback, useEffect, useState } from "react";
import {
  archiveTraveler,
  getTravelerLinkCountMap,
  listTravelers,
  saveTraveler,
  setTravelerActive,
} from "@/features/travelers/api";
import type { TravelerLinkCountMap, TravelerRow, TravelerSavePayload } from "@/features/travelers/types";

export type { TravelerRow, TravelerSavePayload };

export function useGlobalTravelers() {
  const [loading, setLoading] = useState(true);
  const [travelers, setTravelers] = useState<TravelerRow[]>([]);
  const [travelerLinkCount, setTravelerLinkCount] = useState<TravelerLinkCountMap>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [travelersData, linksData] = await Promise.all([listTravelers(), getTravelerLinkCountMap()]);
      setTravelers(travelersData);
      setTravelerLinkCount(linksData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveTravelerMutation = useCallback(async (payload: TravelerSavePayload) => {
    await saveTraveler(payload);
  }, []);

  const toggleTraveler = useCallback(async (traveler: Pick<TravelerRow, "id" | "active">) => {
    await setTravelerActive(traveler.id, !traveler.active);
  }, []);

  const deleteTraveler = useCallback(async (travelerId: string) => {
    await archiveTraveler(travelerId);
  }, []);

  return {
    loading,
    travelers,
    travelerLinkCount,
    reload,
    saveTraveler: saveTravelerMutation,
    toggleTraveler,
    deleteTraveler,
  };
}
