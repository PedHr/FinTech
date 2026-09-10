import { AppError } from "@/shared/lib/result";
import type { BankStatementParser, ExtractedDocument } from "../contracts";
import { genericPtBrParser } from "./generic-ptbr";
import { nubankParser } from "./nubank";

const parsers: BankStatementParser[] = [nubankParser, genericPtBrParser];

export async function parseDocument(document: ExtractedDocument, selectedInstitution?: string) {
  for (const parser of parsers) {
    const match = await parser.supports({ text: document.text, selectedInstitution });
    if (match.supported) return { parser, result: await parser.parse(document), match };
  }
  throw new AppError("UNSUPPORTED_PDF", "Não foi possível interpretar esta fatura.");
}
