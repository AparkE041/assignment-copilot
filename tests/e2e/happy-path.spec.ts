import { test, expect } from "@playwright/test";

test.describe("Happy path", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Assignment Copilot/i })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Assignment Copilot/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Send magic link/i })).toBeVisible();
  });

  test("can navigate to login from home", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
