import { after } from "next/server";
import { processInvoiceImport } from "@/server/imports/service";

/**
 * Schedule a bounded import after the upload response has been sent.
 *
 * This stays inside Vercel's standard Node.js function runtime, which supports
 * Prisma, pdfjs and the optional native OCR dependencies. Durable Workflow
 * functions deliberately do not support those Node.js modules.
 */
export function enqueueInvoiceImport(userId: string, importId: string) {
  const runId = crypto.randomUUID();
  after(async () => {
    await processInvoiceImport(userId, importId);
  });
  return runId;
}
