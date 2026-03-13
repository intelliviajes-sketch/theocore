#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SEARCH_DIRS = ["apps", "packages", "tools", "docs"];
const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".sql",
  ".css",
  ".toml",
  ".yml",
  ".yaml",
]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", ".git"]);
const SKIP_FILES = new Set(["tools/check-text-health.mjs"]);

const BAD_PATTERNS = [
  { pattern: "\uFFFD", reason: "replacement character" },
  { pattern: "ï¿½", reason: "mojibake sequence" },
  { pattern: "Ã¡", reason: "mojibake sequence" },
  { pattern: "Ã©", reason: "mojibake sequence" },
  { pattern: "Ã­", reason: "mojibake sequence" },
  { pattern: "Ã³", reason: "mojibake sequence" },
  { pattern: "Ãº", reason: "mojibake sequence" },
  { pattern: "Ã±", reason: "mojibake sequence" },
];

function shouldSkip(absPath) {
  const parts = absPath.replaceAll("\\", "/").split("/");
  return parts.some((part) => SKIP_DIRS.has(part));
}

function walk(absDir, out = []) {
  if (!fs.existsSync(absDir)) return out;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = path.join(absDir, entry.name);
    if (shouldSkip(absPath)) continue;
    if (entry.isDirectory()) {
      walk(absPath, out);
      continue;
    }
    out.push(absPath);
  }
  return out;
}

function toRepoPath(absPath) {
  return absPath.replaceAll("\\", "/").replace(`${ROOT.replaceAll("\\", "/")}/`, "");
}

function isTextFile(filePath) {
  return EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function collectProblems(filePath, content) {
  const problems = [];
  for (const { pattern, reason } of BAD_PATTERNS) {
    const index = content.indexOf(pattern);
    if (index === -1) continue;
    problems.push({ pattern, reason, index });
  }
  return problems;
}

const files = SEARCH_DIRS.flatMap((dir) => walk(path.join(ROOT, dir))).filter(isTextFile);
const findings = [];

for (const absPath of files) {
  if (SKIP_FILES.has(toRepoPath(absPath))) continue;
  let content = "";
  try {
    content = fs.readFileSync(absPath, "utf8");
  } catch {
    continue;
  }

  const problems = collectProblems(absPath, content);
  for (const problem of problems) {
    const line = content.slice(0, problem.index).split(/\r?\n/).length;
    findings.push({
      file: toRepoPath(absPath),
      line,
      reason: problem.reason,
      pattern: problem.pattern,
    });
  }
}

if (findings.length > 0) {
  console.error("Text health check failed. Suspicious sequences detected:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} (${finding.reason}) -> ${finding.pattern}`);
  }
  process.exitCode = 1;
} else {
  console.log("Text health check OK.");
}
