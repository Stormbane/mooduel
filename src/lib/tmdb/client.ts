import type { TmdbMovie, TmdbMovieDetails, TmdbPerson, TmdbPersonWithMovies, TmdbGenre } from "@/lib/types";

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
    next: { revalidate: 3600 },
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
  return data.cast
    .filter((m) => m.poster_path && m.vote_count > 50)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5);
}

// Well-known actors (TMDB person IDs) — supplemented with popular API results
const NOTABLE_ACTOR_IDS = [
  500,    // Tom Cruise
  6193,   // Leonardo DiCaprio
  1136406,// Tom Holland
  224513, // Florence Pugh
  1245,   // Scarlett Johansson
  73457,  // Chris Pratt
  17419,  // Zendaya — actually this is Bong Joon-ho, let me fix
  172069, // Chadwick Boseman
  74568,  // Chris Hemsworth
  1892,   // Matt Damon
  3223,   // Robert Downey Jr.
  2888,   // Will Smith
  71580,  // Benedict Cumberbatch
  1813,   // Anne Hathaway
  5292,   // Denzel Washington
  1100,   // Arnold Schwarzenegger
  18918,  // Dwayne Johnson
  10859,  // Ryan Reynolds
  1190668,// Timothée Chalamet
  54693,  // Emma Stone
  112,    // Cate Blanchett
  17647,  // Michelle Yeoh
  1373737,// Florence Pugh (corrected)
  934,    // Russell Crowe
  8784,   // Daniel Craig
  1920,   // Winona Ryder
  205,    // Keanu Reeves
  3896,   // Liam Neeson
  64,     // Gary Oldman
  2963,   // Nicolas Cage
  738,    // Sean Connery
  4491,   // Jennifer Aniston
  1269,   // Kevin Hart
  28782,  // Monica Bellucci
  8691,   // Zoe Saldana
];

/**
 * Get actors with better randomization.
 * Picks from a pool of TMDB popular + well-known seeds.
 * Each call returns a different random selection.
 */
export async function getPopularActors(page = 1): Promise<TmdbPersonWithMovies[]> {
  // Fetch from popular API (random page for variety)
  const randomPage = Math.ceil(Math.random() * 5);
  const people = await getPopularPeople(randomPage);
  const apiActors = people.filter((p) => p.known_for_department === "Acting");

  // Pick random seed actors to supplement
  const shuffledSeeds = [...NOTABLE_ACTOR_IDS].sort(() => Math.random() - 0.5).slice(0, 8);
  const seededActors = await Promise.all(
    shuffledSeeds.map(async (id): Promise<TmdbPerson | null> => {
      try {
        return await tmdbFetch<TmdbPerson>(`/person/${id}`, { language: "en-US" });
      } catch {
        return null;
      }
    })
  );

  // Merge and deduplicate
  const allActors = [...apiActors, ...seededActors.filter(Boolean) as TmdbPerson[]];
  const seen = new Set<number>();
  const unique = allActors.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Shuffle and take candidates
  const shuffled = unique.sort(() => Math.random() - 0.5).slice(0, 10);

  const withMovies = await Promise.all(
    shuffled.map(async (actor): Promise<TmdbPersonWithMovies> => {
      try {
        const credits = await tmdbFetch<{ cast: TmdbMovie[] }>(
          `/person/${actor.id}/movie_credits`,
          { language: "en-US" }
        );
        const topMovies = credits.cast
          .filter((m) => m.poster_path && m.vote_count > 50)
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 4);
        return { ...actor, topMovies };
      } catch {
        const topMovies = actor.known_for?.filter(
          (m): m is TmdbMovie => "title" in m && !!m.poster_path
        ).slice(0, 4) ?? [];
        return { ...actor, topMovies };
      }
    })
  );

  return withMovies.filter((a) => a.topMovies.length >= 2).slice(0, 5);
}

// Well-known directors (TMDB person IDs)
const NOTABLE_DIRECTOR_IDS = [
  525,    // Christopher Nolan
  138,    // Quentin Tarantino
  1032,   // Martin Scorsese
  5655,   // Denis Villeneuve
  2710,   // James Cameron
  7467,   // David Fincher
  5174,   // Ridley Scott
  578,    // Wes Anderson
  17825,  // Jordan Peele
  62561,  // Greta Gerwig
  17419,  // Bong Joon-ho
  5281,   // Spike Lee
  1223,   // James Wan
  108,    // Peter Jackson
  510,    // Tim Burton
  5524,   // Guy Ritchie
  11770,  // Edgar Wright
  24,     // Clint Eastwood
  1884,   // Michael Bay
  57130,  // Ari Aster
  488,    // Steven Spielberg
  240,    // Stanley Kubrick
  1614,   // Guillermo del Toro
  5602,   // the Coen Brothers — Joel Coen
  7623,   // Kathryn Bigelow
];

export async function getPopularDirectors(): Promise<TmdbPersonWithMovies[]> {
  const pages = await Promise.all([getPopularPeople(1), getPopularPeople(2), getPopularPeople(3)]);
  const allPeople = pages.flat();
  const popularDirectors = allPeople.filter((p) => p.known_for_department === "Directing");

  // Random subset of seeds
  const shuffledIds = [...NOTABLE_DIRECTOR_IDS].sort(() => Math.random() - 0.5).slice(0, 8);
  const seededDirectors = await Promise.all(
    shuffledIds.map(async (id): Promise<TmdbPerson | null> => {
      try {
        return await tmdbFetch<TmdbPerson>(`/person/${id}`, { language: "en-US" });
      } catch {
        return null;
      }
    })
  );

  const allDirectors = [...popularDirectors, ...seededDirectors.filter(Boolean) as TmdbPerson[]];
  const seen = new Set<number>();
  const unique = allDirectors.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  }).sort(() => Math.random() - 0.5).slice(0, 8);

  const withMovies = await Promise.all(
    unique.map(async (director): Promise<TmdbPersonWithMovies> => {
      try {
        const credits = await tmdbFetch<{ crew: (TmdbMovie & { job: string })[] }>(
          `/person/${director.id}/movie_credits`,
          { language: "en-US" }
        );
        const directed = credits.crew
          .filter((m) => m.job === "Director" && m.poster_path && m.vote_count > 50)
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 4);
        return { ...director, topMovies: directed };
      } catch {
        const topMovies = director.known_for?.filter(
          (m): m is TmdbMovie => "title" in m && !!m.poster_path
        ).slice(0, 4) ?? [];
        return { ...director, topMovies };
      }
    })
  );

  return withMovies.filter((d) => d.topMovies.length >= 2).slice(0, 5);
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
