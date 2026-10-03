import type { Unsubscribe } from '../core/subscription';
import {
  unpackPointerEventSamples,
  type PointerSample,
  type PointerSampleSource,
} from './pointerInput';

export type BrowserPointerActivityType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'lostpointercapture'
  | 'pointerenter'
  | 'pointerleave';

export interface PointerInputCapabilities {
  readonly coalescedEventsApi: boolean;
  readonly pointerRawUpdateApi: boolean;
}

export interface BrowserPointerActivity {
  readonly type: BrowserPointerActivityType;
  readonly pointerId: number;
  readonly timestamp: number;
  readonly normalizedSampleCount: number;
  readonly coalescedSampleCount: number;
  readonly usedCoalescedEvents: boolean;
}

export interface BrowserPointerBatch extends BrowserPointerActivity {
  readonly samples: readonly PointerSample[];
}

type SampleConsumer = (sample: PointerSample) => void;
type ActivityConsumer = (activity: BrowserPointerActivity) => void;
type BatchConsumer = (batch: BrowserPointerBatch) => void;

export class BrowserPointerInputSource implements PointerSampleSource {
  private readonly sampleConsumers = new Set<SampleConsumer>();
  private readonly activityConsumers = new Set<ActivityConsumer>();
  private readonly batchConsumers = new Set<BatchConsumer>();
  private started = false;

  readonly capabilities: PointerInputCapabilities;

  constructor(private readonly surface: HTMLElement) {
    this.capabilities = Object.freeze({
      coalescedEventsApi:
        typeof PointerEvent !== 'undefined' &&
        typeof PointerEvent.prototype.getCoalescedEvents === 'function',
      pointerRawUpdateApi: 'onpointerrawupdate' in surface,
    });
  }

  subscribe(consumer: SampleConsumer): Unsubscribe {
    this.sampleConsumers.add(consumer);
    return () => this.sampleConsumers.delete(consumer);
  }

  subscribeActivity(consumer: ActivityConsumer): Unsubscribe {
    this.activityConsumers.add(consumer);
    return () => this.activityConsumers.delete(consumer);
  }

  subscribeBatch(consumer: BatchConsumer): Unsubscribe {
    this.batchConsumers.add(consumer);
    return () => this.batchConsumers.delete(consumer);
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.surface.addEventListener('pointerdown', this.onPointerDown);
    this.surface.addEventListener('pointermove', this.onPointerMove);
    this.surface.addEventListener('pointerup', this.onPointerUp);
    this.surface.addEventListener('pointercancel', this.onPointerCancel);
    this.surface.addEventListener('lostpointercapture', this.onLostPointerCapture);
    this.surface.addEventListener('pointerenter', this.onPointerEnter);
    this.surface.addEventListener('pointerleave', this.onPointerLeave);
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.surface.removeEventListener('pointerdown', this.onPointerDown);
    this.surface.removeEventListener('pointermove', this.onPointerMove);
    this.surface.removeEventListener('pointerup', this.onPointerUp);
    this.surface.removeEventListener('pointercancel', this.onPointerCancel);
    this.surface.removeEventListener('lostpointercapture', this.onLostPointerCapture);
    this.surface.removeEventListener('pointerenter', this.onPointerEnter);
    this.surface.removeEventListener('pointerleave', this.onPointerLeave);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    try {
      this.surface.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers may refuse capture for a pointer that is no longer active.
    }

    this.emit(event, 'pointerdown', true);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.emit(event, 'pointermove');
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.emit(event, 'pointerup', false);
    this.releaseCapture(event.pointerId);
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    this.emit(event, 'pointercancel', false);
    this.releaseCapture(event.pointerId);
  };

  private readonly onLostPointerCapture = (event: PointerEvent): void => {
    this.emit(event, 'lostpointercapture', false);
  };

  private readonly onPointerEnter = (event: PointerEvent): void => {
    this.emit(event, 'pointerenter');
  };

  private readonly onPointerLeave = (event: PointerEvent): void => {
    this.emit(event, 'pointerleave');
  };

  private emit(
    event: PointerEvent,
    type: BrowserPointerActivityType,
    forceContact?: boolean,
  ): void {
    const rect = this.surface.getBoundingClientRect();
    const batch = unpackPointerEventSamples(
      event,
      { left: rect.left, top: rect.top },
      forceContact,
    );

    for (const sample of batch.samples) {
      for (const consumer of this.sampleConsumers) {
        consumer(sample);
      }
    }

    const activity: BrowserPointerActivity = Object.freeze({
      type,
      pointerId: event.pointerId,
      timestamp: event.timeStamp,
      normalizedSampleCount: batch.samples.length,
      coalescedSampleCount: batch.coalescedSampleCount,
      usedCoalescedEvents: batch.usedCoalescedEvents,
    });

    const pointerBatch: BrowserPointerBatch = Object.freeze({
      ...activity,
      samples: batch.samples,
    });

    for (const consumer of this.batchConsumers) {
      consumer(pointerBatch);
    }

    for (const consumer of this.activityConsumers) {
      consumer(activity);
    }
  }

  private releaseCapture(pointerId: number): void {
    try {
      if (this.surface.hasPointerCapture(pointerId)) {
        this.surface.releasePointerCapture(pointerId);
      }
    } catch {
      // Capture may already have been released by the browser.
    }
  }
}
