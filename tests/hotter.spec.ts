import { test, expect, type Page } from "@playwright/test";

/**
 * Hotter smoke test. Game APIs are stubbed so the run is deterministic and
 * hermetic (no session cookies, no issuance caps, no live Supabase deals).
 * Poster paths are null to exercise the typographic fallback offline.
 */

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function pairPayload(n: number, opts?: { tie?: boolean }) {
  return {
    assignmentId: uuid(n),
    movies: [
      { key: "a", tmdb_id: 1000 + n, title: `Alpha ${n}`, year: 2001, poster_path: null, genres: ["Drama"], score: opts?.tie ? 0.5 : 0.9 },
      { key: "b", tmdb_id: 2000 + n, title: `Beta ${n}`, year: 2002, poster_path: null, genres: ["Action"], score: opts?.tie ? 0.5 : 0.1 },
    ],
    dimension: "hedonic",
  };
}

const championMovie = {
  id: 2004, t: "Beta 4", y: 2002, g: ["Action"], rt: 118, r: 7.4,
  v: "A getaway driver with a code finds the one job that breaks it.",
  va: 0.1, ar: 0.8, do: 0.4, ab: 0.85, he: 0.1, eu: 0.5, pr: 0.6,
  arc: "rise-fall", em: ["tension"], tags: ["slick"], wc: ["solo"],
  pa: "fast", end: "bittersweet", co: 0.3, warn: [], conv: 0.7,
};

async function stubGameApis(page: Page, opts?: { tie?: boolean }) {
  let dealCount = 0;
  const signals: { assignmentId: string; choice: string }[] = [];

  await page.route("**/api/games/session*", (route) =>
    route.fulfill({ json: { sessionId: "test-session" } }),
  );
  await page.route("**/api/games/pair*", (route) =>
    route.fulfill({ json: pairPayload(dealCount++, opts) }),
  );
  await page.route("**/api/games/signal", async (route) => {
    const body = route.request().postDataJSON() as {
      events: { assignmentId: string; clientEventId: string; choice: string }[];
    };
    for (const e of body.events) signals.push({ assignmentId: e.assignmentId, choice: e.choice });
    route.fulfill({ json: { results: body.events.map((e) => ({ clientEventId: e.clientEventId, status: "accepted" })) } });
  });
  await page.route(
    (url) => url.pathname === "/api/movies" && url.searchParams.has("ids"),
    (route) => route.fulfill({ json: { movies: [championMovie], total: 1, page: 1, limit: 1 } }),
  );

  return { signals };
}

test("Hotter: full 12-pair run with syncs, one hot take, result + share", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 }); // mobile-first
  const { signals } = await stubGameApis(page);

  // Intro
  await page.goto("/games/hotter");
  await expect(page.getByRole("heading", { name: "Hotter" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Two posters. One question./i)).toBeVisible();

  // Start the run
  await page.getByRole("button", { name: /DEAL ME IN/i }).click();
  await expect(page.getByText("Which one is just more fun?")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Pair 1 of 12")).toBeVisible();

  // 12 rounds: tap the high-score side (sync), except round 4 — a hot take
  for (let r = 0; r < 12; r++) {
    const takeRound = r === 4;
    const target = takeRound ? `Beta ${r}` : `Alpha ${r}`;
    await page.getByRole("button", { name: new RegExp(target) }).click();

    if (takeRound) {
      await expect(page.getByText("Hot take.")).toBeVisible();
      await expect(page.getByText(`The model backs Alpha ${r}.`)).toBeVisible();
    } else {
      await expect(page.getByText("Synced.")).toBeVisible();
    }

    if (r < 11) {
      await expect(page.getByText(`Pair ${r + 2} of 12`)).toBeVisible({ timeout: 10_000 });
    }
  }

  // Result: the lone hot take is the champion movie
  await expect(page.getByText("Your hottest take")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/You backed Beta 4 over Alpha 4/)).toBeVisible();

  // Stats: 11 syncs, best streak 7 (rounds 5–11), 1 hot take
  await expect(page.getByText("In sync")).toBeVisible();
  await expect(page.getByText("Best streak")).toBeVisible();
  await expect(page.getByText("Hot takes")).toBeVisible();
  await expect(page.getByText("You took Beta 4. The model took Alpha 4.")).toBeVisible();

  // Shared shell: share button + play again + more games
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Run it back/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /More games/i })).toBeVisible();

  // Signals: 12 emitted, canonical keys — 'b' on the take round, 'a' elsewhere
  await expect.poll(() => signals.length, { timeout: 10_000 }).toBe(12);
  const takeSignal = signals.find((s) => s.assignmentId === uuid(4));
  expect(takeSignal?.choice).toBe("b");
  expect(signals.filter((s) => s.choice === "a")).toHaveLength(11);
});

test("Hotter: dead heat leaves the verdict to the player", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await stubGameApis(page, { tie: true });

  await page.goto("/games/hotter");
  await page.getByRole("button", { name: /DEAL ME IN/i }).click();
  await page.getByRole("button", { name: /Alpha 0/ }).click();

  await expect(page.getByText("Dead heat.")).toBeVisible();
  await expect(page.getByText(/Your vote decides it/)).toBeVisible();
});
