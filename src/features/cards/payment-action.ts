"use server";
import { revalidatePath } from "next/cache"; import { z } from "zod";
import { requireSession } from "@/server/auth/session"; import { payInvoice } from "@/server/cards/service"; import { parseForm, safeAction } from "@/shared/lib/action";
const schema = z.object({ invoiceId: z.string().uuid(), sourceAccountId: z.string().uuid(), amount: z.string().regex(/^\d{1,15}([.,]\d{1,4})?$/), paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export async function payInvoiceAction(formData: FormData) { return safeAction(async () => { const session = await requireSession(); const input = parseForm(schema, formData); const result = await payInvoice({ userId: session.user.id }, input); revalidatePath("/faturas"); revalidatePath("/dashboard"); return { id: result.id }; }); }
