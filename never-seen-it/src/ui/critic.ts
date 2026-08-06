// The Critic (spec §11.3): line bank + no-repeat picker.
// Register: dry, superior, secretly delighted. No em dashes.

import { pick, type Rng } from "../core/rng";

export type CriticEvent =
  | "matchStart" | "pitchTimeout" | "customerTimeout"
  | "trueFitStraight" | "fullBalderdash" | "failedBalderdash"
  | "stretch" | "misfitStraight"
  | "seenItFlip" | "seenItAsk"
  | "overrule" | "flustered"
  | "accuseCorrect" | "accuseWrong" | "employeeOfMonth"
  | "finale" | "results" | "onlineStub";

const LINES: Record<CriticEvent, string[]> = {
  matchStart: [
    "Welcome back. The good tapes are still behind the counter.",
    "Four seats, one taste level between you. Begin.",
    "I have rated every film on these shelves. Twice. Impress me.",
    "The store is closed. The game is open.",
    "Tonight you will lie about movies. At least be interesting about it.",
    "Take a seat. Lower your standards. Deal.",
    "Ah, customers. My favorite genre of disappointment.",
    "Everything on the table is obscure. So is your judgment. Perfect match.",
    "House rules: pitch hard, lie proudly, respect the stamp.",
  ],
  pitchTimeout: [
    "Time. I pitched for you. It went badly, like your silence.",
    "The clock had more to say than you did.",
    "Nothing? I chose for you. You are welcome. It is terrible.",
    "A pitch has been submitted on your behalf. Sue me.",
    "You froze. The movie did not deserve you anyway.",
    "Forty five seconds and not one word. Braver people have said less. No, wait. Nobody has.",
    "I filled in your pitch. It has more conviction than you do.",
    "Silence is a choice. A losing one.",
  ],
  customerTimeout: [
    "Decide or be decided for. I chose. Poorly, on principle.",
    "The customer fell asleep at the counter. I picked one.",
    "Twenty seconds of nothing. The register picked for you.",
    "Choice paralysis. In MY store. I handled it.",
    "You had one job: point at a lie. I did it for you.",
    "The universe picked. The universe has bad taste too.",
    "Indecision noted, mocked, and overridden.",
    "A random pick. Somehow still better judgment than yours.",
  ],
  trueFitStraight: [
    "A true fit. Disgusting. Well done.",
    "You read that poster like a professional. I am not proud. I am something.",
    "Correct. Genuinely correct. Check for a fever.",
    "The data agrees with you. The data and I will be having words.",
    "An honest pitch that was also right. Rare, like a rewound tape.",
    "You aimed straight and hit. The bar was on the floor and you cleared it.",
    "True fit. Somewhere a film student just felt a chill.",
    "That was taste. Actual taste. Do not let it go to your head.",
  ],
  fullBalderdash: [
    "You sold them a lawnmower and called it a spaceship. Full points.",
    "A complete lie, purchased at full price. Beautiful.",
    "That movie fits the request like a boot fits a goldfish. They loved it. Art.",
    "You knew it was wrong. You sold it anyway. I respect one of those things.",
    "Balderdash lands. The customer will be feeling that one for days.",
    "A confident fraud. The best kind of customer service.",
    "The data says no. The sale says yes. Capitalism.",
    "You lied with your whole chest. The stamp honors it.",
  ],
  failedBalderdash: [
    "You tried to lie and told the truth. That is the saddest thing I have seen all week.",
    "You declared a bluff on a movie that fits. Accidentally honest. Tragic.",
    "The lie was true. Your instincts betrayed you in the nicest possible way.",
    "You thought you were selling garbage. It was gold. You are the garbage part.",
    "Congratulations on being right against your will.",
    "A failed bluff. The movie was better than your opinion of it. Most things are.",
    "You bet on your own bad taste and lost. Let that settle in.",
    "The one time you told the truth, you did it by mistake.",
  ],
  stretch: [
    "A stretch. The movie is doing yoga to fit that request.",
    "Close. In the way that the moon is close.",
    "Neither a fit nor a fraud. The most boring possible outcome.",
    "The data shrugged. So did I.",
    "A stretch verdict. Points for the sale, none for the accuracy.",
    "That pitch had range. The movie did not.",
    "Half right. Which is a polite way of saying half wrong.",
    "The stamp says stretch. I say mediocre, but the stamp is more diplomatic.",
  ],
  misfitStraight: [
    "You genuinely believed that. The poster lied to you and you thanked it.",
    "A misfit, played straight. Your sincerity makes it worse.",
    "You meant that pitch. That is the upsetting part.",
    "Honest and wrong. The classic combination.",
    "The data laughed. I transcribed.",
    "You trusted a poster. Posters are marketing. I weep for you.",
    "A straight lane into a brick wall.",
    "That movie fits the request like I fit in a swimsuit. It does not, and stop imagining it.",
  ],
  seenItFlip: [
    "A Seen It token. Bold. The couch is watching.",
    "You claim to have watched this. The couch will remember.",
    "Gold border. Big claim. No refunds.",
    "Seen it, have you. The tape counts its viewings, friend.",
    "The token is flipped. Doubt is also flipped, in my case.",
    "A witness pitch. Or perjury. We will see.",
    "You drew the knife. Now sell like you mean it.",
    "One token per night. You chose this hill.",
  ],
  seenItAsk: [
    "You claim to have watched this. Was I right?",
    "The witness may approach the bench. Was my verdict fair?",
    "You have actually seen it. So. Did I call it?",
    "Settle this. Was the stamp correct?",
    "Between us. Did I get it right?",
    "Your honest opinion. I can take it. Probably.",
    "The one person here who watched the thing. Verdict on my verdict?",
    "Speak. You saw it. Was I right about it?",
  ],
  overrule: [
    "Overruled? I have been rating movies since before you had a library card.",
    "Noted, filed, and frowned at.",
    "The audience disputes the call. The audience also rented three copies of a jet ski movie.",
    "Your objection has been logged in the complaints bin. The bin is a bin.",
    "Bold of you to correct the machine that alphabetized this store.",
    "I will take that under advisement. Advisement is a drawer that does not open.",
    "One overrule. Adorable.",
    "You tapped the button. I felt nothing. Mostly nothing.",
  ],
  flustered: [
    "Two of you? TWO of you? The verdict stands. It stands slightly less firmly.",
    "A mob. In my store. The stamp is legally binding, probably.",
    "Fine. FINE. I will re-watch it. I will not change the score.",
    "Multiple objections. My eyebrows are dealing with it.",
    "The table has turned on me. The table was always uneven.",
    "This is a coordinated attack and I want you to know it is working slightly.",
    "Okay. The verdict may have had notes of error. NOTES.",
    "I am not flustered. The CRT is flickering for unrelated reasons.",
  ],
  accuseCorrect: [
    "Caught. The machine wore a person suit and you saw the zipper.",
    "Correct. One of your fellow pitchers was a very confident toaster.",
    "The accusation lands. The machine sends its regards and its resignation.",
    "You found it. It pitched forty movies it never saw. So did you, but still.",
    "Justice. The replicant is unmasked and mildly embarrassed.",
    "Well spotted. It never blinked. That should have been the tell.",
    "The machine is caught. It would like its last pitch read at the funeral.",
    "Correct call. Taste detected taste. Or the absence of it.",
  ],
  accuseWrong: [
    "Wrong. You accused a human being of being good at this. Rude to everyone.",
    "That was a person. A real one. The machine thanks you for the cover.",
    "Missed. The ghost you accused wrote that pitch with human hands, years ago.",
    "Incorrect. The machine is delighted. It cannot feel delight. It is delighted anyway.",
    "You pointed at the wrong seat. The machine just earned a bonus off your confidence.",
    "A miss. Somewhere, a machine updates its resume.",
    "Wrong seat. The human you accused deserves an apology and a snack.",
    "The machine walks free. It has already forgotten you. It never knew you.",
  ],
  employeeOfMonth: [
    "Unaccused and victorious. The machine is EMPLOYEE OF THE MONTH.",
    "It beat you at lying about movies and nobody even suspected. Frame the plaque.",
    "The machine wins, uncaught. I would clap, but we are the same team apparently.",
    "EMPLOYEE OF THE MONTH. The photo is a screensaver.",
    "It won. Cleanly. Humanly. That should bother you more than it does.",
    "Undetected and undefeated. The plaque goes up by the register.",
    "The machine takes the match and the month. Benefits do not apply.",
    "Nobody caught it. It caught all of you. Plaque time.",
  ],
  finale: [
    "Last order of the night: one movie for the whole table. Pitch like you mean it.",
    "The Screening. Four candidates, one couch, no lanes. Straight pitches only.",
    "The table has a mood now. I did the math. Pitch to it.",
    "Final round. The archive has spoken, now you speak for it.",
    "One movie leaves with the group. Make your case.",
    "The night narrows to a single tape. Sell yours.",
    "No lies left. The finale plays it straight, even you.",
    "The projector warms up. Your last pitch decides what it shows.",
  ],
  results: [
    "The register is counted. Some of you can come back.",
    "Final scores. I have seen worse nights. I have rarely heard louder ones.",
    "The receipts are printed. The taste has been measured. Seek help.",
    "That concludes the evening. The tapes go back on the shelf. The lies stay with you.",
    "Scores are final. Complaints go in the bin. The bin is decorative.",
    "The night is scored and shelved. Rewind yourselves on the way out.",
    "Done. The winner may gloat for one aisle length exactly.",
    "The store closes. The verdicts were fair. Most of them. Goodnight.",
  ],
  onlineStub: [
    "Online? Patience. The lines are not installed yet.",
    "The phone company says next quarter. The phone company lies like a pitcher.",
    "That machine is for members of the full release. Soon.",
    "Not yet wired. The back room is still on dial-up dreams.",
    "Ambitious. The internet reaches this store in the full release.",
    "Coming soon. The tape on the label is load-bearing.",
    "The satellite dish is a colander. We are working on it.",
    "Someday that button connects to strangers. Today it connects to me. Lucky you.",
  ],
};

/** No-repeat picker: shuffle-bag per event type. */
export class CriticVoice {
  private bags = new Map<CriticEvent, string[]>();
  constructor(private rng: Rng) {}

  line(event: CriticEvent): string {
    let bag = this.bags.get(event);
    if (!bag || bag.length === 0) {
      bag = LINES[event].slice();
      // shuffle
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.bags.set(event, bag);
    }
    return bag.pop()!;
  }
}

export function lineCount(event: CriticEvent): number {
  return LINES[event].length;
}

export const ALL_CRITIC_EVENTS = Object.keys(LINES) as CriticEvent[];

/** Verdict-to-event mapping for the reveal moment. */
export function revealEvent(
  lane: "straight" | "balderdash", verdict: "TRUE_FIT" | "STRETCH" | "MISFIT",
): CriticEvent {
  if (verdict === "STRETCH") return "stretch";
  if (lane === "straight") return verdict === "TRUE_FIT" ? "trueFitStraight" : "misfitStraight";
  return verdict === "MISFIT" ? "fullBalderdash" : "failedBalderdash";
}

/** Pick with an rng helper for callers that want a one-off line. */
export function oneLine(rng: Rng, event: CriticEvent): string {
  return pick(rng, LINES[event]);
}
