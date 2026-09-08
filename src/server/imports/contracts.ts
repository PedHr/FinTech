export type ParserContext = { text: string; selectedInstitution?: string };
export type ParserMatch = { supported: boolean; confidence: number; warning?: string };
export type ParsedItem = {
  date: string;
  description: string;
  amount: string;
  kind: "PURCHASE" | "PAYMENT" | "REFUND" | "FEE" | "UNKNOWN";
  installment: { current: number; total: number } | null;
  confidence: number;
};
export type ParsedInvoice = {
  bank?: string;
  invoiceDate?: string;
  dueDate?: string;
  transactions: ParsedItem[];
  warnings: string[];
};
export type ExtractedDocument = { text: string; pages: string[]; usedOcr: boolean };

export interface BankStatementParser {
  readonly key: string;
  readonly version: string;
  supports(context: ParserContext): Promise<ParserMatch>;
  parse(input: ExtractedDocument): Promise<ParsedInvoice>;
}
