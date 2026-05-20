import { z } from "zod";

export const checkoutBuyerSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre"),
  email: z.string().trim().email("Ingresá un email válido"),
  phone: z.string().trim().min(6, "Ingresá un teléfono válido"),
  address: z.string().trim().min(5, "Ingresá una dirección"),
  city: z.string().trim().min(2, "Ingresá una ciudad"),
  postalCode: z.string().trim().min(3, "Ingresá un código postal"),
});

export const checkoutItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero"),
  unitPriceCents: z.coerce.number().int().nonnegative().optional(),
});

export const checkoutInputSchema = z.object({
  buyer: checkoutBuyerSchema,
  items: z.array(checkoutItemSchema).min(1, "El carrito está vacío"),
});

export type CheckoutBuyer = z.infer<typeof checkoutBuyerSchema>;
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

