// All tunables in one place (spec §4.2).

export const TIMERS = {
  pitchMs: 45_000,
  customerPickMs: 20_000,
  sideVoteMs: 15_000,
  overruleMs: 8_000,
  botThinkMinMs: 900,
  botThinkMaxMs: 2600,
} as const;

export const RULES = {
  seats: 4,
  handSize: 5,
  rounds: 8, // each seat is Customer twice at 4 seats
  pitchMaxChars: 140,
  winBase: 2,
  laneBonus: 2,
  customerBonus: 2,
  seenMultiplier: 2,
  sideVotePoint: 1,
  screeningWin: 3,
  accuseCorrect: 3,
  machinePerWrongAccusation: 2,
  trueFitPct: 72,
  misfitPct: 40,
} as const;

export const DATA = {
  dealPoolPercentile: 0.4, // below 40th popularity percentile
  screeningPercentile: 0.6, // above 60th
  historyCap: 200,
  signalQueueCap: 2000,
} as const;
