# Architecture

## Application bootstrap

`src/main.tsx` locates the browser root element and delegates startup to `src/app/bootstrap.tsx`. The bootstrap loads centralized configuration, creates the application-state store and browser-local persistence service, runs initialization, and mounts the React development shell.

## Module responsibilities

- `src/config/`: centralized application title, build identifier, persistence schema version, and debug-mode configuration.
- `src/app/`: bootstrap, broad application state, and initialization orchestration.
- `src/core/`: small cross-boundary primitives currently limited to the unsubscribe type.
- `src/input/`: pointer normalization, concrete browser Pointer Event capture, rolling diagnostics, and short in-memory capture summaries.
- `src/rendering/`: the general imperative rendering contract plus the diagnostic raw-trace renderer used by Input Lab.
- `src/persistence/`: versioned small-state persistence and the browser `localStorage` driver.
- `src/ui/`: ordinary React UI, including the Build 02 Input Lab diagnostics.
- `src/debug/`: development-only application diagnostics.

The `game`, `audio`, and `content` areas remain absent because no current implementation belongs in them. Empty architectural placeholders are avoided.

## Application state

`ApplicationStateStore` owns the broad modes `booting`, `ready`, and `error`. It exposes explicit transitions and subscriptions without a state-machine dependency. These are application lifecycle modes, not gameplay states.

## React and high-frequency systems

React owns the diagnostic controls and display only. `BrowserPointerInputSource` listens to browser Pointer Events imperatively and emits normalized samples directly to consumers. The diagnostic renderer and measurement/recording services consume those samples without waiting for a React render.

Input Lab copies the latest sample and rolling measurements into React state on a throttled animation-frame loop. Incoming samples never cause one React state update per pointer sample.

## Input boundary

`PointerSample` contains pointer ID, local position, high-resolution timestamp, device type, pressure, tangential pressure, tilt, twist, contact dimensions, altitude/azimuth angles, button state, primary/contact state, conservative eraser state, and sample origin.

`BrowserPointerInputSource`:
- handles pointer down/move/up/cancel, capture loss, enter, and leave;
- captures the active pointer on pointer down so contact can continue across surface bounds;
- uses `getCoalescedEvents()` for pointer moves when the browser returns coalesced samples;
- emits coalesced samples individually and in browser-provided order;
- detects `pointerrawupdate` API availability for diagnostics but does not currently subscribe to that parallel stream, avoiding duplicate sample accounting.

`touch-action: none` is scoped to the Input Lab surface only.

## Input diagnostics

`InputRateMeter` keeps short rolling timestamp windows for browser events, normalized samples, coalesced samples, and processed samples.

`InputCaptureRecorder` retains aggregate measurements only for an active short capture. It does not keep a permanent raw event log. The summary includes duration, pointer types, event/sample counts, sample rate, pressure and tilt ranges, twist change, and eraser observation.

## Rendering boundary

`RenderingService` remains the general imperative canvas boundary.

`DiagnosticTraceRenderer` is deliberately instrumentation, not a brush engine. It draws raw normalized contact samples as a dark line with a direct pressure-to-width mapping and can draw individual sample points on a separate overlay canvas. It performs no smoothing, stabilization, custom pressure curve, resampling, texture, or paint simulation.

## Persistence boundary

`VersionedPersistence` stores versioned JSON envelopes through a small `StorageDriver` interface. `BrowserLocalStorageDriver` is the current browser-local driver. Missing records are a normal result, invalid data is reported safely, and schema mismatches are explicit. Build 02 does not persist Input Lab recordings.

## Dependency direction

Browser entrypoint -> application bootstrap -> configuration/state/persistence -> React shell.

Input Lab UI owns the browser surface lifecycle, but the high-frequency flow is:

browser Pointer Events -> `BrowserPointerInputSource` -> normalized `PointerSample` -> diagnostic metrics/recorder + imperative trace renderer.

The input and rendering modules do not depend on React. Persistence does not depend on application or UI modules.
