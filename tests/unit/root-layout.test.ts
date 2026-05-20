import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("RootLayout hydration boundary", () => {
  it("suppresses extension-injected html/body attribute mismatches only at the root", () => {
    const layout = readFileSync(resolve("src/app/layout.tsx"), "utf8");

    expect(layout).toContain('<html lang="es-AR" suppressHydrationWarning>');
    expect(layout).toContain('<body className={`${dmSans.variable} ${playfair.variable}`} suppressHydrationWarning>');
    expect(layout.match(/suppressHydrationWarning/g)).toHaveLength(2);
  });
});