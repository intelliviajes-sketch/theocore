export type PublishChannel = "instagram" | "facebook" | "tiktok" | "youtube_shorts";

export type PublishPayload = {
  channel: PublishChannel;
  title: string;
  caption: string;
  assetUrl?: string | null;
  ctaUrl?: string | null;
};

export type PublishResult = {
  ok: boolean;
  provider: string;
  externalId: string | null;
  message: string;
};

function isLivePublishingEnabled() {
  return process.env.SOCIAL_PUBLISH_LIVE === "true";
}

async function publishToMeta(payload: PublishPayload): Promise<PublishResult> {
  const token = process.env.SOCIAL_META_ACCESS_TOKEN;
  const pageId = process.env.SOCIAL_META_PAGE_ID;

  if (!token || !pageId) {
    return {
      ok: false,
      provider: "meta",
      externalId: null,
      message: "Faltan credenciales META (SOCIAL_META_ACCESS_TOKEN / SOCIAL_META_PAGE_ID).",
    };
  }

  if (!isLivePublishingEnabled()) {
    return {
      ok: true,
      provider: "meta-simulated",
      externalId: `sim-meta-${Date.now()}`,
      message: "Publicacion simulada (SOCIAL_PUBLISH_LIVE=false).",
    };
  }

  try {
    const endpoint = `https://graph.facebook.com/v20.0/${pageId}/feed`;
    const params = new URLSearchParams({
      message: [payload.title, payload.caption, payload.ctaUrl || ""].filter(Boolean).join("\n\n"),
      access_token: token,
    });
    const response = await fetch(endpoint, { method: "POST", body: params });
    const json = (await response.json()) as { id?: string; error?: { message?: string } };
    if (!response.ok || !json.id) {
      return {
        ok: false,
        provider: "meta",
        externalId: null,
        message: json.error?.message || "Error publicando en Meta.",
      };
    }
    return {
      ok: true,
      provider: "meta",
      externalId: json.id,
      message: "Publicado en Meta.",
    };
  } catch (error) {
    return {
      ok: false,
      provider: "meta",
      externalId: null,
      message: error instanceof Error ? error.message : "Error desconocido en Meta.",
    };
  }
}

async function publishToShortVideoPlatform(
  provider: "tiktok" | "youtube_shorts",
): Promise<PublishResult> {
  return {
    ok: true,
    provider: `${provider}-simulated`,
    externalId: `sim-${provider}-${Date.now()}`,
    message: `Publicacion simulada en ${provider}.`,
  };
}

export async function publishSocialPostToChannel(
  payload: PublishPayload,
): Promise<PublishResult> {
  if (payload.channel === "instagram" || payload.channel === "facebook") {
    return publishToMeta(payload);
  }
  if (payload.channel === "tiktok") {
    return publishToShortVideoPlatform("tiktok");
  }
  return publishToShortVideoPlatform("youtube_shorts");
}
