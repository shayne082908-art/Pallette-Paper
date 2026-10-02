import type { BrowserPointerActivity } from './browserPointerInputSource';
import type { PointerDeviceType, PointerSample } from './pointerInput';

const RATE_WINDOW_MS = 1000;

export interface InputRateSnapshot {
  readonly browserEventsPerSecond: number;
  readonly normalizedSamplesPerSecond: number;
  readonly coalescedSamplesPerSecond: number;
  readonly processedSamplesPerSecond: number;
  readonly coalescedObserved: boolean;
}

export class InputRateMeter {
  private readonly browserEventTimes: number[] = [];
  private readonly normalizedSampleTimes: number[] = [];
  private readonly coalescedSampleTimes: number[] = [];
  private readonly processedSampleTimes: number[] = [];
  private coalescedObserved = false;

  recordBrowserEvent(activity: BrowserPointerActivity): void {
    this.browserEventTimes.push(activity.timestamp);
    if (activity.coalescedSampleCount > 0) {
      this.coalescedObserved = true;
    }
  }

  recordNormalizedSample(sample: PointerSample): void {
    this.normalizedSampleTimes.push(sample.timestamp);
    if (sample.origin === 'coalesced') {
      this.coalescedSampleTimes.push(sample.timestamp);
      this.coalescedObserved = true;
    }
  }

  recordProcessedSample(timestamp: number): void {
    this.processedSampleTimes.push(timestamp);
  }

  snapshot(now: number): InputRateSnapshot {
    return Object.freeze({
      browserEventsPerSecond: this.rate(this.browserEventTimes, now),
      normalizedSamplesPerSecond: this.rate(this.normalizedSampleTimes, now),
      coalescedSamplesPerSecond: this.rate(this.coalescedSampleTimes, now),
      processedSamplesPerSecond: this.rate(this.processedSampleTimes, now),
      coalescedObserved: this.coalescedObserved,
    });
  }

  private rate(timestamps: number[], now: number): number {
    const cutoff = now - RATE_WINDOW_MS;
    while (timestamps.length > 0 && timestamps[0] !== undefined && timestamps[0] < cutoff) {
      timestamps.shift();
    }
    return timestamps.length;
  }
}

export interface DiagnosticCaptureSummary {
  readonly durationMs: number;
  readonly pointerTypes: readonly PointerDeviceType[];
  readonly browserPointerEvents: number;
  readonly normalizedSamples: number;
  readonly coalescedSamples: number;
  readonly averageSampleRate: number;
  readonly averageCoalescedSampleRate: number;
  readonly maximumTimeGapMs: number | null;
  readonly maximumSpatialGapPx: number | null;
  readonly pressureRange: readonly [number, number] | null;
  readonly pressureVariation: number | null;
  readonly tiltXRange: readonly [number, number] | null;
  readonly tiltYRange: readonly [number, number] | null;
  readonly twistChanged: boolean;
  readonly eraserObserved: boolean;
}

interface ContactPoint {
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
}

export class InputCaptureRecorder {
  private active = false;
  private startedAt = 0;
  private browserPointerEvents = 0;
  private normalizedSamples = 0;
  private coalescedSamples = 0;
  private pointerTypes = new Set<PointerDeviceType>();
  private contactSamples = 0;
  private minPressure = Number.POSITIVE_INFINITY;
  private maxPressure = Number.NEGATIVE_INFINITY;
  private minTiltX = Number.POSITIVE_INFINITY;
  private maxTiltX = Number.NEGATIVE_INFINITY;
  private minTiltY = Number.POSITIVE_INFINITY;
  private maxTiltY = Number.NEGATIVE_INFINITY;
  private firstTwist: number | null = null;
  private twistChanged = false;
  private eraserObserved = false;
  private maximumTimeGapMs: number | null = null;
  private maximumSpatialGapPx: number | null = null;
  private readonly previousContactByPointer = new Map<number, ContactPoint>();

  isActive(): boolean {
    return this.active;
  }

  start(now: number): void {
    this.active = true;
    this.startedAt = now;
    this.browserPointerEvents = 0;
    this.normalizedSamples = 0;
    this.coalescedSamples = 0;
    this.pointerTypes = new Set<PointerDeviceType>();
    this.contactSamples = 0;
    this.minPressure = Number.POSITIVE_INFINITY;
    this.maxPressure = Number.NEGATIVE_INFINITY;
    this.minTiltX = Number.POSITIVE_INFINITY;
    this.maxTiltX = Number.NEGATIVE_INFINITY;
    this.minTiltY = Number.POSITIVE_INFINITY;
    this.maxTiltY = Number.NEGATIVE_INFINITY;
    this.firstTwist = null;
    this.twistChanged = false;
    this.eraserObserved = false;
    this.maximumTimeGapMs = null;
    this.maximumSpatialGapPx = null;
    this.previousContactByPointer.clear();
  }

  recordBrowserEvent(activity: BrowserPointerActivity): void {
    if (!this.active) {
      return;
    }

    this.browserPointerEvents += 1;
    this.coalescedSamples += activity.coalescedSampleCount;
  }

  recordSample(sample: PointerSample): void {
    if (!this.active) {
      return;
    }

    this.normalizedSamples += 1;
    this.pointerTypes.add(sample.deviceType);

    if (sample.isContact) {
      this.contactSamples += 1;
      this.minPressure = Math.min(this.minPressure, sample.pressure);
      this.maxPressure = Math.max(this.maxPressure, sample.pressure);
      this.minTiltX = Math.min(this.minTiltX, sample.tiltX);
      this.maxTiltX = Math.max(this.maxTiltX, sample.tiltX);
      this.minTiltY = Math.min(this.minTiltY, sample.tiltY);
      this.maxTiltY = Math.max(this.maxTiltY, sample.tiltY);
      this.eraserObserved ||= sample.isEraser;

      if (sample.twist !== null) {
        if (this.firstTwist === null) {
          this.firstTwist = sample.twist;
        } else if (sample.twist !== this.firstTwist) {
          this.twistChanged = true;
        }
      }
      const previous = this.previousContactByPointer.get(sample.pointerId);
      if (previous !== undefined) {
        const timeGap = Math.max(0, sample.timestamp - previous.timestamp);
        const spatialGap = Math.hypot(sample.x - previous.x, sample.y - previous.y);
        this.maximumTimeGapMs =
          this.maximumTimeGapMs === null ? timeGap : Math.max(this.maximumTimeGapMs, timeGap);
        this.maximumSpatialGapPx =
          this.maximumSpatialGapPx === null
            ? spatialGap
            : Math.max(this.maximumSpatialGapPx, spatialGap);
      }

      this.previousContactByPointer.set(sample.pointerId, {
        x: sample.x,
        y: sample.y,
        timestamp: sample.timestamp,
      });
    } else {
      this.previousContactByPointer.delete(sample.pointerId);
    }
  }

  stop(now: number): DiagnosticCaptureSummary | null {
    if (!this.active) {
      return null;
    }

    this.active = false;
    const durationMs = Math.max(0, now - this.startedAt);
    const hasContactSamples = this.contactSamples > 0;
    const pressureRange = hasContactSamples
      ? Object.freeze([this.minPressure, this.maxPressure] as const)
      : null;

    return Object.freeze({
      durationMs,
      pointerTypes: Object.freeze([...this.pointerTypes]),
      browserPointerEvents: this.browserPointerEvents,
      normalizedSamples: this.normalizedSamples,
      coalescedSamples: this.coalescedSamples,
      averageSampleRate:
        durationMs > 0 ? (this.normalizedSamples * 1000) / durationMs : 0,
      averageCoalescedSampleRate:
        durationMs > 0 ? (this.coalescedSamples * 1000) / durationMs : 0,
      maximumTimeGapMs: this.maximumTimeGapMs,
      maximumSpatialGapPx: this.maximumSpatialGapPx,
      pressureRange,
      pressureVariation:
        pressureRange === null ? null : pressureRange[1] - pressureRange[0],
      tiltXRange: hasContactSamples
        ? Object.freeze([this.minTiltX, this.maxTiltX] as const)
        : null,
      tiltYRange: hasContactSamples
        ? Object.freeze([this.minTiltY, this.maxTiltY] as const)
        : null,
      twistChanged: this.twistChanged,
      eraserObserved: this.eraserObserved,
    });
  }
}
