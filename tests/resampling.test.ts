import { describe, expect, it } from 'vitest';
import {
  isSharpDirectionChange,
  resampleStroke,
} from '../src/drawing/resampling';
import type { StrokeSample } from '../src/drawing/drawingTypes';

function point(
  x: number,
  y: number,
  timestamp: number,
  phase: StrokeSample['phase'] = 'continue',
): StrokeSample {
  return {
    pointerId: 1,
    x,
    y,
    timestamp,
    pressure: 0.5,
    tiltX: 0,
    tiltY: 0,
    pointerType: 'pen',
    isContact: phase !== 'end' && phase !== 'cancel',
    phase,
  };
}

describe('resampleStroke', () => {
  it('preserves beginning and ending points while filling fast gaps', () => {
    const output = resampleStroke([
      point(0, 0, 0, 'begin'),
      point(30, 0, 30, 'end'),
    ], 5);

    expect(output[0]?.x).toBe(0);
    expect(output.at(-1)?.x).toBe(30);
    expect(output.length).toBeGreaterThan(2);

    const distances = output.slice(1).map((sample, index) => {
      const previous = output[index];
      return previous === undefined
        ? 0
        : Math.hypot(sample.x - previous.x, sample.y - previous.y);
    });
    expect(Math.max(...distances)).toBeLessThanOrEqual(5.001);
  });

  it('preserves a sharp raw direction change as an exact sample', () => {
    const corner = point(10, 0, 10);
    const output = resampleStroke([
      point(0, 0, 0, 'begin'),
      corner,
      point(10, 10, 20),
      point(10, 20, 30, 'end'),
    ], 6);

    expect(isSharpDirectionChange(point(0, 0, 0), corner, point(10, 10, 20))).toBe(true);
    expect(output.some((sample) => sample.x === 10 && sample.y === 0)).toBe(true);
    expect(output.at(-1)).toMatchObject({ x: 10, y: 20 });
  });

  it('keeps output bounded for extremely long paths', () => {
    const output = resampleStroke([
      point(0, 0, 0, 'begin'),
      point(10000, 0, 1000, 'end'),
    ], 1, 100);

    expect(output.length).toBeLessThanOrEqual(100);
    expect(output.at(-1)?.x).toBe(10000);
  });
});
