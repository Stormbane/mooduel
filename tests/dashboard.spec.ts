import { test, expect } from "@playwright/test";

test.describe("Dashboard Page", () => {
  // Dashboard loads 30K scatter points + stats in batches — needs generous timeout
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("shows loading state initially", async ({ page }) => {
    // Should show loading indicator before data arrives
    await expect(
      page.getByText(/Loading 30,000/i).or(page.getByText("The Emotional Landscape"))
    ).toBeVisible({ timeout: 30_000 });
  });

  test("shows header after loading", async ({ page }) => {
    await expect(page.getByText("DATA DASHBOARD").first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("The Emotional Landscape of Cinema")).toBeVisible();
    await expect(page.getByText(/30,\d+ movies/).first()).toBeVisible();
  });

  test("shows mood map section", async ({ page }) => {
    await expect(page.getByText("MOOD MAP").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("mood map canvas renders", async ({ page }) => {
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test("shows fun facts section", async ({ page }) => {
    await expect(page.getByText("DID YOU KNOW")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("THE SOLO GAP")).toBeVisible();
    await expect(page.getByText("THE SADNESS PARADOX")).toBeVisible();
  });

  test("shows distribution charts", async ({ page }) => {
    await expect(page.getByText("DISTRIBUTIONS").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("EMOTIONAL ARCS").first()).toBeVisible();
    await expect(page.getByText("PACING").first()).toBeVisible();
    await expect(page.getByText("ENDING TYPES").first()).toBeVisible();
    await expect(page.getByText("TOP GENRES").first()).toBeVisible();
  });

  test("shows dataset averages", async ({ page }) => {
    await expect(page.getByText("Avg Valence")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Avg Arousal")).toBeVisible();
    await expect(page.getByText("Avg Comfort")).toBeVisible();
    await expect(page.getByText("Avg Conversation")).toBeVisible();
  });

  test("shows extremes section with superlatives", async ({ page }) => {
    await expect(page.getByText("EXTREMES").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Most Pleasant").first()).toBeVisible();
    await expect(page.getByText("Most Unpleasant").first()).toBeVisible();
    await expect(page.getByText("Highest Conversation").first()).toBeVisible();
    await expect(page.getByText("Most Absorbing").first()).toBeVisible();
  });

  test("shows insight charts section", async ({ page }) => {
    await expect(page.getByText("INSIGHTS").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Cross-dimensional analysis").first()).toBeVisible();
  });
});
