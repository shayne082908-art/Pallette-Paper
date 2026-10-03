import { describe, expect, it } from 'vitest';
import {
  calculateBrushWidth,
  mapPressure,
} from '../src/drawing/pressure';

describe('pressure mapping', () => {
  it('provides distinct linear, soft, and firm responses', () => {
    expect(mapPressure(0.25, 'linear', 'pen')).toBeCloseTo(0.25);
    expect(mapPressure(0.25, 'soft', 'pen')).toBeGreaterThan(0.25);
    expect(mapPressure(0.25, 'firm', 'pen')).toBeLessThan(0.25);
  });

  it('keeps mouse drawing visible when mouse pressure is zero', () => {
    expect(mapPressure(0, 'linear', 'mouse')).toBe(0.5);
    expect(
      calculateBrushWidth(6, 0, 'linear', 'mouse', 'pencil'),
    ).toBeGreaterThan(1);
  });

  it('maps eraser width predictably above the pencil width', () => {
    const pencil = calculateBrushWidth(6, 0.5, 'linear', 'pen', 'pencil');
    const eraser = calculateBrushWidth(6, 0.5, 'linear', 'pen', 'eraser');

    expect(eraser).toBeGreaterThan(pencil);
  });
});
