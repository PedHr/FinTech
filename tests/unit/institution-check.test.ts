import { describe, expect, it } from "vitest";
import { assertInstitutionCompatibility } from "@/server/imports/institution-check";

describe("compatibilidade da instituição", () => {
  it("aceita a instituição selecionada e documentos genéricos", () => {
    expect(() => assertInstitutionCompatibility("Fatura Nubank setembro", "Nubank")).not.toThrow();
    expect(() => assertInstitutionCompatibility("Fatura do cartão", "Nubank")).not.toThrow();
  });

  it("recusa assinatura clara de outro banco", () => {
    expect(() => assertInstitutionCompatibility("BANCO INTER - fatura", "Nubank")).toThrowError(/banco selecionado/);
  });
});
