# Architecture

## Application bootstrap

`src/main.tsx` locates the browser root element and delegates startup to `src/app/bootstrap.tsx`. The bootstrap loads centralized configuration, creates the application-state store and browser-local persistence service, runs initialization, and mounts the React development shell.

## Module responsibilities

- `src/config/`: centralized application title, build identifier, persistence schema version, and debug-mode configuration.
- `src/app/`: bootstrap, broad application state, and initialization orchestration.
- `src/core/`: small cross-boundary primitives currently limited to the unsubscribe type.
- `src/input/`: pointer normalization, concrete browser Pointer Event capture, rolling/capture diagnostics, guided validation definitions, capability-state calculation, and report generation.
- `src/rendering/`: the general imperative rendering contract plus the diagnostic raw-trace renderer used by Input Lab.
- `src/persistence/`: versioned small-state persistence and the browser `localStorage` driver.
- `src/ui/`: ordinary React UI, including the Input Lab and guided Build 02B test controls/results.
- `src/debug/`: development-only application diagnostics.

No gameplay, brush-engine, document, or artwork-storage module is implemented.

## Application state

`ApplicationStateStore` owns the broad modes `booting`, `ready`, and `error`. These remain application lifecycle modes rather than gameplay states.

## React and high-frequency systems

React owns controls, instructions, questions, and throttled diagnostic/result display. It does not process one state update per pointer sample.

The high-frequency path remains imperative:

browser Pointer Events -> `BrowserPointerInputSource` -> normalized `PointerSample` -> `InputRateMeter` / `InputCaptureRecorder` + `DiagnosticTraceRenderer`.

The React view copies the latest sample and rolling rates on a throttled animation-frame loop.

## Input boundary

`PointerSample` contains pointer ID, local position, timestamp, device type, pressure, tangential pressure, tilt, twist, contact dimensions, altitude/azimuth angles, button state, primary/contact state, conservative eraser state, and sample origin.

`BrowserPointerInputSource` handles down/move/up/cancel, pointer capture/loss, and enter/leave. `touch-action: none` remains scoped to the diagnostic surface.

### Coalesced-event batching

For pointer moves, `getCoalescedEvents()` is used when available. Build 02B merges browser-provided coalesced events with the dispatched parent event, sorts them chronologically with stable source ordering for timestamp ties, and removes exact endpoint duplicates using pointer ID + timestamp + client X/Y.

This preserves a distinct newer parent endpoint instead of replacing it with only older coalesced samples. It is browser-sample preservation only; there is no geometric resampling.

## Input diagnostics

`InputRateMeter` maintains short rolling timestamp windows for browser events, normalized samples, coalesced samples, and processed samples.

`InputCaptureRecorder` retains aggregate state for one short capture. It counts the browser/normalized stream, but pressure, tilt, twist, eraser, and sequential gap metrics are derived from contact samples so hover/up defaults do not masquerade as stylus capability.

It calculates maximum time and spatial gaps only between sequential contact samples for the same pointer. Contact lifts reset that sequence.

No raw sample log is permanently stored.

## Guided validation

`src/input/stylusValidation.ts` defines the eight human exercises, neutral capability states, cross-test aggregate measurements, and the copyable text report.

The UI automatically clears the diagnostic trace when an exercise begins, records one in-memory summary per completed exercise, permits retry/previous/restart, and permits the eraser exercise to be skipped.

Human visual judgments remain explicit user answers rather than automated quality scores.

## Rendering boundary

`RenderingService` remains the general imperative canvas boundary. `DiagnosticTraceRenderer` draws the raw line and optional sample points with direct pressure-to-width mapping.

There is no smoothing, stabilization, prediction, custom resampling, brush simulation, or paint behavior.

## Privacy and persistence

The guided test keeps results in browser memory only. Report copy uses the browser clipboard when available with an in-document fallback. Report download creates a local text Blob.

No stylus samples, drawings, hardware information, or reports are sent to an application server. No analytics or tracking are present.

`VersionedPersistence` remains limited to small application state and is not used for stylus-test data.

## Dependency direction

Browser entrypoint -> application bootstrap -> configuration/state/persistence -> React shell.

Input and rendering modules do not depend on React. Validation/report logic depends on input-domain types, not UI components. Persistence does not depend on application or UI modules.
