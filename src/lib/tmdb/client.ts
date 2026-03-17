import type { TmdbMovie, TmdbMovieDetails, TmdbGenre } from "@/lib/types";

const BASE = "https://api.themoviedb.org/3";

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 300 },
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

export async function getTopRatedMovies(page = 1): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/movie/top_rated", {
    language: "en-US",
    page: String(page),
  });
  return data.results;
}

export async function getNowPlayingMovies(page = 1): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/movie/now_playing", {
    language: "en-US",
    page: String(page),
  });
  return data.results;
}

export async function getTrendingMovies(window: "day" | "week" = "week"): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>(`/trending/movie/${window}`, {
    language: "en-US",
  });
  return data.results;
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

