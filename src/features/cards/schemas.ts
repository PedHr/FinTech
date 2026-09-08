import { z } from "zod";

const moneyValue = z.string().regex(/^\d{1,15}([.,]\d{1,4})?$/);

export const cardSchema = z.object({
  institutionId: z.string().uuid(),
  paymentAccountId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  creditLimit: moneyValue,
  closingDay: z.coerce.number().int().min(1).max(28),
  dueDay: z.coerce.number().int().min(1).max(28),
  brand: z.string().trim().max(40).optional().or(z.literal("")),
});

export const installmentSchema = z.object({
  creditCardId: z.string().uuid(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().trim().min(2).max(160),
  totalAmount: moneyValue,
  installmentCount: z.coerce.number().int().min(1).max(120),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
