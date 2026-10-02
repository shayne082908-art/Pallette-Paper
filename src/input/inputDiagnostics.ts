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
  readonly pressureRange: readonly [number, number] | null;
  readonly tiltXRange: readonly [number, number] | null;
  readonly tiltYRange: readonly [number, number] | null;
  readonly twistChanged: boolean;
  readonly eraserObserved: boolean;
}

export class InputCaptureRecorder {
  private active = false;
  private startedAt = 0;
  private browserPointerEvents = 0;
  private normalizedSamples = 0;
  private coalescedSamples = 0;
  private pointerTypes = new Set<PointerDeviceType>();
  private minPressure = Number.POSITIVE_INFINITY;
  private maxPressure = Number.NEGATIVE_INFINITY;
  private minTiltX = Number.POSITIVE_INFINITY;
  private maxTiltX = Number.NEGATIVE_INFINITY;
  private minTiltY = Number.POSITIVE_INFINITY;
  private maxTiltY = Number.NEGATIVE_INFINITY;
  private firstTwist: number | null = null;
  private twistChanged = false;
  private eraserObserved = false;

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
    this.minPressure = Number.POSITIVE_INFINITY;
    this.maxPressure = Number.NEGATIVE_INFINITY;
    this.minTiltX = Number.POSITIVE_INFINITY;
    this.maxTiltX = Number.NEGATIVE_INFINITY;
    this.minTiltY = Number.POSITIVE_INFINITY;
    this.maxTiltY = Number.NEGATIVE_INFINITY;
    this.firstTwist = null;
    this.twistChanged = false;
    this.eraserObserved = false;
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
  }

  stop(now: number): DiagnosticCaptureSummary | null {
    if (!this.active) {
      return null;
    }

    this.active = false;
    const durationMs = Math.max(0, now - this.startedAt);
    const hasSamples = this.normalizedSamples > 0;

    return Object.freeze({
      durationMs,
      pointerTypes: Object.freeze([...this.pointerTypes]),
      browserPointerEvents: this.browserPointerEvents,
      normalizedSamples: this.normalizedSamples,
      coalescedSamples: this.coalescedSamples,
      averageSampleRate:
        durationMs > 0 ? (this.normalizedSamples * 1000) / durationMs : 0,
      pressureRange: hasSamples
        ? Object.freeze([this.minPressure, this.maxPressure] as const)
        : null,
      tiltXRange: hasSamples
        ? Object.freeze([this.minTiltX, this.maxTiltX] as const)
        : null,
      tiltYRange: hasSamples
        ? Object.freeze([this.minTiltY, this.maxTiltY] as const)
        : null,
      twistChanged: this.twistChanged,
      eraserObserved: this.eraserObserved,
    });
  }
}
