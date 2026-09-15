import { z } from "zod";

export const uploadPayloadSchema = z.object({
  creditCardId: z.string().uuid(),
  // Downloaded invoices can have long, generated filenames. Only shorten the
  // display metadata; never rename or modify the uploaded document itself.
  displayName: z.string().trim().min(1).refine((name) => name.toLowerCase().endsWith(".pdf"))
    .transform((name) => name.length > 120 ? `${name.slice(0, 116)}.pdf` : name),
});

export const processImportSchema = z.object({
  // Deliberately do not trim: spaces can be part of a valid PDF password.
  password: z.string().max(256).optional(),
}).strict();

export const reviewSchema = z.object({
  rows: z.array(z.object({
    id: z.string().uuid(), included: z.boolean(), forceDuplicate: z.boolean().optional(),
    description: z.string().trim().min(2).max(160), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: z.string().regex(/^\d{1,15}([.,]\d{1,4})?$/), categoryId: z.string().uuid().nullable().optional(),
  })).max(1000),
});
