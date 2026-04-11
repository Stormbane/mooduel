import { test, expect } from "@playwright/test";

test.describe("Movies API (/api/movies)", () => {
  test("returns paginated movies with default params", async ({ request }) => {
    const res = await request.get("/api/movies");
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(data).toHaveProperty("movies");
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("page", 1);
    expect(data).toHaveProperty("limit", 60);
    expect(Array.isArray(data.movies)).toBe(true);
    expect(data.movies.length).toBeLessThanOrEqual(60);
    expect(data.total).toBeGreaterThan(30000);
  });

  test("returns movies in SlimMoodMovie format", async ({ request }) => {
    const res = await request.get("/api/movies?limit=1");
    const data = await res.json();
    const movie = data.movies[0];

    // Verify all SlimMoodMovie fields are present
    expect(movie).toHaveProperty("id");
    expect(movie).toHaveProperty("t");  // title
    expect(movie).toHaveProperty("y");  // year
    expect(movie).toHaveProperty("g");  // genres
    expect(movie).toHaveProperty("va"); // valence
    expect(movie).toHaveProperty("ar"); // arousal
    expect(movie).toHaveProperty("v");  // vibe sentence
    expect(movie).toHaveProperty("pa"); // pacing
    expect(movie).toHaveProperty("end"); // ending
    expect(movie).toHaveProperty("co"); // comfort
    expect(movie).toHaveProperty("conv"); // conversation
    expect(movie).toHaveProperty("arc"); // emotional arc
    expect(movie).toHaveProperty("wc"); // watch context
    expect(Array.isArray(movie.g)).toBe(true);
    expect(Array.isArray(movie.wc)).toBe(true);
  });

  test("search by title finds specific movies", async ({ request }) => {
    const res = await request.get("/api/movies?search=godfather&limit=5");
    const data = await res.json();

    expect(data.total).toBeGreaterThanOrEqual(1);
    const titles = data.movies.map((m: { t: string }) => m.t.toLowerCase());
    expect(titles.some((t: string) => t.includes("godfather"))).toBe(true);
  });

  test("search by vibe sentence works", async ({ request }) => {
    const res = await request.get("/api/movies?search=corruption&limit=5");
    const data = await res.json();
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  test("pagination works correctly", async ({ request }) => {
    const page1 = await (await request.get("/api/movies?limit=3&page=1")).json();
    const page2 = await (await request.get("/api/movies?limit=3&page=2")).json();

    expect(page1.movies.length).toBe(3);
    expect(page2.movies.length).toBe(3);

    // Pages should have different movies
    const ids1 = page1.movies.map((m: { id: number }) => m.id);
    const ids2 = page2.movies.map((m: { id: number }) => m.id);
    expect(ids1).not.toEqual(ids2);
  });

  test("filter by pacing works", async ({ request }) => {
    const res = await request.get("/api/movies?pacing=slow-burn&limit=5");
    const data = await res.json();

    expect(data.total).toBeGreaterThan(0);
    data.movies.forEach((m: { pa: string }) => {
      expect(m.pa).toBe("slow-burn");
    });
  });

  test("filter by ending works", async ({ request }) => {
    const res = await request.get("/api/movies?ending=devastating&limit=5");
    const data = await res.json();

    expect(data.total).toBeGreaterThan(0);
    data.movies.forEach((m: { end: string }) => {
      expect(m.end).toBe("devastating");
    });
  });

  test("filter by watch context works", async ({ request }) => {
    const res = await request.get("/api/movies?context=date&limit=5");
    const data = await res.json();

    expect(data.total).toBeGreaterThan(0);
    data.movies.forEach((m: { wc: string[] }) => {
      expect(m.wc).toContain("date");
    });
  });

  test("combined filters narrow results", async ({ request }) => {
    const broad = await (await request.get("/api/movies?limit=1")).json();
    const narrow = await (await request.get("/api/movies?pacing=slow-burn&ending=devastating&limit=1")).json();

    expect(narrow.total).toBeLessThan(broad.total);
    expect(narrow.total).toBeGreaterThan(0);
  });

  test("limit is capped at 200", async ({ request }) => {
    const res = await request.get("/api/movies?limit=999");
    const data = await res.json();
    expect(data.movies.length).toBeLessThanOrEqual(200);
  });

  test("search with special characters is sanitized", async ({ request }) => {
    const res = await request.get("/api/movies?search=%25DROP%20TABLE&limit=1");
    expect(res.ok()).toBe(true);
  });
});

test.describe("Scatter API (/api/movies/scatter)", () => {
  test("returns all movies as scatter points", async ({ request }) => {
    const res = await request.get("/api/movies/scatter");
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(30000);
  });

  test("scatter points have required fields", async ({ request }) => {
    const res = await request.get("/api/movies/scatter");
    const data = await res.json();
    const point = data[0];

    expect(point).toHaveProperty("id");
    expect(point).toHaveProperty("t");   // title
    expect(point).toHaveProperty("y");   // year
    expect(point).toHaveProperty("va");  // valence
    expect(point).toHaveProperty("ar");  // arousal
    expect(point).toHaveProperty("g");   // genres
    expect(point).toHaveProperty("v");   // vibe sentence
    expect(point).toHaveProperty("pa");  // pacing
    expect(point).toHaveProperty("end"); // ending
    expect(typeof point.va).toBe("number");
    expect(typeof point.ar).toBe("number");
  });

  test("has cache-control header", async ({ request }) => {
    const res = await request.get("/api/movies/scatter");
    const cc = res.headers()["cache-control"];
    expect(cc).toContain("s-maxage");
  });
});

test.describe("Stats API (/api/movies/stats)", () => {
  // Stats endpoint fetches 30K movies in batches — needs time
  test.describe.configure({ timeout: 120_000 });

  test("returns aggregated stats for all movies", async ({ request }) => {
    const res = await request.get("/api/movies/stats");
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(data.n).toBeGreaterThan(30000);
    expect(typeof data.avgV).toBe("number");
    expect(typeof data.avgA).toBe("number");
    expect(typeof data.avgComfort).toBe("number");
    expect(typeof data.avgConv).toBe("number");
  });

  test("returns distribution data", async ({ request }) => {
    const res = await request.get("/api/movies/stats");
    const data = await res.json();

    expect(Array.isArray(data.arcs)).toBe(true);
    expect(Array.isArray(data.pacings)).toBe(true);
    expect(Array.isArray(data.endings)).toBe(true);
    expect(Array.isArray(data.genres)).toBe(true);

    // Each bar entry has label, value, pct
    const arc = data.arcs[0];
    expect(arc).toHaveProperty("label");
    expect(arc).toHaveProperty("value");
    expect(arc).toHaveProperty("pct");
  });

  test("returns superlative movies", async ({ request }) => {
    const res = await request.get("/api/movies/stats");
    const data = await res.json();

    expect(data.mostPleasant).toHaveProperty("t");
    expect(data.mostPleasant).toHaveProperty("va");
    expect(data.mostUnpleasant).toHaveProperty("t");
    expect(data.highestConvo).toHaveProperty("t");
    expect(data.mostAbsorbing).toHaveProperty("t");

    // Most pleasant should have higher valence than most unpleasant
    expect(data.mostPleasant.va).toBeGreaterThan(data.mostUnpleasant.va);
  });

  test("averages are in valid ranges", async ({ request }) => {
    const res = await request.get("/api/movies/stats");
    const data = await res.json();

    expect(data.avgV).toBeGreaterThanOrEqual(-1);
    expect(data.avgV).toBeLessThanOrEqual(1);
    expect(data.avgA).toBeGreaterThanOrEqual(-1);
    expect(data.avgA).toBeLessThanOrEqual(1);
    expect(data.avgComfort).toBeGreaterThanOrEqual(0);
    expect(data.avgComfort).toBeLessThanOrEqual(1);
  });
});

test.describe("Pool API (/api/movies/pool)", () => {
  // Pool endpoint fetches ~20K movies in batches
  test.describe.configure({ timeout: 120_000 });

  test("returns game-quality movies", async ({ request }) => {
    const res = await request.get("/api/movies/pool");
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // Pool should be smaller than total (filtered by rating >= 5)
    expect(data.length).toBeGreaterThan(10000);
    expect(data.length).toBeLessThan(31000);
  });

  test("pool movies meet quality threshold", async ({ request }) => {
    const res = await request.get("/api/movies/pool");
    const data = await res.json();

    // Sample 10 random movies
    for (let i = 0; i < 10; i++) {
      const movie = data[Math.floor(Math.random() * data.length)];
      expect(movie.r).toBeGreaterThanOrEqual(5);
      expect(movie.v.length).toBeGreaterThan(10);
    }
  });
});

test.describe("Corrections API (/api/corrections)", () => {
  test("GET without movie_id returns 400", async ({ request }) => {
    const res = await request.get("/api/corrections");
    expect(res.status()).toBe(400);
  });

  test("GET with movie_id returns corrections array", async ({ request }) => {
    const res = await request.get("/api/corrections?movie_id=603");
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(data).toHaveProperty("corrections");
    expect(data).toHaveProperty("userVotes");
    expect(Array.isArray(data.corrections)).toBe(true);
  });

  test("POST without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/corrections", {
      data: {
        movie_id: 603,
        proposed_values: { valence: 0.5 },
        justification: "Test correction",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("POST with invalid data returns 400", async ({ request }) => {
    const res = await request.post("/api/corrections", {
      headers: { Authorization: "Bearer fake-token-for-testing" },
      data: { movie_id: "not-a-number" },
    });
    // Should be 400 or 401 (auth fails first)
    expect([400, 401]).toContain(res.status());
  });
});

test.describe("Vote API (/api/corrections/vote)", () => {
  test("POST without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/corrections/vote", {
      data: { correction_id: "fake-id", value: 1 },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Leaderboard API (/api/leaderboard)", () => {
  test("returns leaderboard structure", async ({ request }) => {
    const res = await request.get("/api/leaderboard");
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(data).toHaveProperty("leaders");
    expect(data).toHaveProperty("stats");
    expect(Array.isArray(data.leaders)).toBe(true);
    expect(data.stats).toHaveProperty("totalCorrections");
    expect(data.stats).toHaveProperty("totalVotes");
    expect(data.stats).toHaveProperty("contributors");
  });
});

test.describe("Profile API (/api/profile)", () => {
  test("GET without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/profile");
    expect(res.status()).toBe(401);
  });
});
