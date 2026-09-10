import Decimal from "decimal.js";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { withTenant, type TenantContext } from "@/server/database/tenant";
import { moneyJSON } from "@/shared/lib/money";
import { calculateBalances, consolidatedBalance, type LedgerMovement } from "./calculations";

export async function accountBalances(context: TenantContext) {
  return withTenant(context, async (tx) => {
    const accounts = await tx.financialAccount.findMany({
      where: { userId: context.userId, archivedAt: null },
      include: { institution: true, creditCard: true },
      orderBy: { createdAt: "asc" },
    });
    const [transactionSums, outgoing, incoming, cashFlows] = await Promise.all([
      tx.transaction.groupBy({
        by: ["accountId", "direction"],
        where: { userId: context.userId, status: { in: ["ACTIVE", "SCHEDULED"] } },
        _sum: { amount: true },
      }),
      tx.transfer.groupBy({ by: ["sourceAccountId"], where: { userId: context.userId, status: "ACTIVE" }, _sum: { amount: true } }),
      tx.transfer.groupBy({ by: ["destinationAccountId"], where: { userId: context.userId, status: "ACTIVE" }, _sum: { amount: true } }),
      tx.investmentTransaction.groupBy({
        by: ["cashAccountId", "type"],
        where: { userId: context.userId, status: "ACTIVE", cashAccountId: { not: null } },
        _sum: { amount: true },
      }),
    ]);

    const movements: LedgerMovement[] = [
      ...transactionSums.map((item) => ({ accountId: item.accountId, amount: item._sum.amount?.toString() ?? "0", effect: item.direction })),
      ...outgoing.map((item) => ({ accountId: item.sourceAccountId, amount: item._sum.amount?.toString() ?? "0", effect: "DEBIT" as const })),
      ...incoming.map((item) => ({ accountId: item.destinationAccountId, amount: item._sum.amount?.toString() ?? "0", effect: "CREDIT" as const })),
      ...cashFlows.filter((item) => item.cashAccountId).map((item) => ({
        accountId: item.cashAccountId!,
        amount: item._sum.amount?.toString() ?? "0",
        effect: item.type === "SELL" || item.type === "INCOME" ? "CREDIT" as const : "DEBIT" as const,
      })),
    ];
    const calculated = calculateBalances(accounts.map((account) => ({ id: account.id, openingBalance: account.openingBalance.toString() })), movements);

    return accounts.map((account) => {
      const balance = calculated.get(account.id) ?? new Decimal(0);
      return {
        id: account.id,
        name: account.name,
        type: account.type,
        institutionId: account.institutionId,
        institution: account.institution?.name ?? "Sem instituição",
        color: account.color ?? account.institution?.color,
        balance: moneyJSON(balance, account.currency),
        creditLimit: account.creditCard ? moneyJSON(account.creditCard.creditLimit.toString(), account.currency) : null,
      };
    });
  });
}

export async function dashboardData(context: TenantContext) {
  const balances = await accountBalances(context);
  return withTenant(context, async (tx) => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const [monthGroups, latestTransactions, categories, valuations, investments] = await Promise.all([
      tx.transaction.groupBy({
        by: ["kind", "direction"],
        where: { userId: context.userId, status: "ACTIVE", transactionDate: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      tx.transaction.findMany({
        where: { userId: context.userId, status: "ACTIVE" },
        include: { account: { include: { institution: true } }, category: true },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        take: 8,
      }),
      tx.transaction.groupBy({
        by: ["categoryId", "kind"],
        where: { userId: context.userId, status: "ACTIVE", direction: "DEBIT", transactionDate: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      tx.investmentValuation.findMany({ where: { userId: context.userId }, orderBy: { valuedOn: "desc" }, distinct: ["investmentId"] }),
      tx.investment.findMany({ where: { userId: context.userId, isActive: true } }),
    ]);

    const investmentValue = valuations.reduce((sum, item) => sum.plus(item.value.toString()), new Decimal(0));
    const liquid = balances.filter((item) => item.type !== "CREDIT_CARD" && item.type !== "INVESTMENT").reduce((sum, item) => sum.plus(item.balance.amount), new Decimal(0));
    const accountNet = consolidatedBalance(balances.map((item) => new Decimal(item.balance.amount)));
    const expenses = monthGroups.filter((item) => item.kind === "EXPENSE").reduce((sum, item) => sum.plus(item._sum.amount?.toString() ?? 0), new Decimal(0));
    const refunds = monthGroups.filter((item) => item.kind === "REFUND").reduce((sum, item) => sum.plus(item._sum.amount?.toString() ?? 0), new Decimal(0));
    const income = monthGroups.filter((item) => item.kind === "INCOME").reduce((sum, item) => sum.plus(item._sum.amount?.toString() ?? 0), new Decimal(0));

    const categoryIds = categories.map((item) => item.categoryId).filter((id): id is string => Boolean(id));
    const categoryRows = await tx.category.findMany({ where: { userId: context.userId, id: { in: categoryIds } } });
    const categoryData = categories
      .filter((item) => item.categoryId && item.kind === "EXPENSE")
      .map((item) => ({
        name: categoryRows.find((category) => category.id === item.categoryId)?.name ?? "Outros",
        value: new Decimal(item._sum.amount?.toString() ?? 0).toNumber(),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const institutionMap = new Map<string, Decimal>();
    for (const item of balances) {
      institutionMap.set(item.institution, (institutionMap.get(item.institution) ?? new Decimal(0)).plus(item.balance.amount));
    }

    const [ledgerAccounts, ledgerTransactions, ledgerTransfers, allValuations, investmentFlows] = await Promise.all([
      tx.financialAccount.findMany({ where: { userId: context.userId, archivedAt: null } }),
      tx.transaction.findMany({ where: { userId: context.userId, status: { not: "VOIDED" } }, select: { accountId: true, direction: true, amount: true, transactionDate: true } }),
      tx.transfer.findMany({ where: { userId: context.userId, status: "ACTIVE" }, select: { sourceAccountId: true, destinationAccountId: true, amount: true, transferDate: true } }),
      tx.investmentValuation.findMany({ where: { userId: context.userId }, orderBy: { valuedOn: "asc" } }),
      tx.investmentTransaction.findMany({ where: { userId: context.userId, status: "ACTIVE" }, select: { type: true, amount: true, transactionDate: true, cashAccountId: true } }),
    ]);
    const history = Array.from({ length: 6 }, (_, index) => {
      const cutoff = endOfMonth(subMonths(now, 5 - index));
      let value = ledgerAccounts.filter((account) => account.openingDate <= cutoff).reduce((sum, account) => sum.plus(account.openingBalance.toString()), new Decimal(0));
      for (const item of ledgerTransactions.filter((transaction) => transaction.transactionDate <= cutoff)) value = item.direction === "CREDIT" ? value.plus(item.amount.toString()) : value.minus(item.amount.toString());
      for (const transfer of ledgerTransfers.filter((item) => item.transferDate <= cutoff)) {
        if (ledgerAccounts.some((account) => account.id === transfer.sourceAccountId)) value = value.minus(transfer.amount.toString());
        if (ledgerAccounts.some((account) => account.id === transfer.destinationAccountId)) value = value.plus(transfer.amount.toString());
      }
      for (const flow of investmentFlows.filter((item) => item.cashAccountId && item.transactionDate <= cutoff)) {
        value = flow.type === "SELL" || flow.type === "INCOME" ? value.plus(flow.amount.toString()) : value.minus(flow.amount.toString());
      }
      const latestByInvestment = new Map<string, Decimal>();
      for (const valuation of allValuations.filter((item) => item.valuedOn <= cutoff)) latestByInvestment.set(valuation.investmentId, new Decimal(valuation.value.toString()));
      for (const current of latestByInvestment.values()) value = value.plus(current);
      return { month: cutoff.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }), value: value.toNumber() };
    });
    const previousMonthEnd = endOfMonth(subMonths(now, 1));
    const previousByInvestment = new Map<string, Decimal>();
    for (const valuation of allValuations.filter((item) => item.valuedOn <= previousMonthEnd)) previousByInvestment.set(valuation.investmentId, new Decimal(valuation.value.toString()));
    const previousInvestmentValue = [...previousByInvestment.values()].reduce((sum, value) => sum.plus(value), new Decimal(0));
    const netContributions = investmentFlows.filter((item) => item.transactionDate >= monthStart && item.transactionDate <= monthEnd).reduce((sum, item) => item.type === "BUY" ? sum.plus(item.amount.toString()) : item.type === "SELL" ? sum.minus(item.amount.toString()) : sum, new Decimal(0));
    const monthlyReturn = investmentValue.minus(previousInvestmentValue).minus(netContributions);

    return {
      summary: {
        netWorth: moneyJSON(accountNet.plus(investmentValue)),
        available: moneyJSON(liquid),
        investments: moneyJSON(investmentValue),
        expenses: moneyJSON(expenses.minus(refunds)),
        income: moneyJSON(income),
        returns: moneyJSON(monthlyReturn),
      },
      balances,
      categoryData,
      institutionData: [...institutionMap].map(([name, value]) => ({ name, value: value.toNumber() })),
      history,
      investmentsCount: investments.length,
      recent: latestTransactions.map((item) => ({
        id: item.id,
        description: item.description,
        amount: moneyJSON(item.amount.toString(), item.currency),
        direction: item.direction,
        date: item.transactionDate.toISOString().slice(0, 10),
        category: item.category?.name ?? "Sem categoria",
        account: item.account.name,
        institution: item.account.institution?.name ?? "Sem instituição",
      })),
    };
  });
}

export type TransactionFilters = {
  query?: string;
  accountId?: string;
  institutionId?: string;
  categoryId?: string;
  kind?: "INCOME" | "EXPENSE" | "REFUND" | "ADJUSTMENT";
  source?: "MANUAL" | "PDF_IMPORT" | "CSV_IMPORT" | "SYSTEM";
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
};

export async function transactionList(context: TenantContext, filters: TransactionFilters = {}) {
  return withTenant(context, (tx) =>
    tx.transaction.findMany({
      where: {
        userId: context.userId,
        status: { not: "VOIDED" },
        ...(filters.query ? { normalizedDescription: { contains: filters.query.toUpperCase() } } : {}),
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
        ...(filters.institutionId ? { account: { institutionId: filters.institutionId } } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.kind ? { kind: filters.kind } : {}),
        ...(filters.source ? { source: filters.source } : {}),
        ...(filters.dateFrom || filters.dateTo ? { transactionDate: {
          ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } : {}),
          ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T00:00:00.000Z`) } : {}),
        } } : {}),
        ...(filters.minAmount || filters.maxAmount ? { amount: {
          ...(filters.minAmount ? { gte: new Decimal(filters.minAmount.replace(",", ".")) } : {}),
          ...(filters.maxAmount ? { lte: new Decimal(filters.maxAmount.replace(",", ".")) } : {}),
        } } : {}),
      },
      include: { account: { include: { institution: true } }, category: true, tags: { include: { tag: true } } },
      orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      take: 50,
    }),
  );
}

export async function financeOptions(context: TenantContext) {
  return withTenant(context, async (tx) => {
    const [accounts, institutions, categories, cards] = await Promise.all([
      tx.financialAccount.findMany({ where: { userId: context.userId, archivedAt: null }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" } }),
      tx.institution.findMany({ where: { userId: context.userId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      tx.category.findMany({ where: { userId: context.userId, archivedAt: null }, select: { id: true, name: true, color: true, isDefault: true, kind: true }, orderBy: { name: "asc" } }),
      tx.creditCard.findMany({ where: { userId: context.userId, archivedAt: null }, select: { id: true, account: { select: { id: true, name: true } } } }),
    ]);
    return { accounts, institutions, categories, cards };
  });
}
