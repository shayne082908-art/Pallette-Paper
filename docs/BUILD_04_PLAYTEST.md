# Build 04 Playtest

## Exact playable loop

Build 04 contains one authored gameplay loop:

1. The shop begins closed with **Ready for the morning?**
2. The player selects **Open Shop**.
3. Mira arrives.
4. Mira asks for one handmade-notebook commission.
5. The player accepts **A Little Plant for a Friend**.
6. The player goes to the Studio.
7. Marlow introduces one lesson: simplify a subject into big shapes before details.
8. A simple original potted-plant reference remains available.
9. The player draws using the real Build 03 drawing engine.
10. The player confirms **I'm Done** and submits a non-empty drawing.
11. The exact submitted PNG is retained in browser memory.
12. The player returns to Mira.
13. Mira reacts to the handmade commission without a numeric or quality score.
14. The exact submitted artwork appears inside Mira's illustrated notebook.
15. **First Commission Complete** and **First Morning Complete** end the slice.
16. The player may replay, return to the development menu, or give playtest feedback.

The intended first-time playtime is roughly 5–10 minutes. The automated smoke runner advances faster than a normal human drawing session, so that runner is not treated as a pacing measurement.

## What this slice is trying to validate

The slice tests three experience promises:

1. **I run a charming creative shop.**
2. **I am genuinely practicing an art skill.**
3. **My artwork matters to someone.**

The art lesson is deliberately small and transferable: identify the largest shapes first, then add smaller details.

The third promise is represented literally: the submitted canvas image is reused in Mira's notebook and the completion card.

## Human playtest questions

The optional feedback screen asks:

- Did the opening feel like you were running a little creative shop?
- Did Mira feel like someone you wanted to help?
- Did the "big shapes first" idea make sense while drawing?
- Did drawing feel like part of the game rather than a separate tool?
- Did seeing your drawing inside Mira's notebook make the commission feel worthwhile?
- Did anything feel slow or unnecessary?
- Would you want another customer after this one?

Optional notes may record a favorite moment, confusing moment, boring moment, unexpectedly good moment, or anything else.

There is no automatic playtest score.

## Copyable report

**Copy Playtest Report** and **Download .txt** produce a local report containing only known completion timing plus player-supplied answers.

Feedback remains local unless the player explicitly copies or downloads it.

## Automated verification

Tested implementation commit:

`6a631c9e7d9972e0dd7691b865db2051089fad90`

At that commit:

- automated tests passed;
- strict TypeScript compilation passed;
- Vite production build passed;
- CI passed;
- GitHub Pages deployment passed.

Gameplay tests cover:

- ordered slice-state progression;
- commission acceptance into the Studio path;
- refusing a null/untouched submission snapshot;
- retaining the submitted artwork through return-to-shop/notebook states;
- reaching completion;
- restart reset;
- rejection of out-of-order state jumps;
- playtest report generation and timing;
- omission of unsupplied optional report text.

## Full mouse playthrough

The public Build 04 deployment was played through with mouse input at:

https://shayne082908-art.github.io/Pallette-Paper/

Verified:

- **Play First Slice** entry opens the closed-shop state;
- Open Shop works;
- Mira arrives and dialogue advances;
- commission card appears and can be accepted;
- Studio lesson and reference appear;
- untouched canvas cannot be submitted;
- mouse drawing registers through the Build 03 canvas;
- Undo and Redo work;
- submission confirmation presents **Keep Drawing** and **Submit**;
- submission returns to Mira;
- submitted artwork is retained as the slice's in-memory Blob URL;
- Mira reaction advances;
- notebook reveal shows the submitted artwork;
- completion card shows the submitted-artwork thumbnail;
- feedback questionnaire works;
- Copy Playtest Report reports success;
- text download is offered and produces the Build 04 report;
- Play Again returns to the exact initial closed-shop prompt;
- no obvious runtime/control failures were observed during the automated browser playthrough.

The browser automation run used mouse input only.

## Intentionally excluded

Build 04 does not contain:

- another customer;
- random/generated customers;
- inventory, suppliers, stocking, register gameplay, currency, pricing, or economy;
- reputation, relationships, XP, skills, loot, or progression;
- multiple commissions or deadlines;
- calendar/day-night simulation;
- explorable rooms;
- staff;
- multiple lessons or tutor systems;
- AI integration;
- additional brushes;
- layers or artwork project saves;
- final art assets;
- a full audio system.

## Known limitations

- Physical stylus gameplay has not yet been tested by the builder.
- The shop, Mira, reference, notebook, and UI are intentionally temporary browser-native prototype art.
- The commission cannot be rejected or negotiated.
- The game does not inspect whether the drawing resembles a plant.
- The non-empty guard checks that a completed pencil stroke exists; it is not a quality judgment.
- Artwork exists only in memory for the current slice.
- The slice has no save/resume system.
- Playtime target still needs human pacing feedback.
