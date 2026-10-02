# Architecture

## Application bootstrap

`src/main.tsx` locates the browser root element and delegates startup to `src/app/bootstrap.tsx`. The bootstrap loads centralized configuration, creates the application-state store and browser-local persistence service, runs initialization, and mounts the React development shell.

## Module responsibilities

- `src/config/`: centralized application title, build identifier, persistence schema version, and debug-mode configuration.
- `src/app/`: bootstrap, broad application state, and initialization orchestration.
- `src/core/`: small cross-boundary primitives currently limited to the unsubscribe type.
- `src/input/`: normalized pointer-sample contract and consumer boundary.
- `src/rendering/`: imperative rendering-service contract only; no renderer is implemented.
- `src/persistence/`: versioned small-state persistence and the browser `localStorage` driver.
- `src/ui/`: ordinary React UI used for the development smoke shell.
- `src/debug/`: development-only diagnostic UI.

The requested `game`, `audio`, and `content` areas are intentionally absent because Build 01 contains no implementation that belongs in them. Empty architectural placeholders are avoided.

## Application state

`ApplicationStateStore` owns the broad modes `booting`, `ready`, and `error`. It exposes explicit transitions and subscriptions without a state-machine dependency. These are application lifecycle modes, not gameplay states.

## React and high-frequency systems

React owns only ordinary UI in this build. The input and rendering boundaries are imperative TypeScript contracts outside React. Future high-frequency pointer or rendering work can publish/consume samples and render on its own cadence instead of routing real-time work through React component state.

## Input boundary

`PointerSample` normalizes position, timestamp, device type, pressure, tilt, twist, button bitmask, and contact state. `PointerSampleSource` defines a subscription boundary. Build 01 does not capture browser pointer events, process strokes, or draw.

## Rendering boundary

`RenderingService` defines imperative attach, resize, and detach operations against a canvas surface. There is no concrete renderer, rendering loop, shader, or visual effect in Build 01.

## Persistence boundary

`VersionedPersistence` stores versioned JSON envelopes through a small `StorageDriver` interface. `BrowserLocalStorageDriver` is the current browser-local driver. Missing records are a normal result, invalid data is reported safely, and schema mismatches are explicit. This namespace is for small application/game state only; larger user-created files are not represented by this abstraction.

## Dependency direction

Browser entrypoint -> application bootstrap -> configuration/state/persistence -> React shell. UI reads application state and diagnostics. Input and rendering contracts do not depend on React or UI modules. Persistence does not depend on application or UI modules.
