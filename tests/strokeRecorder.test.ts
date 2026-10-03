import { describe, expect, it } from 'vitest';
import { StrokeRecorder } from '../src/drawing/strokeRecorder';
import type { StrokeSample, StrokeSettings } from '../src/drawing/drawingTypes';

const settings: StrokeSettings = {
  tool: 'pencil',
  processing: 'processed',
  stabilization: 'low',
  pressureCurve: 'linear',
  baseSize: 6,
};

function sample(
  x: number,
  timestamp: number,
  overrides: Partial<Omit<StrokeSample, 'phase'>> = {},
): Omit<StrokeSample, 'phase'> {
  return {
    pointerId: 1,
    x,
    y: 5,
    timestamp,
    pressure: 0.5,
    tiltX: 0,
    tiltY: 0,
    pointerType: 'pen',
    isContact: true,
    ...overrides,
  };
}

describe('StrokeRecorder', () => {
  it('records explicit begin, continuation, and end phases', () => {
    const recorder = new StrokeRecorder();

    recorder.begin(12, 1, sample(0, 10), settings);
    recorder.append(sample(5, 20));
    const stroke = recorder.finish(
      sample(10, 30, { isContact: false }),
      'ended',
    );

    expect(stroke?.id).toBe(12);
    expect(stroke?.status).toBe('ended');
    expect(stroke?.samples.map((point) => point.phase)).toEqual([
      'begin',
      'continue',
      'end',
    ]);
    expect(stroke?.samples.at(-1)?.x).toBe(10);
    expect(recorder.isActive()).toBe(false);
  });

  it('records cancellation separately from a normal end', () => {
    const recorder = new StrokeRecorder();

    recorder.begin(2, 1, sample(0, 10), settings);
    const stroke = recorder.finish(
      sample(3, 15, { isContact: false }),
      'cancelled',
    );

    expect(stroke?.status).toBe('cancelled');
    expect(stroke?.samples.at(-1)?.phase).toBe('cancel');
  });
});
