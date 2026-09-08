import { addDays, addMonths, addWeeks, addYears, formatISO } from "date-fns";
import Decimal from "decimal.js";
import { withTenant, type TenantContext } from "@/server/database/tenant";
import { AppError } from "@/shared/lib/result";
import { positiveMoney } from "@/shared/lib/money";
import { dateOnly } from "@/server/finance/invoices";
import { normalizeText } from "@/shared/lib/text";
import { transactionFingerprint } from "@/server/finance/fingerprint";

type Unit = "DAY" | "WEEK" | "MONTH" | "YEAR";
const MAX_OCCURRENCES_PER_RUN = 500;

function advance(date: Date, unit: Unit, interval: number) { if (unit === "DAY") return addDays(date, interval); if (unit === "WEEK") return addWeeks(date, interval); if (unit === "YEAR") return addYears(date, interval); return addMonths(date, interval); }

export async function createRecurrence(context: TenantContext, input: { accountId: string; categoryId?: string; description: string; amount: string; kind: "INCOME" | "EXPENSE"; unit: Unit; interval: number; startsOn: string; endsOn?: string }) {
  const amount = positiveMoney(input.amount.replace(",", "."));
  return withTenant(context, async (tx) => {
    const account = await tx.financialAccount.findFirst({ where: { id: input.accountId, userId: context.userId, archivedAt: null } });
    if (!account) throw new AppError("NOT_FOUND", "Conta não encontrada.", 404);
    return tx.recurringTransaction.create({ data: { userId: context.userId, accountId: account.id, categoryId: input.categoryId || null, description: input.description, amount, currency: account.currency, direction: input.kind === "INCOME" ? "CREDIT" : "DEBIT", kind: input.kind, unit: input.unit, interval: input.interval, startsOn: dateOnly(input.startsOn), endsOn: input.endsOn ? dateOnly(input.endsOn) : null, nextRunOn: dateOnly(input.startsOn) } });
  });
}

export function recurringList(context: TenantContext) { return withTenant(context, (tx) => tx.recurringTransaction.findMany({ where: { userId: context.userId, isActive: true }, include: { account: true, category: true }, orderBy: { nextRunOn: "asc" } })); }

export async function runDueRecurrencesForUser(userId: string, today = dateOnly(new Date())) {
  return withTenant({ userId }, async (tx) => {
    await tx.transaction.updateMany({
      where: { userId, status: "SCHEDULED", transactionDate: { lte: today } },
      data: { status: "ACTIVE" },
    });
    const due = await tx.recurringTransaction.findMany({ where: { userId, isActive: true, nextRunOn: { lte: today } }, take: 100 });
    let created = 0;
    for (const recurring of due) {
      let occurrence = recurring.nextRunOn;
      while (
        created < MAX_OCCURRENCES_PER_RUN &&
        occurrence <= today &&
        (!recurring.endsOn || occurrence <= recurring.endsOn)
      ) {
        const date = formatISO(occurrence, { representation: "date" });
        await tx.transaction.upsert({
          where: { recurringTransactionId_occurrenceDate: { recurringTransactionId: recurring.id, occurrenceDate: occurrence } },
          update: {},
          create: { userId, accountId: recurring.accountId, categoryId: recurring.categoryId, recurringTransactionId: recurring.id, occurrenceDate: occurrence, description: recurring.description, normalizedDescription: normalizeText(recurring.description), amount: new Decimal(recurring.amount.toString()), currency: recurring.currency, direction: recurring.direction, kind: recurring.kind, transactionDate: occurrence, source: "SYSTEM", fingerprint: transactionFingerprint({ userId, accountId: recurring.accountId, date, description: recurring.description, amount: new Decimal(recurring.amount.toString()).toFixed(4) }) },
        });
        created += 1; occurrence = advance(occurrence, recurring.unit, recurring.interval);
      }
      await tx.recurringTransaction.update({ where: { id: recurring.id }, data: { nextRunOn: occurrence, isActive: recurring.endsOn ? occurrence <= recurring.endsOn : true } });
      if (created >= MAX_OCCURRENCES_PER_RUN) break;
    }
    return created;
  }, "Serializable");
}
