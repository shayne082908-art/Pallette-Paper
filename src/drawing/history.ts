import type { CompletedStroke } from './drawingTypes';

export class StrokeHistory {
  private readonly completed: CompletedStroke[] = [];
  private readonly redoStack: CompletedStroke[] = [];

  constructor(private readonly limit = 200) {
    if (limit < 1) {
      throw new Error('History limit must be at least one stroke.');
    }
  }

  commit(stroke: CompletedStroke): void {
    this.completed.push(stroke);
    if (this.completed.length > this.limit) {
      this.completed.shift();
    }
    this.redoStack.length = 0;
  }

  undo(): CompletedStroke | null {
    const stroke = this.completed.pop() ?? null;
    if (stroke !== null) {
      this.redoStack.push(stroke);
    }
    return stroke;
  }

  redo(): CompletedStroke | null {
    const stroke = this.redoStack.pop() ?? null;
    if (stroke !== null) {
      this.completed.push(stroke);
    }
    return stroke;
  }

  clear(): void {
    this.completed.length = 0;
    this.redoStack.length = 0;
  }

  strokes(): readonly CompletedStroke[] {
    return this.completed;
  }

  canUndo(): boolean {
    return this.completed.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
