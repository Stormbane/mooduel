// Boot (spec §10.3, §17): construct the adapters once, wire the
// director, scene, and UI router. Nothing else imports the mocks.

import "./style.css";
import type { AppCtx, Route } from "./appctx";
import { Director } from "./director";
import { MockMovieSource } from "./data/movieSource";
import { LocalAuthProvider, LocalScoreStore } from "./identity/identity";
import { GameScene, type CriticFace } from "./scene/scene";
import { StorageSignalSink } from "./signals/sink";
import { localStore } from "./storage";
import type { CriticEvent } from "./ui/critic";
import { renderMatch } from "./ui/match";
import {
  renderGate, renderLobby, renderProfile, renderSettings, renderTitle,
  type SettingsState,
} from "./ui/shell";

const source = new MockMovieSource();
const sink = new StorageSignalSink(localStore);
const auth = new LocalAuthProvider(localStore);
const scores = new LocalScoreStore(localStore);
const dir = new Director(source, sink, auth, scores, localStore);

const ui = document.getElementById("ui")!;
const sceneCanvas = document.getElementById("scene") as HTMLCanvasElement;

let scene: GameScene | null = null;
try {
  scene = new GameScene(sceneCanvas);
} catch (err) {
  console.warn("[scene] WebGL unavailable, UI-only mode", err);
}

const settings: SettingsState = localStore.get<SettingsState>("settings") ?? {
  dither: true, scanlines: true,
};
const applySettings = () => {
  localStore.set("settings", settings);
  scene?.setPost(settings.dither, settings.scanlines);
};
applySettings();

let route: Route = "title";

const app: AppCtx = {
  dir,
  scene,
  sink,
  profile: null,
  lastCritic: null,
  goto(r: Route) {
    route = r;
    render();
  },
  rerender: () => render(),
  async refreshProfile() {
    app.profile = await auth.current();
  },
};

const FACE_BY_EVENT: Partial<Record<CriticEvent, CriticFace>> = {
  trueFitStraight: "delighted", fullBalderdash: "delighted",
  failedBalderdash: "smug", misfitStraight: "smug", stretch: "smug",
  flustered: "flustered", seenItAsk: "asking",
  employeeOfMonth: "delighted",
};

dir.onCritic((event, line) => {
  app.lastCritic = { event, line };
  scene?.setCriticFace(FACE_BY_EVENT[event] ?? "idle");
  render();
});

let lastPhase = "";
dir.onChange(() => {
  const phase = dir.state.phase;
  if (phase !== lastPhase) {
    if (phase === "MOOD") {
      scene?.printContract();
      scene?.dealCards(5);
    }
    if (phase === "REVEAL") {
      const r = dir.state.results[dir.state.results.length - 1];
      if (r) {
        const winner = r.pitches.find((p) => p.seat === r.winnerSeat);
        const m = winner ? dir.movie(winner.tmdbId) : undefined;
        if (m) scene?.revealCard(m.tmdb_id, m.title, m.year);
      }
    }
    lastPhase = phase;
  }
  render();
});

function render(): void {
  const next =
    route === "title" ? renderTitle(app)
    : route === "gate" ? renderGate(app)
    : route === "lobby" ? renderLobby(app)
    : route === "profile" ? renderProfile(app)
    : route === "settings" ? renderSettings(app, settings, applySettings)
    : renderMatch(app);
  ui.replaceChildren(next);
}

// Timer bars: one global rAF drives every [data-timer] fill.
function tickTimers(): void {
  const bars = document.querySelectorAll<HTMLElement>("[data-timer]");
  const now = Date.now();
  bars.forEach((bar) => {
    const paused = bar.dataset.paused;
    const duration = Number(bar.dataset.duration) || 1;
    const remaining = paused ? Number(paused) : Number(bar.dataset.ends) - now;
    bar.style.width = `${Math.max(0, Math.min(100, (remaining / duration) * 100))}%`;
  });
  requestAnimationFrame(tickTimers);
}
requestAnimationFrame(tickTimers);

void app.refreshProfile().then(() => render());
