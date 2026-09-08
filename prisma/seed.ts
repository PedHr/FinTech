import "dotenv/config";
import Decimal from "decimal.js";
import { addDays, addMonths, startOfMonth } from "date-fns";
import { prisma } from "../src/server/database/client";
import { withTenant } from "../src/server/database/tenant";
import { hashPassword } from "../src/server/auth/password";
import { DEFAULT_CATEGORIES } from "../src/server/finance/categories";
import { transactionFingerprint } from "../src/server/finance/fingerprint";
import { invoiceCycleFor } from "../src/server/finance/invoices";
import { normalizeText } from "../src/shared/lib/text";

const email = "demo@finance.local";

function monthDate(offset: number, day: number) {
  const month = addMonths(startOfMonth(new Date()), offset);
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day));
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("O seed de demonstração é bloqueado em produção.");
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12) throw new Error("Defina SEED_DEMO_PASSWORD com pelo menos 12 caracteres.");

  await prisma.user.deleteMany({ where: { email } });
  const user = await prisma.user.create({
    data: {
      name: "Marina Oliveira",
      email,
      emailVerified: true,
      consentedAt: new Date(),
      onboardingCompletedAt: new Date(),
      authAccounts: {
        create: {
          accountId: "seed-placeholder",
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
    include: { authAccounts: true },
  });
  await prisma.authAccount.update({
    where: { id: user.authAccounts[0]!.id },
    data: { accountId: user.id },
  });

  await withTenant({ userId: user.id }, async (tx) => {
    const categories = new Map<string, string>();
    for (const definition of DEFAULT_CATEGORIES) {
      const category = await tx.category.create({
        data: {
          userId: user.id,
          name: definition.name,
          normalizedName: normalizeText(definition.name),
          kind: definition.kind,
          color: definition.color,
          icon: definition.icon,
          isDefault: true,
        },
      });
      categories.set(definition.name, category.id);
      if (definition.patterns?.length) {
        await tx.categorizationRule.createMany({
          data: definition.patterns.map((pattern, index) => ({
            userId: user.id,
            categoryId: category.id,
            pattern,
            matcher: "CONTAINS" as const,
            priority: 10 + index,
          })),
        });
      }
    }

    const [nubank, inter, itau, xp] = await Promise.all([
      tx.institution.create({ data: { userId: user.id, name: "Nubank", normalizedName: "NUBANK", color: "#8b5cf6" } }),
      tx.institution.create({ data: { userId: user.id, name: "Inter", normalizedName: "INTER", color: "#f97316" } }),
      tx.institution.create({ data: { userId: user.id, name: "Itaú", normalizedName: "ITAU", color: "#2563eb" } }),
      tx.institution.create({ data: { userId: user.id, name: "XP", normalizedName: "XP", color: "#111827" } }),
    ]);

    const openingDate = monthDate(-6, 1);
    const [nubankAccount, interAccount, itauCardAccount, xpAccount] = await Promise.all([
      tx.financialAccount.create({ data: { userId: user.id, institutionId: nubank.id, name: "Conta principal", type: "CHECKING", openingBalance: new Decimal("8200"), openingDate } }),
      tx.financialAccount.create({ data: { userId: user.id, institutionId: inter.id, name: "Conta digital", type: "PAYMENT", openingBalance: new Decimal("2800"), openingDate } }),
      tx.financialAccount.create({ data: { userId: user.id, institutionId: itau.id, name: "Itaú Mastercard", type: "CREDIT_CARD", openingBalance: new Decimal("0"), openingDate } }),
      tx.financialAccount.create({ data: { userId: user.id, institutionId: xp.id, name: "Conta investimentos", type: "INVESTMENT", openingBalance: new Decimal("0"), openingDate } }),
    ]);

    const card = await tx.creditCard.create({
      data: {
        userId: user.id,
        accountId: itauCardAccount.id,
        paymentAccountId: nubankAccount.id,
        creditLimit: new Decimal("12000"),
        closingDay: 20,
        dueDay: 27,
        brand: "Mastercard",
      },
    });

    const investment = await tx.investment.create({
      data: { userId: user.id, institutionId: xp.id, accountId: xpAccount.id, name: "CDB Liquidez Diária", symbol: "CDB", type: "CDB" },
    });

    const recurring = [
      { description: "Salário", amount: "6500", direction: "CREDIT" as const, kind: "INCOME" as const, category: "Outros", day: 5 },
      { description: "Netflix", amount: "39.90", direction: "DEBIT" as const, kind: "EXPENSE" as const, category: "Assinaturas", day: 10 },
    ];
    for (const item of recurring) {
      const nextRun = monthDate(1, item.day);
      await tx.recurringTransaction.create({
        data: {
          userId: user.id,
          accountId: nubankAccount.id,
          categoryId: categories.get(item.category),
          description: item.description,
          amount: new Decimal(item.amount),
          direction: item.direction,
          kind: item.kind,
          unit: "MONTH",
          dayOfMonth: item.day,
          startsOn: openingDate,
          nextRunOn: nextRun,
        },
      });
    }

    for (let offset = -5; offset <= 0; offset += 1) {
      const entries = [
        { accountId: nubankAccount.id, description: "Salário Acme", amount: "6500", day: 5, direction: "CREDIT" as const, kind: "INCOME" as const, category: "Outros" },
        { accountId: nubankAccount.id, description: "Aluguel", amount: "1800", day: 8, direction: "DEBIT" as const, kind: "EXPENSE" as const, category: "Moradia" },
        { accountId: interAccount.id, description: "Supermercado Central", amount: String(430 + (offset + 5) * 8), day: 12, direction: "DEBIT" as const, kind: "EXPENSE" as const, category: "Mercado" },
        { accountId: interAccount.id, description: "Uber viagens", amount: String(105 + (offset + 5) * 5), day: 16, direction: "DEBIT" as const, kind: "EXPENSE" as const, category: "Transporte" },
        { accountId: nubankAccount.id, description: "Rendimento conta", amount: String(18 + (offset + 5) * 2), day: 25, direction: "CREDIT" as const, kind: "INCOME" as const, category: "Investimentos" },
      ];
      for (const entry of entries) {
        const transactionDate = monthDate(offset, entry.day);
        await tx.transaction.create({
          data: {
            userId: user.id,
            accountId: entry.accountId,
            categoryId: categories.get(entry.category),
            description: entry.description,
            normalizedDescription: normalizeText(entry.description),
            amount: new Decimal(entry.amount),
            direction: entry.direction,
            kind: entry.kind,
            transactionDate,
            fingerprint: transactionFingerprint({
              userId: user.id,
              accountId: entry.accountId,
              date: transactionDate.toISOString().slice(0, 10),
              description: entry.description,
              amount: new Decimal(entry.amount).toFixed(4),
            }),
          },
        });
      }

      const purchaseDate = monthDate(offset, 14);
      const cycle = invoiceCycleFor(purchaseDate, card.closingDay, card.dueDay);
      const invoice = await tx.invoice.upsert({
        where: { creditCardId_referenceMonth: { creditCardId: card.id, referenceMonth: cycle.referenceMonth } },
        update: {},
        create: { userId: user.id, creditCardId: card.id, ...cycle },
      });
      for (const [description, amount, category] of [
        ["iFood restaurante", "92.50", "Alimentação"],
        ["Netflix.com", "39.90", "Assinaturas"],
      ] as const) {
        await tx.transaction.create({
          data: {
            userId: user.id,
            accountId: itauCardAccount.id,
            invoiceId: invoice.id,
            categoryId: categories.get(category),
            description,
            normalizedDescription: normalizeText(description),
            amount: new Decimal(amount),
            direction: "DEBIT",
            kind: "EXPENSE",
            transactionDate: purchaseDate,
            fingerprint: transactionFingerprint({ userId: user.id, accountId: itauCardAccount.id, date: purchaseDate.toISOString().slice(0, 10), description, amount: new Decimal(amount).toFixed(4) }),
          },
        });
      }

      const transferDate = monthDate(offset, 18);
      await tx.transfer.create({
        data: { userId: user.id, sourceAccountId: nubankAccount.id, destinationAccountId: xpAccount.id, amount: new Decimal("500"), transferDate, description: "Aporte mensal" },
      });
      await tx.investmentTransaction.create({
        data: { userId: user.id, investmentId: investment.id, cashAccountId: xpAccount.id, type: "BUY", amount: new Decimal("500"), transactionDate: transferDate, quantity: new Decimal("5"), unitPrice: new Decimal("100") },
      });
      await tx.investmentValuation.create({
        data: { userId: user.id, investmentId: investment.id, valuedOn: addDays(monthDate(offset, 1), 26), value: new Decimal(3000 + (offset + 5) * 540) },
      });
    }

    await tx.auditLog.create({ data: { userId: user.id, event: "DEVELOPMENT_SEED_CREATED", entityType: "User", entityId: user.id, requestId: "development-seed" } });
  }, "Serializable");

  process.stdout.write(`Seed concluído para ${email}.\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Falha no seed"}\n`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
