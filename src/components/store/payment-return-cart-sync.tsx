"use client";

import { useEffect } from "react";
import { useCartStore, type PurchasedCartItem } from "@/stores/cart-store";

type PaymentReturnResponse = {
  paymentStatus?: string;
  items?: PurchasedCartItem[];
};

const syncedOrderStoragePrefix = "payment-return-cart-synced:";
const paymentReturnPollIntervalMs = 2_500;
const paymentReturnMaxAttempts = 12;

function readOrderIdFromCurrentUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("order_id");
}

function hasSyncedOrder(orderId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(`${syncedOrderStoragePrefix}${orderId}`) === "true";
}

function markSyncedOrder(orderId: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(`${syncedOrderStoragePrefix}${orderId}`, "true");
  }
}

function scheduleRetry(callback: () => void) {
  return window.setTimeout(callback, paymentReturnPollIntervalMs);
}

export function PaymentReturnCartSync() {
  const removePurchasedItems = useCartStore((state) => state.removePurchasedItems);

  useEffect(() => {
    const orderId = readOrderIdFromCurrentUrl();
    if (!orderId || hasSyncedOrder(orderId)) {
      return;
    }

    const syncedOrderId = orderId;
    let cancelled = false;
    let timeoutId: number | undefined;

    async function syncPaidOrder(attempt = 1) {
      try {
        const response = await fetch(`/api/orders/payment-return?order_id=${encodeURIComponent(syncedOrderId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          if (attempt < paymentReturnMaxAttempts) {
            timeoutId = scheduleRetry(() => void syncPaidOrder(attempt + 1));
          }
          return;
        }

        const result = (await response.json()) as PaymentReturnResponse;
        if (cancelled) {
          return;
        }

        if (result.paymentStatus === "paid" && Array.isArray(result.items) && result.items.length > 0) {
          removePurchasedItems(result.items);
          markSyncedOrder(syncedOrderId);
          return;
        }

        if (result.paymentStatus === "pending" && attempt < paymentReturnMaxAttempts) {
          timeoutId = scheduleRetry(() => void syncPaidOrder(attempt + 1));
        }
      } catch {
        // The success page must never clear the cart unless the paid lookup succeeds.
        if (!cancelled && attempt < paymentReturnMaxAttempts) {
          timeoutId = scheduleRetry(() => void syncPaidOrder(attempt + 1));
        }
      }
    }

    void syncPaidOrder();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [removePurchasedItems]);

  return null;
}
