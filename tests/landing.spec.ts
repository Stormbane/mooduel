import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows hero section with logo and tagline", async ({ page }) => {
    await expect(page.getByAltText("Mooduel").first()).toBeVisible();
    await expect(page.getByText(/Algorithms know what you watched/i)).toBeVisible();
    await expect(page.getByText(/Not how it made you feel/i)).toBeVisible();
  });

  test("has Play and Explore CTAs", async ({ page }) => {
    await expect(page.getByText("Play Mooduel")).toBeVisible();
    await expect(page.getByText("Explore the data")).toBeVisible();
  });

  test("shows stats bar", async ({ page }) => {
    await expect(page.getByText("30,000+").first()).toBeVisible();
    await expect(page.getByText("mood dimensions").first()).toBeVisible();
  });

  test("shows sample mood profile (The Godfather)", async ({ page }) => {
    await expect(page.getByText("SAMPLE MOOD PROFILE")).toBeVisible();
    await expect(page.getByText("The Godfather").first()).toBeVisible();
  });

  test("shows the problem section", async ({ page }) => {
    await expect(page.getByText("THE PROBLEM").first()).toBeVisible();
    await expect(page.getByText("WHY THIS EXISTS").first()).toBeVisible();
  });

  test("shows dimensions section", async ({ page }) => {
    await expect(page.getByText("THE DIMENSIONS").first()).toBeVisible();
    await expect(page.getByText(/18 dimensions/).first()).toBeVisible();
  });

  test("shows analytics section", async ({ page }) => {
    await expect(page.getByText("BY THE NUMBERS").first()).toBeVisible();
  });

  test("shows FAQ section", async ({ page }) => {
    await expect(page.getByText("FAQ").first()).toBeVisible();
    await expect(page.getByText("Common questions").first()).toBeVisible();
  });

  test("shows authors section", async ({ page }) => {
    await expect(page.getByText("AUTHORS").first()).toBeVisible();
    await expect(page.getByText("Sutirtha Basak").first()).toBeVisible();
    await expect(page.getByText("Narada").first()).toBeVisible();
  });

  test("Play Mooduel link navigates to /play", async ({ page }) => {
    await page.getByText("Play Mooduel").click();
    await expect(page).toHaveURL(/\/play/);
  });

  test("Explore link navigates to /explore", async ({ page }) => {
    await page.getByText("Explore the data").click();
    await expect(page).toHaveURL(/\/explore/);
  });
});

test.describe("Navigation", () => {
  test("navbar shows on all main pages", async ({ page }) => {
    test.setTimeout(60_000);
    for (const path of ["/explore", "/games"]) {
      await page.goto(path);
      await expect(page.getByAltText("Mooduel").first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Games").first()).toBeVisible();
      await expect(page.getByText("Explore").first()).toBeVisible();
      await expect(page.getByText("Dashboard").first()).toBeVisible();
    }
  });

  test("auth button is visible in navbar", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByText("Sign in").first()).toBeVisible({ timeout: 10_000 });
  });

  test("sign in dropdown shows providers", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("SIGN IN TO CONTRIBUTE")).toBeVisible();
    await expect(page.getByText("GitHub").first()).toBeVisible();
    await expect(page.getByText("Google").first()).toBeVisible();
  });

  test("nav links navigate correctly", async ({ page }) => {
    await page.goto("/explore");

    await page.getByText("Games").first().click();
    await expect(page).toHaveURL(/\/games/);

    await page.getByText("Dashboard").first().click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByText("Explore").first().click();
    await expect(page).toHaveURL(/\/explore/);
  });
});

test.describe("Leaderboard Page", () => {
  test("shows leaderboard structure", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.getByText("LEADERBOARD")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Top Contributors")).toBeVisible();
  });

  test("shows global stats", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.getByText("Corrections submitted").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Votes cast").first()).toBeVisible();
    await expect(page.getByText("Contributors").first()).toBeVisible();
  });

  test("shows empty state when no contributors", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.getByText("No contributors yet")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Profile Page", () => {
  test("shows sign-in prompt when not authenticated", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText("Sign in to see your profile")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Sign in with GitHub")).toBeVisible();
  });
});

test.describe("Donate Page", () => {
  test("loads without errors", async ({ page }) => {
    await page.goto("/donate");
    await expect(page).toHaveTitle(/Mooduel/);
  });
});
