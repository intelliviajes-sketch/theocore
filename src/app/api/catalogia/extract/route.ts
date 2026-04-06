import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";

const DEFAULT_MODEL = process.env.CATALOGIA_MODEL || "gemini-2.5-flash";

type SourceType = "text" | "email" | "pdf" | "image";
type ProductType = { id: string; name: string; description: string };
type Candidate = {
  candidate_id: string;
  title: string;
  summary: string;
  country_code: string | null;
  suggested_product_type_name: string | null;
  suggested_confidence: number | null;
  field_suggestions: Record<string, unknown>;
  amenity_suggestions: Record<string, Record<string, unknown>>;
  field_confidence: Record<string, number>;
  offer_profile: Record<string, unknown> | null;
  season_info: Record<string, unknown> | null;
  price_insight: Record<string, unknown> | null;
  commercial_copy: Record<string, unknown> | null;
  localized_copies: Array<{ language_code: string; title: string; summary: string }>;
  duplicates: Array<{ catalog_id: string; title: string; similarity: number; reason: string; review_status: string | null; active: boolean }>;
  missing_data: string[];
  warnings: string[];
};

function jsonResponse(payload: unknown, status = 200) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toArrayStrings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean) : [];
}

function parseModelJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1]);
    throw new Error("No se pudo parsear el JSON de la IA.");
  }
}

function isMissingRelationError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String((error as { message?: string }).message || "").toLowerCase() : "";
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code || "") : "";
  return code === "PGRST205" || (message.includes("relation") && message.includes("does not exist"));
}

function heuristicCountry(text: string) {
  const source = text.toLowerCase();
  if (source.includes("maruecos") || source.includes("morocco")) return "MA";
  if (source.includes("nepal")) return "NP";
  if (source.includes("japon") || source.includes("japan")) return "JP";
  if (source.includes("espana") || source.includes("españa") || source.includes("spain")) return "ES";
  if (source.includes("peru")) return "PE";
  return null;
}

function heuristicSeason(text: string) {
  const match = text.match(/(otono|otoño|invierno|primavera|verano)[^.\n]{0,20}/i);
  const raw = match?.[0] || null;
  const years = Array.from((raw || "").matchAll(/\b(\d{2,4})\b/g)).map((m) => Number(m[1]));
  const from = years[0] ? (years[0] < 100 ? 2000 + years[0] : years[0]) : null;
  const to = years[1] ? (years[1] < 100 ? 2000 + years[1] : years[1]) : null;
  return { raw, normalized_label: raw, from_year: from, to_year: to, season_codes: raw ? [raw.toUpperCase()] : [] };
}

function heuristicPrice(text: string) {
  const prices = Array.from(text.matchAll(/(?:€|\$)?\s*(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:€|\$)?/g))
    .map((m) => toNumber(m[1]))
    .filter((x): x is number => typeof x === "number");
  const current = prices.length > 0 ? prices[prices.length - 1] : null;
  const old = prices.length > 1 ? prices[0] : null;
  const discount = (() => {
    const pct = text.match(/(\d{1,2})\s*%\s*(?:dto|off|descuento)/i);
    if (pct?.[1]) return toNumber(pct[1]);
    if (old && current && old > current) return Math.round(((old - current) / old) * 100);
    return null;
  })();
  return {
    currency: /€|euro/i.test(text) ? "EUR" : /\$/i.test(text) ? "USD" : null,
    current_price: current,
    old_price: old,
    from_price: null,
    discount_percent: discount,
    per_person: /pax|persona|pp\b/i.test(text),
    raw_labels: [],
  };
}

function heuristicType(text: string, productTypes: ProductType[]) {
  const base = normalizeKey(text);
  let best: { name: string; score: number } | null = null;
  for (const row of productTypes) {
    const token = normalizeKey(row.name);
    const score = base.includes(token) ? 80 : token.split(" ").filter((t) => base.includes(t)).length * 20;
    if (!best || score > best.score) best = { name: row.name, score };
  }
  return best;
}

function normalizeConfidence(input: unknown, fields: Record<string, unknown>) {
  const result: Record<string, number> = {};
  const raw = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(raw)) {
    const n = toNumber(value);
    if (n != null) result[key] = Math.max(0, Math.min(100, Math.round(n)));
  }
  for (const key of Object.keys(fields)) {
    if (!(key in result)) result[key] = 80;
  }
  return result;
}

function tokens(value: string) {
  return new Set(normalizeKey(value).split(" ").filter((x) => x.length >= 3));
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((k) => {
    if (b.has(k)) inter += 1;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function normalizeCandidate(raw: Record<string, unknown>, text: string, productTypes: ProductType[]): Candidate {
  const title = asString(raw.title) || text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || "Producto turistico";
  const summary = asString(raw.summary) || text.replace(/\s+/g, " ").slice(0, 280);
  const fieldSuggestions = raw.field_suggestions && typeof raw.field_suggestions === "object" && !Array.isArray(raw.field_suggestions)
    ? (raw.field_suggestions as Record<string, unknown>)
    : {};
  const preferredType = asString(raw.suggested_product_type_name) || heuristicType(text, productTypes)?.name || null;
  const preferredScore = toNumber(raw.suggested_confidence) ?? heuristicType(text, productTypes)?.score ?? null;
  return {
    candidate_id: asString(raw.candidate_id) || crypto.randomUUID(),
    title,
    summary,
    country_code: asString(raw.country_code)?.toUpperCase() || heuristicCountry(`${title} ${summary}`),
    suggested_product_type_name: preferredType,
    suggested_confidence: preferredScore,
    field_suggestions: fieldSuggestions,
    amenity_suggestions: raw.amenity_suggestions && typeof raw.amenity_suggestions === "object" && !Array.isArray(raw.amenity_suggestions)
      ? (raw.amenity_suggestions as Record<string, Record<string, unknown>>)
      : {},
    field_confidence: normalizeConfidence(raw.field_confidence, fieldSuggestions),
    offer_profile: raw.offer_profile && typeof raw.offer_profile === "object" && !Array.isArray(raw.offer_profile) ? (raw.offer_profile as Record<string, unknown>) : null,
    season_info: raw.season_info && typeof raw.season_info === "object" && !Array.isArray(raw.season_info) ? (raw.season_info as Record<string, unknown>) : heuristicSeason(`${title} ${summary}`),
    price_insight: raw.price_insight && typeof raw.price_insight === "object" && !Array.isArray(raw.price_insight) ? (raw.price_insight as Record<string, unknown>) : heuristicPrice(`${title} ${summary}`),
    commercial_copy: raw.commercial_copy && typeof raw.commercial_copy === "object" && !Array.isArray(raw.commercial_copy)
      ? (raw.commercial_copy as Record<string, unknown>)
      : { title, summary, selling_points: [] },
    localized_copies: Array.isArray(raw.localized_copies)
      ? raw.localized_copies
          .map((item) => (item && typeof item === "object" ? item as { language_code?: string; title?: string; summary?: string } : null))
          .filter((item): item is { language_code?: string; title?: string; summary?: string } => Boolean(item))
          .map((item) => ({ language_code: (item.language_code || "es").trim(), title: item.title?.trim() || title, summary: item.summary?.trim() || summary }))
      : [{ language_code: "es", title, summary }],
    duplicates: [],
    missing_data: toArrayStrings(raw.missing_data).slice(0, 20),
    warnings: toArrayStrings(raw.warnings).slice(0, 20),
  };
}

async function resolveAuthenticatedUser(request: Request) {
  const supabaseServer = await createSupabaseServer();
  const server = await supabaseServer.auth.getUser();
  if (server.data.user) return { user: server.data.user, error: null as string | null };
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return { user: null, error: server.error?.message || "No autorizado." };
  const admin = createSupabaseAdmin();
  const tokenUser = await admin.auth.getUser(token);
  if (tokenUser.error || !tokenUser.data.user) return { user: null, error: tokenUser.error?.message || "No autorizado." };
  return { user: tokenUser.data.user, error: null as string | null };
}

async function hasAgencyAccess(userId: string, agencyId: string) {
  const admin = createSupabaseAdmin();
  const { data: coreUser } = await admin.from("core_users").select("role").eq("user_id", userId).maybeSingle();
  if (coreUser?.role === "TheoCoreOwner") return true;
  const { data: membership } = await admin.from("agency_team").select("role, permissions").eq("user_id", userId).eq("agency_id", agencyId).maybeSingle();
  if (!membership) return false;
  if (membership.role === "AgencyOwner") return true;
  if (membership.role !== "TeamAgency") return false;
  return true;
}

export async function POST(request: Request) {
  const admin = createSupabaseAdmin();
  let runId: string | null = null;
  try {
    const { user, error: authError } = await resolveAuthenticatedUser(request);
    if (authError || !user) return jsonResponse({ error: authError || "No autorizado." }, 401);

    const formData = await request.formData();
    const agencyId = String(formData.get("agencyId") || "").trim();
    const sourceType = String(formData.get("sourceType") || "").trim() as SourceType;
    const rawTextInput = String(formData.get("rawText") || "");
    const files = [...formData.getAll("files"), formData.get("file")].filter((item): item is File => item instanceof File).slice(0, 5);

    if (!agencyId) return jsonResponse({ error: "agencyId es obligatorio." }, 400);
    if (!["text", "email", "pdf", "image"].includes(sourceType)) return jsonResponse({ error: "sourceType invalido." }, 400);
    if (!(await hasAgencyAccess(user.id, agencyId))) return jsonResponse({ error: "Sin permisos para usar CatalogIA en esta agencia." }, 403);

    let extractedText = rawTextInput.trim();
    const inlineParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
    if ((sourceType === "pdf" || sourceType === "image") && files.length === 0) {
      return jsonResponse({ error: sourceType === "pdf" ? "Debes adjuntar un PDF." : "Debes adjuntar una imagen." }, 400);
    }
    for (const file of files) {
      if (sourceType === "pdf" && !(file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf"))) return jsonResponse({ error: `Archivo invalido: ${file.name}` }, 400);
      if (sourceType === "image" && !(file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name))) return jsonResponse({ error: `Archivo invalido: ${file.name}` }, 400);
      inlineParts.push({ inlineData: { data: Buffer.from(await file.arrayBuffer()).toString("base64"), mimeType: file.type || (sourceType === "pdf" ? "application/pdf" : "image/png") } });
    }
    if (!extractedText && inlineParts.length > 0) extractedText = sourceType === "pdf" ? "PDF adjunto para extraccion IA." : "Imagen adjunta para OCR.";
    if (!extractedText && inlineParts.length === 0) return jsonResponse({ error: "No se encontro contenido para analizar." }, 400);

    const { data: typeRows, error: typeError } = await admin.from("product_types").select("id, name, description, scope, owner_agency_id").eq("active", true).order("name", { ascending: true });
    if (typeError) throw typeError;
    const productTypes = (typeRows ?? []).filter((r) => r.scope === "global" || r.owner_agency_id === agencyId).map((r) => ({ id: String(r.id), name: String(r.name), description: r.description ? String(r.description) : "" }));
    if (productTypes.length === 0) return jsonResponse({ error: "La agencia no tiene tipos de producto disponibles." }, 400);

    const { data: insertedRun, error: runInsertError } = await admin.from("agency_catalogia_runs").insert({
      agency_id: agencyId, created_by: user.id, source_type: sourceType, source_name: files.map((f) => f.name).join(", "), input_text: extractedText.slice(0, 30000), status: "running",
    }).select("id").maybeSingle();
    if (runInsertError && !isMissingRelationError(runInsertError)) throw runInsertError;
    runId = insertedRun?.id ? String(insertedRun.id) : null;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    let parsed: Record<string, unknown> = {};
    let modelName: string | null = null;
    if (apiKey) {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: DEFAULT_MODEL });
      modelName = DEFAULT_MODEL;
      const prompt = [
        "Eres CatalogIA para productos turisticos. Responde solo JSON.",
        "Si hay varias ofertas/tarjetas en imagen o documento, separalas en detected_offers.",
        sourceType === "image" ? "Primero realiza OCR estricto del texto visible." : "Usa el texto de entrada y adjuntos.",
        "JSON:",
        '{ "source_language":"string|null","extracted_text":"string","alternatives":["string"],"reason":"string|null","detected_offers":[{"candidate_id":"string","title":"string","summary":"string","country_code":"string|null","suggested_product_type_name":"string|null","suggested_confidence":"number|null","field_suggestions":{},"amenity_suggestions":{},"field_confidence":{},"offer_profile":{},"season_info":{},"price_insight":{},"commercial_copy":{},"localized_copies":[{"language_code":"string","title":"string","summary":"string"}],"missing_data":["string"],"warnings":["string"]}] }',
        `Tipos disponibles: ${productTypes.map((p) => p.name).join(", ")}`,
        `Texto fuente: ${extractedText.slice(0, 22000)}`,
      ].join("\n");
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }, ...inlineParts] }],
        generationConfig: { temperature: 0.2, topK: 40, topP: 0.9, maxOutputTokens: 8192, responseMimeType: "application/json" },
      });
      parsed = parseModelJson(response.response.text().trim()) as Record<string, unknown>;
    }

    const extractedTextFinal = asString(parsed.extracted_text) || extractedText;
    const sourceLanguage = asString(parsed.source_language) || (/[a-zA-Z]/.test(extractedTextFinal) ? "es" : null);
    const rawOffers = Array.isArray(parsed.detected_offers) ? parsed.detected_offers.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object" && !Array.isArray(x))) : [];
    const offers = (rawOffers.length > 0 ? rawOffers : [{ title: asString(parsed.title) || extractedTextFinal.split(/\r?\n/).find(Boolean) || "Producto turistico", summary: asString(parsed.summary) || extractedTextFinal.replace(/\s+/g, " ").slice(0, 280) }]).slice(0, 8).map((raw) => normalizeCandidate(raw, extractedTextFinal, productTypes));

    const { data: catalogRows } = await admin.from("catalog_global").select("id, title, summary, data, review_status, active").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(400);
    const comparable = (catalogRows ?? []) as Array<{ id: string; title: string | null; summary: string | null; review_status: string | null; active: boolean; data: Record<string, unknown> | null }>;
    for (const offer of offers) {
      const a = tokens(`${offer.title} ${offer.summary}`);
      const dups = comparable
        .map((row) => {
          const b = tokens(`${row.title || ""} ${row.summary || ""}`);
          const similarity = jaccard(a, b);
          return { row, similarity };
        })
        .filter((entry) => entry.similarity >= 0.35)
        .sort((x, y) => y.similarity - x.similarity)
        .slice(0, 6)
        .map((entry) => ({ catalog_id: entry.row.id, title: entry.row.title || "Producto sin titulo", similarity: Number(entry.similarity.toFixed(3)), reason: entry.similarity >= 0.7 ? "Titulo/ruta muy similares" : "Contenido potencialmente duplicado", review_status: entry.row.review_status, active: Boolean(entry.row.active) }));
      offer.duplicates = dups;
      if (dups.length > 0) offer.warnings = [...offer.warnings, `Posible duplicado: ${dups.length} coincidencias`];
    }

    const selected = offers[0];
    const payload = {
      run_id: runId,
      model: modelName,
      source_language: sourceLanguage,
      extracted_text: extractedTextFinal,
      title: selected.title,
      summary: selected.summary,
      country_code: selected.country_code,
      suggested_product_type_name: selected.suggested_product_type_name,
      suggested_confidence: selected.suggested_confidence,
      alternatives: toArrayStrings(parsed.alternatives).slice(0, 8),
      reason: asString(parsed.reason),
      field_suggestions: selected.field_suggestions,
      amenity_suggestions: selected.amenity_suggestions,
      field_confidence: selected.field_confidence,
      offer_profile: selected.offer_profile,
      season_info: selected.season_info,
      price_insight: selected.price_insight,
      commercial_copy: selected.commercial_copy,
      localized_copies: selected.localized_copies,
      duplicates: selected.duplicates,
      detected_offers: offers,
      missing_data: selected.missing_data,
      warnings: selected.warnings,
    };

    if (runId) {
      const typeId = productTypes.find((p) => normalizeKey(p.name) === normalizeKey(payload.suggested_product_type_name || ""))?.id || null;
      const { error: runUpdateError } = await admin.from("agency_catalogia_runs").update({
        extracted_text: extractedTextFinal.slice(0, 30000), detected_product_type_name: payload.suggested_product_type_name, detected_product_type_id: typeId, confidence: payload.suggested_confidence, status: "completed", model: payload.model || "heuristic", result_json: payload,
      }).eq("id", runId);
      if (runUpdateError && !isMissingRelationError(runUpdateError)) throw runUpdateError;
    }

    if (runId) {
      const { error: queueError } = await admin.from("agency_catalogia_review_queue").insert(
        offers.map((offer) => ({ agency_id: agencyId, run_id: runId, offer_candidate_id: offer.candidate_id, title: offer.title, status: "pending", confidence: offer.suggested_confidence, duplicate_count: offer.duplicates.length, payload: offer, created_by: user.id })),
      );
      if (queueError && !isMissingRelationError(queueError)) throw queueError;
    }

    return jsonResponse(payload);
  } catch (error) {
    console.error("catalogia extract error:", error);
    const message = error instanceof Error ? error.message : "No se pudo analizar el documento.";
    if (runId) {
      const { error: failError } = await createSupabaseAdmin().from("agency_catalogia_runs").update({ status: "failed", result_json: { error: message } }).eq("id", runId);
      if (failError && !isMissingRelationError(failError)) console.error("catalogia run update error:", failError);
    }
    return jsonResponse({ error: message }, 500);
  }
}

export const runtime = "nodejs";
