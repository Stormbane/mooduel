import { test, expect, type Page } from "@playwright/test";

/**
 * Card Game smoke test (solo vs the house). Deck stubbed; the house bot
 * is intentionally nondeterministic, so the test plays legally whatever
 * happens and asserts the match structure: full draft, eight tricks,
 * a result with a trick log.
 */

function deckMovie(i: number) {
  const k = i / 16; // 0..1 spread → distinct scores, no draws
  return {
    tmdb_id: 8000 + i,
    title: `Card ${String.fromCharCode(65 + i)}`,
    year: 1990 + i,
    poster_path: null,
    dims: {
      valence: k * 2 - 1,
      arousal: (1 - k) * 2 - 1,
      dominance: k * 2 - 1,
      absorption: k,
      hedonic: 1 - k,
      eudaimonic: k,
      psych_rich: 1 - k,
      comfort_level: k,
      conversation_potential: 1 - k,
    },
  };
}

const championFull = {
  id: 8001, t: "Card B", y: 1991, g: ["Drama"], rt: 100, r: 7.2,
  v: "The card that carried the night.",
  va: 0.2, ar: 0.3, do: 0.1, ab: 0.6, he: 0.5, eu: 0.5, pr: 0.5,
  arc: "man-in-a-hole", em: [], tags: [], wc: [], pa: "even",
  end: "hopeful", co: 0.5, warn: [], conv: 0.5,
};

async function stubApis(page: Page) {
  await page.route("**/api/games/deck*", (route) =>
    route.fulfill({
      json: { deck: Array.from({ length: 16 }, (_, i) => deckMovie(i)) },
    }),
  );
  await page.route(
    (url) => url.pathname === "/api/movies" && url.searchParams.has("ids"),
    (route) => route.fulfill({ json: { movies: [championFull], total: 1, page: 1, limit: 1 } }),
  );
}

test("Card Game: draft eight, play eight tricks, reach a verdict", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await stubApis(page);

  await page.goto("/games/card-game");
  await expect(page.getByRole("heading", { name: "Mooduel: The Card Game" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /SHUFFLE UP/i }).click();

  // Snake draft: make our 8 picks whenever it's our turn
  for (let p = 0; p < 8; p++) {
    await expect(page.getByText("Your pick")).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-testid="pool-card"]:not([disabled])').first().click();
  }

  // Eight tricks: lead with the first legal category when we hold the
  // lead, always answer with our first card.
  for (let t = 1; t <= 8; t++) {
    await expect(page.getByText(`Trick ${t} of 8`)).toBeVisible({ timeout: 20_000 });
    const chips = page.getByTestId("category-chip");
    try {
      await chips.first().click({ timeout: 3_000 });
    } catch {
      // the house led this trick — no chips to pick
    }
    await page.getByTestId("hand-card").first().click({ timeout: 15_000 });
  }

  // Verdict + trick log + share flow
  await expect(page.getByText(/The night is yours|the house wins|Dead heat/i).first()).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText("The tricks")).toBeVisible();
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rematch/i })).toBeVisible();
});
