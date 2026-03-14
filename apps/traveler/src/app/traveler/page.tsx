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
  const { beginJourneyFromMode, updatePlanningState, setPendingChatPrompt } = useTravelerWorkspace();

  const brandName = useMemo(() => getTenantBrandName(tenant), [tenant]);
  const localeLabel = useMemo(() => getTenantLocaleLabel(tenant), [tenant]);

  function onStartChat(initialMessage?: string) {
    beginJourneyFromMode("chat");
    const normalizedMessage = initialMessage?.trim() ?? "";
    setPendingChatPrompt(normalizedMessage || null);
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
    <div className="trav-page relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] min-w-[360px] lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.94)_0%,rgba(30,41,59,0.9)_36%,rgba(124,45,18,0.9)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(560px_300px_at_88%_12%,rgba(251,191,36,0.45),transparent_72%),radial-gradient(420px_220px_at_14%_80%,rgba(251,146,60,0.38),transparent_75%)]" />
        <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#f8fafc] to-transparent" />
      </div>
      <div className="trav-container relative z-10">
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
