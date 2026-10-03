import {
  BrowserPointerInputSource,
  type BrowserPointerBatch,
} from '../input/browserPointerInputSource';
import type { PointerSample } from '../input/pointerInput';
import { DrawingRenderer } from '../rendering/drawingRenderer';
import {
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  type BrushSample,
  type CompletedStroke,
  type DrawingTool,
  type PressureCurve,
  type ProcessingMode,
  type StabilizationMode,
  type StrokeSample,
  type StrokeSettings,
  type ViewTransform,
} from './drawingTypes';
import {
  DrawingDiagnostics,
  DrawingMeasurementRecorder,
  type DrawingDiagnosticsSnapshot,
  type DrawingMeasurementSummary,
} from './drawingDiagnostics';
import { StrokeHistory } from './history';
import { StrokeRecorder } from './strokeRecorder';
import { StrokeProcessor } from './strokeProcessor';
import {
  fitView,
  isPointInsideCanvas,
  panView,
  screenToCanvas,
  zoomViewAt,
} from './viewTransform';

type InteractionMode = DrawingTool | 'hand';

interface PanSession {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

interface ActivePipeline {
  readonly pointerId: number;
  readonly processor: StrokeProcessor;
  readonly brushSamples: BrushSample[];
  readonly settings: StrokeSettings;
}

export interface DrawingEngineSnapshot {
  readonly interactionMode: InteractionMode;
  readonly processing: ProcessingMode;
  readonly stabilization: StabilizationMode;
  readonly pressureCurve: PressureCurve;
  readonly baseSize: number;
  readonly zoom: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly diagnostics: DrawingDiagnosticsSnapshot;
}

export class DrawingEngine {
  private readonly renderer = new DrawingRenderer();
  private readonly source: BrowserPointerInputSource;
  private readonly recorder = new StrokeRecorder();
  private readonly history = new StrokeHistory(200);
  private readonly diagnostics = new DrawingDiagnostics();
  private readonly measurement = new DrawingMeasurementRecorder();
  private active: ActivePipeline | null = null;
  private panSession: PanSession | null = null;
  private interactionMode: InteractionMode = 'pencil';
  private processing: ProcessingMode = 'processed';
  private stabilization: StabilizationMode = 'low';
  private pressureCurve: PressureCurve = 'linear';
  private baseSize = 6;
  private view: ViewTransform = Object.freeze({ zoom: 1, panX: 0, panY: 0 });
  private dpr = 1;
  private nextStrokeId = 1;
  private resizeObserver: ResizeObserver | null = null;
  private unsubscribeBatch: (() => void) | null = null;
  private started = false;

  constructor(
    private readonly viewport: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.source = new BrowserPointerInputSource(viewport);
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.renderer.attach(this.canvas);
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.renderer.resize(DRAWING_WIDTH, DRAWING_HEIGHT, this.dpr);
    this.resetView();

    this.unsubscribeBatch = this.source.subscribeBatch((batch) => {
      this.consumeBatch(batch);
    });
    this.source.start();
    this.viewport.addEventListener('wheel', this.onWheel, { passive: false });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleViewportResize());
      this.resizeObserver.observe(this.viewport);
    } else {
      window.addEventListener('resize', this.handleViewportResize);
    }
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.source.stop();
    this.unsubscribeBatch?.();
    this.unsubscribeBatch = null;
    this.viewport.removeEventListener('wheel', this.onWheel);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.handleViewportResize);
    this.renderer.detach();
  }

  snapshot(now: number): DrawingEngineSnapshot {
    return Object.freeze({
      interactionMode: this.interactionMode,
      processing: this.processing,
      stabilization: this.stabilization,
      pressureCurve: this.pressureCurve,
      baseSize: this.baseSize,
      zoom: this.view.zoom,
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
      diagnostics: this.diagnostics.snapshot(now),
    });
  }

  recordFrame(now: number): void {
    this.diagnostics.recordFrame(now);
  }

  setInteractionMode(mode: InteractionMode): void {
    this.interactionMode = mode;
  }

  setProcessing(mode: ProcessingMode): void {
    this.processing = mode;
  }

  setStabilization(mode: StabilizationMode): void {
    this.stabilization = mode;
  }

  setPressureCurve(curve: PressureCurve): void {
    this.pressureCurve = curve;
  }

  setBaseSize(size: number): void {
    this.baseSize = Math.max(1, Math.min(32, size));
  }

  undo(): void {
    if (this.active !== null) {
      return;
    }
    if (this.history.undo() !== null) {
      this.renderer.redraw(this.history.strokes());
    }
  }

  redo(): void {
    if (this.active !== null) {
      return;
    }
    if (this.history.redo() !== null) {
      this.renderer.redraw(this.history.strokes());
    }
  }

  clear(): void {
    this.cancelActiveStroke();
    this.history.clear();
    this.renderer.clearDocument();
  }

  zoomIn(): void {
    this.zoomAtViewportCenter(1.2);
  }

  zoomOut(): void {
    this.zoomAtViewportCenter(1 / 1.2);
  }

  resetView(): void {
    const rect = this.viewport.getBoundingClientRect();
    this.view = fitView(rect.width, rect.height, DRAWING_WIDTH, DRAWING_HEIGHT);
    this.renderer.setView(this.view);
  }

  startMeasurement(now: number): void {
    this.measurement.start(now);
  }

  stopMeasurement(now: number): DrawingMeasurementSummary | null {
    return this.measurement.stop(now);
  }

  async exportPng(): Promise<Blob> {
    return await this.renderer.exportPng();
  }

  private consumeBatch(batch: BrowserPointerBatch): void {
    if (this.interactionMode === 'hand') {
      this.consumePanBatch(batch);
      return;
    }

    switch (batch.type) {
      case 'pointerdown':
        this.beginStroke(batch);
        break;
      case 'pointermove':
        this.continueStroke(batch);
        break;
      case 'pointerup':
        this.finishStroke(batch, 'ended');
        break;
      case 'pointercancel':
      case 'lostpointercapture':
        this.finishStroke(batch, 'cancelled');
        break;
      case 'pointerenter':
      case 'pointerleave':
        break;
    }
  }

  private beginStroke(batch: BrowserPointerBatch): void {
    if (this.active !== null || this.recorder.isActive()) {
      return;
    }

    const sample = batch.samples[0];
    if (sample === undefined) {
      return;
    }

    const converted = this.convertSample(sample, 'begin');
    if (!isPointInsideCanvas(converted, DRAWING_WIDTH, DRAWING_HEIGHT)) {
      return;
    }

    const selectedTool: DrawingTool =
      this.interactionMode === 'hand' ? 'pencil' : this.interactionMode;
    const tool: DrawingTool = sample.isEraser ? 'eraser' : selectedTool;
    const settings: StrokeSettings = Object.freeze({
      tool,
      processing: this.processing,
      stabilization: this.processing === 'raw' ? 'off' : this.stabilization,
      pressureCurve: this.pressureCurve,
      baseSize: this.baseSize,
    });

    const beginning = this.recorder.begin(
      this.nextStrokeId,
      sample.pointerId,
      withoutPhase(converted),
      settings,
    );
    this.nextStrokeId += 1;

    const processor = new StrokeProcessor(settings);
    const firstBrush = [...processor.start(beginning)];
    this.active = {
      pointerId: sample.pointerId,
      processor,
      brushSamples: firstBrush,
      settings,
    };

    this.recordInput(beginning);
    this.recordProcessed(firstBrush);
    const first = firstBrush[0];
    if (first !== undefined) {
      this.renderer.beginLiveStroke(tool, first);
      if (firstBrush.length > 1) {
        this.renderer.appendLiveSamples(firstBrush.slice(1));
      }
    }
  }

  private continueStroke(batch: BrowserPointerBatch): void {
    const active = this.active;
    if (active === null || batch.pointerId !== active.pointerId) {
      return;
    }

    const brushOutput: BrushSample[] = [];
    for (const sample of batch.samples) {
      const converted = this.convertSample(sample, 'continue');
      const recorded = this.recorder.append(withoutPhase(converted));
      if (recorded === null) {
        continue;
      }

      this.recordInput(recorded);
      const processed = active.processor.push(recorded);
      brushOutput.push(...processed);
      active.brushSamples.push(...processed);
      this.recordProcessed(processed);
    }

    this.renderer.appendLiveSamples(brushOutput);
  }

  private finishStroke(
    batch: BrowserPointerBatch,
    status: CompletedStroke['status'],
  ): void {
    const active = this.active;
    if (active === null || batch.pointerId !== active.pointerId) {
      return;
    }

    const terminalPointer = batch.samples[batch.samples.length - 1];
    if (terminalPointer === undefined) {
      this.cancelActiveStroke();
      return;
    }

    const phase = status === 'ended' ? 'end' : 'cancel';
    const converted = this.convertSample(terminalPointer, phase);
    const recorded = this.recorder.finish(withoutPhase(converted), status);
    if (recorded === null) {
      this.cancelActiveStroke();
      return;
    }

    const terminal = recorded.samples[recorded.samples.length - 1];
    if (terminal !== undefined) {
      this.recordInput(terminal);
      const processed = active.processor.finish(terminal);
      active.brushSamples.push(...processed);
      this.recordProcessed(processed);
      this.renderer.appendLiveSamples(processed);
    }
    this.renderer.endLiveStroke();

    const completed: CompletedStroke = Object.freeze({
      ...recorded,
      brushSamples: Object.freeze([...active.brushSamples]),
    });
    this.history.commit(completed);
    this.active = null;
    this.diagnostics.endStroke();
  }

  private consumePanBatch(batch: BrowserPointerBatch): void {
    const sample = batch.samples[batch.samples.length - 1];
    if (sample === undefined) {
      return;
    }

    if (batch.type === 'pointerdown') {
      this.panSession = {
        pointerId: sample.pointerId,
        x: sample.x,
        y: sample.y,
      };
      return;
    }

    if (
      batch.type === 'pointermove' &&
      this.panSession !== null &&
      this.panSession.pointerId === sample.pointerId
    ) {
      const deltaX = sample.x - this.panSession.x;
      const deltaY = sample.y - this.panSession.y;
      this.view = panView(this.view, deltaX, deltaY);
      this.renderer.setView(this.view);
      this.panSession = {
        pointerId: sample.pointerId,
        x: sample.x,
        y: sample.y,
      };
      return;
    }

    if (
      batch.type === 'pointerup' ||
      batch.type === 'pointercancel' ||
      batch.type === 'lostpointercapture'
    ) {
      this.panSession = null;
    }
  }

  private convertSample(
    sample: PointerSample,
    phase: StrokeSample['phase'],
  ): StrokeSample {
    const canvasPoint = screenToCanvas({ x: sample.x, y: sample.y }, this.view);
    return Object.freeze({
      pointerId: sample.pointerId,
      x: canvasPoint.x,
      y: canvasPoint.y,
      timestamp: sample.timestamp,
      pressure: sample.pressure,
      tiltX: sample.tiltX,
      tiltY: sample.tiltY,
      pointerType: sample.deviceType,
      isContact: sample.isContact,
      phase,
    });
  }

  private recordInput(sample: StrokeSample): void {
    this.diagnostics.recordInput(sample.timestamp);
    this.measurement.recordInput(sample);
  }

  private recordProcessed(samples: readonly BrushSample[]): void {
    for (const sample of samples) {
      this.diagnostics.recordProcessed(sample.timestamp);
    }
    this.measurement.recordProcessed(samples.length);
  }

  private cancelActiveStroke(): void {
    if (this.active === null) {
      return;
    }

    this.recorder.cancelWithoutSample();
    this.active = null;
    this.renderer.endLiveStroke();
    this.renderer.redraw(this.history.strokes());
    this.diagnostics.endStroke();
  }

  private zoomAtViewportCenter(factor: number): void {
    const rect = this.viewport.getBoundingClientRect();
    this.view = zoomViewAt(
      this.view,
      { x: rect.width / 2, y: rect.height / 2 },
      factor,
    );
    this.renderer.setView(this.view);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rect = this.viewport.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    this.view = zoomViewAt(this.view, point, event.deltaY < 0 ? 1.12 : 1 / 1.12);
    this.renderer.setView(this.view);
  };

  private readonly handleViewportResize = (): void => {
    const nextDpr = Math.max(1, window.devicePixelRatio || 1);
    if (Math.abs(nextDpr - this.dpr) > 0.001) {
      this.dpr = nextDpr;
      this.renderer.resize(DRAWING_WIDTH, DRAWING_HEIGHT, this.dpr);
      this.renderer.redraw(this.history.strokes());
    }
  };
}

function withoutPhase(
  sample: StrokeSample,
): Omit<StrokeSample, 'phase'> {
  return {
    pointerId: sample.pointerId,
    x: sample.x,
    y: sample.y,
    timestamp: sample.timestamp,
    pressure: sample.pressure,
    tiltX: sample.tiltX,
    tiltY: sample.tiltY,
    pointerType: sample.pointerType,
    isContact: sample.isContact,
  };
}
