import { describe, expect, it } from "vitest";
import { uploadPayloadSchema } from "@/features/imports/schemas";

const creditCardId = "f7505b61-9ead-4dd4-a1e8-51f6efc458ec";

describe("invoice upload metadata", () => {
  it("preserves ordinary filenames", () => {
    expect(uploadPayloadSchema.parse({ creditCardId, displayName: "OUROCARD FACIL VISA.pdf" }).displayName)
      .toBe("OUROCARD FACIL VISA.pdf");
  });

  it("accepts long generated PDF filenames and caps only display metadata", () => {
    const displayName = `${"A".repeat(180)}==.pdf`;
    const parsed = uploadPayloadSchema.parse({ creditCardId, displayName });
    expect(parsed.displayName).toHaveLength(120);
    expect(parsed.displayName).toBe(`${"A".repeat(116)}.pdf`);
    expect(parsed.creditCardId).toBe(creditCardId);
  });

  it("still rejects invalid cards and non-PDF names", () => {
    expect(uploadPayloadSchema.safeParse({ creditCardId: "", displayName: "invoice.pdf" }).success).toBe(false);
    expect(uploadPayloadSchema.safeParse({ creditCardId, displayName: "invoice.exe" }).success).toBe(false);
  });
});
