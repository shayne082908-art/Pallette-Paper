# Architecture

## Application bootstrap

`src/main.tsx` locates the browser root element and delegates startup to `src/app/bootstrap.tsx`. The bootstrap loads centralized configuration, creates the application-state store and browser-local persistence service, runs initialization, and mounts the React development shell.

## Workspaces

The development shell exposes two separate workspaces:

- **Drawing Lab**: Build 03 finite drawing-feel prototype.
- **Input Lab**: preserved Build 02/02B pointer/stylus diagnostics and guided stylus validation.

Switching workspaces is ordinary React UI state. The high-frequency pointer and drawing paths remain imperative.

## Module responsibilities

- `src/config/`: centralized application title, build identifier, persistence schema version, and debug-mode configuration.
- `src/app/`: bootstrap, broad application state, and initialization orchestration.
- `src/core/`: small cross-boundary primitives.
- `src/input/`: normalized Pointer Event capture, coalesced-event batching, pointer diagnostics, and Build 02B stylus validation/reporting.
- `src/drawing/`: Build 03 stroke model, recording, spatial resampling, stabilization, pressure mapping, stroke processing, bounded history, coordinate transforms, drawing diagnostics, feel-test reporting, and the imperative drawing engine.
- `src/rendering/`: rendering boundaries plus diagnostic and drawing canvas renderers.
- `src/persistence/`: versioned small-state browser persistence. Build 03 artwork is intentionally not persisted.
- `src/ui/`: React controls and panels for Drawing Lab and Input Lab.
- `src/debug/`: small application diagnostics.

No gameplay systems are implemented.

## High-frequency separation

React controls tool settings, workspace selection, test prompts, reports, and diagnostics display. It does not process each pointer sample through component state.

Drawing Lab's high-frequency path is:

browser Pointer Events
-> `BrowserPointerInputSource`
-> normalized pointer batch
-> `DrawingEngine`
-> `StrokeRecorder`
-> `StrokeProcessor`
-> pressure/brush sampling
-> `DrawingRenderer`.

The engine consumes batches directly and draws imperatively. React reads a throttled engine snapshot for toolbar/history/diagnostic UI.

## Pointer input boundary

`BrowserPointerInputSource` remains shared with Input Lab. It handles pointer capture and emits normalized batches containing browser-provided coalesced samples plus the distinct dispatched parent endpoint when appropriate.

Build 03 converts viewport-relative normalized pointer coordinates into finite document coordinates through the current pan/zoom transform.

## Stroke model

`StrokeSample` stores pointer ID, document-space X/Y, timestamp, pressure, tilt X/Y, pointer type, contact state, and explicit phase: begin, continue, end, or cancel.

`StrokeRecorder` owns one active stroke at a time and freezes completed stroke records with their settings and terminal status.

`CompletedStroke` also retains the brush samples needed for replay. The document does not retain an unbounded raw browser event log.

## Stroke processing

`StrokeProcessor` has two comparison modes:

- **Raw**: normalized stroke samples are converted directly to brush samples with minimal intervention.
- **Processed**: samples pass through spatial resampling and the selected lightweight stabilizer before brush conversion.

The first sample is emitted immediately. Dots and very short strokes therefore do not wait for a movement buffer.

### Spatial resampling

`SpatialResampler` inserts interpolated samples at controlled spatial spacing. It preserves the first point, final endpoint, and explicit sharp raw direction changes. Output is bounded to prevent runaway sample generation.

This stage is separate from browser `getCoalescedEvents()`: coalesced events preserve browser-provided input density, while Build 03 resampling creates drawing-system brush sampling.

### Stabilization

`StrokeStabilizer` implements Off, Low, and Medium modes using lightweight position filtering. The first point remains immediate and the actual terminal endpoint is restored when the stroke finishes.

This is intentionally replaceable and non-predictive.

## Pressure mapping and Pencil Prototype

`pressure.ts` provides Linear, Soft, and Firm mappings. Pressure affects brush width through a bounded base-size calculation.

The only drawing brush is **Pencil Prototype**. It uses a plain dark round stroke with pressure-sensitive width. It is not a graphite simulation and has no texture engine.

The eraser uses the same stroke pipeline with `destination-out` compositing and a larger predictable width. A detected stylus eraser can temporarily select erasing for that stroke without changing the toolbar's selected drawing tool.

## Rendering

`DrawingRenderer` owns one 1600x1200 finite document canvas. Its backing dimensions are scaled for device pixel ratio while its document/CSS coordinate size remains stable.

Pan and zoom are applied as a CSS transform to the document canvas. Pointer positions are transformed back into document coordinates before recording.

Browser viewport resize does not resize or clear the document backing store unless device pixel ratio itself changes. If DPR changes, the renderer rebuilds from stroke history.

The renderer draws the active stroke incrementally. Undo/redo redraws completed strokes from history. Active drawing does not rebuild the entire document on every sample.

## Undo and redo

`StrokeHistory` stores a bounded sequence of completed strokes plus a redo stack.

- one completed stroke is one undo action;
- redo restores the most recently undone stroke;
- committing a new stroke clears the redo branch;
- the history limit is currently 200 strokes.

## Navigation

The Drawing Lab has an explicit Hand / Pan interaction mode. Wheel input zooms around the pointer position. Toolbar buttons zoom around the viewport center. Reset View fits the finite document inside the viewport.

Canvas rotation and infinite canvas are not implemented.

## Diagnostics and drawing feel test

`DrawingDiagnostics` reports approximate one-second-window input sample rate, processed brush sample rate, frame rate, and active-stroke sample count.

`DrawingMeasurementRecorder` collects in-memory feel-test aggregates: pointer types, input/processed counts and rates, largest sequential contact input gap, and pressure range.

The six-step Drawing Feel Test asks for tiny handwriting, fast circles, sharp zigzags, pressure ramp, slow contour, and a free sketch. Human questions are stored only for the current browser session and produce no automatic score.

## Export and privacy

**Export PNG** creates a white-background PNG containing only the drawing document.

Drawing test reports can be copied or downloaded as plain text. Artwork, pointer samples, reports, and test measurements are not uploaded by the application. There are no analytics or tracking systems.

## Persistence boundary

Existing versioned browser persistence remains limited to small application state. Build 03 deliberately does not save artwork/project files or autosave drawing documents.

## Dependency direction

Browser entrypoint -> application bootstrap -> React shell.

Within Drawing Lab:

input modules -> drawing engine/domain modules -> rendering boundary.

Drawing-domain and rendering code do not depend on React. React consumes public engine controls/snapshots rather than owning stroke data.
