function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function unwrapJsonFence(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractAssistantText(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;

  if (typeof value === "string") {
    const normalized = normalizeText(value);
    return normalized.length > 0 ? normalized : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractAssistantText(item, depth + 1);
      if (extracted) return extracted;
    }
    return null;
  }

  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const priorityKeys = [
    "message",
    "reply",
    "content",
    "text",
    "summary",
    "output",
    "assistant",
    "structured",
    "data",
    "result",
  ];

  for (const key of priorityKeys) {
    if (!(key in record)) continue;
    const extracted = extractAssistantText(record[key], depth + 1);
    if (extracted) return extracted;
  }

  const commonNested = [
    record.choices,
    record.candidates,
    record.delta,
    record.message,
  ];

  for (const nested of commonNested) {
    const extracted = extractAssistantText(nested, depth + 1);
    if (extracted) return extracted;
  }

  for (const nested of Object.values(record)) {
    const extracted = extractAssistantText(nested, depth + 1);
    if (extracted) return extracted;
  }

  return null;
}

export function normalizeAssistantOutput(raw: unknown) {
  const text =
    typeof raw === "string"
      ? raw
      : raw == null
        ? ""
        : JSON.stringify(raw);

  const normalizedRaw = normalizeText(text);
  if (!normalizedRaw) return "";

  const unwrapped = unwrapJsonFence(normalizedRaw);
  const maybeJson =
    unwrapped.startsWith("{") || unwrapped.startsWith("[")
      ? tryParseJson(unwrapped)
      : null;

  if (maybeJson !== null) {
    const extracted = extractAssistantText(maybeJson);
    if (extracted) return extracted;
  }

  return normalizedRaw;
}
