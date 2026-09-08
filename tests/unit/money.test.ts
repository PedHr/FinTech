import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { moneyJSON, splitInstallments } from "@/shared/lib/money";

describe("regras monetárias", () => {
  it("divide os centavos deterministicamente e mantém o total", () => {
    const parts = splitInstallments("100.00", 3);
    expect(parts).toEqual(["33.33", "33.33", "33.34"]);
    expect(parts.reduce((sum, value) => sum.plus(value), new Decimal(0)).toFixed(2)).toBe("100.00");
  });

  it("nunca serializa dinheiro como float", () => {
    expect(moneyJSON(new Decimal("0.1").plus("0.2"))).toEqual({ amount: "0.30", currency: "BRL" });
  });

  it("recusa valores e quantidades inválidas", () => {
    expect(() => splitInstallments("0", 2)).toThrow();
    expect(() => splitInstallments("10", 0)).toThrow();
  });
});
