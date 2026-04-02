import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getRequestIp, resolveRequestUser } from "@/lib/api/auth";
import { takeRateLimit } from "@/lib/api/rate-limit";

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "txt"]);

async function fileToBase64(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  let mimeType = file.type;
  if (!mimeType) {
    if (ext === "pdf") mimeType = "application/pdf";
    else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
    } else if (ext === "txt") mimeType = "text/plain";
    else mimeType = "application/octet-stream";
  }
  return { data: buf.toString("base64"), mimeType };
}

function getFileExtension(fileName: string) {
  if (!fileName.includes(".")) return "";
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowedFile(file: File) {
  const extension = getFileExtension(file.name);
  if (extension && !ALLOWED_EXTENSIONS.has(extension)) return false;
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) return false;
  return true;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ brainId: string }> },
) {
  try {
    const ip = getRequestIp(req);
    const rateLimit = takeRateLimit({
      key: `brains:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rateLimit.ok) {
      return NextResponse.json(
        {
          error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    const { user, error: authError } = await resolveRequestUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || "No autorizado." }, { status: 401 });
    }

    const supabase = await createSupabaseServer();
    const { brainId } = await context.params;
    const form = await req.formData();

    const text = (form.get("text") as string) || "";
    const file = form.get("file") as File | null;
    const correctedType = (form.get("correctedType") as string) || "";
    const productFieldsString = (form.get("productFields") as string) || "";

    if (!text.trim() && !file) {
      return NextResponse.json({ error: "No se envio texto ni archivo." }, { status: 400 });
    }

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "El archivo supera el limite de 10MB." }, { status: 400 });
      }
      if (!isAllowedFile(file)) {
        return NextResponse.json(
          { error: "Tipo de archivo no permitido. Usa PDF, TXT o imagenes PNG/JPG/WEBP." },
          { status: 400 },
        );
      }
    }

    const { data: brain, error } = await supabase
      .from("ai_assistants")
      .select("id, name, model, strategic_concept, execution_layer, active")
      .eq("id", brainId)
      .single();

    if (error || !brain) {
      return NextResponse.json({ error: "Brain no encontrado" }, { status: 404 });
    }

    if (brain.execution_layer !== "backend") {
      return NextResponse.json(
        { error: "Este Brain no esta configurado para ejecutarse en backend" },
        { status: 400 },
      );
    }

    if (brain.active === false) {
      return NextResponse.json({ error: "Este Brain esta inactivo." }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Falta GOOGLE_GENERATIVE_AI_API_KEY" }, { status: 500 });
    }

    let dynamicPromptExtension = "";
    let dynamicSchemaExtension: Record<string, unknown> = {};
    let isCorrectionPhase = false;

    if (correctedType && productFieldsString) {
      try {
        const fieldNames: string[] = JSON.parse(productFieldsString);
        if (Array.isArray(fieldNames) && fieldNames.length > 0) {
          isCorrectionPhase = true;
          const keysList = fieldNames.join(", ");

          dynamicPromptExtension = `
[INSTRUCCION DE MAPEO AVANZADO]
El usuario selecciono el tipo de producto "${correctedType}".
Ignora la estructura de 'sections' y enfocate en el objeto 'extractedFields'.
Extrae valores del texto y colocalos usando EXCLUSIVAMENTE estas claves:
CLAVES REQUERIDAS: ${keysList}.
Si encuentras datos relevantes que no correspondan a esas claves, devuelvelos en 'suggestedFields'.
`;

          const fieldProperties = fieldNames.reduce(
            (acc, key) => ({ ...acc, [key]: { type: "string" } }),
            {},
          );

          dynamicSchemaExtension = {
            extractedFields: {
              type: "object",
              description: `Objeto clave-valor mapeado a los field_name: ${keysList}.`,
              properties: fieldProperties,
            },
            suggestedFields: {
              type: "object",
              description:
                "Campos clave-valor que la IA considera relevantes pero no estaban en la lista requerida.",
            },
          };
        }
      } catch (parseError) {
        console.error("Error al parsear productFields:", parseError);
      }
    }

    const system = `
${brain.strategic_concept || ""}

INSTRUCCIONES ESPECIALES DE OCR Y VISION:
- Si el archivo es PDF o imagen, analiza todo su contenido con vision avanzada.
- Extrae texto, titulos, subtitulos, tablas, precios, itinerarios, servicios y condiciones.
- Interpreta imagenes, graficos o texto embebido en imagenes.
- Identifica el proposito del documento (circuito, hotel, vuelo, seguro, oferta, programa, folleto).

INSTRUCCION CLAVE DE FORMATO:
Para secciones con listas o itinerarios, usa saltos de linea explicitos ("\\n") en "content".

REGLA CRITICA:
Responde EXCLUSIVAMENTE en JSON valido (application/json), sin markdown ni texto adicional.

${dynamicPromptExtension}
`;

    const correctionHint = correctedType
      ? `\n[FORCE_TYPE]\nEstablece "typeGuess" en "${correctedType}".`
      : "";

    const parts: any[] = [{ text: system + correctionHint }];

    if (text.trim()) {
      parts.push({ text: `\n[DOCUMENTO_TEXTO]\n${text.trim()}` });
    }

    if (file) {
      const { data, mimeType } = await fileToBase64(file);
      parts.push({ inlineData: { data, mimeType } });
    }

    const baseSchema = {
      title: { type: "string" },
      summary: { type: "string" },
      typeGuess: { type: "string" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            content: { type: "string" },
          },
          required: ["heading", "content"],
        },
      },
      raw: { type: "string" },
    };

    const responseSchema = {
      type: "object",
      properties: {
        ...baseSchema,
        ...dynamicSchemaExtension,
      },
      required: [
        "title",
        "typeGuess",
        "sections",
        "raw",
        ...(isCorrectionPhase ? ["extractedFields"] : []),
      ],
    } as const;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const generationConfig: any = {
      temperature: 0.2,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 32768,
      responseMimeType: "application/json",
      responseSchema,
    };

    const MAX_RETRIES = 3;
    let retryCount = 0;
    let json: any = null;
    let rawText = "";

    while (retryCount < MAX_RETRIES && !json) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts }],
          generationConfig,
        });

        rawText = result.response.text().trim();
        if (!rawText) throw new Error("Respuesta vacia de la IA.");
        json = JSON.parse(rawText);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error ?? "");
        const is503 = errorMessage.includes("503 Service Unavailable");
        if (is503 && retryCount < MAX_RETRIES - 1) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          console.error("ERROR JSON.parse o respuesta de IA:", rawText, errorMessage);
          return NextResponse.json(
            {
              error: "La IA no devolvio un JSON valido",
              raw: rawText,
              geminiError: errorMessage,
            },
            { status: 502 },
          );
        }
      }
    }

    if (!json) {
      return NextResponse.json(
        {
          error: "Fallo despues de multiples reintentos.",
          raw: rawText,
          geminiError: "Multiple retries failed due to service unavailability or invalid JSON.",
        },
        { status: 502 },
      );
    }

    const normalizedJson: Record<string, unknown> = {
      ...json,
      title: json.title ?? "Documento analizado",
      summary: json.summary ?? "",
      typeGuess: json.typeGuess ?? (correctedType || "Otro"),
      sections: Array.isArray(json.sections) ? json.sections : [],
      raw: json.raw ?? (text || (file ? `Archivo: ${file.name}` : "")),
      extractedFields: json.extractedFields ?? {},
      suggestedFields: json.suggestedFields ?? {},
    };

    return NextResponse.json(
      {
        ok: true,
        brain: { id: brain.id, name: brain.name },
        data: normalizedJson,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("ERROR interno en brains endpoint:", error);
    return NextResponse.json(
      { error: "Error interno en brains endpoint." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
