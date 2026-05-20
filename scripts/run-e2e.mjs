import { spawn } from "node:child_process";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? baseUrl;
process.env.E2E_MERCADO_PAGO_CHECKOUT_URL = process.env.E2E_MERCADO_PAGO_CHECKOUT_URL ?? `${baseUrl}/__e2e__/mercado-pago/checkout?preference_id=e2e-preference`;
process.env.E2E_STORE_FIXTURES = process.env.E2E_STORE_FIXTURES ?? "1";

function spawnChild(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
    ...options,
  });
}

async function waitForServer(url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function stopTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("exit", resolve);
      killer.on("error", resolve);
    });
    return;
  }
  child.kill("SIGTERM");
}

const server = spawnChild(process.execPath, ["./scripts/e2e-webserver.mjs"]);

let exitCode = 1;
try {
  await waitForServer(baseUrl);
  const testProcess = spawnChild(process.execPath, ["./node_modules/@playwright/test/cli.js", "test"], {
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseUrl,
    },
  });

  exitCode = await new Promise((resolve) => {
    testProcess.on("exit", (code) => resolve(code ?? 1));
    testProcess.on("error", () => resolve(1));
  });
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  await stopTree(server);
}

process.exit(exitCode);