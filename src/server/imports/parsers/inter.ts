import { createBankLayoutParser } from "./bank-layout";

export const interParser = createBankLayoutParser({ key: "inter-credit-card", bank: "Inter", signatures: [/\bBANCO\s+INTER\b/i, /\bINTER\s+PAGAMENTOS\b/i], selectedAliases: [/\b(?:BANCO\s+)?INTER\b/i] });
