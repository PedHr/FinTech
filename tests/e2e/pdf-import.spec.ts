import { createHash, randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { hash } from "@node-rs/argon2";
import dotenv from "dotenv";
import pg from "pg";
import { expect, test } from "@playwright/test";

dotenv.config({ path: ".env.local", quiet: true });
process.env.BETTER_AUTH_SECRET ??= "playwright-only-secret-with-at-least-32-characters";

const password = "Pdf-e2e-password-2026";
const email = `pdf-e2e-${randomUUID()}@example.com`;
const userId = randomUUID();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

test.setTimeout(180_000);

test.beforeAll(async () => {
  const passwordHash = await hash(password, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into users (id, name, email, "emailVerified", "createdAt", "updatedAt")
       values ($1, $2, $3, true, now(), now())`,
      [userId, "Teste Importação PDF", email],
    );
    await client.query(
      `insert into auth_accounts (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values ($1, $2, 'credential', $3, $4, now(), now())`,
      [randomUUID(), userId, userId, passwordHash],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

test.afterAll(async () => {
  const result = await pool.query<{ storageKey: string }>(
    `select "storageKey" from imported_files where "userId" = $1 and "storageDeletedAt" is null`,
    [userId],
  );
  const storageRoot = path.resolve(".data/uploads");
  if (process.env.PLAYWRIGHT_BASE_URL && result.rows.length > 0) {
    const { del } = await import("@vercel/blob");
    await del(result.rows.map((file) => file.storageKey));
  } else {
    for (const file of result.rows) {
      const target = path.resolve(storageRoot, file.storageKey);
      if (target.startsWith(`${storageRoot}${path.sep}`)) {
        await unlink(target).catch(() => undefined);
      }
    }
  }
  await pool.query(`delete from users where id = $1`, [userId]);
  await pool.end();
});

test("importa um PDF real, confirma as transações e trata duplicidade", async ({ page }, testInfo) => {
  await page.route(/\.blob\.vercel-storage\.com/i, async (route) => {
    // The Vercel deployment-protection headers belong only to the Preview
    // origin. Sending them to the direct Blob upload triggers a CORS preflight.
    const headers = { ...route.request().headers() };
    delete headers["x-vercel-protection-bypass"];
    delete headers["x-vercel-set-bypass-cookie"];
    await route.continue({ headers });
  });
  const pdfPath = testInfo.outputPath("fatura-e2e.pdf");
  await page.setContent(`
    <!doctype html>
    <html lang="pt-BR">
      <body><pre style="font: 18px monospace; line-height: 1.8">
FATURA 2026
10/07 Saldo restante da fatura anterior R$ 0,00
10/07 Saldo restante da fatura anterior R$ 0,00
15/07 LOJA TESTE PDF R$ 35,90
16/07 MERCADO E2E 120,50
17/07 PAGAMENTO FATURA -156,40
      </pre></body>
    </html>
  `);
  await page.pdf({ path: pdfPath, format: "A4" });

  await page.goto("/entrar");
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  const signInResponsePromise = page.waitForResponse((response) => response.url().includes("/api/auth/sign-in/email"));
  await page.getByRole("button", { name: "Entrar" }).click();
  const signInResponse = await signInResponsePromise;
  const signInError = signInResponse.status() === 200
    ? ""
    : await signInResponse.text().catch(() => "Resposta sem corpo.");
  expect(signInResponse.status(), signInError).toBe(200);
  await page.waitForURL(/\/onboarding$/, { waitUntil: "commit" });

  await page.getByLabel("Instituição").fill("Banco de Teste");
  await page.getByLabel("Nome da conta").fill("Conta E2E");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Ir para o dashboard" }).click();
  await page.waitForURL(/\/dashboard$/, { waitUntil: "commit" });
  await expect.poll(async () => {
    const result = await pool.query<{ completed: boolean }>(
      `select ("onboardingCompletedAt" is not null) as completed from users where id = $1`,
      [userId],
    );
    return result.rows[0]?.completed;
  }, { timeout: 30_000 }).toBe(true);

  await page.goto("/cartoes");
  await expect(page.getByRole("heading", { name: "Cartões" })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Cartão PDF E2E");
  await page.locator('select[name="institutionId"]').selectOption({ label: "Banco de Teste" });
  await page.getByLabel("Limite").fill("5000,00");
  await page.getByLabel("Bandeira").fill("Visa");
  await page.getByLabel("Fechamento").fill("20");
  await page.getByLabel("Vencimento").fill("27");
  await page.locator('select[name="paymentAccountId"]').selectOption({ label: "Conta E2E" });
  await page.getByRole("button", { name: "Adicionar cartão" }).click();
  await expect(page.getByText("Cartão adicionado.")).toBeVisible();

  const cardResult = await pool.query<{ id: string }>(
    `select id from credit_cards where "userId" = $1 limit 1`,
    [userId],
  );
  const card = cardResult.rows[0];
  expect(card).toBeTruthy();

  const protectedPdfPath = path.resolve("tests/fixtures/ourocard-sanitized-encrypted.pdf");
  await page.goto("/importacoes/nova");
  await page.getByLabel("Cartão").selectOption({ label: "Cartão PDF E2E" });
  await page.locator('input[type="file"]').setInputFiles(protectedPdfPath);
  await page.getByRole("button", { name: "Analisar fatura" }).click();
  await page.waitForURL(/\/importacoes\/[0-9a-f-]+\/revisao$/, { timeout: 60_000 });
  await expect(page.getByText("Este PDF exige senha para ser aberto.")).toBeVisible();
  await page.getByLabel("Senha do PDF").fill("senha-incorreta");
  await page.getByRole("button", { name: "Reprocessar fatura" }).click();
  await expect(page.getByText("A senha informada para o PDF está incorreta.")).toBeVisible();
  await page.getByLabel("Senha do PDF").fill("fixture-password-2026");
  await page.getByRole("button", { name: "Reprocessar fatura" }).click();
  await expect(page.getByRole("heading", { name: "Revise os lançamentos" })).toBeVisible();
  await expect(page.locator('input[value="MERCADO FIXTURE"]')).toBeVisible();
  await expect(page.locator('input[value="COMPRA"]')).toBeVisible();
  await page.getByRole("button", { name: "Importar 2 transações" }).click();
  await page.waitForURL(/\/transacoes$/);
  const protectedImport = await pool.query<{ errorCode: string | null; storageDeletedAt: Date | null }>(
    `select "errorCode", "storageDeletedAt" from imported_files
       where "userId" = $1 and "displayName" = 'ourocard-sanitized-encrypted.pdf' and status = 'COMPLETED'
       order by "createdAt" desc limit 1`,
    [userId],
  );
  expect(protectedImport.rows[0]?.errorCode).toBeNull();
  expect(protectedImport.rows[0]?.storageDeletedAt).not.toBeNull();

  const pdfHash = createHash("sha256").update(await readFile(pdfPath)).digest("hex");
  const legacyFailureId = randomUUID();
  await pool.query(
    `insert into imported_files
      (id, "userId", "creditCardId", "displayName", "storageKey", "fileHash", "mimeType", "sizeBytes", status,
       "errorCode", "errorMessage", "expiresAt", "createdAt", "updatedAt")
     values ($1, $2, $3, 'falha-anterior.pdf', $4, $5, 'application/pdf', $6, 'FAILED',
       'IMPORT_FAILED', 'Falha anterior simulada.', now() + interval '1 hour', now(), now())`,
    [legacyFailureId, userId, card!.id, `imports/legacy-failure-${randomUUID()}.pdf`, pdfHash, (await readFile(pdfPath)).byteLength],
  );

  await page.goto("/importacoes/nova");
  await page.getByLabel("Cartão").selectOption({ label: "Cartão PDF E2E" });
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Analisar fatura" }).click();
  await page.waitForURL(/\/importacoes\/[0-9a-f-]+\/revisao$/, { timeout: 60_000 });
  const processed = await pool.query<{ status: string; errorCode: string | null; errorMessage: string | null }>(
    `select status, "errorCode", "errorMessage"
       from imported_files where "userId" = $1 and "displayName" = 'fatura-e2e.pdf'
       order by "createdAt" desc limit 1`,
    [userId],
  );
  expect(processed.rows[0]).toMatchObject({ status: "REVIEW_READY", errorCode: null, errorMessage: null });
  await expect(page.getByRole("heading", { name: "Revise os lançamentos" })).toBeVisible();
  await expect(page.locator('input[value="LOJA TESTE PDF"]')).toBeVisible();
  await expect(page.locator('input[value="MERCADO E2E"]')).toBeVisible();
  await expect(page.getByText("Pagamento ignorado")).toBeVisible();
  await page.getByRole("button", { name: "Importar 2 transações" }).click();
  await page.waitForURL(/\/transacoes$/);
  await expect(page.getByText("LOJA TESTE PDF", { exact: true })).toBeVisible();
  await expect(page.getByText("MERCADO E2E", { exact: true })).toBeVisible();

  const releasedLegacy = await pool.query<{ fileHash: string | null }>(
    `select "fileHash" from imported_files where id = $1`,
    [legacyFailureId],
  );
  expect(releasedLegacy.rows[0]?.fileHash).toBeNull();
  const completed = await pool.query<{
    itemCount: number;
    selectedCount: number;
    fileHash: string | null;
    storageDeletedAt: Date | null;
  }>(
    `select "itemCount", "selectedCount", "fileHash", "storageDeletedAt"
       from imported_files where "userId" = $1 and status = 'COMPLETED' and "displayName" = 'fatura-e2e.pdf' limit 1`,
    [userId],
  );
  expect(completed.rows[0]).toMatchObject({ itemCount: 3, selectedCount: 2, fileHash: pdfHash });
  expect(completed.rows[0]?.storageDeletedAt).not.toBeNull();

  await page.goto("/importacoes/nova");
  await page.getByLabel("Cartão").selectOption({ label: "Cartão PDF E2E" });
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Analisar fatura" }).click();
  await page.waitForURL(/\/importacoes\/[0-9a-f-]+\/revisao$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Este PDF já foi importado" })).toBeVisible();

  const duplicate = await pool.query<{ fileHash: string | null; storageDeletedAt: Date | null }>(
    `select "fileHash", "storageDeletedAt"
       from imported_files where "userId" = $1 and status = 'DUPLICATE_FILE' limit 1`,
    [userId],
  );
  expect(duplicate.rows[0]?.fileHash).toBeNull();
  expect(duplicate.rows[0]?.storageDeletedAt).not.toBeNull();
});
