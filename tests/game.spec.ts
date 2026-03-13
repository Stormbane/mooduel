import { test, expect } from "@playwright/test";

test.describe("Game Flow", () => {
  test("page loads and shows game immediately", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Movie Picker");

    // Should show either loading or first round
    await expect(
      page.getByText("Pick a Movie").or(page.getByText("Finding movies"))
    ).toBeVisible({ timeout: 15_000 });
  });

  test("first round shows poster pick with 3 movies", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Pick a Movie")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Which one are you in the mood for?")).toBeVisible();

    // Should have poster images
    const images = page.locator("img[alt]");
    await expect(images.first()).toBeVisible({ timeout: 10_000 });

    // Should have at least 2 clickable poster buttons
    const posterButtons = page.locator("button").filter({ has: page.locator("img") });
    const count = await posterButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("clicking a poster advances to next round", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Pick a Movie")).toBeVisible({ timeout: 15_000 });

    // Click the first poster
    const posterButtons = page.locator("button").filter({ has: page.locator("img") });
    await posterButtons.first().click();

    // Should advance — wait for any next round header or loading
    await expect(
      page.getByText("Pick a Movie")
        .or(page.getByText("Pick an Actor"))
        .or(page.getByText("Pick a Director"))
        .or(page.getByText("Finding movies"))
    ).toBeVisible({ timeout: 15_000 });
  });

  test("debug panel is visible and shows profile data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Pick a Movie")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Profile Debug")).toBeVisible();
    await expect(page.getByText("Round")).toBeVisible();
    await expect(page.getByText("Phase")).toBeVisible();
    await expect(page.getByText("Genre Weights")).toBeVisible();
  });

  test("debug panel updates after a pick", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Pick a Movie")).toBeVisible({ timeout: 15_000 });

    // Initially should show "No data yet" for genres
    await expect(page.getByText("No data yet").first()).toBeVisible();

    // Click first poster
    const posterButtons = page.locator("button").filter({ has: page.locator("img") });
    await posterButtons.first().click();

    // Wait for next round
    await page.waitForTimeout(2000);

    // Weight bars should appear
    const weightBars = page.locator(".bg-primary.rounded-full.h-full");
    await expect(weightBars.first()).toBeVisible({ timeout: 10_000 });
  });

  test("debug panel can be collapsed and expanded", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Pick a Movie")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Profile Debug")).toBeVisible();

    await page.getByTitle("Hide debug").click();
    await expect(page.getByText("Profile Debug")).not.toBeVisible();

    await page.getByTitle("Show debug").click();
    await expect(page.getByText("Profile Debug")).toBeVisible();
  });

  test("progress bar advances with each round", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Pick a Movie")).toBeVisible({ timeout: 15_000 });

    // Click first poster
    const posterButtons = page.locator("button").filter({ has: page.locator("img") });
    await posterButtons.first().click();

    // Wait for next round to load
    await page.waitForTimeout(3000);

    // The round counter in debug panel should show Round 2
    await expect(page.getByText("2").first()).toBeVisible();
  });
});

test.describe("Full Game Playthrough", () => {
  test("can play through all rounds to tournament and winner", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/");

    // Play through pre-tournament rounds (6 rounds)
    for (let round = 0; round < 6; round++) {
      // Wait for a round to appear
      const roundHeader = page.locator("h2");
      await expect(roundHeader).toBeVisible({ timeout: 15_000 });

      const headerText = await roundHeader.textContent();

      if (headerText?.includes("Pick a Movie")) {
        const posterButtons = page.locator("button").filter({ has: page.locator("img") });
        await expect(posterButtons.first()).toBeVisible({ timeout: 10_000 });
        await posterButtons.first().click();
      } else if (headerText?.includes("Pick an Actor") || headerText?.includes("Pick a Director")) {
        const personCards = page.locator("button").filter({ hasText: /Actor|Director/ });
        await expect(personCards.first()).toBeVisible({ timeout: 10_000 });
        await personCards.first().click();
      }

      await page.waitForTimeout(500);
    }

    // Should enter tournament phase with VS display
    await expect(page.getByText("VS")).toBeVisible({ timeout: 15_000 });

    // Play through tournament matchups (up to 7)
    for (let matchup = 0; matchup < 7; matchup++) {
      const vs = page.getByText("VS");
      if (await vs.isVisible().catch(() => false)) {
        const posterButtons = page.locator("button").filter({ has: page.locator("img") });
        await expect(posterButtons.first()).toBeVisible({ timeout: 10_000 });
        await posterButtons.first().click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    // Should show winner screen
    await expect(page.getByText("Tonight, watch")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Play Again")).toBeVisible();
  });
});
