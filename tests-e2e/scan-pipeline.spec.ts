/**
 * Live pipeline E2E — requires E2E_LIVE_BACKEND=1 and valid CLERK_TEST_* credentials.
 * Skipped in CI mock runs.
 */
import { test, expect } from "@playwright/test";

const DEMO_REPO = "https://github.com/vercel/next.js";
const LIVE = !!process.env.E2E_LIVE_BACKEND;

test.describe("Full pipeline (live backend)", () => {
  test.skip(!LIVE, "Set E2E_LIVE_BACKEND=1 to run live tests");

  test("sign in → scan → completed → findings → download", async ({ page }) => {
    const email = process.env.CLERK_TEST_EMAIL ?? "";
    const password = process.env.CLERK_TEST_PASSWORD ?? "";
    expect(email, "CLERK_TEST_EMAIL required").toBeTruthy();
    expect(password, "CLERK_TEST_PASSWORD required").toBeTruthy();

    // Sign in
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /continue|sign in/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 15_000 });

    // Start scan
    await page.goto("/scans/new");
    await page.getByPlaceholder(/github\.com/i).fill(DEMO_REPO);
    await page.getByRole("button", { name: /start scan/i }).click();

    // Should redirect to scan detail
    await page.waitForURL(/\/scans\/[a-f0-9-]+/, { timeout: 10_000 });
    const scanUrl = page.url();
    expect(scanUrl).toMatch(/\/scans\/[a-f0-9-]+/);

    // Wait for completion (max 3 min)
    await expect(page.getByText(/completed/i)).toBeVisible({ timeout: 180_000 });

    // Findings present
    const findingsCard = page.getByText(/findings/i).first();
    await expect(findingsCard).toBeVisible();

    // Audit score ring present
    await expect(page.locator("svg circle").last()).toBeVisible();

    // Download policy
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /privacy policy/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/policy-.+\.md/);

    // Download audit
    const [auditDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /audit report/i }).click(),
    ]);
    expect(auditDownload.suggestedFilename()).toMatch(/audit-.+\.md/);

    // Scan appears on dashboard
    await page.goto("/dashboard");
    await expect(page.getByText(DEMO_REPO).first()).toBeVisible({ timeout: 5_000 });
  });
});
