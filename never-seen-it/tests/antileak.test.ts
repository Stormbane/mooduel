// Replicant anti-leak trace test (spec §6.2, DoD §14): with the same
// seed and scripted humans, swapping which hidden seat is the Machine
// must leave the observable trace (phases, device flow, timer
// durations, event timing) identical. Only pitch text may differ.

import { describe, expect, it } from "vitest";
import { Director, type Scheduler } from "../src/director";
import { MockMovieSource } from "../src/data/movieSource";
import { LocalAuthProvider, LocalScoreStore } from "../src/identity/identity";
import { memoryStore } from "../src/storage";
import type { SignalSink } from "../src/signals/sink";

class TestSched implements Scheduler {
  private t = 0;
  private id = 0;
  private q: { id: number; at: number; fn: () => void }[] = [];
  set(fn: () => void, ms: number): number {
    const id = ++this.id;
    this.q.push({ id, at: this.t + ms, fn });
    return id;
  }
  clear(id: number): void {
    this.q = this.q.filter((e) => e.id !== id);
  }
  now(): number {
    return this.t;
  }
  advanceNext(): boolean {
    if (this.q.length === 0) return false;
    this.q.sort((a, b) => a.at - b.at || a.id - b.id);
    const e = this.q.shift()!;
    this.t = Math.max(this.t, e.at);
    e.fn();
    return true;
  }
}

const nullSink: SignalSink = { emit() {}, async flush() {} };

const flush = () => new Promise((r) => setTimeout(r, 0));

interface RunResult {
  trace: string[];
  hiddenTexts: string[][]; // per round, pitch texts of seats 2 and 3
  finished: boolean;
}

async function runScriptedMatch(machineSeat: 2 | 3): Promise<RunResult> {
  const store = memoryStore();
  const sched = new TestSched();
  const source = new MockMovieSource();
  const dir = new Director(
    source, nullSink, new LocalAuthProvider(store), new LocalScoreStore(store),
    store, sched,
  );

  const trace: string[] = [];
  dir.onChange(() => {
    trace.push([
      sched.now(), dir.state.phase, dir.state.round,
      JSON.stringify(dir.device), dir.timer?.durationMs ?? 0,
    ].join("|"));
  });

  await dir.startMatch({
    mode: "replicant",
    seed: "trace-seed",
    humans: [
      { profileId: "", handle: "H1", portraitSeed: 1 },
      { profileId: "", handle: "H2", portraitSeed: 2 },
    ],
    machineSeatOverride: machineSeat,
  });

  let guard = 5000;
  while (dir.state.phase !== "RESULTS" && guard-- > 0) {
    await flush();
    const d = dir.device;
    if (d.kind === "mood") {
      dir.confirmMood();
    } else if (d.kind === "pass") {
      dir.confirmPass();
    } else if (d.kind === "private") {
      const view = dir.view(d.seat);
      if (d.purpose === "pitch") {
        dir.submitPitch(d.seat, view.yourHand[0], "straight", false, `scripted ${d.seat}`);
      } else if (d.purpose === "custpick") {
        const target = view.pitches.map((p) => p.seat).sort((a, b) => a - b)[0];
        dir.customerPick(target);
      } else if (d.purpose === "sidevote") {
        const target = view.pitches
          .map((p) => p.seat).filter((x) => x !== d.seat).sort((a, b) => a - b)[0];
        dir.sideVote(d.seat, target ?? -1);
      } else if (d.purpose === "accuse") {
        dir.accuse(d.seat, 2);
      } else if (d.purpose === "scrpitch") {
        dir.screeningPitch(d.seat, `finale ${d.seat}`);
      } else if (d.purpose === "scrvote") {
        dir.screeningVote(d.seat, (d.seat + 1) % 4);
      }
    } else {
      if (!sched.advanceNext()) {
        await flush(); // let a pending async (screening fetch) land
        if ((dir.state as { phase: string }).phase === "RESULTS") break;
        if (!sched.advanceNext()) break;
      }
    }
  }

  const hiddenTexts = dir.state.results.map((r) =>
    r.pitches.filter((p) => p.seat >= 2).map((p) => p.text),
  );
  return { trace, hiddenTexts, finished: dir.state.phase === "RESULTS" };
}

describe("replicant hidden-seat trace equivalence", () => {
  it("swapping Machine and Ghost changes pitch text only", async () => {
    const a = await runScriptedMatch(2);
    const b = await runScriptedMatch(3);

    expect(a.finished).toBe(true);
    expect(b.finished).toBe(true);

    // The observable trace is identical: same phases, same device flow,
    // same timer durations, same timing.
    expect(a.trace).toEqual(b.trace);

    // And the runs were not trivially identical: hidden-seat pitch text
    // differs (machine templates vs the human ghost corpus).
    expect(a.hiddenTexts.flat().join("\n")).not.toBe(b.hiddenTexts.flat().join("\n"));
  }, 30000);

  it("hidden seats never appear in a pass-device prompt", async () => {
    const a = await runScriptedMatch(2);
    for (const line of a.trace) {
      const m = line.match(/"kind":"pass","to":(\d)/);
      if (m) expect(Number(m[1])).toBeLessThan(2); // only human seats 0 and 1
    }
  }, 30000);
});
