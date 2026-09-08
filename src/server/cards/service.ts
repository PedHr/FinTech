import Decimal from "decimal.js";
import { withTenant, type TenantContext } from "@/server/database/tenant";
import { AppError } from "@/shared/lib/result";
import { positiveMoney } from "@/shared/lib/money";
import { dateOnly } from "@/server/finance/invoices";

export async function invoiceList(context: TenantContext) {
  return withTenant(context, async (tx) => {
    const rows = await tx.invoice.findMany({ where: { userId: context.userId, status: { not: "VOIDED" } }, include: { creditCard: { include: { account: true } }, transactions: { where: { status: { not: "VOIDED" } } }, payments: true }, orderBy: { referenceMonth: "desc" }, take: 24 });
    return rows.map((row) => {
      const total = row.transactions.reduce((sum, item) => item.direction === "DEBIT" ? sum.plus(item.amount.toString()) : sum.minus(item.amount.toString()), new Decimal(0));
      const paid = row.payments.reduce((sum, item) => sum.plus(item.amount.toString()), new Decimal(0));
      return { id: row.id, card: row.creditCard.account.name, referenceMonth: row.referenceMonth, dueDate: row.dueDate, status: row.status, total: total.toFixed(2), paid: paid.toFixed(2), outstanding: Decimal.max(0, total.minus(paid)).toFixed(2), itemCount: row.transactions.length };
    });
  });
}

export async function payInvoice(context: TenantContext, input: { invoiceId: string; sourceAccountId: string; amount: string; paidOn: string }) {
  const amount = positiveMoney(input.amount.replace(",", "."));
  return withTenant(context, async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, userId: context.userId, status: { notIn: ["VOIDED", "PAID"] } }, include: { creditCard: { include: { account: true } }, transactions: { where: { status: { not: "VOIDED" } } }, payments: true } });
    const source = await tx.financialAccount.findFirst({ where: { id: input.sourceAccountId, userId: context.userId, archivedAt: null, type: { not: "CREDIT_CARD" } } });
    if (!invoice || !source) throw new AppError("NOT_FOUND", "Fatura ou conta pagadora não encontrada.", 404);
    if (source.currency !== invoice.creditCard.account.currency) throw new AppError("VALIDATION_ERROR", "A conta pagadora usa outra moeda.");
    const total = invoice.transactions.reduce((sum, item) => item.direction === "DEBIT" ? sum.plus(item.amount.toString()) : sum.minus(item.amount.toString()), new Decimal(0));
    const paid = invoice.payments.reduce((sum, item) => sum.plus(item.amount.toString()), new Decimal(0));
    if (amount.greaterThan(total.minus(paid))) throw new AppError("VALIDATION_ERROR", "O pagamento é maior que o saldo da fatura.");
    const transfer = await tx.transfer.create({ data: { userId: context.userId, sourceAccountId: source.id, destinationAccountId: invoice.creditCard.accountId, amount, currency: source.currency, transferDate: dateOnly(input.paidOn), description: `Pagamento ${invoice.creditCard.account.name}` } });
    const payment = await tx.invoicePayment.create({ data: { userId: context.userId, invoiceId: invoice.id, transferId: transfer.id, amount, paidOn: dateOnly(input.paidOn) } });
    const newPaid = paid.plus(amount); await tx.invoice.update({ where: { id: invoice.id }, data: { status: newPaid.greaterThanOrEqualTo(total) ? "PAID" : "PARTIAL" } });
    return payment;
  }, "Serializable");
}
