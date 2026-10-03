export type FirstSliceStage =
  | 'closed-shop'
  | 'opening-shop'
  | 'mira-intro'
  | 'mira-request'
  | 'commission-offer'
  | 'commission-accepted'
  | 'studio-lesson'
  | 'studio-drawing'
  | 'return-shop'
  | 'customer-reaction'
  | 'notebook-reveal'
  | 'complete'
  | 'feedback';

export interface FirstSliceState {
  readonly stage: FirstSliceStage;
  readonly startedAtMs: number;
  readonly completedAtMs: number | null;
  readonly submittedArtworkUrl: string | null;
}

export type FirstSliceEvent =
  | { readonly type: 'OPEN_SHOP' }
  | { readonly type: 'MIRA_ARRIVES' }
  | { readonly type: 'CONTINUE_MIRA_INTRO' }
  | { readonly type: 'VIEW_COMMISSION' }
  | { readonly type: 'ACCEPT_COMMISSION' }
  | { readonly type: 'GO_TO_STUDIO' }
  | { readonly type: 'START_DRAWING' }
  | { readonly type: 'SUBMIT_ARTWORK'; readonly artworkUrl: string | null }
  | { readonly type: 'HAND_ARTWORK_TO_MIRA' }
  | { readonly type: 'SHOW_NOTEBOOK' }
  | { readonly type: 'COMPLETE_SLICE'; readonly nowMs: number }
  | { readonly type: 'OPEN_FEEDBACK' }
  | { readonly type: 'RESTART'; readonly nowMs: number };

export function createFirstSliceState(startedAtMs: number): FirstSliceState {
  return Object.freeze({
    stage: 'closed-shop',
    startedAtMs,
    completedAtMs: null,
    submittedArtworkUrl: null,
  });
}

export function reduceFirstSlice(
  state: FirstSliceState,
  event: FirstSliceEvent,
): FirstSliceState {
  if (event.type === 'RESTART') {
    return createFirstSliceState(event.nowMs);
  }

  switch (state.stage) {
    case 'closed-shop':
      return event.type === 'OPEN_SHOP'
        ? withStage(state, 'opening-shop')
        : state;
    case 'opening-shop':
      return event.type === 'MIRA_ARRIVES'
        ? withStage(state, 'mira-intro')
        : state;
    case 'mira-intro':
      return event.type === 'CONTINUE_MIRA_INTRO'
        ? withStage(state, 'mira-request')
        : state;
    case 'mira-request':
      return event.type === 'VIEW_COMMISSION'
        ? withStage(state, 'commission-offer')
        : state;
    case 'commission-offer':
      return event.type === 'ACCEPT_COMMISSION'
        ? withStage(state, 'commission-accepted')
        : state;
    case 'commission-accepted':
      return event.type === 'GO_TO_STUDIO'
        ? withStage(state, 'studio-lesson')
        : state;
    case 'studio-lesson':
      return event.type === 'START_DRAWING'
        ? withStage(state, 'studio-drawing')
        : state;
    case 'studio-drawing':
      if (event.type !== 'SUBMIT_ARTWORK' || event.artworkUrl === null) {
        return state;
      }
      return Object.freeze({
        ...state,
        stage: 'return-shop',
        submittedArtworkUrl: event.artworkUrl,
      });
    case 'return-shop':
      return event.type === 'HAND_ARTWORK_TO_MIRA'
        ? withStage(state, 'customer-reaction')
        : state;
    case 'customer-reaction':
      return event.type === 'SHOW_NOTEBOOK'
        ? withStage(state, 'notebook-reveal')
        : state;
    case 'notebook-reveal':
      return event.type === 'COMPLETE_SLICE'
        ? Object.freeze({
            ...state,
            stage: 'complete',
            completedAtMs: Math.max(state.startedAtMs, event.nowMs),
          })
        : state;
    case 'complete':
      return event.type === 'OPEN_FEEDBACK'
        ? withStage(state, 'feedback')
        : state;
    case 'feedback':
      return state;
  }
}

export function completedLoop(state: FirstSliceState): boolean {
  return state.completedAtMs !== null;
}

function withStage(
  state: FirstSliceState,
  stage: FirstSliceStage,
): FirstSliceState {
  return Object.freeze({ ...state, stage });
}
