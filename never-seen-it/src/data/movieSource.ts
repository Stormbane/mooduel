// MovieSource adapter seam (spec §10.3) + the v1 mock implementation.

import { DATA } from "../core/config";
import { nearest, validMovie } from "../core/contracts";
import { shuffled, stream } from "../core/rng";
import type { Movie } from "../core/types";
import raw from "./mock-movies.json";

export interface MovieSource {
  dealPool(count: number, opts: { seed: string }): Promise<Movie[]>;
  screeningPool(near: number[], count: number): Promise<Movie[]>;
  byId(id: number): Movie | undefined;
  datasetVersion(): string;
}

export class MockMovieSource implements MovieSource {
  private movies: Movie[];
  private version: string;
  private index: Map<number, Movie>;

  constructor() {
    const data = raw as { dataset_version: string; movies: Movie[] };
    const valid = data.movies.filter((m) => {
      const ok = validMovie(m);
      if (!ok) console.warn(`[movieSource] dropped invalid record tmdb_id=${m.tmdb_id}`);
      return ok;
    });
    this.movies = valid;
    this.version = data.dataset_version;
    this.index = new Map(valid.map((m) => [m.tmdb_id, m]));
  }

  private byPopularity(): Movie[] {
    return this.movies.slice().sort((a, b) => a.popularity - b.popularity || a.tmdb_id - b.tmdb_id);
  }

  async dealPool(count: number, opts: { seed: string }): Promise<Movie[]> {
    const sorted = this.byPopularity();
    const cutoff = Math.floor(sorted.length * DATA.dealPoolPercentile);
    const pool = sorted.slice(0, cutoff);
    return shuffled(stream(opts.seed, "dealPool"), pool).slice(0, count);
  }

  async screeningPool(near: number[], count: number): Promise<Movie[]> {
    const sorted = this.byPopularity();
    const from = Math.floor(sorted.length * DATA.screeningPercentile);
    return nearest(sorted.slice(from), near, count);
  }

  byId(id: number): Movie | undefined {
    return this.index.get(id);
  }

  datasetVersion(): string {
    return this.version;
  }
}
