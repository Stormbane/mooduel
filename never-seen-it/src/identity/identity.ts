// Local identity + score persistence (spec §17.2). Adapter seams for a
// future Supabase-backed pair; nothing outside boot knows which is live.

import { DATA } from "../core/config";
import { meanVector } from "../core/contracts";
import { instanceId } from "../core/rng";
import type { KVStore } from "../storage";
import type { Lane, MatchSummary, Profile, ProfileStats } from "../core/types";

export interface AuthProvider {
  current(): Promise<Profile | null>;
  profiles(): Promise<Profile[]>;
  create(handle: string, portraitSeed: number): Promise<Profile>;
  activate(profileId: string): Promise<Profile>;
  signOut(): Promise<void>;
}

export interface ScoreStore {
  recordMatch(profileId: string, s: MatchSummary): Promise<void>;
  history(profileId: string, limit: number): Promise<MatchSummary[]>;
  stats(profileId: string): Promise<ProfileStats>;
}

const PROFILES_KEY = "profiles";
const ACTIVE_KEY = "activeProfile";
const historyKey = (id: string) => `history:${id}`;

export class LocalAuthProvider implements AuthProvider {
  constructor(private store: KVStore) {}

  async current(): Promise<Profile | null> {
    const id = this.store.get<string>(ACTIVE_KEY);
    if (!id) return null;
    return (await this.profiles()).find((p) => p.id === id) ?? null;
  }

  async profiles(): Promise<Profile[]> {
    return this.store.get<Profile[]>(PROFILES_KEY) ?? [];
  }

  async create(handle: string, portraitSeed: number): Promise<Profile> {
    const profile: Profile = {
      id: instanceId(),
      handle: handle.trim().slice(0, 16),
      portraitSeed,
      createdAt: Date.now(),
    };
    const all = await this.profiles();
    this.store.set(PROFILES_KEY, [...all, profile]);
    this.store.set(ACTIVE_KEY, profile.id);
    return profile;
  }

  async activate(profileId: string): Promise<Profile> {
    const p = (await this.profiles()).find((x) => x.id === profileId);
    if (!p) throw new Error(`no profile ${profileId}`);
    this.store.set(ACTIVE_KEY, profileId);
    return p;
  }

  async signOut(): Promise<void> {
    this.store.remove(ACTIVE_KEY);
  }
}

export class LocalScoreStore implements ScoreStore {
  constructor(private store: KVStore) {}

  async recordMatch(profileId: string, s: MatchSummary): Promise<void> {
    const key = historyKey(profileId);
    const history = this.store.get<MatchSummary[]>(key) ?? [];
    if (history.some((h) => h.matchId === s.matchId)) return;
    history.push(s);
    while (history.length > DATA.historyCap) history.shift();
    this.store.set(key, history);
  }

  async history(profileId: string, limit: number): Promise<MatchSummary[]> {
    const all = this.store.get<MatchSummary[]>(historyKey(profileId)) ?? [];
    return all.slice(-limit).reverse();
  }

  async stats(profileId: string): Promise<ProfileStats> {
    const all = this.store.get<MatchSummary[]>(historyKey(profileId)) ?? [];
    const lanes: Record<Lane, number> = { straight: 0, balderdash: 0 };
    let wins = 0, points = 0, fullB = 0, failedB = 0, seenIt = 0, accMade = 0, accRight = 0;
    const vectors: number[][] = [];
    for (const m of all) {
      if (m.won) wins++;
      points += m.seats[m.profileSeat]?.score ?? 0;
      lanes.straight += m.laneStats.straight;
      lanes.balderdash += m.laneStats.balderdash;
      fullB += m.laneStats.fullBalderdash;
      failedB += m.laneStats.failedBalderdash;
      if (m.seenItUsed) seenIt++;
      if (m.accusation?.made) {
        accMade++;
        if (m.accusation.correct) accRight++;
      }
      if (m.tonightVector.length > 0) vectors.push(m.tonightVector);
    }
    return {
      matches: all.length,
      wins,
      totalPoints: points,
      fullBalderdash: fullB,
      failedBalderdash: failedB,
      seenItPlays: seenIt,
      accusationsMade: accMade,
      accusationsCorrect: accRight,
      favoriteLane:
        lanes.straight === lanes.balderdash ? null
        : lanes.straight > lanes.balderdash ? "straight" : "balderdash",
      meanTonightVector: meanVector(vectors),
    };
  }
}
