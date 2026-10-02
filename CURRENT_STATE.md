# Current State

Current build: Build 02 - Pointer / Stylus Input Technology Spike
Playable game: No

Implemented:
- Concrete browser Pointer Event source behind the existing input abstraction.
- Mouse, pen/stylus, and touch Pointer Event normalization when supplied by the browser.
- Surface-relative X/Y, pointer ID/type, high-resolution timestamp, pressure, tilt, twist, buttons, primary/contact state, and conservative eraser detection.
- Optional tangential pressure, contact width/height, altitude angle, and azimuth angle with safe unsupported handling.
- Pointer down/move/up/cancel, pointer capture/loss, and enter/leave handling on a dedicated diagnostic surface.
- Scoped `touch-action: none` on the Input Lab surface only.
- `getCoalescedEvents()` unpacking with ordered individual normalized sample emission and safe fallback.
- Runtime detection of `pointerrawupdate` API availability without subscribing to a duplicate parallel movement stream.
- Imperative diagnostic raw trace with direct pressure-to-width mapping, clear control, and optional sample-point overlay.
- Live Input Lab diagnostics for pointer fields, coalesced observation, and rolling browser/normalized/coalesced/processed rates.
- Short in-memory Start Capture / Stop Capture summary with duration, pointer types, event/sample counts, average rate, pressure/tilt ranges, twist change, and eraser observation.
- Human test exercise checklist and blank playtest report template.
- Input technology capability report separating implemented behavior from hardware/browser behavior requiring human verification.
- GitHub Pages deployment workflow and repository-relative Vite build configuration.

Intentionally not implemented:
- A real brush engine, smoothing, stabilization, custom resampling, custom pressure curves, pencil/ink/marker simulation, or paint behavior.
- Canvas documents, layers, undo/redo, artwork saving, reference images, gameplay systems, characters, lessons, commissions, final UI, or game audio.
- Permanent raw input logs.
- Active `pointerrawupdate` consumption.

Human stylus verification still required:
- Actual pen latency and responsiveness.
- Pressure quality/range on the target stylus.
- Tilt, twist, and eraser behavior on the target browser/device.
- Fast-line/circle continuity, sharp-corner preservation, and tiny-handwriting quality.
- Real-device coalesced sample density.
- Browser gesture behavior on the target touch/stylus setup.

Tests:
- PASS: 16 tests across 7 test files.
- Includes pointer normalization/clamping, optional fields, device type, contact state, eraser detection, coalesced ordering/fallback, diagnostic statistics, capture summaries, and browser-source mouse/capture behavior.

Production build:
- PASS: strict TypeScript compilation and Vite production build.
- GitHub Pages-targeted production build with `/Pallette-Paper/` base path also passes.

CI:
- PASS on Build 02 implementation commit `bdc7cb7bfaf4ea01c5c5dba3bbf478ac2bc5459d`.

Public Input Lab URL:
- Not available yet. The deployable static build and Pages workflow are committed.

GitHub Pages blocker:
- GitHub reports: Pages is not enabled/configured to build using GitHub Actions for this repository.
- Single user action required: open repository Settings -> Pages -> Build and deployment, then set Source to GitHub Actions.
- After that setting is enabled, the committed "Deploy Input Lab to Pages" workflow can be re-run or triggered by the next push.

Known limitations:
- `isEraser: false` means the standardized eraser button convention was not detected; it is not proof that the hardware lacks an eraser.
- API presence does not prove that physical hardware supplies meaningful pressure, tilt, twist, or other optional data.
- `pointerrawupdate` is detected but intentionally not consumed in Build 02 to avoid duplicate movement accounting without device-specific validation.
- Resizing the diagnostic surface clears its canvas-backed trace.
- Input recordings retain aggregate summary data only in memory.

Latest commit:
- `bdc7cb7bfaf4ea01c5c5dba3bbf478ac2bc5459d` (latest verified Build 02 implementation commit before this state-document update).

Human review required: Yes
