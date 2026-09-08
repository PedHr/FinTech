import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { calculateBalances, consolidatedBalance } from "@/server/finance/calculations";

describe("saldo e patrimônio", () => {
  it("calcula saldo inicial, receitas, despesas e ajustes", () => {
    const result = calculateBalances([{ id: "a", openingBalance: "1000.00" }], [
      { accountId: "a", amount: "500.00", effect: "CREDIT" },
      { accountId: "a", amount: "125.37", effect: "DEBIT" },
      { accountId: "a", amount: "0.13", effect: "CREDIT" },
    ]);
    expect(result.get("a")?.toFixed(2)).toBe("1374.76");
  });

  it("mantém impacto consolidado zero em uma transferência", () => {
    const result = calculateBalances([
      { id: "a", openingBalance: "1000" },
      { id: "b", openingBalance: "500" },
    ], [
      { accountId: "a", amount: "250", effect: "DEBIT" },
      { accountId: "b", amount: "250", effect: "CREDIT" },
    ]);
    expect(consolidatedBalance(result.values()).toFixed(2)).toBe("1500.00");
  });

  it("inclui avaliação de investimentos no patrimônio", () => {
    expect(consolidatedBalance([new Decimal("1200")], [new Decimal("800")]).toFixed(2)).toBe("2000.00");
  });
});
