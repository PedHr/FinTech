import Decimal from "decimal.js";
import { accountBalances } from "./queries";
import { withTenant, type TenantContext } from "@/server/database/tenant";

export async function institutionDashboard(context: TenantContext, id: string) {
  const balances = (await accountBalances(context)).filter((item) => item.institutionId === id);
  return withTenant(context, async (tx) => {
    const institution = await tx.institution.findFirst({ where: { id, userId: context.userId, archivedAt: null } });
    if (!institution) return null;
    const accountIds = balances.map((item) => item.id);
    const transactions = await tx.transaction.findMany({ where: { userId: context.userId, accountId: { in: accountIds }, status: "ACTIVE" }, include: { category: true, account: true }, orderBy: { transactionDate: "desc" }, take: 12 });
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const month = transactions.filter((item) => item.transactionDate >= monthStart);
    const income = month.filter((item) => item.kind === "INCOME").reduce((sum, item) => sum.plus(item.amount.toString()), new Decimal(0));
    const expenses = month.filter((item) => item.kind === "EXPENSE").reduce((sum, item) => sum.plus(item.amount.toString()), new Decimal(0));
    return { institution, balances, total: balances.reduce((sum, item) => sum.plus(item.balance.amount), new Decimal(0)).toFixed(2), income: income.toFixed(2), expenses: expenses.toFixed(2), transactions };
  });
}
