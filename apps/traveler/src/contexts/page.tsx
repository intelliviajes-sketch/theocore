"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";

export type Agency = {
  id: string;
  commercial_name: string;
  active: boolean;
};

type Mode = "global" | "agency";
type GlobalRole = "TheoCoreOwner" | null;

interface TheoCoreContextValue {
  mode: Mode;
  selectedAgency: Agency | null;
  agencies: Agency[];
  loading: boolean;
  globalRole: GlobalRole;
  setLoading: (isLoading: boolean) => void;
  changeMode: (mode: Mode) => void;
  selectAgency: (agency: Agency | null, options?: { force?: boolean }) => void;
  reloadAgencies: () => Promise<void>;
}

const TheoCoreContext = createContext<TheoCoreContextValue | undefined>(undefined);

export function TheoCoreProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("global");
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalRole, setGlobalRole] = useState<GlobalRole>(null);

  async function loadAgencies() {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, commercial_name, active")
        .eq("active", true)
        .order("commercial_name", { ascending: true });

      if (error) throw error;
      setAgencies(data || []);
    } catch (err) {
      console.error("Error cargando agencias:", err);
      setAgencies([]);
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadAgencies();

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      let nextGlobalRole: GlobalRole = null;

      if (uid) {
        const { data: coreUser } = await supabase
          .from("core_users")
          .select("role")
          .eq("user_id", uid)
          .maybeSingle();
        nextGlobalRole = coreUser?.role === "TheoCoreOwner" ? "TheoCoreOwner" : null;
      }
      setGlobalRole(nextGlobalRole);

      const savedMode = localStorage.getItem("theocore_mode") as Mode | null;
      const savedAgency = localStorage.getItem("theocore_agency");

      if (savedMode) setMode(savedMode);
      if (savedAgency) {
        try {
          setSelectedAgency(JSON.parse(savedAgency));
        } catch {
          setSelectedAgency(null);
        }
      }

      setLoading(false);
    }

    void init();
  }, []);

  useEffect(() => {
    localStorage.setItem("theocore_mode", mode);
    if (selectedAgency) {
      localStorage.setItem("theocore_agency", JSON.stringify(selectedAgency));
    } else {
      localStorage.removeItem("theocore_agency");
    }
  }, [mode, selectedAgency]);

  function changeMode(newMode: Mode) {
    setMode(newMode);
    if (newMode === "global") setSelectedAgency(null);
  }

  function selectAgency(agency: Agency | null, options?: { force?: boolean }) {
    if (!options?.force && selectedAgency?.id === agency?.id) return;
    setSelectedAgency(agency);
  }

  const value: TheoCoreContextValue = {
    mode,
    selectedAgency,
    agencies,
    loading,
    globalRole,
    setLoading,
    changeMode,
    selectAgency,
    reloadAgencies: loadAgencies,
  };

  return <TheoCoreContext.Provider value={value}>{children}</TheoCoreContext.Provider>;
}

export function useTheoCore() {
  const ctx = useContext(TheoCoreContext);
  if (!ctx) throw new Error("useTheoCore debe usarse dentro de <TheoCoreProvider>");
  return ctx;
}
