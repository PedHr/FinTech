import { expect, test } from "@playwright/test";

test("apresenta login real e link de cadastro", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page.getByRole("heading", { name: /entrar/i })).toBeVisible();
  await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  await expect(page.getByLabel(/senha/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /criar conta/i })).toBeVisible();
});
