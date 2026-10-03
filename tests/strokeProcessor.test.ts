import { describe, expect, it } from 'vitest';
import { processRecordedStroke } from '../src/drawing/strokeProcessor';
import type { RecordedStroke, StrokeSample } from '../src/drawing/drawingTypes';

function sample(
  x: number,
  y: number,
  timestamp: number,
  phase: StrokeSample['phase'],
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
    isContact: phase !== 'end',
    phase,
  };
}

function stroke(
  samples: readonly StrokeSample[],
  processing: RecordedStroke['settings']['processing'] = 'processed',
): RecordedStroke {
  return {
    id: 1,
    pointerId: 1,
    settings: {
      tool: 'pencil',
      processing,
      stabilization: processing === 'raw' ? 'off' : 'low',
      pressureCurve: 'linear',
      baseSize: 6,
    },
    samples,
    status: 'ended',
  };
}

describe('processRecordedStroke', () => {
  it('renders a dot without requiring movement', () => {
    const output = processRecordedStroke(stroke([
      sample(10, 10, 0, 'begin'),
      sample(10, 10, 1, 'end'),
    ]));

    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({ x: 10, y: 10 });
  });

  it('preserves the final endpoint in processed mode', () => {
    const output = processRecordedStroke(stroke([
      sample(0, 0, 0, 'begin'),
      sample(20, 5, 10, 'continue'),
      sample(40, 0, 20, 'end'),
    ]));

    expect(output[0]).toMatchObject({ x: 0, y: 0 });
    expect(output.at(-1)).toMatchObject({ x: 40, y: 0 });
  });

  it('keeps raw mode close to normalized browser samples', () => {
    const output = processRecordedStroke(stroke([
      sample(0, 0, 0, 'begin'),
      sample(8, 3, 5, 'continue'),
      sample(16, 6, 10, 'end'),
    ], 'raw'));

    expect(output.map((point) => [point.x, point.y])).toEqual([
      [0, 0],
      [8, 3],
      [16, 6],
    ]);
  });
});
