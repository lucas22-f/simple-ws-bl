"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type CartItemSnapshot, useCartStore } from "@/stores/cart-store";

type AddToCartButtonProps = {
  item: CartItemSnapshot;
};

export function AddToCartButton({ item }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <Button type="button" onClick={() => addItem(item, 1)} className="gap-2">
      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
      Agregar al carrito
    </Button>
  );
}

