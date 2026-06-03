import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const uuidSchema = z.string().uuid("ID de producto inválido");

export function buildProductImagePath(productId: string, options: { uuidFactory?: () => string } = {}) {
  const safeProductId = uuidSchema.parse(productId);
  const uuid = uuidSchema.parse((options.uuidFactory ?? randomUUID)());
  return `products/${safeProductId}/${uuid}`;
}

