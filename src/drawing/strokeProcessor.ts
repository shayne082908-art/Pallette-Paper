import type {
  BrushSample,
  ProcessingMode,
  RecordedStroke,
  StrokeSample,
  StrokeSettings,
} from './drawingTypes';
import { toBrushSample } from './pressure';
import { SpatialResampler } from './resampling';
import { StrokeStabilizer } from './stabilization';

export class StrokeProcessor {
  private readonly resampler: SpatialResampler | null;
  private readonly stabilizer: StrokeStabilizer | null;
  private lastRaw: StrokeSample | null = null;
  private brushCount = 0;

  constructor(private readonly settings: StrokeSettings) {
    const processed = settings.processing === 'processed';
    this.resampler = processed
      ? new SpatialResampler(resamplingSpacing(settings.baseSize))
      : null;
    this.stabilizer = processed
      ? new StrokeStabilizer(settings.stabilization)
      : null;
  }

  start(sample: StrokeSample): readonly BrushSample[] {
    this.lastRaw = sample;
    const points =
      this.resampler === null ? [sample] : this.resampler.start(sample);
    return this.toBrush(points);
  }

  push(sample: StrokeSample): readonly BrushSample[] {
    if (this.lastRaw === null) {
      return this.start(sample);
    }

    if (sameEndpoint(this.lastRaw, sample)) {
      this.lastRaw = sample;
      return [];
    }

    this.lastRaw = sample;
    const points =
      this.resampler === null ? [sample] : this.resampler.push(sample);
    return this.toBrush(points);
  }

  finish(sample: StrokeSample): readonly BrushSample[] {
    if (this.lastRaw === null) {
      return this.start(sample);
    }

    if (samePosition(this.lastRaw, sample)) {
      this.lastRaw = sample;
      return [];
    }

    if (this.resampler === null || this.stabilizer === null) {
      this.lastRaw = sample;
      return this.toBrush([sample]);
    }

    this.lastRaw = sample;
    const resampled = this.resampler.finish(sample);
    const stabilized: StrokeSample[] = [];
    let endpointWasFinished = false;

    for (let index = 0; index < resampled.length; index += 1) {
      const point = resampled[index];
      if (point === undefined) {
        continue;
      }

      const isFinalResampled =
        index === resampled.length - 1 && samePosition(point, sample);
      if (isFinalResampled) {
        stabilized.push(...this.stabilizer.finish(point));
        endpointWasFinished = true;
      } else {
        stabilized.push(this.stabilizer.push(point));
      }
    }

    if (!endpointWasFinished) {
      stabilized.push(...this.stabilizer.finish(sample));
    }

    return this.brushFromStabilized(stabilized);
  }

  processedBrushSamples(): number {
    return this.brushCount;
  }

  private toBrush(samples: readonly StrokeSample[]): readonly BrushSample[] {
    if (this.stabilizer === null) {
      return this.brushFromStabilized(samples);
    }

    return this.brushFromStabilized(
      samples.map((sample) => this.stabilizer?.push(sample) ?? sample),
    );
  }

  private brushFromStabilized(
    samples: readonly StrokeSample[],
  ): readonly BrushSample[] {
    const output = samples.map((sample) =>
      toBrushSample(
        sample,
        this.settings.baseSize,
        this.settings.pressureCurve,
        this.settings.tool,
      ),
    );
    this.brushCount += output.length;
    return Object.freeze(output);
  }
}

export function processRecordedStroke(
  stroke: RecordedStroke,
): readonly BrushSample[] {
  const first = stroke.samples[0];
  if (first === undefined) {
    return [];
  }

  const processor = new StrokeProcessor(stroke.settings);
  const output: BrushSample[] = [...processor.start(first)];

  for (let index = 1; index < stroke.samples.length; index += 1) {
    const sample = stroke.samples[index];
    if (sample === undefined) {
      continue;
    }

    const terminal = sample.phase === 'end' || sample.phase === 'cancel';
    output.push(...(terminal ? processor.finish(sample) : processor.push(sample)));
  }

  return Object.freeze(deduplicateBrushSamples(output));
}

export function resamplingSpacing(baseSize: number): number {
  return Math.max(1.25, Math.min(3.5, baseSize * 0.35));
}

function deduplicateBrushSamples(samples: readonly BrushSample[]): BrushSample[] {
  const output: BrushSample[] = [];
  for (const sample of samples) {
    const previous = output[output.length - 1];
    if (
      previous === undefined ||
      Math.abs(previous.x - sample.x) > 0.0001 ||
      Math.abs(previous.y - sample.y) > 0.0001
    ) {
      output.push(sample);
    }
  }
  return output;
}

function sameEndpoint(left: StrokeSample, right: StrokeSample): boolean {
  return (
    left.timestamp === right.timestamp &&
    samePosition(left, right)
  );
}

function samePosition(
  left: Pick<StrokeSample, 'x' | 'y'>,
  right: Pick<StrokeSample, 'x' | 'y'>,
): boolean {
  return (
    Math.abs(left.x - right.x) < 0.0001 &&
    Math.abs(left.y - right.y) < 0.0001
  );
}
