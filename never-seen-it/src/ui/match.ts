// Match screens (spec §4, §17.1): mood interstitial, pass-device,
// private pitch / pick / vote screens, reveal + overrule, accusation,
// screening, and results. Everything reads through viewFor projections
// held by the director; nothing touches raw state.

import type { AppCtx } from "../appctx";
import { chipLabels } from "../core/contracts";
import type { SeatView } from "../core/reducer";
import type { Chip, Lane, Movie } from "../core/types";
import { button, h } from "./dom";
import { posterDataUrl } from "./posters";
import { tonightSentence } from "./readout";

const SEAT_LETTERS = ["A", "B", "C", "D"];

export function renderMatch(app: AppCtx): HTMLElement {
  const dir = app.dir;
  const device = dir.device;
  const tableSeat = dir.humanSeats()[0] ?? 0;

  if (device.kind === "pass") {
    return passScreen(app, device.to);
  }
  if (device.kind === "private") {
    const view = dir.view(device.seat);
    switch (device.purpose) {
      case "pitch": return pitchScreen(app, view);
      case "custpick": return customerPickScreen(app, view);
      case "sidevote": return sideVoteScreen(app, view);
      case "accuse": return accuseScreen(app, view);
      case "scrpitch": return screeningPitchScreen(app, view);
      case "scrvote": return screeningVoteScreen(app, view);
    }
  }
  const view = dir.view(tableSeat);
  if (device.kind === "mood") return moodScreen(app, view);
  switch (view.phase) {
    case "REVEAL":
    case "OVERRULE":
      return revealScreen(app, view);
    case "RESULTS":
      return resultsScreen(app, view);
    default:
      return waitingScreen(app, view);
  }
}

// ---- shared chrome ----

function chrome(app: AppCtx, cls: string, ...children: (Node | string)[]): HTMLElement {
  const root = h("div", { class: `screen ${cls}` });
  root.append(criticBar(app));
  for (const c of children) root.append(c);
  return root;
}

function criticBar(app: AppCtx): HTMLElement {
  const line = app.lastCritic?.line ?? "";
  return h("div", { class: "critic-bar", role: "status" },
    h("span", { class: "critic-label" }, "THE CRITIC"),
    h("span", { class: "critic-line" }, line),
  );
}

function hud(view: SeatView): HTMLElement {
  const strip = h("div", { class: "hud" });
  const isFinale = view.phase.startsWith("SCREENING") || view.phase === "RESULTS";
  strip.append(h("div", { class: "hud-round" },
    isFinale ? "The Screening" : `Round ${view.round} of 8`));
  const seatsBar = h("div", { class: "hud-seats" });
  for (const s of view.seats) {
    const isCustomer = s.index === view.customer && !isFinale;
    seatsBar.append(h("div", { class: `hud-seat${isCustomer ? " customer" : ""}` },
      h("span", { class: "hud-handle" }, s.handle),
      h("span", { class: "hud-score" }, String(s.score)),
    ));
  }
  strip.append(seatsBar);
  return strip;
}

function timerBar(app: AppCtx): HTMLElement {
  const t = app.dir.timer;
  if (!t) return h("div");
  const wrap = h("div", { class: "timerbar-wrap" },
    h("div", {
      class: "timerbar", "data-timer": "1",
      "data-ends": String(t.endsAt), "data-duration": String(t.durationMs),
      "data-paused": t.paused ? String(t.remainingAtPause) : "",
    }),
  );
  return wrap;
}

function pauseButton(app: AppCtx): HTMLElement {
  if (app.dir.humanSeats().length < 2 || !app.dir.timer) return h("span");
  const paused = app.dir.timer.paused;
  return button(paused ? "Resume the clock" : "Pause", "btn ghost small", () => {
    if (paused) app.dir.resumeTimer();
    else app.dir.pauseTimer();
    app.rerender();
  });
}

function contractCard(view: SeatView): HTMLElement {
  return h("div", { class: "contract-receipt" },
    h("div", { class: "receipt-head" }, "TONIGHT'S MOOD"),
    h("div", { class: "receipt-body" }, view.contract?.sentence ?? ""),
  );
}

function countryFlag(cc: string): string {
  if (!/^[A-Z]{2}$/i.test(cc)) return "";
  return String.fromCodePoint(
    ...cc.toUpperCase().split("").map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65),
  );
}

function movieCard(m: Movie, opts: { selected?: boolean; onClick?: () => void } = {}): HTMLElement {
  const card = h("div", {
    class: `movie-card${opts.selected ? " selected" : ""}`,
    role: "button", tabindex: "0",
  },
    h("img", {
      class: "poster", src: posterDataUrl(m.tmdb_id, m.title, m.year),
      alt: `${m.title} poster`, draggable: "false",
    }),
    h("div", { class: "card-meta" },
      h("div", { class: "card-title" }, m.title),
      h("div", { class: "card-sub" },
        `${m.year} ${countryFlag(m.country)} ${m.runtime}min`),
    ),
  );
  if (opts.onClick) {
    card.addEventListener("click", opts.onClick);
    card.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") {
        e.preventDefault();
        opts.onClick!();
      }
    });
  }
  return card;
}

// ---- screens ----

function moodScreen(app: AppCtx, view: SeatView): HTMLElement {
  return chrome(app, "mood-screen", hud(view),
    h("div", { class: "center-col" },
      contractCard(view),
      h("p", { class: "mood-note" },
        view.seats[view.customer].handle + " is the Customer this round."),
      button("Deal me in", "btn primary big", () => { app.dir.confirmMood(); app.rerender(); }),
    ),
  );
}

function passScreen(app: AppCtx, to: number): HTMLElement {
  const seat = app.dir.view(to).seats[to];
  return chrome(app, "pass-screen",
    h("div", { class: "center-col" },
      h("div", { class: "pass-title" }, "Pass the device to"),
      h("div", { class: "pass-name" }, seat.handle),
      h("p", { class: "pass-note" }, "No peeking from the couch."),
      button(`I'm ${seat.handle}`, "btn primary big", () => { app.dir.confirmPass(); app.rerender(); }),
    ),
  );
}

function pitchScreen(app: AppCtx, view: SeatView): HTMLElement {
  let selected: number | null = null;
  let lane: Lane = "straight";
  let seenArmed = false;
  let seenFlipped = false;

  const handRow = h("div", { class: "hand-row" });
  const laneRow = h("div", { class: "lane-row" });
  const seenRow = h("div", { class: "seen-row" });
  const textarea = h("textarea", {
    class: "pitch-input", maxlength: "140",
    placeholder: "Sell it in one sentence. You have never seen it.",
    rows: "2",
  }) as HTMLTextAreaElement;
  const counter = h("div", { class: "char-count" }, "0 / 140");
  textarea.addEventListener("input", () => {
    counter.textContent = `${textarea.value.length} / 140`;
    submitBtn.toggleAttribute("disabled", !(selected != null && textarea.value.trim().length > 0));
  });

  const redrawHand = () => {
    handRow.replaceChildren();
    for (const id of view.yourHand) {
      const m = app.dir.movie(id);
      if (!m) continue;
      handRow.append(movieCard(m, {
        selected: selected === id,
        onClick: () => { selected = id; redrawHand(); textarea.dispatchEvent(new Event("input")); },
      }));
    }
  };
  redrawHand();

  const redrawLanes = () => {
    laneRow.replaceChildren(
      button("Straight", `lane-btn${lane === "straight" ? " active" : ""}`, () => { lane = "straight"; redrawLanes(); }),
      button("Balderdash", `lane-btn balderdash${lane === "balderdash" ? " active" : ""}`, () => { lane = "balderdash"; redrawLanes(); }),
      h("p", { class: "lane-hint" }, lane === "straight"
        ? "I genuinely think this fits. Pays when the data agrees."
        : "I know it does not fit and I am selling it anyway. Pays when the data confirms the lie."),
    );
  };
  redrawLanes();

  // Seen It: deliberate two-step flip (§4.5)
  const redrawSeen = () => {
    seenRow.replaceChildren();
    if (!view.seenItAvailable) {
      seenRow.append(h("div", { class: "seen-spent" }, "Seen It token: spent"));
      return;
    }
    if (seenFlipped) {
      seenRow.append(h("div", { class: "seen-flipped" }, "SEEN IT · gold border, doubled lane points if you win"),
        button("Put it back", "btn ghost small", () => { seenFlipped = false; seenArmed = false; redrawSeen(); }));
    } else if (seenArmed) {
      seenRow.append(
        h("div", { class: "seen-arm" }, "You are claiming you have actually watched this movie."),
        button("Flip it. I have seen it", "btn seen-confirm", () => { seenFlipped = true; redrawSeen(); }),
        button("Never mind", "btn ghost small", () => { seenArmed = false; redrawSeen(); }),
      );
    } else {
      seenRow.append(button("Seen It token", "btn ghost small", () => { seenArmed = true; redrawSeen(); }));
    }
  };
  redrawSeen();

  const submitBtn = button("Pitch it", "btn primary big", () => {
    if (selected == null || textarea.value.trim().length === 0) return;
    app.dir.submitPitch(view.you, selected, lane, seenFlipped, textarea.value.trim());
    app.rerender();
  }, { disabled: "true" });

  return chrome(app, "pitch-screen", hud(view), timerBar(app),
    contractCard(view),
    h("div", { class: "pitch-body" },
      h("div", { class: "section-label" }, "Your hand. Pick the perfect fit."),
      handRow,
      laneRow,
      seenRow,
      textarea, counter,
      h("div", { class: "row-end" }, pauseButton(app), submitBtn),
    ),
  );
}

function pitchTiles(
  app: AppCtx, view: SeatView, opts: { exclude?: number; onPick: (seat: number) => void },
): HTMLElement {
  const wrap = h("div", { class: "pitch-tiles" });
  for (const p of view.pitches) {
    if (p.seat === opts.exclude) continue;
    const m = app.dir.movie(p.tmdbId);
    if (!m) continue;
    const tile = h("div", {
      class: `pitch-tile${p.seenIt ? " gold" : ""}`, role: "button", tabindex: "0",
    },
      h("div", { class: "tile-seat" }, `Seat ${SEAT_LETTERS[p.seat]}`),
      h("img", {
        class: "poster small", src: posterDataUrl(m.tmdb_id, m.title, m.year),
        alt: `${m.title} poster`,
      }),
      h("div", { class: "tile-movie" }, `${m.title} (${m.year})`),
      h("div", { class: "tile-pitch" }, `"${p.text}"`),
      p.seenIt ? h("div", { class: "tile-seen" }, "SEEN IT") : "",
    );
    tile.addEventListener("click", () => opts.onPick(p.seat));
    tile.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") opts.onPick(p.seat);
    });
    wrap.append(tile);
  }
  return wrap;
}

function customerPickScreen(app: AppCtx, view: SeatView): HTMLElement {
  return chrome(app, "pick-screen", hud(view), timerBar(app),
    contractCard(view),
    h("div", { class: "section-label" }, "You are the Customer. Which pitch sold you?"),
    pitchTiles(app, view, { onPick: (seat) => { app.dir.customerPick(seat); app.rerender(); } }),
    h("div", { class: "row-end" }, pauseButton(app)),
  );
}

function sideVoteScreen(app: AppCtx, view: SeatView): HTMLElement {
  return chrome(app, "vote-screen", hud(view), timerBar(app),
    contractCard(view),
    h("div", { class: "section-label" },
      "Side vote: which pitch actually fits the data best? Not yours."),
    pitchTiles(app, view, {
      exclude: view.you,
      onPick: (seat) => { app.dir.sideVote(view.you, seat); app.rerender(); },
    }),
    h("div", { class: "row-end" },
      pauseButton(app),
      button("Abstain", "btn ghost small", () => { app.dir.sideVote(view.you, -1); app.rerender(); }),
    ),
  );
}

function revealScreen(app: AppCtx, view: SeatView): HTMLElement {
  const r = view.lastResult;
  if (!r) return waitingScreen(app, view);
  const winner = r.pitches.find((p) => p.seat === r.winnerSeat)!;
  const m = app.dir.movie(winner.tmdbId);
  const verdict = r.verdicts[r.winnerSeat];
  const stampCls = verdict === "TRUE_FIT" ? "stamp-true" : verdict === "MISFIT" ? "stamp-misfit" : "stamp-stretch";
  const stampText = verdict === "TRUE_FIT" ? "TRUE FIT" : verdict === "MISFIT" ? "MISFIT" : "STRETCH";

  const body = h("div", { class: "reveal-body" });
  if (m) {
    body.append(
      h("div", { class: "reveal-movie" },
        h("img", { class: "poster", src: posterDataUrl(m.tmdb_id, m.title, m.year), alt: `${m.title} poster` }),
        h("div", { class: "reveal-info" },
          h("div", { class: "reveal-title" }, `${m.title} (${m.year})`),
          h("div", { class: "reveal-synopsis" }, m.synopsis),
          h("div", { class: "reveal-vibe" }, m.vibe_sentence),
        ),
      ),
      h("div", { class: `stamp ${stampCls}` }, stampText,
        h("span", { class: "stamp-fit" }, ` ${r.fits[r.winnerSeat]}%`)),
    );
  }

  const lanes = h("div", { class: "lane-reveal" });
  for (const p of r.pitches) {
    const seat = view.seats[p.seat];
    const delta = r.pointsDelta[p.seat] ?? 0;
    lanes.append(h("div", { class: `lane-line${p.seat === r.winnerSeat ? " winner" : ""}` },
      h("span", { class: "lane-who" }, seat.handle),
      h("span", { class: `lane-tag ${p.lane}` }, p.lane === "straight" ? "Straight" : "Balderdash"),
      h("span", { class: "lane-fit" }, `${r.fits[p.seat]}%`),
      h("span", { class: "lane-delta" }, delta > 0 ? `+${delta}` : ""),
    ));
  }
  const customerDelta = r.pointsDelta[r.customer] ?? 0;
  if (customerDelta > 0) {
    lanes.append(h("div", { class: "lane-line" },
      h("span", { class: "lane-who" }, view.seats[r.customer].handle + " (Customer)"),
      h("span", { class: "lane-delta" }, `+${customerDelta}`),
    ));
  }
  body.append(lanes);

  // Overrule window (§8.3)
  if (view.phase === "OVERRULE") {
    body.append(overrulePanel(app, view));
  }

  // Seen It verdict ask (§8.3): non-scoring, honest by design.
  if (view.seenItPending != null && view.seats[view.seenItPending].kind === "human") {
    body.append(seenItAskPanel(app, view, view.seenItPending));
  }

  return chrome(app, "reveal-screen", hud(view), body);
}

function overrulePanel(app: AppCtx, view: SeatView): HTMLElement {
  const labels = view.contract ? chipLabels(view.contract) : null;
  const wrap = h("div", { class: "overrule-panel" });
  const tableSeat = app.dir.humanSeats()[0] ?? 0;
  let chipsOpen = false;

  const redraw = () => {
    wrap.replaceChildren(timerBar(app));
    if (!chipsOpen) {
      wrap.append(
        button("THE CRITIC IS WRONG", "btn overrule", () => { chipsOpen = true; redraw(); }),
        button("Next round", "btn ghost small", () => { app.dir.skipOverrule(); app.rerender(); }),
      );
    } else if (labels) {
      const chip = (c: Chip, label: string) =>
        button(label, "btn chip", () => { app.dir.overrule(tableSeat, c); chipsOpen = false; redraw(); });
      wrap.append(
        h("div", { class: "section-label" }, "What did I get wrong, exactly?"),
        chip("clause_a", labels.clause_a),
        chip("clause_b", labels.clause_b),
        chip("ending", labels.ending),
        button("Just wrong in general", "btn chip", () => { app.dir.overrule(tableSeat, null); chipsOpen = false; redraw(); }),
      );
    }
  };
  redraw();
  return wrap;
}

function seenItAskPanel(app: AppCtx, view: SeatView, seat: number): HTMLElement {
  const wrap = h("div", { class: "seenit-ask" },
    h("div", { class: "ask-line" },
      `${view.seats[seat].handle}: you claim to have watched this. Was the Critic right?`),
    button("The verdict was fair", "btn small", () => { app.dir.seenItVerdict(seat, true, null); app.rerender(); }),
    button("The verdict was wrong", "btn small", () => { app.dir.seenItVerdict(seat, false, null); app.rerender(); }),
  );
  return wrap;
}

function accuseScreen(app: AppCtx, view: SeatView): HTMLElement {
  const hidden = app.dir.hiddenSeatLetters();
  return chrome(app, "accuse-screen", hud(view),
    h("div", { class: "center-col" },
      h("div", { class: "section-label big" }, "One of the back-room seats is the Machine."),
      h("p", { class: "accuse-note" },
        "The other one replayed pitches written by a real person. Catch it on taste."),
      h("div", { class: "accuse-row" },
        ...hidden.map(({ seat, label }) =>
          button(`Accuse Seat ${label}`, "btn primary big", () => {
            app.dir.accuse(view.you, seat);
            app.rerender();
          }),
        ),
      ),
    ),
  );
}

function screeningPitchScreen(app: AppCtx, view: SeatView): HTMLElement {
  const candidateId = view.screening?.candidates[view.you];
  const m = candidateId != null ? app.dir.movie(candidateId) : undefined;
  const textarea = h("textarea", {
    class: "pitch-input", maxlength: "140", rows: "2",
    placeholder: "The finale plays it straight. Sell it for the whole couch.",
  }) as HTMLTextAreaElement;
  const submit = button("Pitch it", "btn primary big", () => {
    if (textarea.value.trim().length === 0) return;
    app.dir.screeningPitch(view.you, textarea.value.trim());
    app.rerender();
  });
  return chrome(app, "screening-screen", hud(view), timerBar(app),
    h("div", { class: "section-label big" }, "The Screening"),
    h("p", { class: "mood-note" }, "The table's mood picked four candidates. Yours:"),
    m ? movieCard(m) : h("div"),
    textarea,
    h("div", { class: "row-end" }, pauseButton(app), submit),
  );
}

function screeningVoteScreen(app: AppCtx, view: SeatView): HTMLElement {
  const scr = view.screening;
  const tiles = h("div", { class: "pitch-tiles" });
  if (scr) {
    for (const [seatStr, text] of Object.entries(scr.pitches)) {
      const seat = Number(seatStr);
      if (seat === view.you) continue;
      const m = app.dir.movie(scr.candidates[seat]);
      if (!m) continue;
      const tile = h("div", { class: "pitch-tile", role: "button", tabindex: "0" },
        h("img", { class: "poster small", src: posterDataUrl(m.tmdb_id, m.title, m.year), alt: `${m.title} poster` }),
        h("div", { class: "tile-movie" }, `${m.title} (${m.year})`),
        h("div", { class: "tile-pitch" }, `"${text}"`),
      );
      tile.addEventListener("click", () => { app.dir.screeningVote(view.you, seat); app.rerender(); });
      tiles.append(tile);
    }
  }
  return chrome(app, "screening-screen", hud(view), timerBar(app),
    h("div", { class: "section-label big" }, "Vote for tonight's movie. Not your own."),
    tiles,
  );
}

function waitingScreen(app: AppCtx, view: SeatView): HTMLElement {
  const waitingOn = view.phase === "VOTING_CUSTOMER"
    ? `${view.seats[view.customer].handle} is choosing a pitch`
    : view.phase === "MOOD" || view.phase === "PITCHING"
      ? "Pitches are coming in"
      : "The table is thinking";
  return chrome(app, "waiting-screen", hud(view),
    h("div", { class: "center-col" },
      view.contract ? contractCard(view) : h("div"),
      h("div", { class: "waiting-note" }, waitingOn + "…"),
      view.pitches.length > 0
        ? h("div", { class: "waiting-count" }, `${view.pitches.length} pitch(es) on the table`)
        : h("div"),
    ),
  );
}

// ---- results (§17.1) ----

function resultsScreen(app: AppCtx, view: SeatView): HTMLElement {
  const standings = view.seats.slice().sort((a, b) => b.score - a.score);
  const maxScore = standings[0]?.score ?? 0;

  const list = h("div", { class: "standings" });
  for (const s of standings) {
    list.append(h("div", { class: `standing${s.score === maxScore ? " winner" : ""}` },
      h("span", { class: "standing-handle" },
        `${s.handle}${s.kind === "machine" ? " (the Machine)" : s.kind === "ghost" ? " (the Ghost)" : ""}`),
      h("span", { class: "standing-score" }, String(s.score)),
    ));
  }

  const root = chrome(app, "results-screen",
    h("div", { class: "section-label big" }, "Final scores"),
    list,
  );

  // Replicant reveal ceremony
  if (view.mode === "replicant") {
    const machine = view.seats.find((s) => s.kind === "machine");
    const ghost = view.seats.find((s) => s.kind === "ghost");
    if (machine && ghost) {
      root.append(h("div", { class: "ceremony" },
        h("div", { class: "ceremony-line" },
          `Seat ${SEAT_LETTERS[machine.index]} was the Machine.`),
        h("div", { class: "ceremony-line ghost" },
          `Seat ${SEAT_LETTERS[ghost.index]} replayed pitches by a real person, 2026.`),
      ));
    }
  }

  // Tonight's Screening recap (§4.7 honesty rule: archive framing)
  const scr = view.screening;
  if (scr?.winnerSeat != null) {
    const m = app.dir.movie(scr.candidates[scr.winnerSeat]);
    if (m) {
      root.append(h("div", { class: "screening-recap" },
        h("div", { class: "section-label" }, "Tonight's Screening (from the Never Seen It archive)"),
        movieCard(m),
        h("p", { class: "reveal-synopsis" }, m.synopsis),
        h("p", { class: "reveal-vibe" }, m.vibe_sentence),
      ));
    }
  }

  // Mood receipts per human (async archive picks)
  for (const seat of app.dir.humanSeats()) {
    const vector = app.dir.tonightVector(seat);
    const receipt = h("div", { class: "receipt" },
      h("div", { class: "receipt-head" }, `${view.seats[seat].handle}'S RECEIPT`),
      h("div", { class: "receipt-body" }, tonightSentence(vector)),
      h("div", { class: "receipt-picks" }, "…"),
    );
    root.append(receipt);
    void app.dir.archivePicks(vector, 3).then((movies) => {
      const picks = receipt.querySelector(".receipt-picks");
      if (!picks) return;
      picks.textContent = "";
      for (const m of movies) {
        picks.append(h("div", { class: "receipt-pick" },
          `${m.title} (${m.year}) · from the archive`));
      }
    });
  }

  root.append(h("div", { class: "row-center" },
    button("Run it back", "btn primary big", () => {
      const s = app.dir.state;
      const humans = s.seats.filter((x) => x.kind === "human").map((x) => ({
        profileId: x.profileId ?? "", handle: x.handle,
        portraitSeed: app.dir.portraits[x.index] ?? 0,
      }));
      void app.dir.startMatch({ mode: s.mode, humans }).then(() => app.rerender());
    }),
    button("Back to the store", "btn ghost", () => {
      app.dir.abandonMatch();
      void app.refreshProfile().then(() => app.goto("title"));
    }),
  ));

  return root;
}
