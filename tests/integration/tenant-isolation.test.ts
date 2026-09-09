import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("isolamento de tenant no PostgreSQL", () => {
  let prisma: Awaited<typeof import("@/server/database/client")>["prisma"];
  let withTenant: Awaited<typeof import("@/server/database/tenant")>["withTenant"];
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl!;
    process.env.BETTER_AUTH_SECRET ||= "integration-test-secret-at-least-32-characters";
    process.env.APP_URL = "http://localhost:3000";
    process.env.EMAIL_DRIVER = "console";
    ({ prisma } = await import("@/server/database/client"));
    ({ withTenant } = await import("@/server/database/tenant"));
    await prisma.user.createMany({
      data: [
        { id: userA, name: "Tenant A", email: `${userA}@test.local`, emailVerified: true },
        { id: userB, name: "Tenant B", email: `${userB}@test.local`, emailVerified: true },
      ],
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await prisma.$disconnect();
  });

  it("impede que um usuário leia a instituição do outro", async () => {
    const institution = await withTenant({ userId: userA }, (tx) => tx.institution.create({
      data: { userId: userA, name: "Banco privado", normalizedName: "BANCO PRIVADO" },
    }));
    const leaked = await withTenant({ userId: userB }, (tx) => tx.institution.findFirst({ where: { id: institution.id } }));
    expect(leaked).toBeNull();
  });

  it("impede associação composta entre tenants", async () => {
    const institution = await withTenant({ userId: userA }, (tx) => tx.institution.findFirstOrThrow({ where: { userId: userA } }));
    await expect(withTenant({ userId: userB }, (tx) => tx.financialAccount.create({
      data: { userId: userB, institutionId: institution.id, name: "Conta inválida", type: "CHECKING", openingDate: new Date("2026-01-01T00:00:00Z") },
    }))).rejects.toThrow();
  });

  it("consulta credenciais pelo adaptador sem depender de nomes de relações Prisma", async () => {
    const { auth } = await import("@/server/auth/config");
    const response = await auth.handler(new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        email: `${crypto.randomUUID()}@test.local`,
        password: "invalid-password-with-12-characters",
        rememberMe: false,
      }),
    }));

    expect(response.status).toBe(401);
  });
});
