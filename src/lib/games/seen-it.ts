"use client";

/**
 * Seen It — recognition onboarding. Every answer is a recognition signal
 * (the crowd's seen-rate becomes a fame dimension no external API has
 * for our audience), and the local known-set makes every other game deal
 * movies the player can actually reason about.
 */
import { storageGet, storageSet } from "./client/storage";

export const SEEN_IT_RUN = 12;
export const SEEN_IT_PROMPT_VERSION = "seenit-v1";

export type Recognition = "seen" | "heard" | "nope";

export interface KnownSet {
  seen: number[];
  heard: number[];
  updatedAt: string;
}

export const KNOWN_SET_KEY = "mooduel:known-movies";

export function getKnownSet(): KnownSet {
  return (
    storageGet<KnownSet>(KNOWN_SET_KEY) ?? { seen: [], heard: [], updatedAt: "" }
  );
}

export function addToKnownSet(movieId: number, r: Recognition): void {
  const k = getKnownSet();
  const seen = new Set(k.seen);
  const heard = new Set(k.heard);
  seen.delete(movieId);
  heard.delete(movieId);
  if (r === "seen") seen.add(movieId);
  if (r === "heard") heard.add(movieId);
  storageSet<KnownSet>(KNOWN_SET_KEY, {
    seen: [...seen],
    heard: [...heard],
    updatedAt: new Date().toISOString(),
  });
}

/** Ids to bias dealing toward — seen first, heard-of as backfill. */
export function knownIdsForDealing(cap = 100): number[] {
  const k = getKnownSet();
  return [...k.seen, ...k.heard].slice(0, cap);
}

/** Result-screen copy keyed by how deep the movie brain went. */
export function brainVerdict(seen: number, total: number): string {
  const rate = total === 0 ? 0 : seen / total;
  if (rate >= 0.75) return "Your movie brain is a national archive. The dealer is nervous.";
  if (rate >= 0.5) return "A well-stocked movie brain. The table respects it.";
  if (rate >= 0.25) return "Selective taste. The deck will meet you where you are.";
  return "A fresh palate. Every deal from here is a discovery.";
}
