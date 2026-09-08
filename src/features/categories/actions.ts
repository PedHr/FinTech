"use server";
import { revalidatePath } from "next/cache"; import { z } from "zod";
import { requireSession } from "@/server/auth/session"; import { withTenant } from "@/server/database/tenant"; import { parseForm, safeAction } from "@/shared/lib/action"; import { normalizeText } from "@/shared/lib/text";
const schema = z.object({ name: z.string().trim().min(2).max(60), kind: z.enum(["INCOME", "EXPENSE", "BOTH"]), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) });
export async function createCategoryAction(formData: FormData) { return safeAction(async () => { const session = await requireSession(); const input = parseForm(schema, formData); const category = await withTenant({ userId: session.user.id }, (tx) => tx.category.create({ data: { userId: session.user.id, name: input.name, normalizedName: normalizeText(input.name), kind: input.kind, color: input.color } })); revalidatePath("/categorias"); return { id: category.id }; }); }
