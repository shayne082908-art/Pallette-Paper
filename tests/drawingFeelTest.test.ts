import { describe, expect, it } from 'vitest';
import { createDrawingTestReport } from '../src/drawing/drawingFeelTest';

describe('createDrawingTestReport', () => {
  it('includes measured values and human answers without inventing device details', () => {
    const report = createDrawingTestReport({
      measurement: {
        durationMs: 2000,
        pointerTypes: ['mouse'],
        inputSamples: 100,
        processedSamples: 180,
        averageInputSamplesPerSecond: 50,
        averageProcessedSamplesPerSecond: 90,
        largestInputGapMs: 18,
        pressureRange: [0.5, 0.5],
      },
      settings: {
        processing: 'processed',
        stabilization: 'low',
        pressureCurve: 'soft',
        brushSize: 6,
      },
      feedback: {
        immediate: 'yes',
        strokesBroke: 'no',
        willingToSketch: 'not-sure',
      },
      notes: '',
    });

    expect(report).toContain('Pointer type: mouse');
    expect(report).toContain('Pressure observed: No variation observed');
    expect(report).toContain('Processing: Processed');
    expect(report).toContain('Pen felt immediate: Yes');
    expect(report).toContain('Would sketch with this for a few minutes: Not sure');
    expect(report).toContain('Notes:\nNone entered');
  });

  it('labels unavailable measurements as not observed', () => {
    const report = createDrawingTestReport({
      measurement: null,
      settings: {
        processing: 'raw',
        stabilization: 'off',
        pressureCurve: 'linear',
        brushSize: 4,
      },
      feedback: {},
      notes: '',
    });

    expect(report).toContain('Pointer type: Not observed');
    expect(report).toContain('Largest observed input gap: Not observed');
    expect(report).toContain('Pen felt immediate: Not answered');
  });
});
