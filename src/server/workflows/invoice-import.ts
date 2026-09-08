import { start } from "workflow/api";
import { processInvoiceImport } from "@/server/imports/service";

export async function invoiceImportWorkflow(userId: string, importId: string) {
  "use workflow";
  return processInvoiceImportStep(userId, importId);
}

async function processInvoiceImportStep(userId: string, importId: string) {
  "use step";
  await processInvoiceImport(userId, importId);
}

export async function enqueueInvoiceImport(userId: string, importId: string) {
  const run = await start(invoiceImportWorkflow, [userId, importId]);
  return run.runId;
}
