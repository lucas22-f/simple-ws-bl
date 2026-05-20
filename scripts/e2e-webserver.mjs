import { spawn } from "node:child_process";

const child = spawn(process.execPath, [
  "./node_modules/next/dist/bin/next",
  "dev",
  "--hostname",
  "127.0.0.1",
  "--port",
  "3100",
], {
  stdio: "inherit",
  env: process.env,
  shell: false,
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (!child.killed) {
    child.kill(signal);
  }

  setTimeout(() => {
    if (!child.killed && child.pid) {
      try {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        // Best-effort cleanup on Windows.
      }
    }
    process.exit(0);
  }, 1000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (shuttingDown) {
    process.exit(0);
  }
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});