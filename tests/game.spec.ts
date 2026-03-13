import { test, expect } from "@playwright/test";

test.describe("Game Flow", () => {
  test("page loads and shows game immediately", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MOVIE PICKER/);

    // Should show either loading or first round content
    await expect(
      page.getByText("ROUND 1").or(page.getByText("LOADING CONTENDERS"))
    ).toBeVisible({ timeout: 15_000 });
  });

  test("first round shows 5 movie posters", async ({ page }) => {
    await page.goto("/");

    // Wait for round to load
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 15_000 });

    // Should show poster images
    const images = page.locator("img[alt]");
    await expect(images.first()).toBeVisible({ timeout: 10_000 });

    // Should have at least 4 clickable poster buttons (5 minus possible missing poster)
    const posterButtons = page.locator("button").filter({ has: page.locator("img") });
    const count = await posterButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test("movie cards show synopsis and MORE INFO button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 15_000 });

    // Should have MORE INFO buttons
    const moreInfoButtons = page.getByText("MORE INFO");
    await expect(moreInfoButtons.first()).toBeVisible({ timeout: 10_000 });
  });

  test("MORE INFO expands to show genres and details", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 15_000 });

    // Click MORE INFO on first card
    const moreInfoButtons = page.getByText("MORE INFO");
    await expect(moreInfoButtons.first()).toBeVisible({ timeout: 10_000 });
    await moreInfoButtons.first().click();

    // Should show TMDB rating and vote count
    await expect(page.getByText("TMDB").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("VOTES").first()).toBeVisible();

    // Should show LESS button to collapse
    await expect(page.getByText("LESS").first()).toBeVisible();
  });

  test("clicking a poster advances to next round", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 15_000 });

    // Click the first poster button (not MORE INFO)
    const posterButtons = page.locator("button").filter({ has: page.locator("img") });
    await posterButtons.first().click();

    // Should advance — look for ROUND 2
    await expect(page.getByText("ROUND 2")).toBeVisible({ timeout: 15_000 });
  });

  test("reload button reshuffles the round", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 15_000 });

    // Should show a reload button (various texts)
    const reloadButton = page.locator("button").filter({
      hasText: /DEAL ME|RESHUFFLE|NOT FEELING|FRESH|TRY AGAIN/
    });
    await expect(reloadButton).toBeVisible({ timeout: 5_000 });

    // Click it
    await reloadButton.click();

    // Should still be on round 1 (same round, new cards)
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 15_000 });
  });

  test("debug panel shows system diagnostics", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("SYSTEM DIAGNOSTICS")).toBeVisible();
    await expect(page.getByText("GENRE_WEIGHTS")).toBeVisible();
  });

  test("debug panel can be collapsed and expanded", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("SYSTEM DIAGNOSTICS")).toBeVisible();

    await page.getByTitle("Hide debug").click();
    await expect(page.getByText("SYSTEM DIAGNOSTICS")).not.toBeVisible();

    await page.getByTitle("Show debug").click();
    await expect(page.getByText("SYSTEM DIAGNOSTICS")).toBeVisible();
  });
});

test.describe("Full Game Playthrough", () => {
  test("can play through all rounds to tournament and winner", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/");

    // Play through pre-tournament rounds (6 rounds)
    for (let round = 0; round < 6; round++) {
      // Wait for a round header or tournament
      const roundText = page.locator("h2");
      await expect(roundText).toBeVisible({ timeout: 15_000 });

      const headerText = await roundText.textContent();

      // Determine round type and click accordingly
      if (headerText?.includes("VISIONARIES") || headerText?.includes("LENS") || headerText?.includes("AUTEUR") ||
          headerText?.includes("STAR") || headerText?.includes("CHAMPION") || headerText?.includes("A-LIST")) {
        // Person round — click a person card
        const personCards = page.locator("button").filter({ hasText: /ACTOR|DIRECTOR/ });
        await expect(personCards.first()).toBeVisible({ timeout: 10_000 });
        await personCards.first().click();
      } else {
        // Movie round — click a poster (the big button, not MORE INFO)
        const posterButtons = page.locator("button").filter({ has: page.locator("img[alt]") }).filter({ hasNot: page.locator("text=MORE INFO") });
        await expect(posterButtons.first()).toBeVisible({ timeout: 10_000 });
        await posterButtons.first().click();
      }

      await page.waitForTimeout(500);
    }

    // Should enter tournament — VS display
    await expect(page.getByText("VS")).toBeVisible({ timeout: 15_000 });

    // Play through tournament (up to 7 matchups)
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

    // Should show winner
    const winnerText = page.getByText(/WINNER|CHAMPION|ARENA|TONIGHT|VERDICT/);
    await expect(winnerText.first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("PLAY AGAIN")).toBeVisible();
  });
});
