/**
 * /api/chat
 * - stream=true  -> SSE chunks
 * - stream=false -> JSON { reply } or { structured }
 */

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
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

function jsonHeaders() {
  return { "Content-Type": "application/json; charset=utf-8" };
}

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Transfer-Encoding": "chunked",
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
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterable.next();
      if (done) {
        controller.enqueue(new TextEncoder().encode("event: end\ndata: [DONE]\n\n"));
        controller.close();
        return;
      }

      const normalized = String(value ?? "").replace(/\r\n/g, "\n");
      const dataLines = normalized.split("\n");
      const payload = `${dataLines.map((line) => `data: ${line}`).join("\n")}\n\n`;
      controller.enqueue(new TextEncoder().encode(payload));
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

    if (!Array.isArray(messages) || messages.length === 0) {
      return bad("`messages` es requerido y debe ser un arreglo no vacio");
    }
    if (stream && responseFormat === "structured") {
      return bad("`responseFormat=structured` solo esta disponible con `stream=false`");
    }

    const normalizedProfile = normalizeResponseProfile(responseProfile);
    const { system, rest } = splitSystem(messages);
    const effectiveSystem = buildSystemInstruction(system, normalizedProfile);

    if (stream) {
      const rs = streamFromAsyncIterable(
        geminiStream({
          ai,
          model,
          system: effectiveSystem,
          rest,
        }),
      );
      return new Response(rs, { status: 200, headers: sseHeaders() });
    }

    if (responseFormat === "structured") {
      const structured = await geminiNonStreamStructured({ ai, model, system: effectiveSystem, rest });
      return okJSON({ structured, brain });
    }

    const rawReply = await geminiNonStreamText({ ai, model, system: effectiveSystem, rest });
    const reply = normalizedProfile === "ivi_travel" ? normalizeAssistantText(rawReply) : rawReply;
    return okJSON({ reply, brain });
  } catch (error: unknown) {
    console.error("API Chat Error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor de IA";
    return bad(message, 500);
  }
}
