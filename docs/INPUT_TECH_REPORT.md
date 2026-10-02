# Input Technology Report

## Build

Build 02 - Pointer / Stylus Input Technology Spike

## Purpose

Determine what quality and quantity of stylus data the browser can expose to Palette & Paper without tying high-frequency processing to React.

## Implemented capability

### Browser APIs used

The Input Lab uses browser Pointer Events on one dedicated diagnostic surface:

- `pointerdown`
- `pointermove`
- `pointerup`
- `pointercancel`
- `lostpointercapture`
- `pointerenter`
- `pointerleave`
- `setPointerCapture()` / `releasePointerCapture()`
- `getCoalescedEvents()` when exposed and when a pointer-move event returns coalesced samples

The surface uses scoped `touch-action: none` so browser pan/zoom gestures do not take over the diagnostic area. Browser behavior outside the Input Lab surface is not globally disabled.

### Normalized sample data

The normalized path captures:

- pointer ID
- pointer/device type
- X/Y position relative to the test surface
- event timestamp
- pressure
- tilt X/Y
- twist when represented by the event
- button and buttons bitmask
- primary-pointer state
- contact/down state
- conservative eraser detection
- tangential pressure when represented
- contact width/height when represented
- altitude angle when represented
- azimuth angle when represented
- whether a sample came from the primary event or a coalesced event

Optional numeric values become `null` when they are not exposed as finite values. The implementation does not invent hardware readings.

### Coalesced events

For `pointermove`, the source calls `getCoalescedEvents()` when the method exists. When the browser returns coalesced events, those samples are normalized and emitted individually in the order supplied by the browser. When no coalesced samples are returned, the parent pointer event is normalized as the fallback.

The Input Lab reports whether coalesced samples have actually been observed and shows their approximate rolling rate.

### `pointerrawupdate`

The implementation detects whether the `pointerrawupdate` event API appears to be available on the diagnostic surface and exposes that result in the live panel.

Build 02 does not subscribe to both `pointerrawupdate` and `pointermove` simultaneously. Using both streams without a device-specific deduplication policy could double-count the same physical movement. Real-device testing can determine whether consuming the raw-update stream would provide useful additional data for the target hardware.

### Pressure

Pressure is passed through directly after clamping to the Pointer Events range of 0 to 1. No custom pressure curve is applied.

The raw diagnostic trace maps the normalized pressure directly to a simple line width. That trace is only an inspection aid.

### Tilt

Tilt X and tilt Y are passed through after clamping to -90 to 90 degrees. No tilt interpretation or brush behavior is implemented.

### Twist

Twist is represented as a number only when the event exposes a finite value to the normalization layer. The recorder reports whether observed twist values changed during a capture.

A constant zero does not prove that the hardware supports twist; it may also mean the browser/device does not provide a varying twist signal.

### Eraser detection

Eraser detection is intentionally conservative. A pen sample is marked as eraser input only when standardized Pointer Event button information indicates button 5 or the corresponding bit 32 in the buttons mask.

`isEraser: false` means "not detected by this convention." It does not prove that a particular stylus/browser combination has no eraser or that every platform reports eraser state identically.

### Diagnostic rendering

The trace renderer is imperative and independent of React render cadence. It draws a plain dark line from normalized contact samples and can overlay each captured sample position as a small point.

It performs no smoothing, stabilization, custom resampling, texture, paint simulation, or brush behavior.

### Event-rate measurements

Short rolling windows report approximate:

- browser pointer events per second
- normalized samples per second
- coalesced samples per second
- processed samples per second

The recorder summarizes a short session in memory without storing a giant raw log.

## Fallback path

Mouse, pen, and touch all use the same Pointer Events path. If `getCoalescedEvents()` is unavailable or returns no samples, the normal pointer event itself is emitted as one normalized sample.

If optional stylus fields are unavailable, their normalized optional values are `null`. Basic pointer fields continue to work.

## Hardware/browser capability requiring human verification

Automated tests and TypeScript compilation cannot establish physical pen quality. A human with the target device/browser must verify:

- whether pressure changes smoothly and across a useful range;
- whether tilt changes are reported by the actual pen;
- whether twist varies on the actual hardware;
- whether the stylus eraser end is reported using the implemented convention;
- actual sample density and coalesced-event contribution;
- whether fast lines remain continuous;
- whether circles remain continuous;
- whether sharp zigzags preserve directional changes;
- whether tiny handwriting remains legible;
- whether latency is noticeable;
- whether pointer capture behaves correctly when leaving the surface;
- whether browser scrolling/gestures remain suppressed only inside the test surface.

## Known platform limitations

Pointer Events intentionally abstract hardware and OS input stacks, so reported values can vary by browser, operating system, digitizer, stylus, and driver.

A browser may expose a field in its API while the attached hardware always reports a default value. API presence alone therefore is not evidence that a physical capability is functioning.

Build 02 establishes instrumentation for real-device measurement. It does not claim universal or successful stylus support without human testing.
