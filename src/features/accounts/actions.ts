"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { completeOnboarding, createAccount, createInstitution } from "@/server/finance/service";
import { parseForm, safeAction } from "@/shared/lib/action";
import { accountSchema, institutionSchema, onboardingSchema } from "./schemas";

export async function completeOnboardingAction(formData: FormData) {
  return safeAction(async () => {
    const session = await requireSession();
    const input = parseForm(onboardingSchema, formData);
    const result = await completeOnboarding({ userId: session.user.id }, input);
    revalidatePath("/dashboard");
    return result;
  });
}

export async function createInstitutionAction(formData: FormData) {
  return safeAction(async () => {
    const session = await requireSession();
    const input = parseForm(institutionSchema, formData);
    const institution = await createInstitution({ userId: session.user.id }, input);
    revalidatePath("/contas");
    return { id: institution.id };
  });
}

export async function createAccountAction(formData: FormData) {
  return safeAction(async () => {
    const session = await requireSession();
    const parsed = parseForm(accountSchema, formData);
    const account = await createAccount(
      { userId: session.user.id },
      { ...parsed, institutionId: parsed.institutionId || undefined },
    );
    revalidatePath("/contas");
    revalidatePath("/dashboard");
    return { id: account.id };
  });
}
