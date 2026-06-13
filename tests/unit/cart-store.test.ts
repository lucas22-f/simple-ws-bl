import { describe, expect, it } from "vitest";
import { createCartStore, type CartStorage } from "@/stores/cart-store";

function createMemoryStorage(initial: Record<string, string> = {}): CartStorage {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    removeItem: (name) => values.delete(name),
  };
}

const mate = {
  productId: "prod-mate",
  slug: "mate-camionero",
  name: "Mate camionero",
  unitPriceCents: 12500,
  currency: "ARS",
  imageUrl: "https://example.test/mate.webp",
};

const bombilla = {
  productId: "prod-bombilla",
  slug: "bombilla-acero",
  name: "Bombilla de acero",
  unitPriceCents: 3900,
  currency: "ARS",
};

describe("cart store", () => {
  it("adds products, merges quantities, updates quantities, and calculates subtotal from snapshot prices", () => {
    const store = createCartStore({ storage: createMemoryStorage() });

    store.getState().addItem(mate, 2);
    store.getState().addItem(mate, 1);
    store.getState().addItem(bombilla, 2);
    store.getState().updateQuantity(mate.productId, 1);

    expect(store.getState().items).toEqual([
      { ...mate, quantity: 1 },
      { ...bombilla, quantity: 2 },
    ]);
    expect(store.getState().getSubtotalCents()).toBe(20300);
  });

  it("does not hydrate persisted items until explicit rehydrate is called", async () => {
    const storage = createMemoryStorage();
    const firstStore = createCartStore({ storage });
    firstStore.getState().addItem(bombilla, 3);

    const restoredStore = createCartStore({ storage });

    expect(restoredStore.getState().items).toEqual([]);

    await restoredStore.persist.rehydrate();

    expect(restoredStore.getState().items).toEqual([{ ...bombilla, quantity: 3 }]);
    expect(restoredStore.getState().getSubtotalCents()).toBe(11700);
  });

  it("removes invalid quantities, clears the cart, and restores persisted items from local storage", async () => {
    const storage = createMemoryStorage();
    const firstStore = createCartStore({ storage });

    firstStore.getState().addItem(mate, 2);
    firstStore.getState().updateQuantity(mate.productId, 0);
    expect(firstStore.getState().items).toEqual([]);

    firstStore.getState().addItem(bombilla, 3);

    const restoredStore = createCartStore({ storage });
    await restoredStore.persist.rehydrate();

    expect(restoredStore.getState().items).toEqual([{ ...bombilla, quantity: 3 }]);
    expect(restoredStore.getState().getSubtotalCents()).toBe(11700);

    restoredStore.getState().clearCart();
    expect(restoredStore.getState().items).toEqual([]);
  });

  it("removes purchased quantities without clearing unpaid cart items", () => {
    const store = createCartStore({ storage: createMemoryStorage() });

    store.getState().addItem(mate, 3);
    store.getState().addItem(bombilla, 2);

    store.getState().removePurchasedItems([
      { productId: mate.productId, quantity: 2 },
      { productId: bombilla.productId, quantity: 5 },
      { productId: "unknown-product", quantity: 1 },
    ]);

    expect(store.getState().items).toEqual([{ ...mate, quantity: 1 }]);
    expect(store.getState().getSubtotalCents()).toBe(12500);
  });
});


