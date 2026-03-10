"use client";

import type { ReactNode } from "react";
import { TheoCoreProvider } from "@/contexts/page";

export default function IntranetLayout({ children }: { children: ReactNode }) {
  return (
    <TheoCoreProvider>
      <div className="intranet-wrapper">{children}</div>
    </TheoCoreProvider>
  );
}
