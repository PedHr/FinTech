import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractDocument } from "@/server/imports/extractor";
import { parseDocument } from "@/server/imports/parsers/registry";

const fixture = path.resolve("tests/fixtures/ourocard-sanitized-encrypted.pdf");

describe("PDF protegido por senha", () => {
  it("diferencia senha ausente, incorreta e correta sem alterar o arquivo", async () => {
    const bytes = new Uint8Array(await readFile(fixture));

    await expect(extractDocument(bytes)).rejects.toMatchObject({ code: "PDF_PASSWORD_REQUIRED" });
    await expect(extractDocument(bytes, { password: "incorreta" })).rejects.toMatchObject({ code: "PDF_PASSWORD_INVALID" });

    const document = await extractDocument(bytes, { password: "fixture-password-2026" });
    expect(document.text).toContain("OUROCARD");
    expect(document.text).toContain("MERCADO FIXTURE");
    expect(document.usedOcr).toBe(false);
  });
});

describe("fixtures PDF dos layouts bancários", () => {
  it.each([
    ["itau", "Itaú", "itau-credit-card"],
    ["santander", "Santander", "santander-credit-card"],
    ["bradesco", "Bradesco", "bradesco-credit-card"],
    ["caixa", "Caixa", "caixa-credit-card"],
    ["inter", "Inter", "inter-credit-card"],
  ])("extrai e seleciona o parser %s", async (name, institution, parserKey) => {
    const bytes = new Uint8Array(await readFile(path.resolve(`tests/fixtures/${name}.pdf`)));
    const document = await extractDocument(bytes);
    const parsed = await parseDocument(document, institution);
    expect(parsed.parser.key).toBe(parserKey);
    expect(parsed.result.transactions).toHaveLength(3);
  });
});
