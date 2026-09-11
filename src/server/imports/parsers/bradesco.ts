import { createBankLayoutParser } from "./bank-layout";

export const bradescoParser = createBankLayoutParser({ key: "bradesco-credit-card", bank: "Bradesco", signatures: [/\bBRADESCO\b/i], selectedAliases: [/\bBRADESCO\b/i] });
