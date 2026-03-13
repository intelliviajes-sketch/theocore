#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, "docs", "file-by-file-review.md");

const SEARCH_DIRS = [
  "apps/intranet/src",
  "apps/traveler/src",
  "packages/lib/src",
  "tools",
];

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".sql"]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function toRepoPath(absolutePath) {
  return absolutePath.replaceAll("\\", "/").replace(`${ROOT.replaceAll("\\", "/")}/`, "");
}

function classify(filePath) {
  if (filePath.endsWith("/proxy.ts")) return "Proxy";
  if (filePath.includes("/supabase/migrations/")) return "SQL migration";
  if (filePath.includes("/src/app/api/") && filePath.endsWith("/route.ts")) return "API route";
  if (filePath.endsWith("/page.tsx")) return "Page";
  if (filePath.endsWith("/layout.tsx")) return "Layout";
  if (filePath.includes("/src/components/")) return "Component";
  if (filePath.includes("/src/lib/")) return "Library";
  if (filePath.includes("/src/features/")) return "Feature module";
  if (filePath.startsWith("tools/")) return "Tool script";
  return "Module";
}

function inferRole(filePath) {
  if (filePath.endsWith("/route.ts")) {
    const segments = filePath.split("/");
    const routeIdx = segments.lastIndexOf("api");
    return `Endpoint ${segments.slice(routeIdx + 1, -1).join("/") || "/"}`;
  }
  if (filePath.endsWith("/proxy.ts")) return "Request gate + redirects";
  if (filePath.endsWith("/page.tsx")) return "UI screen entrypoint";
  if (filePath.endsWith("/layout.tsx")) return "Shared page shell";
  if (filePath.includes("/supabase/migrations/")) return "Schema/policy change";
  if (filePath.startsWith("tools/")) return "Operational automation";

  const fileName = path.basename(filePath).replace(path.extname(filePath), "");
  return fileName
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function readHint(absPath) {
  try {
    const text = fs.readFileSync(absPath, "utf8");
    const lines = text.split(/\r?\n/).slice(0, 80);
    for (const line of lines) {
      const trimmed = line
        .trim()
        .replace(/^\/\/\s?/, "")
        .replace(/^\/\*\*?\s?/, "")
        .replace(/^\*\s?/, "")
        .replace(/\*\/$/, "")
        .trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("eslint") || trimmed.startsWith("ts-") || trimmed.startsWith("TODO")) continue;
      if (trimmed.length > 140) continue;
      if (trimmed.startsWith("import ") || trimmed.startsWith("export ")) continue;
      return trimmed;
    }
  } catch {
    return "";
  }
  return "";
}

function generate() {
  const allFiles = SEARCH_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  const relevant = allFiles
    .filter((abs) => EXTENSIONS.has(path.extname(abs)))
    .map(toRepoPath)
    .sort((a, b) => a.localeCompare(b));

  const now = new Date().toISOString();
  const lines = [];
  lines.push("# File by file review");
  lines.push("");
  lines.push(`Generated at: ${now}`);
  lines.push("");
  lines.push("| File | Type | Role | Note |");
  lines.push("| --- | --- | --- | --- |");

  for (const filePath of relevant) {
    const absPath = path.join(ROOT, filePath);
    const type = classify(filePath);
    const role = inferRole(filePath);
    const hint = readHint(absPath) || "-";
    const safeHint = hint.replaceAll("|", "\\|");
    lines.push(`| \`${filePath}\` | ${type} | ${role} | ${safeHint} |`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${lines.join("\n")}\n`, "utf8");
  console.log(`Review written to ${toRepoPath(OUTPUT_FILE)}`);
}

generate();
