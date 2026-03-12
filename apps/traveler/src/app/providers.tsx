"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/system/ToastProvider";
import { TenantProvider } from "@/contexts/tenant";
import type { ResolvedTenant } from "@/lib/tenant/types";

export default function Providers({
  children,
  tenant,
}: {
  children: ReactNode;
  tenant: ResolvedTenant;
}) {
  return (
    <TenantProvider initialTenant={tenant}>
      <ToastProvider>{children}</ToastProvider>
    </TenantProvider>
  );
}
