import type { PointerInputCapabilities } from './browserPointerInputSource';
import type { DiagnosticCaptureSummary } from './inputDiagnostics';
import type { PointerDeviceType } from './pointerInput';

export type GuidedTestId =
  | 'slow-line'
  | 'fast-line'
  | 'fast-circles'
  | 'sharp-zigzags'
  | 'pressure'
  | 'tiny-handwriting'
  | 'tilt'
  | 'eraser';

export interface GuidedTestDefinition {
  readonly id: GuidedTestId;
  readonly title: string;
  readonly instruction: string;
  readonly purpose?: string;
  readonly skippable?: boolean;
}

export const GUIDED_TESTS: readonly GuidedTestDefinition[] = Object.freeze([
  {
    id: 'slow-line',
    title: 'Slow line',
    instruction: 'Draw one slow line across the box.',
  },
  {
    id: 'fast-line',
    title: 'Fast line',
    instruction: 'Draw quickly across the box several times.',
    purpose: 'Look for large input gaps or lost contact.',
  },
  {
    id: 'fast-circles',
    title: 'Fast circles',
    instruction: 'Draw several quick circles without lifting the pen.',
    purpose: 'Reveal sparse sampling and obvious discontinuities.',
  },
  {
    id: 'sharp-zigzags',
    title: 'Sharp zigzags',
    instruction: 'Draw several sharp zigzags.',
    purpose: 'Inspect whether fast direction changes remain represented.',
  },
  {
    id: 'pressure',
    title: 'Pressure',
    instruction: 'Start very lightly, gradually press harder, then lighten again.',
  },
  {
    id: 'tiny-handwriting',
    title: 'Tiny handwriting',
    instruction: 'Write a small word or your signature.',
  },
  {
    id: 'tilt',
    title: 'Tilt',
    instruction: 'Draw while changing the angle of your pen.',
  },
  {
    id: 'eraser',
    title: 'Eraser',
    instruction: 'If your stylus has an eraser end, try drawing with it.',
    skippable: true,
  },
]);

export interface GuidedTestResult {
  readonly id: GuidedTestId;
  readonly skipped: boolean;
  readonly summary: DiagnosticCaptureSummary | null;
}

export type ThreeWayAnswer = 'yes' | 'no' | 'not-sure';
export type HandwritingAnswer = 'yes' | 'no' | 'sort-of';

export interface HumanFeedback {
  readonly fastLineBroke?: ThreeWayAnswer | undefined;
  readonly fastCirclesBroke?: ThreeWayAnswer | undefined;
  readonly sharpZigzagsCorrect?: ThreeWayAnswer | undefined;
  readonly tinyHandwritingCorrect?: HandwritingAnswer | undefined;
  readonly noticeableLag?: ThreeWayAnswer | undefined;
  readonly browserGestureInterference?: ThreeWayAnswer | undefined;
}

export type CapabilityStatus =
  | 'Detected'
  | 'Not observed'
  | 'Unsupported by browser'
  | 'Not tested';

export interface CapabilitySummary {
  readonly penDetected: CapabilityStatus;
  readonly pressureVariationObserved: CapabilityStatus;
  readonly tiltVariationObserved: CapabilityStatus;
  readonly twistVariationObserved: CapabilityStatus;
  readonly eraserObserved: CapabilityStatus;
  readonly coalescedEventsObserved: CapabilityStatus;
  readonly pointerRawUpdateAvailable: CapabilityStatus;
  readonly browserGesturesInterfered: CapabilityStatus;
  readonly userNoticedInputLag: CapabilityStatus;
}

export interface AggregateMeasurements {
  readonly pointerTypes: readonly PointerDeviceType[];
  readonly averageNormalizedSampleRate: number | null;
  readonly averageCoalescedSampleRate: number | null;
  readonly largestTimeGapMs: number | null;
  readonly largestSpatialGapPx: number | null;
}

export interface TestReportInput {
  readonly results: readonly GuidedTestResult[];
  readonly capabilities: PointerInputCapabilities;
  readonly feedback: HumanFeedback;
  readonly browserLabel: string;
  readonly operatingSystemLabel: string;
  readonly notes: string;
}

export function calculateCapabilitySummary(
  results: readonly GuidedTestResult[],
  capabilities: PointerInputCapabilities,
  feedback: HumanFeedback,
): CapabilitySummary {
  const completed = results.filter((result) => !result.skipped && result.summary !== null);
  const sampled = completed.filter((result) => (result.summary?.normalizedSamples ?? 0) > 0);
  const sampledTypes = new Set(
    sampled.flatMap((result) => result.summary?.pointerTypes ?? []),
  );

  const pressureResult = findResult(results, 'pressure');
  const tiltResult = findResult(results, 'tilt');
  const eraserResult = findResult(results, 'eraser');

  return Object.freeze({
    penDetected:
      sampled.length === 0
        ? 'Not tested'
        : sampledTypes.has('pen')
          ? 'Detected'
          : 'Not observed',
    pressureVariationObserved: variationStatus(pressureResult, (summary) =>
      (summary.pressureVariation ?? 0) > 0,
    ),
    tiltVariationObserved: variationStatus(tiltResult, (summary) =>
      rangeVariation(summary.tiltXRange) > 0 || rangeVariation(summary.tiltYRange) > 0,
    ),
    twistVariationObserved: variationStatus(tiltResult, (summary) => summary.twistChanged),
    eraserObserved:
      eraserResult?.skipped === true
        ? 'Not tested'
        : resultObservationStatus(eraserResult, (summary) => summary.eraserObserved),
    coalescedEventsObserved: !capabilities.coalescedEventsApi
      ? 'Unsupported by browser'
      : sampled.length === 0
        ? 'Not tested'
        : completed.some((result) => (result.summary?.coalescedSamples ?? 0) > 0)
          ? 'Detected'
          : 'Not observed',
    pointerRawUpdateAvailable: capabilities.pointerRawUpdateApi
      ? 'Detected'
      : 'Unsupported by browser',
    browserGesturesInterfered: feedbackStatus(feedback.browserGestureInterference),
    userNoticedInputLag: feedbackStatus(feedback.noticeableLag),
  });
}

export function aggregateMeasurements(
  results: readonly GuidedTestResult[],
): AggregateMeasurements {
  const summaries = results
    .filter((result) => !result.skipped && result.summary !== null)
    .map((result) => result.summary as DiagnosticCaptureSummary);

  const totalDurationMs = summaries.reduce((sum, summary) => sum + summary.durationMs, 0);
  const totalSamples = summaries.reduce((sum, summary) => sum + summary.normalizedSamples, 0);
  const totalCoalescedSamples = summaries.reduce(
    (sum, summary) => sum + summary.coalescedSamples,
    0,
  );

  return Object.freeze({
    pointerTypes: Object.freeze(
      [...new Set(summaries.flatMap((summary) => summary.pointerTypes))],
    ),
    averageNormalizedSampleRate:
      totalDurationMs > 0 ? (totalSamples * 1000) / totalDurationMs : null,
    averageCoalescedSampleRate:
      totalDurationMs > 0 ? (totalCoalescedSamples * 1000) / totalDurationMs : null,
    largestTimeGapMs: maximumNullable(
      summaries.map((summary) => summary.maximumTimeGapMs),
    ),
    largestSpatialGapPx: maximumNullable(
      summaries.map((summary) => summary.maximumSpatialGapPx),
    ),
  });
}

export function createStylusTestReport(input: TestReportInput): string {
  const capability = calculateCapabilitySummary(
    input.results,
    input.capabilities,
    input.feedback,
  );
  const aggregate = aggregateMeasurements(input.results);
  const pressureSummary = findResult(input.results, 'pressure')?.summary ?? null;
  const tiltSummary = findResult(input.results, 'tilt')?.summary ?? null;

  return [
    'PALETTE & PAPER — BUILD 02B STYLUS TEST',
    '',
    'Environment:',
    `Browser: ${nonEmptyOr(input.browserLabel, 'Not entered')}`,
    `Operating system: ${nonEmptyOr(input.operatingSystemLabel, 'Not entered')}`,
    `Pointer type observed: ${aggregate.pointerTypes.length > 0 ? aggregate.pointerTypes.join(', ') : 'Not observed'}`,
    '',
    'Capabilities:',
    `Pen detected: ${capability.penDetected}`,
    `Pressure variation: ${capability.pressureVariationObserved}`,
    `Pressure range: ${formatRange(pressureSummary?.pressureRange ?? null)}`,
    `Tilt X range: ${formatRange(tiltSummary?.tiltXRange ?? null)}`,
    `Tilt Y range: ${formatRange(tiltSummary?.tiltYRange ?? null)}`,
    `Twist variation: ${capability.twistVariationObserved}`,
    `Eraser observed: ${capability.eraserObserved}`,
    `Coalesced events observed: ${capability.coalescedEventsObserved}`,
    `pointerrawupdate available: ${capability.pointerRawUpdateAvailable}`,
    '',
    'Input measurements:',
    `Average normalized sample rate: ${formatRate(aggregate.averageNormalizedSampleRate)}`,
    `Average coalesced sample rate: ${formatRate(aggregate.averageCoalescedSampleRate)}`,
    `Largest observed time gap: ${formatMeasurement(aggregate.largestTimeGapMs, 'ms')}`,
    `Largest observed spatial gap: ${formatMeasurement(aggregate.largestSpatialGapPx, 'px')}`,
    '',
    'Human observations:',
    `Fast line broke: ${formatAnswer(input.feedback.fastLineBroke)}`,
    `Fast circles broke: ${formatAnswer(input.feedback.fastCirclesBroke)}`,
    `Sharp zigzags looked correct: ${formatAnswer(input.feedback.sharpZigzagsCorrect)}`,
    `Tiny handwriting looked correct: ${formatAnswer(input.feedback.tinyHandwritingCorrect)}`,
    `Noticeable lag: ${formatAnswer(input.feedback.noticeableLag)}`,
    `Browser gesture interference: ${formatAnswer(input.feedback.browserGestureInterference)}`,
    '',
    'Notes:',
    nonEmptyOr(input.notes, 'None entered'),
  ].join('\n');
}

function findResult(
  results: readonly GuidedTestResult[],
  id: GuidedTestId,
): GuidedTestResult | undefined {
  return results.find((result) => result.id === id);
}

function variationStatus(
  result: GuidedTestResult | undefined,
  observed: (summary: DiagnosticCaptureSummary) => boolean,
): CapabilityStatus {
  return resultObservationStatus(result, observed);
}

function resultObservationStatus(
  result: GuidedTestResult | undefined,
  observed: (summary: DiagnosticCaptureSummary) => boolean,
): CapabilityStatus {
  if (result === undefined || result.skipped) {
    return 'Not tested';
  }

  if (result.summary === null || result.summary.normalizedSamples === 0) {
    return 'Not observed';
  }

  return observed(result.summary) ? 'Detected' : 'Not observed';
}

function feedbackStatus(answer: ThreeWayAnswer | undefined): CapabilityStatus {
  if (answer === undefined || answer === 'not-sure') {
    return 'Not tested';
  }
  return answer === 'yes' ? 'Detected' : 'Not observed';
}

function rangeVariation(range: readonly [number, number] | null): number {
  return range === null ? 0 : range[1] - range[0];
}

function maximumNullable(values: readonly (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null);
  return known.length === 0 ? null : Math.max(...known);
}

function nonEmptyOr(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function formatRange(range: readonly [number, number] | null): string {
  return range === null ? 'Not observed' : `${range[0].toFixed(3)} to ${range[1].toFixed(3)}`;
}

function formatRate(value: number | null): string {
  return value === null ? 'Not observed' : `${value.toFixed(1)} samples/s`;
}

function formatMeasurement(value: number | null, unit: string): string {
  return value === null ? 'Not observed' : `${value.toFixed(1)} ${unit}`;
}

function formatAnswer(
  answer: ThreeWayAnswer | HandwritingAnswer | undefined,
): string {
  if (answer === undefined) {
    return 'Not answered';
  }

  if (answer === 'not-sure') {
    return 'Not sure';
  }

  if (answer === 'sort-of') {
    return 'Sort of';
  }

  return answer === 'yes' ? 'Yes' : 'No';
}
