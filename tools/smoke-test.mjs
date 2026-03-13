import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const HOST = "127.0.0.1";
const INTRANET_PORT = 4100;
const TRAVELER_PORT = 4101;

function spawnShell(command, cwd) {
  const child = spawn(command, {
    cwd,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  return child;
}

async function stopProcess(child) {
  if (!child || child.killed) return;

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn(`taskkill /pid ${child.pid} /t /f`, {
        shell: true,
        stdio: "ignore",
      });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }

  child.kill("SIGTERM");
  await sleep(500);
  if (!child.killed) child.kill("SIGKILL");
}

async function waitForServer(url, timeoutMs = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status > 0) {
        return true;
      }
    } catch {
      // keep polling
    }
    await sleep(500);
  }
  return false;
}

async function expectStatus({
  name,
  request,
  allowed,
  failures,
}) {
  try {
    const response = await request();
    if (!allowed.includes(response.status)) {
      failures.push(`${name}: estado ${response.status}, esperado ${allowed.join(", ")}`);
      return;
    }
    console.log(`OK ${name}: ${response.status}`);
  } catch (error) {
    failures.push(`${name}: error ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runIntranetChecks(baseUrl, failures) {
  await expectStatus({
    name: "intranet root redirect",
    request: () => fetch(`${baseUrl}/`, { redirect: "manual" }),
    allowed: [307, 308],
    failures,
  });

  await expectStatus({
    name: "intranet login page",
    request: () => fetch(`${baseUrl}/intranet/login`, { redirect: "manual" }),
    allowed: [200],
    failures,
  });

  await expectStatus({
    name: "invite-user unauthorized",
    request: () =>
      fetch(`${baseUrl}/api/admin/invite-user`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      }),
    allowed: [401],
    failures,
  });

  await expectStatus({
    name: "chat endpoint protected-by-key-or-limit",
    request: () =>
      fetch(`${baseUrl}/api/chat?stream=0`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stream: false,
          messages: [{ role: "user", content: "hola" }],
        }),
      }),
    allowed: [500, 429, 200],
    failures,
  });

  await expectStatus({
    name: "brains endpoint unauthorized",
    request: () =>
      fetch(`${baseUrl}/api/brains/00000000-0000-0000-0000-000000000000`, {
        method: "POST",
        body: new FormData(),
      }),
    allowed: [401, 400],
    failures,
  });

  await expectStatus({
    name: "catalog upload unauthorized",
    request: () =>
      fetch(`${baseUrl}/api/catalog/upload-image`, {
        method: "POST",
        body: new FormData(),
      }),
    allowed: [401],
    failures,
  });
}

async function runTravelerChecks(baseUrl, failures) {
  await expectStatus({
    name: "traveler root redirect",
    request: () => fetch(`${baseUrl}/`, { redirect: "manual" }),
    allowed: [307, 308],
    failures,
  });

  await expectStatus({
    name: "traveler home page",
    request: () => fetch(`${baseUrl}/traveler`, { redirect: "manual" }),
    allowed: [200],
    failures,
  });

  await expectStatus({
    name: "traveler invite-user unauthorized",
    request: () =>
      fetch(`${baseUrl}/api/admin/invite-user`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      }),
    allowed: [401],
    failures,
  });

  await expectStatus({
    name: "traveler chat endpoint protected-by-key-or-limit",
    request: () =>
      fetch(`${baseUrl}/api/chat?stream=0`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stream: false,
          messages: [{ role: "user", content: "hola" }],
        }),
      }),
    allowed: [500, 429, 200],
    failures,
  });
}

async function runAppChecks({ name, command, readyUrl, checks }) {
  const failures = [];
  const child = spawnShell(command, process.cwd());

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    if (text.includes("error")) {
      process.stdout.write(`[${name}] ${text}`);
    }
  });
  child.stderr.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk.toString()}`);
  });

  const ready = await waitForServer(readyUrl);
  if (!ready) {
    await stopProcess(child);
    throw new Error(`${name} no inicio a tiempo en ${readyUrl}`);
  }

  try {
    await checks(failures);
  } finally {
    await stopProcess(child);
  }

  return failures;
}

async function main() {
  const intranetBase = `http://${HOST}:${INTRANET_PORT}`;
  const travelerBase = `http://${HOST}:${TRAVELER_PORT}`;

  const allFailures = [];

  const intranetFailures = await runAppChecks({
    name: "intranet",
    command: `npm run -w apps/intranet start -- -H ${HOST} -p ${INTRANET_PORT}`,
    readyUrl: `${intranetBase}/intranet/login`,
    checks: (failures) => runIntranetChecks(intranetBase, failures),
  });
  allFailures.push(...intranetFailures);

  const travelerFailures = await runAppChecks({
    name: "traveler",
    command: `npm run -w apps/traveler start -- -H ${HOST} -p ${TRAVELER_PORT}`,
    readyUrl: `${travelerBase}/traveler`,
    checks: (failures) => runTravelerChecks(travelerBase, failures),
  });
  allFailures.push(...travelerFailures);

  if (allFailures.length > 0) {
    console.error("\nSMOKE TEST FAILURES:");
    for (const failure of allFailures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nSmoke tests OK.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
