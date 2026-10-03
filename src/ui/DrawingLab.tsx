import { useEffect, useRef, useState } from 'react';
import {
  DrawingEngine,
  type DrawingEngineSnapshot,
} from '../drawing/drawingEngine';
import type { DrawingMeasurementSummary } from '../drawing/drawingDiagnostics';
import {
  DRAWING_FEEL_TESTS,
  createDrawingTestReport,
  type DrawingFeelFeedback,
  type TestAnswer,
} from '../drawing/drawingFeelTest';

const EMPTY_SNAPSHOT: DrawingEngineSnapshot = {
  interactionMode: 'pencil',
  processing: 'processed',
  stabilization: 'low',
  pressureCurve: 'linear',
  baseSize: 6,
  zoom: 1,
  canUndo: false,
  canRedo: false,
  hasDrawingInput: false,
  diagnostics: {
    inputSamplesPerSecond: 0,
    processedSamplesPerSecond: 0,
    framesPerSecond: 0,
    activeStrokeSamples: 0,
  },
};

export function DrawingLab() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DrawingEngine | null>(null);

  const [snapshot, setSnapshot] = useState<DrawingEngineSnapshot>(EMPTY_SNAPSHOT);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [feelIndex, setFeelIndex] = useState<number | null>(null);
  const [feelComplete, setFeelComplete] = useState(false);
  const [measurement, setMeasurement] = useState<DrawingMeasurementSummary | null>(null);
  const [feedback, setFeedback] = useState<DrawingFeelFeedback>({});
  const [notes, setNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (viewport === null || canvas === null) {
      return;
    }

    const engine = new DrawingEngine(viewport, canvas);
    engineRef.current = engine;
    engine.start();
    setSnapshot(engine.snapshot(performance.now()));

    let frameId = 0;
    let lastUiUpdate = 0;
    const tick = (now: number): void => {
      engine.recordFrame(now);
      if (now - lastUiUpdate >= 100) {
        lastUiUpdate = now;
        setSnapshot(engine.snapshot(now));
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  const currentFeelTest =
    feelIndex === null ? null : DRAWING_FEEL_TESTS[feelIndex] ?? null;

  const refreshSnapshot = (): void => {
    const engine = engineRef.current;
    if (engine !== null) {
      setSnapshot(engine.snapshot(performance.now()));
    }
  };

  const apply = (action: (engine: DrawingEngine) => void): void => {
    const engine = engineRef.current;
    if (engine === null) {
      return;
    }
    action(engine);
    refreshSnapshot();
  };

  const runFeelTest = (): void => {
    const engine = engineRef.current;
    if (engine === null) {
      return;
    }

    engine.stopMeasurement(performance.now());
    engine.startMeasurement(performance.now());
    setMeasurement(null);
    setFeedback({});
    setNotes('');
    setCopyStatus('');
    setFeelComplete(false);
    setFeelIndex(0);
  };

  const nextFeelTest = (): void => {
    if (feelIndex === null) {
      return;
    }

    const nextIndex = feelIndex + 1;
    if (nextIndex < DRAWING_FEEL_TESTS.length) {
      setFeelIndex(nextIndex);
      return;
    }

    const engine = engineRef.current;
    setMeasurement(engine?.stopMeasurement(performance.now()) ?? null);
    setFeelIndex(null);
    setFeelComplete(true);
  };

  const previousFeelTest = (): void => {
    if (feelIndex !== null && feelIndex > 0) {
      setFeelIndex(feelIndex - 1);
    }
  };

  const report = feelComplete
    ? createDrawingTestReport({
        measurement,
        settings: {
          processing: snapshot.processing,
          stabilization: snapshot.stabilization,
          pressureCurve: snapshot.pressureCurve,
          brushSize: snapshot.baseSize,
        },
        feedback,
        notes,
      })
    : '';

  const copyReport = async (): Promise<void> => {
    const copied = await copyText(report);
    setCopyStatus(copied ? 'Report copied.' : 'Copy failed. Select the report below.');
  };

  const downloadReport = (): void => {
    downloadBlob(
      new Blob([report], { type: 'text/plain;charset=utf-8' }),
      'palette-paper-build-03-drawing-test.txt',
    );
  };

  const exportPng = async (): Promise<void> => {
    const engine = engineRef.current;
    if (engine === null) {
      return;
    }

    try {
      const png = await engine.exportPng();
      downloadBlob(png, 'palette-paper-build-03-drawing.png');
      setExportStatus('PNG exported.');
    } catch {
      setExportStatus('PNG export failed.');
    }
  };

  return (
    <section className="drawing-lab" aria-labelledby="drawing-lab-title">
      <header className="drawing-header">
        <div>
          <p className="eyebrow">Build 03 drawing-feel prototype</p>
          <h2 id="drawing-lab-title">Drawing Lab</h2>
          <p className="drawing-copy">
            One finite canvas, one Pencil Prototype, a basic eraser, and a small set of
            controls for comparing raw versus processed input. Drawing data stays local.
          </p>
        </div>
        <div className="drawing-header-actions">
          <button className="primary-action" type="button" onClick={runFeelTest}>
            Run Drawing Feel Test
          </button>
          <button type="button" onClick={() => void exportPng()}>Export PNG</button>
          {exportStatus.length > 0 && <span role="status">{exportStatus}</span>}
        </div>
      </header>

      <div className="drawing-toolbar" aria-label="Drawing controls">
        <div className="tool-group" aria-label="Tools">
          <button
            type="button"
            className={snapshot.interactionMode === 'pencil' ? 'active-tool' : ''}
            aria-pressed={snapshot.interactionMode === 'pencil'}
            onClick={() => apply((engine) => engine.setInteractionMode('pencil'))}
          >
            Pencil Prototype
          </button>
          <button
            type="button"
            className={snapshot.interactionMode === 'eraser' ? 'active-tool' : ''}
            aria-pressed={snapshot.interactionMode === 'eraser'}
            onClick={() => apply((engine) => engine.setInteractionMode('eraser'))}
          >
            Eraser
          </button>
          <button
            type="button"
            className={snapshot.interactionMode === 'hand' ? 'active-tool' : ''}
            aria-pressed={snapshot.interactionMode === 'hand'}
            onClick={() => apply((engine) => engine.setInteractionMode('hand'))}
          >
            Hand / Pan
          </button>
        </div>

        <div className="tool-group" aria-label="History">
          <button
            type="button"
            disabled={!snapshot.canUndo}
            onClick={() => apply((engine) => engine.undo())}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!snapshot.canRedo}
            onClick={() => apply((engine) => engine.redo())}
          >
            Redo
          </button>
          <button type="button" onClick={() => apply((engine) => engine.clear())}>
            Clear canvas
          </button>
        </div>

        <label className="compact-control">
          Processing
          <select
            value={snapshot.processing}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value === 'raw' || value === 'processed') {
                apply((engine) => engine.setProcessing(value));
              }
            }}
          >
            <option value="raw">Raw</option>
            <option value="processed">Processed</option>
          </select>
        </label>

        <label className="compact-control">
          Stabilization
          <select
            value={snapshot.stabilization}
            disabled={snapshot.processing === 'raw'}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value === 'off' || value === 'low' || value === 'medium') {
                apply((engine) => engine.setStabilization(value));
              }
            }}
          >
            <option value="off">Off</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
          </select>
        </label>

        <label className="compact-control">
          Pressure curve
          <select
            value={snapshot.pressureCurve}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value === 'linear' || value === 'soft' || value === 'firm') {
                apply((engine) => engine.setPressureCurve(value));
              }
            }}
          >
            <option value="linear">Raw / Linear</option>
            <option value="soft">Soft</option>
            <option value="firm">Firm</option>
          </select>
        </label>

        <label className="brush-size-control">
          Brush size
          <input
            type="range"
            min="1"
            max="24"
            step="0.5"
            value={snapshot.baseSize}
            onChange={(event) => {
              apply((engine) => engine.setBaseSize(Number(event.currentTarget.value)));
            }}
          />
          <span>{snapshot.baseSize.toFixed(1)} px</span>
        </label>

        <div className="tool-group" aria-label="View controls">
          <button type="button" onClick={() => apply((engine) => engine.zoomOut())}>
            Zoom −
          </button>
          <span className="zoom-readout">{Math.round(snapshot.zoom * 100)}%</span>
          <button type="button" onClick={() => apply((engine) => engine.zoomIn())}>
            Zoom +
          </button>
          <button type="button" onClick={() => apply((engine) => engine.resetView())}>
            Reset view
          </button>
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={showDiagnostics}
            onChange={(event) => setShowDiagnostics(event.currentTarget.checked)}
          />
          Diagnostics
        </label>
      </div>

      {currentFeelTest !== null && feelIndex !== null && (
        <section className="drawing-test-card" aria-live="polite">
          <div>
            <p className="step-count">
              Drawing Feel Test {feelIndex + 1} of {DRAWING_FEEL_TESTS.length}
            </p>
            <h3>{currentFeelTest.title}</h3>
            <p className="drawing-test-instruction">{currentFeelTest.instruction}</p>
            <p className="drawing-test-hint">
              You can change Raw/Processed, Stabilization, or Pressure curve above while testing.
            </p>
          </div>
          <div className="guided-actions">
            <button type="button" onClick={previousFeelTest} disabled={feelIndex === 0}>
              Previous
            </button>
            <button type="button" onClick={() => apply((engine) => engine.clear())}>
              Clear canvas
            </button>
            <button type="button" onClick={runFeelTest}>Restart test</button>
            <button className="primary-action" type="button" onClick={nextFeelTest}>
              Next
            </button>
          </div>
        </section>
      )}

      {feelComplete && (
        <DrawingTestResults
          measurement={measurement}
          snapshot={snapshot}
          feedback={feedback}
          notes={notes}
          report={report}
          copyStatus={copyStatus}
          onFeedback={setFeedback}
          onNotes={setNotes}
          onCopy={() => void copyReport()}
          onDownload={downloadReport}
          onRestart={runFeelTest}
        />
      )}

      <div ref={viewportRef} className="drawing-viewport" aria-label="Drawing canvas viewport">
        <canvas
          ref={canvasRef}
          className="drawing-document-canvas"
          aria-label="Finite white drawing canvas"
        />
      </div>

      {showDiagnostics && (
        <section className="drawing-diagnostics" aria-label="Drawing diagnostics">
          <h3>Drawing diagnostics</h3>
          <dl className="diagnostic-grid">
            <Diagnostic
              label="Input samples / s"
              value={snapshot.diagnostics.inputSamplesPerSecond}
            />
            <Diagnostic
              label="Processed samples / s"
              value={snapshot.diagnostics.processedSamplesPerSecond}
            />
            <Diagnostic
              label="Approx. render FPS"
              value={snapshot.diagnostics.framesPerSecond}
            />
            <Diagnostic
              label="Active stroke samples"
              value={snapshot.diagnostics.activeStrokeSamples}
            />
            <Diagnostic label="Processing" value={snapshot.processing} />
            <Diagnostic label="Stabilization" value={snapshot.stabilization} />
            <Diagnostic label="Pressure curve" value={snapshot.pressureCurve} />
          </dl>
        </section>
      )}
    </section>
  );
}

interface DrawingTestResultsProps {
  readonly measurement: DrawingMeasurementSummary | null;
  readonly snapshot: DrawingEngineSnapshot;
  readonly feedback: DrawingFeelFeedback;
  readonly notes: string;
  readonly report: string;
  readonly copyStatus: string;
  readonly onFeedback: (feedback: DrawingFeelFeedback) => void;
  readonly onNotes: (notes: string) => void;
  readonly onCopy: () => void;
  readonly onDownload: () => void;
  readonly onRestart: () => void;
}

function DrawingTestResults({
  measurement,
  snapshot,
  feedback,
  notes,
  report,
  copyStatus,
  onFeedback,
  onNotes,
  onCopy,
  onDownload,
  onRestart,
}: DrawingTestResultsProps) {
  return (
    <section className="drawing-test-results">
      <div className="guided-heading">
        <div>
          <p className="step-count">Drawing Feel Test complete</p>
          <h3>Human observations</h3>
          <p className="drawing-test-hint">
            There is no automatic score. These answers are the evidence for reviewing drawing feel.
          </p>
        </div>
        <button type="button" onClick={onRestart}>Restart test</button>
      </div>

      <div className="drawing-question-grid">
        <YesNoQuestion label="Did the pen feel immediate?" value={feedback.immediate} onChange={(value) => onFeedback({ ...feedback, immediate: value })} />
        <YesNoQuestion label="Did strokes visibly break?" value={feedback.strokesBroke} onChange={(value) => onFeedback({ ...feedback, strokesBroke: value })} />
        <YesNoQuestion label="Did small handwriting behave correctly?" value={feedback.handwritingWorked} onChange={(value) => onFeedback({ ...feedback, handwritingWorked: value })} />
        <YesNoQuestion label="Did stabilization feel helpful?" value={feedback.stabilizationHelpful} onChange={(value) => onFeedback({ ...feedback, stabilizationHelpful: value })} />
        <YesNoQuestion label="Did stabilization feel delayed?" value={feedback.stabilizationDelayed} onChange={(value) => onFeedback({ ...feedback, stabilizationDelayed: value })} />
        <YesNoQuestion label="Did pressure feel controllable?" value={feedback.pressureControllable} onChange={(value) => onFeedback({ ...feedback, pressureControllable: value })} />
        <YesNoQuestion label="Did undo/redo behave correctly?" value={feedback.undoRedoWorked} onChange={(value) => onFeedback({ ...feedback, undoRedoWorked: value })} />
        <YesNoQuestion label="Did panning/zooming interfere with drawing?" value={feedback.navigationInterfered} onChange={(value) => onFeedback({ ...feedback, navigationInterfered: value })} />
        <YesNoQuestion label="Would you willingly sketch with this for a few minutes?" value={feedback.willingToSketch} onChange={(value) => onFeedback({ ...feedback, willingToSketch: value })} />
      </div>

      <dl className="capability-grid drawing-measurements">
        <Diagnostic
          label="Pointer type"
          value={measurement?.pointerTypes.join(', ') || 'Not observed'}
        />
        <Diagnostic
          label="Pressure range"
          value={
            measurement?.pressureRange === null || measurement?.pressureRange === undefined
              ? 'Not observed'
              : `${measurement.pressureRange[0].toFixed(3)} to ${measurement.pressureRange[1].toFixed(3)}`
          }
        />
        <Diagnostic
          label="Approx. input samples / s"
          value={measurement?.averageInputSamplesPerSecond.toFixed(1) ?? 'Not observed'}
        />
        <Diagnostic
          label="Approx. processed samples / s"
          value={measurement?.averageProcessedSamplesPerSecond.toFixed(1) ?? 'Not observed'}
        />
        <Diagnostic
          label="Largest input gap"
          value={
            measurement?.largestInputGapMs === null || measurement?.largestInputGapMs === undefined
              ? 'Not observed'
              : `${measurement.largestInputGapMs.toFixed(1)} ms`
          }
        />
        <Diagnostic label="Processing" value={snapshot.processing} />
        <Diagnostic label="Stabilization" value={snapshot.stabilization} />
        <Diagnostic label="Pressure curve" value={snapshot.pressureCurve} />
        <Diagnostic label="Brush size" value={`${snapshot.baseSize.toFixed(1)} px`} />
      </dl>

      <label className="drawing-notes">
        Notes (optional)
        <textarea
          value={notes}
          rows={3}
          onChange={(event) => onNotes(event.currentTarget.value)}
          placeholder="Anything that felt especially good, bad, delayed, broken, or surprising."
        />
      </label>

      <div className="report-actions">
        <button className="primary-action" type="button" onClick={onCopy}>
          Copy Drawing Test Report
        </button>
        <button type="button" onClick={onDownload}>Download .txt</button>
        {copyStatus.length > 0 && <span role="status">{copyStatus}</span>}
      </div>

      <pre className="report-preview">{report}</pre>
      <p className="privacy-note">
        Test results and artwork stay local unless you explicitly copy, download, or export them.
      </p>
    </section>
  );
}

function YesNoQuestion({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: TestAnswer | undefined;
  readonly onChange: (value: TestAnswer) => void;
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

function Diagnostic({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the local document copy path.
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

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
