import { test, expect, type Page } from "@playwright/test";

/**
 * Shape of Stories smoke test. Game APIs stubbed — deterministic, no
 * session cookies, no issuance caps. Null posters exercise the fallback.
 */

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function singlePayload(n: number) {
  return {
    assignmentId: uuid(n),
    movie: {
      tmdb_id: 5000 + n,
      title: `Story ${n}`,
      year: 1990 + n,
      poster_path: null,
      genres: ["Drama"],
      modelLabel: "man-in-a-hole",
    },
    dimension: "arc",
  };
}

const resultMovie = {
  id: 5008, t: "Story 8", y: 1998, g: ["Drama"], rt: 100, r: 7.7,
  v: "A quiet life cracks open and lets the light in.",
  va: 0.4, ar: 0.2, do: 0.3, ab: 0.7, he: 0.4, eu: 0.8, pr: 0.7,
  arc: "man-in-a-hole", em: ["warmth"], tags: ["tender"], wc: ["solo"],
  pa: "slow", end: "hopeful", co: 0.7, warn: [], conv: 0.6,
};

async function stubApis(page: Page) {
  let dealCount = 0;
  const signals: { assignmentId: string; choice: string }[] = [];

  await page.route("**/api/games/session*", (route) =>
    route.fulfill({ json: { sessionId: "test-session" } }),
  );
  await page.route("**/api/games/single*", (route) =>
    route.fulfill({ json: singlePayload(dealCount++) }),
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
    (route) => route.fulfill({ json: { movies: [resultMovie], total: 1, page: 1, limit: 1 } }),
  );

  return { signals };
}

test("Shape of Stories: full run with agreement, dissent, and a skip", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  const { signals } = await stubApis(page);

  await page.goto("/games/shape-of-stories");
  await expect(page.getByRole("heading", { name: "Shape of Stories" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /OPEN THE SKETCHBOOK/i }).click();

  // Round 1: dealt Story 0, six shapes on the table
  await expect(page.getByText("Story 0", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Which shape did it draw?")).toBeVisible();
  await expect(page.getByText("Shaped 1 of 8")).toBeVisible();
  for (const name of ["Rags to Riches", "Tragedy", "Man in a Hole", "Icarus", "Cinderella", "Oedipus"]) {
    await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  }

  // Skip first — the count must not advance, a new movie arrives
  await page.getByRole("button", { name: /deal another/i }).click();
  await expect(page.getByText("Story 1", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Shaped 1 of 8")).toBeVisible();

  // Agree with the model (its label is always man-in-a-hole in the stub)
  await page.getByRole("button", { name: /Man in a Hole/ }).click();
  await expect(page.getByText("The model drew the same line.")).toBeVisible();
  await expect(page.getByText("Story 2", { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  // Dissent — Icarus overrules
  await page.getByRole("button", { name: /Icarus/ }).click();
  await expect(page.getByText(/The model had Man in a Hole\. Your line overrules it\./)).toBeVisible();

  // Shape the remaining six as Cinderella
  for (let r = 3; r <= 8; r++) {
    await expect(page.getByText(`Story ${r}`, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Cinderella/ }).click();
  }

  // Result: gallery of 8, one agreement
  await expect(page.getByText("Gallery closed")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/The model matched 1 of\s+8/)).toBeVisible();
  await expect(page.getByText("The gallery")).toBeVisible();
  await expect(page.getByText(/the model agrees/)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Draw eight more/i })).toBeVisible();

  // Signals: 1 skip + 8 shapes, choices are canonical arc slugs
  await expect.poll(() => signals.length, { timeout: 10_000 }).toBe(9);
  expect(signals[0].choice).toBe("skip");
  expect(signals[1].choice).toBe("man-in-a-hole");
  expect(signals[2].choice).toBe("icarus");
  expect(signals.filter((s) => s.choice === "cinderella")).toHaveLength(6);
});
