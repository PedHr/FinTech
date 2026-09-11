import Decimal from "decimal.js";
import type { BankStatementParser, ExtractedDocument, ParsedInvoice, ParsedItem } from "../contracts";

type BankLayout = {
  key: string;
  bank: string;
  signatures: RegExp[];
  selectedAliases: RegExp[];
};

const months: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
};
const dateToken = String.raw`(?:\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?|\d{1,2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))`;
const amountToken = String.raw`(?:R\$\s*[−–-]?\s*|[−–-]?\s*)[\d.]+,\d{2}`;
const rowPattern = new RegExp(String.raw`^\s*(?:[•*Xx]{2,}\s*\d{2,4}\s+)?(${dateToken})\s+(.+?)\s+(${amountToken})(?:\s*[CD])?\s*$`, "i");
const explicitDatePattern = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/;
const textualDatePattern = /^(\d{1,2})\s+([A-Z]{3})$/i;
const invoiceDatePattern = new RegExp(String.raw`\b(?:VENCIMENTO|DATA\s+DE\s+VENCIMENTO|FATURA)\D{0,35}(${dateToken})(?:\s+(20\d{2}))?`, "i");
const installmentPattern = /(?:PARC(?:ELA)?\s*)?(\d{1,3})\s*[/]\s*(\d{1,3})\b/i;
const summaryPattern = /^(?:SALDO (?:RESTANTE )?(?:DA )?FATURA ANTERIOR|SALDO ANTERIOR|TOTAL (?:GERAL|DA FATURA)?|SUBTOTAL|LIMITE (?:TOTAL|DISPON[ÍI]VEL)?|PAGAMENTO M[ÍI]NIMO)$/i;

function numericAmount(raw: string) {
  return new Decimal(raw.replace(/[R$\s]/g, "").replace(/[−–]/g, "-").replace(/\./g, "").replace(",", "."));
}

function referenceDate(text: string) {
  const explicitYears = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  const fallbackYear = explicitYears[0] ?? new Date().getUTCFullYear();
  const header = text.match(invoiceDatePattern);
  if (!header?.[1]) return { year: fallbackYear, month: undefined as number | undefined };
  const parsed = parseRawDate(header[1], Number(header[2] ?? fallbackYear), undefined);
  return parsed ? { year: Number(parsed.slice(0, 4)), month: Number(parsed.slice(5, 7)) } : { year: fallbackYear, month: undefined };
}

function parseRawDate(raw: string, referenceYear: number, invoiceMonth?: number) {
  const value = raw.trim().replace(/\.$/, "");
  const numeric = value.match(explicitDatePattern);
  let day: number;
  let month: number;
  let year: number;
  if (numeric?.[1] && numeric[2]) {
    day = Number(numeric[1]);
    month = Number(numeric[2]);
    const rawYear = numeric[3];
    year = rawYear ? (rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear)) : referenceYear;
  } else {
    const textual = value.match(textualDatePattern);
    if (!textual?.[1] || !textual[2] || !months[textual[2].toUpperCase()]) return null;
    day = Number(textual[1]);
    month = months[textual[2].toUpperCase()]!;
    year = referenceYear;
  }
  if (!numeric?.[3] && invoiceMonth && month > invoiceMonth + 6) year -= 1;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function kindFor(description: string, amount: Decimal): ParsedItem["kind"] {
  if (/\bPAGAMENTO|PGTO(?:\s+DA)?\s+FATURA|DEBITO\s+AUTOMATICO\b/i.test(description)) return "PAYMENT";
  if (amount.isNegative() || /\bESTORNO|CANCELAMENTO|CR[ÉE]DITO\b/i.test(description)) return "REFUND";
  if (/\bTARIFA|ENCARGO|IOF|JUROS|MULTA|ANUIDADE\b/i.test(description)) return "FEE";
  return "PURCHASE";
}

function parseRows(input: ExtractedDocument) {
  const reference = referenceDate(input.text);
  const transactions: ParsedItem[] = [];
  for (const line of input.text.split(/\r?\n/)) {
    const match = line.match(rowPattern);
    if (!match?.[1] || !match[2] || !match[3]) continue;
    const date = parseRawDate(match[1], reference.year, reference.month);
    if (!date) continue;
    const amount = numericAmount(match[3]);
    const installmentMatch = match[2].match(installmentPattern);
    const description = match[2].replace(installmentPattern, "").replace(/\s+/g, " ").trim();
    if (!amount.isFinite() || amount.isZero() || description.length < 2 || summaryPattern.test(description)) continue;
    const current = Number(installmentMatch?.[1]);
    const total = Number(installmentMatch?.[2]);
    transactions.push({
      date,
      description,
      amount: amount.abs().toFixed(2),
      kind: kindFor(description, amount),
      installment: Number.isInteger(current) && Number.isInteger(total) && current > 0 && total >= current
        ? { current, total }
        : null,
      confidence: input.usedOcr ? 0.74 : 0.95,
    });
  }
  return transactions;
}

export function createBankLayoutParser(layout: BankLayout): BankStatementParser {
  return {
    key: layout.key,
    version: "1.0.0",
    async supports({ text, selectedInstitution }) {
      const signature = layout.signatures.some((pattern) => pattern.test(text));
      const selected = layout.selectedAliases.some((pattern) => pattern.test(selectedInstitution ?? ""));
      const rows = parseRows({ text, pages: [], usedOcr: false }).length;
      return {
        supported: rows > 0 && (signature || selected),
        confidence: Math.min(0.995, (signature ? 0.91 : 0.78) + Math.min(rows, 5) * 0.015),
      };
    },
    async parse(input): Promise<ParsedInvoice> {
      const transactions = parseRows(input);
      return {
        bank: layout.bank,
        transactions,
        warnings: transactions.length ? [] : [`Nenhum lançamento reconhecido no layout ${layout.bank}.`],
      };
    },
  };
}
