// App shell screens (spec §17): title, profile gate, lobby, profile,
// settings. Final visual quality, honestly-stubbed online surfaces.

import type { AppCtx } from "../appctx";
import type { MatchSummary, Mode } from "../core/types";
import { button, h } from "./dom";
import { lifetimeSentence } from "./readout";
import { PORTRAIT_KIT, portraitDataUrl } from "./portraits";

// ---- TITLE ----

export function renderTitle(app: AppCtx): HTMLElement {
  const root = h("div", { class: "screen title-screen" });
  root.append(
    h("div", { class: "neon-logo" },
      h("span", { class: "neon-line" }, "NEVER"),
      h("span", { class: "neon-line" }, "SEEN IT"),
    ),
    h("p", { class: "title-tag" }, "A bluffing game about movies nobody here has watched."),
  );

  const actions = h("div", { class: "title-actions" });
  if (app.dir.hasSavedMatch()) {
    actions.append(button("Back to the table", "btn primary big", () => {
      if (app.dir.resume()) app.goto("match");
    }));
    actions.append(button("Abandon that match", "btn ghost small", () => {
      app.dir.abandonMatch();
      app.rerender();
    }));
  }
  actions.append(button("Open the store", "btn primary big", () => {
    app.goto(app.profile ? "lobby" : "gate");
  }));
  root.append(actions);

  const bottom = h("div", { class: "title-bottom" });
  if (app.profile) {
    const chip = h("div", { class: "profile-chip", role: "button", tabindex: "0" },
      h("img", { class: "chip-portrait", src: portraitDataUrl(app.profile.portraitSeed), alt: "" }),
      h("span", { class: "chip-handle" }, app.profile.handle),
    );
    chip.addEventListener("click", () => app.goto("profile"));
    bottom.append(chip);
  } else {
    bottom.append(button("Get a membership card", "btn ghost small", () => app.goto("gate")));
  }
  bottom.append(button("Settings", "btn ghost small", () => app.goto("settings")));
  root.append(bottom);
  return root;
}

// ---- PROFILE GATE (§17.1) ----

export function renderGate(app: AppCtx): HTMLElement {
  let portraitSeed = PORTRAIT_KIT[0];

  const root = h("div", { class: "screen gate-screen" });
  root.append(h("div", { class: "section-label big" }, "Membership card"));

  const input = h("input", {
    class: "handle-input", maxlength: "16", placeholder: "Your handle (3 to 16 letters)",
    autocomplete: "off", spellcheck: "false",
  }) as HTMLInputElement;

  const kit = h("div", { class: "portrait-kit" });
  const redrawKit = () => {
    kit.replaceChildren();
    for (const seed of PORTRAIT_KIT) {
      const img = h("img", {
        class: `kit-portrait${seed === portraitSeed ? " selected" : ""}`,
        src: portraitDataUrl(seed), alt: "portrait option", role: "button", tabindex: "0",
      });
      img.addEventListener("click", () => { portraitSeed = seed; redrawKit(); });
      kit.append(img);
    }
  };
  redrawKit();

  const createBtn = button("Get your card", "btn primary big", async () => {
    const handle = input.value.trim();
    if (handle.length < 3) { input.classList.add("error"); return; }
    await app.dir.authProvider.create(handle, portraitSeed);
    await app.refreshProfile();
    app.goto("lobby");
  });

  root.append(
    h("div", { class: "gate-card" },
      input,
      h("div", { class: "section-label" }, "Pick a face"),
      kit,
      createBtn,
    ),
  );

  // Existing profiles: switching happens here (§17.1)
  void app.dir.authProvider.profiles().then((profiles) => {
    if (profiles.length === 0) return;
    const list = h("div", { class: "profile-list" },
      h("div", { class: "section-label" }, "Cards on this device"));
    for (const p of profiles) {
      const row = h("div", { class: "profile-row", role: "button", tabindex: "0" },
        h("img", { class: "chip-portrait", src: portraitDataUrl(p.portraitSeed), alt: "" }),
        h("span", {}, p.handle),
      );
      row.addEventListener("click", async () => {
        await app.dir.authProvider.activate(p.id);
        await app.refreshProfile();
        app.goto("lobby");
      });
      list.append(row);
    }
    root.append(list);
  });

  // Inert but final-quality sign-in surface (§17.1, §17.3)
  root.append(
    h("div", { class: "signin-panel" },
      h("div", { class: "section-label" }, "Online membership"),
      h("input", {
        class: "handle-input", type: "email", placeholder: "you@somewhere.example",
        autocomplete: "email",
      }),
      h("button", { class: "btn primary", disabled: "true", type: "button" }, "Send me a sign-in link"),
      h("p", { class: "stub-copy" },
        "Online membership opens with the full release. For now your card lives on this device."),
    ),
  );

  root.append(button("Back", "btn ghost small", () => app.goto("title")));
  return root;
}

// ---- LOBBY (§17.1) ----

export function renderLobby(app: AppCtx): HTMLElement {
  const root = h("div", { class: "screen lobby-screen" });
  root.append(h("div", { class: "section-label big" }, "Pick your table"));

  const tiles = h("div", { class: "mode-tiles" });

  const activeTile = (name: string, desc: string, onClick: () => void) => {
    const t = h("div", { class: "mode-tile", role: "button", tabindex: "0" },
      h("div", { class: "tile-name" }, name),
      h("div", { class: "tile-desc" }, desc),
    );
    t.addEventListener("click", onClick);
    t.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") onClick();
    });
    return t;
  };

  tiles.append(
    activeTile("Solo", "You against Marla, Dev, and a bucket. About 20 minutes.",
      () => showSetup(app, root, "solo")),
    activeTile("Hotseat", "2 to 4 of you, one device, a longer night with more lying.",
      () => showSetup(app, root, "hotseat")),
    activeTile("Replicant", "2 humans, 2 seats calling in from the back room. One is a machine.",
      () => showSetup(app, root, "replicant")),
  );

  // Stubbed online tiles (§17.3): render in costume, honestly inert.
  const stubTile = (name: string, desc: string) => {
    const t = h("div", { class: "mode-tile stub", role: "button", tabindex: "0" },
      h("div", { class: "tile-name" }, name),
      h("div", { class: "tile-desc" }, desc),
      h("div", { class: "tape-label" }, "coming soon"),
    );
    const wiggle = () => {
      t.classList.remove("wiggle");
      void t.offsetWidth;
      t.classList.add("wiggle");
      app.dir.say("onlineStub");
      app.rerender();
    };
    t.addEventListener("click", wiggle);
    t.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") wiggle();
    });
    return t;
  };
  tiles.append(
    stubTile("Find a table", "Matchmaking with strangers who also lie about movies."),
    stubTile("Challenge a friend", "Send a link, play across the week."),
  );

  root.append(tiles);
  if (app.lastCritic) {
    root.append(h("div", { class: "critic-bar" },
      h("span", { class: "critic-label" }, "THE CRITIC"),
      h("span", { class: "critic-line" }, app.lastCritic.line)));
  }
  root.append(button("Back", "btn ghost small", () => app.goto("title")));
  return root;
}

/** Seat setup: who is playing, bot fill preview, then deal. */
function showSetup(app: AppCtx, root: HTMLElement, mode: Mode): void {
  const maxHumans = mode === "solo" ? 1 : mode === "replicant" ? 2 : 4;
  const minHumans = mode === "replicant" ? 2 : 1;
  const me = app.profile;
  if (!me) { app.goto("gate"); return; }

  const extras: string[] = [];
  const panel = h("div", { class: "setup-panel" });

  const redraw = () => {
    panel.replaceChildren();
    panel.append(h("div", { class: "section-label" },
      mode === "solo" ? "Solo table" : mode === "hotseat" ? "Hotseat table" : "Replicant table"));
    const seatsPreview = h("div", { class: "seats-preview" });
    const humans = [me.handle, ...extras];
    for (let i = 0; i < 4; i++) {
      let label: string;
      if (i < humans.length) label = humans[i];
      else if (mode === "replicant") label = i === 2 ? "Seat C (back room)" : "Seat D (back room)";
      else label = ["Marla", "Dev", "Bucket"][i - humans.length] ?? "Bot";
      seatsPreview.append(h("div", {
        class: `seat-preview${i < humans.length ? " human" : ""}`,
      }, label));
    }
    panel.append(seatsPreview);

    if (humans.length < maxHumans) {
      const input = h("input", {
        class: "handle-input", maxlength: "16",
        placeholder: `Player ${humans.length + 1} name`,
      }) as HTMLInputElement;
      const add = button("Add player", "btn small", () => {
        if (input.value.trim().length >= 1) {
          extras.push(input.value.trim().slice(0, 16));
          redraw();
        }
      });
      panel.append(h("div", { class: "row" }, input, add));
    }
    if (extras.length > 0) {
      panel.append(button("Remove last player", "btn ghost small", () => {
        extras.pop();
        redraw();
      }));
    }

    const canDeal = 1 + extras.length >= minHumans;
    const deal = button("Deal", "btn primary big", async () => {
      const humansCfg = [
        { profileId: me.id, handle: me.handle, portraitSeed: me.portraitSeed },
        ...extras.map((handle, i) => ({
          profileId: "", handle, portraitSeed: PORTRAIT_KIT[(i + 3) % PORTRAIT_KIT.length],
        })),
      ];
      await app.dir.startMatch({ mode, humans: humansCfg });
      app.goto("match");
    }, canDeal ? {} : { disabled: "true" });
    panel.append(deal);
    if (mode === "replicant" && !canDeal) {
      panel.append(h("p", { class: "stub-copy" }, "Replicant needs exactly two humans."));
    }
    panel.append(button("Back to modes", "btn ghost small", () => {
      panel.remove();
      app.rerender();
    }));
  };
  redraw();
  root.querySelector(".mode-tiles")?.replaceWith(panel);
}

// ---- PROFILE (§17.1) ----

export function renderProfile(app: AppCtx): HTMLElement {
  const root = h("div", { class: "screen profile-screen" });
  const p = app.profile;
  if (!p) { app.goto("gate"); return root; }

  root.append(
    h("div", { class: "member-card" },
      h("img", { class: "member-portrait", src: portraitDataUrl(p.portraitSeed), alt: "" }),
      h("div", { class: "member-meta" },
        h("div", { class: "member-handle" }, p.handle),
        h("div", { class: "member-since" },
          `Member since ${new Date(p.createdAt).getFullYear()}`),
      ),
    ),
  );

  const statsBox = h("div", { class: "stats-box" }, "Counting the receipts…");
  const historyBox = h("div", { class: "history-box" });
  root.append(statsBox, historyBox);

  void (async () => {
    const stats = await app.dir.scores.stats(p.id);
    statsBox.replaceChildren(
      h("div", { class: "stat-row" }, h("span", {}, "Matches"), h("span", {}, String(stats.matches))),
      h("div", { class: "stat-row" }, h("span", {}, "Wins"), h("span", {}, String(stats.wins))),
      h("div", { class: "stat-row" }, h("span", {}, "Total points"), h("span", {}, String(stats.totalPoints))),
      h("div", { class: "stat-row" }, h("span", {}, "Full Balderdash sales"), h("span", {}, String(stats.fullBalderdash))),
      h("div", { class: "stat-row" }, h("span", {}, "Failed bluffs"), h("span", {}, String(stats.failedBalderdash))),
      h("div", { class: "stat-row" }, h("span", {}, "Seen It plays"), h("span", {}, String(stats.seenItPlays))),
      h("div", { class: "stat-row" }, h("span", {}, "Machines caught"),
        h("span", {}, `${stats.accusationsCorrect} of ${stats.accusationsMade}`)),
      h("div", { class: "stat-row" }, h("span", {}, "Favorite lane"),
        h("span", {}, stats.favoriteLane === null ? "torn" : stats.favoriteLane)),
      h("div", { class: "lifetime-line" }, lifetimeSentence(stats.meanTonightVector)),
    );

    const history: MatchSummary[] = await app.dir.scores.history(p.id, 20);
    historyBox.replaceChildren(h("div", { class: "section-label" }, "Match history"));
    if (history.length === 0) {
      historyBox.append(h("p", { class: "stub-copy" }, "No matches yet. The tapes are waiting."));
    }
    for (const m of history) {
      const date = new Date(m.endedAt);
      historyBox.append(h("div", { class: `history-row${m.won ? " won" : ""}` },
        h("span", { class: "history-date" },
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`),
        h("span", { class: "history-mode" }, m.mode),
        h("span", { class: "history-score" },
          String(m.seats[m.profileSeat]?.score ?? 0)),
        h("span", { class: "history-result" }, m.won ? "won" : "lost"),
      ));
    }
  })();

  root.append(h("div", { class: "row-center" },
    button("Switch card", "btn ghost small", async () => {
      await app.dir.authProvider.signOut();
      await app.refreshProfile();
      app.goto("gate");
    }),
    button("Back", "btn ghost small", () => app.goto("title")),
  ));
  return root;
}

// ---- SETTINGS (post toggles + data export, §8.4) ----

export interface SettingsState {
  dither: boolean;
  scanlines: boolean;
}

export function renderSettings(app: AppCtx, settings: SettingsState, save: () => void): HTMLElement {
  const root = h("div", { class: "screen settings-screen" });
  root.append(h("div", { class: "section-label big" }, "Settings"));

  const toggle = (label: string, value: boolean, onFlip: (v: boolean) => void) => {
    const b = button(`${label}: ${value ? "on" : "off"}`, "btn small", () => {
      onFlip(!value);
      save();
      app.rerender();
    });
    return h("div", { class: "setting-row" }, b);
  };
  root.append(
    toggle("Dither and color crunch", settings.dither, (v) => { settings.dither = v; }),
    toggle("Scanlines", settings.scanlines, (v) => { settings.scanlines = v; }),
  );

  root.append(h("div", { class: "section-label" }, "Play data"));
  root.append(h("p", { class: "stub-copy" },
    `${app.sink.count()} calibration events on this device. They leave only when you export them.`));
  root.append(h("div", { class: "row" },
    button("Export play data", "btn small", () => {
      const blob = new Blob([app.sink.exportJson()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "never-seen-it-signals.json";
      a.click();
      URL.revokeObjectURL(url);
    }),
    button("Clear play data", "btn ghost small", () => {
      app.sink.clear();
      app.rerender();
    }),
  ));

  root.append(button("Back", "btn ghost small", () => app.goto("title")));
  return root;
}
