"use client";

import { useEffect } from "react";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import { createJSONStorage, persist, type PersistOptions, type StateStorage } from "zustand/middleware";
import { calculateSubtotalCents } from "@/lib/money";

export type CartStorage = StateStorage;

export type CartItemSnapshot = {
  productId: string;
  slug: string;
  name: string;
  unitPriceCents: number;
  currency: string;
  imageUrl?: string;
};

export type CartItem = CartItemSnapshot & {
  quantity: number;
};

export type PurchasedCartItem = {
  productId: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItemSnapshot, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  removePurchasedItems: (items: PurchasedCartItem[]) => void;
  clearCart: () => void;
  getSubtotalCents: () => number;
};

export type CartStore = StoreApi<CartState> & {
  persist: {
    rehydrate: () => Promise<void> | void;
  };
};

const CART_STORAGE_KEY = "bazar-online-cart";

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(0, Math.trunc(quantity));
}

function createCartPersistOptions(storage?: CartStorage): PersistOptions<CartState, Pick<CartState, "items">> {
  return {
    name: CART_STORAGE_KEY,
    storage: createJSONStorage(() => storage ?? localStorage),
    partialize: (state) => ({ items: state.items }),
    skipHydration: true,
  };
}

export function createCartStore(options: { storage?: CartStorage } = {}) {
  return createStore<CartState>()(
    persist(
      (set, get) => ({
        items: [],
        addItem: (snapshot, quantity = 1) => {
          const nextQuantity = normalizeQuantity(quantity);
          if (nextQuantity <= 0) {
            return;
          }

          set((state) => {
            const existingItem = state.items.find((item) => item.productId === snapshot.productId);

            if (!existingItem) {
              return { items: [...state.items, { ...snapshot, quantity: nextQuantity }] };
            }

            return {
              items: state.items.map((item) =>
                item.productId === snapshot.productId
                  ? { ...item, ...snapshot, quantity: item.quantity + nextQuantity }
                  : item,
              ),
            };
          });
        },
        updateQuantity: (productId, quantity) => {
          const nextQuantity = normalizeQuantity(quantity);

          set((state) => ({
            items:
              nextQuantity <= 0
                ? state.items.filter((item) => item.productId !== productId)
                : state.items.map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item)),
          }));
        },
        removeItem: (productId) => set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),
        removePurchasedItems: (purchasedItems) => {
          const purchasedQuantities = new Map<string, number>();

          for (const item of purchasedItems) {
            const quantity = normalizeQuantity(item.quantity);
            if (quantity <= 0) {
              continue;
            }

            purchasedQuantities.set(item.productId, (purchasedQuantities.get(item.productId) ?? 0) + quantity);
          }

          if (purchasedQuantities.size === 0) {
            return;
          }

          set((state) => ({
            items: state.items.flatMap((item) => {
              const purchasedQuantity = purchasedQuantities.get(item.productId) ?? 0;
              const nextQuantity = item.quantity - purchasedQuantity;

              return nextQuantity > 0 ? [{ ...item, quantity: nextQuantity }] : [];
            }),
          }));
        },
        clearCart: () => set({ items: [] }),
        getSubtotalCents: () => calculateSubtotalCents(get().items),
      }),
      createCartPersistOptions(options.storage),
    ),
  ) as CartStore;
}

const browserCartStore = createCartStore();
let browserCartHydrationStarted = false;

function rehydrateBrowserCartStore() {
  if (browserCartHydrationStarted) {
    return;
  }

  browserCartHydrationStarted = true;
  void browserCartStore.persist.rehydrate();
}

export function useCartStore<T>(selector: (state: CartState) => T): T {
  useEffect(() => {
    rehydrateBrowserCartStore();
  }, []);

  return useStore(browserCartStore, selector);
}




