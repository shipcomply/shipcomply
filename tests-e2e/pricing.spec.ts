import { test, expect } from "@playwright/test";

test("billing defaults to USD for en-US locale", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "en-US" });
  const page = await ctx.newPage();
  await page.goto("/billing");
  await expect(page.getByText("$29")).toBeVisible();
  await ctx.close();
});

test("billing defaults to INR for en-IN locale", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "en-IN" });
  const page = await ctx.newPage();
  await page.goto("/billing");
  await expect(page.getByText("₹2,499")).toBeVisible();
  await ctx.close();
});

test("currency toggle switches values", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "en-IN" });
  const page = await ctx.newPage();
  await page.goto("/billing");
  await expect(page.getByText("₹2,499")).toBeVisible();
  await page.getByRole("button", { name: /USD/i }).click();
  await expect(page.getByText("$29")).toBeVisible();
  await expect(page.getByText("₹2,499")).not.toBeVisible();
  await ctx.close();
});

test("Free plan shows zero cost in both currencies", async ({ browser }) => {
  for (const locale of ["en-IN", "en-US"]) {
    const ctx = await browser.newContext({ locale });
    const page = await ctx.newPage();
    await page.goto("/billing");
    await expect(page.getByText(/Free|₹0|\$0/).first()).toBeVisible();
    await ctx.close();
  }
});
