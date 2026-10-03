import type { StabilizationMode, StrokeSample } from './drawingTypes';

const ALPHA: Record<StabilizationMode, number> = {
  off: 1,
  low: 0.72,
  medium: 0.5,
};

export class StrokeStabilizer {
  private previous: StrokeSample | null = null;

  constructor(private readonly mode: StabilizationMode) {}

  push(sample: StrokeSample): StrokeSample {
    if (this.previous === null || this.mode === 'off') {
      this.previous = sample;
      return sample;
    }

    const alpha = ALPHA[this.mode];
    const stabilized = Object.freeze({
      ...sample,
      x: this.previous.x + (sample.x - this.previous.x) * alpha,
      y: this.previous.y + (sample.y - this.previous.y) * alpha,
    });
    this.previous = stabilized;
    return stabilized;
  }

  finish(sample: StrokeSample): readonly StrokeSample[] {
    if (this.previous === null) {
      this.previous = sample;
      return [sample];
    }

    if (this.mode === 'off') {
      if (samePosition(this.previous, sample)) {
        return [];
      }
      this.previous = sample;
      return [sample];
    }

    const output: StrokeSample[] = [];
    const filtered = this.push(sample);
    output.push(filtered);

    if (!samePosition(filtered, sample)) {
      const endpoint = Object.freeze({ ...sample });
      output.push(endpoint);
      this.previous = endpoint;
    }

    return output;
  }
}

export function stabilizeStroke(
  samples: readonly StrokeSample[],
  mode: StabilizationMode,
): readonly StrokeSample[] {
  if (samples.length === 0 || mode === 'off') {
    return Object.freeze([...samples]);
  }

  const stabilizer = new StrokeStabilizer(mode);
  const output: StrokeSample[] = [];
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    if (sample === undefined) {
      continue;
    }

    const terminal = sample.phase === 'end' || sample.phase === 'cancel';
    if (terminal) {
      output.push(...stabilizer.finish(sample));
    } else {
      output.push(stabilizer.push(sample));
    }
  }
  return Object.freeze(deduplicateConsecutivePositions(output));
}

function deduplicateConsecutivePositions(
  samples: readonly StrokeSample[],
): StrokeSample[] {
  const output: StrokeSample[] = [];
  for (const sample of samples) {
    const previous = output[output.length - 1];
    if (previous === undefined || !samePosition(previous, sample)) {
      output.push(sample);
    }
  }
  return output;
}

function samePosition(
  left: Pick<StrokeSample, 'x' | 'y'>,
  right: Pick<StrokeSample, 'x' | 'y'>,
): boolean {
  return Math.abs(left.x - right.x) < 0.0001 && Math.abs(left.y - right.y) < 0.0001;
}
