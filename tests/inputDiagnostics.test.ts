import { describe, expect, it } from 'vitest';
import type { BrowserPointerActivity } from '../src/input/browserPointerInputSource';
import {
  InputCaptureRecorder,
  InputRateMeter,
} from '../src/input/inputDiagnostics';
import { normalizePointerSample } from '../src/input/pointerInput';

function activity(
  timestamp: number,
  coalescedSampleCount = 0,
): BrowserPointerActivity {
  return {
    type: 'pointermove',
    pointerId: 1,
    timestamp,
    normalizedSampleCount: Math.max(1, coalescedSampleCount),
    coalescedSampleCount,
    usedCoalescedEvents: coalescedSampleCount > 0,
  };
}

describe('InputRateMeter', () => {
  it('calculates rolling event, normalized, coalesced, and processed rates', () => {
    const meter = new InputRateMeter();

    meter.recordBrowserEvent(activity(1000, 2));
    meter.recordBrowserEvent(activity(1500));
    meter.recordNormalizedSample(normalizePointerSample({
      x: 0,
      y: 0,
      timestamp: 1000,
      pointerType: 'pen',
      origin: 'coalesced',
    }));
    meter.recordNormalizedSample(normalizePointerSample({
      x: 1,
      y: 1,
      timestamp: 1500,
      pointerType: 'pen',
    }));
    meter.recordProcessedSample(1000);
    meter.recordProcessedSample(1500);

    expect(meter.snapshot(1800)).toEqual({
      browserEventsPerSecond: 2,
      normalizedSamplesPerSecond: 2,
      coalescedSamplesPerSecond: 1,
      processedSamplesPerSecond: 2,
      coalescedObserved: true,
    });

    expect(meter.snapshot(2601)).toEqual({
      browserEventsPerSecond: 0,
      normalizedSamplesPerSecond: 0,
      coalescedSamplesPerSecond: 0,
      processedSamplesPerSecond: 0,
      coalescedObserved: true,
    });
  });
});

describe('InputCaptureRecorder', () => {
  it('summarizes a short diagnostic capture without retaining a raw log', () => {
    const recorder = new InputCaptureRecorder();
    recorder.start(1000);
    recorder.recordBrowserEvent(activity(1050, 1));
    recorder.recordBrowserEvent(activity(1100));

    recorder.recordSample(normalizePointerSample({
      pointerId: 9,
      x: 1,
      y: 2,
      timestamp: 1050,
      pointerType: 'pen',
      pressure: 0.1,
      tiltX: -20,
      tiltY: 5,
      twist: 10,
      buttons: 1,
    }));
    recorder.recordSample(normalizePointerSample({
      pointerId: 9,
      x: 3,
      y: 4,
      timestamp: 1100,
      pointerType: 'pen',
      pressure: 0.9,
      tiltX: 30,
      tiltY: 25,
      twist: 20,
      button: 5,
      buttons: 32,
      origin: 'coalesced',
    }));

    const summary = recorder.stop(2000);

    expect(summary).toEqual({
      durationMs: 1000,
      pointerTypes: ['pen'],
      browserPointerEvents: 2,
      normalizedSamples: 2,
      coalescedSamples: 1,
      averageSampleRate: 2,
      pressureRange: [0.1, 0.9],
      tiltXRange: [-20, 30],
      tiltYRange: [5, 25],
      twistChanged: true,
      eraserObserved: true,
    });
  });
});
