import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const moneyValue = z.string().regex(/^\d{1,15}([.,]\d{1,4})?$/);

export const institutionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const accountSchema = z.object({
  institutionId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  type: z.enum(["CHECKING", "SAVINGS", "PAYMENT", "WALLET", "CASH", "INVESTMENT", "OTHER"]),
  openingBalance: moneyValue,
  openingDate: dateOnly,
  currency: z.literal("BRL").default("BRL"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const onboardingSchema = z.object({
  institutionName: z.string().trim().min(2).max(80),
  accountName: z.string().trim().min(2).max(80),
  accountType: accountSchema.shape.type,
  openingBalance: moneyValue,
  openingDate: dateOnly,
});
