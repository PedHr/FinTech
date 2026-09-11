import { createBankLayoutParser } from "./bank-layout";

export const santanderParser = createBankLayoutParser({ key: "santander-credit-card", bank: "Santander", signatures: [/\bSANTANDER\b/i], selectedAliases: [/\bSANTANDER\b/i] });
