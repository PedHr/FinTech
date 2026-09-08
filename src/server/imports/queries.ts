import { withTenant, type TenantContext } from "@/server/database/tenant";

export function importList(context: TenantContext) {
  return withTenant(context, (tx) => tx.importedFile.findMany({ where: { userId: context.userId }, include: { creditCard: { include: { account: true } } }, orderBy: { createdAt: "desc" }, take: 50 }));
}

export function importReview(context: TenantContext, id: string) {
  return withTenant(context, (tx) => tx.importedFile.findFirst({
    where: { id, userId: context.userId },
    include: { drafts: { orderBy: { transactionDate: "asc" } }, creditCard: { include: { account: true } } },
  }));
}
