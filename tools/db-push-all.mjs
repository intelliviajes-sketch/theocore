#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const apps = [
  { name: "intranet", cwd: path.join(root, "apps", "intranet") },
  { name: "traveler", cwd: path.join(root, "apps", "traveler") },
];

function run(commandLine, cwd, env = {}) {
  return new Promise((resolve) => {
    const child =
      process.platform === "win32"
        ? spawn("cmd.exe", ["/d", "/s", "/c", commandLine], {
            cwd,
            env: { ...process.env, ...env },
            stdio: ["ignore", "pipe", "pipe"],
            shell: false,
          })
        : spawn("sh", ["-lc", commandLine], {
            cwd,
            env: { ...process.env, ...env },
            stdio: ["ignore", "pipe", "pipe"],
            shell: false,
          });

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function extractProjectRef(cwd) {
  const envText = `${readEnvFile(path.join(cwd, ".env.local"))}\n${readEnvFile(path.join(cwd, ".env"))}`;
  const match = envText.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

async function tryLinkNonInteractive(app, projectRef) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!token || !dbPassword) {
    console.log(`INFO ${app.name}: missing SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD for auto link.`);
    return false;
  }

  console.log(`INFO ${app.name}: trying non-interactive supabase link...`);
  const escapedPassword = dbPassword.replace(/"/g, '\\"');
  const link = await run(
    `npx supabase link --project-ref ${projectRef} --password "${escapedPassword}"`,
    app.cwd,
    { SUPABASE_ACCESS_TOKEN: token },
  );

  if (link.code !== 0) {
    console.error(`ERROR ${app.name}: non-interactive supabase link failed.`);
    return false;
  }
  return true;
}

async function pushForApp(app) {
  console.log(`\n=== ${app.name}: supabase db push ===`);
  const cloud = await run("npx supabase db push", app.cwd);
  if (cloud.code === 0) {
    console.log(`OK ${app.name}: migrations applied (cloud/link).`);
    return true;
  }

  if (!cloud.output.includes("Cannot find project ref")) {
    console.error(`ERROR ${app.name}: cloud db push failed.`);
    return false;
  }

  const projectRef = extractProjectRef(app.cwd);
  if (projectRef) {
    const linked = await tryLinkNonInteractive(app, projectRef);
    if (linked) {
      const retryCloud = await run("npx supabase db push", app.cwd);
      if (retryCloud.code === 0) {
        console.log(`OK ${app.name}: migrations applied (cloud auto-link).`);
        return true;
      }
    }
  } else {
    console.log(`INFO ${app.name}: NEXT_PUBLIC_SUPABASE_URL not found to infer project ref.`);
  }

  console.log(`INFO ${app.name}: trying local mode fallback...`);
  const local = await run("npx supabase db push --local", app.cwd);
  if (local.code === 0) {
    console.log(`OK ${app.name}: migrations applied (local).`);
    return true;
  }

  const localOut = local.output.toLowerCase();
  if (localOut.includes("docker")) {
    console.error(`ERROR ${app.name}: Docker Desktop is not available for local mode.`);
  } else if (
    localOut.includes("127.0.0.1:54322") ||
    localOut.includes("connectex") ||
    localOut.includes("connection refused")
  ) {
    console.error(`ERROR ${app.name}: local Supabase database is not running.`);
  } else {
    console.error(`ERROR ${app.name}: local db push failed.`);
  }
  return false;
}

let ok = true;
for (const app of apps) {
  const appOk = await pushForApp(app);
  ok = ok && appOk;
}

if (!ok) {
  process.exitCode = 1;
}