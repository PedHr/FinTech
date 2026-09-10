import Decimal from "decimal.js";
import type { BankStatementParser, ExtractedDocument, ParsedInvoice, ParsedItem } from "../contracts";

const months: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
};
const monthPattern = Object.keys(months).join("|");
const onlyDatePattern = new RegExp(`^\\s*(\\d{1,2})\\s+(${monthPattern})\\.?\\s*$`, "i");
const invoiceDatePattern = new RegExp(`\\b(?:FATURA|VENCIMENTO)\\D{0,30}?(\\d{1,2})\\s+(${monthPattern})\\.?\\s*(20\\d{2})?\\b`, "i");
const amountPattern = /(?:^|\s)([−–-]?\s*(?:R\$\s*)?[\d.]+,\d{2})(?=\s*(?:\||$))/g;
const cardRowPattern = /[•*]{2,}\s*\d{1,4}/;
const installmentPattern = /(?:-|–)?\s*PARCELA\s*(\d{1,3})\s*\/\s*(\d{1,3})\b/i;

function referenceYear(text: string) {
  const match = text.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : new Date().getUTCFullYear();
}

function toDate(day: string, month: string, year: number) {
  return `${year}-${String(months[month.toUpperCase()] ?? 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function amountFrom(line: string) {
  const matches = [...line.matchAll(amountPattern)];
  const raw = matches.at(-1)?.[1];
  if (!raw) return null;
  const value = new Decimal(raw.replace(/[R$\s]/g, "").replace("−", "-").replace("–", "-").replace(/\./g, "").replace(",", "."));
  return value.isFinite() ? value : null;
}

function cleanDescription(line: string) {
  return line
    .replace(cardRowPattern, "")
    .replace(installmentPattern, "")
    .replace(/(?:^|\s)[−–-]?\s*(?:R\$\s*)?[\d.]+,\d{2}(?=\s*(?:\||$))/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function itemKind(description: string, value: Decimal): ParsedItem["kind"] {
  if (/\bPAGAMENT[OA]|PAGAMENTO\s+RECEBIDO\b/i.test(description)) return "PAYMENT";
  if (/\bESTORNO|CANCELAMENT[OA]|CR[ÉE]DITO\b/i.test(description) || value.isNegative()) return "REFUND";
  if (/\bIOF|JUROS|MULTA|ENCARGO|TARIFA\b/i.test(description)) return "FEE";
  return "PURCHASE";
}

function parseRows(input: ExtractedDocument) {
  const year = referenceYear(input.text);
  let currentDate: string | null = null;
  const transactions: ParsedItem[] = [];

  for (const line of input.text.split(/\r?\n/)) {
    const date = line.match(onlyDatePattern);
    if (date?.[1] && date[2]) {
      currentDate = toDate(date[1], date[2], year);
      continue;
    }

    const amount = amountFrom(line);
    if (!amount || !currentDate) continue;
    const hasCard = cardRowPattern.test(line);
    const hasPayment = /\bPAGAMENT[OA]|PAGAMENTO\s+RECEBIDO\b/i.test(line);
    const hasRefund = /\bESTORNO|CANCELAMENT[OA]|CR[ÉE]DITO\b/i.test(line);
    if (!hasCard && !hasPayment && !hasRefund) continue;

    const installment = line.match(installmentPattern);
    const description = cleanDescription(line);
    if (description.length < 2) continue;
    transactions.push({
      date: currentDate,
      description,
      amount: amount.abs().toFixed(2),
      kind: itemKind(description, amount),
      installment: installment?.[1] && installment[2]
        ? { current: Number(installment[1]), total: Number(installment[2]) }
        : null,
      confidence: input.usedOcr ? 0.72 : 0.96,
    });
  }
  return transactions;
}

export const nubankParser: BankStatementParser = {
  key: "nubank-credit-card",
  version: "1.0.0",
  async supports({ text, selectedInstitution }) {
    const selectedNubank = /\bNUBANK\b/i.test(selectedInstitution ?? "");
    const documentNubank = /\bNUBANK\b/i.test(text);
    const matchedRows = parseRows({ text, pages: [], usedOcr: false }).length;
    return {
      supported: (selectedNubank || documentNubank) && matchedRows > 0,
      confidence: Math.min(0.99, 0.78 + matchedRows * 0.03),
    };
  },
  async parse(input): Promise<ParsedInvoice> {
    const transactions = parseRows(input);
    const header = input.text.match(invoiceDatePattern);
    const invoiceDate = header?.[1] && header[2]
      ? toDate(header[1], header[2], header[3] ? Number(header[3]) : referenceYear(input.text))
      : undefined;
    return {
      bank: "Nubank",
      invoiceDate,
      transactions,
      warnings: transactions.length ? [] : ["Nenhum lançamento reconhecido no layout Nubank."],
    };
  },
};
