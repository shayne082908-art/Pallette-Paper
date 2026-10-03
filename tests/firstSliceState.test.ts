import { describe, expect, it } from 'vitest';
import {
  createFirstSliceState,
  reduceFirstSlice,
  type FirstSliceState,
} from '../src/gameplay/firstSliceState';

function advanceToStudioDrawing(): FirstSliceState {
  let state = createFirstSliceState(1000);
  state = reduceFirstSlice(state, { type: 'OPEN_SHOP' });
  state = reduceFirstSlice(state, { type: 'MIRA_ARRIVES' });
  state = reduceFirstSlice(state, { type: 'CONTINUE_MIRA_INTRO' });
  state = reduceFirstSlice(state, { type: 'VIEW_COMMISSION' });
  state = reduceFirstSlice(state, { type: 'ACCEPT_COMMISSION' });
  state = reduceFirstSlice(state, { type: 'GO_TO_STUDIO' });
  state = reduceFirstSlice(state, { type: 'START_DRAWING' });
  return state;
}

describe('Build 04 first slice state', () => {
  it('progresses from the closed shop through accepted commission into the Studio', () => {
    let state = createFirstSliceState(1000);
    expect(state.stage).toBe('closed-shop');

    state = reduceFirstSlice(state, { type: 'OPEN_SHOP' });
    expect(state.stage).toBe('opening-shop');

    state = reduceFirstSlice(state, { type: 'MIRA_ARRIVES' });
    state = reduceFirstSlice(state, { type: 'CONTINUE_MIRA_INTRO' });
    state = reduceFirstSlice(state, { type: 'VIEW_COMMISSION' });
    state = reduceFirstSlice(state, { type: 'ACCEPT_COMMISSION' });
    expect(state.stage).toBe('commission-accepted');

    state = reduceFirstSlice(state, { type: 'GO_TO_STUDIO' });
    expect(state.stage).toBe('studio-lesson');

    state = reduceFirstSlice(state, { type: 'START_DRAWING' });
    expect(state.stage).toBe('studio-drawing');
  });

  it('cannot submit the commission without an artwork snapshot', () => {
    const state = advanceToStudioDrawing();
    const unchanged = reduceFirstSlice(state, {
      type: 'SUBMIT_ARTWORK',
      artworkUrl: null,
    });

    expect(unchanged.stage).toBe('studio-drawing');
    expect(unchanged.submittedArtworkUrl).toBeNull();
  });

  it('retains the submitted artwork while returning to Mira', () => {
    let state = advanceToStudioDrawing();
    state = reduceFirstSlice(state, {
      type: 'SUBMIT_ARTWORK',
      artworkUrl: 'blob:submitted-plant',
    });

    expect(state.stage).toBe('return-shop');
    expect(state.submittedArtworkUrl).toBe('blob:submitted-plant');

    state = reduceFirstSlice(state, { type: 'HAND_ARTWORK_TO_MIRA' });
    state = reduceFirstSlice(state, { type: 'SHOW_NOTEBOOK' });

    expect(state.stage).toBe('notebook-reveal');
    expect(state.submittedArtworkUrl).toBe('blob:submitted-plant');
  });

  it('reaches completion and preserves the artwork snapshot', () => {
    let state = advanceToStudioDrawing();
    state = reduceFirstSlice(state, {
      type: 'SUBMIT_ARTWORK',
      artworkUrl: 'blob:plant',
    });
    state = reduceFirstSlice(state, { type: 'HAND_ARTWORK_TO_MIRA' });
    state = reduceFirstSlice(state, { type: 'SHOW_NOTEBOOK' });
    state = reduceFirstSlice(state, { type: 'COMPLETE_SLICE', nowMs: 361000 });

    expect(state.stage).toBe('complete');
    expect(state.completedAtMs).toBe(361000);
    expect(state.submittedArtworkUrl).toBe('blob:plant');
  });

  it('restart returns the slice to a clean closed-shop state', () => {
    let state = advanceToStudioDrawing();
    state = reduceFirstSlice(state, {
      type: 'SUBMIT_ARTWORK',
      artworkUrl: 'blob:plant',
    });
    state = reduceFirstSlice(state, { type: 'RESTART', nowMs: 9000 });

    expect(state).toEqual({
      stage: 'closed-shop',
      startedAtMs: 9000,
      completedAtMs: null,
      submittedArtworkUrl: null,
    });
  });

  it('ignores out-of-order events instead of skipping the authored loop', () => {
    const state = createFirstSliceState(0);
    const skipped = reduceFirstSlice(state, {
      type: 'SUBMIT_ARTWORK',
      artworkUrl: 'blob:should-not-work',
    });

    expect(skipped).toBe(state);
  });
});
