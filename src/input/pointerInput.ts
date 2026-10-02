import type { Unsubscribe } from '../core/subscription';

export type PointerDeviceType = 'mouse' | 'pen' | 'touch' | 'unknown';
export type PointerSampleOrigin = 'primary' | 'coalesced';

export interface PointerSample {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
  readonly deviceType: PointerDeviceType;
  readonly pressure: number;
  readonly tangentialPressure: number | null;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly twist: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly altitudeAngle: number | null;
  readonly azimuthAngle: number | null;
  readonly button: number;
  readonly buttons: number;
  readonly isPrimary: boolean;
  readonly isContact: boolean;
  readonly isEraser: boolean;
  readonly origin: PointerSampleOrigin;
}

export interface PointerSampleSource {
  subscribe(consumer: (sample: PointerSample) => void): Unsubscribe;
}

export interface PointerSampleLike {
  readonly pointerId?: number | undefined;
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
  readonly pointerType?: string | undefined;
  readonly pressure?: number | undefined;
  readonly tangentialPressure?: number | undefined;
  readonly tiltX?: number | undefined;
  readonly tiltY?: number | undefined;
  readonly twist?: number | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly altitudeAngle?: number | undefined;
  readonly azimuthAngle?: number | undefined;
  readonly button?: number | undefined;
  readonly buttons?: number | undefined;
  readonly isPrimary?: boolean | undefined;
  readonly isContact?: boolean | undefined;
  readonly isEraser?: boolean | undefined;
  readonly origin?: PointerSampleOrigin | undefined;
}

export interface SurfaceBounds {
  readonly left: number;
  readonly top: number;
}

export interface BrowserPointerEventLike {
  readonly type: string;
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
  readonly timeStamp: number;
  readonly pressure: number;
  readonly tangentialPressure?: number | undefined;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly twist?: number | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly altitudeAngle?: number | undefined;
  readonly azimuthAngle?: number | undefined;
  readonly button: number;
  readonly buttons: number;
  readonly isPrimary: boolean;
  getCoalescedEvents?: (() => readonly BrowserPointerEventLike[]) | undefined;
}

export interface PointerSampleBatch {
  readonly samples: readonly PointerSample[];
  readonly coalescedSampleCount: number;
  readonly usedCoalescedEvents: boolean;
}

export function normalizePointerSample(source: PointerSampleLike): PointerSample {
  const buttons = integerOr(source.buttons ?? 0, 0);
  const button = integerOr(source.button ?? -1, -1);
  const deviceType = normalizeDeviceType(source.pointerType);

  return Object.freeze({
    pointerId: integerOr(source.pointerId ?? 0, 0),
    x: finiteOr(source.x, 0),
    y: finiteOr(source.y, 0),
    timestamp: finiteOr(source.timestamp, 0),
    deviceType,
    pressure: clamp(finiteOr(source.pressure ?? 0, 0), 0, 1),
    tangentialPressure: optionalClamped(source.tangentialPressure, -1, 1),
    tiltX: clamp(finiteOr(source.tiltX ?? 0, 0), -90, 90),
    tiltY: clamp(finiteOr(source.tiltY ?? 0, 0), -90, 90),
    twist: optionalClamped(source.twist, 0, 359),
    width: optionalMinimum(source.width, 0),
    height: optionalMinimum(source.height, 0),
    altitudeAngle: optionalClamped(source.altitudeAngle, 0, Math.PI / 2),
    azimuthAngle: optionalClamped(source.azimuthAngle, 0, Math.PI * 2),
    button,
    buttons,
    isPrimary: source.isPrimary ?? false,
    isContact: source.isContact ?? buttons !== 0,
    isEraser: source.isEraser ?? detectStylusEraser(deviceType, button, buttons),
    origin: source.origin ?? 'primary',
  });
}

export function unpackPointerEventSamples(
  event: BrowserPointerEventLike,
  bounds: SurfaceBounds,
  forceContact?: boolean,
): PointerSampleBatch {
  const canUseCoalesced =
    event.type === 'pointermove' && typeof event.getCoalescedEvents === 'function';

  let coalesced: readonly BrowserPointerEventLike[] = [];
  if (canUseCoalesced) {
    try {
      coalesced = event.getCoalescedEvents?.() ?? [];
    } catch {
      coalesced = [];
    }
  }

  const useCoalesced = coalesced.length > 0;
  const sourceEvents = useCoalesced ? coalesced : [event];
  const origin: PointerSampleOrigin = useCoalesced ? 'coalesced' : 'primary';

  const samples = sourceEvents.map((sourceEvent) =>
    normalizePointerSample({
      pointerId: sourceEvent.pointerId,
      x: sourceEvent.clientX - bounds.left,
      y: sourceEvent.clientY - bounds.top,
      timestamp: sourceEvent.timeStamp,
      pointerType: sourceEvent.pointerType,
      pressure: sourceEvent.pressure,
      tangentialPressure: sourceEvent.tangentialPressure,
      tiltX: sourceEvent.tiltX,
      tiltY: sourceEvent.tiltY,
      twist: sourceEvent.twist,
      width: sourceEvent.width,
      height: sourceEvent.height,
      altitudeAngle: sourceEvent.altitudeAngle,
      azimuthAngle: sourceEvent.azimuthAngle,
      button: sourceEvent.button,
      buttons: sourceEvent.buttons,
      isPrimary: sourceEvent.isPrimary,
      isContact: forceContact ?? inferContactState(event.type, sourceEvent),
      isEraser: detectStylusEraser(
        normalizeDeviceType(sourceEvent.pointerType),
        sourceEvent.button,
        sourceEvent.buttons,
      ),
      origin,
    }),
  );

  return Object.freeze({
    samples: Object.freeze(samples),
    coalescedSampleCount: useCoalesced ? samples.length : 0,
    usedCoalescedEvents: useCoalesced,
  });
}

export function detectStylusEraser(
  deviceType: PointerDeviceType,
  button: number,
  buttons: number,
): boolean {
  if (deviceType !== 'pen') {
    return false;
  }

  return button === 5 || (buttons & 32) !== 0;
}

export function normalizeDeviceType(pointerType: string | undefined): PointerDeviceType {
  return pointerType === 'mouse' || pointerType === 'pen' || pointerType === 'touch'
    ? pointerType
    : 'unknown';
}

function inferContactState(eventType: string, event: BrowserPointerEventLike): boolean {
  if (
    eventType === 'pointerup' ||
    eventType === 'pointercancel' ||
    eventType === 'lostpointercapture'
  ) {
    return false;
  }

  if (eventType === 'pointerdown') {
    return true;
  }

  return event.buttons !== 0 || event.pressure > 0;
}

function integerOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function optionalClamped(value: number | undefined, min: number, max: number): number | null {
  return value === undefined || !Number.isFinite(value) ? null : clamp(value, min, max);
}

function optionalMinimum(value: number | undefined, min: number): number | null {
  return value === undefined || !Number.isFinite(value) ? null : Math.max(min, value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
