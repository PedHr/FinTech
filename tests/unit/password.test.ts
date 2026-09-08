import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("senha", () => {
  it("gera Argon2id não reversível e valida sem armazenar texto puro", async () => {
    const password = "senha-local-forte-123";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(password);
    await expect(verifyPassword({ hash, password })).resolves.toBe(true);
    await expect(verifyPassword({ hash, password: "senha-incorreta-123" })).resolves.toBe(false);
  });
});
