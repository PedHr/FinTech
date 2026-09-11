import { AppError } from "@/shared/lib/result";
import type { BankStatementParser, ExtractedDocument } from "../contracts";
import { genericPtBrParser } from "./generic-ptbr";
import { nubankParser } from "./nubank";
import { bancoDoBrasilParser } from "./banco-do-brasil";
import { itauParser } from "./itau";
import { santanderParser } from "./santander";
import { bradescoParser } from "./bradesco";
import { caixaParser } from "./caixa";
import { interParser } from "./inter";

const parsers: BankStatementParser[] = [
  nubankParser,
  bancoDoBrasilParser,
  itauParser,
  santanderParser,
  bradescoParser,
  caixaParser,
  interParser,
  genericPtBrParser,
];

export async function parseDocument(document: ExtractedDocument, selectedInstitution?: string) {
  const matches = await Promise.all(parsers.map(async (parser) => ({
    parser,
    match: await parser.supports({ text: document.text, selectedInstitution }),
  })));
  const selected = matches
    .filter(({ match }) => match.supported)
    .sort((left, right) => right.match.confidence - left.match.confidence)[0];
  if (selected) return { ...selected, result: await selected.parser.parse(document) };
  throw new AppError("UNSUPPORTED_PDF", "Não foi possível interpretar esta fatura.");
}
