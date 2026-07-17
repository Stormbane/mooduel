import { test, expect, type Page } from "@playwright/test";

/**
 * Seen It smoke test. Batch deal stubbed; asserts the swiper flow, the
 * recognition signals, the local known-set, and the card-game handoff.
 */

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const singles = Array.from({ length: 12 }, (_, i) => ({
  assignmentId: uuid(i),
  movie: {
    tmdb_id: 6000 + i,
    title: `Reel ${i}`,
    year: 1980 + i,
    poster_path: null,
    genres: ["Drama"],
  },
  dimension: "recognition",
}));

async function stubApis(page: Page) {
  const signals: { assignmentId: string; choice: string }[] = [];
  await page.route("**/api/games/session*", (route) =>
    route.fulfill({ json: { sessionId: "test-session" } }),
  );
  await page.route("**/api/games/single*", (route) =>
    route.fulfill({ json: { singles } }),
  );
  await page.route("**/api/games/signal", async (route) => {
    const body = route.request().postDataJSON() as {
      events: { assignmentId: string; clientEventId: string; choice: string }[];
    };
    for (const e of body.events) signals.push({ assignmentId: e.assignmentId, choice: e.choice });
    route.fulfill({ json: { results: body.events.map((e) => ({ clientEventId: e.clientEventId, status: "accepted" })) } });
  });
  return { signals };
}

test("Seen It: twelve posters, honest answers, known-set persists", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 375, height: 812 });
  const { signals } = await stubApis(page);

  await page.goto("/games/seen-it");
  await expect(page.getByRole("heading", { name: "Seen It" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /ROLL THE REEL/i }).click();

  await expect(page.getByText("Poster 1 of 12")).toBeVisible({ timeout: 10_000 });

  // 5 seen, 3 heard, 4 never
  const plan = ["seen", "seen", "heard", "nope", "seen", "nope", "heard", "seen", "nope", "heard", "seen", "nope"] as const;
  const label = { seen: "Seen it", heard: "Heard of it", nope: "Never met it" };
  for (let i = 0; i < 12; i++) {
    await expect(page.getByText(`Reel ${i}`, { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: label[plan[i]], exact: true }).click();
  }

  // Result: counts + card-table handoff
  await expect(page.getByText("Reel complete")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("heading", { name: "Seen 5 of 12" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Take it to the card table/i })).toBeVisible();

  // Known-set landed in localStorage
  const known = await page.evaluate(() => JSON.parse(localStorage.getItem("mooduel:known-movies") ?? "{}"));
  expect(known.seen).toHaveLength(5);
  expect(known.heard).toHaveLength(3);

  // Signals: 12 recognition answers with honest choices
  await expect.poll(() => signals.length, { timeout: 10_000 }).toBe(12);
  expect(signals.filter((s) => s.choice === "seen")).toHaveLength(5);
  expect(signals.filter((s) => s.choice === "heard")).toHaveLength(3);
  expect(signals.filter((s) => s.choice === "nope")).toHaveLength(4);

  // The card game deals with the known-set as preference
  const deckReq = page.waitForRequest((r) => r.url().includes("/api/games/deck"));
  await page.route("**/api/games/deck*", (route) =>
    route.fulfill({ json: { deck: [] } }),
  );
  await page.getByRole("link", { name: /Take it to the card table/i }).click();
  await page.getByRole("button", { name: /SHUFFLE UP/i }).click({ timeout: 15_000 });
  const req = await deckReq;
  expect(req.url()).toContain("prefer=6000");
});
