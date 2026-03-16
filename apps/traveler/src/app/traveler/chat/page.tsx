"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTenant } from "@/contexts/tenant";
import { useTravelerCatalog } from "@/contexts/traveler-catalog";
import { getTenantBrandName } from "@/lib/tenant/presentation";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  normalizeStructuredChatResponse,
  type StructuredChatResponse,
  type ChatStage,
} from "@/lib/chat/structured";

const LANDING_PROMPT_STORAGE_KEY = "traveler:landingPrompt";
// Landing handoff flow:
// /traveler -> /traveler/chat?from=landing&q=...
// The first prompt must auto-send exactly once and preserve conversation state.

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

function mapStructuredStageToJourney(stage?: ChatStage) {
  if (!stage) return null;
  if (stage === "discover") return "explore" as const;
  if (stage === "qualify" || stage === "compare") return "design" as const;
  if (stage === "decide" || stage === "prepare") return "decide" as const;
  return null;
}

function chunkAssistantText(text: string) {
  const normalized = text.trim();
  if (!normalized) return [] as string[];
  const tokens = normalized.split(/(\s+)/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const token of tokens) {
    current += token;
    if (current.length >= 28) {
      chunks.push(current);
      current = "";
    }
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function TravelerChatPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const tenant = useTenant();
  const { featured } = useTravelerCatalog();
  const searchParams = useSearchParams();
  const brandName = getTenantBrandName(tenant);
  const {
    pendingChatPrompt,
    setPendingChatPrompt,
    chatMessages,
    setChatMessages,
    appendChatMessage,
    appendAssistantChunk,
    persistChatMessage,
    setInsightFromAiText,
    selectJourneyProduct,
    setJourneyDestination,
    setJourneyStage,
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
  const [brainsLoaded, setBrainsLoaded] = useState(false);

  const activeBrain = useMemo(() => brains.find((brain) => brain.id === activeBrainId) || null, [brains, activeBrainId]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [storedLandingPrompt, setStoredLandingPrompt] = useState("");
  const [isLandingPromptFlow, setIsLandingPromptFlow] = useState(false);
  const [showLandingProcessing, setShowLandingProcessing] = useState(true);
  const [structuredByMessageTs, setStructuredByMessageTs] = useState<Record<number, StructuredChatResponse>>({});
  const [hasMessagesEver, setHasMessagesEver] = useState(false);
  const centerRef = useRef<HTMLDivElement>(null);
  const focusedProductRef = useRef<string | null>(null);
  const initialQueryRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(chatMessages);
  const messages = chatMessages;
  const fromLanding = (searchParams.get("from") || "").toLowerCase() === "landing";
  const queryFromLanding = (searchParams.get("q") || "").trim();
  const productFromCatalog = (searchParams.get("product") || "").trim();
  const pendingPrompt = pendingChatPrompt?.trim() ?? "";
  const landingPrompt = (queryFromLanding || storedLandingPrompt || pendingPrompt).trim();
  const suppressCatalogSuggestions = isLandingPromptFlow && productFromCatalog.length === 0;
  const landingUiSuppression = suppressCatalogSuggestions && !hasMessagesEver;
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
    if (messages.length > 0) {
      setHasMessagesEver(true);
    }
  }, [messages.length]);

  useEffect(() => {
    if (productFromCatalog.length > 0) {
      setStoredLandingPrompt("");
      setIsLandingPromptFlow(false);
      setShowLandingProcessing(true);
      if (pendingChatPrompt) setPendingChatPrompt(null);
      return;
    }

    if (queryFromLanding.length > 0) {
      setStoredLandingPrompt("");
      setIsLandingPromptFlow(true);
      setShowLandingProcessing(true);
      return;
    }

    if (pendingPrompt.length > 0) {
      setStoredLandingPrompt("");
      setIsLandingPromptFlow(true);
      setShowLandingProcessing(true);
      return;
    }

    if (!fromLanding) {
      setStoredLandingPrompt("");
      setIsLandingPromptFlow(false);
      setShowLandingProcessing(true);
      return;
    }

    const storedPrompt = window.sessionStorage.getItem(LANDING_PROMPT_STORAGE_KEY)?.trim() || "";
    if (storedPrompt.length > 0) {
      setStoredLandingPrompt(storedPrompt);
      setIsLandingPromptFlow(true);
      setShowLandingProcessing(true);
      window.sessionStorage.removeItem(LANDING_PROMPT_STORAGE_KEY);
      return;
    }

    setStoredLandingPrompt("");
    setIsLandingPromptFlow(false);
    setShowLandingProcessing(true);
  }, [fromLanding, pendingChatPrompt, pendingPrompt, productFromCatalog, queryFromLanding, setPendingChatPrompt]);

  useEffect(() => {
    if (!landingUiSuppression || messages.length > 0) {
      setShowLandingProcessing(true);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowLandingProcessing(false);
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [landingUiSuppression, messages.length, landingPrompt]);

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
    const assistantTs = now + 1;
    const selectedBrain = activeBrain;
    const userMessage: ChatMessage = { role: "user", content: text, ts: now };
    pushMessage(userMessage);
    if (rawText === input) {
      setInput("");
    }
    pushMessage({ role: "assistant", content: "", ts: assistantTs });

    try {
      await persistChatMessage(userMessage, selectedBrain?.id);

      if (tenant.kind === "agency" && brainsLoaded && !selectedBrain) {
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

      const payloadMessages = [...messagesRef.current, systemMessage, { role: "user", content: text, ts: now + 1 }];
      let structuredHandled = false;

      try {
        const structuredRes = await fetch("/api/chat?stream=0", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            responseFormat: "structured",
            responseProfile: "ivi_travel",
            brain: selectedBrain ?? null,
            messages: payloadMessages,
          }),
        });
        if (!structuredRes.ok) {
          let apiError = `Error ${structuredRes.status}`;
          try {
            const payload = await structuredRes.json();
            if (payload?.error && typeof payload.error === "string") {
              apiError = payload.error;
            }
          } catch {
            // ignore JSON parse errors for non-json responses
          }
          throw new Error(apiError);
        }

        const payload = await structuredRes.json().catch(() => ({}));
        const structured = normalizeStructuredChatResponse(payload?.structured ?? payload);
        const finalAssistant = normalizeAssistantOutput(structured.message);
        if (!finalAssistant) {
          throw new Error("Respuesta estructurada vacia.");
        }

        const chunks = chunkAssistantText(finalAssistant);
        for (let i = 0; i < chunks.length; i += 1) {
          appendAssistantChunk(chunks[i]);
          if (i < chunks.length - 1) {
            await wait(22);
          }
        }

        setChatMessages((current) => {
          if (current.length === 0) return current;
          const next = [...current];
          const lastIndex = next.length - 1;
          if (next[lastIndex].role !== "assistant") return current;
          next[lastIndex] = {
            ...next[lastIndex],
            content: finalAssistant,
          };
          return next;
        });

        setStructuredByMessageTs((current) => ({
          ...current,
          [assistantTs]: structured,
        }));

        const mappedStage = mapStructuredStageToJourney(structured.tripStatePatch.stage);
        if (mappedStage) {
          setJourneyStage(mappedStage);
        }
        const destinationFromPatch = structured.tripSnapshot?.destination
          || structured.tripStatePatch.destinationCandidates?.[0]
          || null;
        if (destinationFromPatch) {
          setJourneyDestination(destinationFromPatch);
        }
        const selectedIds = structured.tripStatePatch.selectedProductIds ?? [];
        const selectedFromPatch = selectedIds
          .map((productId) => featured.find((offer) => offer.id === productId))
          .find(Boolean);
        if (selectedFromPatch) {
          selectJourneyProduct(selectedFromPatch);
        } else if (structured.catalogCards.length > 0) {
          const selectedFromCards = structured.catalogCards
            .map((card) => featured.find((offer) => offer.id === card.id))
            .find(Boolean);
          if (selectedFromCards) {
            selectJourneyProduct(selectedFromCards);
          }
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: finalAssistant,
          ts: assistantTs,
        };
        await persistChatMessage(assistantMessage, selectedBrain?.id);
        setInsightFromAiText(finalAssistant, featured);
        structuredHandled = true;
      } catch (structuredError) {
        console.error("Structured chat fallback:", structuredError);
      }

      if (structuredHandled) {
        return;
      }

      const res = await fetch("/api/chat?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          responseProfile: "ivi_travel",
          brain: selectedBrain ?? null,
          messages: payloadMessages,
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
          };
          return next;
        });

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: finalAssistant,
          ts: assistantTs,
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

  async function onQuickReplySelect(value: string) {
    const next = value.trim();
    if (!next) return;
    await sendMessage(next);
  }

  async function onStructuredCardSelect(cardId: string, cardTitle: string) {
    const matchedOffer = featured.find((offer) => offer.id === cardId) || null;
    if (matchedOffer) {
      selectJourneyProduct(matchedOffer);
      touchJourneyEntry({
        mode: "chat",
        title: `Chat: ${matchedOffer.title}`,
        status: "in_progress",
        route: "/traveler/chat",
      });
      await sendMessage(`Quiero profundizar en esta opcion: ${matchedOffer.title}.`);
      return;
    }
    await sendMessage(`Quiero explorar esta propuesta: ${cardTitle}.`);
  }

  async function onStructuredCta(action: string, label: string) {
    const normalizedAction = action.trim().toLowerCase();
    if (normalizedAction === "open_planning") {
      touchJourneyEntry({
        mode: "planning",
        title: "Planning guiado",
        status: "in_progress",
        route: "/traveler/planning",
      });
      router.push("/traveler/planning");
      return;
    }
    if (normalizedAction === "show_options") {
      await sendMessage("Muestrame opciones concretas para comparar.");
      return;
    }
    if (normalizedAction === "refine") {
      await sendMessage("Quiero refinar esta propuesta con mas detalle.");
      return;
    }
    await sendMessage(label || "Continuar");
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
      `Quiero esta opcion: ${offer.title}. Ajustala para mi madre y para una estancia de 10 dias en Madrid.`,
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
    const query = landingPrompt;
    const run = async () => {
      if (!query || initialQueryRef.current || !isLandingPromptFlow) return;
      if (sending) return;
      if (tenant.kind === "agency" && !brainsLoaded) return;
      initialQueryRef.current = true;
      setInput("");
      setPendingChatPrompt(null);
      // Ensure the first prompt starts from a clean chat context.
      messagesRef.current = [];
      setChatMessages([]);
      setStructuredByMessageTs({});
      void sendMessage(query);
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brainsLoaded, landingPrompt, sending, tenant.kind, activeBrain, isLandingPromptFlow, setPendingChatPrompt]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setBrainsLoaded(false);
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

      try {
        const list = (await loadBrainsForTenant(agencyId, {
          executionLayer: "frontend",
          allowedCategories: ["traveler"],
        })) as unknown as Brain[];
        if (cancelled) return;
        setBrains(list);

        const nextBrain = pickBestChatBrain(list, tenant.market?.defaultBrainId);
        setActiveBrainId(nextBrain?.id ?? null);
      } catch (loadBrainsError) {
        console.error("Error loading traveler brains:", loadBrainsError);
        if (cancelled) return;
        setBrains([]);
        setActiveBrainId(null);
      } finally {
        if (!cancelled) {
          setBrainsLoaded(true);
        }
      }
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
            user={user}
            setInput={setInput}
            offers={featured}
            activeBrain={activeBrain}
            structuredByMessageTs={structuredByMessageTs}
            showSuggestedOffers={!suppressCatalogSuggestions}
            isLandingPromptFlow={landingUiSuppression}
            showLandingProcessing={landingUiSuppression && showLandingProcessing}
            onSelectOffer={(offer) => {
              void onSelectOffer(offer);
            }}
            onQuickReplySelect={(value) => {
              void onQuickReplySelect(value);
            }}
            onStructuredCardSelect={(cardId, cardTitle) => {
              void onStructuredCardSelect(cardId, cardTitle);
            }}
            onStructuredCta={(action, label) => {
              void onStructuredCta(action, label);
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
