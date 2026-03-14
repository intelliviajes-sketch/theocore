"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import type { CatalogProduct } from "@/lib/catalog/travelers";
import type { ChatMessage } from "./chat/types-and-utils";
import {
  buildEmptyInsight,
  deriveCommercialInsightFromText,
  type CommercialInsight,
} from "@/lib/traveler/insights";
import { trackTravelerEvent } from "@/lib/traveler/tracking";

type PlanningWorkspaceState = {
  selectedTypeId: string;
  selectedVersionId: string | null;
  formData: Record<string, unknown>;
  generatedSummary: string;
  assistantNotes: string[];
  assistantReply: string;
  draftId: string | null;
  dirty: boolean;
  updatedAt: number | null;
};

type ChatSessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type JourneyStage = "explore" | "design" | "decide" | "booked" | "traveling";
export type JourneyCollaboratorRole = "traveler" | "companion" | "advisor";
export type JourneyReservationStatus = "draft" | "quoted" | "pending_payment" | "confirmed";
export type JourneySupportCaseType = "change_request" | "incident" | "billing" | "general";
export type JourneySupportCaseStatus = "open" | "in_progress" | "resolved";
export type JourneyEntryMode = "chat" | "planning";
export type JourneyEntryStatus =
  | "draft"
  | "in_progress"
  | "ready_to_quote"
  | "quoted"
  | "booked";

export type JourneyCollaborator = {
  id: string;
  name: string;
  email: string;
  role: JourneyCollaboratorRole;
  createdAt: number;
};

export type JourneyQuoteItem = {
  id: string;
  productId: string;
  title: string;
  price: number;
  currencyCode: string;
};

export type JourneyReservation = {
  id: string;
  status: JourneyReservationStatus;
  items: JourneyQuoteItem[];
  subtotal: number;
  currencyCode: string;
  paymentLink: string | null;
  createdAt: number;
  updatedAt: number;
};

export type JourneySupportCase = {
  id: string;
  type: JourneySupportCaseType;
  status: JourneySupportCaseStatus;
  message: string;
  createdAt: number;
  updatedAt: number;
};

export type JourneyHistoryEntry = {
  id: string;
  mode: JourneyEntryMode;
  title: string;
  status: JourneyEntryStatus;
  route: string;
  pinned: boolean;
  archived: boolean;
  updatedAt: number;
};

type JourneyChecklist = {
  chatStarted: boolean;
  planningStarted: boolean;
  quoteCreated: boolean;
  bookingConfirmed: boolean;
  supportReady: boolean;
};

type JourneyWorkspaceState = {
  activeStage: JourneyStage;
  selectedProductId: string | null;
  selectedDestination: string | null;
  collaborators: JourneyCollaborator[];
  reservation: JourneyReservation | null;
  supportCases: JourneySupportCase[];
  checklist: JourneyChecklist;
  boardItems: any[]; // The generic items saved into the interactive right board
  updatedAt: number | null;
};

type JourneyQuoteInputItem = {
  productId: string;
  title: string;
  price: number;
};

type TouchJourneyEntryPatch = {
  mode?: JourneyEntryMode;
  title?: string;
  status?: JourneyEntryStatus;
  route?: string;
};

type TravelerWorkspaceContextValue = {
  chatSessionId: string | null;
  chatSessions: ChatSessionSummary[];
  chatMessages: ChatMessage[];
  loadingChatSessions: boolean;
  setChatSessionId: (value: string | null) => void;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  appendChatMessage: (message: ChatMessage) => void;
  appendAssistantChunk: (chunk: string) => void;
  clearChatMessages: () => void;
  reloadChatSessions: () => Promise<void>;
  createNewChatSession: (brainId?: string | null) => Promise<string | null>;
  selectChatSession: (sessionId: string) => Promise<void>;
  ensureChatSession: (brainId?: string | null) => Promise<string | null>;
  persistChatMessage: (message: ChatMessage, brainId?: string | null) => Promise<void>;
  planningState: PlanningWorkspaceState;
  updatePlanningState: (patch: Partial<PlanningWorkspaceState>) => void;
  markPlanningSaved: (draftId?: string | null) => void;
  resetPlanningState: () => void;
  insight: CommercialInsight;
  setInsight: (insight: CommercialInsight) => void;
  setInsightFromAiText: (text: string, offers: CatalogProduct[]) => void;
  journeyState: JourneyWorkspaceState;
  journeyHistory: JourneyHistoryEntry[];
  activeJourneyEntryId: string | null;
  setJourneyStage: (stage: JourneyStage) => void;
  beginJourneyFromMode: (mode: JourneyEntryMode) => string;
  activateJourneyEntry: (entryId: string) => void;
  touchJourneyEntry: (patch: TouchJourneyEntryPatch) => void;
  togglePinJourneyEntry: (entryId: string) => void;
  archiveJourneyEntry: (entryId: string) => void;
  restoreJourneyEntry: (entryId: string) => void;
  deleteJourneyEntry: (entryId: string) => void;
  markPlanningStarted: () => void;
  selectJourneyProduct: (product: CatalogProduct | null) => void;
  setJourneyDestination: (destination: string | null) => void;
  addBoardItem: (item: any) => void;
  removeBoardItem: (itemId: string) => void;
  addJourneyCollaborator: (input: {
    name: string;
    email: string;
    role: JourneyCollaboratorRole;
  }) => void;
  removeJourneyCollaborator: (collaboratorId: string) => void;
  createJourneyQuote: (input: {
    items: JourneyQuoteInputItem[];
    currencyCode: string;
  }) => void;
  setJourneyReservationStatus: (status: JourneyReservationStatus) => void;
  openJourneySupportCase: (input: {
    type: JourneySupportCaseType;
    message: string;
  }) => void;
  setJourneySupportCaseStatus: (
    caseId: string,
    status: JourneySupportCaseStatus,
  ) => void;
  resetJourneyState: () => void;
};

const INITIAL_PLANNING_STATE: PlanningWorkspaceState = {
  selectedTypeId: "",
  selectedVersionId: null,
  formData: {},
  generatedSummary: "",
  assistantNotes: [],
  assistantReply: "",
  draftId: null,
  dirty: false,
  updatedAt: null,
};

const INITIAL_JOURNEY_STATE: JourneyWorkspaceState = {
  activeStage: "explore",
  selectedProductId: null,
  selectedDestination: null,
  collaborators: [],
  reservation: null,
  supportCases: [],
  checklist: {
    chatStarted: false,
    planningStarted: false,
    quoteCreated: false,
    bookingConfirmed: false,
    supportReady: false,
  },
  boardItems: [],
  updatedAt: null,
};

const WORKSPACE_STORAGE_KEY = "traveler:workspace:v2";
const STAGE_ORDER: Record<JourneyStage, number> = {
  explore: 1,
  design: 2,
  decide: 3,
  booked: 4,
  traveling: 5,
};
const MODE_ROUTE: Record<JourneyEntryMode, string> = {
  chat: "/traveler/chat",
  planning: "/traveler/planning",
};

const TravelerWorkspaceContext = createContext<TravelerWorkspaceContextValue | null>(
  null,
);

function toChatMessageRow(message: ChatMessage, userId: string | null) {
  return {
    user_id: userId,
    role: message.role,
    content: message.content,
    metadata: {
      source: "traveler",
    },
  };
}

function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function isLocalChatSessionId(sessionId: string | null) {
  return Boolean(sessionId && sessionId.startsWith("local_chat_"));
}

function buildChatErrorLog(error: unknown) {
  if (!error) return { message: "Unknown error" };
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      message: typeof record.message === "string" ? record.message : null,
      code: typeof record.code === "string" ? record.code : null,
      details: typeof record.details === "string" ? record.details : null,
      hint: typeof record.hint === "string" ? record.hint : null,
      status: typeof record.status === "number" ? record.status : null,
    };
  }
  return { message: String(error) };
}

function promoteStage(current: JourneyStage, candidate: JourneyStage) {
  return STAGE_ORDER[candidate] > STAGE_ORDER[current] ? candidate : current;
}

function normalizeHistory(entries: JourneyHistoryEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

function createJourneyHistoryEntry(mode: JourneyEntryMode): JourneyHistoryEntry {
  const now = Date.now();
  return {
    id: createClientId("journey"),
    mode,
    title: mode === "chat" ? "Chat con IVI" : "Planning de viaje",
    status: "draft",
    route: MODE_ROUTE[mode],
    pinned: false,
    archived: false,
    updatedAt: now,
  };
}

function hydrateJourneyHistoryEntry(entry: JourneyHistoryEntry) {
  return {
    ...entry,
    pinned: Boolean(entry.pinned),
    archived: Boolean(entry.archived),
  };
}

function restoreWorkspaceSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      planningState?: PlanningWorkspaceState;
      insight?: CommercialInsight;
      journeyState?: JourneyWorkspaceState;
      journeyHistory?: JourneyHistoryEntry[];
      activeJourneyEntryId?: string | null;
    };
    return parsed;
  } catch {
    return null;
  }
}

export function TravelerWorkspaceProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const chatSessionIdRef = useRef<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChatSessions, setLoadingChatSessions] = useState(false);
  const [planningState, setPlanningState] = useState<PlanningWorkspaceState>(
    INITIAL_PLANNING_STATE,
  );
  const [insight, setInsight] = useState<CommercialInsight>(buildEmptyInsight());
  const [journeyState, setJourneyState] =
    useState<JourneyWorkspaceState>(INITIAL_JOURNEY_STATE);
  const [journeyHistory, setJourneyHistory] = useState<JourneyHistoryEntry[]>([]);
  const [activeJourneyEntryId, setActiveJourneyEntryId] = useState<string | null>(
    null,
  );
  const [restoredWorkspace, setRestoredWorkspace] = useState(false);
  const lastIntentHighAt = useRef<number | null>(null);

  useEffect(() => {
    chatSessionIdRef.current = chatSessionId;
  }, [chatSessionId]);

  const reloadChatSessions = useCallback(async () => {
    if (!userId) {
      setChatSessions([]);
      return;
    }

    setLoadingChatSessions(true);
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id, title, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setChatSessions(
        (data ?? []).map((item) => ({
          id: item.id,
          title: item.title || "Nueva conversacion",
          updatedAt: item.updated_at || new Date().toISOString(),
        })),
      );
    } catch (loadError) {
      console.error("Error cargando sesiones de chat traveler:", loadError);
      setChatSessions([]);
    } finally {
      setLoadingChatSessions(false);
    }
  }, [userId]);

  async function loadMessagesForSession(sessionId: string) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const mapped = (data ?? []).map((item) => ({
      role: item.role as ChatMessage["role"],
      content: item.content,
      ts: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
    }));

    setChatMessages(mapped);
  }

  async function selectChatSession(sessionId: string) {
    chatSessionIdRef.current = sessionId;
    setChatSessionId(sessionId);
    try {
      await loadMessagesForSession(sessionId);
    } catch (loadError) {
      console.error("Error cargando mensajes de sesion:", loadError);
      setChatMessages([]);
    }
  }

  async function createNewChatSession(brainId?: string | null) {
    if (!userId) {
      const localSessionId = createClientId("local_chat");
      chatSessionIdRef.current = localSessionId;
      setChatSessionId(localSessionId);
      setChatMessages([]);
      setChatSessions((current) => [
        {
          id: localSessionId,
          title: "Conversacion local",
          updatedAt: new Date().toISOString(),
        },
        ...current.filter((session) => session.id !== localSessionId),
      ]);
      return localSessionId;
    }

    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: userId,
          brain_id: brainId ?? null,
          title: "Nueva conversacion",
        })
        .select("id, title, updated_at")
        .single();

      if (error) throw error;
      if (!data?.id) return null;

      chatSessionIdRef.current = data.id;
      setChatSessionId(data.id);
      setChatMessages([]);
      setChatSessions((current) => [
        {
          id: data.id,
          title: data.title || "Nueva conversacion",
          updatedAt: data.updated_at || new Date().toISOString(),
        },
        ...current.filter((session) => session.id !== data.id),
      ]);
      return data.id;
    } catch (createError) {
      const localSessionId = createClientId("local_chat");
      console.warn(
        "Error creando sesion de chat traveler en Supabase. Se usara sesion local.",
        buildChatErrorLog(createError),
      );
      chatSessionIdRef.current = localSessionId;
      setChatSessionId(localSessionId);
      setChatMessages([]);
      setChatSessions((current) => [
        {
          id: localSessionId,
          title: "Conversacion local",
          updatedAt: new Date().toISOString(),
        },
        ...current.filter((session) => session.id !== localSessionId),
      ]);
      return localSessionId;
    }
  }

  async function ensureChatSession(brainId?: string | null) {
    if (chatSessionIdRef.current) return chatSessionIdRef.current;
    return createNewChatSession(brainId);
  }

  async function persistChatMessage(message: ChatMessage, brainId?: string | null) {
    try {
      const sessionId = await ensureChatSession(brainId);
      if (!sessionId) return;
      if (!userId || isLocalChatSessionId(sessionId)) return;

      const { error: insertError } = await supabase.from("chat_messages").insert({
        session_id: sessionId,
        ...toChatMessageRow(message, userId),
      });
      if (insertError) throw insertError;

      const titleCandidate =
        message.role === "user"
          ? message.content.trim().slice(0, 60) || "Nueva conversacion"
          : undefined;

      const { error: sessionUpdateError } = await supabase
        .from("chat_sessions")
        .update({
          updated_at: new Date().toISOString(),
          ...(brainId ? { brain_id: brainId } : {}),
          ...(titleCandidate ? { title: titleCandidate } : {}),
        })
        .eq("id", sessionId);
      if (sessionUpdateError) throw sessionUpdateError;

      if (userId) {
        void reloadChatSessions();
      }
    } catch (persistError) {
      console.error("Error persistiendo mensaje traveler:", persistError);
    }
  }

  function setJourneyStage(stage: JourneyStage) {
    setJourneyState((current) => ({
      ...current,
      activeStage: stage,
      updatedAt: Date.now(),
    }));
  }

  function beginJourneyFromMode(mode: JourneyEntryMode) {
    const entry = createJourneyHistoryEntry(mode);
    setJourneyHistory((current) => normalizeHistory([entry, ...current]));
    setActiveJourneyEntryId(entry.id);
    setJourneyState((current) => ({
      ...current,
      activeStage:
        mode === "planning"
          ? promoteStage(current.activeStage, "design")
          : current.activeStage,
      checklist: {
        ...current.checklist,
        chatStarted: mode === "chat" ? true : current.checklist.chatStarted,
        planningStarted:
          mode === "planning" ? true : current.checklist.planningStarted,
      },
      updatedAt: Date.now(),
    }));
    return entry.id;
  }

  function activateJourneyEntry(entryId: string) {
    setActiveJourneyEntryId(entryId);
    setJourneyHistory((current) =>
      normalizeHistory(
        current.map((item) =>
          item.id === entryId ? { ...item, updatedAt: Date.now() } : item,
        ),
      ),
    );
  }

  function touchJourneyEntry(patch: TouchJourneyEntryPatch) {
    const now = Date.now();
    if (!activeJourneyEntryId) {
      const mode = patch.mode ?? "chat";
      const entry: JourneyHistoryEntry = {
        ...createJourneyHistoryEntry(mode),
        title: patch.title || (mode === "chat" ? "Chat con IVI" : "Planning de viaje"),
        status: patch.status ?? "in_progress",
        route: patch.route ?? MODE_ROUTE[mode],
        archived: false,
        updatedAt: now,
      };
      setJourneyHistory((current) => normalizeHistory([entry, ...current]));
      setActiveJourneyEntryId(entry.id);
      return;
    }

    setJourneyHistory((current) =>
      normalizeHistory(
        current.map((item) => {
          if (item.id !== activeJourneyEntryId) return item;
          return {
            ...item,
            mode: patch.mode ?? item.mode,
            title: patch.title ?? item.title,
            status: patch.status ?? item.status,
            route: patch.route ?? item.route,
            archived: false,
            updatedAt: now,
          };
        }),
      ),
    );
  }

  function togglePinJourneyEntry(entryId: string) {
    setJourneyHistory((current) =>
      normalizeHistory(
        current.map((item) =>
          item.id === entryId
            ? { ...item, pinned: !item.pinned, updatedAt: Date.now() }
            : item,
        ),
      ),
    );
  }

  function archiveJourneyEntry(entryId: string) {
    setJourneyHistory((current) =>
      normalizeHistory(
        current.map((item) =>
          item.id === entryId
            ? { ...item, archived: true, pinned: false, updatedAt: Date.now() }
            : item,
        ),
      ),
    );
    setActiveJourneyEntryId((current) => (current === entryId ? null : current));
  }

  function restoreJourneyEntry(entryId: string) {
    setJourneyHistory((current) =>
      normalizeHistory(
        current.map((item) =>
          item.id === entryId
            ? { ...item, archived: false, updatedAt: Date.now() }
            : item,
        ),
      ),
    );
  }

  function deleteJourneyEntry(entryId: string) {
    setJourneyHistory((current) => current.filter((item) => item.id !== entryId));
    setActiveJourneyEntryId((current) => (current === entryId ? null : current));
  }

  function appendChatMessage(message: ChatMessage) {
    setChatMessages((current) => [...current, message]);
    if (message.role === "user" && message.content.trim().length > 0) {
      touchJourneyEntry({
        mode: "chat",
        title: message.content.trim().slice(0, 64),
        status: "in_progress",
        route: MODE_ROUTE.chat,
      });
    } else {
      touchJourneyEntry({
        mode: "chat",
        status: "in_progress",
        route: MODE_ROUTE.chat,
      });
    }
    setJourneyState((current) => ({
      ...current,
      checklist: { ...current.checklist, chatStarted: true },
      updatedAt: Date.now(),
    }));
  }

  function appendAssistantChunk(chunk: string) {
    setChatMessages((current) => {
      if (current.length === 0) {
        return [{ role: "assistant", content: chunk, ts: Date.now() }];
      }

      const lastIndex = current.length - 1;
      const last = current[lastIndex];
      if (last.role !== "assistant") {
        return [...current, { role: "assistant", content: chunk, ts: Date.now() }];
      }

      const next = [...current];
      next[lastIndex] = {
        ...last,
        content: `${last.content}${chunk}`,
      };
      return next;
    });
  }

  function clearChatMessages() {
    setChatMessages([]);
  }

  function updatePlanningState(patch: Partial<PlanningWorkspaceState>) {
    setPlanningState((current) => ({
      ...current,
      ...patch,
      dirty: true,
      updatedAt: Date.now(),
    }));
    touchJourneyEntry({
      mode: "planning",
      status: "in_progress",
      route: MODE_ROUTE.planning,
    });
    setJourneyState((current) => ({
      ...current,
      activeStage: promoteStage(current.activeStage, "design"),
      checklist: { ...current.checklist, planningStarted: true },
      updatedAt: Date.now(),
    }));
  }

  function markPlanningSaved(draftId?: string | null) {
    setPlanningState((current) => ({
      ...current,
      draftId: draftId === undefined ? current.draftId : draftId,
      dirty: false,
      updatedAt: Date.now(),
    }));
    touchJourneyEntry({
      mode: "planning",
      status: "ready_to_quote",
      route: MODE_ROUTE.planning,
    });
    setJourneyState((current) => ({
      ...current,
      activeStage: promoteStage(current.activeStage, "design"),
      checklist: { ...current.checklist, planningStarted: true },
      updatedAt: Date.now(),
    }));
  }

  function resetPlanningState() {
    setPlanningState(INITIAL_PLANNING_STATE);
  }

  function markPlanningStarted() {
    touchJourneyEntry({
      mode: "planning",
      status: "in_progress",
      route: MODE_ROUTE.planning,
    });
    setJourneyState((current) => ({
      ...current,
      activeStage: promoteStage(current.activeStage, "design"),
      checklist: { ...current.checklist, planningStarted: true },
      updatedAt: Date.now(),
    }));
  }

  function selectJourneyProduct(product: CatalogProduct | null) {
    setJourneyState((current) => ({
      ...current,
      selectedProductId: product?.id ?? null,
      selectedDestination: product?.destination ?? current.selectedDestination,
      activeStage: product ? promoteStage(current.activeStage, "design") : current.activeStage,
      updatedAt: Date.now(),
    }));
  }

  function setJourneyDestination(destination: string | null) {
    setJourneyState((current) => ({
      ...current,
      selectedDestination: destination,
      updatedAt: Date.now(),
    }));
  }

  function addBoardItem(item: any) {
    setJourneyState((current) => ({
      ...current,
      boardItems: [...current.boardItems, { ...item, _id: createClientId("board") }],
      updatedAt: Date.now(),
    }));

    // CRM Lead Sync: Detect High-Intent / High-Ticket actions
    try {
      let price = 0;
      if (item?.data) {
        const keys = ["price", "precio", "amount", "total", "base_price", "price_from"];
        for (const key of keys) {
          const value = item.data[key];
          if (typeof value === "number") price = value;
          else if (typeof value === "string") price = Number(value.replace(",", ".").replace(/[^0-9.-]/g, "")) || 0;
          if (price > 0) break;
        }
      }
      if (price >= 1000) {
        trackTravelerEvent("high_ticket_lead_captured", {
          productId: item.id,
          title: item.title,
          price: price,
        });
      }
    } catch (err) {
      console.error("CRM Lead Sync Error", err);
    }
  }

  function removeBoardItem(itemId: string) {
    setJourneyState((current) => ({
      ...current,
      boardItems: current.boardItems.filter((i) => i._id !== itemId),
      updatedAt: Date.now(),
    }));
  }

  function addJourneyCollaborator(input: {
    name: string;
    email: string;
    role: JourneyCollaboratorRole;
  }) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || !email) return;

    setJourneyState((current) => {
      if (current.collaborators.some((item) => item.email === email)) return current;
      const collaborator: JourneyCollaborator = {
        id: createClientId("col"),
        name,
        email,
        role: input.role,
        createdAt: Date.now(),
      };
      return {
        ...current,
        collaborators: [collaborator, ...current.collaborators],
        updatedAt: Date.now(),
      };
    });
  }

  function removeJourneyCollaborator(collaboratorId: string) {
    setJourneyState((current) => ({
      ...current,
      collaborators: current.collaborators.filter((item) => item.id !== collaboratorId),
      updatedAt: Date.now(),
    }));
  }

  function createJourneyQuote(input: {
    items: JourneyQuoteInputItem[];
    currencyCode: string;
  }) {
    const items = input.items.filter((item) => item.productId && item.title);
    if (items.length === 0) return;

    setJourneyState((current) => {
      const normalizedItems: JourneyQuoteItem[] = items.map((item) => ({
        id: createClientId("quote_item"),
        productId: item.productId,
        title: item.title,
        price: Math.max(0, Number(item.price) || 0),
        currencyCode: input.currencyCode,
      }));
      const subtotal = normalizedItems.reduce((acc, item) => acc + item.price, 0);
      const quoteId = createClientId("quote");
      return {
        ...current,
        reservation: {
          id: quoteId,
          status: "quoted",
          items: normalizedItems,
          subtotal,
          currencyCode: input.currencyCode,
          paymentLink: `/traveler/checkout/${quoteId}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        activeStage: promoteStage(current.activeStage, "decide"),
        checklist: { ...current.checklist, quoteCreated: true },
        updatedAt: Date.now(),
      };
    });
    touchJourneyEntry({ status: "quoted" });
  }

  function setJourneyReservationStatus(status: JourneyReservationStatus) {
    setJourneyState((current) => {
      if (!current.reservation) return current;

      const nextStage =
        status === "confirmed"
          ? promoteStage(current.activeStage, "booked")
          : status === "pending_payment"
            ? promoteStage(current.activeStage, "decide")
            : current.activeStage;

      return {
        ...current,
        reservation: {
          ...current.reservation,
          status,
          updatedAt: Date.now(),
        },
        activeStage: nextStage,
        checklist: {
          ...current.checklist,
          bookingConfirmed: status === "confirmed" ? true : current.checklist.bookingConfirmed,
        },
        updatedAt: Date.now(),
      };
    });

    if (status === "confirmed") {
      touchJourneyEntry({ status: "booked" });
    } else if (status === "pending_payment") {
      touchJourneyEntry({ status: "quoted" });
    }
  }

  function openJourneySupportCase(input: {
    type: JourneySupportCaseType;
    message: string;
  }) {
    const message = input.message.trim();
    if (!message) return;

    setJourneyState((current) => ({
      ...current,
      supportCases: [
        {
          id: createClientId("support"),
          type: input.type,
          status: "open",
          message,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ...current.supportCases,
      ],
      activeStage:
        current.reservation?.status === "confirmed"
          ? promoteStage(current.activeStage, "traveling")
          : current.activeStage,
      checklist: { ...current.checklist, supportReady: true },
      updatedAt: Date.now(),
    }));
  }

  function setJourneySupportCaseStatus(
    caseId: string,
    status: JourneySupportCaseStatus,
  ) {
    setJourneyState((current) => ({
      ...current,
      supportCases: current.supportCases.map((item) =>
        item.id === caseId ? { ...item, status, updatedAt: Date.now() } : item,
      ),
      updatedAt: Date.now(),
    }));
  }

  function resetJourneyState() {
    setJourneyState(INITIAL_JOURNEY_STATE);
    setJourneyHistory([]);
    setActiveJourneyEntryId(null);
  }

  function setInsightFromAiText(text: string, offers: CatalogProduct[]) {
    const next = deriveCommercialInsightFromText(text, offers);
    setInsight(next);

    setJourneyState((current) => {
      let stage = current.activeStage;
      if (next.intent === "medium") stage = promoteStage(stage, "design");
      if (next.intent === "high") {
        stage =
          current.reservation?.status === "confirmed"
            ? promoteStage(stage, "booked")
            : promoteStage(stage, "decide");
      }

      return {
        ...current,
        activeStage: stage,
        checklist: { ...current.checklist, chatStarted: true },
        updatedAt: Date.now(),
      };
    });

    if (next.intent === "high") {
      const now = Date.now();
      const lastTracked = lastIntentHighAt.current ?? 0;
      if (now - lastTracked > 60_000) {
        trackTravelerEvent("intent_high", {
          confidence: next.confidence,
          summary: next.summary,
        });
        lastIntentHighAt.current = now;
      }
    }
  }

  useEffect(() => {
    if (restoredWorkspace) return;
    const snapshot = restoreWorkspaceSnapshot();
    if (!snapshot) {
      setRestoredWorkspace(true);
      return;
    }

    if (snapshot.planningState) {
      setPlanningState((current) => ({ ...current, ...snapshot.planningState }));
    }
    if (snapshot.insight) {
      setInsight(snapshot.insight);
    }
    if (snapshot.journeyState) {
      setJourneyState((current) => ({ ...current, ...snapshot.journeyState }));
    }
    if (snapshot.journeyHistory) {
      setJourneyHistory(
        normalizeHistory(snapshot.journeyHistory.map(hydrateJourneyHistoryEntry)),
      );
    }
    if (typeof snapshot.activeJourneyEntryId !== "undefined") {
      setActiveJourneyEntryId(snapshot.activeJourneyEntryId);
    }
    setRestoredWorkspace(true);
  }, [restoredWorkspace]);

  useEffect(() => {
    if (!restoredWorkspace || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify({
          planningState,
          insight,
          journeyState,
          journeyHistory,
          activeJourneyEntryId,
        }),
      );
    } catch {
      // ignore local storage write errors
    }
  }, [
    planningState,
    insight,
    journeyState,
    journeyHistory,
    activeJourneyEntryId,
    restoredWorkspace,
  ]);

  useEffect(() => {
    if (userId) {
      void reloadChatSessions();
      return;
    }
    setChatSessions([]);
  }, [userId, reloadChatSessions]);

  const value: TravelerWorkspaceContextValue = {
    chatSessionId,
    chatSessions,
    chatMessages,
    loadingChatSessions,
    setChatSessionId,
    setChatMessages,
    appendChatMessage,
    appendAssistantChunk,
    clearChatMessages,
    reloadChatSessions,
    createNewChatSession,
    selectChatSession,
    ensureChatSession,
    persistChatMessage,
    planningState,
    updatePlanningState,
    markPlanningSaved,
    resetPlanningState,
    insight,
    setInsight,
    setInsightFromAiText,
    journeyState,
    journeyHistory,
    activeJourneyEntryId,
    setJourneyStage,
    beginJourneyFromMode,
    activateJourneyEntry,
    touchJourneyEntry,
    togglePinJourneyEntry,
    archiveJourneyEntry,
    restoreJourneyEntry,
    deleteJourneyEntry,
    markPlanningStarted,
    selectJourneyProduct,
    setJourneyDestination,
    addBoardItem,
    removeBoardItem,
    addJourneyCollaborator,
    removeJourneyCollaborator,
    createJourneyQuote,
    setJourneyReservationStatus,
    openJourneySupportCase,
    setJourneySupportCaseStatus,
    resetJourneyState,
  };

  return (
    <TravelerWorkspaceContext.Provider value={value}>
      {children}
    </TravelerWorkspaceContext.Provider>
  );
}

export function useTravelerWorkspace() {
  const context = useContext(TravelerWorkspaceContext);
  if (!context) {
    throw new Error("useTravelerWorkspace debe usarse dentro de <TravelerWorkspaceProvider>");
  }
  return context;
}
