import { test, expect } from "@playwright/test";
function gameArea(page: import("@playwright/test").Page) { return page.getByTestId("game-area"); }
test("tournament screenshot", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByText(/LET.S PLAY/i).click();
  const area = gameArea(page);
  // Play through 9 rounds quickly
  for (let r = 0; r < 9; r++) {
    await expect(page.getByText(new RegExp(`Round ${r+1}`, "i")).or(page.getByText(/loading/i))).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(300);
    const emo = area.locator("button").filter({ has: page.locator("span.uppercase") });
    if (await emo.count() > 0 && await emo.first().isVisible().catch(() => false)) { await emo.first().click(); }
    else {
      const poster = area.locator("button").filter({ has: page.locator("img") });
      if (await poster.count() > 0 && await poster.first().isVisible().catch(() => false)) { await poster.first().click(); }
      else { await area.locator("button").first().click(); }
    }
    await page.waitForTimeout(400);
  }
  await expect(page.getByText("VS")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "ss/tournament.png" });
  // Play one matchup and screenshot again
  const posterBtn = area.locator("button").filter({ has: page.locator("img") });
  await posterBtn.first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "ss/tournament2.png" });
});
