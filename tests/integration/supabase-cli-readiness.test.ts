import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const configPath = join(process.cwd(), "supabase", "config.toml");
const migrationPath = join(process.cwd(), "supabase", "migrations", "0001_init.sql");
const readmePath = join(process.cwd(), "README.md");
const packagePath = join(process.cwd(), "package.json");

const parseMibToBytes = (value: string) => {
  const match = value.match(/^(\d+)MiB$/);

  if (!match) {
    throw new Error(`Unsupported file size format: ${value}`);
  }

  return Number(match[1]) * 1024 * 1024;
};

const extractProductImagesBucketConfig = (config: string) => {
  const block = config.match(/\[storage\.buckets\.product-images\]([\s\S]*?)(?:\n\[|$)/)?.[1];

  if (!block) {
    throw new Error("Missing product-images bucket config");
  }

  const fileSizeLimit = block.match(/file_size_limit = "([^"]+)"/)?.[1];
  const allowedMimeTypes = block
    .match(/allowed_mime_types = \[([^\]]+)\]/)?.[1]
    .split(",")
    .map((mimeType) => mimeType.trim().replaceAll('"', ""));

  if (!fileSizeLimit || !allowedMimeTypes) {
    throw new Error("Incomplete product-images bucket config");
  }

  return {
    fileSizeLimitBytes: parseMibToBytes(fileSizeLimit),
    allowedMimeTypes,
  };
};

const extractProductImagesBucketMigration = (migration: string) => {
  const values = migration.match(
    /values\s*\('product-images',\s*'product-images',\s*true,\s*(\d+),\s*array\[([\s\S]*?)\]\)/,
  );

  if (!values) {
    throw new Error("Missing product-images bucket migration");
  }

  return {
    fileSizeLimitBytes: Number(values[1]),
    allowedMimeTypes: values[2].split(",").map((mimeType) => mimeType.trim().replaceAll("'", "")),
  };
};

describe("Supabase CLI readiness contract", () => {
  it("configures local Supabase ports, auth URL, seed, and product image storage", () => {
    const config = readFileSync(configPath, "utf8");

    expect(config).toContain('project_id = "tienda-web-simple-moderna"');
    expect(config).toContain("[db.migrations]");
    expect(config).toContain("enabled = true");
    expect(config).toContain("[db.seed]");
    expect(config).toContain('sql_paths = ["./seed.sql"]');
    expect(config).toContain("[storage]");
    expect(config).toContain("[storage.buckets.product-images]");
    expect(config).toContain("public = true");
    expect(config).toContain("[auth]");
    expect(config).toContain('site_url = "http://127.0.0.1:3000"');
    expect(config).toContain("port = 54321");
    expect(config).toContain("port = 54322");
    expect(config).toContain("port = 54323");
  });

  it("keeps product image bucket config aligned with the migration", () => {
    const bucketConfig = extractProductImagesBucketConfig(readFileSync(configPath, "utf8"));
    const bucketMigration = extractProductImagesBucketMigration(readFileSync(migrationPath, "utf8"));

    expect(bucketConfig).toEqual(bucketMigration);
    expect(bucketConfig).toEqual({
      fileSizeLimitBytes: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
  });

  it("exposes clear npm scripts for local Supabase workflows", () => {
    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["supabase:version"]).toBe("supabase --version");
    expect(pkg.scripts["supabase:status"]).toBe("supabase status");
    expect(pkg.scripts["supabase:start"]).toBe("supabase start");
    expect(pkg.scripts["supabase:stop"]).toBe("supabase stop");
    expect(pkg.scripts["supabase:db:reset"]).toBe("supabase db reset");
    expect(pkg.scripts["supabase:db:lint"]).toBe("supabase db lint --local --schema public --fail-on warning");
  });

  it("documents Docker, the observed Docker config warning, and remote credential boundaries", () => {
    const readme = readFileSync(readmePath, "utf8");

    expect(readme).toContain("Supabase CLI local");
    expect(readme).toContain("Docker Desktop");
    expect(readme).toContain("Access is denied");
    expect(readme).toContain("npm run supabase:start");
    expect(readme).toContain("npm run supabase:db:reset");
    expect(readme).toContain("Remote project credentials");
    expect(readme).toContain("Do not commit secrets");
  });
});
