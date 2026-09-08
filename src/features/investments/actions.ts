"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { createInvestment, addValuation } from "@/server/investments/service";
import { parseForm, safeAction } from "@/shared/lib/action";
import { investmentSchema, valuationSchema } from "./schemas";

export async function createInvestmentAction(formData: FormData) { return safeAction(async () => { const session = await requireSession(); const input = parseForm(investmentSchema, formData); const item = await createInvestment({ userId: session.user.id }, { ...input, symbol: input.symbol || undefined, quantity: input.quantity || undefined }); revalidatePath("/investimentos"); revalidatePath("/dashboard"); return { id: item.id }; }); }
export async function addValuationAction(formData: FormData) { return safeAction(async () => { const session = await requireSession(); const input = parseForm(valuationSchema, formData); await addValuation({ userId: session.user.id }, input); revalidatePath("/investimentos"); revalidatePath("/dashboard"); return { id: input.investmentId }; }); }
