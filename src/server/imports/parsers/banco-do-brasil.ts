import Decimal from "decimal.js";
import type { BankStatementParser, ExtractedDocument, ParsedItem } from "../contracts";
import { createBankLayoutParser } from "./bank-layout";

const standardLayout = createBankLayoutParser({
  key: "banco-do-brasil-ourocard",
  bank: "Banco do Brasil",
  signatures: [/\bBANCO\s+DO\s+BRASIL\b/i, /\bOUROCARD\b/i, /\bBB\s+ADMINISTRADORA\s+DE\s+CART[ÕO]ES\b/i],
  selectedAliases: [/\bBANCO\s+DO\s+BRASIL\b/i, /\bOUROCARD\b/i],
});

// Ourocard prints the merchant before the date and may insert spaces inside
// dates and currency values during text extraction.
const ourocardRow = /^\s*(.*)(\d{2}\s*[/.-]\s*\d{2})\s+(?:BR|US|[A-Z0-9]{2})\s+R\$\s*([\d.\s]+,\s*\d{2})(-?)\s*$/i;
const installmentPattern = /\bPARC\s*(\d{1,3})\s*[/]\s*(\d{1,3})\b/i;

function ourocardRows(input: ExtractedDocument) {
  const year = Number(input.text.match(/\b(20\d{2})\b/)?.[1] ?? new Date().getUTCFullYear());
  const transactions: ParsedItem[] = [];
  let futureInstallments = false;
  for (const rawLine of input.text.split(/\r?\n/)) {
    if (/^\s*Parcelamentos\s+Pr[óo]xima\s+Fatura\s*$/i.test(rawLine)) {
      futureInstallments = true;
      continue;
    }
    if (futureInstallments) continue;
    const match = rawLine.match(ourocardRow);
    if (!match?.[1] || !match[2] || !match[3]) continue;
    const dateParts = match[2].replace(/\s/g, "").split(/[/.\-]/).map(Number);
    const day = dateParts[0];
    const month = dateParts[1];
    if (!day || !month) continue;
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) continue;
    const negative = match[4] === "-";
    const amount = new Decimal(match[3].replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
    if (!amount.isFinite() || amount.isZero()) continue;
    const installment = match[1].match(installmentPattern);
    const description = match[1].replace(installmentPattern, "").replace(/\s+/g, " ").trim();
    if (description.length < 2) continue;
    const normalized = description.toUpperCase();
    const kind: ParsedItem["kind"] = /\bPGTO|PAGAMENTO\b/.test(normalized)
      ? "PAYMENT"
      : negative || /\bESTORNO|CR[ÉE]DITO\b/.test(normalized)
        ? "REFUND"
        : /\bTARIFA|ENCARGO|IOF|JUROS|MULTA|ANUIDADE\b/.test(normalized)
          ? "FEE"
          : "PURCHASE";
    transactions.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      description,
      amount: amount.toFixed(2),
      kind,
      installment: installment?.[1] && installment[2]
        ? { current: Number(installment[1]), total: Number(installment[2]) }
        : null,
      confidence: input.usedOcr ? 0.76 : 0.97,
    });
  }
  return transactions;
}

export const bancoDoBrasilParser: BankStatementParser = {
  key: standardLayout.key,
  version: "1.1.0",
  async supports(context) {
    const standard = await standardLayout.supports(context);
    const signature = /\bOUROCARD\b|\bBANCO\s+DO\s+BRASIL\b/i.test(context.text);
    const rows = ourocardRows({ text: context.text, pages: [], usedOcr: false }).length;
    return {
      supported: standard.supported || (signature && rows > 0),
      confidence: rows > 0 && signature ? Math.min(0.999, 0.94 + Math.min(rows, 10) * 0.005) : standard.confidence,
    };
  },
  async parse(input) {
    const printed = ourocardRows(input);
    if (printed.length > 0) return { bank: "Banco do Brasil", transactions: printed, warnings: [] };
    return standardLayout.parse(input);
  },
};
