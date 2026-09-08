import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type MoneyJSON = { amount: string; currency: string };

export function money(value: Decimal.Value) {
  const amount = new Decimal(value);
  if (!amount.isFinite()) throw new Error("Valor monetário inválido.");
  return amount;
}

export function positiveMoney(value: Decimal.Value) {
  const amount = money(value);
  if (!amount.greaterThan(0)) throw new Error("O valor deve ser maior que zero.");
  return amount;
}

export function moneyJSON(value: Decimal.Value, currency = "BRL"): MoneyJSON {
  return { amount: money(value).toFixed(2), currency };
}

export function formatBRL(value: Decimal.Value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(money(value).toNumber());
}

export function splitInstallments(total: Decimal.Value, count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 120) {
    throw new Error("Quantidade de parcelas inválida.");
  }
  const cents = positiveMoney(total).mul(100).toDecimalPlaces(0).toNumber();
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;

  return Array.from({ length: count }, (_, index) =>
    new Decimal(base + (index === count - 1 ? remainder : 0)).div(100).toFixed(2),
  );
}
