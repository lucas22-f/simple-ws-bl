import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import FailurePage from "@/app/(store)/payment/failure/page";
import PendingPage from "@/app/(store)/payment/pending/page";
import SuccessPage from "@/app/(store)/payment/success/page";
import { PaymentStateView } from "@/components/store/payment-state-view";

describe("Payment state visual slice", () => {
  it("renders success as a warm return-confirmation card without claiming final paid status", () => {
    const html = renderToStaticMarkup(createElement(SuccessPage));

    expect(html).toContain("Estamos verificando tu pago");
    expect(html).toContain("Volviste desde Mercado Pago");
    expect(html).toContain("no confirma el estado final de la orden");
    expect(html).toContain("El estado final se actualiza cuando el servidor recibe la confirmación definitiva");
    expect(html).toContain("webhook firmado");
    expect(html).not.toContain("Te avisaremos");
    expect(html).toContain("Seguir comprando");
    expect(html).toContain("bg-emerald-50");
    expect(html).toContain("text-emerald-600");
    expect(html).not.toContain("Pedido pagado");
  });

  it("renders pending with calm processing copy and amber state tone", () => {
    const html = renderToStaticMarkup(createElement(PendingPage));

    expect(html).toContain("Tu pago está siendo procesado");
    expect(html).toContain("Guardá esta pantalla como referencia");
    expect(html).toContain("Volver al catálogo");
    expect(html).not.toContain("Recibirás un email");
    expect(html).not.toContain("Ver mis pedidos");
    expect(html).not.toContain('href="/orders"');
    expect(html).toContain("bg-amber-50");
    expect(html).toContain("text-amber-600");
  });

  it("renders failure with honest retry guidance and retry/catalog CTAs", () => {
    const html = renderToStaticMarkup(createElement(FailurePage));

    expect(html).toContain("No pudimos procesar tu pago");
    expect(html).toContain("Revisá los datos de tu tarjeta e intentá nuevamente");
    expect(html).toContain("Reintentar pago");
    expect(html).toContain("Volver al catálogo");
    expect(html).toContain("bg-red-50");
    expect(html).toContain("text-red-500");
  });

  it("uses the shared payment-state presentation with centered card composition and accessible CTAs", () => {
    const html = renderToStaticMarkup(
      createElement(PaymentStateView, {
        tone: "pending",
        kicker: "Pago pendiente",
        title: "Tu pago está siendo procesado",
        description: "Guardá esta pantalla como referencia.",
        panelTitle: "Qué pasa ahora",
        panelCopy: "Mercado Pago nos avisará el resultado final por webhook firmado.",
        primaryCta: { href: "/catalog", label: "Volver al catálogo" },
        secondaryCta: { href: "/checkout", label: "Revisar checkout" },
      }),
    );

    expect(html).toContain("min-h-screen");
    expect(html).toContain("font-heading");
    expect(html).toContain("Qué pasa ahora");
    expect(html).toContain('href="/catalog"');
    expect(html).toContain('href="/checkout"');
    expect(html).toContain("focus-visible:ring-ring");
  });

  it("keeps touched payment storefront files free of forbidden neutral color families", () => {
    const repoRoot = process.cwd();
    const touchedStorefrontFiles = [
      "src/app/(store)/payment/success/page.tsx",
      "src/app/(store)/payment/pending/page.tsx",
      "src/app/(store)/payment/failure/page.tsx",
      "src/components/store/payment-state-view.tsx",
    ];

    const forbiddenTokenPattern = /\b(?:bg|text|border|ring|from|to|via|placeholder|decoration|outline|accent)-(?:gray|blue|purple|stone)-\d{1,3}\b/;

    for (const file of touchedStorefrontFiles) {
      const contents = readFileSync(path.join(repoRoot, file), "utf8");
      expect(contents, `${file} should use store design tokens instead of forbidden neutral color families`).not.toMatch(
        forbiddenTokenPattern,
      );
    }
  });

  it("mounts cart synchronization only on the success return page", () => {
    const repoRoot = process.cwd();
    const successPage = readFileSync(path.join(repoRoot, "src/app/(store)/payment/success/page.tsx"), "utf8");
    const pendingPage = readFileSync(path.join(repoRoot, "src/app/(store)/payment/pending/page.tsx"), "utf8");
    const failurePage = readFileSync(path.join(repoRoot, "src/app/(store)/payment/failure/page.tsx"), "utf8");

    expect(successPage).toContain("PaymentReturnCartSync");
    expect(pendingPage).not.toContain("PaymentReturnCartSync");
    expect(failurePage).not.toContain("PaymentReturnCartSync");
  });

  it("keeps payment-return cart sync bounded and retry-safe", () => {
    const repoRoot = process.cwd();
    const syncComponent = readFileSync(path.join(repoRoot, "src/components/store/payment-return-cart-sync.tsx"), "utf8");

    expect(syncComponent).toContain("paymentReturnMaxAttempts");
    expect(syncComponent).toContain("scheduleRetry");
    expect(syncComponent).toContain("!response.ok");
    expect(syncComponent).toContain('result.paymentStatus === "paid"');
  });
});

