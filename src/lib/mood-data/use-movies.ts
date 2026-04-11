"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { SlimMoodMovie } from "./types";

// ── Paginated movie list ──

interface UseMoviesOptions {
  page?: number;
  limit?: number;
  search?: string;
  pacing?: string[];
  ending?: string[];
  context?: string[];
}

interface UseMoviesResult {
  movies: SlimMoodMovie[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useMovies(options: UseMoviesOptions = {}): UseMoviesResult {
  const { page = 1, limit = 60, search, pacing, ending, context } = options;
  const [movies, setMovies] = useState<SlimMoodMovie[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Serialize filter arrays to strings for stable effect deps
  const pacingKey = pacing?.sort().join(",") || "";
  const endingKey = ending?.sort().join(",") || "";
  const contextKey = context?.sort().join(",") || "";

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    if (pacingKey) params.set("pacing", pacingKey);
    if (endingKey) params.set("ending", endingKey);
    if (contextKey) params.set("context", contextKey);

    fetch(`/api/movies?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          setMovies(data.movies || []);
          setTotal(data.total || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, limit, search, pacingKey, endingKey, contextKey]);

  return { movies, total, loading, error };
}

// ── Scatter plot data ──

export interface ScatterPoint {
  id: number;
  t: string;
  y: number;
  va: number;
  ar: number;
  g: string[];
  r: number | null;
  v: string;
  pa: string;
  end: string;
}

export function useScatterData() {
  const [data, setData] = useState<ScatterPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/movies/scatter")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ── Dashboard stats ──

export interface DashboardStats {
  n: number;
  avgV: number;
  avgA: number;
  avgComfort: number;
  avgConv: number;
  arcs: { label: string; value: number; pct: number }[];
  pacings: { label: string; value: number; pct: number }[];
  endings: { label: string; value: number; pct: number }[];
  genres: { label: string; value: number; pct: number }[];
  mostPleasant: SlimMoodMovie;
  mostUnpleasant: SlimMoodMovie;
  highestConvo: SlimMoodMovie;
  mostAbsorbing: SlimMoodMovie;
  comfyHorror: SlimMoodMovie | null;
  uncomfyComedy: SlimMoodMovie | null;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/movies/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { stats, loading };
}

// ── Debounced value helper ──

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
