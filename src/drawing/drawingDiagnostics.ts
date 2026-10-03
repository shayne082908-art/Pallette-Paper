import type { PointerDeviceType } from '../input/pointerInput';
import type { StrokeSample } from './drawingTypes';

const RATE_WINDOW_MS = 1000;

export interface DrawingDiagnosticsSnapshot {
  readonly inputSamplesPerSecond: number;
  readonly processedSamplesPerSecond: number;
  readonly framesPerSecond: number;
  readonly activeStrokeSamples: number;
}

export class DrawingDiagnostics {
  private readonly inputTimes: number[] = [];
  private readonly processedTimes: number[] = [];
  private readonly frameTimes: number[] = [];
  private activeStrokeSamples = 0;

  recordInput(timestamp: number): void {
    this.inputTimes.push(timestamp);
    this.activeStrokeSamples += 1;
  }

  recordProcessed(timestamp: number): void {
    this.processedTimes.push(timestamp);
  }

  recordFrame(timestamp: number): void {
    this.frameTimes.push(timestamp);
  }

  endStroke(): void {
    this.activeStrokeSamples = 0;
  }

  snapshot(now: number): DrawingDiagnosticsSnapshot {
    return Object.freeze({
      inputSamplesPerSecond: this.rate(this.inputTimes, now),
      processedSamplesPerSecond: this.rate(this.processedTimes, now),
      framesPerSecond: this.rate(this.frameTimes, now),
      activeStrokeSamples: this.activeStrokeSamples,
    });
  }

  private rate(timestamps: number[], now: number): number {
    const cutoff = now - RATE_WINDOW_MS;
    while (
      timestamps.length > 0 &&
      timestamps[0] !== undefined &&
      timestamps[0] < cutoff
    ) {
      timestamps.shift();
    }
    return timestamps.length;
  }
}

export interface DrawingMeasurementSummary {
  readonly durationMs: number;
  readonly pointerTypes: readonly PointerDeviceType[];
  readonly inputSamples: number;
  readonly processedSamples: number;
  readonly averageInputSamplesPerSecond: number;
  readonly averageProcessedSamplesPerSecond: number;
  readonly largestInputGapMs: number | null;
  readonly pressureRange: readonly [number, number] | null;
}

export class DrawingMeasurementRecorder {
  private active = false;
  private startedAt = 0;
  private inputSamples = 0;
  private processedSamples = 0;
  private pointerTypes = new Set<PointerDeviceType>();
  private previousContactTimeByPointer = new Map<number, number>();
  private largestInputGapMs: number | null = null;
  private minPressure = Number.POSITIVE_INFINITY;
  private maxPressure = Number.NEGATIVE_INFINITY;
  private contactSamples = 0;

  start(now: number): void {
    this.active = true;
    this.startedAt = now;
    this.inputSamples = 0;
    this.processedSamples = 0;
    this.pointerTypes = new Set<PointerDeviceType>();
    this.previousContactTimeByPointer.clear();
    this.largestInputGapMs = null;
    this.minPressure = Number.POSITIVE_INFINITY;
    this.maxPressure = Number.NEGATIVE_INFINITY;
    this.contactSamples = 0;
  }

  recordInput(sample: StrokeSample): void {
    if (!this.active) {
      return;
    }

    this.inputSamples += 1;
    this.pointerTypes.add(sample.pointerType);

    if (!sample.isContact && sample.phase !== 'end' && sample.phase !== 'cancel') {
      return;
    }

    if (sample.phase === 'end' || sample.phase === 'cancel') {
      this.previousContactTimeByPointer.delete(sample.pointerId);
      return;
    }

    this.contactSamples += 1;
    this.minPressure = Math.min(this.minPressure, sample.pressure);
    this.maxPressure = Math.max(this.maxPressure, sample.pressure);

    const previous = this.previousContactTimeByPointer.get(sample.pointerId);
    if (previous !== undefined) {
      const gap = Math.max(0, sample.timestamp - previous);
      this.largestInputGapMs =
        this.largestInputGapMs === null
          ? gap
          : Math.max(this.largestInputGapMs, gap);
    }
    this.previousContactTimeByPointer.set(sample.pointerId, sample.timestamp);
  }

  recordProcessed(count: number): void {
    if (!this.active) {
      return;
    }
    this.processedSamples += count;
  }

  stop(now: number): DrawingMeasurementSummary | null {
    if (!this.active) {
      return null;
    }

    this.active = false;
    const durationMs = Math.max(0, now - this.startedAt);
    const pressureRange =
      this.contactSamples > 0
        ? Object.freeze([this.minPressure, this.maxPressure] as const)
        : null;

    return Object.freeze({
      durationMs,
      pointerTypes: Object.freeze([...this.pointerTypes]),
      inputSamples: this.inputSamples,
      processedSamples: this.processedSamples,
      averageInputSamplesPerSecond:
        durationMs > 0 ? (this.inputSamples * 1000) / durationMs : 0,
      averageProcessedSamplesPerSecond:
        durationMs > 0 ? (this.processedSamples * 1000) / durationMs : 0,
      largestInputGapMs: this.largestInputGapMs,
      pressureRange,
    });
  }

  isActive(): boolean {
    return this.active;
  }
}
