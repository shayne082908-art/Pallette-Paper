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
  it('summarizes aggregate measurements including contact gaps', () => {
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
      isContact: true,
    }));
    recorder.recordSample(normalizePointerSample({
      pointerId: 9,
      x: 4,
      y: 6,
      timestamp: 1100,
      pointerType: 'pen',
      pressure: 0.9,
      tiltX: 30,
      tiltY: 25,
      twist: 20,
      button: 5,
      buttons: 32,
      origin: 'coalesced',
      isContact: true,
    }));

    const summary = recorder.stop(2000);

    expect(summary).toEqual({
      durationMs: 1000,
      pointerTypes: ['pen'],
      browserPointerEvents: 2,
      normalizedSamples: 2,
      coalescedSamples: 1,
      averageSampleRate: 2,
      averageCoalescedSampleRate: 1,
      maximumTimeGapMs: 50,
      maximumSpatialGapPx: 5,
      pressureRange: [0.1, 0.9],
      pressureVariation: 0.8,
      tiltXRange: [-20, 30],
      tiltYRange: [5, 25],
      twistChanged: true,
      eraserObserved: true,
    });
  });

  it('does not bridge gap measurements across contact lifts', () => {
    const recorder = new InputCaptureRecorder();
    recorder.start(0);

    recorder.recordSample(normalizePointerSample({
      pointerId: 1,
      x: 0,
      y: 0,
      timestamp: 10,
      pointerType: 'mouse',
      buttons: 1,
      isContact: true,
    }));
    recorder.recordSample(normalizePointerSample({
      pointerId: 1,
      x: 0,
      y: 0,
      timestamp: 20,
      pointerType: 'mouse',
      buttons: 0,
      isContact: false,
    }));
    recorder.recordSample(normalizePointerSample({
      pointerId: 1,
      x: 100,
      y: 100,
      timestamp: 1000,
      pointerType: 'mouse',
      buttons: 1,
      isContact: true,
    }));

    const summary = recorder.stop(1100);

    expect(summary?.maximumTimeGapMs).toBeNull();
    expect(summary?.maximumSpatialGapPx).toBeNull();
  });

  it('returns a valid no-sample summary', () => {
    const recorder = new InputCaptureRecorder();
    recorder.start(100);

    expect(recorder.stop(600)).toEqual({
      durationMs: 500,
      pointerTypes: [],
      browserPointerEvents: 0,
      normalizedSamples: 0,
      coalescedSamples: 0,
      averageSampleRate: 0,
      averageCoalescedSampleRate: 0,
      maximumTimeGapMs: null,
      maximumSpatialGapPx: null,
      pressureRange: null,
      pressureVariation: null,
      tiltXRange: null,
      tiltYRange: null,
      twistChanged: false,
      eraserObserved: false,
    });
  });
});
