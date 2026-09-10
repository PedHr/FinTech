import { describe, expect, it } from "vitest";
import { genericPtBrParser } from "@/server/imports/parsers/generic-ptbr";
import { nubankParser } from "@/server/imports/parsers/nubank";

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

describe("parser de fatura Nubank", () => {
  it("associa a data exibida acima da linha da compra e reconhece parcelas", async () => {
    const document = {
      text: [
        "FATURA 14 SET 2026 Nubank",
        "15 AGO",
        "•••• 1234 | LOJA DE EXEMPLO - Parcela 02/05 | R$ 120,50",
        "16 AGO",
        "•••• 1234 | CAFETERIA EXEMPLO | R$ 10,00",
        "17 AGO",
        "Pagamento recebido 17 AGO | −R$ 130,50",
      ].join("\n"),
      pages: [],
      usedOcr: false,
    };

    const match = await nubankParser.supports({ text: document.text, selectedInstitution: "Nubank" });
    const parsed = await nubankParser.parse(document);

    expect(match.supported).toBe(true);
    expect(parsed.bank).toBe("Nubank");
    expect(parsed.transactions).toHaveLength(3);
    expect(parsed.transactions[0]).toMatchObject({ date: "2026-08-15", amount: "120.50", installment: { current: 2, total: 5 } });
    expect(parsed.transactions[2]?.kind).toBe("PAYMENT");
  });
});
