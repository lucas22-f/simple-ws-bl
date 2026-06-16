"use client";

import Link from "next/link";
import * as React from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { useCartStore } from "@/stores/cart-store";

const CART_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type CartFocusTrapState = {
  activeElement: Element | null;
  dialogElement: HTMLElement;
  focusableElements: HTMLElement[];
  shiftKey: boolean;
};

export function getCartFocusableElements(container: ParentNode) {
  return Array.from(container.querySelectorAll<HTMLElement>(CART_FOCUSABLE_SELECTOR)).filter((element) => {
    const disabled = "disabled" in element && Boolean(element.disabled);
    return !disabled && !element.inert && element.getAttribute("aria-hidden") !== "true";
  });
}

export function getCartFocusTrapTarget({
  activeElement,
  dialogElement,
  focusableElements,
  shiftKey,
}: CartFocusTrapState) {
  if (focusableElements.length === 0) {
    return dialogElement;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (shiftKey && (activeElement === firstElement || activeElement === dialogElement)) {
    return lastElement;
  }

  if (!shiftKey && activeElement === lastElement) {
    return firstElement;
  }

  if (!activeElement || (!dialogElement.contains(activeElement) && !focusableElements.includes(activeElement as HTMLElement))) {
    return shiftKey ? lastElement : firstElement;
  }

  return null;
}

function isolateCartBackground(portalRoot: HTMLElement | null) {
  if (!portalRoot) {
    return () => { };
  }

  const siblings = Array.from(document.body.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element !== portalRoot && element.tagName !== "SCRIPT",
  );
  const previousStates = siblings.map((element) => ({
    ariaHidden: element.getAttribute("aria-hidden"),
    element,
    inert: element.inert,
  }));

  siblings.forEach((element) => {
    element.inert = true;
    element.setAttribute("aria-hidden", "true");
  });

  return () => {
    previousStates.forEach(({ ariaHidden, element, inert }) => {
      element.inert = inert;

      if (ariaHidden === null) {
        element.removeAttribute("aria-hidden");
      } else {
        element.setAttribute("aria-hidden", ariaHidden);
      }
    });
  };
}

export function CartDrawer() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const dialogRef = React.useRef<HTMLElement>(null);
  const openerRef = React.useRef<HTMLButtonElement>(null);
  const portalRootRef = React.useRef<HTMLDivElement>(null);
  const restoreFocusTimeoutRef = React.useRef<number | null>(null);
  const items = useCartStore((state) => state.items);
  const subtotalCents = useCartStore((state) => state.getSubtotalCents());
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const currency = items[0]?.currency ?? "ARS";

  const restoreOpenerFocus = React.useCallback(() => {
    if (restoreFocusTimeoutRef.current !== null) {
      window.clearTimeout(restoreFocusTimeoutRef.current);
    }

    restoreFocusTimeoutRef.current = window.setTimeout(() => {
      openerRef.current?.focus();
      restoreFocusTimeoutRef.current = null;
    }, 0);
  }, []);

  const closeCart = React.useCallback(
    ({ restoreFocus = true }: { restoreFocus?: boolean } = {}) => {
      setOpen(false);

      if (restoreFocus) {
        restoreOpenerFocus();
      }
    },
    [restoreOpenerFocus],
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(
    () => () => {
      if (restoreFocusTimeoutRef.current !== null) {
        window.clearTimeout(restoreFocusTimeoutRef.current);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const removeBackgroundIsolation = isolateCartBackground(portalRootRef.current);
    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    document.body.style.overflow = "hidden";

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const target = getCartFocusTrapTarget({
        activeElement: document.activeElement,
        dialogElement: dialogRef.current,
        focusableElements: getCartFocusableElements(dialogRef.current),
        shiftKey: event.shiftKey,
      });

      if (target) {
        event.preventDefault();
        target.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      removeBackgroundIsolation();
      document.removeEventListener("keydown", handleDialogKeyDown);
    };
  }, [closeCart, open]);

  return (
    <>
      <button
        type="button"
        className="cursor-pointer relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Abrir carrito, ${itemCount} productos`}
        aria-expanded={open}
        aria-controls="store-cart-drawer"
        ref={openerRef}
        onClick={() => setOpen(true)}
      >
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        {itemCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-none text-primary-foreground">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        ) : null}
      </button>

      {mounted
        ? createPortal(
          <div data-cart-portal-root ref={portalRootRef}>
            <div
              className={[
                "fixed inset-0 z-60 bg-foreground/25 backdrop-blur-sm transition-opacity duration-300",
                open ? "opacity-100" : "pointer-events-none opacity-0",
              ].join(" ")}
              aria-hidden="true"
              onClick={() => closeCart()}
            />

            <aside
              id="store-cart-drawer"
              aria-label="Resumen del carrito"
              aria-hidden={!open}
              aria-modal={open ? "true" : undefined}
              role="dialog"
              inert={!open}
              ref={dialogRef}
              tabIndex={-1}
              className={[
                "fixed inset-y-0 right-0 z-70 flex w-full max-w-md flex-col border-l border-border bg-background shadow-[-16px_0_40px_rgb(37_26_18/0.16)] transition-transform duration-300 ease-out",
                open ? "translate-x-0" : "translate-x-full",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Tu selección</p>
                  <h2 className="mt-1 font-heading text-2xl font-semibold text-foreground">Carrito</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{itemCount === 1 ? "1 producto" : `${itemCount} productos`}</p>
                </div>
                <button
                  type="button"
                  className="cursor-pointer inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Cerrar carrito"
                  onClick={() => closeCart()}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                {items.length > 0 ? (
                  <ul className="space-y-5" aria-label="Productos en el carrito">
                    {items.map((item) => (
                      <li key={item.productId} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 border-b border-border pb-5">
                        <div className="h-18 w-18 overflow-hidden rounded-xl border border-border bg-muted">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full items-center justify-center text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">Sin foto</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link
                                className="line-clamp-2 font-heading text-base font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                href={`/products/${item.slug}`}
                                onClick={() => closeCart({ restoreFocus: false })}
                              >
                                {item.name}
                              </Link>
                              <p className="mt-1 text-sm font-semibold text-primary">
                                {formatMoney({ amountCents: item.unitPriceCents * item.quantity, currency: item.currency })}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Quitar ${item.name}`}
                              onClick={() => removeItem(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                          <div className="mt-3 inline-flex items-center rounded-lg border border-border bg-card">
                            <button
                              type="button"
                              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-l-lg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Restar una unidad de ${item.name}`}
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold" aria-label={`${item.quantity} unidades`}>
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-r-lg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Sumar una unidad de ${item.name}`}
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex min-h-full flex-col items-center justify-center py-12 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-primary">
                      <ShoppingBag className="h-7 w-7" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-heading text-xl font-semibold text-foreground">Tu carrito está vacío</h3>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Cuando encuentres algo especial, lo vas a poder revisar acá.</p>
                    <Link
                      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      href="/catalog"
                      onClick={() => closeCart({ restoreFocus: false })}
                    >
                      Descubrir productos
                    </Link>
                  </div>
                )}
              </div>

              {items.length > 0 ? (
                <div className="border-t border-border bg-card px-5 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <strong className="font-heading text-xl text-foreground">{formatMoney({ amountCents: subtotalCents, currency })}</strong>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Precio y disponibilidad se validan antes del pago.</p>
                  <Link
                    className="button-lift mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href="/checkout"
                    onClick={() => closeCart({ restoreFocus: false })}
                  >
                    Finalizar compra
                  </Link>
                </div>
              ) : null}
            </aside>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
