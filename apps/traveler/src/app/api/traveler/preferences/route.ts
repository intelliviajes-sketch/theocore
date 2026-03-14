import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getRequestIp, resolveRequestUser } from "@/lib/api/auth";
import { takeRateLimit } from "@intelliviajes/lib/api/rate-limit";
import { GoogleGenAI } from "@google/genai";

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const rateLimit = takeRateLimit({
    key: `traveler-preferences:${ip}`,
    limit: 100,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ preferences_json: {} }, { status: 200 }); // Return empty for anonymous
  }

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("traveler_preferences")
    .select("preferences_json")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ preferences_json: data?.preferences_json || {} }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const rateLimit = takeRateLimit({
    key: `traveler-preferences-update:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { recentMessages } = body;

  if (!recentMessages || !Array.isArray(recentMessages)) {
    return NextResponse.json({ error: "recentMessages required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server missing AI key" }, { status: 500 });
  }

  const supabase = await createSupabaseServer();
  
  // Get current
  const { data: currentPref } = await supabase
    .from("traveler_preferences")
    .select("preferences_json")
    .eq("user_id", user.id)
    .single();
    
  const currentJson = currentPref?.preferences_json || {};

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
Eres un extractor de preferencias de perfiles de viajeros.
Dado el historial reciente de chat del usuario y sus preferencias actuales guardadas, actualiza o anade nuevos datos importantes sobre el usuario.
Busca cosas como: Presupuesto habitual, con quien suele viajar, alergias, si le gusta el lujo, ritmo de viaje, destinos odiados/amados, requerimientos especiales.

Preferencias actuales en DB (JSON):
${JSON.stringify(currentJson, null, 2)}

Mensajes recientes del usuario:
${JSON.stringify(recentMessages.filter((m: any) => m.role === "user").map((m: any) => m.content))}

REGLA ESTRICTA: Devuelve EXCLUSIVAMENTE un JSON valido combinando las preferencias actuales con las nuevas. No devuelvas markdown (\`\`\`json) ni ningun texto extra. Las claves deben ser en espanol, formato string, por ejemplo:
{"alergias": "marisco", "acompanantes_habituales": "pareja", "ritmo_preferido": "relajado"}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const aiText = response?.text ?? "";
    const updatedPreferences = JSON.parse(aiText);

    const { data: tenantData } = await supabase.from('core_tenant_users').select('tenant_id').eq('user_id', user.id).limit(1).single();
    const tenant_id = tenantData?.tenant_id;

    if (!tenant_id) {
       return NextResponse.json({ error: "User has no tenant" }, { status: 400 });
    }

    // Upsert
    await supabase.from("traveler_preferences").upsert({
      user_id: user.id,
      tenant_id: tenant_id,
      preferences_json: updatedPreferences,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

    return NextResponse.json({ updated: true, preferences_json: updatedPreferences }, { status: 200 });

  } catch (error) {
    console.error("Error extracting preferences:", error);
    return NextResponse.json({ error: "Internal error extracting preferences" }, { status: 500 });
  }
}
