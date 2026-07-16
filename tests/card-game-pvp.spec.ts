import { test, expect, type Page } from "@playwright/test";

/**
 * Full async PvP match over the real stack — two browser contexts, real
 * session cookies, real match RPCs, real Supabase. The definitive proof
 * that the challenge-link flow works end to end.
 *
 * Move order is fixed by the skeleton: seat 1 (creator) moves 1,3,5,7,9;
 * seat 2 moves 2,4,6,8. Each move follows the open trick (if any) and
 * counter-leads the next (until trick 8 closes).
 */

async function playTurn(p: Page) {
  await p.reload();
  await expect(p.getByTestId("submit-turn")).toBeVisible({ timeout: 20_000 });

  if ((await p.getByTestId("follow-card").count()) > 0) {
    await p.getByTestId("follow-card").first().click();
  }
  if ((await p.getByTestId("lead-category").count()) > 0) {
    await p.getByTestId("lead-category").first().click();
    await p.getByTestId("lead-card").first().click();
  }
  await p.getByTestId("submit-turn").click();
  await expect(p.getByTestId("submit-turn")).toHaveCount(0, { timeout: 20_000 });
}

test("Card Game PvP: challenge link, sealed drafts, nine moves, verdict", async ({ browser }) => {
  test.setTimeout(240_000);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  await a.setViewportSize({ width: 375, height: 812 });
  await b.setViewportSize({ width: 375, height: 812 });

  // A deals a challenge from the card room
  await a.goto("/games/card-game");
  await a.getByRole("button", { name: /Deal a challenge link/i }).click();
  await a.waitForURL(/\/games\/card-game\/m\/[a-z0-9]+/, { timeout: 30_000 });
  const matchUrl = a.url();

  // A picks 8 of the sealed 12
  await expect(a.getByText("Your sealed twelve")).toBeVisible({ timeout: 20_000 });
  await expect(a.getByTestId("sealed-card")).toHaveCount(12);
  for (let i = 0; i < 8; i++) await a.getByTestId("sealed-card").nth(i).click();
  await a.getByRole("button", { name: /LOCK IN THESE EIGHT/i }).click();
  await expect(a.getByText("Challenge dealt")).toBeVisible({ timeout: 20_000 });

  // B follows the link and takes the seat
  await b.goto(matchUrl);
  await expect(b.getByText(/You've been challenged/i)).toBeVisible({ timeout: 20_000 });
  await b.getByRole("button", { name: /ACCEPT THE CHALLENGE/i }).click();
  await expect(b.getByText("Your sealed twelve")).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 8; i++) await b.getByTestId("sealed-card").nth(i).click();
  await b.getByRole("button", { name: /LOCK IN THESE EIGHT/i }).click();

  // Nine bundled moves: A leads, then strict alternation
  for (let m = 1; m <= 9; m++) {
    await playTurn(m % 2 === 1 ? a : b);
  }

  // Both ends see a verdict and the full trick log
  for (const p of [a, b]) {
    await p.reload();
    await expect(
      p.getByText(/The night is yours|your opponent wins|Dead heat/i).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(p.getByText("The tricks")).toBeVisible();
  }

  await ctxA.close();
  await ctxB.close();
});
