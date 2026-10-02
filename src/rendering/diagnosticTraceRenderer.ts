import type { PointerSample } from '../input/pointerInput';
import type { RenderingService } from './renderingBoundary';

interface TracePoint {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
}

export class DiagnosticTraceRenderer implements RenderingService {
  private lineCanvas: HTMLCanvasElement | null = null;
  private pointCanvas: HTMLCanvasElement | null = null;
  private lineContext: CanvasRenderingContext2D | null = null;
  private pointContext: CanvasRenderingContext2D | null = null;
  private readonly previousByPointer = new Map<number, TracePoint>();
  private cssWidth = 0;
  private cssHeight = 0;
  private samplePointsVisible = false;

  attach(surface: HTMLCanvasElement): void {
    this.lineCanvas = surface;
    this.lineContext = surface.getContext('2d');
  }

  attachSampleOverlay(surface: HTMLCanvasElement): void {
    this.pointCanvas = surface;
    this.pointContext = surface.getContext('2d');
    this.applySamplePointVisibility();
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.cssWidth = Math.max(1, width);
    this.cssHeight = Math.max(1, height);
    const ratio = Math.max(1, devicePixelRatio);

    this.resizeCanvas(this.lineCanvas, this.lineContext, ratio);
    this.resizeCanvas(this.pointCanvas, this.pointContext, ratio);
    this.previousByPointer.clear();
  }

  consume(sample: PointerSample): void {
    if (!sample.isContact) {
      this.previousByPointer.delete(sample.pointerId);
      return;
    }

    const point: TracePoint = {
      x: sample.x,
      y: sample.y,
      pressure: sample.pressure,
    };
    const previous = this.previousByPointer.get(sample.pointerId);

    if (this.lineContext !== null) {
      const width = pressureWidth(sample.pressure);
      this.lineContext.strokeStyle = '#252525';
      this.lineContext.fillStyle = '#252525';
      this.lineContext.lineCap = 'round';
      this.lineContext.lineJoin = 'round';

      if (previous === undefined) {
        this.lineContext.beginPath();
        this.lineContext.arc(point.x, point.y, width / 2, 0, Math.PI * 2);
        this.lineContext.fill();
      } else {
        this.lineContext.beginPath();
        this.lineContext.moveTo(previous.x, previous.y);
        this.lineContext.lineTo(point.x, point.y);
        this.lineContext.lineWidth = width;
        this.lineContext.stroke();
      }
    }

    if (this.pointContext !== null) {
      this.pointContext.fillStyle = '#8f3d2f';
      this.pointContext.beginPath();
      this.pointContext.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
      this.pointContext.fill();
    }

    this.previousByPointer.set(sample.pointerId, point);
  }

  setSamplePointsVisible(visible: boolean): void {
    this.samplePointsVisible = visible;
    this.applySamplePointVisibility();
  }

  clear(): void {
    this.clearContext(this.lineContext);
    this.clearContext(this.pointContext);
    this.previousByPointer.clear();
  }

  detach(): void {
    this.lineCanvas = null;
    this.pointCanvas = null;
    this.lineContext = null;
    this.pointContext = null;
    this.previousByPointer.clear();
  }

  private resizeCanvas(
    canvas: HTMLCanvasElement | null,
    context: CanvasRenderingContext2D | null,
    ratio: number,
  ): void {
    if (canvas === null || context === null) {
      return;
    }

    canvas.width = Math.max(1, Math.round(this.cssWidth * ratio));
    canvas.height = Math.max(1, Math.round(this.cssHeight * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private clearContext(context: CanvasRenderingContext2D | null): void {
    if (context === null) {
      return;
    }

    context.clearRect(0, 0, this.cssWidth, this.cssHeight);
  }

  private applySamplePointVisibility(): void {
    if (this.pointCanvas !== null) {
      this.pointCanvas.style.visibility = this.samplePointsVisible ? 'visible' : 'hidden';
    }
  }
}

function pressureWidth(pressure: number): number {
  return 1 + pressure * 8;
}
