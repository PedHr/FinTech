"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { createTransaction, createTransfer, updateTransaction, voidTransaction } from "@/server/finance/service";
import { parseForm, safeAction } from "@/shared/lib/action";
import { transactionSchema, transferSchema, updateTransactionSchema, voidTransactionSchema } from "./schemas";

export async function createTransactionAction(formData: FormData) {
  return safeAction(async () => {
    const session = await requireSession();
    const parsed = parseForm(transactionSchema, formData);
    const item = await createTransaction(
      { userId: session.user.id },
      {
        ...parsed,
        categoryId: parsed.categoryId || undefined,
        note: parsed.note || undefined,
        tags: parsed.tags ? parsed.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10) : undefined,
      },
    );
    revalidatePath("/transacoes");
    revalidatePath("/dashboard");
    return { id: item.id };
  });
}

export async function createTransferAction(formData: FormData) {
  return safeAction(async () => {
    const session = await requireSession();
    const parsed = parseForm(transferSchema, formData);
    const transfer = await createTransfer({ userId: session.user.id }, { ...parsed, note: parsed.note || undefined });
    revalidatePathPath();
    return { id: transfer.id };
  });
}

function revalidatePathPath() {
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
}

export async function updateTransactionAction(formData: FormData) {
  return safeAction(async () => {
    const session = await requireSession();
    const parsed = parseForm(updateTransactionSchema, formData);
    await updateTransaction({ userId: session.user.id }, parsed.transactionId, {
      ...parsed,
      categoryId: parsed.categoryId || undefined,
      note: parsed.note || undefined,
      tags: parsed.tags ? parsed.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10) : [],
    });
    revalidatePathPath();
    return { updated: true };
  });
}

export async function voidTransactionAction(formData: FormData) {
  return safeAction(async () => {
    const session = await requireSession();
    const parsed = parseForm(voidTransactionSchema, formData);
    await voidTransaction({ userId: session.user.id }, parsed.transactionId);
    revalidatePathPath();
    return { voided: true };
  });
}
