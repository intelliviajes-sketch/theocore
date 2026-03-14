"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/contexts/tenant";
import { useTravelerCatalog } from "@/contexts/traveler-catalog";
import { getTenantBrandName, getTenantLocaleLabel } from "@/lib/tenant/presentation";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";
import TravelerStartWizard from "./TravelerStartWizard";

const LANDING_PROMPT_STORAGE_KEY = "traveler:landingPrompt";

export default function TravelerLandingPage() {
  const router = useRouter();
  const tenant = useTenant();
  const { featured } = useTravelerCatalog();
  const { beginJourneyFromMode, updatePlanningState } = useTravelerWorkspace();

  const brandName = useMemo(() => getTenantBrandName(tenant), [tenant]);
  const localeLabel = useMemo(() => getTenantLocaleLabel(tenant), [tenant]);

  function onStartChat(initialMessage?: string) {
    beginJourneyFromMode("chat");
    const normalizedMessage = initialMessage?.trim() ?? "";
    if (normalizedMessage) {
      window.sessionStorage.setItem(LANDING_PROMPT_STORAGE_KEY, normalizedMessage);
    }
    const url = normalizedMessage
      ? `/traveler/chat?from=landing&q=${encodeURIComponent(normalizedMessage)}`
      : "/traveler/chat";
    router.push(url);
  }

  function onStartPlanning(prefill?: {
    typeId?: string;
    formData?: Record<string, unknown>;
  }) {
    if (prefill?.typeId) {
      updatePlanningState({
        selectedTypeId: prefill.typeId,
        selectedVersionId: null,
        formData: prefill.formData ?? {},
      });
    }
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
