import type { PointerDeviceType } from '../input/pointerInput';

export const DRAWING_WIDTH = 1600;
export const DRAWING_HEIGHT = 1200;

export type DrawingTool = 'pencil' | 'eraser';
export type ProcessingMode = 'raw' | 'processed';
export type StabilizationMode = 'off' | 'low' | 'medium';
export type PressureCurve = 'linear' | 'soft' | 'firm';
export type StrokePhase = 'begin' | 'continue' | 'end' | 'cancel';
export type StrokeStatus = 'ended' | 'cancelled';

export interface StrokeSettings {
  readonly tool: DrawingTool;
  readonly processing: ProcessingMode;
  readonly stabilization: StabilizationMode;
  readonly pressureCurve: PressureCurve;
  readonly baseSize: number;
}

export interface StrokeSample {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly pointerType: PointerDeviceType;
  readonly isContact: boolean;
  readonly phase: StrokePhase;
}

export interface BrushSample {
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
  readonly pressure: number;
  readonly width: number;
}

export interface RecordedStroke {
  readonly id: number;
  readonly pointerId: number;
  readonly settings: StrokeSettings;
  readonly samples: readonly StrokeSample[];
  readonly status: StrokeStatus;
}

export interface CompletedStroke extends RecordedStroke {
  readonly brushSamples: readonly BrushSample[];
}

export interface ViewTransform {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}
