import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartDrawer, getCartFocusableElements, getCartFocusTrapTarget } from "@/components/cart/cart-drawer";

describe("CartDrawer", () => {
  it("renders a persistent navbar trigger before the client-side drawer portal mounts", () => {
    const html = renderToStaticMarkup(createElement(CartDrawer));

    expect(html).toContain("Abrir carrito, 0 productos");
    expect(html).not.toContain('aria-label="Resumen del carrito"');
  });

  it("filters drawer focus candidates to enabled and visible controls", () => {
    const enabledButton = createCandidate();
    const disabledButton = createCandidate({ disabled: true });
    const hiddenLink = createCandidate({ ariaHidden: true });
    const inertLink = createCandidate({ inert: true });
    const container = createContainer([enabledButton, disabledButton, hiddenLink, inertLink]);

    expect(getCartFocusableElements(container)).toEqual([enabledButton]);
  });

  it("wraps tab focus from the first drawer control to the last control", () => {
    const dialog = createCandidate();
    const firstControl = createCandidate();
    const lastControl = createCandidate();

    expect(
      getCartFocusTrapTarget({
        activeElement: firstControl,
        dialogElement: dialog,
        focusableElements: [firstControl, lastControl],
        shiftKey: true,
      }),
    ).toBe(lastControl);
  });

  it("wraps tab focus from the last drawer control back to the first control", () => {
    const dialog = createCandidate();
    const firstControl = createCandidate();
    const lastControl = createCandidate();

    expect(
      getCartFocusTrapTarget({
        activeElement: lastControl,
        dialogElement: dialog,
        focusableElements: [firstControl, lastControl],
        shiftKey: false,
      }),
    ).toBe(firstControl);
  });

  it("recaptures focus when tab starts outside the open drawer", () => {
    const dialog = createCandidate();
    const outsideControl = createCandidate();
    const firstControl = createCandidate();
    const lastControl = createCandidate();

    expect(
      getCartFocusTrapTarget({
        activeElement: outsideControl,
        dialogElement: dialog,
        focusableElements: [firstControl, lastControl],
        shiftKey: false,
      }),
    ).toBe(firstControl);
  });
});

function createContainer(elements: HTMLElement[]) {
  return {
    querySelectorAll: () => elements,
  } as unknown as ParentNode;
}

function createCandidate(
  options: { ariaHidden?: boolean; disabled?: boolean; inert?: boolean } = {},
) {
  const attributes = new Set<string>();

  if (options.ariaHidden) {
    attributes.add("aria-hidden");
  }

  const candidate = {
    disabled: options.disabled ?? false,
    inert: options.inert ?? false,
    getAttribute: (name: string) => (name === "aria-hidden" && options.ariaHidden ? "true" : null),
    hasAttribute: (name: string) => attributes.has(name),
    contains: (element: Element) => element === candidate,
  } as unknown as HTMLElement;

  return candidate;
}
