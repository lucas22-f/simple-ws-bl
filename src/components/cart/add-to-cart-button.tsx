"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type CartItemSnapshot, useCartStore } from "@/stores/cart-store";

type AddToCartButtonProps = {
  item: CartItemSnapshot;
};

export function AddToCartButton({ item }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) {
      return;
    }

    const timeout = window.setTimeout(() => setAdded(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [added]);

  return (
    <Button
      type="button"
      onClick={() => {
        addItem(item, 1);
        setAdded(true);
      }}
      className="button-lift gap-2"
      aria-live="polite"
    >
      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
      {added ? "Agregado" : "Agregar al carrito"}
    </Button>
  );
}


