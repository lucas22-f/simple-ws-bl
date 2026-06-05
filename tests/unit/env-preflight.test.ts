import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const scriptPath = path.join(process.cwd(), "scripts", "check-env-files.mjs");

async function withTempDir<T>(run: (dir: string) => Promise<T>) {
  const dir = await mkdtemp(path.join(tmpdir(), "env-preflight-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("environment file preflight", () => {
  it("passes when environment files do not start with a BOM", async () => {
    await withTempDir(async (dir) => {
      const envFile = path.join(dir, ".env.local");
      await writeFile(envFile, "NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100\n", "utf8");

      await expect(execFileAsync(process.execPath, [scriptPath, envFile])).resolves.toMatchObject({
        stdout: expect.stringContaining("Environment encoding preflight passed"),
      });
    });
  });

  it("fails with an actionable remediation when an environment file starts with a UTF-8 BOM", async () => {
    await withTempDir(async (dir) => {
      const envFile = path.join(dir, ".env.local");
      await writeFile(envFile, Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from("NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100\n")]));

      await expect(execFileAsync(process.execPath, [scriptPath, envFile])).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining("Remove the UTF-8 BOM from"),
      });
    });
  });
});
