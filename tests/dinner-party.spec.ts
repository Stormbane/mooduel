import { test, expect, type Page } from "@playwright/test";

/**
 * Dinner Party smoke test. The party API is stubbed with one party whose
 * reactions are precomputed (as the real server does), so the reveal
 * logic and tally are exercised deterministically.
 */

const GOOD = {
  id: 7001, t: "The Crowd Pleaser", y: 2010, pp: null,
  v: "Everyone leaves lighter than they arrived.",
  reactions: [
    { s: 0.9, line: "Ada settles in." },
    { s: 0.85, line: "Ben exhales for the first time all day." },
    { s: 0.8, line: "Cleo is exactly where she needs to be." },
    { s: 0.6, line: "It half-lands for Dev. Dev wants it to mean something, and this doesn't." },
  ],
  total: 3.15,
};

const BAD = {
  id: 7002, t: "The Table Bomb", y: 2012, pp: null,
  v: "A slow descent nobody asked for tonight.",
  reactions: [
    { s: 0.2, line: "This would leave Ada more wired than she arrived." },
    { s: 0.3, line: "Too heavy for where Ben is tonight." },
    { s: 0.9, line: "Cleo settles in." },
    { s: 0.1, line: "This lands squarely on Dev's bruise." },
  ],
  total: 1.5,
};

const PARTY = {
  guests: [
    { name: "Ada", vignette: "Ada needs her pulse talked down." },
    { name: "Ben", vignette: "Ben cannot take anything heavy tonight." },
    { name: "Cleo", vignette: "Cleo wants somewhere to go." },
    { name: "Dev", vignette: "Dev wants it to mean something." },
  ],
  shelf: [GOOD, BAD],
  modelPickId: 7001,
};

const championFull = {
  id: 7002, t: "The Table Bomb", y: 2012, g: ["Drama"], rt: 105, r: 7.1,
  v: "A slow descent nobody asked for tonight.",
  va: -0.5, ar: 0.6, do: -0.2, ab: 0.7, he: 0.2, eu: 0.6, pr: 0.7,
  arc: "riches-to-rags", em: ["dread"], tags: [], wc: [], pa: "slow",
  end: "bleak", co: 0.2, warn: [], conv: 0.7,
};

async function stubApis(page: Page) {
  await page.route("**/api/games/party*", (route) =>
    route.fulfill({ json: { parties: [PARTY] } }),
  );
  await page.route(
    (url) => url.pathname === "/api/movies" && url.searchParams.has("ids"),
    (route) => route.fulfill({ json: { movies: [championFull], total: 1, page: 1, limit: 1 } }),
  );
}

test("Dinner Party: read the table, serve, reveal reactions, tally the night", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await stubApis(page);

  await page.goto("/games/dinner-party");
  await expect(page.getByRole("heading", { name: "The Dinner Party" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /SEAT THE GUESTS/i }).click();

  // The table is set: four vignettes, two bottles on the shelf
  await expect(page.getByText("Party 1 of 1")).toBeVisible();
  for (const g of ["Ada", "Ben", "Cleo", "Dev"]) {
    await expect(page.getByText(g, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("What do you put on?")).toBeVisible();
  await expect(page.getByRole("button", { name: /The Crowd Pleaser/ })).toBeVisible();

  // Serve the trap on purpose
  await page.getByRole("button", { name: /The Table Bomb/ }).click();

  // Reactions land on the guest cards; the model dissents
  await expect(page.getByText("1 of 4 threaded")).toBeVisible();
  await expect(page.getByText(/more wired than she arrived/)).toBeVisible();
  await expect(page.getByText(/squarely on Dev's bruise/)).toBeVisible();
  await expect(page.getByText(/The model would have poured The Crowd Pleaser instead/)).toBeVisible();

  // Only party → straight to the tally
  await page.getByRole("button", { name: /Last call/i }).click();
  await expect(page.getByText(/You threaded 1 of 4 moods tonight/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("The night's tally")).toBeVisible();
  await expect(page.getByText(/model: The Crowd Pleaser/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Host another night/i })).toBeVisible();
});
