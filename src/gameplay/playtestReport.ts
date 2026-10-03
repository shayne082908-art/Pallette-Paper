import type { FirstSliceState } from './firstSliceState';

export type ThreeChoiceAnswer = 'yes' | 'sort-of' | 'no';
export type ContinueAnswer = 'yes' | 'maybe' | 'no';

export interface FirstSliceFeedback {
  readonly shopFeeling?: ThreeChoiceAnswer | undefined;
  readonly wantedToHelpMira?: ThreeChoiceAnswer | undefined;
  readonly lessonMadeSense?: ThreeChoiceAnswer | undefined;
  readonly drawingIntegrated?: ThreeChoiceAnswer | undefined;
  readonly artworkMeaningful?: ThreeChoiceAnswer | undefined;
  readonly pacingProblems?: 'yes' | 'no' | undefined;
  readonly wantedAnotherCustomer?: ContinueAnswer | undefined;
  readonly favoriteMoment?: string | undefined;
  readonly confusingMoment?: string | undefined;
  readonly boringMoment?: string | undefined;
  readonly unexpectedlyGood?: string | undefined;
  readonly notes?: string | undefined;
}

export function createFirstSlicePlaytestReport(
  state: FirstSliceState,
  feedback: FirstSliceFeedback,
): string {
  const lines = [
    'PALETTE & PAPER — BUILD 04 FIRST GAME PLAYTEST',
    '',
    `Completed full loop: ${state.completedAtMs === null ? 'No' : 'Yes'}`,
    `Time to complete: ${formatDuration(state)}`,
    '',
    `Shop felt convincing: ${formatThreeChoice(feedback.shopFeeling)}`,
    `Wanted to help Mira: ${formatThreeChoice(feedback.wantedToHelpMira)}`,
    `Lesson made sense: ${formatThreeChoice(feedback.lessonMadeSense)}`,
    `Drawing felt integrated with game: ${formatThreeChoice(feedback.drawingIntegrated)}`,
    `Artwork appearing in notebook felt meaningful: ${formatThreeChoice(feedback.artworkMeaningful)}`,
    `Pacing problems: ${formatYesNo(feedback.pacingProblems)}`,
    `Wanted another customer: ${formatContinue(feedback.wantedAnotherCustomer)}`,
  ];

  appendOptional(lines, 'Favorite moment', feedback.favoriteMoment);
  appendOptional(lines, 'Most confusing moment', feedback.confusingMoment);
  appendOptional(lines, 'Anything that felt boring', feedback.boringMoment);
  appendOptional(lines, 'Anything that felt unexpectedly good', feedback.unexpectedlyGood);
  appendOptional(lines, 'Notes', feedback.notes);

  return lines.join('\n');
}

function formatDuration(state: FirstSliceState): string {
  if (state.completedAtMs === null) {
    return 'Not completed';
  }

  const seconds = Math.max(
    0,
    Math.round((state.completedAtMs - state.startedAtMs) / 1000),
  );
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

function formatThreeChoice(value: ThreeChoiceAnswer | undefined): string {
  if (value === undefined) {
    return 'Not answered';
  }
  if (value === 'sort-of') {
    return 'Sort of';
  }
  return value === 'yes' ? 'Yes' : 'No';
}

function formatYesNo(value: 'yes' | 'no' | undefined): string {
  if (value === undefined) {
    return 'Not answered';
  }
  return value === 'yes' ? 'Yes' : 'No';
}

function formatContinue(value: ContinueAnswer | undefined): string {
  if (value === undefined) {
    return 'Not answered';
  }
  if (value === 'maybe') {
    return 'Maybe';
  }
  return value === 'yes' ? 'Yes' : 'No';
}

function appendOptional(
  lines: string[],
  label: string,
  value: string | undefined,
): void {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return;
  }
  lines.push(`${label}: ${trimmed}`);
}
