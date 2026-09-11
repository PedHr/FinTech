import { createBankLayoutParser } from "./bank-layout";

export const caixaParser = createBankLayoutParser({ key: "caixa-credit-card", bank: "Caixa", signatures: [/\bCAIXA\s+ECON[ÔO]MICA\b/i, /\bCART[ÕO]ES\s+CAIXA\b/i], selectedAliases: [/\bCAIXA\b/i] });
