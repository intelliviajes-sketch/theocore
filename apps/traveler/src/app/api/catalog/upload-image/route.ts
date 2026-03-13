import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  canAccessAgency,
  isCoreAdmin,
  resolveRequestUser,
} from "@/lib/api/auth";

const CATALOG_BUCKET = "catalog-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

declare global {
  var __catalogBucketReady__: Promise<void> | undefined;
}

async function ensureBucket() {
  if (!globalThis.__catalogBucketReady__) {
    globalThis.__catalogBucketReady__ = (async () => {
      const admin = createSupabaseAdmin();
      const { data: buckets, error: listError } = await admin.storage.listBuckets();
      if (listError) throw listError;

      const exists = (buckets ?? []).some((bucket) => bucket.name === CATALOG_BUCKET);
      if (!exists) {
        const { error: createError } = await admin.storage.createBucket(CATALOG_BUCKET, {
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

  try {
    await globalThis.__catalogBucketReady__;
  } catch (error) {
    globalThis.__catalogBucketReady__ = undefined;
    throw error;
  }

  return createSupabaseAdmin();
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await resolveRequestUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: authError || "No autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const agencyId = String(formData.get("agencyId") || "").trim();

    if (files.length === 0) {
      return NextResponse.json({ error: "No se recibieron archivos." }, { status: 400 });
    }

    if (agencyId) {
      const hasAgencyAccess = await canAccessAgency(user.id, agencyId);
      if (!hasAgencyAccess) {
        return NextResponse.json({ error: "No tienes acceso a la agencia indicada." }, { status: 403 });
      }
    } else {
      const canUseGlobalScope = await isCoreAdmin(user.id);
      if (!canUseGlobalScope) {
        return NextResponse.json({ error: "No autorizado para subir assets globales." }, { status: 403 });
      }
    }

    const admin = await ensureBucket();
    const uploaded: Array<{ path: string; url: string; name: string }> = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.type || file.name}` }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `El archivo ${file.name} supera el limite de 5MB.` }, { status: 400 });
      }

      const extension = (file.name.includes(".") ? file.name.split(".").pop() : "bin")
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "bin";
      const scope = agencyId || "global";
      const filePath = `${scope}/${user.id}/${crypto.randomUUID()}.${extension}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await admin.storage.from(CATALOG_BUCKET).upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = admin.storage.from(CATALOG_BUCKET).getPublicUrl(filePath);
      uploaded.push({
        path: filePath,
        url: publicData.publicUrl,
        name: file.name,
      });
    }

    return NextResponse.json({ files: uploaded });
  } catch (error) {
    console.error("Catalog upload image error:", error);
    const message = error instanceof Error ? error.message : "No se pudieron subir las imagenes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
