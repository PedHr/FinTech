import Decimal from "decimal.js";
import { addMonths, formatISO } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { withTenant, type TenantContext } from "@/server/database/tenant";
import { normalizeText } from "@/shared/lib/text";
import { AppError } from "@/shared/lib/result";
import { positiveMoney, splitInstallments } from "@/shared/lib/money";
import { transactionFingerprint } from "./fingerprint";
import { dateOnly, invoiceCycleFor } from "./invoices";
import { DEFAULT_CATEGORIES } from "./categories";

type Tx = Prisma.TransactionClient;

async function ensureCategories(tx: Tx, userId: string) {
  const existing = await tx.category.count({ where: { userId } });
  if (existing > 0) return;

  for (const item of DEFAULT_CATEGORIES) {
    const category = await tx.category.create({
      data: {
        userId,
        name: item.name,
        normalizedName: normalizeText(item.name),
        kind: item.kind,
        color: item.color,
        icon: item.icon,
        isDefault: true,
      },
    });
    if (item.patterns) {
      await tx.categorizationRule.createMany({
        data: item.patterns.map((pattern, index) => ({
          userId,
          categoryId: category.id,
          pattern,
          matcher: "CONTAINS" as const,
          priority: 10 + index,
        })),
      });
    }
  }
}

export async function completeOnboarding(
  context: TenantContext,
  input: {
    institutionName: string;
    accountName: string;
    accountType: "CHECKING" | "SAVINGS" | "PAYMENT" | "WALLET" | "CASH" | "INVESTMENT" | "OTHER";
    openingBalance: string;
    openingDate: string;
  },
) {
  return withTenant(
    context,
    async (tx) => {
      await ensureCategories(tx, context.userId);
      const normalizedName = normalizeText(input.institutionName);
      const institution = await tx.institution.upsert({
        where: { userId_normalizedName: { userId: context.userId, normalizedName } },
        update: { archivedAt: null },
        create: { userId: context.userId, name: input.institutionName, normalizedName },
      });
      const account = await tx.financialAccount.create({
        data: {
          userId: context.userId,
          institutionId: institution.id,
          name: input.accountName,
          type: input.accountType,
          openingBalance: new Decimal(input.openingBalance.replace(",", ".")),
          openingDate: dateOnly(input.openingDate),
        },
      });
      await tx.user.update({
        where: { id: context.userId },
        data: { onboardingCompletedAt: new Date(), consentedAt: new Date() },
      });
      return { institutionId: institution.id, accountId: account.id };
    },
    "Serializable",
  );
}

export async function createInstitution(context: TenantContext, input: { name: string; color?: string }) {
  return withTenant(context, (tx) =>
    tx.institution.create({
      data: {
        userId: context.userId,
        name: input.name,
        normalizedName: normalizeText(input.name),
        color: input.color,
      },
    }),
  );
}

export async function createAccount(
  context: TenantContext,
  input: {
    institutionId?: string;
    name: string;
    type: "CHECKING" | "SAVINGS" | "PAYMENT" | "WALLET" | "CASH" | "INVESTMENT" | "OTHER";
    openingBalance: string;
    openingDate: string;
    currency: "BRL";
    color?: string;
  },
) {
  return withTenant(context, async (tx) => {
    if (input.institutionId) {
      const institution = await tx.institution.findFirst({ where: { id: input.institutionId, userId: context.userId, archivedAt: null } });
      if (!institution) throw new AppError("NOT_FOUND", "Instituição não encontrada.", 404);
    }
    return tx.financialAccount.create({
      data: {
        userId: context.userId,
        institutionId: input.institutionId || null,
        name: input.name,
        type: input.type,
        openingBalance: new Decimal(input.openingBalance.replace(",", ".")),
        openingDate: dateOnly(input.openingDate),
        currency: input.currency,
        color: input.color,
      },
    });
  });
}

export async function createTransaction(
  context: TenantContext,
  input: {
    accountId: string;
    categoryId?: string;
    description: string;
    amount: string;
    transactionDate: string;
    kind: "INCOME" | "EXPENSE" | "REFUND" | "ADJUSTMENT";
    direction: "CREDIT" | "DEBIT";
    note?: string;
    tags?: string[];
  },
) {
  const amount = positiveMoney(input.amount.replace(",", "."));
  if (input.kind === "INCOME" && input.direction !== "CREDIT") throw new AppError("VALIDATION_ERROR", "Receitas devem ser créditos.");
  if (input.kind === "EXPENSE" && input.direction !== "DEBIT") throw new AppError("VALIDATION_ERROR", "Despesas devem ser débitos.");
  const transactionDate = dateOnly(input.transactionDate);

  return withTenant(context, async (tx) => {
    const account = await tx.financialAccount.findFirst({ where: { id: input.accountId, userId: context.userId, archivedAt: null } });
    if (!account) throw new AppError("NOT_FOUND", "Conta não encontrada.", 404);
    if (input.categoryId) {
      const category = await tx.category.findFirst({ where: { id: input.categoryId, userId: context.userId, archivedAt: null } });
      if (!category) throw new AppError("NOT_FOUND", "Categoria não encontrada.", 404);
    }
    const fingerprint = transactionFingerprint({
      userId: context.userId,
      accountId: account.id,
      date: input.transactionDate,
      description: input.description,
      amount: amount.toFixed(4),
    });
    const created = await tx.transaction.create({
      data: {
        userId: context.userId,
        accountId: account.id,
        categoryId: input.categoryId || null,
        description: input.description,
        normalizedDescription: normalizeText(input.description),
        amount,
        currency: account.currency,
        direction: input.direction,
        kind: input.kind,
        transactionDate,
        note: input.note || null,
        fingerprint,
      },
    });
    for (const name of input.tags ?? []) {
      const normalizedName = normalizeText(name);
      if (!normalizedName) continue;
      const tag = await tx.tag.upsert({
        where: { userId_normalizedName: { userId: context.userId, normalizedName } },
        update: { name },
        create: { userId: context.userId, name, normalizedName },
      });
      await tx.transactionTag.create({ data: { transactionId: created.id, tagId: tag.id } });
    }
    return created;
  });
}

export async function updateTransaction(
  context: TenantContext,
  transactionId: string,
  input: { categoryId?: string; description: string; amount: string; transactionDate: string; note?: string; tags?: string[] },
) {
  const amount = positiveMoney(input.amount.replace(",", "."));
  return withTenant(context, async (tx) => {
    const current = await tx.transaction.findFirst({
      where: { id: transactionId, userId: context.userId, status: { not: "VOIDED" } },
      include: { account: true },
    });
    if (!current) throw new AppError("NOT_FOUND", "Transação não encontrada.", 404);
    if (input.categoryId) {
      const category = await tx.category.findFirst({ where: { id: input.categoryId, userId: context.userId, archivedAt: null } });
      if (!category) throw new AppError("NOT_FOUND", "Categoria não encontrada.", 404);
    }
    const transactionDate = dateOnly(input.transactionDate);
    const fingerprint = transactionFingerprint({
      userId: context.userId,
      accountId: current.accountId,
      date: input.transactionDate,
      description: input.description,
      amount: amount.toFixed(4),
      installmentNumber: current.installmentNumber,
    });
    const updated = await tx.transaction.update({
      where: { id: current.id },
      data: {
        categoryId: input.categoryId || null,
        description: input.description,
        normalizedDescription: normalizeText(input.description),
        amount,
        transactionDate,
        note: input.note || null,
        fingerprint,
      },
    });
    await tx.transactionTag.deleteMany({ where: { transactionId: current.id } });
    for (const name of input.tags ?? []) {
      const normalizedName = normalizeText(name);
      if (!normalizedName) continue;
      const tag = await tx.tag.upsert({
        where: { userId_normalizedName: { userId: context.userId, normalizedName } },
        update: { name },
        create: { userId: context.userId, name, normalizedName },
      });
      await tx.transactionTag.create({ data: { transactionId: current.id, tagId: tag.id } });
    }
    return updated;
  }, "Serializable");
}

export async function voidTransaction(context: TenantContext, transactionId: string) {
  return withTenant(context, async (tx) => {
    const current = await tx.transaction.findFirst({ where: { id: transactionId, userId: context.userId, status: { not: "VOIDED" } } });
    if (!current) throw new AppError("NOT_FOUND", "Transação não encontrada.", 404);
    return tx.transaction.update({ where: { id: current.id }, data: { status: "VOIDED", voidedAt: new Date() } });
  }, "Serializable");
}

export async function createTransfer(
  context: TenantContext,
  input: { sourceAccountId: string; destinationAccountId: string; amount: string; transferDate: string; description: string; note?: string },
) {
  if (input.sourceAccountId === input.destinationAccountId) throw new AppError("VALIDATION_ERROR", "Escolha contas diferentes.");
  const amount = positiveMoney(input.amount.replace(",", "."));
  return withTenant(
    context,
    async (tx) => {
      const accounts = await tx.financialAccount.findMany({
        where: { userId: context.userId, id: { in: [input.sourceAccountId, input.destinationAccountId] }, archivedAt: null },
      });
      if (accounts.length !== 2) throw new AppError("NOT_FOUND", "Uma das contas não foi encontrada.", 404);
      if (accounts[0]?.currency !== accounts[1]?.currency) throw new AppError("VALIDATION_ERROR", "Transferências entre moedas diferentes não estão disponíveis.");
      return tx.transfer.create({
        data: {
          userId: context.userId,
          sourceAccountId: input.sourceAccountId,
          destinationAccountId: input.destinationAccountId,
          amount,
          currency: accounts[0]?.currency ?? "BRL",
          transferDate: dateOnly(input.transferDate),
          description: input.description,
          note: input.note || null,
        },
      });
    },
    "Serializable",
  );
}

export async function createCard(
  context: TenantContext,
  input: { institutionId: string; paymentAccountId?: string; name: string; creditLimit: string; closingDay: number; dueDay: number; brand?: string },
) {
  const creditLimit = positiveMoney(input.creditLimit.replace(",", "."));
  return withTenant(context, async (tx) => {
    const institution = await tx.institution.findFirst({ where: { id: input.institutionId, userId: context.userId, archivedAt: null } });
    if (!institution) throw new AppError("NOT_FOUND", "Instituição não encontrada.", 404);
    if (input.paymentAccountId) {
      const payment = await tx.financialAccount.findFirst({ where: { id: input.paymentAccountId, userId: context.userId, archivedAt: null, type: { not: "CREDIT_CARD" } } });
      if (!payment) throw new AppError("NOT_FOUND", "Conta de pagamento não encontrada.", 404);
    }
    const account = await tx.financialAccount.create({
      data: {
        userId: context.userId,
        institutionId: institution.id,
        name: input.name,
        type: "CREDIT_CARD",
        openingBalance: 0,
        openingDate: dateOnly(new Date()),
      },
    });
    return tx.creditCard.create({
      data: {
        userId: context.userId,
        accountId: account.id,
        paymentAccountId: input.paymentAccountId || null,
        creditLimit,
        closingDay: input.closingDay,
        dueDay: input.dueDay,
        brand: input.brand || null,
      },
    });
  }, "Serializable");
}

export async function createInstallmentPurchase(
  context: TenantContext,
  input: { creditCardId: string; categoryId?: string; description: string; totalAmount: string; installmentCount: number; purchaseDate: string },
) {
  const total = positiveMoney(input.totalAmount.replace(",", "."));
  const parts = splitInstallments(total, input.installmentCount);
  return withTenant(context, async (tx) => {
    const card = await tx.creditCard.findFirst({ where: { id: input.creditCardId, userId: context.userId, archivedAt: null }, include: { account: true } });
    if (!card) throw new AppError("NOT_FOUND", "Cartão não encontrado.", 404);
    const plan = await tx.installmentPlan.create({
      data: {
        userId: context.userId,
        creditCardId: card.id,
        description: input.description,
        totalAmount: total,
        installmentCount: input.installmentCount,
        firstDate: dateOnly(input.purchaseDate),
      },
    });

    for (let index = 0; index < parts.length; index += 1) {
      const occurrence = addMonths(dateOnly(input.purchaseDate), index);
      const cycle = invoiceCycleFor(occurrence, card.closingDay, card.dueDay);
      const invoice = await tx.invoice.upsert({
        where: { creditCardId_referenceMonth: { creditCardId: card.id, referenceMonth: cycle.referenceMonth } },
        update: {},
        create: { userId: context.userId, creditCardId: card.id, ...cycle },
      });
      const part = parts[index];
      if (!part) continue;
      await tx.transaction.create({
        data: {
          userId: context.userId,
          accountId: card.accountId,
          categoryId: input.categoryId || null,
          invoiceId: invoice.id,
          installmentPlanId: plan.id,
          installmentNumber: index + 1,
          installmentTotal: input.installmentCount,
          description: `${input.description} ${index + 1}/${input.installmentCount}`,
          normalizedDescription: normalizeText(input.description),
          amount: new Decimal(part),
          direction: "DEBIT",
          kind: "EXPENSE",
          transactionDate: occurrence,
          status: occurrence > new Date() ? "SCHEDULED" : "ACTIVE",
          fingerprint: transactionFingerprint({
            userId: context.userId,
            accountId: card.accountId,
            date: formatISO(occurrence, { representation: "date" }),
            description: input.description,
            amount: new Decimal(part).toFixed(4),
            installmentNumber: index + 1,
          }),
        },
      });
    }
    return plan;
  }, "Serializable");
}
