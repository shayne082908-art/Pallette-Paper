import type { DrawingMeasurementSummary } from './drawingDiagnostics';
import type {
  PressureCurve,
  ProcessingMode,
  StabilizationMode,
} from './drawingTypes';

export type DrawingFeelTestId =
  | 'tiny-handwriting'
  | 'fast-circles'
  | 'sharp-zigzags'
  | 'pressure-ramp'
  | 'slow-contour'
  | 'free-sketch';

export interface DrawingFeelTestDefinition {
  readonly id: DrawingFeelTestId;
  readonly title: string;
  readonly instruction: string;
}

export const DRAWING_FEEL_TESTS: readonly DrawingFeelTestDefinition[] =
  Object.freeze([
    {
      id: 'tiny-handwriting',
      title: 'Tiny handwriting',
      instruction: 'Write a small word.',
    },
    {
      id: 'fast-circles',
      title: 'Fast circles',
      instruction: 'Draw several quick circles.',
    },
    {
      id: 'sharp-zigzags',
      title: 'Sharp zigzags',
      instruction: 'Draw several sharp turns.',
    },
    {
      id: 'pressure-ramp',
      title: 'Pressure ramp',
      instruction: 'Draw light → hard → light.',
    },
    {
      id: 'slow-contour',
      title: 'Slow contour',
      instruction: 'Draw one deliberate curved line.',
    },
    {
      id: 'free-sketch',
      title: 'Free sketch',
      instruction: 'Draw anything for roughly 30–60 seconds.',
    },
  ]);

export type TestAnswer = 'yes' | 'no' | 'not-sure';

export interface DrawingFeelFeedback {
  readonly immediate?: TestAnswer | undefined;
  readonly strokesBroke?: TestAnswer | undefined;
  readonly handwritingWorked?: TestAnswer | undefined;
  readonly stabilizationHelpful?: TestAnswer | undefined;
  readonly stabilizationDelayed?: TestAnswer | undefined;
  readonly pressureControllable?: TestAnswer | undefined;
  readonly undoRedoWorked?: TestAnswer | undefined;
  readonly navigationInterfered?: TestAnswer | undefined;
  readonly willingToSketch?: TestAnswer | undefined;
}

export interface DrawingReportSettings {
  readonly processing: ProcessingMode;
  readonly stabilization: StabilizationMode;
  readonly pressureCurve: PressureCurve;
  readonly brushSize: number;
}

export interface DrawingReportInput {
  readonly measurement: DrawingMeasurementSummary | null;
  readonly settings: DrawingReportSettings;
  readonly feedback: DrawingFeelFeedback;
  readonly notes: string;
}

export function createDrawingTestReport(input: DrawingReportInput): string {
  const measurement = input.measurement;
  const pointerTypes =
    measurement !== null && measurement.pointerTypes.length > 0
      ? measurement.pointerTypes.join(', ')
      : 'Not observed';
  const pressureRange = measurement?.pressureRange ?? null;
  const pressureObserved =
    pressureRange === null
      ? 'Not observed'
      : pressureRange[1] > pressureRange[0]
        ? 'Variation observed'
        : 'No variation observed';

  return [
    'PALETTE & PAPER — BUILD 03 DRAWING TEST',
    '',
    `Pointer type: ${pointerTypes}`,
    `Pressure observed: ${pressureObserved}`,
    `Pressure range: ${formatRange(pressureRange)}`,
    '',
    'Selected settings:',
    `Processing: ${input.settings.processing === 'raw' ? 'Raw' : 'Processed'}`,
    `Stabilization: ${capitalize(input.settings.stabilization)}`,
    `Pressure curve: ${capitalize(input.settings.pressureCurve)}`,
    `Brush size: ${input.settings.brushSize.toFixed(1)} px`,
    '',
    'Measurements:',
    `Approx input samples/sec: ${formatRate(measurement?.averageInputSamplesPerSecond)}`,
    `Approx processed samples/sec: ${formatRate(measurement?.averageProcessedSamplesPerSecond)}`,
    `Largest observed input gap: ${formatGap(measurement?.largestInputGapMs)}`,
    '',
    'Human observations:',
    `Pen felt immediate: ${formatAnswer(input.feedback.immediate)}`,
    `Strokes broke: ${formatAnswer(input.feedback.strokesBroke)}`,
    `Tiny handwriting worked: ${formatAnswer(input.feedback.handwritingWorked)}`,
    `Pressure felt controllable: ${formatAnswer(input.feedback.pressureControllable)}`,
    `Stabilization helped: ${formatAnswer(input.feedback.stabilizationHelpful)}`,
    `Stabilization felt delayed: ${formatAnswer(input.feedback.stabilizationDelayed)}`,
    `Undo/redo worked: ${formatAnswer(input.feedback.undoRedoWorked)}`,
    `Navigation interfered: ${formatAnswer(input.feedback.navigationInterfered)}`,
    `Would sketch with this for a few minutes: ${formatAnswer(input.feedback.willingToSketch)}`,
    '',
    'Notes:',
    input.notes.trim().length > 0 ? input.notes.trim() : 'None entered',
  ].join('\n');
}

function formatRange(range: readonly [number, number] | null): string {
  return range === null
    ? 'Not observed'
    : `${range[0].toFixed(3)} to ${range[1].toFixed(3)}`;
}

function formatRate(value: number | undefined): string {
  return value === undefined ? 'Not observed' : value.toFixed(1);
}

function formatGap(value: number | null | undefined): string {
  return value === null || value === undefined
    ? 'Not observed'
    : `${value.toFixed(1)} ms`;
}

function formatAnswer(answer: TestAnswer | undefined): string {
  if (answer === undefined) {
    return 'Not answered';
  }
  if (answer === 'not-sure') {
    return 'Not sure';
  }
  return answer === 'yes' ? 'Yes' : 'No';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
