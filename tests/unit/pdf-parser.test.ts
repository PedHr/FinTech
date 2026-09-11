import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { genericPtBrParser } from "@/server/imports/parsers/generic-ptbr";
import { nubankParser } from "@/server/imports/parsers/nubank";
import { parseDocument } from "@/server/imports/parsers/registry";

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

  it("ignora saldos da fatura anterior, totais e lançamentos zerados", async () => {
    const document = {
      text: [
        "FATURA 2026",
        "10/07 Saldo restante da fatura anterior R$ 0,00",
        "10/07 Saldo restante da fatura anterior R$ 123,45",
        "10/07 Total da fatura R$ 123,45",
        "11/07 VALIDACAO CARTAO R$ 0,00",
        "12/07 COMPRA VALIDA R$ 42,90",
      ].join("\n"),
      pages: [],
      pageCount: 1,
      usedOcr: false,
    };

    const parsed = await genericPtBrParser.parse(document);

    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.transactions[0]).toMatchObject({ description: "COMPRA VALIDA", amount: "42.90" });
  });
});

describe("parsers bancários dedicados", () => {
  const fixtures = [
    ["Banco do Brasil", "BANCO DO BRASIL OUROCARD", "banco-do-brasil-ourocard"],
    ["Itaú", "ITAU UNIBANCO", "itau-credit-card"],
    ["Santander", "BANCO SANTANDER", "santander-credit-card"],
    ["Bradesco", "BANCO BRADESCO", "bradesco-credit-card"],
    ["Caixa", "CAIXA ECONOMICA FEDERAL CARTOES CAIXA", "caixa-credit-card"],
    ["Inter", "BANCO INTER", "inter-credit-card"],
  ] as const;

  it.each(fixtures)("seleciona o layout %s por maior confiança", async (institution, signature, parserKey) => {
    const document = {
      text: [
        signature,
        "VENCIMENTO 10/01/2026",
        "20/12 MERCADO TESTE R$ 89,90",
        "21/12 COMPRA PARC 02/06 R$ 60,00",
        "22/12 ESTORNO LOJA -R$ 10,00",
        "23/12 TARIFA DE CARTAO R$ 5,00",
        "24/12 PAGAMENTO FATURA -R$ 144,90",
        "24/12 TOTAL DA FATURA R$ 144,90",
      ].join("\n"),
      pages: [],
      usedOcr: false,
    };

    const parsed = await parseDocument(document, institution);

    expect(parsed.parser.key).toBe(parserKey);
    expect(parsed.result.transactions).toHaveLength(5);
    expect(parsed.result.transactions[0]).toMatchObject({ date: "2025-12-20", kind: "PURCHASE" });
    expect(parsed.result.transactions[1]?.installment).toEqual({ current: 2, total: 6 });
    expect(parsed.result.transactions.map((item) => item.kind)).toEqual(["PURCHASE", "PURCHASE", "REFUND", "FEE", "PAYMENT"]);
  });

  it("mantém o parser genérico como fallback", async () => {
    const document = { text: "FATURA 2026\n15/07 LOJA GENERICA R$ 35,90", pages: [], usedOcr: false };
    const parsed = await parseDocument(document, "Banco não catalogado");
    expect(parsed.parser.key).toBe("generic-ptbr");
  });

  it("interpreta o layout real sanitizado do Ourocard e ignora a próxima fatura", async () => {
    const text = await readFile(path.resolve("tests/fixtures/banco-do-brasil.txt"), "utf8");
    const parsed = await parseDocument({ text, pages: [text], usedOcr: false }, "Banco do Brasil");
    expect(parsed.parser.key).toBe("banco-do-brasil-ourocard");
    expect(parsed.result.transactions).toHaveLength(3);
    expect(parsed.result.transactions[1]).toMatchObject({
      date: "2026-08-19",
      amount: "120.50",
      installment: { current: 2, total: 5 },
    });
    expect(parsed.result.transactions[2]?.kind).toBe("PAYMENT");
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
