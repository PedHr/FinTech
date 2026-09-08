import { describe, expect, it } from "vitest";
import { transactionFingerprint } from "@/server/finance/fingerprint";

const base = {
  userId: "3d589e10-5d40-4ef9-91e3-b7c052bd2a5a",
  accountId: "be824ac1-6ee9-460f-884f-3100421d1a94",
  date: "2026-09-07",
  description: "Uber * Trip",
  amount: "35.9000",
};

describe("fingerprint de transação", () => {
  it("normaliza descrição sem perder o isolamento do usuário", () => {
    expect(transactionFingerprint(base)).toBe(transactionFingerprint({ ...base, description: "  úber   trip " }));
    expect(transactionFingerprint(base)).not.toBe(transactionFingerprint({ ...base, userId: "0774b32e-0c71-444d-982d-8c082e061b53" }));
  });

  it("considera a parcela", () => {
    expect(transactionFingerprint({ ...base, installmentNumber: 1 })).not.toBe(transactionFingerprint({ ...base, installmentNumber: 2 }));
  });
});
