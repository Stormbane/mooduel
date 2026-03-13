import { test, expect } from "@playwright/test";

test.describe("TMDB API Routes", () => {
  test("GET /api/tmdb/genres returns genre list", async ({ request }) => {
    const res = await request.get("/api/tmdb/genres");
    expect(res.ok()).toBe(true);

    const genres = await res.json();
    expect(Array.isArray(genres)).toBe(true);
    expect(genres.length).toBeGreaterThan(10);
    expect(genres[0]).toHaveProperty("id");
    expect(genres[0]).toHaveProperty("name");
  });

  test("GET /api/tmdb/popular returns movies", async ({ request }) => {
    const res = await request.get("/api/tmdb/popular?page=1");
    expect(res.ok()).toBe(true);

    const movies = await res.json();
    expect(Array.isArray(movies)).toBe(true);
    expect(movies.length).toBeGreaterThan(0);
    expect(movies[0]).toHaveProperty("id");
    expect(movies[0]).toHaveProperty("title");
    expect(movies[0]).toHaveProperty("poster_path");
    expect(movies[0]).toHaveProperty("genre_ids");
  });

  test("GET /api/tmdb/people?type=actors returns actors with movies", async ({ request }) => {
    const res = await request.get("/api/tmdb/people?type=actors&page=1");
    expect(res.ok()).toBe(true);

    const actors = await res.json();
    expect(Array.isArray(actors)).toBe(true);
    expect(actors.length).toBeGreaterThan(0);
    expect(actors[0]).toHaveProperty("id");
    expect(actors[0]).toHaveProperty("name");
    expect(actors[0]).toHaveProperty("topMovies");
    expect(Array.isArray(actors[0].topMovies)).toBe(true);
  });

  test("GET /api/tmdb/people?type=directors returns directors", async ({ request }) => {
    const res = await request.get("/api/tmdb/people?type=directors");
    expect(res.ok()).toBe(true);

    const directors = await res.json();
    expect(Array.isArray(directors)).toBe(true);
    expect(directors.length).toBeGreaterThan(0);
    expect(directors[0]).toHaveProperty("name");
    expect(directors[0]).toHaveProperty("topMovies");
  });

  test("GET /api/tmdb/discover returns discovered movies", async ({ request }) => {
    const res = await request.get("/api/tmdb/discover?with_genres=28");
    expect(res.ok()).toBe(true);

    const movies = await res.json();
    expect(Array.isArray(movies)).toBe(true);
    expect(movies.length).toBeGreaterThan(0);
  });

  test("GET /api/tmdb/movie returns movie details", async ({ request }) => {
    // Use a well-known movie ID (The Matrix = 603)
    const res = await request.get("/api/tmdb/movie?id=603");
    expect(res.ok()).toBe(true);

    const movie = await res.json();
    expect(movie).toHaveProperty("id", 603);
    expect(movie).toHaveProperty("title");
    expect(movie).toHaveProperty("genres");
    expect(Array.isArray(movie.genres)).toBe(true);
    expect(movie).toHaveProperty("overview");
  });

  test("GET /api/tmdb/movie without id returns 400", async ({ request }) => {
    const res = await request.get("/api/tmdb/movie");
    expect(res.status()).toBe(400);
  });
});
