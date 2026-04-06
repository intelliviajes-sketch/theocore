/**
 * /api/chat
 * - stream=true  -> SSE chunks
 * - stream=false -> JSON { reply } or { structured }
 */

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { resolveTenantFromRequest } from "@/lib/tenant/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  normalizeStructuredChatResponse,
  STRUCTURED_CHAT_RESPONSE_SCHEMA,
  type ChatMessageInput,
  type ChatResponseFormat,
} from "@/lib/chat/structured";

const DEFAULT_MODEL = "gemini-flash-lite-latest";
const MODEL_FALLBACKS = [
  DEFAULT_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
] as const;

type Brain = Record<string, unknown> | null;
type ResponseProfile = "default" | "ivi_travel";
type GeminiContent = { role: "user" | "model"; parts: { text: string }[] };
type InputRole = ChatMessageInput["role"];
type AssignedBrain = {
  id: string;
  name: string | null;
  active: boolean | null;
  model: string | null;
  brain_type: string | null;
  target_lang: string | null;
  language_priority: string[] | null;
  system_prompt: string | null;
  strategic_concept: string | null;
  identity_profile: Record<string, unknown> | null;
  business_rules: Record<string, unknown> | null;
};
type BrainPersona = {
  id: string | null;
  name: string | null;
  target_lang: string | null;
  language_priority: string[];
  system_prompt: string | null;
  strategic_concept: string | null;
  identity_profile: Record<string, unknown>;
  business_rules: Record<string, unknown>;
};

function jsonHeaders() {
  return { "Content-Type": "application/json; charset=utf-8" };
}

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Transfer-Encoding": "chunked",
    "X-Accel-Buffering": "no",
  };
}

function okJSON(data: unknown, status = 200) {
  return new NextResponse(JSON.stringify(data), { status, headers: jsonHeaders() });
}

function bad(message: string, status = 400) {
  return okJSON({ error: message }, status);
}

function getGeminiApiKey() {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  );
}

function getModelCandidates(model: string) {
  const requested = (model || DEFAULT_MODEL).trim();
  return Array.from(new Set([requested, ...MODEL_FALLBACKS].filter(Boolean)));
}

function shouldTryNextModel(error: unknown) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const status =
    typeof record?.status === "number"
      ? record.status
      : typeof record?.code === "number"
        ? record.code
        : null;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  if (message.includes("api key")) return false;

  return (
    status === 404 ||
    status === 429 ||
    status === 503 ||
    message.includes("model") ||
    message.includes("not found") ||
    message.includes("unsupported") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("high demand")
  );
}

function userFacingAiError(error: unknown) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const status =
    typeof record?.status === "number"
      ? record.status
      : typeof record?.code === "number"
        ? record.code
        : null;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted")
  ) {
    return "Error IA: limite de uso alcanzado. Espera un momento e intenta de nuevo.";
  }
  if (message.includes("api key")) {
    return "Error IA: falta configurar la clave Gemini en el servidor.";
  }
  if (message.includes("model")) {
    return "Error IA: el modelo configurado no esta disponible. Se recomienda gemini-2.5-flash.";
  }
  return "Error de la IA: No se pudo generar una respuesta.";
}

function splitSystem(messages: ChatMessageInput[]) {
  const system = messages.find((message) => message.role === "system")?.content || "";
  const rest = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : message.role,
      parts: [{ text: message.content }],
    })) as GeminiContent[];
  return { system, rest };
}

function sanitizeMessages(input: unknown): ChatMessageInput[] {
  if (!Array.isArray(input)) return [];

  const allowedRoles = new Set<InputRole>(["system", "user", "assistant"]);
  const sanitized: ChatMessageInput[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const role = String(row.role ?? "") as InputRole;
    if (!allowedRoles.has(role)) continue;

    const content = typeof row.content === "string" ? row.content.trim() : "";
    if (!content) continue;

    sanitized.push({ role, content });
  }

  return sanitized;
}

function buildStructuredInstruction(system: string) {
  const contractHint = [
    "Respond only with valid JSON.",
    "Use the structured contract provided in the schema.",
    "message must contain the main assistant response.",
    "quickReplies must contain 0 to 4 next-step suggestions.",
    "catalogCards should be used when recommending real offers or products.",
    "comparisonItems should be used when comparing options.",
    "tripStatePatch should only include fields learned from the conversation.",
    "cta should be null unless there is a clear next action.",
  ].join(" ");
  return system ? `${system}\n\n${contractHint}` : contractHint;
}

function buildResponseProfileInstruction(profile: ResponseProfile) {
  if (profile !== "ivi_travel") return "";

  return [
    "Eres IVI, guia experto y cercano para viajes.",
    "Responde siempre en espanol y usa Markdown visual.",
    "Reglas obligatorias de formato:",
    "1) Jerarquia clara: usa titulos ## y subtitulos ###.",
    "2) Escaneabilidad: usa **negritas** para lugares, nombres y consejos clave.",
    "3) Presentacion: usa listas con vietas y evita bloques densos.",
    "4) Separacion visual: usa una linea horizontal --- antes de consejos adicionales.",
    "5) Si comparas opciones o precios, usa tablas Markdown.",
    "6) Tono: profesional, empatico y con chispa moderada.",
    "7) Cierre: termina siempre con una pregunta clara para avanzar.",
    "Estructura recomendada:",
    "## Resumen",
    "## Plan Propuesto",
    "### Itinerario",
    "### Acciones clave",
    "---",
    "## Consejos adicionales",
    "## Siguiente paso",
    "Si faltan datos, pide solo lo esencial (maximo 4 preguntas).",
    "No uses JSON ni bloques de codigo para responder al usuario.",
  ].join("\n");
}

function buildSystemInstruction(system: string, profile: ResponseProfile) {
  const profileInstruction = buildResponseProfileInstruction(profile);
  if (!profileInstruction) return system;
  return system ? `${system}\n\n${profileInstruction}` : profileInstruction;
}

function normalizeResponseProfile(value: unknown): ResponseProfile {
  return value === "ivi_travel" ? "ivi_travel" : "default";
}

function normalizeAssistantText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeModelName(value: unknown, fallback = DEFAULT_MODEL) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => Boolean(item));
}

function normalizeJsonRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function readRequestedBrainPersona(brain: Brain): BrainPersona | null {
  if (!brain || typeof brain !== "object") return null;

  const row = brain as Record<string, unknown>;
  const id = normalizeOptionalString(row.id);
  const name = normalizeOptionalString(row.name);
  const targetLang = normalizeOptionalString(row.target_lang);
  const languagePriority = normalizeStringArray(row.language_priority);
  const systemPrompt = normalizeOptionalString(row.system_prompt);
  const strategicConcept = normalizeOptionalString(row.strategic_concept);
  const identityProfile = normalizeJsonRecord(row.identity_profile);
  const businessRules = normalizeJsonRecord(row.business_rules);

  if (
    !id &&
    !name &&
    !targetLang &&
    languagePriority.length === 0 &&
    !systemPrompt &&
    !strategicConcept &&
    Object.keys(identityProfile).length === 0 &&
    Object.keys(businessRules).length === 0
  ) {
    return null;
  }

  return {
    id,
    name,
    target_lang: targetLang,
    language_priority: languagePriority,
    system_prompt: systemPrompt,
    strategic_concept: strategicConcept,
    identity_profile: identityProfile,
    business_rules: businessRules,
  };
}

function mapAssignedBrainToPersona(brain: AssignedBrain | null): BrainPersona | null {
  if (!brain) return null;
  return {
    id: normalizeOptionalString(brain.id),
    name: normalizeOptionalString(brain.name),
    target_lang: normalizeOptionalString(brain.target_lang),
    language_priority: normalizeStringArray(brain.language_priority),
    system_prompt: normalizeOptionalString(brain.system_prompt),
    strategic_concept: normalizeOptionalString(brain.strategic_concept),
    identity_profile: normalizeJsonRecord(brain.identity_profile),
    business_rules: normalizeJsonRecord(brain.business_rules),
  };
}

function buildBrainPersonaInstruction(persona: BrainPersona | null) {
  if (!persona) return "";

  const lines: string[] = [
    "Aplica estrictamente la personalidad y estrategia del brain activo en esta conversacion.",
  ];

  if (persona.name) lines.push(`Brain activo: ${persona.name}.`);
  if (persona.target_lang) {
    lines.push(`Idioma objetivo del brain: ${persona.target_lang}. Responde preferentemente en ese idioma.`);
  } else if (persona.language_priority.length > 0) {
    lines.push(`Idiomas prioritarios del brain: ${persona.language_priority.join(", ")}.`);
  }

  if (persona.system_prompt) {
    lines.push(`Lineamientos de personalidad del brain:\n${persona.system_prompt}`);
  }

  if (persona.strategic_concept) {
    lines.push(`Concepto estrategico del brain:\n${persona.strategic_concept}`);
  }

  if (Object.keys(persona.identity_profile).length > 0) {
    lines.push(`Perfil de identidad del brain (JSON):\n${safeJson(persona.identity_profile)}`);
  }

  if (Object.keys(persona.business_rules).length > 0) {
    lines.push(`Reglas de negocio del brain (JSON):\n${safeJson(persona.business_rules)}`);
  }

  return lines.join("\n\n");
}

function mergeSystemInstructions(...instructions: string[]) {
  return instructions
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n\n");
}

function readRequestedBrainId(brain: Brain) {
  if (!brain || typeof brain !== "object") return null;
  const id = (brain as Record<string, unknown>).id;
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  return trimmed || null;
}

async function resolveAgencyModelForChat({
  requestedModel,
  requestedBrain,
}: {
  requestedModel: string;
  requestedBrain: Brain;
}) {
  const fallback = {
    model: requestedModel,
    resolvedBrainId: readRequestedBrainId(requestedBrain),
    agentInactive: false,
    selectedBrain: null as AssignedBrain | null,
  };

  try {
    const tenant = await resolveTenantFromRequest();
    if (tenant.kind !== "agency" || !tenant.agency?.id) {
      return fallback;
    }
    if (!tenant.travelerEnabled) {
      return { ...fallback, resolvedBrainId: null, agentInactive: true };
    }

    const { data: links, error: linksError } = await supabaseAdmin
      .from("agencies_ai_assistants")
      .select("ai_assistant_id")
      .eq("agency_id", tenant.agency.id);

    if (linksError) {
      console.error("Error resolviendo asignaciones de brain para agencia:", linksError);
      return fallback;
    }

    const assignedIds = Array.from(
      new Set(
        (links ?? [])
          .map((row) => row.ai_assistant_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );

    if (assignedIds.length === 0) {
      return { ...fallback, resolvedBrainId: null, agentInactive: true };
    }

    const { data: assigned, error: assignedError } = await supabaseAdmin
      .from("ai_assistants")
      .select(
        "id, name, active, model, brain_type, target_lang, language_priority, system_prompt, strategic_concept, identity_profile, business_rules",
      )
      .in("id", assignedIds)
      .eq("active", true);

    if (assignedError) {
      console.error("Error cargando brains asignados para agencia:", assignedError);
      return fallback;
    }

    const candidates = ((assigned ?? []) as AssignedBrain[]).filter((item) => item.id);
    if (candidates.length === 0) {
      return { ...fallback, resolvedBrainId: null, agentInactive: true };
    }

    const byId = new Map(candidates.map((item) => [item.id, item]));
    const requestedBrainId = readRequestedBrainId(requestedBrain);
    const marketDefaultBrainId = tenant.market?.defaultBrainId ?? null;

    const selected =
      (requestedBrainId ? byId.get(requestedBrainId) : null) ??
      (marketDefaultBrainId ? byId.get(marketDefaultBrainId) : null) ??
      candidates.find((item) => item.brain_type === "acompana") ??
      candidates.find((item) => item.brain_type === "inspira") ??
      candidates[0];

    if (!selected) {
      return { ...fallback, resolvedBrainId: null, agentInactive: true };
    }

    const selectedModel = normalizeModelName(selected.model, requestedModel);
    return {
      model: selectedModel,
      resolvedBrainId: selected.id,
      agentInactive: false,
      selectedBrain: selected,
    };
  } catch (error) {
    console.error("Error resolviendo modelo de agencia para chat:", error);
    return fallback;
  }
}

async function loadBrainById(brainId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_assistants")
      .select(
        "id, name, active, model, brain_type, target_lang, language_priority, system_prompt, strategic_concept, identity_profile, business_rules",
      )
      .eq("id", brainId)
      .maybeSingle();
    if (error) {
      console.error("Error cargando brain por id para chat:", error);
      return null;
    }
    return (data as AssignedBrain | null) ?? null;
  } catch (error) {
    console.error("Error interno cargando brain por id para chat:", error);
    return null;
  }
}

async function* geminiStream({
  ai,
  model,
  system,
  rest,
}: {
  ai: GoogleGenAI;
  model: string;
  system: string;
  rest: GeminiContent[];
}) {
  let lastError: unknown = null;
  for (const candidateModel of getModelCandidates(model)) {
    try {
      const response = await ai.models.generateContentStream({
        model: candidateModel,
        contents: rest,
        config: { systemInstruction: system },
      });

      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
      return;
    } catch (error) {
      lastError = error;
      if (!shouldTryNextModel(error)) break;
    }
  }

  console.error("Gemini Stream Error:", lastError);
  yield userFacingAiError(lastError);
}

async function geminiNonStreamText({
  ai,
  model,
  system,
  rest,
}: {
  ai: GoogleGenAI;
  model: string;
  system: string;
  rest: GeminiContent[];
}) {
  let lastError: unknown = null;
  for (const candidateModel of getModelCandidates(model)) {
    try {
      const response = await ai.models.generateContent({
        model: candidateModel,
        contents: rest,
        config: { systemInstruction: system },
      });
      return (
        response?.text ??
        response?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ??
        ""
      );
    } catch (error) {
      lastError = error;
      if (!shouldTryNextModel(error)) break;
    }
  }
  throw lastError ?? new Error("No se pudo generar contenido.");
}

async function geminiNonStreamStructured({
  ai,
  model,
  system,
  rest,
}: {
  ai: GoogleGenAI;
  model: string;
  system: string;
  rest: GeminiContent[];
}) {
  let lastError: unknown = null;
  for (const candidateModel of getModelCandidates(model)) {
    try {
      const response = await ai.models.generateContent({
        model: candidateModel,
        contents: rest,
        config: {
          systemInstruction: buildStructuredInstruction(system),
          responseMimeType: "application/json",
          responseSchema: STRUCTURED_CHAT_RESPONSE_SCHEMA,
        },
      });

      const rawText =
        response?.text ??
        response?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ??
        "";

      if (!rawText.trim()) {
        return normalizeStructuredChatResponse({});
      }

      try {
        return normalizeStructuredChatResponse(JSON.parse(rawText));
      } catch (error) {
        console.error("Structured chat JSON parse error:", error, rawText);
        return normalizeStructuredChatResponse({ message: rawText, messageType: "text" });
      }
    } catch (error) {
      lastError = error;
      if (!shouldTryNextModel(error)) break;
    }
  }
  throw lastError ?? new Error("No se pudo generar respuesta estructurada.");
}

function streamFromAsyncIterable(iterable: AsyncGenerator<string, void, unknown>) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterable.next();
      if (done) {
        controller.enqueue(encoder.encode("event: end\ndata: [DONE]\n\n"));
        controller.close();
        return;
      }

      const normalized = String(value ?? "").replace(/\r\n/g, "\n");
      const dataLines = normalized.split("\n");
      const payload = `${dataLines.map((line) => `data: ${line}`).join("\n")}\n\n`;
      controller.enqueue(encoder.encode(payload));
    },
    async cancel() {
      try {
        await iterable.return?.();
      } catch {
        // Ignore stream cancellation errors.
      }
    },
  });
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const qsStream = url.searchParams.get("stream");
    const body = await req.json().catch(() => ({}));

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return bad("Missing Gemini API key. Define GOOGLE_GENERATIVE_AI_API_KEY o GEMINI_API_KEY.", 500);
    }

    const ai = new GoogleGenAI({ apiKey });
    const {
      model = DEFAULT_MODEL,
      messages = [] as ChatMessageInput[],
      brain = null as Brain,
      stream = qsStream !== "0" && qsStream !== "false",
      responseFormat = "text" as ChatResponseFormat,
      responseProfile,
    } = body || {};
    const requestedModel = normalizeModelName(model, DEFAULT_MODEL);

    const normalizedMessages = sanitizeMessages(messages);
    if (normalizedMessages.length === 0) {
      return bad("`messages` es requerido y debe ser un arreglo no vacio");
    }
    if (stream && responseFormat === "structured") {
      return bad("`responseFormat=structured` solo esta disponible con `stream=false`");
    }

    const normalizedProfile = normalizeResponseProfile(responseProfile);
    const { system, rest } = splitSystem(normalizedMessages);
    if (rest.length === 0) {
      return bad("`messages` debe incluir al menos un mensaje de usuario o asistente");
    }
    const baseSystem = buildSystemInstruction(system, normalizedProfile);
    const { model: effectiveModel, resolvedBrainId, agentInactive, selectedBrain } = await resolveAgencyModelForChat({
      requestedModel,
      requestedBrain: brain,
    });
    if (agentInactive) {
      return bad("Agente inactivo: esta agencia no tiene un brain asignado para chat.", 503);
    }
    const selectedBrainFromDb = selectedBrain || (resolvedBrainId ? await loadBrainById(resolvedBrainId) : null);
    const brainPersona = mapAssignedBrainToPersona(selectedBrainFromDb) ?? readRequestedBrainPersona(brain);
    const brainPersonaInstruction = buildBrainPersonaInstruction(brainPersona);
    const effectiveSystem = mergeSystemInstructions(baseSystem, brainPersonaInstruction);

    if (stream) {
      const rs = streamFromAsyncIterable(
        geminiStream({
          ai,
          model: effectiveModel,
          system: effectiveSystem,
          rest,
        }),
      );
      return new Response(rs, { status: 200, headers: sseHeaders() });
    }

    if (responseFormat === "structured") {
      const structured = await geminiNonStreamStructured({ ai, model: effectiveModel, system: effectiveSystem, rest });
      return okJSON({
        structured,
        brain,
        resolvedBrainId,
        model: effectiveModel,
        resolvedBrainName: brainPersona?.name ?? null,
      });
    }

    const rawReply = await geminiNonStreamText({ ai, model: effectiveModel, system: effectiveSystem, rest });
    const reply = normalizedProfile === "ivi_travel" ? normalizeAssistantText(rawReply) : rawReply;
    return okJSON({
      reply,
      brain,
      resolvedBrainId,
      model: effectiveModel,
      resolvedBrainName: brainPersona?.name ?? null,
    });
  } catch (error: unknown) {
    console.error("API Chat Error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor de IA";
    return bad(message, 500);
  }
}
