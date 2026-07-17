/**
 * The House speaks. A smug dealer with a dry streak — lines fire on game
 * events, never twice in a row for the same event. Clean public voice:
 * personality over neutrality, no bile.
 */

export type HouseEvent =
  | "matchStart"
  | "houseDraftGood"
  | "draftDone"
  | "youWinBig"
  | "youWinSmall"
  | "houseWinBig"
  | "houseWinSmall"
  | "drawTrick"
  | "youStreak"
  | "lowball"
  | "double"
  | "blind"
  | "matchPointYou"
  | "matchPointHouse"
  | "youWin"
  | "houseWins"
  | "matchDraw";

const LINES: Record<HouseEvent, string[]> = {
  matchStart: [
    "Fresh blood. Shuffle up.",
    "Sixteen cards, two of us. Try to keep it interesting.",
    "The house always deals itself a decent hand. House rule.",
  ],
  houseDraftGood: [
    "I'll be keeping that one.",
    "You were eyeing that? Shame.",
    "Mine now. Do go on.",
  ],
  draftDone: [
    "Eight apiece. No refunds.",
    "Cards up. Let's see what you've learned.",
  ],
  youWinBig: [
    "Fine. That one's yours.",
    "A palpable hit. Enjoy it.",
    "I'd have played it the same. Almost.",
  ],
  youWinSmall: [
    "By a whisker.",
    "Barely counts. Counts, though.",
    "I've seen closer. Not often.",
  ],
  houseWinBig: [
    "Don't take it personally. Take it as a lesson.",
    "The house thanks you for your donation.",
    "Textbook. I may frame it.",
  ],
  houseWinSmall: [
    "Mine by a hair. Still mine.",
    "Close only counts in horseshoes.",
  ],
  drawTrick: [
    "Dead even. How aggressively unsatisfying.",
    "A tie. Nobody brag.",
  ],
  youStreak: [
    "Someone's been studying.",
    "Alright, alright. Warm-up's over.",
    "I let you have those. Obviously.",
  ],
  lowball: [
    "Lowball. Dig out your worst — it's suddenly precious.",
    "Weakest card wins this one. Do try to be terrible.",
  ],
  double: [
    "Double stakes. Breathe.",
    "This one counts twice. No pressure whatsoever.",
  ],
  blind: [
    "Blind trick. The answer goes down without seeing the mood.",
    "No peeking on the follow this round. Delicious.",
  ],
  matchPointYou: [
    "One more and it's your night. I've watched collapses start like this.",
  ],
  matchPointHouse: [
    "One away. I can already taste it.",
  ],
  youWin: [
    "The night is yours. The deck demands a rematch.",
    "Well played. I want my rematch and my dignity back.",
  ],
  houseWins: [
    "The house wins. The house usually does.",
    "Better luck at the rematch you're about to ask for.",
  ],
  matchDraw: [
    "A draw. We are both diminished.",
  ],
};

const lastIdx = new Map<HouseEvent, number>();

/** One line for the event, never repeating the previous pick. */
export function houseLine(event: HouseEvent): string {
  const options = LINES[event];
  if (options.length === 1) return options[0];
  let i = Math.floor(Math.random() * options.length);
  if (i === lastIdx.get(event)) i = (i + 1) % options.length;
  lastIdx.set(event, i);
  return options[i];
}

/** The house's occasional emoji commentary. */
export function houseReaction(event: HouseEvent): string | null {
  if (event === "youWinBig" && Math.random() < 0.35) return "😤";
  if (event === "houseWinBig" && Math.random() < 0.35) return "😏";
  if (event === "youStreak" && Math.random() < 0.5) return "🫠";
  if (event === "youWin") return "👏";
  return null;
}
