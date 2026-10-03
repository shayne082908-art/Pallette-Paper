import { describe, expect, it } from 'vitest';
import { createFirstSliceState, reduceFirstSlice } from '../src/gameplay/firstSliceState';
import { createFirstSlicePlaytestReport } from '../src/gameplay/playtestReport';

describe('Build 04 playtest report', () => {
  it('includes only known completion timing plus supplied answers and notes', () => {
    let state = createFirstSliceState(1000);

    state = {
      ...state,
      stage: 'complete',
      completedAtMs: 361000,
      submittedArtworkUrl: 'blob:plant',
    };

    const report = createFirstSlicePlaytestReport(state, {
      shopFeeling: 'yes',
      wantedToHelpMira: 'sort-of',
      lessonMadeSense: 'yes',
      drawingIntegrated: 'yes',
      artworkMeaningful: 'yes',
      pacingProblems: 'no',
      wantedAnotherCustomer: 'maybe',
      favoriteMoment: 'Seeing the notebook.',
      notes: 'Mouse playthrough.',
    });

    expect(report).toContain('Completed full loop: Yes');
    expect(report).toContain('Time to complete: 6m 0s');
    expect(report).toContain('Shop felt convincing: Yes');
    expect(report).toContain('Wanted to help Mira: Sort of');
    expect(report).toContain('Wanted another customer: Maybe');
    expect(report).toContain('Favorite moment: Seeing the notebook.');
    expect(report).toContain('Notes: Mouse playthrough.');
    expect(report).not.toContain('Most confusing moment:');
  });

  it('labels unanswered core questions without inventing playtest feedback', () => {
    const state = createFirstSliceState(0);
    const report = createFirstSlicePlaytestReport(state, {});

    expect(report).toContain('Completed full loop: No');
    expect(report).toContain('Time to complete: Not completed');
    expect(report).toContain('Shop felt convincing: Not answered');
    expect(report).not.toContain('Favorite moment:');
  });

  it('keeps completion time after the feedback screen opens', () => {
    let state = createFirstSliceState(0);
    state = {
      ...state,
      stage: 'complete',
      completedAtMs: 420000,
      submittedArtworkUrl: 'blob:plant',
    };
    state = reduceFirstSlice(state, { type: 'OPEN_FEEDBACK' });

    expect(state.stage).toBe('feedback');
    expect(createFirstSlicePlaytestReport(state, {})).toContain('Time to complete: 7m 0s');
  });
});
