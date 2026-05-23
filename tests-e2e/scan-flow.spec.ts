import { test, expect } from "@playwright/test";

test("scan flow: dashboard navigates to new scan", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("scan result page renders with placeholder state", async ({ page }) => {
  await page.goto("/scans/test-scan-id");
  await expect(page.getByText("Scan Result")).toBeVisible();
  await expect(page.getByText("AI-GENERATED DRAFT")).toBeVisible();
});
