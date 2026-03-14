"use client";

export type TravelerEventName =
  | "view_product"
  | "start_planning"
  | "intent_high"
  | "start_checkout"
  | "open_chat"
  | "save_draft"
  | "focus_product"
  | "select_product"
  | "create_quote"
  | "update_reservation"
  | "add_collaborator"
  | "open_support_case"
  | "high_ticket_lead_captured";

export type TravelerEventPayload = Record<string, unknown>;

type StoredEvent = {
  name: TravelerEventName;
  payload: TravelerEventPayload;
  ts: number;
};

const STORAGE_KEY = "traveler:event-log";

function readStoredEvents(): StoredEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredEvent[]) : [];
  } catch {
    return [];
  }
}

function writeStoredEvents(events: StoredEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-200)));
  } catch {
    // ignore storage quota issues
  }
}

export function trackTravelerEvent(name: TravelerEventName, payload: TravelerEventPayload = {}) {
  const event: StoredEvent = {
    name,
    payload,
    ts: Date.now(),
  };

  if (typeof window !== "undefined") {
    const current = readStoredEvents();
    writeStoredEvents([...current, event]);

    window.dispatchEvent(new CustomEvent("traveler:tracking", { detail: event }));
  }

  // keep it observable in dev without external analytics dependency
  console.info(`[traveler:event] ${name}`, payload);
}
