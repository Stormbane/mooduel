import { test, expect } from "@playwright/test";

// All game pages load the movie pool (15MB) — need generous timeouts
test.describe.configure({ timeout: 120_000 });

/** Wait for the game to finish loading the movie pool */
async function waitForGameLoad(page: import("@playwright/test").Page) {
  // Wait until loading indicator disappears (it may flash briefly or be slow)
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading movies..."),
    { timeout: 60_000 }
  );
}

test.describe("Games Hub (/games)", () => {
  test("shows the full slate, all live", async ({ page }) => {
    await page.goto("/games");
    await expect(page.getByRole("heading", { name: "Games" })).toBeVisible({ timeout: 10_000 });

    for (const title of [
      "Hotter",
      "Blind Taste Test",
      "Shape of Stories",
      "Mood Bridge",
      "The Dinner Party",
      "Mooduel: The Card Game",
    ]) {
      await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    }
    await expect(page.getByText("The flagship · now playing")).toBeVisible();
  });

  test("live tiles navigate to their games", async ({ page }) => {
    await page.goto("/games");
    await page.getByRole("link", { name: /Hotter/ }).click();
    await expect(page).toHaveURL(/\/games\/hotter/);
    await page.goBack();
    await page.getByRole("link", { name: /Blind Taste Test/ }).click();
    await expect(page).toHaveURL(/\/games\/blind-taste/);
  });
});

test.describe("Blind Taste Test", () => {
  test("loads and shows start button", async ({ page }) => {
    await page.goto("/games/blind-taste");
    await waitForGameLoad(page);
    await expect(page.getByText("SHOW ME THE VIBES")).toBeVisible();
  });

  test("clicking start shows vibe sentences", async ({ page }) => {
    await page.goto("/games/blind-taste");
    await waitForGameLoad(page);
    await page.getByText("SHOW ME THE VIBES").click();

    // Should show quoted vibe sentences
    await expect(page.locator("text=/\u201c/").first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Comfort Zone", () => {
  test("loads and shows start button", async ({ page }) => {
    await page.goto("/games/comfort-zone");
    await waitForGameLoad(page);
    await expect(page.getByText("BEGIN")).toBeVisible();
  });

  test("clicking begin shows movie choices", async ({ page }) => {
    await page.goto("/games/comfort-zone");
    await waitForGameLoad(page);
    await page.getByText("BEGIN").click();

    // Should show movie options
    await expect(page.locator("text=/\u201c/").first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Couples Mediator", () => {
  test("loads and shows start button", async ({ page }) => {
    await page.goto("/games/couples");
    await waitForGameLoad(page);
    await expect(page.getByText("START")).toBeVisible();
  });

  test("clicking start shows mood selection", async ({ page }) => {
    await page.goto("/games/couples");
    await waitForGameLoad(page);
    await page.getByText("START").click();

    await expect(page.getByText(/how are you feeling/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Mood Mirror", () => {
  test("loads and shows start button", async ({ page }) => {
    await page.goto("/games/mirror");
    await waitForGameLoad(page);
    await expect(page.getByText("START").first()).toBeVisible();
  });

  test("clicking start shows binary questions", async ({ page }) => {
    await page.goto("/games/mirror");
    await waitForGameLoad(page);
    await page.getByText("START").first().click();

    // Should show question with two choices
    await expect(page.locator("button").nth(1)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Mood Roulette", () => {
  test("loads and shows spin button", async ({ page }) => {
    await page.goto("/games/roulette");
    await waitForGameLoad(page);
    await expect(page.getByRole("button", { name: "PULL THE LEVER" })).toBeVisible();
  });

  test("spinning produces results", async ({ page }) => {
    await page.goto("/games/roulette");
    await waitForGameLoad(page);
    await page.getByRole("button", { name: "PULL THE LEVER" }).click();

    // Wait for spin to complete
    await expect(page.getByRole("button", { name: "SPIN AGAIN" })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Mood DJ", () => {
  test("loads game interface", async ({ page }) => {
    await page.goto("/games/mood-dj");
    await waitForGameLoad(page);

    // Should show the DJ/marathon interface
    const heading = page.locator("[class*=font-bold]").first();
    await expect(heading).toBeVisible();
  });
});

test.describe("Vibe Search", () => {
  test("shows search input", async ({ page }) => {
    await page.goto("/vibe-search");
    await waitForGameLoad(page);
    const input = page.getByPlaceholder(/feeling/i);
    await expect(input).toBeVisible();
  });

  test("search returns movie results", async ({ page }) => {
    await page.goto("/vibe-search");
    await waitForGameLoad(page);

    const input = page.getByPlaceholder(/feeling/i);
    await input.fill("cozy rainy day comfort");
    await input.press("Enter");

    // Should show matching movies
    await page.waitForTimeout(2000);
    await expect(page.locator("[class*=font-bold]").nth(2)).toBeVisible({ timeout: 10_000 });
  });
});
