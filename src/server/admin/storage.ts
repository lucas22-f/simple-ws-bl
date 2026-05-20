import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const uuidSchema = z.string().uuid("ID de producto inválido");

export function buildProductImagePath(productId: string, options: { uuidFactory?: () => string } = {}) {
  const safeProductId = uuidSchema.parse(productId);
  const uuid = uuidSchema.parse((options.uuidFactory ?? randomUUID)());
  return `products/${safeProductId}/${uuid}`;
}

