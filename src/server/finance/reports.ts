import Decimal from "decimal.js";
import { format } from "date-fns";
import { withTenant, type TenantContext } from "@/server/database/tenant";
import { moneyJSON } from "@/shared/lib/money";
import { dateOnly } from "./invoices";

export async function reportData(context: TenantContext, from: string, to: string) {
  return withTenant(context, async (tx) => {
    const transactions = await tx.transaction.findMany({
      where: { userId: context.userId, status: "ACTIVE", transactionDate: { gte: dateOnly(from), lte: dateOnly(to) } },
      include: { category: true, account: { include: { institution: true } } },
      orderBy: { transactionDate: "asc" },
      take: 20_000,
    });
    let income = new Decimal(0);
    let expenses = new Decimal(0);
    const months = new Map<string, { income: Decimal; expenses: Decimal }>();
    const categories = new Map<string, Decimal>();
    const institutions = new Map<string, Decimal>();

    for (const item of transactions) {
      const amount = new Decimal(item.amount.toString());
      const month = format(item.transactionDate, "yyyy-MM");
      const monthRow = months.get(month) ?? { income: new Decimal(0), expenses: new Decimal(0) };
      if (item.kind === "INCOME") {
        income = income.plus(amount);
        monthRow.income = monthRow.income.plus(amount);
      } else if (item.kind === "EXPENSE") {
        expenses = expenses.plus(amount);
        monthRow.expenses = monthRow.expenses.plus(amount);
        const category = item.category?.name ?? "Sem categoria";
        const institution = item.account.institution?.name ?? "Sem instituição";
        categories.set(category, (categories.get(category) ?? new Decimal(0)).plus(amount));
        institutions.set(institution, (institutions.get(institution) ?? new Decimal(0)).plus(amount));
      } else if (item.kind === "REFUND") {
        expenses = expenses.minus(amount);
        monthRow.expenses = monthRow.expenses.minus(amount);
        const category = item.category?.name ?? "Sem categoria";
        const institution = item.account.institution?.name ?? "Sem instituição";
        categories.set(category, (categories.get(category) ?? new Decimal(0)).minus(amount));
        institutions.set(institution, (institutions.get(institution) ?? new Decimal(0)).minus(amount));
      }
      months.set(month, monthRow);
    }

    return {
      summary: { income: moneyJSON(income), expenses: moneyJSON(expenses), cashFlow: moneyJSON(income.minus(expenses)) },
      monthly: [...months].map(([month, value]) => ({ month, income: value.income.toNumber(), expenses: value.expenses.toNumber() })),
      categories: [...categories].filter(([, value]) => value.greaterThan(0)).map(([name, value]) => ({ name, value: value.toNumber() })).sort((a, b) => b.value - a.value).slice(0, 10),
      institutions: [...institutions].filter(([, value]) => value.greaterThan(0)).map(([name, value]) => ({ name, value: value.toNumber() })).sort((a, b) => b.value - a.value).slice(0, 10),
      count: transactions.length,
    };
  });
}
