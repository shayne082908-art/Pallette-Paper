# Input Technology Report

## Build

Build 02B - Human Stylus Validation

## Purpose

Make the existing Pointer Event Input Lab suitable for short real-device validation without changing it into a drawing engine.

## Implemented capability

### Pointer Event capture

The Input Lab consumes browser Pointer Events on one dedicated surface:

- `pointerdown`
- `pointermove`
- `pointerup`
- `pointercancel`
- `lostpointercapture`
- `pointerenter`
- `pointerleave`
- pointer capture via `setPointerCapture()`
- `getCoalescedEvents()` where the browser exposes it

Mouse, pen, and touch use the same normalized path. Optional stylus fields remain nullable when the browser does not expose a finite value.

### Build 02B coalesced endpoint correction

Build 02 originally emitted coalesced move samples instead of the dispatched parent move whenever coalesced events existed. That can omit a distinct newest endpoint on browsers where the parent event is later than the returned coalesced history.

Build 02B now:

1. reads all returned coalesced samples;
2. adds the dispatched parent pointer-move event as another candidate;
3. sorts candidates chronologically, retaining source order for equal timestamps;
4. removes exact endpoint duplicates using pointer ID, timestamp, client X, and client Y;
5. normalizes and emits the remaining events individually in that order.

A parent event identical to a coalesced endpoint is therefore not emitted twice. A distinct parent endpoint remains present. No custom geometric resampling is introduced.

### Pressure, tilt, twist, and eraser

Pressure is clamped only to the Pointer Events 0–1 range. Tilt is clamped to -90–90 degrees. No pressure curve or brush behavior is applied.

Build 02B capture summaries calculate pressure/tilt/twist/eraser observations from contact samples. This prevents a non-contact mouse/pointer-up pressure value from creating a false pressure-variation signal.

Eraser detection remains conservative: pen button 5 or buttons bit 32. `isEraser: false` means the convention was not observed, not that the hardware lacks an eraser.

### Gap measurements

Each short exercise summary can report:

- maximum time gap between sequential contact samples for one pointer;
- maximum spatial gap between sequential contact samples for one pointer.

A contact lift resets the sequence. These numbers are diagnostic measurements only; Build 02B assigns no good/bad threshold.

### `pointerrawupdate`

The Input Lab reports whether the browser exposes the `pointerrawupdate` API. It still does not subscribe to both raw-update and pointer-move streams simultaneously because Build 02B has no device-specific deduplication policy for the parallel streams.

### Guided human test

One **Run Stylus Test** button starts eight short exercises:

1. slow line;
2. fast line;
3. fast circles;
4. sharp zigzags;
5. pressure;
6. tiny handwriting;
7. tilt;
8. eraser, which may be skipped.

Each exercise starts with a cleared trace and an independent in-memory aggregate capture. The user may go back, retry the current test, restart, or skip the eraser exercise.

Only a few human questions are asked for visual breaks, lag, zigzag appearance, handwriting appearance, and browser gesture interference.

### Capability summary

The result screen uses neutral statuses:

- Detected
- Not observed
- Unsupported by browser
- Not tested

The status panel includes pen, pressure variation, tilt variation, twist variation, eraser, coalesced events, `pointerrawupdate`, browser gesture interference, and noticed input lag.

A "Not observed" result is not translated into a claim that the hardware lacks that feature.

### Report and privacy

The result can be copied as compact plain text or downloaded as a small `.txt` file. Browser and operating-system labels are optional user-entered fields rather than inferred device identity.

Test processing stays local in the browser. The application contains no analytics, tracking, telemetry upload, external AI call, or server endpoint for these results.

## Automated verification scope

Automated tests cover normalization, coalesced-parent merging/deduplication/order, deterministic eraser logic, mouse fallback, rolling statistics, contact gap calculations, no-sample sessions, aggregate measurements, capability-state calculation, skipped tests, and report generation.

Automated tests cannot establish physical stylus latency, digitizer quality, real pressure fidelity, physical eraser behavior, or whether the raw trace subjectively preserves handwriting.

## Hardware/browser capability requiring human verification

A human with the target device/browser must still verify:

- actual pen detection;
- useful pressure variation;
- tilt/twist behavior;
- stylus eraser behavior;
- coalesced-event density;
- continuity of fast lines and circles;
- sharp corner preservation;
- tiny handwriting appearance;
- noticeable latency;
- unexpected scrolling/zoom/gesture interference.

Build 02B provides the evidence-collection workflow. It does not decide whether the browser path is good enough without that evidence.
