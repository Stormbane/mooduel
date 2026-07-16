import { test, expect, type Page } from "@playwright/test";

/**
 * Mood Bridge smoke test. All APIs stubbed. Fixture vectors vary only on
 * hedonic, so moodDistance = |Δhe| / 3 exactly:
 * start(0.0) → mid1(0.3) → mid2(0.6) → target(0.9), each hop 0.10,
 * budget 0.11, gulf 0.30, par 3.
 */

const vec = (he: number) => ({
  va: 0, ar: 0, do: 0, ab: 0, he, eu: 0, pr: 0, co: 0, conv: 0,
});

const START = { id: 9001, t: "Start Movie", y: 2000, pp: null, ...vec(0) };
const MID1 = { id: 9002, t: "Midpoint One", y: 2001, pp: null, ...vec(0.3) };
const MID2 = { id: 9003, t: "Midpoint Two", y: 2002, pp: null, ...vec(0.6) };
const TARGET = { id: 9004, t: "Target Movie", y: 2003, pp: null, ...vec(0.9) };
const TOO_FAR = { id: 9005, t: "Distant Blockbuster", y: 2004, pp: null, ...vec(0.75) };

const PUZZLE = {
  date: "2026-07-17",
  number: 1,
  start: START,
  target: TARGET,
  budget: 0.11,
  par: 3,
};

const searchSlim = (m: typeof MID1) => ({
  ...m, g: ["Drama"], rt: 100, r: 7, v: "vibe", arc: "steady", em: [], tags: [],
  wc: [], pa: "even", end: "hopeful", warn: [], rtc: 80, rta: 80, imdb: 7,
});

const targetFull = {
  id: 9004, t: "Target Movie", y: 2003, g: ["Drama"], rt: 100, r: 7.7,
  v: "The far bank, reached at last.", ...vec(0.9),
  arc: "man-in-a-hole", em: ["relief"], tags: [], wc: [], pa: "even",
  end: "hopeful", warn: [], conv: 0.5,
};

async function stubApis(page: Page) {
  await page.route("**/api/games/bridge/daily*", (route) =>
    route.fulfill({ json: PUZZLE }),
  );
  await page.route("**/api/games/bridge/near*", (route) =>
    route.fulfill({ json: { movies: [MID2] } }),
  );
  await page.route(
    (url) => url.pathname === "/api/movies" && url.searchParams.has("search"),
    (route) =>
      route.fulfill({
        json: { movies: [searchSlim(MID1), searchSlim(TOO_FAR)], total: 2, page: 1, limit: 8 },
      }),
  );
  await page.route(
    (url) => url.pathname === "/api/movies" && url.searchParams.has("ids"),
    (route) => route.fulfill({ json: { movies: [targetFull], total: 1, page: 1, limit: 1 } }),
  );
}

test("Mood Bridge: search hop, undo, hint-rail hop, crossing at par", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await stubApis(page);

  // Intro knows today's crossing
  await page.goto("/games/mood-bridge");
  await expect(
    page.getByText(/Today's crossing: Start Movie \(2000\) to Target Movie \(2003\)/),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Par 3/)).toBeVisible();
  await page.getByRole("button", { name: /BUILD THE BRIDGE/i }).click();

  // On the near bank
  await expect(page.getByText(/You're at/)).toBeVisible();
  await expect(page.getByText("Start Movie", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Hop 1 of 5")).toBeVisible();

  // Search: one in reach (0.10), one too far (0.25)
  await page.getByPlaceholder(/Name a movie/).fill("mid");
  await expect(page.getByText("Midpoint One")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("0.10 · hop")).toBeVisible();
  await expect(page.getByText("0.25 · too far")).toBeVisible();

  // Hop to Midpoint One
  await page.getByRole("button", { name: /Midpoint One/ }).click();
  await expect(page.getByText(/You're at/)).toBeVisible();
  await expect(page.getByText("Midpoint One", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Hop 2 of 5")).toBeVisible();

  // Undo, then re-hop
  await page.getByRole("button", { name: /Step back to Start Movie/ }).click();
  await expect(page.getByText("Hop 1 of 5")).toBeVisible();
  await page.getByPlaceholder(/Name a movie/).fill("mid");
  await page.getByRole("button", { name: /Midpoint One/ }).click();
  await expect(page.getByText("Hop 2 of 5")).toBeVisible();

  // Hint rail to Midpoint Two
  await page.getByRole("button", { name: /See what's in reach/ }).click();
  await expect(page.getByText(/Within reach of Midpoint One/)).toBeVisible();
  await page.getByRole("button", { name: /Midpoint Two/ }).click();
  await expect(page.getByText("Hop 3 of 5")).toBeVisible();

  // The far bank is in range — cross
  const crossBtn = page.getByRole("button", { name: /CROSS TO TARGET MOVIE/ });
  await expect(crossBtn).toBeVisible();
  await crossBtn.click();

  // Result: 3 hops, right on par, hint compass in the share intent
  await expect(page.getByText("Bridge crossed")).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText(/Start Movie to Target Movie in 3 hops\. Right on par\./),
  ).toBeVisible();
  await expect(page.getByText("Your crossing")).toBeVisible();
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Walk it again/i })).toBeVisible();
});
