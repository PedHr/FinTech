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
