import { describe, expect, it } from 'vitest';
import {
  calculateBackingSize,
  canvasToScreen,
  fitView,
  screenToCanvas,
  zoomViewAt,
} from '../src/drawing/viewTransform';

describe('drawing coordinate transforms', () => {
  it('round-trips canvas and screen coordinates', () => {
    const view = { zoom: 0.75, panX: 40, panY: 25 };
    const canvasPoint = { x: 320, y: 180 };
    const screenPoint = canvasToScreen(canvasPoint, view);

    expect(screenToCanvas(screenPoint, view)).toEqual(canvasPoint);
  });

  it('keeps the zoom anchor fixed in screen space', () => {
    const view = { zoom: 1, panX: 10, panY: 20 };
    const anchor = { x: 200, y: 150 };
    const before = screenToCanvas(anchor, view);
    const zoomed = zoomViewAt(view, anchor, 2);
    const after = screenToCanvas(anchor, zoomed);

    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('fits a finite canvas into the viewport without exceeding 100% by default', () => {
    const view = fitView(1000, 800, 1600, 1200);

    expect(view.zoom).toBeLessThanOrEqual(1);
    expect(view.panX).toBeGreaterThanOrEqual(0);
    expect(view.panY).toBeGreaterThanOrEqual(0);
  });

  it('calculates high-DPI backing dimensions separately from CSS size', () => {
    expect(calculateBackingSize(1600, 1200, 2)).toEqual({
      width: 3200,
      height: 2400,
      dpr: 2,
    });
  });
});
