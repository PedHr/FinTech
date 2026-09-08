import Decimal from "decimal.js";
import { withTenant, type TenantContext } from "@/server/database/tenant";
import { AppError } from "@/shared/lib/result";
import { positiveMoney } from "@/shared/lib/money";
import { dateOnly } from "@/server/finance/invoices";

export async function createInvestment(context: TenantContext, input: { institutionId: string; accountId: string; name: string; symbol?: string; type: "CDB" | "TREASURY" | "STOCK" | "REIT" | "ETF" | "FUND" | "CRYPTO" | "SAVINGS" | "OTHER"; investedAmount: string; currentValue: string; quantity?: string; date: string }) {
  const invested = positiveMoney(input.investedAmount.replace(",", ".")); const current = positiveMoney(input.currentValue.replace(",", "."));
  return withTenant(context, async (tx) => {
    const [institution, account] = await Promise.all([
      tx.institution.findFirst({ where: { id: input.institutionId, userId: context.userId, archivedAt: null } }),
      tx.financialAccount.findFirst({ where: { id: input.accountId, userId: context.userId, archivedAt: null, type: "INVESTMENT" } }),
    ]);
    if (!institution || !account) throw new AppError("NOT_FOUND", "Instituição ou conta de investimentos não encontrada.", 404);
    const investment = await tx.investment.create({ data: { userId: context.userId, institutionId: institution.id, accountId: account.id, name: input.name, symbol: input.symbol || null, type: input.type } });
    await tx.investmentTransaction.create({ data: { userId: context.userId, investmentId: investment.id, type: "BUY", amount: invested, quantity: input.quantity ? new Decimal(input.quantity.replace(",", ".")) : null, transactionDate: dateOnly(input.date) } });
    await tx.investmentValuation.create({ data: { userId: context.userId, investmentId: investment.id, value: current, valuedOn: dateOnly(input.date) } });
    return investment;
  }, "Serializable");
}

export async function addValuation(context: TenantContext, input: { investmentId: string; value: string; valuedOn: string }) {
  const value = positiveMoney(input.value.replace(",", "."));
  return withTenant(context, async (tx) => {
    const investment = await tx.investment.findFirst({ where: { id: input.investmentId, userId: context.userId, isActive: true } });
    if (!investment) throw new AppError("NOT_FOUND", "Investimento não encontrado.", 404);
    return tx.investmentValuation.upsert({ where: { investmentId_valuedOn: { investmentId: investment.id, valuedOn: dateOnly(input.valuedOn) } }, update: { value }, create: { userId: context.userId, investmentId: investment.id, value, valuedOn: dateOnly(input.valuedOn) } });
  });
}

export async function investmentList(context: TenantContext) {
  return withTenant(context, async (tx) => {
    const rows = await tx.investment.findMany({ where: { userId: context.userId, isActive: true }, include: { institution: true, transactions: { where: { status: "ACTIVE" } }, valuations: { orderBy: { valuedOn: "desc" }, take: 1 } }, orderBy: { name: "asc" } });
    return rows.map((row) => {
      const invested = row.transactions.reduce((sum, item) => item.type === "BUY" ? sum.plus(item.amount.toString()) : item.type === "SELL" ? sum.minus(item.amount.toString()) : sum, new Decimal(0));
      const current = new Decimal(row.valuations[0]?.value.toString() ?? 0); const profit = current.minus(invested);
      return { id: row.id, name: row.name, symbol: row.symbol, type: row.type, institution: row.institution.name, invested: invested.toFixed(2), current: current.toFixed(2), profit: profit.toFixed(2), returnPct: invested.gt(0) ? profit.div(invested).mul(100).toFixed(2) : "0.00" };
    });
  });
}
