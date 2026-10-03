import type {
  RecordedStroke,
  StrokePhase,
  StrokeSample,
  StrokeSettings,
  StrokeStatus,
} from './drawingTypes';

interface ActiveStroke {
  readonly id: number;
  readonly pointerId: number;
  readonly settings: StrokeSettings;
  readonly samples: StrokeSample[];
}

export class StrokeRecorder {
  private active: ActiveStroke | null = null;

  begin(
    id: number,
    pointerId: number,
    sample: Omit<StrokeSample, 'phase'>,
    settings: StrokeSettings,
  ): StrokeSample {
    if (this.active !== null) {
      throw new Error('A stroke is already active.');
    }

    const beginning = withPhase(sample, 'begin');
    this.active = {
      id,
      pointerId,
      settings: Object.freeze({ ...settings }),
      samples: [beginning],
    };
    return beginning;
  }

  append(sample: Omit<StrokeSample, 'phase'>): StrokeSample | null {
    if (this.active === null || sample.pointerId !== this.active.pointerId) {
      return null;
    }

    const continuation = withPhase(sample, 'continue');
    this.active.samples.push(continuation);
    return continuation;
  }

  finish(
    sample: Omit<StrokeSample, 'phase'>,
    status: StrokeStatus,
  ): RecordedStroke | null {
    if (this.active === null || sample.pointerId !== this.active.pointerId) {
      return null;
    }

    const terminal = withPhase(sample, status === 'ended' ? 'end' : 'cancel');
    this.active.samples.push(terminal);

    const completed: RecordedStroke = Object.freeze({
      id: this.active.id,
      pointerId: this.active.pointerId,
      settings: this.active.settings,
      samples: Object.freeze([...this.active.samples]),
      status,
    });
    this.active = null;
    return completed;
  }

  cancelWithoutSample(): RecordedStroke | null {
    if (this.active === null) {
      return null;
    }

    const last = this.active.samples[this.active.samples.length - 1];
    if (last === undefined) {
      this.active = null;
      return null;
    }

    return this.finish(
      {
        pointerId: last.pointerId,
        x: last.x,
        y: last.y,
        timestamp: last.timestamp,
        pressure: last.pressure,
        tiltX: last.tiltX,
        tiltY: last.tiltY,
        pointerType: last.pointerType,
        isContact: false,
      },
      'cancelled',
    );
  }

  isActive(): boolean {
    return this.active !== null;
  }

  activePointerId(): number | null {
    return this.active?.pointerId ?? null;
  }

  activeSampleCount(): number {
    return this.active?.samples.length ?? 0;
  }
}

function withPhase(
  sample: Omit<StrokeSample, 'phase'>,
  phase: StrokePhase,
): StrokeSample {
  return Object.freeze({ ...sample, phase });
}
