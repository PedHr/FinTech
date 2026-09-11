import { requireSession } from "@/server/auth/session";
import { withTenant } from "@/server/database/tenant";
import { processInvoiceImport } from "@/server/imports/service";
import { AppError, publicError, requestId } from "@/shared/lib/result";
import { validateRequestOrigin } from "@/server/security/origin";
import { processImportSchema } from "@/features/imports/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const responseRequestId = requestId();
  try {
    validateRequestOrigin(request);
    const session = await requireSession();
    const rawBody = await request.text();
    const payload = processImportSchema.parse(rawBody ? JSON.parse(rawBody) : {});
    const { id: importId } = await context.params;
    const file = await withTenant({ userId: session.user.id }, (tx) => tx.importedFile.findFirst({
      where: { id: importId, userId: session.user.id },
      select: { id: true, status: true, storageDeletedAt: true },
    }));
    if (!file) throw new AppError("NOT_FOUND", "Importação não encontrada.", 404);
    if (file.status !== "FAILED" || file.storageDeletedAt) {
      throw new AppError("CONFLICT", "Esta importação não pode mais ser reprocessada.", 409);
    }
    await processInvoiceImport(session.user.id, file.id, payload);
    const result = await withTenant({ userId: session.user.id }, (tx) => tx.importedFile.findFirstOrThrow({
      where: { id: file.id, userId: session.user.id },
      select: { status: true, errorCode: true, errorMessage: true },
    }));
    if (result.status === "FAILED") {
      const code = result.errorCode === "PDF_PASSWORD_REQUIRED" || result.errorCode === "PDF_PASSWORD_INVALID"
        ? result.errorCode
        : "IMPORT_FAILED";
      throw new AppError(code, result.errorMessage ?? "Não foi possível interpretar esta fatura.", 422);
    }
    return Response.json({ ok: true });
  } catch (error) {
    const body = publicError(error, responseRequestId);
    return Response.json({ error: body }, { status: error instanceof AppError ? error.status : 500 });
  }
}
