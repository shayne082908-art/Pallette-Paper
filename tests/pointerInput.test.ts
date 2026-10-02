import { describe, expect, it } from 'vitest';
import {
  detectStylusEraser,
  normalizePointerSample,
  unpackPointerEventSamples,
  type BrowserPointerEventLike,
} from '../src/input/pointerInput';

function pointerEvent(
  overrides: Partial<BrowserPointerEventLike> = {},
): BrowserPointerEventLike {
  return {
    type: 'pointermove',
    pointerId: 7,
    pointerType: 'pen',
    clientX: 110,
    clientY: 70,
    timeStamp: 100,
    pressure: 0.4,
    tangentialPressure: 0.2,
    tiltX: 10,
    tiltY: -20,
    twist: 30,
    width: 4,
    height: 5,
    altitudeAngle: 0.8,
    azimuthAngle: 1.2,
    button: -1,
    buttons: 1,
    isPrimary: true,
    ...overrides,
  };
}

describe('normalizePointerSample', () => {
  it('normalizes rich pointer data and clamps bounded values', () => {
    const sample = normalizePointerSample({
      pointerId: 3,
      x: 12.5,
      y: 8.25,
      timestamp: 1234,
      pointerType: 'pen',
      pressure: 1.5,
      tangentialPressure: -2,
      tiltX: -120,
      tiltY: 95,
      twist: 400,
      width: -2,
      height: 3,
      altitudeAngle: 2,
      azimuthAngle: 9,
      button: 5,
      buttons: 32,
      isPrimary: true,
    });

    expect(sample).toEqual({
      pointerId: 3,
      x: 12.5,
      y: 8.25,
      timestamp: 1234,
      deviceType: 'pen',
      pressure: 1,
      tangentialPressure: -1,
      tiltX: -90,
      tiltY: 90,
      twist: 359,
      width: 0,
      height: 3,
      altitudeAngle: Math.PI / 2,
      azimuthAngle: Math.PI * 2,
      button: 5,
      buttons: 32,
      isPrimary: true,
      isContact: true,
      isEraser: true,
      origin: 'primary',
    });
  });

  it('degrades unsupported optional fields safely and normalizes device type', () => {
    const sample = normalizePointerSample({
      x: 0,
      y: 0,
      timestamp: 0,
      pointerType: 'eraser',
      buttons: 0,
      isContact: false,
    });

    expect(sample.deviceType).toBe('unknown');
    expect(sample.tangentialPressure).toBeNull();
    expect(sample.twist).toBeNull();
    expect(sample.width).toBeNull();
    expect(sample.height).toBeNull();
    expect(sample.altitudeAngle).toBeNull();
    expect(sample.azimuthAngle).toBeNull();
    expect(sample.isContact).toBe(false);
  });
});

describe('eraser detection', () => {
  it('detects the standardized pen eraser button conservatively', () => {
    expect(detectStylusEraser('pen', 5, 0)).toBe(true);
    expect(detectStylusEraser('pen', -1, 32)).toBe(true);
    expect(detectStylusEraser('pen', 0, 1)).toBe(false);
    expect(detectStylusEraser('mouse', 5, 32)).toBe(false);
  });
});

describe('unpackPointerEventSamples', () => {
  it('emits coalesced samples individually and preserves their ordering', () => {
    const first = pointerEvent({ clientX: 101, timeStamp: 91, pressure: 0.2 });
    const second = pointerEvent({ clientX: 105, timeStamp: 95, pressure: 0.3 });
    const parent = pointerEvent({
      clientX: 110,
      timeStamp: 100,
      getCoalescedEvents: () => [first, second],
    });

    const batch = unpackPointerEventSamples(parent, { left: 100, top: 50 });

    expect(batch.usedCoalescedEvents).toBe(true);
    expect(batch.coalescedSampleCount).toBe(2);
    expect(batch.samples.map((sample) => sample.x)).toEqual([1, 5]);
    expect(batch.samples.map((sample) => sample.timestamp)).toEqual([91, 95]);
    expect(batch.samples.every((sample) => sample.origin === 'coalesced')).toBe(true);
  });

  it('falls back to the parent event and forces terminal contact off', () => {
    const event = pointerEvent({
      type: 'pointerup',
      clientX: 120,
      clientY: 90,
      buttons: 0,
      pressure: 0,
    });

    const batch = unpackPointerEventSamples(event, { left: 100, top: 50 }, false);

    expect(batch.usedCoalescedEvents).toBe(false);
    expect(batch.coalescedSampleCount).toBe(0);
    expect(batch.samples).toHaveLength(1);
    expect(batch.samples[0]?.x).toBe(20);
    expect(batch.samples[0]?.y).toBe(40);
    expect(batch.samples[0]?.isContact).toBe(false);
  });
});
