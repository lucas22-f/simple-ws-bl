import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.test",
  ".env.test.local",
  ".env.production",
  ".env.production.local",
  ".env.preview",
  ".env.ci",
  ".env.example",
];

function resolveTargets(args) {
  if (args.length > 0) {
    return args.map((file) => path.resolve(file));
  }

  return DEFAULT_ENV_FILES
    .map((file) => path.resolve(process.cwd(), file))
    .filter((file) => existsSync(file));
}

async function hasUtf8Bom(file) {
  const bytes = await readFile(file);
  return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

async function main() {
  const targets = resolveTargets(process.argv.slice(2));
  const offenders = [];

  for (const file of targets) {
    if (await hasUtf8Bom(file)) {
      offenders.push(file);
    }
  }

  if (offenders.length > 0) {
    console.error([
      `Remove the UTF-8 BOM from ${offenders.map((file) => path.relative(process.cwd(), file)).join(", ")}.`,
      "Remediation: re-save the file as UTF-8 without BOM before running Supabase DB lint.",
    ].join("\n"));
    process.exit(1);
  }

  console.log(`Environment encoding preflight passed (${targets.length} file${targets.length === 1 ? "" : "s"} checked).`);
}

await main();