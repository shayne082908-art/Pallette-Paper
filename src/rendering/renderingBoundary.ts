/**
 * Imperative boundary for future high-frequency rendering.
 * Implementations own their update cadence and must not depend on React renders.
 */
export interface RenderingService {
  attach(surface: HTMLCanvasElement): void;
  resize(width: number, height: number, devicePixelRatio: number): void;
  detach(): void;
}
