export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function resolveSafeRedirectUrl({
  siteUrl,
  redirectTo,
  fallbackPath,
}: {
  siteUrl: string;
  redirectTo?: string | null;
  fallbackPath: string;
}) {
  const fallback = new URL(fallbackPath, siteUrl).toString();
  if (!redirectTo) return fallback;

  try {
    const parsed = new URL(redirectTo, siteUrl);
    const siteOrigin = new URL(siteUrl).origin;
    if (parsed.origin !== siteOrigin) {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}
