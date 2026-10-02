import { describe, expect, it } from 'vitest';
import { BrowserPointerInputSource } from '../src/input/browserPointerInputSource';
import type { BrowserPointerEventLike, PointerSample } from '../src/input/pointerInput';

class FakePointerSurface {
  readonly captured: number[] = [];
  readonly released: number[] = [];
  private readonly listeners = new Map<string, Set<(event: BrowserPointerEventLike) => void>>();

  addEventListener(type: string, listener: (event: BrowserPointerEventLike) => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: BrowserPointerEventLike) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: BrowserPointerEventLike): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  setPointerCapture(pointerId: number): void {
    this.captured.push(pointerId);
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.captured.includes(pointerId) && !this.released.includes(pointerId);
  }

  releasePointerCapture(pointerId: number): void {
    this.released.push(pointerId);
  }

  getBoundingClientRect(): DOMRect {
    return {
      left: 10,
      top: 20,
      right: 410,
      bottom: 320,
      width: 400,
      height: 300,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    };
  }
}

function mouseEvent(
  type: string,
  overrides: Partial<BrowserPointerEventLike> = {},
): BrowserPointerEventLike {
  return {
    type,
    pointerId: 4,
    pointerType: 'mouse',
    clientX: 30,
    clientY: 50,
    timeStamp: 100,
    pressure: type === 'pointerup' ? 0 : 0.5,
    tiltX: 0,
    tiltY: 0,
    button: type === 'pointerdown' ? 0 : -1,
    buttons: type === 'pointerup' ? 0 : 1,
    isPrimary: true,
    ...overrides,
  };
}

describe('BrowserPointerInputSource', () => {
  it('captures a mouse pointer, emits surface-local samples, and releases capture', () => {
    const surface = new FakePointerSurface();
    const source = new BrowserPointerInputSource(surface as unknown as HTMLElement);
    const samples: PointerSample[] = [];
    const activities: string[] = [];

    source.subscribe((sample) => samples.push(sample));
    source.subscribeActivity((activity) => activities.push(activity.type));
    source.start();

    surface.emit('pointerdown', mouseEvent('pointerdown'));
    surface.emit('pointermove', mouseEvent('pointermove', { clientX: 35, clientY: 55 }));
    surface.emit('pointerup', mouseEvent('pointerup', { clientX: 40, clientY: 60 }));

    expect(surface.captured).toEqual([4]);
    expect(surface.released).toEqual([4]);
    expect(activities).toEqual(['pointerdown', 'pointermove', 'pointerup']);
    expect(samples.map((sample) => [sample.x, sample.y])).toEqual([
      [20, 30],
      [25, 35],
      [30, 40],
    ]);
    expect(samples[0]?.deviceType).toBe('mouse');
    expect(samples[0]?.isContact).toBe(true);
    expect(samples[2]?.isContact).toBe(false);

    source.stop();
  });
});
