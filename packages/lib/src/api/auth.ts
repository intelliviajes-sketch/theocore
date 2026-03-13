function normalizeIp(rawIp: string | null) {
  if (!rawIp) return "unknown";

  const trimmed = rawIp.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return "unknown";

  if (trimmed === "::1") return "127.0.0.1";

  // x-forwarded-for may contain IPv4 with port, ex: 203.0.113.1:43123
  if (trimmed.includes(".") && trimmed.includes(":")) {
    const [ipv4] = trimmed.split(":");
    return ipv4?.trim() || "unknown";
  }

  return trimmed.slice(0, 120);
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstForwardedIp = forwardedFor.split(",")[0] ?? "";
    return normalizeIp(firstForwardedIp);
  }
  return normalizeIp(request.headers.get("x-real-ip"));
}

export function resolveSafeRedirectUrl({
  siteUrl,
  redirectTo,
  fallbackPath,
  allowedPathPrefixes,
}: {
  siteUrl: string;
  redirectTo?: string | null;
  fallbackPath: string;
  allowedPathPrefixes?: string[];
}) {
  const fallback = new URL(fallbackPath, siteUrl).toString();
  if (!redirectTo) return fallback;

  try {
    const parsed = new URL(redirectTo, siteUrl);
    const siteOrigin = new URL(siteUrl).origin;
    if (parsed.origin !== siteOrigin) {
      return fallback;
    }

    if (allowedPathPrefixes && allowedPathPrefixes.length > 0) {
      const allowed = allowedPathPrefixes.some((prefix) => {
        const normalizedPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
        return (
          parsed.pathname === normalizedPrefix ||
          parsed.pathname.startsWith(`${normalizedPrefix}/`)
        );
      });
      if (!allowed) return fallback;
    }

    return parsed.toString();
  } catch {
    return fallback;
  }
}
