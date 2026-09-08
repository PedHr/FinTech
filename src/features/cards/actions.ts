"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { createCard, createInstallmentPurchase } from "@/server/finance/service";
import { parseForm, safeAction } from "@/shared/lib/action";
import { cardSchema, installmentSchema } from "./schemas";

export async function createCardAction(formData: FormData) {
  return safeAction(async () => {
    const session = await requireSession();
    const parsed = parseForm(cardSchema, formData);
    const card = await createCard(
      { userId: session.user.id },
      { ...parsed, paymentAccountId: parsed.paymentAccountId || undefined, brand: parsed.brand || undefined },
    );
    revalidatePath("/cartoes");
    revalidatePath("/contas");
    return { id: card.id };
  });
}

export async function createInstallmentAction(formData: FormData) {
  return safeAction(async () => {
    const session = await requireSession();
    const parsed = parseForm(installmentSchema, formData);
    const plan = await createInstallmentPurchase(
      { userId: session.user.id },
      { ...parsed, categoryId: parsed.categoryId || undefined },
    );
    revalidatePath("/cartoes");
    revalidatePath("/faturas");
    revalidatePath("/dashboard");
    return { id: plan.id };
  });
}
