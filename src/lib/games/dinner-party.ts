/**
 * The Dinner Party — Zillmann mood management theory as a puzzle.
 *
 * Each guest's vignette encodes MMT needs: excitatory homeostasis
 * (arousal targets), rumination-breaking (absorption floors), semantic
 * affinity (avoid lists), hedonic repair (valence/fun floors), safety
 * (comfort floors, no warnings). A film is scored per guest as a
 * weighted blend of need subscores; the worst-violated need writes the
 * reaction line.
 *
 * No calibration signals in v1 — reactions are computed from the model's
 * own scores, so the game demonstrates the engine rather than teaching it.
 */

export type Need =
  | { kind: "arousal"; target: number; weight: number }
  | { kind: "valence"; min: number; weight: number }
  | { kind: "hedonic"; min: number; weight: number }
  | { kind: "absorption"; min: number; weight: number }
  | { kind: "comfort"; min: number; weight: number }
  | { kind: "conversation"; min: number; weight: number }
  | { kind: "eudaimonic"; min: number; weight: number }
  | { kind: "avoid"; tags: string[]; weight: number }
  | { kind: "safe"; weight: number };

export interface Guest {
  name: string;
  vignette: string;
  needs: Need[];
}

/** What a film needs to expose for scoring. */
export interface PartyMovieProfile {
  va: number;
  ar: number;
  he: number;
  ab: number;
  co: number;
  conv: number;
  eu: number;
  genres: string[];
  tags: string[];
  warnings: string[];
}

export const THREADED_AT = 0.72;
export const PARTIAL_AT = 0.5;

export const PARTY_COUNT = 3;
export const SHELF_SIZE = 6;
export const GUESTS_PER_PARTY = 4;

export const GUEST_GLYPH = { threaded: "🍷", partial: "🥂", miss: "🫗" } as const;

export function guestState(score: number): keyof typeof GUEST_GLYPH {
  return score >= THREADED_AT ? "threaded" : score >= PARTIAL_AT ? "partial" : "miss";
}

/** The sixteen regulars. Four are seated per party, disjoint across a run. */
export const GUESTS: Guest[] = [
  {
    name: "Priya",
    vignette:
      "Priya answered her last work email at nine and her shoulders are still up near her ears. Someone needs to talk her pulse down.",
    needs: [
      { kind: "arousal", target: -0.4, weight: 3 },
      { kind: "comfort", min: 0.6, weight: 2 },
    ],
  },
  {
    name: "Marcus",
    vignette:
      "Marcus has sat through three worthy dramas this month out of politeness. Tonight he would like something to actually happen.",
    needs: [
      { kind: "arousal", target: 0.6, weight: 3 },
      { kind: "hedonic", min: 0.5, weight: 2 },
    ],
  },
  {
    name: "Jenna",
    vignette:
      "Jenna keeps replaying the thing she said in the meeting. She needs a film that leaves no room in her head for it.",
    needs: [{ kind: "absorption", min: 0.75, weight: 3 }],
  },
  {
    name: "Tom",
    vignette:
      "Tom helped his ex move out on Saturday. He's fine. He says he's fine. No love stories tonight.",
    needs: [
      { kind: "avoid", tags: ["romance", "romantic", "wedding", "love"], weight: 3 },
      { kind: "comfort", min: 0.55, weight: 2 },
    ],
  },
  {
    name: "Ana",
    vignette:
      "Ana passed the bar this morning and has been walking two inches off the ground ever since. Keep the party going.",
    needs: [
      { kind: "hedonic", min: 0.6, weight: 2 },
      { kind: "valence", min: 0.3, weight: 2 },
      { kind: "arousal", target: 0.4, weight: 1 },
    ],
  },
  {
    name: "Sam",
    vignette:
      "First week back on his feet after the hospital. Sam asked for something gentle, and he meant it.",
    needs: [
      { kind: "comfort", min: 0.75, weight: 3 },
      { kind: "safe", weight: 3 },
    ],
  },
  {
    name: "Devon",
    vignette:
      "Devon turned forty on Tuesday and has started asking the big questions at small hours. Humour him properly.",
    needs: [
      { kind: "eudaimonic", min: 0.65, weight: 3 },
      { kind: "absorption", min: 0.5, weight: 1 },
    ],
  },
  {
    name: "Riya",
    vignette:
      "Riya arrived with wine and opinions. If the movie doesn't start an argument, she'll start one herself.",
    needs: [{ kind: "conversation", min: 0.7, weight: 3 }],
  },
  {
    name: "June",
    vignette:
      "June and her husband got through forty years by never watching anything that ends badly. She's here alone tonight. The rule stands.",
    needs: [
      { kind: "valence", min: 0.3, weight: 3 },
      { kind: "comfort", min: 0.5, weight: 1 },
    ],
  },
  {
    name: "Nikhil",
    vignette:
      "Nikhil's startup folded last month. He can joke about it now. He cannot yet watch anyone's dream fail on screen.",
    needs: [
      { kind: "valence", min: 0.2, weight: 2 },
      { kind: "hedonic", min: 0.5, weight: 2 },
    ],
  },
  {
    name: "Grace",
    vignette:
      "Grace works nights in an emergency room, so her scale for intense is not your scale. Bore her and she's asleep in nine minutes.",
    needs: [
      { kind: "arousal", target: 0.65, weight: 3 },
      { kind: "absorption", min: 0.6, weight: 1 },
    ],
  },
  {
    name: "Theo",
    vignette:
      "Theo finished a nine-hundred-page fantasy series at 2am and the real world has felt thin ever since. He needs somewhere to go.",
    needs: [{ kind: "absorption", min: 0.8, weight: 3 }],
  },
  {
    name: "Mia",
    vignette:
      "Mia's sister cancelled on her again. She'd like to feel something on purpose for once, even if it costs her.",
    needs: [
      { kind: "eudaimonic", min: 0.6, weight: 2 },
      { kind: "absorption", min: 0.5, weight: 1 },
    ],
  },
  {
    name: "Leo",
    vignette:
      "Leo is nineteen espressos into thesis week. If the film runs slower than his heartbeat he will vibrate through the ceiling.",
    needs: [{ kind: "arousal", target: -0.5, weight: 3 }],
  },
  {
    name: "Fatima",
    vignette:
      "Fatima has been doing things for other people since March. Tonight nothing is allowed to need her, including the film.",
    needs: [
      { kind: "comfort", min: 0.7, weight: 2 },
      { kind: "arousal", target: -0.3, weight: 2 },
    ],
  },
  {
    name: "Oscar",
    vignette:
      "Oscar's book club dissolved over the question of what art even is. He misses the fight more than he misses the friends.",
    needs: [
      { kind: "conversation", min: 0.75, weight: 3 },
      { kind: "eudaimonic", min: 0.4, weight: 1 },
    ],
  },
];

interface SubScore {
  need: Need;
  s: number;
}

function subScore(need: Need, m: PartyMovieProfile): number {
  switch (need.kind) {
    case "arousal":
      return 1 - Math.min(1, Math.abs(m.ar - need.target) / 0.8);
    case "valence":
      return m.va >= need.min ? 1 : 1 - Math.min(1, (need.min - m.va) / 0.8);
    case "hedonic":
      return m.he >= need.min ? 1 : 1 - Math.min(1, (need.min - m.he) / 0.4);
    case "absorption":
      return m.ab >= need.min ? 1 : 1 - Math.min(1, (need.min - m.ab) / 0.4);
    case "comfort":
      return m.co >= need.min ? 1 : 1 - Math.min(1, (need.min - m.co) / 0.4);
    case "conversation":
      return m.conv >= need.min ? 1 : 1 - Math.min(1, (need.min - m.conv) / 0.4);
    case "eudaimonic":
      return m.eu >= need.min ? 1 : 1 - Math.min(1, (need.min - m.eu) / 0.4);
    case "avoid": {
      const haystack = [...m.genres, ...m.tags].join(" ").toLowerCase();
      return need.tags.some((t) => haystack.includes(t)) ? 0 : 1;
    }
    case "safe":
      return m.warnings.length === 0 ? 1 : Math.max(0, 1 - m.warnings.length * 0.5);
  }
}

/** Weighted satisfaction in [0,1]. */
export function guestSatisfaction(guest: Guest, m: PartyMovieProfile): number {
  let sum = 0;
  let wsum = 0;
  for (const need of guest.needs) {
    sum += subScore(need, m) * need.weight;
    wsum += need.weight;
  }
  return wsum === 0 ? 0 : sum / wsum;
}

const SATISFIED_LINES = [
  "{name} settles in.",
  "{name} exhales for the first time all day.",
  "{name} is exactly where they need to be.",
  "{name} forgets to check their phone.",
];

const PARTIAL_LINES = [
  "{name} would go along with it.",
  "{name} wouldn't complain. Much.",
  "It half-lands for {name}.",
];

function missLine(need: Need, m: PartyMovieProfile, name: string): string {
  switch (need.kind) {
    case "arousal":
      return m.ar > need.target
        ? `This would leave ${name} more wired than they arrived.`
        : `${name}'s pulse needs raising, and this won't raise it.`;
    case "valence":
      return `Too heavy for where ${name} is tonight.`;
    case "hedonic":
      return `${name} came for fun. Actual fun.`;
    case "absorption":
      return `Not enough pull to get ${name} out of their own head.`;
    case "comfort":
      return `${name} needs a soft landing, and this has edges.`;
    case "conversation":
      return `${name} would have nothing to argue about afterward. Disaster.`;
    case "eudaimonic":
      return `${name} wants it to mean something, and this doesn't.`;
    case "avoid":
      return `This lands squarely on ${name}'s bruise.`;
    case "safe":
      return `There are things in this ${name} shouldn't meet this week.`;
  }
}

/** Reaction = score + one human line explaining the dominant reason. */
export function guestReaction(
  guest: Guest,
  m: PartyMovieProfile,
  varietySeed: number,
): { s: number; line: string } {
  const s = guestSatisfaction(guest, m);
  if (s >= THREADED_AT) {
    return { s, line: SATISFIED_LINES[varietySeed % SATISFIED_LINES.length].replace("{name}", guest.name) };
  }
  const scored: SubScore[] = guest.needs.map((need) => ({ need, s: subScore(need, m) }));
  scored.sort((a, b) => a.s - b.s || b.need.weight - a.need.weight);
  const worst = scored[0];
  if (s >= PARTIAL_AT) {
    // partial: soften with the partial line, but keep the reason
    const partial = PARTIAL_LINES[varietySeed % PARTIAL_LINES.length].replace("{name}", guest.name);
    return { s, line: `${partial} ${missLine(worst.need, m, guest.name)}` };
  }
  return { s, line: missLine(worst.need, m, guest.name) };
}
