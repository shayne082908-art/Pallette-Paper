import type { ViewTransform } from './drawingTypes';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface BackingSize {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

export function fitView(
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding = 32,
): ViewTransform {
  const usableWidth = Math.max(1, viewportWidth - padding * 2);
  const usableHeight = Math.max(1, viewportHeight - padding * 2);
  const zoom = clamp(
    Math.min(usableWidth / canvasWidth, usableHeight / canvasHeight, 1),
    MIN_ZOOM,
    MAX_ZOOM,
  );

  return Object.freeze({
    zoom,
    panX: (viewportWidth - canvasWidth * zoom) / 2,
    panY: (viewportHeight - canvasHeight * zoom) / 2,
  });
}

export function screenToCanvas(point: Point, view: ViewTransform): Point {
  return Object.freeze({
    x: (point.x - view.panX) / view.zoom,
    y: (point.y - view.panY) / view.zoom,
  });
}

export function canvasToScreen(point: Point, view: ViewTransform): Point {
  return Object.freeze({
    x: point.x * view.zoom + view.panX,
    y: point.y * view.zoom + view.panY,
  });
}

export function panView(
  view: ViewTransform,
  deltaX: number,
  deltaY: number,
): ViewTransform {
  return Object.freeze({
    ...view,
    panX: view.panX + deltaX,
    panY: view.panY + deltaY,
  });
}

export function zoomViewAt(
  view: ViewTransform,
  screenPoint: Point,
  zoomFactor: number,
): ViewTransform {
  const canvasPoint = screenToCanvas(screenPoint, view);
  const zoom = clamp(view.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);

  return Object.freeze({
    zoom,
    panX: screenPoint.x - canvasPoint.x * zoom,
    panY: screenPoint.y - canvasPoint.y * zoom,
  });
}

export function isPointInsideCanvas(
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= canvasWidth &&
    point.y <= canvasHeight
  );
}

export function calculateBackingSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): BackingSize {
  const dpr = Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1);
  return Object.freeze({
    width: Math.max(1, Math.round(cssWidth * dpr)),
    height: Math.max(1, Math.round(cssHeight * dpr)),
    dpr,
  });
}

export function zoomBounds(): readonly [number, number] {
  return [MIN_ZOOM, MAX_ZOOM];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
