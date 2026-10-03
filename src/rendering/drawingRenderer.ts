import type { CompletedStroke, BrushSample, DrawingTool, ViewTransform } from '../drawing/drawingTypes';
import { calculateBackingSize } from '../drawing/viewTransform';
import type { RenderingService } from './renderingBoundary';

export class DrawingRenderer implements RenderingService {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private cssWidth = 1;
  private cssHeight = 1;
  private dpr = 1;
  private livePrevious: BrushSample | null = null;
  private liveTool: DrawingTool = 'pencil';

  attach(surface: HTMLCanvasElement): void {
    this.canvas = surface;
    this.context = surface.getContext('2d');
    surface.style.transformOrigin = '0 0';
    surface.style.background = '#ffffff';
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    if (this.canvas === null || this.context === null) {
      return;
    }

    this.cssWidth = Math.max(1, width);
    this.cssHeight = Math.max(1, height);
    const backing = calculateBackingSize(this.cssWidth, this.cssHeight, devicePixelRatio);
    this.dpr = backing.dpr;
    this.canvas.width = backing.width;
    this.canvas.height = backing.height;
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.context.imageSmoothingEnabled = true;
    this.livePrevious = null;
  }

  setView(view: ViewTransform): void {
    if (this.canvas !== null) {
      this.canvas.style.transform =
        `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
    }
  }

  clearDocument(): void {
    if (this.context === null) {
      return;
    }

    this.context.save();
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.context.clearRect(0, 0, this.cssWidth, this.cssHeight);
    this.context.restore();
    this.livePrevious = null;
  }

  beginLiveStroke(tool: DrawingTool, first: BrushSample): void {
    this.liveTool = tool;
    this.livePrevious = null;
    this.drawDab(first, tool);
    this.livePrevious = first;
  }

  appendLiveSamples(samples: readonly BrushSample[]): void {
    for (const sample of samples) {
      if (this.livePrevious === null) {
        this.drawDab(sample, this.liveTool);
      } else {
        this.drawSegment(this.livePrevious, sample, this.liveTool);
      }
      this.livePrevious = sample;
    }
  }

  endLiveStroke(): void {
    this.livePrevious = null;
  }

  redraw(strokes: readonly CompletedStroke[]): void {
    this.clearDocument();
    for (const stroke of strokes) {
      this.drawCompletedStroke(stroke);
    }
  }

  async exportPng(): Promise<Blob> {
    if (this.canvas === null) {
      throw new Error('Drawing canvas is not attached.');
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.round(this.cssWidth);
    exportCanvas.height = Math.round(this.cssHeight);
    const exportContext = exportCanvas.getContext('2d');
    if (exportContext === null) {
      throw new Error('Unable to create PNG export context.');
    }

    exportContext.fillStyle = '#ffffff';
    exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportContext.drawImage(
      this.canvas,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
      0,
      0,
      exportCanvas.width,
      exportCanvas.height,
    );

    return await new Promise<Blob>((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (blob === null) {
          reject(new Error('PNG export failed.'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  }

  detach(): void {
    this.canvas = null;
    this.context = null;
    this.livePrevious = null;
  }

  private drawCompletedStroke(stroke: CompletedStroke): void {
    const first = stroke.brushSamples[0];
    if (first === undefined) {
      return;
    }

    this.drawDab(first, stroke.settings.tool);
    let previous = first;
    for (let index = 1; index < stroke.brushSamples.length; index += 1) {
      const sample = stroke.brushSamples[index];
      if (sample === undefined) {
        continue;
      }
      this.drawSegment(previous, sample, stroke.settings.tool);
      previous = sample;
    }
  }

  private drawDab(sample: BrushSample, tool: DrawingTool): void {
    const context = this.context;
    if (context === null) {
      return;
    }

    this.configureTool(context, tool);
    context.beginPath();
    context.arc(sample.x, sample.y, Math.max(0.25, sample.width / 2), 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
  }

  private drawSegment(
    previous: BrushSample,
    current: BrushSample,
    tool: DrawingTool,
  ): void {
    const context = this.context;
    if (context === null) {
      return;
    }

    this.configureTool(context, tool);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = Math.max(0.5, (previous.width + current.width) / 2);
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(current.x, current.y);
    context.stroke();

    context.beginPath();
    context.arc(current.x, current.y, Math.max(0.25, current.width / 2), 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
  }

  private configureTool(
    context: CanvasRenderingContext2D,
    tool: DrawingTool,
  ): void {
    context.globalCompositeOperation =
      tool === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = '#242424';
    context.fillStyle = '#242424';
    context.globalAlpha = 1;
  }
}
