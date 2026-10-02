import { describe, expect, it } from 'vitest';
import { normalizePointerSample } from '../src/input/pointerInput';

describe('normalizePointerSample', () => {
  it('normalizes generalized pointer data without React state', () => {
    const sample = normalizePointerSample({
      x: 12.5,
      y: 8.25,
      timestamp: 1234,
      pointerType: 'pen',
      pressure: 1.5,
      tiltX: -120,
      tiltY: 45,
      twist: 400,
      buttons: 1,
    });

    expect(sample).toEqual({
      x: 12.5,
      y: 8.25,
      timestamp: 1234,
      deviceType: 'pen',
      pressure: 1,
      tiltX: -90,
      tiltY: 45,
      twist: 359,
      buttons: 1,
      isContact: true,
    });
  });

  it('uses explicit contact state and identifies unknown devices', () => {
    const sample = normalizePointerSample({
      x: 0,
      y: 0,
      timestamp: 0,
      pointerType: 'eraser',
      buttons: 0,
      isContact: true,
    });

    expect(sample.deviceType).toBe('unknown');
    expect(sample.isContact).toBe(true);
    expect(sample.twist).toBeNull();
  });
});
