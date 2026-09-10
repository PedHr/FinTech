import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { addDays, formatISO } from "date-fns";
import type { ImportedItemKind } from "@/generated/prisma/client";
import { storageProvider } from "@/server/storage/provider";
import { withTenant, type TenantContext } from "@/server/database/tenant";
import { AppError } from "@/shared/lib/result";
import { normalizeText, sanitizeFilename } from "@/shared/lib/text";
import { positiveMoney } from "@/shared/lib/money";
import { transactionFingerprint } from "@/server/finance/fingerprint";
import { invoiceCycleFor, dateOnly } from "@/server/finance/invoices";
import { logger } from "@/server/observability/logger";
import { extractDocument } from "./extractor";
import { parseDocument } from "./parsers/registry";
import { assertInstitutionCompatibility } from "./institution-check";

const MAX_SIZE = 10 * 1024 * 1024;

function matchesRule(description: string, pattern: string, matcher: string) {
  if (matcher === "EXACT") return description === pattern;
  if (matcher === "STARTS_WITH") return description.startsWith(pattern);
  if (matcher === "REGEX") {
    try { return new RegExp(pattern, "i").test(description); } catch { return false; }
  }
  return description.includes(pattern);
}

export async function createImportRecord(
  context: TenantContext,
  input: { creditCardId: string; displayName: string; storageKey: string; sizeBytes: number; mimeType: string },
) {
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_SIZE) throw new AppError("INVALID_PDF", "O PDF deve ter no máximo 10 MB.");
  if (input.mimeType !== "application/pdf" || !input.displayName.toLowerCase().endsWith(".pdf")) throw new AppError("INVALID_PDF", "Envie um arquivo PDF válido.");
  return withTenant(context, async (tx) => {
    const card = await tx.creditCard.findFirst({ where: { id: input.creditCardId, userId: context.userId, archivedAt: null } });
    if (!card) throw new AppError("NOT_FOUND", "Cartão não encontrado.", 404);
    return tx.importedFile.create({
      data: {
        userId: context.userId,
        creditCardId: card.id,
        displayName: sanitizeFilename(input.displayName),
        storageKey: input.storageKey,
        sizeBytes: input.sizeBytes,
        mimeType: input.mimeType,
        status: "QUEUED",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });
}

export async function processInvoiceImport(userId: string, importId: string) {
  const context = { userId };
  const storage = storageProvider();
  let stage = "claim";
  try {
    const claim = await withTenant(context, (tx) => tx.importedFile.updateMany({
      where: { id: importId, userId, status: { in: ["QUEUED", "FAILED"] } },
      data: { status: "EXTRACTING", errorCode: null, errorMessage: null },
    }));
    if (claim.count === 0) return;
    stage = "load_file";
    const file = await withTenant(context, (tx) => tx.importedFile.findFirst({
      where: { id: importId, userId, status: "EXTRACTING" },
      include: { creditCard: { include: { account: { include: { institution: true } } } } },
    }));
    if (!file) return;
    stage = "read_storage";
    const bytes = await storage.get(file.storageKey);
    stage = "validate_pdf";
    if (bytes.byteLength > MAX_SIZE || new TextDecoder("ascii").decode(bytes.slice(0, 5)) !== "%PDF-") {
      throw new AppError("INVALID_PDF", "Este arquivo não possui uma estrutura PDF válida.");
    }
    stage = "hash_file";
    const fileHash = createHash("sha256").update(bytes).digest("hex");
    stage = "detect_duplicate";
    const duplicate = await withTenant(context, (tx) => tx.importedFile.findFirst({ where: { userId, fileHash, id: { not: importId } }, select: { id: true } }));
    if (duplicate) {
      await withTenant(context, (tx) => tx.importedFile.update({ where: { id: importId }, data: { fileHash, status: "DUPLICATE_FILE", errorCode: "DUPLICATE_FILE", errorMessage: "Este PDF já foi importado." } }));
      await storage.delete(file.storageKey);
      await withTenant(context, (tx) => tx.importedFile.update({ where: { id: importId }, data: { storageDeletedAt: new Date() } }));
      return;
    }
    stage = "save_file_hash";
    await withTenant(context, (tx) => tx.importedFile.update({ where: { id: importId }, data: { fileHash } }));
    stage = "extract_document";
    const document = await extractDocument(bytes);
    if (document.usedOcr) await withTenant(context, (tx) => tx.importedFile.update({ where: { id: importId }, data: { status: "OCR" } }));
    await withTenant(context, (tx) => tx.importedFile.update({ where: { id: importId }, data: { status: "PARSING" } }));
    stage = "parse_document";
    assertInstitutionCompatibility(document.text, file.creditCard.account.institution?.name);
    const parsed = await parseDocument(document, file.creditCard.account.institution?.name);

    stage = "persist_drafts";
    await withTenant(context, async (tx) => {
      const rules = await tx.categorizationRule.findMany({ where: { userId, isActive: true }, orderBy: { priority: "asc" } });
      for (const item of parsed.result.transactions) {
        const normalized = normalizeText(item.description);
        const rule = rules.find((candidate) => matchesRule(normalized, normalizeText(candidate.pattern), candidate.matcher));
        const fingerprint = transactionFingerprint({
          userId,
          accountId: file.creditCard.accountId,
          date: item.date,
          description: item.description,
          amount: new Decimal(item.amount).toFixed(4),
          installmentNumber: item.installment?.current,
        });
        const exact = await tx.transaction.findFirst({ where: { userId, fingerprint, status: { not: "VOIDED" } }, select: { id: true } });
        const possible = exact ? null : await tx.transaction.findFirst({
          where: {
            userId,
            accountId: file.creditCard.accountId,
            amount: new Decimal(item.amount),
            status: { not: "VOIDED" },
            transactionDate: { gte: addDays(dateOnly(item.date), -2), lte: addDays(dateOnly(item.date), 2) },
          },
          select: { id: true },
        });
        await tx.importDraft.create({
          data: {
            userId,
            importedFileId: importId,
            categoryId: rule?.categoryId,
            duplicateCandidateId: exact?.id ?? possible?.id,
            kind: item.kind,
            transactionDate: dateOnly(item.date),
            description: item.description,
            normalizedDescription: normalized,
            amount: new Decimal(item.amount),
            installmentNumber: item.installment?.current,
            installmentTotal: item.installment?.total,
            confidence: item.confidence,
            included: item.kind !== "PAYMENT" && item.kind !== "UNKNOWN" && !exact && !possible,
            fingerprint,
            duplicateStatus: exact ? "EXACT" : possible ? "POSSIBLE" : "NEW",
          },
        });
      }
      await tx.importedFile.update({
        where: { id: importId },
        data: { status: "REVIEW_READY", parserKey: parsed.parser.key, parserVersion: parsed.parser.version, itemCount: parsed.result.transactions.length },
      });
    }, "Serializable");
  } catch (error) {
    logger.error({ err: error, importId, userId, stage }, "Falha no processamento da fatura");
    const appError = error instanceof AppError ? error : new AppError("IMPORT_FAILED", "Não foi possível interpretar esta fatura.");
    const errorKind = error instanceof Error ? error.name.replace(/[^A-Za-z0-9_]/g, "").slice(0, 40) : "Unknown";
    const errorCode = appError.code === "IMPORT_FAILED" ? `IMPORT_FAILED_${stage}_${errorKind}` : appError.code;
    await withTenant(context, (tx) => tx.importedFile.updateMany({ where: { id: importId, userId }, data: { status: "FAILED", errorCode, errorMessage: appError.message } })).catch(() => undefined);
  }
}

export type ReviewRow = { id: string; included: boolean; forceDuplicate?: boolean; description: string; date: string; amount: string; categoryId?: string | null };

function transactionKind(kind: ImportedItemKind) {
  if (kind === "REFUND") return { kind: "REFUND" as const, direction: "CREDIT" as const };
  return { kind: "EXPENSE" as const, direction: "DEBIT" as const };
}

export async function confirmInvoiceImport(context: TenantContext, importId: string, rows: ReviewRow[]) {
  const result = await withTenant(context, async (tx) => {
    const file = await tx.importedFile.findFirst({
      where: { id: importId, userId: context.userId },
      include: { drafts: true, creditCard: true },
    });
    if (!file) throw new AppError("NOT_FOUND", "Importação não encontrada.", 404);
    if (file.status === "COMPLETED") return { count: file.selectedCount, storageKey: file.storageKey, alreadyCompleted: true };
    if (file.status !== "REVIEW_READY") throw new AppError("CONFLICT", "Esta importação ainda não está pronta para confirmação.", 409);
    const inputMap = new Map(rows.map((row) => [row.id, row]));
    let count = 0;
    for (const draft of file.drafts) {
      const edited = inputMap.get(draft.id);
      if (!edited?.included || draft.kind === "PAYMENT" || draft.kind === "UNKNOWN") continue;
      const amount = positiveMoney(edited.amount.replace(",", "."));
      const normalized = normalizeText(edited.description);
      const fingerprint = transactionFingerprint({
        userId: context.userId,
        accountId: file.creditCard.accountId,
        date: edited.date,
        description: edited.description,
        amount: amount.toFixed(4),
        installmentNumber: draft.installmentNumber,
      });
      const duplicate = await tx.transaction.findFirst({ where: { userId: context.userId, fingerprint, status: { not: "VOIDED" } } });
      if (duplicate && !edited.forceDuplicate) continue;
      if (edited.categoryId) {
        const category = await tx.category.findFirst({ where: { id: edited.categoryId, userId: context.userId, archivedAt: null } });
        if (!category) throw new AppError("NOT_FOUND", "Uma categoria selecionada não existe.", 404);
      }
      const cycle = invoiceCycleFor(edited.date, file.creditCard.closingDay, file.creditCard.dueDay);
      const invoice = await tx.invoice.upsert({
        where: { creditCardId_referenceMonth: { creditCardId: file.creditCard.id, referenceMonth: cycle.referenceMonth } },
        update: {},
        create: { userId: context.userId, creditCardId: file.creditCard.id, ...cycle },
      });
      const mapped = transactionKind(draft.kind);
      await tx.importDraft.update({
        where: { id: draft.id },
        data: { included: true, wasEdited: edited.description !== draft.description || edited.date !== formatISO(draft.transactionDate, { representation: "date" }) || !amount.equals(draft.amount.toString()), description: edited.description, normalizedDescription: normalized, amount, transactionDate: dateOnly(edited.date), categoryId: edited.categoryId || null, fingerprint },
      });
      await tx.transaction.create({
        data: {
          userId: context.userId,
          accountId: file.creditCard.accountId,
          categoryId: edited.categoryId || null,
          invoiceId: invoice.id,
          importDraftId: draft.id,
          description: edited.description,
          normalizedDescription: normalized,
          amount,
          direction: mapped.direction,
          kind: mapped.kind,
          transactionDate: dateOnly(edited.date),
          source: "PDF_IMPORT",
          fingerprint,
          installmentNumber: draft.installmentNumber,
          installmentTotal: draft.installmentTotal,
        },
      });
      count += 1;
    }
    await tx.importedFile.update({ where: { id: file.id }, data: { status: "COMPLETED", selectedCount: count, confirmedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        userId: context.userId,
        event: "INVOICE_IMPORT_CONFIRMED",
        entityType: "ImportedFile",
        entityId: file.id,
        requestId: crypto.randomUUID(),
        metadata: { importedCount: count, parserKey: file.parserKey },
      },
    });
    return { count, storageKey: file.storageKey, alreadyCompleted: false };
  }, "Serializable");

  if (!result.alreadyCompleted) {
    await storageProvider().delete(result.storageKey);
    await withTenant(context, (tx) => tx.importedFile.update({ where: { id: importId }, data: { storageDeletedAt: new Date() } }));
  }
  return { count: result.count };
}
