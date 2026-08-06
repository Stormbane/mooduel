// Critic line bank (DoD §14): at least 8 lines per event type, and the
// no-repeat picker exhausts a bag before repeating.

import { describe, expect, it } from "vitest";
import { ALL_CRITIC_EVENTS, CriticVoice, lineCount } from "../src/ui/critic";
import { mulberry32 } from "../src/core/rng";

describe("critic voice", () => {
  it("ships at least 8 lines per event type", () => {
    for (const event of ALL_CRITIC_EVENTS) {
      expect(lineCount(event), event).toBeGreaterThanOrEqual(8);
    }
  });

  it("never repeats a line until the bag is empty", () => {
    const voice = new CriticVoice(mulberry32(7));
    for (const event of ALL_CRITIC_EVENTS) {
      const n = lineCount(event);
      const seen = new Set<string>();
      for (let i = 0; i < n; i++) seen.add(voice.line(event));
      expect(seen.size).toBe(n);
    }
  });

  it("keeps the register clean: no em dashes in any line", () => {
    const voice = new CriticVoice(mulberry32(7));
    for (const event of ALL_CRITIC_EVENTS) {
      for (let i = 0; i < lineCount(event); i++) {
        expect(voice.line(event)).not.toContain("—");
      }
    }
  });
});
