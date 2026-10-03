import { describe, expect, it } from 'vitest';
import { stabilizeStroke } from '../src/drawing/stabilization';
import type { StrokeSample } from '../src/drawing/drawingTypes';

function point(
  x: number,
  y: number,
  phase: StrokeSample['phase'],
): StrokeSample {
  return {
    pointerId: 1,
    x,
    y,
    timestamp: x + y,
    pressure: 0.5,
    tiltX: 0,
    tiltY: 0,
    pointerType: 'pen',
    isContact: phase !== 'end',
    phase,
  };
}

describe('stabilizeStroke', () => {
  it('leaves off-mode coordinates unchanged', () => {
    const input = [
      point(0, 0, 'begin'),
      point(5, 2, 'continue'),
      point(10, 0, 'end'),
    ];

    expect(stabilizeStroke(input, 'off')).toEqual(input);
  });

  it('keeps the first mark immediate and preserves the final endpoint', () => {
    const output = stabilizeStroke([
      point(0, 0, 'begin'),
      point(5, 4, 'continue'),
      point(10, 0, 'end'),
    ], 'medium');

    expect(output[0]).toMatchObject({ x: 0, y: 0 });
    expect(output.at(-1)).toMatchObject({ x: 10, y: 0 });
    expect(output[1]?.y).toBeGreaterThan(0);
    expect(output[1]?.y).toBeLessThan(4);
  });
});
