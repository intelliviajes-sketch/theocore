"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { useTenant } from "@/contexts/tenant";
import { useTravelerCatalog } from "@/contexts/traveler-catalog";
import { getTenantBrandName } from "@/lib/tenant/presentation";
import { useSearchParams } from "next/navigation";

import ChatColumn from "./ChatColumn";
import { useAuth } from "../AuthContext";
import { Brain, ChatMessage, UserLite, guessLang } from "./types-and-utils";
import TravelerWorkspaceLayout from "../TravelerWorkspaceLayout";
import TravelerSalesSidebar from "../TravelerSalesSidebar";
import { useTravelerWorkspace } from "../TravelerWorkspaceContext";
import { trackTravelerEvent } from "@/lib/traveler/tracking";

async function loadBrainsForTenant(agencyId: string | null) {
  if (agencyId) {
    const { data: links, error: linksError } = await supabase
      .from("agencies_ai_assistants")
      .select("ai_assistant_id")
      .eq("agency_id", agencyId);

    if (linksError) {
      console.error("Error cargando links de brains:", linksError);
    }

    const linkedBrainIds = (links ?? []).map((item) => item.ai_assistant_id).filter(Boolean);
    if (linkedBrainIds.length > 0) {
      const { data: agencyBrains, error: brainsError } = await supabase
        .from("ai_assistants")
        .select("*")
        .in("id", linkedBrainIds)
        .eq("active", true);

      if (brainsError) {
        console.error("Error cargando brains asignados:", brainsError);
      } else {
        const resolvedAgencyBrains = (agencyBrains ?? []) as Brain[];
        if (resolvedAgencyBrains.length > 0) {
          return resolvedAgencyBrains;
        }
      }
    }
  }

  const { data: globalBrains, error: globalBrainsError } = await supabase
    .from("ai_assistants")
    .select("*")
    .eq("active", true)
    .in("scope", ["global", "agency"]);

  if (globalBrainsError) {
    console.error("Error cargando brains globales:", globalBrainsError);
    return [] as Brain[];
  }

  return (globalBrains ?? []) as Brain[];
}

export default function TravelerChatPage() {
  const { user: authUser } = useAuth();
  const tenant = useTenant();
  const { featured } = useTravelerCatalog();
  const searchParams = useSearchParams();
  const brandName = getTenantBrandName(tenant);
  const {
    chatMessages,
    appendChatMessage,
    appendAssistantChunk,
    persistChatMessage,
    setInsightFromAiText,
    selectJourneyProduct,
    touchJourneyEntry,
  } = useTravelerWorkspace();

  const [user, setUser] = useState<UserLite>({
    id: authUser?.id || null,
    name: authUser?.name || undefined,
    country: tenant.market?.countryCode || null,
    language: tenant.market?.languageCode || guessLang(),
    prefs: [],
  });

  const [brains, setBrains] = useState<Brain[]>([]);
  const [activeBrainId, setActiveBrainId] = useState<string | null>(tenant.market?.defaultBrainId ?? null);
  const activeBrain = useMemo(() => brains.find((brain) => brain.id === activeBrainId) || null, [brains, activeBrainId]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const centerRef = useRef<HTMLDivElement>(null);
  const focusedProductRef = useRef<string | null>(null);
  const messages = chatMessages;
  const catalogContext = useMemo(
    () => featured.map((item) => `${item.title}${item.destination ? ` (${item.destination})` : ""}`).join(", "),
    [featured],
  );

  function pushMessage(message: ChatMessage) {
    appendChatMessage(message);
    requestAnimationFrame(() => {
      centerRef.current?.scrollTo({ top: centerRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || sending) return;

    setSending(true);
    const now = Date.now();
    const selectedBrain = activeBrain;
    const userMessage: ChatMessage = { role: "user", content: text, ts: now };
    pushMessage(userMessage);
    if (rawText === input) {
      setInput("");
    }
    pushMessage({ role: "assistant", content: "", ts: now + 1 });

    try {
      await persistChatMessage(userMessage, selectedBrain?.id);

      const model = selectedBrain?.model || "gemini-2.5-flash";
      const baseInstruction = "You are a friendly, expert travel assistant. Your responses should be professional, concise, and helpful.";
      const brainConcept = selectedBrain?.strategic_concept || baseInstruction;
      const lang = user.language || tenant.market?.languageCode || "es";
      const marketContext = tenant.kind === "agency" && tenant.market
        ? `MARKET: Work for ${brandName} in ${tenant.market.countryCode}. Currency: ${tenant.market.currencyCode}. `
        : "";
      const catalogPrompt = catalogContext ? `CATALOG: Prioritize these offers when relevant: ${catalogContext}. ` : "";

      let systemInstruction = `${marketContext}${catalogPrompt}INSTRUCTION: Your entire response MUST be in ${lang}. `;
      if (user.name) {
        systemInstruction += `Address the user as ${user.name} and maintain a personalized tone. `;
      }
      systemInstruction += `CONTEXT: ${brainConcept}`;

      const systemMessage: ChatMessage = {
        role: "system",
        content: systemInstruction,
        ts: now - 1000,
      };

      const res = await fetch("/api/chat?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          responseProfile: "ivi_travel",
          brain: selectedBrain ?? null,
          messages: [...messages, systemMessage, { role: "user", content: text, ts: now + 1 }],
        }),
      });
      if (!res.ok) {
        let apiError = `Error ${res.status}`;
        try {
          const payload = await res.json();
          if (payload?.error && typeof payload.error === "string") {
            apiError = payload.error;
          }
        } catch {
          // ignore JSON parse errors for non-json responses
        }
        throw new Error(apiError);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No se recibio stream de respuesta.");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (buffer.length > 0) {
            const lines = buffer.split("\n");
            const eventData: string[] = [];
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const raw = line.substring(5);
              const data = raw.startsWith(" ") ? raw.slice(1) : raw;
              if (data.trim() === "[DONE]") continue;
              eventData.push(data);
            }
            if (eventData.length > 0) {
              const eventText = eventData.join("\n");
              assistantBuffer += eventText;
              appendAssistantChunk(eventText);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let eventEndIndex = buffer.indexOf("\n\n");
        while (eventEndIndex !== -1) {
          const event = buffer.substring(0, eventEndIndex);
          const lines = event.split("\n");
          const eventData: string[] = [];
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.substring(5);
            const data = raw.startsWith(" ") ? raw.slice(1) : raw;
            if (data.trim() === "[DONE]") continue;
            eventData.push(data);
          }
          if (eventData.length > 0) {
            const eventText = eventData.join("\n");
            assistantBuffer += eventText;
            appendAssistantChunk(eventText);
          }
          buffer = buffer.substring(eventEndIndex + 2);
          eventEndIndex = buffer.indexOf("\n\n");
        }
      }

      const finalAssistant = assistantBuffer.trim();
      if (finalAssistant) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: finalAssistant,
          ts: Date.now(),
        };
        await persistChatMessage(assistantMessage, selectedBrain?.id);
        setInsightFromAiText(finalAssistant, featured);
      }
    } catch (chatError) {
      console.error("Error en chat traveler:", chatError);
      appendAssistantChunk("No pude responder en este momento. Verifica el brain activo y la configuracion de la API.");
    } finally {
      setSending(false);
    }
  }

  async function onSend() {
    await sendMessage(input);
  }

  async function onSelectOffer(offer: (typeof featured)[number]) {
    selectJourneyProduct(offer);
    touchJourneyEntry({
      mode: "chat",
      title: `Chat: ${offer.title}`,
      status: "in_progress",
      route: "/traveler/chat",
    });
    trackTravelerEvent("select_product", {
      productId: offer.id,
      title: offer.title,
      source: "chat-cards",
    });
    await sendMessage(
      `Quiero esta opción: ${offer.title}. Ajústala para mi madre y para una estancia de 10 días en Madrid.`,
    );
  }

  useEffect(() => {
    trackTravelerEvent("open_chat", {
      tenantKind: tenant.kind,
      agencyId: tenant.agency?.id ?? null,
    });
    touchJourneyEntry({
      mode: "chat",
      status: "in_progress",
      route: "/traveler/chat",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const focusedProductId = searchParams.get("product");
    if (!focusedProductId || focusedProductRef.current === focusedProductId) {
      return;
    }

    const focused = featured.find((item) => item.id === focusedProductId);
    if (!focused) {
      return;
    }

    focusedProductRef.current = focusedProductId;
    selectJourneyProduct(focused);
    touchJourneyEntry({
      mode: "chat",
      title: `Chat: ${focused.title}`,
      status: "in_progress",
      route: "/traveler/chat",
    });
    setInput((current) => {
      if (current.trim().length > 0) return current;
      return `Quiero cotizar este producto: ${focused.title}.`;
    });
    trackTravelerEvent("focus_product", {
      productId: focused.id,
      title: focused.title,
      source: "catalog",
    });
  }, [featured, searchParams, selectJourneyProduct, touchJourneyEntry]);

  useEffect(() => {
    (async () => {
      const geoCountry = tenant.market?.countryCode || tenant.agency?.countryCode || "ES";
      const geoLanguage = tenant.market?.languageCode || guessLang();
      setUser({
        id: authUser?.id || null,
        name: authUser?.name || undefined,
        country: geoCountry,
        language: geoLanguage,
        prefs: [],
      });

      const list = await loadBrainsForTenant(tenant.agency?.id ?? null);
      setBrains(list);

      const preferredBrainId = tenant.market?.defaultBrainId;
      const preferredBrain = preferredBrainId ? list.find((brain) => brain.id === preferredBrainId) : null;
      const nextBrain = preferredBrain || list[0] || null;

      setActiveBrainId(nextBrain?.id ?? null);
    })();
  }, [authUser, tenant, brandName]);

  return (
    <TravelerWorkspaceLayout
      left={
        <ChatColumn
          messages={messages}
          input={input}
          sending={sending}
          activeBrain={activeBrain}
          user={user}
          setInput={setInput}
          offers={featured}
          onSelectOffer={(offer) => {
            void onSelectOffer(offer);
          }}
          onSend={(event) => {
            event.preventDefault();
            void onSend();
          }}
          centerRef={centerRef}
        />
      }
      right={
        <TravelerSalesSidebar
          mode="chat"
          offers={featured}
          brandName={brandName}
          currencyCode={tenant.market?.currencyCode || "EUR"}
        />
      }
    />
  );
}
