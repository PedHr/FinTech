import { createBankLayoutParser } from "./bank-layout";

export const itauParser = createBankLayoutParser({
  key: "itau-credit-card",
  bank: "Itaú",
  signatures: [/\bITA[ÚU]\b/i, /\bITA[ÚU]\s+UNIBANCO\b/i],
  selectedAliases: [/\bITA[ÚU]\b/i],
});
