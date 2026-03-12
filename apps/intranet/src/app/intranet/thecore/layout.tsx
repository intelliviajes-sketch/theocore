"use client";

import { ReactNode } from "react";
import { useTheoCore } from "../../../contexts/page";
import Header from "../../../components/intracore/Header";

function LayoutInner({ children }: { children: ReactNode }) {
  const { selectedAgency } = useTheoCore();

  const ActiveHeader = selectedAgency ? Header : Header;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-slate-950">
      <ActiveHeader />
      <main className="px-4 pt-4 md:px-8">{children}</main>
    </div>
  );
}

export default function IntranetTheoCoreLayout({ children }: { children: ReactNode }) {
  return <LayoutInner>{children}</LayoutInner>;
}
