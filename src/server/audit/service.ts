import type { Prisma } from "@/generated/prisma/client";

type AuditInput = {
  userId: string;
  event: string;
  entityType: string;
  entityId?: string;
  requestId: string;
  metadata?: Record<string, string | number | boolean>;
};

export function writeAudit(tx: Prisma.TransactionClient, input: AuditInput) {
  return tx.auditLog.create({ data: input });
}
