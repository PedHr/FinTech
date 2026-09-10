import Decimal from "decimal.js";
import type { BankStatementParser, ExtractedDocument, ParsedInvoice, ParsedItem } from "../contracts";

const linePattern = /^\s*(\d{2}[/.\-]\d{2}(?:[/.\-]\d{2,4})?|\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\s+(.+?)\s+(-?(?:R\$\s*)?[\d.]+,\d{2})\s*$/i;
const months: Record<string, number> = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12 };
const summaryDescriptionPattern = /^(?:SALDO (?:RESTANTE )?DA FATURA ANTERIOR|SALDO ANTERIOR|TOTAL (?:DA )?FATURA)$/i;

function parseDate(raw: string, referenceYear: number) {
  const numeric = raw.match(/^(\d{2})[/.\-](\d{2})(?:[/.\-](\d{2,4}))?$/);
  if (numeric) {
    const yearText = numeric[3];
    const year = yearText ? (yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText)) : referenceYear;
    return `${year}-${numeric[2]}-${numeric[1]}`;
  }
  const textual = raw.toUpperCase().match(/^(\d{2})\s+([A-Z]{3})$/);
  if (!textual || !months[textual[2] ?? ""]) return null;
  return `${referenceYear}-${String(months[textual[2] ?? ""]).padStart(2, "0")}-${textual[1]}`;
}

function amountValue(raw: string) {
  const normalized = raw.replace(/R\$\s*/i, "").replace(/\./g, "").replace(",", ".");
  return new Decimal(normalized);
}

function itemKind(description: string, negative: boolean): ParsedItem["kind"] {
  const normalized = description.toUpperCase();
  if (/PAGAMENTO|PGTO\s+FATURA/.test(normalized)) return "PAYMENT";
  if (negative || /ESTORNO|CREDITO|CRÉDITO|CANCELAMENTO/.test(normalized)) return "REFUND";
  if (/TARIFA|ENCARGO|IOF|JUROS|MULTA/.test(normalized)) return "FEE";
  return "PURCHASE";
}

export const genericPtBrParser: BankStatementParser = {
  key: "generic-ptbr",
  version: "1.1.0",
  async supports({ text }) {
    const matches = text.split(/\r?\n/).filter((line) => linePattern.test(line)).length;
    return { supported: matches > 0, confidence: Math.min(0.9, 0.35 + matches * 0.05) };
  },
  async parse(input: ExtractedDocument): Promise<ParsedInvoice> {
    const yearMatches = [...input.text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
    const referenceYear = yearMatches[0] ?? new Date().getUTCFullYear();
    const transactions: ParsedItem[] = [];
    for (const line of input.text.split(/\r?\n/)) {
      const match = line.match(linePattern);
      if (!match?.[1] || !match[2] || !match[3]) continue;
      const date = parseDate(match[1], referenceYear);
      if (!date) continue;
      const rawAmount = amountValue(match[3]);
      const installmentMatch = match[2].match(/(?:PARC(?:ELA)?\s*)?(\d{1,3})\s*[\/]\s*(\d{1,3})\b/i);
      const description = match[2].replace(/(?:PARC(?:ELA)?\s*)?\d{1,3}\s*[\/]\s*\d{1,3}\b/i, "").trim();
      // Some invoices repeat dated balance/total rows on every page. They are
      // statement summaries rather than card activity. Zero-value rows also
      // cannot become a transaction and must never reach the database.
      if (rawAmount.isZero() || summaryDescriptionPattern.test(description)) continue;
      transactions.push({
        date,
        description,
        amount: rawAmount.abs().toFixed(2),
        kind: itemKind(description, rawAmount.isNegative()),
        installment: installmentMatch?.[1] && installmentMatch[2] ? { current: Number(installmentMatch[1]), total: Number(installmentMatch[2]) } : null,
        confidence: input.usedOcr ? 0.7 : 0.9,
      });
    }
    return { transactions, warnings: transactions.length ? [] : ["Nenhum lançamento reconhecido no layout genérico."] };
  },
};
