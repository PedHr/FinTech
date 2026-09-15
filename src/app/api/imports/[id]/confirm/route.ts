import { reviewSchema } from "@/features/imports/schemas";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { confirmInvoiceImport } from "@/server/imports/service";
import { AppError, publicError, requestId } from "@/shared/lib/result";
import { validateRequestOrigin } from "@/server/security/origin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    validateRequestOrigin(request);
    const session = await requireSession(); const { id } = await params;
    const input = reviewSchema.parse(await request.json());
    const result = await confirmInvoiceImport({ userId: session.user.id }, id, input.rows);
    revalidatePath("/transacoes");
    revalidatePath("/importacoes");
    revalidatePath(`/importacoes/${id}/revisao`);
    return Response.json(result);
  } catch (error) {
    const result = publicError(error, requestId());
    return Response.json({ error: result }, { status: error instanceof AppError ? error.status : 400 });
  }
}
