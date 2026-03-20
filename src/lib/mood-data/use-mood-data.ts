"use client";

import { useState, useEffect } from "react";
import type { SlimMoodMovie } from "./types";

let cachedData: SlimMoodMovie[] | null = null;
let loadingPromise: Promise<SlimMoodMovie[]> | null = null;

async function fetchMoodData(): Promise<SlimMoodMovie[]> {
  if (cachedData) return cachedData;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("/mood-data.json")
    .then((r) => r.json())
    .then((data: SlimMoodMovie[]) => {
      cachedData = data;
      return data;
    });

  return loadingPromise;
}

export function useMoodData() {
  const [data, setData] = useState<SlimMoodMovie[]>(cachedData || []);
  const [loading, setLoading] = useState(!cachedData);

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }
    fetchMoodData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
