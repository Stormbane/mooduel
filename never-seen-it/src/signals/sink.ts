// Calibration signals (spec §8): versioned envelope + durable local sink.

import { DATA } from "../core/config";
import type { KVStore } from "../storage";
import type { Chip, Contract, SeatKind } from "../core/types";

export type SignalEventBody =
  | { type: "customer_pick"; tmdb_id: number; contract: Contract; fit_pct: number;
      candidates: { tmdb_id: number; fit_pct: number }[]; pitch_text: string }
  | { type: "side_vote"; tmdb_id: number; contract: Contract;
      eligible: { tmdb_id: number; fit_pct: number }[] }
  | { type: "overrule"; tmdb_id: number; contract: Contract; fit_pct: number;
      chip: Chip | null }
  | { type: "seen_it_verdict"; tmdb_id: number; contract: Contract; fit_pct: number;
      verdict_agrees: boolean; chip: Chip | null };

export interface SignalEnvelope {
  envelope_version: 1;
  event_id: string; // {match_id}-r{round}-e{counter}
  match_id: string;
  round: number;
  ts: number; // host clock, transport only — never game logic
  dataset_version: string;
  actor: { seat: number; kind: SeatKind };
  event: SignalEventBody;
}

export interface SignalSink {
  emit(envelope: SignalEnvelope): void;
  flush(): Promise<void>; // no-op in v1
}

const KEY = "signals";

export class StorageSignalSink implements SignalSink {
  private ids: Set<string>;
  private queue: SignalEnvelope[];

  constructor(private store: KVStore) {
    this.queue = store.get<SignalEnvelope[]>(KEY) ?? [];
    this.ids = new Set(this.queue.map((e) => e.event_id));
  }

  emit(envelope: SignalEnvelope): void {
    if (this.ids.has(envelope.event_id)) return; // idempotent
    this.queue.push(envelope);
    this.ids.add(envelope.event_id);
    while (this.queue.length > DATA.signalQueueCap) {
      const dropped = this.queue.shift()!;
      this.ids.delete(dropped.event_id);
    }
    this.store.set(KEY, this.queue);
  }

  async flush(): Promise<void> {
    /* reserved for a future HTTP sink */
  }

  exportJson(): string {
    return JSON.stringify(this.queue, null, 1);
  }

  count(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.ids.clear();
    this.store.remove(KEY);
  }
}
