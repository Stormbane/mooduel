import { test, expect } from "@playwright/test";
import fs from "fs";

test("Blind Taste end-to-end + shared shell rendering", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  fs.mkdirSync("ss", { recursive: true });

  // Intro (movie pool API has a slow cold start)
  await page.goto("/games/blind-taste");
  await expect(page.getByText("Five movies. No titles.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /SHOW ME THE VIBES/i })).toBeVisible();
  await page.screenshot({ path: "ss/bt-intro.png", fullPage: true });

  // Start round → 5 vibe sentence buttons
  await page.getByRole("button", { name: /SHOW ME THE VIBES/i }).click();
  await expect(page.getByText(/Which one are you watching tonight/i)).toBeVisible();
  const choices = page.locator("button").filter({ hasText: "“" });
  await expect(choices).toHaveCount(5, { timeout: 15_000 });
  await page.screenshot({ path: "ss/bt-picking.png", fullPage: true });

  // Pick first → reveal screen
  await choices.first().click();
  await expect(page.getByText(/You chose/i)).toBeVisible({ timeout: 5_000 });

  // Shared-shell assertions: mood stats, streaming providers block, share button, play-again
  await expect(page.getByText(/Valence/i).first()).toBeVisible();
  await expect(page.getByText(/Where to watch/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Next round/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /More games/i })).toBeVisible();
  await page.screenshot({ path: "ss/bt-reveal.png", fullPage: true });

  // Fire share → API should return a token
  const [shareResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/share") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Share" }).click(),
  ]);
  expect(shareResponse.ok()).toBeTruthy();
  const shareData = await shareResponse.json();
  expect(shareData.token).toMatch(/^[0-9a-zA-Z]{10,12}$/);

  // Load the SSR share page by token
  await page.goto(`/s/${shareData.token}`);
  await expect(page.getByText(/Blind Taste Test · pick/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: /Try it yourself/i })).toBeVisible();
  await page.screenshot({ path: "ss/bt-share.png", fullPage: true });
});
