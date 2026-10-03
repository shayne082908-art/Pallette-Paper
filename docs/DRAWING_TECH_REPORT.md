# Drawing Technology Report

## Build

Build 03 - First Real Drawing Canvas

## Scope

Build 03 turns the established Pointer Event input path into the first usable finite drawing surface. It remains a drawing-feel prototype, not the game and not a final brush system.

## Drawing surface

Drawing Lab uses a finite 1600 x 1200 document coordinate space on one HTML canvas.

The canvas backing size is multiplied by device pixel ratio while document coordinates remain 1600 x 1200. Pan and zoom change the screen transform, not stored stroke coordinates.

Ordinary browser viewport resizing does not clear the artwork. If device pixel ratio changes, the canvas backing store is resized and completed strokes are replayed from history.

## Stroke pipeline

The implemented high-frequency path is:

```text
Browser Pointer Samples
        ↓
Normalized Input Batch
        ↓
Stroke Recorder
        ↓
Stroke Processing
        ↓
Brush Sampling
        ↓
Canvas Renderer
```

React is not in this per-sample loop.

### Stroke recording

A recorded sample retains:

- document X/Y
- timestamp
- pressure
- tilt X/Y
- pointer type
- contact state
- explicit begin / continue / end / cancel phase

Completed strokes retain the stroke settings and processed brush samples used for replay and history.

### Raw mode

Raw mode converts normalized input samples directly to brush samples apart from pressure/size mapping. It is intended as the comparison baseline.

### Processed mode

Processed mode applies spatial resampling followed by the selected stabilization mode before brush conversion.

## Spatial resampling

The resampler targets controlled spatial spacing based on base brush size, currently clamped to a small practical spacing range.

It:

- emits the first point immediately;
- interpolates across large movement gaps;
- preserves the final endpoint;
- explicitly preserves sharp raw direction changes;
- bounds total output samples;
- remains independent from browser coalesced-event handling.

This is drawing-system resampling. It does not replace or reinterpret the Build 02B browser sample-preservation behavior.

## Stabilization

Available modes:

- Off
- Low
- Medium

The implementation uses a lightweight position filter rather than prediction or a future-point buffer. Low and Medium trade increasing cleanup for decreasing immediacy.

The first mark is never withheld. At stroke completion, the actual terminal endpoint is emitted so stabilization does not leave the stroke visibly short.

## Pencil Prototype

Build 03 has exactly one primary drawing brush: **Pencil Prototype**.

It uses:

- round line caps and joins;
- a restrained dark color;
- pressure-sensitive line width;
- immediate dabs for dots/short marks;
- incremental segment rendering during an active stroke.

It is not a realistic graphite simulation and has no texture, grain, color, or wet-media behavior.

## Pressure mapping

Three pressure responses are available:

- Raw / Linear
- Soft
- Firm

Soft increases response at lower pressure. Firm requires more pressure for equivalent width. Mouse fallback uses a visible mid pressure when the browser supplies zero mouse pressure.

Effective pencil width combines bounded base size and mapped pressure. Eraser width uses the same pressure input with a larger base.

No pressure curve is assumed universally best.

## Eraser

The toolbar eraser uses `destination-out` compositing on the drawing canvas.

If a pointer sample is conservatively identified as a stylus eraser, that stroke is processed as erasing while the toolbar selection remains unchanged. The next normal pen stroke therefore returns to the previously selected tool.

## Undo / redo

History is stroke-level and bounded to 200 completed strokes.

- Undo removes one completed stroke.
- Redo restores it.
- A new completed stroke after undo invalidates redo history.
- Redraw after history changes replays stored brush samples rather than reprocessing browser input.

## Pan and zoom

Drawing uses an explicit **Hand / Pan** mode so navigation is not confused with drawing.

Zoom controls:

- Zoom -
- Zoom +
- mouse wheel zoom
- Reset view

Wheel zoom keeps the document point under the cursor anchored. Reset View fits the document into the current viewport. Canvas rotation and infinite canvas are intentionally absent.

## Performance approach

The active stroke is rendered incrementally rather than redrawing all artwork per sample.

The implementation avoids:

- React state updates per pointer sample;
- full-canvas pixel readback in the drawing loop;
- serialization during active drawing;
- rebuilding the entire document during ordinary pointer movement.

A throttled React diagnostics panel may show approximate input samples/sec, processed samples/sec, render FPS, active stroke samples, processing mode, stabilization mode, and pressure curve.

## Drawing Feel Test

The short human test contains:

1. Tiny handwriting
2. Fast circles
3. Sharp zigzags
4. Pressure ramp
5. Slow contour
6. Free sketch

During the test the user may change Raw/Processed, stabilization, and pressure curve settings. The test records aggregate input measurements but does not score drawing quality.

At completion it asks simple Yes / No / Not sure questions about immediacy, breaks, handwriting, pressure control, stabilization, undo/redo, navigation interference, and willingness to sketch for a few minutes.

The report can be copied or downloaded as `.txt`.

## PNG export

**Export PNG** creates a PNG from the finite document canvas on a white background. The toolbar and diagnostic UI are not included.

No project-file, layered, SVG, PSD, or cloud export is implemented.

## Automated verification

The Build 03 implementation commit `f29355e4360db4b9e9bb546b998d79cc702ecc0c` passed:

- 48 automated tests across 16 test files;
- strict TypeScript compilation;
- Vite production build.

Drawing-specific automated coverage includes:

- stroke begin/end/cancel recording;
- dot/short-stroke behavior;
- spatial interpolation and endpoint preservation;
- sharp direction-change preservation;
- bounded resampling;
- stabilization endpoint behavior;
- pressure curves and brush-size calculation;
- mouse pressure fallback;
- undo/redo and redo invalidation;
- coordinate transform round-trips and zoom anchoring;
- device-pixel-ratio backing-size calculation;
- raw/processed stroke processing;
- drawing test report generation.

Automated tests do not prove pleasant drawing feel.

## Compiled-browser smoke verification

The exact CI production artifact from `f29355e4360db4b9e9bb546b998d79cc702ecc0c` was exercised in Chromium with mouse input.

Verified:

- Drawing Lab opens;
- mouse fallback draws;
- undo and redo restore expected canvas states;
- Raw/Processed control works;
- stabilization selection works;
- pressure-curve selection works;
- brush-size control works;
- eraser modifies existing artwork;
- zoom controls work;
- Hand / Pan changes the view;
- Reset View works;
- resizing the browser viewport preserves artwork;
- Clear canvas works;
- all six Drawing Feel Test steps are traversable;
- drawing report is generated;
- copy report works;
- report `.txt` download matches the visible report;
- PNG export produces a non-empty PNG download;
- no console errors or page runtime errors were observed.

The smoke environment did not provide physical stylus hardware.

## Public deployment

The repository-relative Pages build succeeds with base path `/Pallette-Paper/`.

GitHub Pages deployment remains blocked at `actions/configure-pages` because the repository Pages source is not enabled/configured for GitHub Actions. The existing Pages workflow is ready and has not been replaced.

## Known limitations

- Physical stylus drawing feel has not yet been tested.
- The pencil is a simple line prototype, not graphite simulation.
- Stabilization is intentionally lightweight and non-predictive.
- Erasing is simple transparent compositing, not an artistic eraser.
- History is in-memory and stroke-level only.
- Artwork is not persisted or autosaved.
- No layers, selections, transforms, rotation, color tools, or reference images exist.
- The feel-test measurements provide evidence but no automatic good/bad threshold.
