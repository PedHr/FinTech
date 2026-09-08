import { createHash } from "node:crypto";
import { normalizeText } from "@/shared/lib/text";

export type FingerprintInput = {
  userId: string;
  accountId: string;
  date: string;
  description: string;
  amount: string;
  installmentNumber?: number | null;
};

export function transactionFingerprint(input: FingerprintInput) {
  const normalized = [
    "v1",
    input.userId,
    input.accountId,
    input.date,
    normalizeText(input.description),
    input.amount,
    input.installmentNumber ?? "",
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex");
}
