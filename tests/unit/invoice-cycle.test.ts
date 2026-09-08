import { describe, expect, it } from "vitest";
import { invoiceCycleFor } from "@/server/finance/invoices";

describe("ciclo de fatura", () => {
  it("mantém compra anterior ao fechamento na fatura corrente", () => {
    const cycle = invoiceCycleFor("2026-09-10", 20, 27);
    expect(cycle.closingDate.toISOString().slice(0, 10)).toBe("2026-09-20");
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-09-27");
  });

  it("move compra após o fechamento para o próximo ciclo", () => {
    const cycle = invoiceCycleFor("2026-09-21", 20, 10);
    expect(cycle.closingDate.toISOString().slice(0, 10)).toBe("2026-10-20");
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-11-10");
  });

  it("limita dias no fim de meses curtos", () => {
    const cycle = invoiceCycleFor("2026-02-20", 28, 28);
    expect(cycle.closingDate.toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-03-28");
  });
});
