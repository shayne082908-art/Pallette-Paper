import { describe, expect, it } from 'vitest';
import { StrokeHistory } from '../src/drawing/history';
import type { CompletedStroke } from '../src/drawing/drawingTypes';

function stroke(id: number): CompletedStroke {
  return {
    id,
    pointerId: 1,
    settings: {
      tool: 'pencil',
      processing: 'raw',
      stabilization: 'off',
      pressureCurve: 'linear',
      baseSize: 5,
    },
    samples: [],
    brushSamples: [],
    status: 'ended',
  };
}

describe('StrokeHistory', () => {
  it('undoes and redoes one completed stroke at a time', () => {
    const history = new StrokeHistory();
    history.commit(stroke(1));
    history.commit(stroke(2));

    expect(history.undo()?.id).toBe(2);
    expect(history.strokes().map((item) => item.id)).toEqual([1]);
    expect(history.redo()?.id).toBe(2);
    expect(history.strokes().map((item) => item.id)).toEqual([1, 2]);
  });

  it('invalidates redo after a new stroke is committed', () => {
    const history = new StrokeHistory();
    history.commit(stroke(1));
    history.commit(stroke(2));
    history.undo();
    history.commit(stroke(3));

    expect(history.canRedo()).toBe(false);
    expect(history.strokes().map((item) => item.id)).toEqual([1, 3]);
  });
});
