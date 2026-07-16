"use client";

/**
 * Client signal emitter: fire-and-forget with safe retry.
 *
 * Each emit gets a client-generated UUID, so a retried batch is idempotent
 * end-to-end (the RPC returns 'duplicate' for replays). Failures queue in
 * memory and flush on the next emit or pagehide via sendBeacon — losing a
 * vote is acceptable, double-counting one is not.
 */

interface PendingEvent {
  assignmentId: string;
  clientEventId: string;
  choice: string;
}

let queue: PendingEvent[] = [];
let flushing = false;

async function flush(): Promise<void> {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.slice(0, 20);
  try {
    const res = await fetch("/api/games/signal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
    if (res.ok) {
      const sent = new Set(batch.map((e) => e.clientEventId));
      queue = queue.filter((e) => !sent.has(e.clientEventId));
    }
  } catch {
    // stay queued; retried on next emit
  } finally {
    flushing = false;
  }
}

/** Ensure a session exists (idempotent; call once on game mount). */
export async function ensureSession(): Promise<string | null> {
  try {
    const res = await fetch("/api/games/session");
    return res.ok ? (await res.json()).sessionId : null;
  } catch {
    return null;
  }
}

/** Record one answer to a served assignment. Returns immediately. */
export function emitSignal(assignmentId: string, choice: string): void {
  queue.push({ assignmentId, clientEventId: crypto.randomUUID(), choice });
  void flush();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (queue.length === 0) return;
    navigator.sendBeacon?.(
      "/api/games/signal",
      new Blob([JSON.stringify({ events: queue.slice(0, 20) })], { type: "application/json" })
    );
  });
}
