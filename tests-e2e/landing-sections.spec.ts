import { test, expect } from "@playwright/test";

test("all landing sections present in correct order", async ({ page }) => {
  await page.goto("/");

  const sections = [
    "Compliance in",
    "What ShipComply does",
    "How it works",
    "Works from Claude, Cursor, Codex",
    "Compliance checks on every PR",
  ];

  const positions: number[] = [];
  for (const text of sections) {
    const el = page.getByText(text).first();
    await expect(el).toBeVisible();
    const box = await el.boundingBox();
    positions.push(box?.y ?? 0);
  }

  for (let i = 1; i < positions.length; i++) {
    expect(positions[i]).toBeGreaterThan(positions[i - 1]);
  }
});

test("MCP config block visible on landing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("shipcomply-mcp-server")).toBeVisible();
});

test("GitHub App install button visible on landing", async ({ page }) => {
  await page.goto("/");
  const btn = page.getByRole("link", { name: /Install GitHub App/i });
  await expect(btn).toBeVisible();
});

test("differentiator cards present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No survey forms")).toBeVisible();
  await expect(page.getByText("File:line citations")).toBeVisible();
  await expect(page.getByText("Working code")).toBeVisible();
});
