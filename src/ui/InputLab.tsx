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

  return (
    <section className="input-lab" aria-labelledby="input-lab-title">
      <header className="lab-header">
        <div>
          <p className="eyebrow">Build 02 engineering experiment</p>
          <h2 id="input-lab-title">Input Lab</h2>
          <p className="lab-copy">
            Use mouse, touch, or a stylus on the neutral surface. The trace is raw instrumentation:
            no smoothing, stabilization, or custom pressure curve.
          </p>
        </div>
        <div className="lab-controls">
          <button type="button" onClick={() => rendererRef.current.clear()}>Clear trace</button>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showSamplePoints}
              onChange={(event) => setShowSamplePoints(event.currentTarget.checked)}
            />
            Show sample points
          </label>
          {recording ? (
            <button type="button" onClick={stopCapture}>Stop Capture</button>
          ) : (
            <button type="button" onClick={startCapture}>Start Capture</button>
          )}
        </div>
      </header>

      <div className="lab-layout">
        <div>
          <div
            ref={surfaceRef}
            className="input-surface"
            aria-label="Pointer and stylus diagnostic surface"
          >
            <canvas ref={lineCanvasRef} className="trace-canvas" />
            <canvas ref={pointCanvasRef} className="trace-canvas sample-canvas" />
            <div className="surface-label">Pointer / stylus test surface</div>
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

          {summary !== null && <CaptureSummary summary={summary} />}
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
              <Diagnostic
                label="Contact width"
                value={formatOptional(latest?.width)}
              />
              <Diagnostic
                label="Contact height"
                value={formatOptional(latest?.height)}
              />
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
            <h3>Test exercises</h3>
            <ol>
              <li><strong>Slow line:</strong> draw one slow continuous line.</li>
              <li><strong>Fast line:</strong> draw quickly across the surface.</li>
              <li><strong>Fast circles:</strong> draw several fast circles.</li>
              <li><strong>Sharp zigzag:</strong> draw several sharp directional changes.</li>
              <li><strong>Pressure ramp:</strong> light, harder, then release gradually.</li>
              <li><strong>Tiny handwriting:</strong> write a small word or signature.</li>
              <li><strong>Tilt:</strong> if supported, change stylus angle while moving.</li>
              <li><strong>Eraser:</strong> if available, test the stylus eraser end.</li>
            </ol>
          </section>
        </aside>
      </div>
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
        <Diagnostic
          label="Average sample rate"
          value={`${summary.averageSampleRate.toFixed(1)} / s`}
        />
        <Diagnostic label="Pressure range" value={formatRange(summary.pressureRange)} />
        <Diagnostic label="Tilt X range" value={formatRange(summary.tiltXRange)} />
        <Diagnostic label="Tilt Y range" value={formatRange(summary.tiltYRange)} />
        <Diagnostic label="Twist changed" value={summary.twistChanged ? 'yes' : 'no'} />
        <Diagnostic label="Eraser observed" value={summary.eraserObserved ? 'yes' : 'no'} />
      </dl>
    </section>
  );
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
