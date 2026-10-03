import type { StrokeSample } from './drawingTypes';

const DEFAULT_MAX_SAMPLES = 8192;
const EPSILON = 0.0001;
const CORNER_THRESHOLD_DEGREES = 55;

export class SpatialResampler {
  private previousInput: StrokeSample | null = null;
  private inputBeforePrevious: StrokeSample | null = null;
  private lastEmitted: StrokeSample | null = null;
  private distanceSinceOutput = 0;
  private emittedCount = 0;

  constructor(
    private readonly spacing: number,
    private readonly maxSamples = DEFAULT_MAX_SAMPLES,
  ) {
    if (!(spacing > 0)) {
      throw new Error('Resampling spacing must be greater than zero.');
    }
    if (maxSamples < 2) {
      throw new Error('Resampling maxSamples must allow at least two points.');
    }
  }

  start(sample: StrokeSample): readonly StrokeSample[] {
    this.previousInput = sample;
    this.inputBeforePrevious = null;
    this.lastEmitted = sample;
    this.distanceSinceOutput = 0;
    this.emittedCount = 1;
    return [sample];
  }

  push(sample: StrokeSample): readonly StrokeSample[] {
    if (this.previousInput === null) {
      return this.start(sample);
    }

    const output: StrokeSample[] = [];
    const previous = this.previousInput;

    if (
      this.inputBeforePrevious !== null &&
      isSharpDirectionChange(this.inputBeforePrevious, previous, sample) &&
      !samePosition(this.lastEmitted, previous) &&
      this.canEmitAnother()
    ) {
      const corner = asContinuation(previous);
      output.push(corner);
      this.lastEmitted = corner;
      this.distanceSinceOutput = 0;
      this.emittedCount += 1;
    }

    const dx = sample.x - previous.x;
    const dy = sample.y - previous.y;
    const length = Math.hypot(dx, dy);

    if (length > EPSILON) {
      let travelled = 0;
      while (
        this.distanceSinceOutput + (length - travelled) >= this.spacing &&
        this.canEmitAnother()
      ) {
        const needed = this.spacing - this.distanceSinceOutput;
        travelled += needed;
        const t = Math.min(1, travelled / length);
        const point = interpolateSample(previous, sample, t);
        output.push(point);
        this.lastEmitted = point;
        this.distanceSinceOutput = 0;
        this.emittedCount += 1;
      }
      this.distanceSinceOutput += Math.max(0, length - travelled);
    }

    this.inputBeforePrevious = previous;
    this.previousInput = sample;
    return output;
  }

  finish(sample: StrokeSample): readonly StrokeSample[] {
    const output = [...this.push(sample)];
    if (!samePosition(this.lastEmitted, sample)) {
      const endpoint = { ...sample, phase: sample.phase } satisfies StrokeSample;
      if (this.emittedCount >= this.maxSamples) {
        if (output.length > 0) {
          output[output.length - 1] = endpoint;
        } else {
          output.push(endpoint);
        }
      } else {
        output.push(endpoint);
        this.emittedCount += 1;
      }
      this.lastEmitted = endpoint;
      this.distanceSinceOutput = 0;
    }
    return output;
  }

  emittedSamples(): number {
    return this.emittedCount;
  }

  private canEmitAnother(): boolean {
    return this.emittedCount < this.maxSamples - 1;
  }
}

export function resampleStroke(
  samples: readonly StrokeSample[],
  spacing: number,
  maxSamples = DEFAULT_MAX_SAMPLES,
): readonly StrokeSample[] {
  if (samples.length === 0) {
    return [];
  }

  const first = samples[0];
  if (first === undefined) {
    return [];
  }

  const resampler = new SpatialResampler(spacing, maxSamples);
  const output: StrokeSample[] = [...resampler.start(first)];

  for (let index = 1; index < samples.length; index += 1) {
    const sample = samples[index];
    if (sample === undefined) {
      continue;
    }

    const terminal = sample.phase === 'end' || sample.phase === 'cancel';
    output.push(...(terminal ? resampler.finish(sample) : resampler.push(sample)));
  }

  const last = samples[samples.length - 1];
  if (
    last !== undefined &&
    last.phase !== 'end' &&
    last.phase !== 'cancel' &&
    !samePosition(output[output.length - 1] ?? null, last)
  ) {
    output.push(last);
  }

  return Object.freeze(output);
}

export function isSharpDirectionChange(
  before: Pick<StrokeSample, 'x' | 'y'>,
  point: Pick<StrokeSample, 'x' | 'y'>,
  after: Pick<StrokeSample, 'x' | 'y'>,
): boolean {
  const firstX = point.x - before.x;
  const firstY = point.y - before.y;
  const secondX = after.x - point.x;
  const secondY = after.y - point.y;
  const firstLength = Math.hypot(firstX, firstY);
  const secondLength = Math.hypot(secondX, secondY);

  if (firstLength <= EPSILON || secondLength <= EPSILON) {
    return false;
  }

  const dot = firstX * secondX + firstY * secondY;
  const cosine = Math.max(-1, Math.min(1, dot / (firstLength * secondLength)));
  const turnDegrees = (Math.acos(cosine) * 180) / Math.PI;
  return turnDegrees >= CORNER_THRESHOLD_DEGREES;
}

function interpolateSample(
  start: StrokeSample,
  end: StrokeSample,
  t: number,
): StrokeSample {
  return Object.freeze({
    pointerId: end.pointerId,
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    timestamp: lerp(start.timestamp, end.timestamp, t),
    pressure: lerp(start.pressure, end.pressure, t),
    tiltX: lerp(start.tiltX, end.tiltX, t),
    tiltY: lerp(start.tiltY, end.tiltY, t),
    pointerType: end.pointerType,
    isContact: start.isContact || end.isContact,
    phase: 'continue',
  });
}

function asContinuation(sample: StrokeSample): StrokeSample {
  return Object.freeze({ ...sample, phase: 'continue' });
}

function samePosition(
  left: Pick<StrokeSample, 'x' | 'y'> | null,
  right: Pick<StrokeSample, 'x' | 'y'>,
): boolean {
  return (
    left !== null &&
    Math.abs(left.x - right.x) <= EPSILON &&
    Math.abs(left.y - right.y) <= EPSILON
  );
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
