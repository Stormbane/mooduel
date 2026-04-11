import { test, expect } from "@playwright/test";

test.describe("Explore Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/explore");
    // Wait for initial load
    await expect(page.getByText("The Mood Database")).toBeVisible({ timeout: 10_000 });
  });

  test("shows header and movie count", async ({ page }) => {
    await expect(page.getByText("EXPLORE").first()).toBeVisible();
    await expect(page.getByText("The Mood Database")).toBeVisible();
    // Should show movie count
    await expect(page.getByText(/movies scored/i).first().or(page.getByText(/30,/).first())).toBeVisible({ timeout: 15_000 });
  });

  test("shows search input", async ({ page }) => {
    const search = page.getByPlaceholder(/search by title/i);
    await expect(search).toBeVisible();
  });

  test("shows filter chips", async ({ page }) => {
    await expect(page.getByText("Watch with").first()).toBeVisible();
    await expect(page.getByText("triumphant").first()).toBeVisible();
    await expect(page.getByText("slow-burn").first()).toBeVisible();
  });

  test("shows movie cards after loading", async ({ page }) => {
    // Wait for movies to load from API
    await page.waitForTimeout(3000);
    // Movie cards have the border styling
    const cards = page.locator("[class*='border'][class*='bg-']").filter({ has: page.locator("h3") });
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("search filters results", async ({ page }) => {
    const search = page.getByPlaceholder(/search by title/i);
    await search.fill("inception");

    // Wait for debounced search + results
    await page.waitForTimeout(500);
    await expect(page.getByText("Inception")).toBeVisible({ timeout: 10_000 });
  });

  test("search shows result count", async ({ page }) => {
    const search = page.getByPlaceholder(/search by title/i);
    await search.fill("godfather");

    await page.waitForTimeout(500);
    // Count indicator near search box
    await expect(page.locator("text=/^\\d+$/").first()).toBeVisible({ timeout: 10_000 });
  });

  test("clear search button works", async ({ page }) => {
    const search = page.getByPlaceholder(/search by title/i);
    await search.fill("test query");

    const clearBtn = page.getByLabel("Clear search");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(search).toHaveValue("");
  });

  test("clicking a filter chip activates it", async ({ page }) => {
    const chip = page.getByText("slow-burn").first();
    await chip.click();

    // Chip should be active (purple border)
    await expect(chip).toHaveClass(/bg-\[#8B5CF6\]/);
  });

  test("clear all filters button appears and works", async ({ page }) => {
    // Click a filter to activate it
    await page.getByText("slow-burn").first().click();

    const clearAll = page.getByText("Clear all filters");
    await expect(clearAll).toBeVisible();
    await clearAll.click();

    await expect(clearAll).not.toBeVisible();
  });

  test("show more button loads additional movies", async ({ page }) => {
    // Wait for initial movies
    await expect(page.locator("[class*=grid] > div").first()).toBeVisible({ timeout: 15_000 });

    const showMore = page.getByText(/Show more/i);
    if (await showMore.isVisible()) {
      await expect(showMore).toContainText(/remaining/);
      await showMore.click();

      // Should load more (page counter updates)
      await page.waitForTimeout(2000);
      await expect(page.getByText(/of.*movies/i)).toBeVisible();
    }
  });

  test("empty search shows no results message", async ({ page }) => {
    const search = page.getByPlaceholder(/search by title/i);
    await search.fill("xyznonexistentmovie12345");

    await page.waitForTimeout(500);
    await expect(page.getByText("No movies match your mood")).toBeVisible({ timeout: 10_000 });
  });
});
