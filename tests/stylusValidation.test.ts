import { describe, expect, it } from 'vitest';
import type { PointerInputCapabilities } from '../src/input/browserPointerInputSource';
import type { DiagnosticCaptureSummary } from '../src/input/inputDiagnostics';
import {
  aggregateMeasurements,
  calculateCapabilitySummary,
  createStylusTestReport,
  type GuidedTestResult,
} from '../src/input/stylusValidation';

const capabilities: PointerInputCapabilities = {
  coalescedEventsApi: true,
  pointerRawUpdateApi: false,
};

function summary(
  overrides: Partial<DiagnosticCaptureSummary> = {},
): DiagnosticCaptureSummary {
  return {
    durationMs: 1000,
    pointerTypes: ['pen'],
    browserPointerEvents: 10,
    normalizedSamples: 20,
    coalescedSamples: 8,
    averageSampleRate: 20,
    averageCoalescedSampleRate: 8,
    maximumTimeGapMs: 12,
    maximumSpatialGapPx: 7,
    pressureRange: [0.1, 0.8],
    pressureVariation: 0.7,
    tiltXRange: [-10, 20],
    tiltYRange: [-5, 15],
    twistChanged: true,
    eraserObserved: false,
    ...overrides,
  };
}

describe('aggregateMeasurements', () => {
  it('aggregates completed test measurements without retaining raw samples', () => {
    const results: GuidedTestResult[] = [
      { id: 'slow-line', skipped: false, summary: summary() },
      {
        id: 'fast-line',
        skipped: false,
        summary: summary({
          durationMs: 500,
          normalizedSamples: 20,
          coalescedSamples: 10,
          maximumTimeGapMs: 30,
          maximumSpatialGapPx: 25,
        }),
      },
      { id: 'eraser', skipped: true, summary: null },
    ];

    const aggregate = aggregateMeasurements(results);

    expect(aggregate.pointerTypes).toEqual(['pen']);
    expect(aggregate.averageNormalizedSampleRate).toBeCloseTo(26.666, 2);
    expect(aggregate.averageCoalescedSampleRate).toBe(12);
    expect(aggregate.largestTimeGapMs).toBe(30);
    expect(aggregate.largestSpatialGapPx).toBe(25);
  });

  it('handles sessions with no samples or completed metrics', () => {
    const results: GuidedTestResult[] = [
      {
        id: 'slow-line',
        skipped: false,
        summary: summary({
          normalizedSamples: 0,
          coalescedSamples: 0,
          pointerTypes: [],
          maximumTimeGapMs: null,
          maximumSpatialGapPx: null,
        }),
      },
    ];

    const aggregate = aggregateMeasurements(results);
    expect(aggregate.pointerTypes).toEqual([]);
    expect(aggregate.largestTimeGapMs).toBeNull();
    expect(aggregate.largestSpatialGapPx).toBeNull();
  });
});

describe('calculateCapabilitySummary', () => {
  it('reports neutral observed capability states', () => {
    const results: GuidedTestResult[] = [
      { id: 'pressure', skipped: false, summary: summary() },
      { id: 'tilt', skipped: false, summary: summary() },
      { id: 'eraser', skipped: false, summary: summary({ eraserObserved: true }) },
    ];

    expect(calculateCapabilitySummary(results, capabilities, {
      noticeableLag: 'no',
      browserGestureInterference: 'yes',
    })).toEqual({
      penDetected: 'Detected',
      pressureVariationObserved: 'Detected',
      tiltVariationObserved: 'Detected',
      twistVariationObserved: 'Detected',
      eraserObserved: 'Detected',
      coalescedEventsObserved: 'Detected',
      pointerRawUpdateAvailable: 'Unsupported by browser',
      browserGesturesInterfered: 'Detected',
      userNoticedInputLag: 'Not observed',
    });
  });

  it('treats skipped or unperformed tests as not tested', () => {
    const results: GuidedTestResult[] = [
      { id: 'eraser', skipped: true, summary: null },
    ];

    const result = calculateCapabilitySummary(
      results,
      { coalescedEventsApi: false, pointerRawUpdateApi: true },
      {},
    );

    expect(result.penDetected).toBe('Not tested');
    expect(result.pressureVariationObserved).toBe('Not tested');
    expect(result.tiltVariationObserved).toBe('Not tested');
    expect(result.eraserObserved).toBe('Not tested');
    expect(result.coalescedEventsObserved).toBe('Unsupported by browser');
    expect(result.pointerRawUpdateAvailable).toBe('Detected');
  });

  it('reports no-sample exercises as not observed rather than inventing support', () => {
    const noSamples = summary({
      normalizedSamples: 0,
      pointerTypes: [],
      pressureRange: null,
      pressureVariation: null,
      tiltXRange: null,
      tiltYRange: null,
      twistChanged: false,
    });
    const results: GuidedTestResult[] = [
      { id: 'pressure', skipped: false, summary: noSamples },
      { id: 'tilt', skipped: false, summary: noSamples },
    ];

    const result = calculateCapabilitySummary(results, capabilities, {});

    expect(result.pressureVariationObserved).toBe('Not observed');
    expect(result.tiltVariationObserved).toBe('Not observed');
    expect(result.twistVariationObserved).toBe('Not observed');
  });
});

describe('createStylusTestReport', () => {
  it('generates compact pasteable text using only known or explicitly missing values', () => {
    const results: GuidedTestResult[] = [
      { id: 'fast-line', skipped: false, summary: summary() },
      { id: 'pressure', skipped: false, summary: summary() },
      { id: 'tilt', skipped: false, summary: summary() },
      { id: 'eraser', skipped: true, summary: null },
    ];

    const report = createStylusTestReport({
      results,
      capabilities,
      feedback: {
        fastLineBroke: 'no',
        noticeableLag: 'not-sure',
        tinyHandwritingCorrect: 'sort-of',
      },
      browserLabel: '',
      operatingSystemLabel: 'Windows 11',
      notes: 'Mouse fallback also tested.',
    });

    expect(report).toContain('PALETTE & PAPER — BUILD 02B STYLUS TEST');
    expect(report).toContain('Browser: Not entered');
    expect(report).toContain('Operating system: Windows 11');
    expect(report).toContain('Eraser observed: Not tested');
    expect(report).toContain('Fast line broke: No');
    expect(report).toContain('Noticeable lag: Not sure');
    expect(report).toContain('Notes:\nMouse fallback also tested.');
  });
});
