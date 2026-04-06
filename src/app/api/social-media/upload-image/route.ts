import { NextResponse } from "next/server";
import { canAccessAgency, resolveRequestUser } from "@/lib/api/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

const SOCIAL_BUCKET = "social-assets";
const MAX_FILE_SIZE = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

declare global {
  var __socialBucketReady__: Promise<void> | undefined;
}

async function ensureBucket() {
  if (!globalThis.__socialBucketReady__) {
    globalThis.__socialBucketReady__ = (async () => {
      const admin = createSupabaseAdmin();
      const { data: buckets, error: listError } = await admin.storage.listBuckets();
      if (listError) throw listError;
      const exists = (buckets ?? []).some((bucket) => bucket.name === SOCIAL_BUCKET);
      if (!exists) {
        const { error: createError } = await admin.storage.createBucket(SOCIAL_BUCKET, {
          public: true,
          fileSizeLimit: `${MAX_FILE_SIZE}`,
          allowedMimeTypes: Array.from(ALLOWED_TYPES),
        });
        if (createError && !createError.message.toLowerCase().includes("already exists")) {
          throw createError;
        }
      }
    })();
  }
  await globalThis.__socialBucketReady__;
  return createSupabaseAdmin();
}

export async function POST(request: Request) {
  try {
    const { user, error } = await resolveRequestUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "No autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const agencyId = String(formData.get("agencyId") || "").trim();
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibio archivo." }, { status: 400 });
    }
    if (!agencyId) {
      return NextResponse.json({ error: "agencyId es obligatorio." }, { status: 400 });
    }
    if (!(await canAccessAgency(user.id, agencyId))) {
      return NextResponse.json({ error: "Sin acceso a agencia." }, { status: 403 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Archivo supera el limite de 6MB." }, { status: 400 });
    }

    const admin = await ensureBucket();
    const ext =
      (file.name.includes(".") ? file.name.split(".").pop() : "jpg")
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${agencyId}/${user.id}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(SOCIAL_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicData } = admin.storage.from(SOCIAL_BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, path, url: publicData.publicUrl });
  } catch (error) {
    console.error("social upload error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error subiendo imagen." },
      { status: 500 },
    );
  }
}
