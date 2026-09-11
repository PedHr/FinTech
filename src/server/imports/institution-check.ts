import { normalizeText } from "@/shared/lib/text";
import { AppError } from "@/shared/lib/result";

const banks = [
  { key: "NUBANK", aliases: ["NUBANK", "NU PAGAMENTOS"] },
  { key: "BANCO_DO_BRASIL", aliases: ["BANCO DO BRASIL", "OUROCARD", "BB ADMINISTRADORA DE CARTOES"] },
  { key: "ITAU", aliases: ["ITAU", "ITAU UNIBANCO"] },
  { key: "INTER", aliases: ["BANCO INTER", "INTER PAGAMENTOS"] },
  { key: "SANTANDER", aliases: ["SANTANDER"] },
  { key: "BRADESCO", aliases: ["BRADESCO"] },
  { key: "CAIXA", aliases: ["CAIXA ECONOMICA", "CARTOES CAIXA"] },
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
