import { test, expect } from "@playwright/test";

/** The game area container (excludes debug panel) */
function gameArea(page: import("@playwright/test").Page) {
  return page.getByTestId("game-area");
}

/** Click through the splash screen to start the game */
async function startGame(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByText(/LET.S PLAY/i).click();
}

/** Play through the 3 mood detection rounds (color, vibe, emotion) */
async function playMoodRounds(page: import("@playwright/test").Page) {
  const area = gameArea(page);

  // Round 1: Color pick — click first color swatch button
  await expect(page.getByText(/Round 1/i)).toBeVisible({ timeout: 15_000 });
  await area.locator("button").first().click();
  await page.waitForTimeout(500);

  // Round 2: Vibe pick
  await expect(page.getByText(/Round 2/i)).toBeVisible({ timeout: 15_000 });
  await area.locator("button").first().click();
  await page.waitForTimeout(500);

  // Round 3: Emotion pick — click an emotion card
  await expect(page.getByText(/Round 3/i)).toBeVisible({ timeout: 15_000 });
  const emotionButtons = area.locator("button").filter({
    has: page.locator("span.uppercase"),
  });
  await expect(emotionButtons.first()).toBeVisible({ timeout: 5_000 });
  await emotionButtons.first().click();
  await page.waitForTimeout(500);
}

test.describe("Splash Screen", () => {
  test("shows splash screen with logo and play button", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Mooduel/);
    await expect(page.getByAltText("Mooduel")).toBeVisible();
    await expect(page.getByText(/LET.S PLAY/i)).toBeVisible();
    await expect(page.getByText(/no account needed/i)).toBeVisible();
  });

  test("clicking play starts the game", async ({ page }) => {
    await page.goto("/");
    await page.getByText(/LET.S PLAY/i).click();
    await expect(
      page.getByText(/Round 1/i).or(page.getByText(/loading contenders/i))
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Mood Detection Rounds", () => {
  test("first round shows 5 color swatches", async ({ page }) => {
    await startGame(page);
    await expect(page.getByText(/Round 1/i)).toBeVisible({ timeout: 15_000 });

    const area = gameArea(page);
    const buttons = area.locator("button");
    await expect(buttons.first()).toBeVisible({ timeout: 5_000 });
  });

  test("clicking a color swatch advances to vibe round", async ({ page }) => {
    await startGame(page);
    await expect(page.getByText(/Round 1/i)).toBeVisible({ timeout: 15_000 });

    const area = gameArea(page);
    await area.locator("button").first().click();

    // Should advance to Round 2
    await expect(page.getByText(/Round 2/i)).toBeVisible({ timeout: 15_000 });
  });

  test("emotion round shows 5 emotion cards", async ({ page }) => {
    await startGame(page);
    const area = gameArea(page);

    // Play through color + vibe
    await expect(page.getByText(/Round 1/i)).toBeVisible({ timeout: 15_000 });
    await area.locator("button").first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Round 2/i)).toBeVisible({ timeout: 15_000 });
    await area.locator("button").first().click();
    await page.waitForTimeout(500);

    // Emotion round
    await expect(page.getByText(/Round 3/i)).toBeVisible({ timeout: 15_000 });
    const emotionCards = area.locator("button").filter({
      has: page.locator("span.uppercase"),
    });
    await expect(emotionCards.first()).toBeVisible({ timeout: 5_000 });
    const count = await emotionCards.count();
    expect(count).toBe(5);
  });
});

test.describe("Game Flow", () => {
  test("after mood rounds, shows 5 movie posters", async ({ page }) => {
    await startGame(page);
    await playMoodRounds(page);

    // Round 4 should be poster-pick
    await expect(page.getByText(/Round 4/i)).toBeVisible({ timeout: 15_000 });

    const area = gameArea(page);
    const images = area.locator("img[alt]");
    await expect(images.first()).toBeVisible({ timeout: 10_000 });

    const posterButtons = area.locator("button").filter({ has: page.locator("img") });
    const count = await posterButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test("movie cards show MORE INFO button", async ({ page }) => {
    await startGame(page);
    await playMoodRounds(page);
    await expect(page.getByText(/Round 4/i)).toBeVisible({ timeout: 15_000 });

    const moreInfoButtons = page.getByText(/More info/i);
    await expect(moreInfoButtons.first()).toBeVisible({ timeout: 10_000 });
  });

  test("MORE INFO expands to show genres and details", async ({ page }) => {
    await startGame(page);
    await playMoodRounds(page);
    await expect(page.getByText(/Round 4/i)).toBeVisible({ timeout: 15_000 });

    const moreInfoButtons = page.getByText(/More info/i);
    await expect(moreInfoButtons.first()).toBeVisible({ timeout: 10_000 });
    await moreInfoButtons.first().click();

    await expect(page.getByText("TMDB").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("VOTES").first()).toBeVisible();
    await expect(page.getByText(/^Less$/i).first()).toBeVisible();
  });

  test("clicking a poster advances to next round", async ({ page }) => {
    await startGame(page);
    await playMoodRounds(page);
    await expect(page.getByText(/Round 4/i)).toBeVisible({ timeout: 15_000 });

    const area = gameArea(page);
    const posterButtons = area.locator("button").filter({ has: page.locator("img") });
    await posterButtons.first().click();

    await expect(page.getByText(/Round 5/i)).toBeVisible({ timeout: 15_000 });
  });

  test("reload button reshuffles the round", async ({ page }) => {
    await startGame(page);
    await playMoodRounds(page);
    await expect(page.getByText(/Round 4/i)).toBeVisible({ timeout: 15_000 });

    const area = gameArea(page);
    const reloadButton = area.locator("button").filter({
      hasText: /deal me|reshuffle|not feeling|fresh lineup|try again/i,
    });
    await expect(reloadButton).toBeVisible({ timeout: 5_000 });
    await reloadButton.click();

    // Should still be on same round
    await expect(page.getByText(/Round 4/i)).toBeVisible({ timeout: 15_000 });
  });

  test("debug panel shows system diagnostics", async ({ page }) => {
    await startGame(page);
    await expect(page.getByText(/Round 1/i)).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("SYSTEM DIAGNOSTICS")).toBeVisible();
    await expect(page.getByText("GENRE_WEIGHTS")).toBeVisible();
  });

  test("debug panel can be collapsed and expanded", async ({ page }) => {
    await startGame(page);
    await expect(page.getByText(/Round 1/i)).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("SYSTEM DIAGNOSTICS")).toBeVisible();

    await page.getByTitle("Hide debug").click();
    await expect(page.getByText("SYSTEM DIAGNOSTICS")).not.toBeVisible();

    await page.getByTitle("Show debug").click();
    await expect(page.getByText("SYSTEM DIAGNOSTICS")).toBeVisible();
  });
});

test.describe("Full Game Playthrough", () => {
  test("can play through all rounds to tournament and winner", async ({ page }) => {
    test.setTimeout(180_000);

    await startGame(page);

    // Play through mood detection rounds (3 rounds)
    await playMoodRounds(page);

    const area = gameArea(page);

    // Play through 6 poster-pick rounds
    for (let round = 0; round < 6; round++) {
      const roundText = page.locator("h2");
      await expect(roundText).toBeVisible({ timeout: 15_000 });

      const posterButtons = area.locator("button").filter({ has: page.locator("img[alt]") }).filter({ hasNot: page.locator("text=More info") });
      await expect(posterButtons.first()).toBeVisible({ timeout: 10_000 });
      await posterButtons.first().click();

      await page.waitForTimeout(500);
    }

    // Should enter tournament
    await expect(page.getByText("VS")).toBeVisible({ timeout: 15_000 });

    // Play through tournament
    for (let matchup = 0; matchup < 7; matchup++) {
      const vs = page.getByText("VS");
      if (await vs.isVisible().catch(() => false)) {
        const posterButtons = area.locator("button").filter({ has: page.locator("img") });
        await expect(posterButtons.first()).toBeVisible({ timeout: 10_000 });
        await posterButtons.first().click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    // Should show winner
    const winnerText = page.getByText(/winner|champion|arena|tonight|verdict/i);
    await expect(winnerText.first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Play Again/i)).toBeVisible();
  });
});
