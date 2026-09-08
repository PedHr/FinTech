import { z } from "zod";

const moneyValue = z.string().regex(/^\d{1,15}([.,]\d{1,4})?$/);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const transactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().trim().min(2).max(160),
  amount: moneyValue,
  transactionDate: dateOnly,
  kind: z.enum(["INCOME", "EXPENSE", "REFUND", "ADJUSTMENT"]),
  direction: z.enum(["CREDIT", "DEBIT"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  tags: z.string().trim().max(240).optional().or(z.literal("")),
});

export const transferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  amount: moneyValue,
  transferDate: dateOnly,
  description: z.string().trim().min(2).max(160),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateTransactionSchema = transactionSchema.pick({
  categoryId: true,
  description: true,
  amount: true,
  transactionDate: true,
  note: true,
  tags: true,
}).extend({ transactionId: z.string().uuid() });

export const voidTransactionSchema = z.object({ transactionId: z.string().uuid() });
