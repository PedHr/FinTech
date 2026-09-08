import Decimal from "decimal.js";

export type LedgerAccount = { id: string; openingBalance: string };
export type LedgerMovement = { accountId: string; amount: string; effect: "CREDIT" | "DEBIT" };

export function calculateBalances(accounts: LedgerAccount[], movements: LedgerMovement[]) {
  const balances = new Map(accounts.map((account) => [account.id, new Decimal(account.openingBalance)]));
  for (const movement of movements) {
    const current = balances.get(movement.accountId);
    if (!current) continue;
    balances.set(movement.accountId, movement.effect === "CREDIT" ? current.plus(movement.amount) : current.minus(movement.amount));
  }
  return balances;
}

export function consolidatedBalance(balances: Iterable<Decimal>, investmentValues: Iterable<Decimal> = []) {
  let total = new Decimal(0);
  for (const balance of balances) total = total.plus(balance);
  for (const value of investmentValues) total = total.plus(value);
  return total;
}
