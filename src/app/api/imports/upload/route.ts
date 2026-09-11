import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireSession } from "@/server/auth/session";
import { createImportRecord, processInvoiceImport } from "@/server/imports/service";
import { storageProvider } from "@/server/storage/provider";
import { processImportSchema, uploadPayloadSchema } from "@/features/imports/schemas";
import { env } from "@/shared/lib/env";
import { AppError, publicError, requestId } from "@/shared/lib/result";
import { rateLimit } from "@/server/security/rate-limit";
import { withTenant } from "@/server/database/tenant";
import { z } from "zod";
import { validateRequestOrigin } from "@/server/security/origin";

export const runtime = "nodejs";
export const maxDuration = 300;

function responseError(error: unknown) {
  const id = requestId();
  const body = publicError(error, id);
  const status = error instanceof AppError ? error.status : 500;
  return Response.json({ error: body }, { status });
}

async function requireUploadInitiator(request: Request) {
  validateRequestOrigin(request);
  const session = await requireSession();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit(`upload:${session.user.id}:${ip}`, 10, 3600);
  if (!limit.success) throw new AppError("RATE_LIMITED", "Limite de uploads atingido. Tente novamente mais tarde.", 429);
  return session;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");
    const blobEvent = isMultipart ? null : await request.clone().json() as HandleUploadBody;
    // Vercel sends the completion callback without the browser's session cookie.
    // handleUpload verifies its x-vercel-signature before invoking our callback.
    const session = blobEvent?.type === "blob.upload-completed" ? null : await requireUploadInitiator(request);

    if (isMultipart) {
      if (!session) throw new AppError("UNAUTHORIZED", "AutenticaÃ§Ã£o necessÃ¡ria.", 401);
      if (env().STORAGE_DRIVER !== "local") throw new AppError("INVALID_PDF", "Use o upload direto configurado para produção.");
      const form = await request.formData();
      const file = form.get("file");
      const processPayload = processImportSchema.parse({ password: form.get("password") || undefined });
      const payload = uploadPayloadSchema.parse({ creditCardId: form.get("creditCardId"), displayName: file instanceof File ? file.name : "" });
      if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) throw new AppError("INVALID_PDF", "Envie um PDF de até 10 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (new TextDecoder("ascii").decode(bytes.slice(0, 5)) !== "%PDF-") throw new AppError("INVALID_PDF", "O conteúdo enviado não é um PDF válido.");
      const storageKey = `imports/${crypto.randomUUID()}.pdf`;
        await storageProvider().put(storageKey, bytes, "application/pdf");
      try {
        const imported = await createImportRecord({ userId: session.user.id }, { ...payload, storageKey, sizeBytes: file.size, mimeType: file.type });
        await processInvoiceImport(session.user.id, imported.id, processPayload);
        return Response.json({ id: imported.id }, { status: 202 });
      } catch (error) {
        await storageProvider().delete(storageKey);
        throw error;
      }
    }

    if (env().STORAGE_DRIVER !== "vercel-blob") throw new AppError("INVALID_PDF", "Upload direto não está habilitado neste ambiente.");
    const result = await handleUpload({
      request,
      body: blobEvent!,
      token: env().BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!session) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
        const payload = uploadPayloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
        if (!pathname.startsWith("imports/") || !pathname.toLowerCase().endsWith(".pdf")) throw new AppError("INVALID_PDF", "Caminho de upload inválido.");
        return {
          allowedContentTypes: ["application/pdf"], maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true, allowOverwrite: false, tokenPayload: JSON.stringify({ ...payload, userId: session.user.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = uploadPayloadSchema.extend({ userId: z.string().uuid() }).parse(JSON.parse(tokenPayload ?? "{}"));
        const existing = await withTenant({ userId: payload.userId }, (tx) =>
          tx.importedFile.findFirst({ where: { userId: payload.userId, storageKey: blob.pathname }, select: { id: true } }),
        );
        if (existing) return;
        const metadata = await import("@vercel/blob").then(({ head }) => head(blob.pathname));
        await createImportRecord({ userId: payload.userId }, { creditCardId: payload.creditCardId, displayName: payload.displayName, storageKey: blob.pathname, sizeBytes: metadata.size, mimeType: metadata.contentType });
      },
    });
    return Response.json(result);
  } catch (error) {
    return responseError(error);
  }
}
