"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/contexts/tenant";
import { useTravelerCatalog } from "@/contexts/traveler-catalog";
import { getTenantBrandName, getTenantLocaleLabel } from "@/lib/tenant/presentation";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";
import TravelerStartWizard from "./TravelerStartWizard";

export default function TravelerLandingPage() {
  const router = useRouter();
  const tenant = useTenant();
  const { featured } = useTravelerCatalog();
  const { beginJourneyFromMode } = useTravelerWorkspace();

  const brandName = useMemo(() => getTenantBrandName(tenant), [tenant]);
  const localeLabel = useMemo(() => getTenantLocaleLabel(tenant), [tenant]);

  function onStartChat() {
    beginJourneyFromMode("chat");
    router.push("/traveler/chat");
  }

  function onStartPlanning() {
    beginJourneyFromMode("planning");
    router.push("/traveler/planning");
  }

  function onStartChatWithProduct(productId: string) {
    beginJourneyFromMode("chat");
    router.push(`/traveler/chat?product=${productId}`);
  }

  return (
    <div className="trav-page">
      <div className="trav-container">
        <TravelerStartWizard
          brandName={brandName}
          localeLabel={localeLabel}
          featuredItems={featured}
          onStartChat={onStartChat}
          onStartPlanning={onStartPlanning}
          onStartChatWithProduct={onStartChatWithProduct}
        />
      </div>
    </div>
  );
}
