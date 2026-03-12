"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { ResolvedTenant } from "@/lib/tenant/types";

const TenantContext = createContext<ResolvedTenant | null>(null);

export function TenantProvider({
  children,
  initialTenant,
}: {
  children: ReactNode;
  initialTenant: ResolvedTenant;
}) {
  return <TenantContext.Provider value={initialTenant}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const tenant = useContext(TenantContext);
  if (!tenant) {
    throw new Error("useTenant debe usarse dentro de <TenantProvider>");
  }
  return tenant;
}
