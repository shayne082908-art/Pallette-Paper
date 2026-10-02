import { useEffect, useRef, useState } from 'react';
import {
  BrowserPointerInputSource,
  type PointerInputCapabilities,
} from '../input/browserPointerInputSource';
import {
  InputCaptureRecorder,
  InputRateMeter,
  type DiagnosticCaptureSummary,
  type InputRateSnapshot,
} from '../input/inputDiagnostics';
import type { PointerSample } from '../input/pointerInput';
import {
  GUIDED_TESTS,
  aggregateMeasurements,
  calculateCapabilitySummary,
  createStylusTestReport,
  type GuidedTestDefinition,
  type GuidedTestResult,
  type HandwritingAnswer,
  type HumanFeedback,
  type ThreeWayAnswer,
} from '../input/stylusValidation';
import { DiagnosticTraceRenderer } from '../rendering/diagnosticTraceRenderer';

interface LabViewModel {
  readonly latest: PointerSample | null;
  readonly rates: InputRateSnapshot;
  readonly capabilities: PointerInputCapabilities;
}

const EMPTY_RATES: InputRateSnapshot = {
  browserEventsPerSecond: 0,
  normalizedSamplesPerSecond: 0,
  coalescedSamplesPerSecond: 0,
  processedSamplesPerSecond: 0,
  coalescedObserved: false,
};

const EMPTY_CAPABILITIES: PointerInputCapabilities = {
  coalescedEventsApi: false,
  pointerRawUpdateApi: false,
};

export function InputLab() {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const lineCanvasRef = useRef<HTMLCanvasElement>(null);
  const pointCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef(new DiagnosticTraceRenderer());
  const rateMeterRef = useRef(new InputRateMeter());
  const recorderRef = useRef(new InputCaptureRecorder());
  const latestSampleRef = useRef<PointerSample | null>(null);

  const [view, setView] = useState<LabViewModel>({
    latest: null,
    rates: EMPTY_RATES,
    capabilities: EMPTY_CAPABILITIES,
  });
  const [showSamplePoints, setShowSamplePoints] = useState(false);
  const [recording, setRecording] = useState(false);
  const [summary, setSummary] = useState<DiagnosticCaptureSummary | null>(null);

  const [guidedIndex, setGuidedIndex] = useState<number | null>(null);
  const [guidedComplete, setGuidedComplete] = useState(false);
  const [guidedResults, setGuidedResults] = useState<readonly GuidedTestResult[]>([]);
  const [feedback, setFeedback] = useState<HumanFeedback>({});
  const [browserLabel, setBrowserLabel] = useState('');
  const [operatingSystemLabel, setOperatingSystemLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    const surface = surfaceRef.current;
    const lineCanvas = lineCanvasRef.current;
    const pointCanvas = pointCanvasRef.current;

    if (surface === null || lineCanvas === null || pointCanvas === null) {
      return;
    }

    const renderer = rendererRef.current;
    const rateMeter = rateMeterRef.current;
    const recorder = recorderRef.current;
    const source = new BrowserPointerInputSource(surface);

    renderer.attach(lineCanvas);
    renderer.attachSampleOverlay(pointCanvas);
    renderer.setSamplePointsVisible(showSamplePoints);

    const resize = (): void => {
      const rect = surface.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };

    resize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(surface);
    } else {
      window.addEventListener('resize', resize);
    }

    const unsubscribeSamples = source.subscribe((sample) => {
      latestSampleRef.current = sample;
      rateMeter.recordNormalizedSample(sample);
      renderer.consume(sample);
      rateMeter.recordProcessedSample(sample.timestamp);
      recorder.recordSample(sample);
    });

    const unsubscribeActivity = source.subscribeActivity((activity) => {
      rateMeter.recordBrowserEvent(activity);
      recorder.recordBrowserEvent(activity);
    });

    source.start();

    let frameId = 0;
    let lastVisualUpdate = 0;
    const updateDiagnostics = (now: number): void => {
      if (now - lastVisualUpdate >= 33) {
        lastVisualUpdate = now;
        setView({
          latest: latestSampleRef.current,
          rates: rateMeter.snapshot(now),
          capabilities: source.capabilities,
        });
      }
      frameId = requestAnimationFrame(updateDiagnostics);
    };
    frameId = requestAnimationFrame(updateDiagnostics);

    return () => {
      cancelAnimationFrame(frameId);
      source.stop();
      unsubscribeSamples();
      unsubscribeActivity();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      renderer.detach();
    };
  }, []);

  useEffect(() => {
    rendererRef.current.setSamplePointsVisible(showSamplePoints);
  }, [showSamplePoints]);

  const latest = view.latest;
  const currentTest = guidedIndex === null ? null : GUIDED_TESTS[guidedIndex] ?? null;
  const guidedRunning = currentTest !== null;

  const startCapture = (): void => {
    recorderRef.current.start(performance.now());
    setSummary(null);
    setRecording(true);
  };

  const stopCapture = (): void => {
    const result = recorderRef.current.stop(performance.now());
    setRecording(false);
    setSummary(result);
  };

  const beginGuidedExercise = (index: number): void => {
    recorderRef.current.stop(performance.now());
    rendererRef.current.clear();
    recorderRef.current.start(performance.now());
    setSummary(null);
    setCopyStatus('');
    setGuidedIndex(index);
    setGuidedComplete(false);
  };

  const runStylusTest = (): void => {
    if (recording) {
      recorderRef.current.stop(performance.now());
      setRecording(false);
    }

    setGuidedResults([]);
    setFeedback({});
    setBrowserLabel('');
    setOperatingSystemLabel('');
    setNotes('');
    beginGuidedExercise(0);
  };

  const completeCurrentExercise = (skipped: boolean): void => {
    if (currentTest === null || guidedIndex === null) {
      return;
    }

    const captured = recorderRef.current.stop(performance.now());
    const result: GuidedTestResult = {
      id: currentTest.id,
      skipped,
      summary: skipped ? null : captured,
    };

    const nextResults = [
      ...guidedResults.filter((existing) => existing.id !== currentTest.id),
      result,
    ];
    setGuidedResults(nextResults);

    const nextIndex = guidedIndex + 1;
    if (nextIndex < GUIDED_TESTS.length) {
      beginGuidedExercise(nextIndex);
    } else {
      rendererRef.current.clear();
      setGuidedIndex(null);
      setGuidedComplete(true);
    }
  };

  const previousExercise = (): void => {
    if (guidedIndex === null || guidedIndex <= 0) {
      return;
    }

    const previousIndex = guidedIndex - 1;
    const previous = GUIDED_TESTS[previousIndex];
    if (previous !== undefined) {
      setGuidedResults((results) => results.filter((result) => result.id !== previous.id));
    }
    beginGuidedExercise(previousIndex);
  };

  const retryExercise = (): void => {
    if (guidedIndex !== null) {
      beginGuidedExercise(guidedIndex);
    }
  };

  const report = guidedComplete
    ? createStylusTestReport({
        results: guidedResults,
        capabilities: view.capabilities,
        feedback,
        browserLabel,
        operatingSystemLabel,
        notes,
      })
    : '';

  const copyReport = async (): Promise<void> => {
    const copied = await copyText(report);
    setCopyStatus(copied ? 'Report copied.' : 'Copy failed. Select the report text below.');
  };

  const downloadReport = (): void => {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'palette-paper-build-02b-stylus-test.txt';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="input-lab" aria-labelledby="input-lab-title">
      <header className="lab-header">
        <div>
          <p className="eyebrow">Build 02B human stylus validation</p>
          <h2 id="input-lab-title">Input Lab</h2>
          <p className="lab-copy">
            Test mouse, touch, or a real stylus locally in this browser. Nothing is uploaded.
            The trace remains raw instrumentation with no smoothing, stabilization, or custom
            pressure curve.
          </p>
        </div>
        <div className="lab-controls">
          <button className="primary-action" type="button" onClick={runStylusTest}>
            Run Stylus Test
          </button>
          <button type="button" onClick={() => rendererRef.current.clear()}>Clear trace</button>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showSamplePoints}
              onChange={(event) => setShowSamplePoints(event.currentTarget.checked)}
            />
            Show sample points
          </label>
          {!guidedRunning && !guidedComplete && (
            recording ? (
              <button type="button" onClick={stopCapture}>Stop Capture</button>
            ) : (
              <button type="button" onClick={startCapture}>Start Capture</button>
            )
          )}
        </div>
      </header>

      {currentTest !== null && guidedIndex !== null && (
        <GuidedExercise
          test={currentTest}
          index={guidedIndex}
          feedback={feedback}
          onFeedback={setFeedback}
          onPrevious={previousExercise}
          onNext={() => completeCurrentExercise(false)}
          onRetry={retryExercise}
          onRestart={runStylusTest}
          onSkip={
            currentTest.skippable === true
              ? () => completeCurrentExercise(true)
              : undefined
          }
        />
      )}

      {guidedComplete && (
        <GuidedResults
          results={guidedResults}
          capabilities={view.capabilities}
          feedback={feedback}
          browserLabel={browserLabel}
          operatingSystemLabel={operatingSystemLabel}
          notes={notes}
          report={report}
          copyStatus={copyStatus}
          onBrowserLabel={setBrowserLabel}
          onOperatingSystemLabel={setOperatingSystemLabel}
          onNotes={setNotes}
          onCopy={() => void copyReport()}
          onDownload={downloadReport}
          onRestart={runStylusTest}
        />
      )}

      <div className="lab-layout">
        <div>
          <div
            ref={surfaceRef}
            className="input-surface"
            aria-label="Pointer and stylus diagnostic surface"
          >
            <canvas ref={lineCanvasRef} className="trace-canvas" />
            <canvas ref={pointCanvasRef} className="trace-canvas sample-canvas" />
            <div className="surface-label">
              {currentTest === null ? 'Pointer / stylus test surface' : currentTest.instruction}
            </div>
          </div>

          <section className="pressure-card" aria-label="Pressure visualizer">
            <div className="pressure-row">
              <strong>Pressure</strong>
              <span>{formatNumber(latest?.pressure)}</span>
            </div>
            <div className="pressure-track">
              <div
                className="pressure-fill"
                style={{ transform: `scaleX(${latest?.pressure ?? 0})` }}
              />
            </div>
          </section>

          {!guidedRunning && summary !== null && <CaptureSummary summary={summary} />}
        </div>

        <aside className="lab-sidebar">
          <section className="diagnostic-card">
            <h3>Live values</h3>
            <dl className="diagnostic-grid">
              <Diagnostic label="Pointer type" value={latest?.deviceType ?? 'n/a'} />
              <Diagnostic label="Pointer ID" value={latest?.pointerId ?? 'n/a'} />
              <Diagnostic label="Pressure" value={formatNumber(latest?.pressure)} />
              <Diagnostic label="Tilt X" value={formatNumber(latest?.tiltX)} />
              <Diagnostic label="Tilt Y" value={formatNumber(latest?.tiltY)} />
              <Diagnostic label="Twist" value={formatOptional(latest?.twist)} />
              <Diagnostic label="Button" value={latest?.button ?? 'n/a'} />
              <Diagnostic label="Buttons" value={latest?.buttons ?? 'n/a'} />
              <Diagnostic label="Contact" value={formatBoolean(latest?.isContact)} />
              <Diagnostic label="Eraser detected" value={formatBoolean(latest?.isEraser)} />
              <Diagnostic
                label="Coalesced samples received"
                value={view.rates.coalescedObserved ? 'yes' : 'no'}
              />
              <Diagnostic
                label="Coalesced API"
                value={view.capabilities.coalescedEventsApi ? 'available' : 'unavailable'}
              />
              <Diagnostic
                label="pointerrawupdate API"
                value={view.capabilities.pointerRawUpdateApi ? 'detected' : 'not detected'}
              />
              <Diagnostic
                label="Browser events / s"
                value={view.rates.browserEventsPerSecond}
              />
              <Diagnostic
                label="Incoming samples / s"
                value={view.rates.normalizedSamplesPerSecond}
              />
              <Diagnostic
                label="Processed samples / s"
                value={view.rates.processedSamplesPerSecond}
              />
              <Diagnostic
                label="Coalesced samples / s"
                value={view.rates.coalescedSamplesPerSecond}
              />
              <Diagnostic
                label="Tangential pressure"
                value={formatOptional(latest?.tangentialPressure)}
              />
              <Diagnostic label="Contact width" value={formatOptional(latest?.width)} />
              <Diagnostic label="Contact height" value={formatOptional(latest?.height)} />
              <Diagnostic
                label="Altitude angle"
                value={formatOptional(latest?.altitudeAngle)}
              />
              <Diagnostic
                label="Azimuth angle"
                value={formatOptional(latest?.azimuthAngle)}
              />
            </dl>
          </section>

          <section className="exercise-card">
            <h3>Quick checklist</h3>
            <ol>
              {GUIDED_TESTS.map((test) => (
                <li key={test.id}><strong>{test.title}:</strong> {test.instruction}</li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}

interface GuidedExerciseProps {
  readonly test: GuidedTestDefinition;
  readonly index: number;
  readonly feedback: HumanFeedback;
  readonly onFeedback: (feedback: HumanFeedback) => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onRetry: () => void;
  readonly onRestart: () => void;
  readonly onSkip?: (() => void) | undefined;
}

function GuidedExercise({
  test,
  index,
  feedback,
  onFeedback,
  onPrevious,
  onNext,
  onRetry,
  onRestart,
  onSkip,
}: GuidedExerciseProps) {
  return (
    <section className="guided-card" aria-live="polite">
      <div className="guided-heading">
        <div>
          <p className="step-count">Test {index + 1} of {GUIDED_TESTS.length}</p>
          <h3>{test.title}</h3>
          <p className="guided-instruction">{test.instruction}</p>
          {test.purpose !== undefined && <p className="guided-purpose">{test.purpose}</p>}
        </div>
        <button type="button" onClick={onRestart}>Restart test</button>
      </div>

      <FeedbackForTest testId={test.id} feedback={feedback} onFeedback={onFeedback} />

      <div className="guided-actions">
        <button type="button" onClick={onPrevious} disabled={index === 0}>Previous</button>
        <button type="button" onClick={onRetry}>Clear / retry this test</button>
        {onSkip !== undefined && <button type="button" onClick={onSkip}>Skip</button>}
        <button className="primary-action" type="button" onClick={onNext}>Next</button>
      </div>
    </section>
  );
}

function FeedbackForTest({
  testId,
  feedback,
  onFeedback,
}: {
  readonly testId: GuidedTestDefinition['id'];
  readonly feedback: HumanFeedback;
  readonly onFeedback: (feedback: HumanFeedback) => void;
}) {
  if (testId === 'fast-line') {
    return (
      <div className="feedback-grid">
        <ThreeWayQuestion
          label="Did the line visibly break?"
          value={feedback.fastLineBroke}
          onChange={(value) => onFeedback({ ...feedback, fastLineBroke: value })}
        />
        <ThreeWayQuestion
          label="Did drawing feel delayed?"
          value={feedback.noticeableLag}
          onChange={(value) => onFeedback({ ...feedback, noticeableLag: value })}
        />
      </div>
    );
  }

  if (testId === 'fast-circles') {
    return (
      <div className="feedback-grid">
        <ThreeWayQuestion
          label="Did the circles visibly break?"
          value={feedback.fastCirclesBroke}
          onChange={(value) => onFeedback({ ...feedback, fastCirclesBroke: value })}
        />
        <ThreeWayQuestion
          label="Did the page scroll or zoom while drawing?"
          value={feedback.browserGestureInterference}
          onChange={(value) => onFeedback({ ...feedback, browserGestureInterference: value })}
        />
      </div>
    );
  }

  if (testId === 'sharp-zigzags') {
    return (
      <ThreeWayQuestion
        label="Did the sharp corners look like what you drew?"
        value={feedback.sharpZigzagsCorrect}
        onChange={(value) => onFeedback({ ...feedback, sharpZigzagsCorrect: value })}
      />
    );
  }

  if (testId === 'tiny-handwriting') {
    return (
      <HandwritingQuestion
        label="Did the tiny handwriting look like what you wrote?"
        value={feedback.tinyHandwritingCorrect}
        onChange={(value) => onFeedback({ ...feedback, tinyHandwritingCorrect: value })}
      />
    );
  }

  return null;
}

function ThreeWayQuestion({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: ThreeWayAnswer | undefined;
  readonly onChange: (value: ThreeWayAnswer) => void;
}) {
  return (
    <fieldset className="feedback-question">
      <legend>{label}</legend>
      {(['yes', 'no', 'not-sure'] as const).map((choice) => (
        <label key={choice}>
          <input
            type="radio"
            checked={value === choice}
            onChange={() => onChange(choice)}
          />
          {choice === 'not-sure' ? 'Not sure' : choice === 'yes' ? 'Yes' : 'No'}
        </label>
      ))}
    </fieldset>
  );
}

function HandwritingQuestion({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: HandwritingAnswer | undefined;
  readonly onChange: (value: HandwritingAnswer) => void;
}) {
  return (
    <fieldset className="feedback-question">
      <legend>{label}</legend>
      {(['yes', 'no', 'sort-of'] as const).map((choice) => (
        <label key={choice}>
          <input
            type="radio"
            checked={value === choice}
            onChange={() => onChange(choice)}
          />
          {choice === 'sort-of' ? 'Sort of' : choice === 'yes' ? 'Yes' : 'No'}
        </label>
      ))}
    </fieldset>
  );
}

interface GuidedResultsProps {
  readonly results: readonly GuidedTestResult[];
  readonly capabilities: PointerInputCapabilities;
  readonly feedback: HumanFeedback;
  readonly browserLabel: string;
  readonly operatingSystemLabel: string;
  readonly notes: string;
  readonly report: string;
  readonly copyStatus: string;
  readonly onBrowserLabel: (value: string) => void;
  readonly onOperatingSystemLabel: (value: string) => void;
  readonly onNotes: (value: string) => void;
  readonly onCopy: () => void;
  readonly onDownload: () => void;
  readonly onRestart: () => void;
}

function GuidedResults({
  results,
  capabilities,
  feedback,
  browserLabel,
  operatingSystemLabel,
  notes,
  report,
  copyStatus,
  onBrowserLabel,
  onOperatingSystemLabel,
  onNotes,
  onCopy,
  onDownload,
  onRestart,
}: GuidedResultsProps) {
  const capability = calculateCapabilitySummary(results, capabilities, feedback);
  const aggregate = aggregateMeasurements(results);

  return (
    <section className="results-card">
      <div className="guided-heading">
        <div>
          <p className="step-count">Guided test complete</p>
          <h3>Capability summary</h3>
          <p className="guided-purpose">
            These statuses report only what this test observed. They do not diagnose missing
            hardware features.
          </p>
        </div>
        <button type="button" onClick={onRestart}>Restart test</button>
      </div>

      <dl className="capability-grid">
        <Diagnostic label="Pen detected" value={capability.penDetected} />
        <Diagnostic label="Pressure variation observed" value={capability.pressureVariationObserved} />
        <Diagnostic label="Tilt variation observed" value={capability.tiltVariationObserved} />
        <Diagnostic label="Twist variation observed" value={capability.twistVariationObserved} />
        <Diagnostic label="Eraser observed" value={capability.eraserObserved} />
        <Diagnostic label="Coalesced events observed" value={capability.coalescedEventsObserved} />
        <Diagnostic label="Pointer raw-update API available" value={capability.pointerRawUpdateAvailable} />
        <Diagnostic label="Browser gestures interfered" value={capability.browserGesturesInterfered} />
        <Diagnostic label="User noticed input lag" value={capability.userNoticedInputLag} />
        <Diagnostic
          label="Largest observed time gap"
          value={aggregate.largestTimeGapMs === null ? 'Not observed' : `${aggregate.largestTimeGapMs.toFixed(1)} ms`}
        />
        <Diagnostic
          label="Largest observed spatial gap"
          value={aggregate.largestSpatialGapPx === null ? 'Not observed' : `${aggregate.largestSpatialGapPx.toFixed(1)} px`}
        />
      </dl>

      <div className="environment-fields">
        <label>
          Browser (optional)
          <input
            type="text"
            value={browserLabel}
            onChange={(event) => onBrowserLabel(event.currentTarget.value)}
            placeholder="e.g. Chrome 142"
          />
        </label>
        <label>
          Operating system (optional)
          <input
            type="text"
            value={operatingSystemLabel}
            onChange={(event) => onOperatingSystemLabel(event.currentTarget.value)}
            placeholder="e.g. Windows 11"
          />
        </label>
        <label className="notes-field">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(event) => onNotes(event.currentTarget.value)}
            rows={3}
            placeholder="Anything you noticed while drawing."
          />
        </label>
      </div>

      <div className="report-actions">
        <button className="primary-action" type="button" onClick={onCopy}>Copy Test Report</button>
        <button type="button" onClick={onDownload}>Download .txt</button>
        {copyStatus.length > 0 && <span role="status">{copyStatus}</span>}
      </div>

      <pre className="report-preview">{report}</pre>
      <p className="privacy-note">
        This report and the drawing samples stay in this browser unless you copy or download them.
        No analytics or telemetry are sent.
      </p>
    </section>
  );
}

function Diagnostic({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CaptureSummary({ summary }: { readonly summary: DiagnosticCaptureSummary }) {
  return (
    <section className="capture-summary">
      <h3>Capture summary</h3>
      <dl className="diagnostic-grid">
        <Diagnostic label="Duration" value={`${(summary.durationMs / 1000).toFixed(2)} s`} />
        <Diagnostic
          label="Pointer type"
          value={summary.pointerTypes.length > 0 ? summary.pointerTypes.join(', ') : 'none'}
        />
        <Diagnostic label="Browser pointer events" value={summary.browserPointerEvents} />
        <Diagnostic label="Normalized samples" value={summary.normalizedSamples} />
        <Diagnostic label="Coalesced samples" value={summary.coalescedSamples} />
        <Diagnostic label="Average sample rate" value={`${summary.averageSampleRate.toFixed(1)} / s`} />
        <Diagnostic label="Maximum time gap" value={formatOptionalUnit(summary.maximumTimeGapMs, 'ms')} />
        <Diagnostic label="Maximum spatial gap" value={formatOptionalUnit(summary.maximumSpatialGapPx, 'px')} />
        <Diagnostic label="Pressure range" value={formatRange(summary.pressureRange)} />
        <Diagnostic label="Tilt X range" value={formatRange(summary.tiltXRange)} />
        <Diagnostic label="Tilt Y range" value={formatRange(summary.tiltYRange)} />
        <Diagnostic label="Twist changed" value={summary.twistChanged ? 'yes' : 'no'} />
        <Diagnostic label="Eraser observed" value={summary.eraserObserved ? 'yes' : 'no'} />
      </dl>
    </section>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to an in-document copy attempt below.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? 'n/a' : value.toFixed(3);
}

function formatOptional(value: number | null | undefined): string {
  return value === null || value === undefined ? 'n/a' : value.toFixed(3);
}

function formatBoolean(value: boolean | undefined): string {
  return value === undefined ? 'n/a' : value ? 'yes' : 'no';
}

function formatRange(range: readonly [number, number] | null): string {
  return range === null ? 'n/a' : `${range[0].toFixed(3)} to ${range[1].toFixed(3)}`;
}

function formatOptionalUnit(value: number | null, unit: string): string {
  return value === null ? 'n/a' : `${value.toFixed(1)} ${unit}`;
}
