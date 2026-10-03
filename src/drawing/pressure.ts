import type {
  BrushSample,
  DrawingTool,
  PressureCurve,
  StrokeSample,
} from './drawingTypes';

export function mapPressure(
  pressure: number,
  curve: PressureCurve,
  pointerType: StrokeSample['pointerType'],
): number {
  const normalized =
    pointerType === 'mouse' && pressure <= 0 ? 0.5 : clamp(pressure, 0, 1);

  switch (curve) {
    case 'soft':
      return Math.sqrt(normalized);
    case 'firm':
      return normalized ** 1.65;
    case 'linear':
      return normalized;
  }
}

export function calculateBrushWidth(
  baseSize: number,
  pressure: number,
  curve: PressureCurve,
  pointerType: StrokeSample['pointerType'],
  tool: DrawingTool,
): number {
  const mapped = mapPressure(pressure, curve, pointerType);
  if (tool === 'eraser') {
    const eraserBase = Math.max(8, baseSize * 3.5);
    return eraserBase * (0.65 + mapped * 0.35);
  }

  const safeBase = clamp(baseSize, 0.5, 48);
  return safeBase * (0.22 + mapped * 0.78);
}

export function toBrushSample(
  sample: StrokeSample,
  baseSize: number,
  curve: PressureCurve,
  tool: DrawingTool,
): BrushSample {
  return Object.freeze({
    x: sample.x,
    y: sample.y,
    timestamp: sample.timestamp,
    pressure: sample.pressure,
    width: calculateBrushWidth(
      baseSize,
      sample.pressure,
      curve,
      sample.pointerType,
      tool,
    ),
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
