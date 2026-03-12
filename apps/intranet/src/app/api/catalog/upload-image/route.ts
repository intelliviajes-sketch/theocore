import { NextResponse } from "next/server";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";

async function resolveAuthenticatedUser(request: Request) {
  const supabaseServer = await createSupabaseServer();
  const serverUserResult = await supabaseServer.auth.getUser();
  if (serverUserResult.data.user) {
    return { user: serverUserResult.data.user, error: null as string | null };
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!token) {
    return { user: null, error: serverUserResult.error?.message || "No autorizado." };
  }

  const admin = createSupabaseAdmin();
  const tokenUserResult = await admin.auth.getUser(token);
  if (tokenUserResult.error || !tokenUserResult.data.user) {
    return { user: null, error: tokenUserResult.error?.message || "No autorizado." };
  }

  return { user: tokenUserResult.data.user, error: null as string | null };
}

const CATALOG_BUCKET = "catalog-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function ensureBucket() {
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

  return admin;
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await resolveAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: authError || "No autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const agencyId = String(formData.get("agencyId") || "").trim();

    if (files.length === 0) {
      return NextResponse.json({ error: "No se recibieron archivos." }, { status: 400 });
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

      const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
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
