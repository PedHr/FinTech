import { requireSession } from "@/server/auth/session";
import { withTenant } from "@/server/database/tenant";
import { enqueueInvoiceImport } from "@/server/workflows/invoice-import";
import { AppError, publicError, requestId } from "@/shared/lib/result";
import { validateRequestOrigin } from "@/server/security/origin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const responseRequestId = requestId();
  try {
    validateRequestOrigin(request);
    const session = await requireSession();
    const { id: importId } = await context.params;
    const file = await withTenant({ userId: session.user.id }, (tx) => tx.importedFile.findFirst({
      where: { id: importId, userId: session.user.id },
      select: { id: true, status: true, storageDeletedAt: true },
    }));
    if (!file) throw new AppError("NOT_FOUND", "Importação não encontrada.", 404);
    if (file.status !== "FAILED" || file.storageDeletedAt) {
      throw new AppError("CONFLICT", "Esta importação não pode mais ser reprocessada.", 409);
    }
    const run = await enqueueInvoiceImport(session.user.id, file.id);
    return Response.json({ ok: true, runId: run });
  } catch (error) {
    const body = publicError(error, responseRequestId);
    return Response.json({ error: body }, { status: error instanceof AppError ? error.status : 500 });
  }
}
