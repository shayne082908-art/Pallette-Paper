import type { Unsubscribe } from '../core/subscription';

export type PointerDeviceType = 'mouse' | 'pen' | 'touch' | 'unknown';

export interface PointerSample {
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
  readonly deviceType: PointerDeviceType;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly twist: number | null;
  readonly buttons: number;
  readonly isContact: boolean;
}

export interface PointerSampleSource {
  subscribe(consumer: (sample: PointerSample) => void): Unsubscribe;
}

export interface PointerSampleLike {
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
  readonly pointerType?: string;
  readonly pressure?: number;
  readonly tiltX?: number;
  readonly tiltY?: number;
  readonly twist?: number;
  readonly buttons?: number;
  readonly isContact?: boolean;
}

export function normalizePointerSample(source: PointerSampleLike): PointerSample {
  const buttons = source.buttons ?? 0;

  return Object.freeze({
    x: finiteOr(source.x, 0),
    y: finiteOr(source.y, 0),
    timestamp: finiteOr(source.timestamp, 0),
    deviceType: normalizeDeviceType(source.pointerType),
    pressure: clamp(finiteOr(source.pressure ?? 0, 0), 0, 1),
    tiltX: clamp(finiteOr(source.tiltX ?? 0, 0), -90, 90),
    tiltY: clamp(finiteOr(source.tiltY ?? 0, 0), -90, 90),
    twist: source.twist === undefined ? null : clamp(finiteOr(source.twist, 0), 0, 359),
    buttons,
    isContact: source.isContact ?? buttons !== 0,
  });
}

function normalizeDeviceType(pointerType: string | undefined): PointerDeviceType {
  return pointerType === 'mouse' || pointerType === 'pen' || pointerType === 'touch'
    ? pointerType
    : 'unknown';
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
