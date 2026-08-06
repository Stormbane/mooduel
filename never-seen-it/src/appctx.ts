// Shared app context passed to screen renderers.

import type { Director } from "./director";
import type { GameScene } from "./scene/scene";
import type { StorageSignalSink } from "./signals/sink";
import type { Profile } from "./core/types";
import type { CriticEvent } from "./ui/critic";

export type Route = "title" | "gate" | "lobby" | "profile" | "settings" | "match";

export interface AppCtx {
  dir: Director;
  scene: GameScene | null;
  sink: StorageSignalSink;
  profile: Profile | null;
  lastCritic: { event: CriticEvent; line: string } | null;
  goto(route: Route): void;
  rerender(): void;
  refreshProfile(): Promise<void>;
}
