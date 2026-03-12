import type { TmdbMovie, TmdbMovieDetails, TmdbPerson, TmdbPersonWithMovies, TmdbGenre } from "@/lib/types";

const BASE = "https://api.themoviedb.org/3";

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 }, // cache for 1 hour
  });
  if (!res.ok) {
    throw new Error(`TMDB ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Movies ──

export async function discoverMovies(params: {
  with_genres?: string;
  sort_by?: string;
  page?: number;
  "vote_count.gte"?: number;
  "primary_release_date.gte"?: string;
  "primary_release_date.lte"?: string;
  with_people?: string;
} = {}): Promise<TmdbMovie[]> {
  const query: Record<string, string> = {
    language: "en-US",
    include_adult: "false",
    "vote_count.gte": String(params["vote_count.gte"] ?? 100),
    sort_by: params.sort_by ?? "popularity.desc",
    page: String(params.page ?? 1),
  };
  if (params.with_genres) query.with_genres = params.with_genres;
  if (params["primary_release_date.gte"]) query["primary_release_date.gte"] = params["primary_release_date.gte"];
  if (params["primary_release_date.lte"]) query["primary_release_date.lte"] = params["primary_release_date.lte"];
  if (params.with_people) query.with_people = params.with_people;

  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/discover/movie", query);
  return data.results;
}

export async function getMovieDetails(id: number): Promise<TmdbMovieDetails> {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, {
    language: "en-US",
    append_to_response: "keywords",
  });
}

export async function getPopularMovies(page = 1): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/movie/popular", {
    language: "en-US",
    page: String(page),
  });
  return data.results;
}

// ── People ──

export async function getPopularPeople(page = 1): Promise<TmdbPerson[]> {
  const data = await tmdbFetch<{ results: TmdbPerson[] }>("/person/popular", {
    language: "en-US",
    page: String(page),
  });
  return data.results;
}

export async function getPersonMovieCredits(personId: number): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<{ cast: TmdbMovie[] }>(`/person/${personId}/movie_credits`, {
    language: "en-US",
  });
  // Sort by popularity, return top movies
  return data.cast
    .filter((m) => m.poster_path && m.vote_count > 50)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5);
}

export async function getPopularActors(page = 1): Promise<TmdbPersonWithMovies[]> {
  const people = await getPopularPeople(page);
  const actors = people.filter((p) => p.known_for_department === "Acting").slice(0, 6);

  const withMovies = await Promise.all(
    actors.map(async (actor): Promise<TmdbPersonWithMovies> => {
      const topMovies = actor.known_for?.filter((m): m is TmdbMovie => "title" in m && !!m.poster_path).slice(0, 4) ?? [];
      return { ...actor, topMovies };
    })
  );

  return withMovies.filter((a) => a.topMovies.length >= 2);
}

export async function getPopularDirectors(): Promise<TmdbPersonWithMovies[]> {
  // TMDB doesn't have a direct "popular directors" endpoint,
  // so we fetch popular people and filter for directing
  const pages = await Promise.all([getPopularPeople(1), getPopularPeople(2), getPopularPeople(3)]);
  const allPeople = pages.flat();
  const directors = allPeople.filter((p) => p.known_for_department === "Directing").slice(0, 6);

  const withMovies = await Promise.all(
    directors.map(async (director): Promise<TmdbPersonWithMovies> => {
      const topMovies = director.known_for?.filter((m): m is TmdbMovie => "title" in m && !!m.poster_path).slice(0, 4) ?? [];
      return { ...director, topMovies };
    })
  );

  return withMovies.filter((d) => d.topMovies.length >= 2);
}

// ── Genres ──

let genreCache: TmdbGenre[] | null = null;

export async function getGenres(): Promise<TmdbGenre[]> {
  if (genreCache) return genreCache;
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list", {
    language: "en-US",
  });
  genreCache = data.genres;
  return data.genres;
}

export function genreIdsToNames(ids: number[], genres: TmdbGenre[]): string[] {
  return ids.map((id) => genres.find((g) => g.id === id)?.name).filter(Boolean) as string[];
}

// ── Image URLs ──

export function posterUrl(path: string | null, size: "w185" | "w342" | "w500" | "w780" = "w500"): string {
  if (!path) return "/placeholder-poster.svg";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function profileUrl(path: string | null, size: "w185" | "h632" = "w185"): string {
  if (!path) return "/placeholder-person.svg";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
