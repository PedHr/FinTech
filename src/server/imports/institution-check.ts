import { normalizeText } from "@/shared/lib/text";
import { AppError } from "@/shared/lib/result";

const banks = [
  { key: "NUBANK", aliases: ["NUBANK", "NU PAGAMENTOS"] },
  { key: "ITAU", aliases: ["ITAU", "ITAU UNIBANCO"] },
  { key: "INTER", aliases: ["BANCO INTER"] },
  { key: "SANTANDER", aliases: ["SANTANDER"] },
] as const;

function hasPhrase(text: string, phrase: string) {
  return (` ${text} `).includes(` ${phrase} `);
}

export function assertInstitutionCompatibility(documentText: string, selectedInstitution?: string) {
  if (!selectedInstitution) return;
  const document = normalizeText(documentText);
  const selected = normalizeText(selectedInstitution);
  const selectedBank = banks.find((bank) => bank.aliases.some((alias) => hasPhrase(selected, alias)) || hasPhrase(selected, bank.key));
  const detectedBank = banks.find((bank) => bank.aliases.some((alias) => hasPhrase(document, alias)));
  if (selectedBank && detectedBank && selectedBank.key !== detectedBank.key) {
    throw new AppError("INVALID_PDF", "Este PDF parece não pertencer ao banco selecionado.");
  }
}
