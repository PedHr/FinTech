import { describe, expect, it } from "vitest";
import { genericPtBrParser } from "@/server/imports/parsers/generic-ptbr";

describe("parser genérico pt-BR", () => {
  it("estrutura compras, parcelas, pagamentos e estornos", async () => {
    const document = {
      text: [
        "FATURA 2026",
        "15/07 UBER TRIP R$ 35,90",
        "16/07 AMAZON PARC 2/5 120,50",
        "17/07 PAGAMENTO FATURA -1.000,00",
        "18/07 ESTORNO LOJA -20,00",
      ].join("\n"),
      pages: [],
      pageCount: 1,
      usedOcr: false,
    };
    const match = await genericPtBrParser.supports({ text: document.text });
    const parsed = await genericPtBrParser.parse(document);

    expect(match.supported).toBe(true);
    expect(parsed.transactions).toHaveLength(4);
    expect(parsed.transactions[1]).toMatchObject({ description: "AMAZON", amount: "120.50", installment: { current: 2, total: 5 } });
    expect(parsed.transactions[2]?.kind).toBe("PAYMENT");
    expect(parsed.transactions[3]?.kind).toBe("REFUND");
  });
});
