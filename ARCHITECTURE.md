# Architecture

## Application bootstrap

`src/main.tsx` locates the browser root element and delegates startup to `src/app/bootstrap.tsx`. The bootstrap loads centralized configuration, creates the application-state store and browser-local persistence service, runs initialization, and mounts the React shell.

## Application surfaces

The shell now exposes three distinct experiences:

- **Play First Slice**: Build 04's authored five-to-ten-minute gameplay vertical slice.
- **Drawing Lab**: preserved Build 03 drawing-feel and technology workspace.
- **Input Lab**: preserved Build 02/02B pointer/stylus diagnostics.

Gameplay does not replace or fork the technical labs.

## Module responsibilities

- `src/config/`: centralized application title, build identifier, persistence schema version, and debug-mode configuration.
- `src/app/`: bootstrap, broad application state, and initialization orchestration.
- `src/core/`: small cross-boundary primitives.
- `src/input/`: normalized Pointer Event capture, coalesced-event batching, input diagnostics, and stylus validation.
- `src/drawing/`: stroke model, recording, resampling, stabilization, pressure mapping, processing, bounded history, transforms, diagnostics, and imperative drawing engine.
- `src/rendering/`: diagnostic and drawing canvas renderers behind imperative rendering boundaries.
- `src/gameplay/`: only Build 04's authored first-slice progression state and local playtest-report formatting.
- `src/ui/`: React presentation for the gameplay slice and both labs.
- `src/persistence/`: versioned small-state browser persistence. Build 04 gameplay/artwork is intentionally not saved.
- `src/debug/`: development-only application diagnostics.

No generalized NPC, commission, lesson, economy, inventory, dialogue-generation, or world framework exists.

## Build 04 slice progression

`src/gameplay/firstSliceState.ts` is a small deterministic reducer for one authored loop:

closed shop
-> opening shop
-> Mira introduction
-> Mira request
-> commission offer
-> commission accepted
-> studio lesson
-> studio drawing
-> return to shop
-> Mira reaction
-> notebook reveal
-> completion
-> optional feedback.

Invalid or out-of-order events are ignored rather than skipping states.

The reducer also retains one submitted artwork URL in memory and the slice start/completion timestamps used by the playtest report.

## Shop and character presentation

`FirstSlice.tsx` contains the authored Build 04 presentation. The shop environment, Mira figure, notebook, and potted-plant reference are original browser-native HTML/CSS/SVG presentation rather than external commercial assets.

Mira and Marlow are authored directly for this single slice. Their dialogue is not produced by a generic dialogue or AI system.

## Drawing integration

Build 04 reuses `DrawingEngine` directly through `CommissionStudio.tsx`.

The high-frequency path remains unchanged:

browser Pointer Events
-> normalized pointer batch
-> `DrawingEngine`
-> `StrokeRecorder`
-> `StrokeProcessor`
-> brush sampling
-> `DrawingRenderer`.

React owns only the gameplay toolbar, prompts, and throttled engine snapshot. It does not receive per-sample drawing state.

The gameplay Studio exposes only:

- Pencil
- Eraser
- Pan
- Undo
- Redo
- brush size
- zoom in/out
- Reset View
- submission.

Build 03 development controls such as Raw/Processed, stabilization selection, pressure-curve selection, diagnostics, and Drawing Feel Test remain in Drawing Lab and are hidden from gameplay.

## Submission boundary

`DrawingEngineSnapshot.hasDrawingInput` is true only when current history contains at least one completed pencil stroke with brush samples.

The gameplay **I'm Done** action remains disabled before that point. This is only an accidental-empty-canvas guard and does not grade artistic quality.

On confirmed submission, the same Build 03 renderer exports the finite drawing document to a PNG Blob. `FirstSlice` creates one in-memory object URL for that exact Blob and stores that URL in the slice state.

That same submitted artwork URL is reused for:

- the return-to-shop handoff;
- the notebook reveal;
- the end-of-slice thumbnail;
- the optional feedback screen.

No prefab replacement artwork or quality recognition is used.

## Artwork lifetime

The submitted PNG remains in browser memory for the remainder of the slice. Restarting the slice, returning to the development menu, or unmounting the gameplay experience revokes the object URL.

There is no project-file save, autosave, cloud upload, or permanent commission artwork storage.

## Drawing technology

Build 03 remains authoritative for the drawing engine:

- finite 1600 x 1200 document coordinates;
- DPR-aware backing store;
- processed input with spatial resampling;
- lightweight stabilization;
- Linear/Soft/Firm pressure mapping support;
- Pencil Prototype;
- transparent-compositing eraser;
- stroke-level bounded undo/redo;
- pan/zoom transforms.

Gameplay currently uses the engine defaults: processed input, Low stabilization, Linear pressure response, and a 6 px base pencil size, while still allowing brush-size adjustment.

## Playtest feedback

`src/gameplay/playtestReport.ts` formats local-only Build 04 feedback.

Known deterministic fields include:

- whether the loop reached completion;
- elapsed time from starting the slice to the completion card.

Human fields remain unanswered until the player selects them. Optional narrative fields are omitted from the report when empty.

Copying uses the browser clipboard with the same local fallback pattern as previous test tools. Download creates a local text Blob. No feedback is transmitted by the application.

## Public deployment

The existing GitHub Pages path remains in place. The Pages workflow builds with repository base path `/Pallette-Paper/` and a Build 04 identifier.

No alternate hosting provider is used.

## Dependency direction

Browser entrypoint -> application bootstrap -> React shell.

For gameplay:

React gameplay presentation -> tiny gameplay reducer/report formatter.

For drawing:

React gameplay presentation -> existing `DrawingEngine` public controls/snapshot -> input/drawing/rendering modules.

Gameplay does not own or duplicate the stroke pipeline.
