"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTenant } from "@/contexts/tenant";
import { useTravelerCatalog } from "@/contexts/traveler-catalog";
import { getTenantBrandName } from "@/lib/tenant/presentation";
import { useSearchParams } from "next/navigation";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";

import ChatColumn from "./ChatColumn";
import { useAuth } from "../AuthContext";
import { Brain, ChatMessage, UserLite, guessLang } from "./types-and-utils";
import TravelerWorkspaceLayout from "../TravelerWorkspaceLayout";
import TravelerSalesSidebar from "../TravelerSalesSidebar";
import { useTravelerWorkspace } from "../TravelerWorkspaceContext";
import { loadBrainsForTenant } from "@/lib/traveler/brains";
import { normalizeAssistantOutput } from "@/lib/traveler/assistant-output";
import { trackTravelerEvent } from "@/lib/traveler/tracking";

const LANDING_PROMPT_STORAGE_KEY = "traveler:landingPrompt";

function pickBestChatBrain(brains: Brain[], preferredBrainId: string | null | undefined) {
  if (preferredBrainId) {
    const preferred = brains.find((brain) => brain.id === preferredBrainId);
    if (preferred) return preferred;
  }

  const byType =
    brains.find((brain) => brain.brain_type === "acompana")
    ?? brains.find((brain) => brain.brain_type === "inspira")
    ?? brains.find((brain) => brain.brain_type === "planifica");

  return byType ?? brains[0] ?? null;
}

export default function TravelerChatPage() {
  const { user: authUser } = useAuth();
  const tenant = useTenant();
  const { featured } = useTravelerCatalog();
  const searchParams = useSearchParams();
  const brandName = getTenantBrandName(tenant);
  const {
    chatMessages,
    setChatMessages,
    appendChatMessage,
    appendAssistantChunk,
    persistChatMessage,
    createNewChatSession,
    setInsightFromAiText,
    selectJourneyProduct,
    touchJourneyEntry,
    addBoardItem,
  } = useTravelerWorkspace();

  const [user, setUser] = useState<UserLite>({
    id: authUser?.id || null,
    name: authUser?.name || undefined,
    country: tenant.market?.countryCode || null,
    language: tenant.market?.languageCode || guessLang(),
    prefs: [],
  });

  const [brains, setBrains] = useState<Brain[]>([]);
  const [activeBrainId, setActiveBrainId] = useState<string | null>(null);

  const activeBrain = useMemo(() => brains.find((brain) => brain.id === activeBrainId) || null, [brains, activeBrainId]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [storedLandingPrompt, setStoredLandingPrompt] = useState("");
  const [isLandingPromptFlow, setIsLandingPromptFlow] = useState(false);
  const centerRef = useRef<HTMLDivElement>(null);
  const focusedProductRef = useRef<string | null>(null);
  const initialQueryRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(chatMessages);
  const messages = chatMessages;
  const fromLanding = (searchParams.get("from") || "").toLowerCase() === "landing";
  const queryFromLanding = (searchParams.get("q") || "").trim();
  const productFromCatalog = (searchParams.get("product") || "").trim();
  const landingPrompt = (queryFromLanding || storedLandingPrompt).trim();
  const suppressCatalogSuggestions = isLandingPromptFlow && productFromCatalog.length === 0;
  const catalogContext = useMemo(
    () =>
      suppressCatalogSuggestions
        ? ""
        : featured
            .map((item) => `ID: ${item.id} - ${item.title}${item.destination ? ` (${item.destination})` : ""}`)
            .join(" | "),
    [featured, suppressCatalogSuggestions],
  );

  useEffect(() => {
    if (productFromCatalog.length > 0) {
      setStoredLandingPrompt("");
      setIsLandingPromptFlow(false);
      return;
    }

    if (queryFromLanding.length > 0) {
      setStoredLandingPrompt("");
      setIsLandingPromptFlow(true);
      return;
    }

    if (!fromLanding) {
      setStoredLandingPrompt("");
      setIsLandingPromptFlow(false);
      return;
    }

    const storedPrompt = window.sessionStorage.getItem(LANDING_PROMPT_STORAGE_KEY)?.trim() || "";
    if (storedPrompt.length > 0) {
      setStoredLandingPrompt(storedPrompt);
      setIsLandingPromptFlow(true);
      window.sessionStorage.removeItem(LANDING_PROMPT_STORAGE_KEY);
      return;
    }

    setStoredLandingPrompt("");
    setIsLandingPromptFlow(false);
  }, [fromLanding, productFromCatalog, queryFromLanding]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && over.id === "board-droppable" && active.data.current?.offer) {
      addBoardItem(active.data.current.offer);
    }
  }

  useEffect(() => {
    messagesRef.current = chatMessages;
  }, [chatMessages]);

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

      if (tenant.kind === "agency" && !selectedBrain) {
        const noBrainMessage =
          "Esta agencia no tiene un brain traveler/frontend asignado. Configuralo en TheoCore (Agencias -> Brains asignados) y verifica el dominio de la agencia.";
        appendAssistantChunk(noBrainMessage);
        await persistChatMessage(
          {
            role: "assistant",
            content: noBrainMessage,
            ts: Date.now(),
          },
          null,
        );
        return;
      }

      const model = selectedBrain?.model || "gemini-2.5-flash";
      const baseInstruction = "You are a friendly, expert travel assistant. Your responses should be professional, concise, and helpful.";
      const brainConcept = selectedBrain?.strategic_concept || baseInstruction;
      const lang = user.language || tenant.market?.languageCode || "es";
      const marketContext = tenant.kind === "agency" && tenant.market
        ? `MARKET: Work for ${brandName} in ${tenant.market.countryCode}. Currency: ${tenant.market.currencyCode}. `
        : "";
      const catalogPrompt = catalogContext ? `CATALOG: Prioritize these offers when relevant: ${catalogContext}. Important: If you explicitly recommend a catalog product, you MUST include its tag exactly like this: [OFFER:product_id_here] on its own line to render a rich UI card. Use the actual product ID from the catalog list. ` : "";
      const prefsPrompt = (user.prefs && Object.keys(user.prefs).length > 0)
        ? `USER PROFILE PREFERENCES (USE THIS TO PERSONALIZE): ${JSON.stringify(user.prefs)}. `
        : "";

      let systemInstruction = `${marketContext}${catalogPrompt}${prefsPrompt}INSTRUCTION: Your entire response MUST be in ${lang}. `;
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
          messages: [...messagesRef.current, systemMessage, { role: "user", content: text, ts: now + 1 }],
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

      const finalAssistant = normalizeAssistantOutput(assistantBuffer);
      if (finalAssistant) {
        setChatMessages((current) => {
          if (current.length === 0) return current;
          const next = [...current];
          const lastIndex = next.length - 1;
          if (next[lastIndex].role !== "assistant") return current;
          next[lastIndex] = {
            ...next[lastIndex],
            content: finalAssistant,
            ts: Date.now(),
          };
          return next;
        });

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

      // Async trigger profile extraction directly (fire and forget)
      if (authUser?.id && messagesRef.current.length > 0 && messagesRef.current.length % 3 === 0) {
        fetch("/api/traveler/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recentMessages: [...messagesRef.current, userMessage].slice(-6) })
        }).catch(err => console.error("Pref extraction background error:", err));
      }
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
      `Quiero esta opciÃ³n: ${offer.title}. AjÃºstala para mi madre y para una estancia de 10 dÃ­as en Madrid.`,
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
    const focusedProductId = productFromCatalog;
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
  }, [featured, productFromCatalog, selectJourneyProduct, touchJourneyEntry]);

  useEffect(() => {
    let cancelled = false;
    const query = landingPrompt;
    const run = async () => {
      if (!query || initialQueryRef.current || !activeBrain || !isLandingPromptFlow) return;
      initialQueryRef.current = true;
      setInput(query);
      await createNewChatSession(activeBrain?.id ?? null);
      if (cancelled) return;
      // Ensure the first prompt starts from a clean chat context.
      messagesRef.current = [];
      setChatMessages([]);
      void sendMessage(query);
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingPrompt, activeBrain, createNewChatSession, isLandingPromptFlow]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const agencyId = tenant.kind === "agency" ? tenant.agency?.id ?? null : null;
      const geoCountry = tenant.market?.countryCode || tenant.agency?.countryCode || "ES";
      const geoLanguage = tenant.market?.languageCode || guessLang();
      
      let initialPrefs = {};
      try {
        if (authUser?.id) {
          const res = await fetch("/api/traveler/preferences");
          if (res.ok) {
            const data = await res.json();
            initialPrefs = data.preferences_json || {};
          }
        }
      } catch (e) {
        console.error("Failed to load global prefs", e);
      }

      if (cancelled) return;
      setUser({
        id: authUser?.id || null,
        name: authUser?.name || undefined,
        country: geoCountry,
        language: geoLanguage,
        prefs: Object.keys(initialPrefs).length > 0 ? [(initialPrefs as any)] : [],
      });

      const list = (await loadBrainsForTenant(agencyId, {
        executionLayer: "frontend",
        allowedCategories: ["traveler"],
      })) as unknown as Brain[];
      if (cancelled) return;
      setBrains(list);

      const nextBrain = pickBestChatBrain(list, tenant.market?.defaultBrainId);
      setActiveBrainId(nextBrain?.id ?? null);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [authUser, tenant]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
            showSuggestedOffers={!suppressCatalogSuggestions}
            isLandingPromptFlow={suppressCatalogSuggestions}
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
            hideRecommendations={suppressCatalogSuggestions}
          />
        }
      />
    </DndContext>
  );
}
