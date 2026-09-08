import { z } from "zod";

const money = z.string().regex(/^\d{1,15}([.,]\d{1,4})?$/);
export const investmentSchema = z.object({
  institutionId: z.string().uuid(), accountId: z.string().uuid(), name: z.string().trim().min(2).max(100),
  symbol: z.string().trim().max(20).optional().or(z.literal("")),
  type: z.enum(["CDB", "TREASURY", "STOCK", "REIT", "ETF", "FUND", "CRYPTO", "SAVINGS", "OTHER"]),
  investedAmount: money, currentValue: money, quantity: z.string().regex(/^\d{1,20}([.,]\d{1,10})?$/).optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const valuationSchema = z.object({ investmentId: z.string().uuid(), value: money, valuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
