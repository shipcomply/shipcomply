import { test, expect } from "@playwright/test";

test("landing page loads and shows CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Compliance in")).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started free" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try demo scan" })).toBeVisible();
});

test("landing page shows compliance regulations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("DPDP Act 2023")).toBeVisible();
});
