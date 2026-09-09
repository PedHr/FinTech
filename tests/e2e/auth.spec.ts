import { expect, test } from "@playwright/test";

test("serve o favicon sem erro", async ({ request }) => {
  const response = await request.get("/favicon.ico");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
});

test("apresenta login real e link de cadastro", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page.getByRole("heading", { name: /que bom ver você/i })).toBeVisible();
  await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  await expect(page.getByLabel(/senha/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /cadastre-se/i })).toBeVisible();
});

test("redireciona para o dashboard depois que o login é aceito", async ({ page }) => {
  await page.route("**/api/auth/sign-in/email", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      redirect: false,
      token: "test-session-token",
      url: null,
      user: {
        id: "00000000-0000-4000-8000-000000000000",
        name: "Usuário de teste",
        email: "login@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        defaultCurrency: "BRL",
        timezone: "America/Sao_Paulo",
        theme: "SYSTEM",
        onboardingCompletedAt: null,
        consentedAt: null,
      },
    }),
  }));
  await page.route("**/dashboard", (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<h1>Dashboard carregado</h1>",
  }));

  await page.goto("/entrar");
  await page.getByLabel(/e-mail/i).fill("login@example.com");
  await page.getByLabel(/senha/i).fill("test-password-with-12-characters");
  const submitButton = page.getByRole("button", { name: "Entrar" });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard carregado" })).toBeVisible();
});

for (const path of ["/entrar", "/cadastro", "/recuperar-senha"]) {
  test(`aplica o nonce da CSP a todos os scripts em ${path}`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);

    const csp = response.headers()["content-security-policy"];
    const nonce = csp?.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();

    const html = await response.text();
    const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.every((script) => script.includes(`nonce="${nonce}"`))).toBe(true);
    expect(html).toMatch(/<form[^>]*method="post"/i);
  });
}
