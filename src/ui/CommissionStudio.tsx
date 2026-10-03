import { useEffect, useRef, useState } from 'react';
import {
  DrawingEngine,
  type DrawingEngineSnapshot,
} from '../drawing/drawingEngine';

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

interface CommissionStudioProps {
  readonly onSubmit: (artwork: Blob) => void;
}

export function CommissionStudio({ onSubmit }: CommissionStudioProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DrawingEngine | null>(null);

  const [snapshot, setSnapshot] = useState<DrawingEngineSnapshot>(EMPTY_SNAPSHOT);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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

  const apply = (action: (engine: DrawingEngine) => void): void => {
    const engine = engineRef.current;
    if (engine === null) {
      return;
    }
    action(engine);
    setSnapshot(engine.snapshot(performance.now()));
  };

  const submitArtwork = async (): Promise<void> => {
    const engine = engineRef.current;
    if (engine === null || !engine.snapshot(performance.now()).hasDrawingInput) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const artwork = await engine.exportPng();
      onSubmit(artwork);
    } catch {
      setSubmitError('Could not capture the drawing. Keep drawing and try again.');
      setSubmitting(false);
      setConfirming(false);
    }
  };

  return (
    <section className="game-studio" aria-labelledby="commission-title">
      <div className="studio-brief">
        <div>
          <p className="game-kicker">Commission</p>
          <h2 id="commission-title">A Little Plant for a Friend</h2>
          <p>
            Mira wants a small original potted plant drawing for the inside cover of a
            handmade notebook. It does not need to be perfect.
          </p>
        </div>
        <ol className="commission-steps">
          <li>Block in the pot.</li>
          <li>Add the main plant shape.</li>
          <li>Add whatever details you want.</li>
        </ol>
      </div>

      <div className="studio-layout">
        <aside className="reference-card" aria-label="Potted plant reference">
          <p className="game-kicker">Reference</p>
          <PlantReference />
          <div className="marlow-note">
            <strong>Marlow</strong>
            <span>Big shapes first. Details are greedy.</span>
          </div>
        </aside>

        <div className="studio-workspace">
          <div className="game-drawing-toolbar" aria-label="Commission drawing tools">
            <div className="game-tool-group">
              <button
                type="button"
                className={snapshot.interactionMode === 'pencil' ? 'game-tool-active' : ''}
                aria-pressed={snapshot.interactionMode === 'pencil'}
                onClick={() => apply((engine) => engine.setInteractionMode('pencil'))}
              >
                Pencil
              </button>
              <button
                type="button"
                className={snapshot.interactionMode === 'eraser' ? 'game-tool-active' : ''}
                aria-pressed={snapshot.interactionMode === 'eraser'}
                onClick={() => apply((engine) => engine.setInteractionMode('eraser'))}
              >
                Eraser
              </button>
              <button
                type="button"
                className={snapshot.interactionMode === 'hand' ? 'game-tool-active' : ''}
                aria-pressed={snapshot.interactionMode === 'hand'}
                onClick={() => apply((engine) => engine.setInteractionMode('hand'))}
              >
                Pan
              </button>
            </div>

            <div className="game-tool-group">
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
            </div>

            <label className="game-brush-control">
              Brush
              <input
                type="range"
                min="1"
                max="18"
                step="0.5"
                value={snapshot.baseSize}
                onChange={(event) =>
                  apply((engine) => engine.setBaseSize(Number(event.currentTarget.value)))
                }
              />
              <span>{snapshot.baseSize.toFixed(1)} px</span>
            </label>

            <div className="game-tool-group">
              <button type="button" onClick={() => apply((engine) => engine.zoomOut())}>
                −
              </button>
              <span>{Math.round(snapshot.zoom * 100)}%</span>
              <button type="button" onClick={() => apply((engine) => engine.zoomIn())}>
                +
              </button>
              <button type="button" onClick={() => apply((engine) => engine.resetView())}>
                Reset view
              </button>
            </div>
          </div>

          <div
            ref={viewportRef}
            className="game-drawing-viewport"
            aria-label="Commission drawing area"
          >
            <canvas
              ref={canvasRef}
              className="drawing-document-canvas"
              aria-label="Commission artwork canvas"
            />
          </div>

          <div className="studio-submit-row">
            <span className="studio-hint">
              {snapshot.hasDrawingInput
                ? 'Whenever it feels finished enough, Mira is waiting.'
                : 'Make at least one pencil mark before submitting.'}
            </span>
            <button
              className="game-primary"
              type="button"
              disabled={!snapshot.hasDrawingInput}
              onClick={() => setConfirming(true)}
            >
              I&apos;m Done
            </button>
          </div>
          {submitError.length > 0 && <p role="alert">{submitError}</p>}
        </div>
      </div>

      {confirming && (
        <div className="game-modal-backdrop" role="presentation">
          <section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title">
            <p className="game-kicker">Commission handoff</p>
            <h3 id="submit-title">Give this drawing to Mira?</h3>
            <p>You can keep drawing if there is anything else you want to add.</p>
            <div className="game-dialog-actions">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirming(false)}
              >
                Keep Drawing
              </button>
              <button
                className="game-primary"
                type="button"
                disabled={submitting}
                onClick={() => void submitArtwork()}
              >
                {submitting ? 'Preparing drawing…' : 'Submit'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function PlantReference() {
  return (
    <svg
      className="plant-reference"
      viewBox="0 0 240 260"
      role="img"
      aria-label="Simple potted plant reference made from large shapes"
    >
      <rect x="1" y="1" width="238" height="258" rx="24" fill="#f7f0df" stroke="#b8a98e" />
      <path d="M82 166 L158 166 L146 226 Q120 238 94 226 Z" fill="#c77b61" />
      <path d="M120 168 C102 145 92 124 96 95 C100 66 112 43 120 34 C129 49 143 71 145 99 C147 125 137 148 120 168 Z" fill="#718b6a" />
      <path d="M116 154 C90 149 68 133 61 112 C84 105 105 116 117 137 Z" fill="#88a47d" />
      <path d="M125 145 C143 123 166 112 186 116 C181 139 158 155 132 158 Z" fill="#668360" />
      <path d="M112 118 C91 105 82 86 85 67 C105 70 120 84 123 105 Z" fill="#9ab18f" />
      <path d="M129 108 C139 82 157 67 176 65 C177 88 160 108 136 120 Z" fill="#7b9871" />
      <path d="M120 165 L121 87" stroke="#4e684a" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="120" cy="231" rx="54" ry="8" fill="#6b5a4933" />
    </svg>
  );
}
