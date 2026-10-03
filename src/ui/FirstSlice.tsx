import { useEffect, useReducer, useRef, useState } from 'react';
import {
  createFirstSliceState,
  reduceFirstSlice,
  type FirstSliceEvent,
  type FirstSliceState,
} from '../gameplay/firstSliceState';
import {
  createFirstSlicePlaytestReport,
  type ContinueAnswer,
  type FirstSliceFeedback,
  type ThreeChoiceAnswer,
} from '../gameplay/playtestReport';
import { CommissionStudio } from './CommissionStudio';

interface FirstSliceProps {
  readonly onReturnToDevelopmentMenu: () => void;
}

export function FirstSlice({ onReturnToDevelopmentMenu }: FirstSliceProps) {
  const [state, dispatch] = useReducer(
    reduceFirstSlice,
    undefined,
    () => createFirstSliceState(performance.now()),
  );
  const artworkUrlRef = useRef<string | null>(null);
  const [feedback, setFeedback] = useState<FirstSliceFeedback>({});
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (state.stage !== 'opening-shop') {
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: 'MIRA_ARRIVES' });
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [state.stage]);

  useEffect(() => {
    return () => {
      if (artworkUrlRef.current !== null) {
        URL.revokeObjectURL(artworkUrlRef.current);
      }
    };
  }, []);

  const submitArtwork = (blob: Blob): void => {
    if (artworkUrlRef.current !== null) {
      URL.revokeObjectURL(artworkUrlRef.current);
    }
    const artworkUrl = URL.createObjectURL(blob);
    artworkUrlRef.current = artworkUrl;
    dispatch({ type: 'SUBMIT_ARTWORK', artworkUrl });
  };

  const restart = (): void => {
    if (artworkUrlRef.current !== null) {
      URL.revokeObjectURL(artworkUrlRef.current);
      artworkUrlRef.current = null;
    }
    setFeedback({});
    setCopyStatus('');
    dispatch({ type: 'RESTART', nowMs: performance.now() });
  };

  const returnToMenu = (): void => {
    if (artworkUrlRef.current !== null) {
      URL.revokeObjectURL(artworkUrlRef.current);
      artworkUrlRef.current = null;
    }
    onReturnToDevelopmentMenu();
  };

  return (
    <div className="first-slice">
      <GameTopBar onReturn={returnToMenu} />
      <main className="slice-stage">
        <StageView
          state={state}
          dispatch={dispatch}
          onSubmitArtwork={submitArtwork}
          onRestart={restart}
          onReturnToMenu={returnToMenu}
          feedback={feedback}
          onFeedback={setFeedback}
          copyStatus={copyStatus}
          onCopyStatus={setCopyStatus}
        />
      </main>
    </div>
  );
}

interface StageViewProps {
  readonly state: FirstSliceState;
  readonly dispatch: React.Dispatch<FirstSliceEvent>;
  readonly onSubmitArtwork: (blob: Blob) => void;
  readonly onRestart: () => void;
  readonly onReturnToMenu: () => void;
  readonly feedback: FirstSliceFeedback;
  readonly onFeedback: (feedback: FirstSliceFeedback) => void;
  readonly copyStatus: string;
  readonly onCopyStatus: (value: string) => void;
}

function StageView({
  state,
  dispatch,
  onSubmitArtwork,
  onRestart,
  onReturnToMenu,
  feedback,
  onFeedback,
  copyStatus,
  onCopyStatus,
}: StageViewProps) {
  switch (state.stage) {
    case 'closed-shop':
      return (
        <ShopFrame open={false} miraVisible={false}>
          <DialoguePanel speaker="Morning">
            <p>The paper shop is quiet, sun just starting to find the front window.</p>
            <h2>Ready for the morning?</h2>
            <button
              className="game-primary"
              type="button"
              onClick={() => dispatch({ type: 'OPEN_SHOP' })}
            >
              Open Shop
            </button>
          </DialoguePanel>
        </ShopFrame>
      );

    case 'opening-shop':
      return (
        <ShopFrame open miraVisible={false}>
          <DialoguePanel speaker="Shop">
            <p>The sign turns to OPEN. A paper mobile stirs above the counter.</p>
            <p className="quiet-line">A moment later, the door bell rings.</p>
          </DialoguePanel>
        </ShopFrame>
      );

    case 'mira-intro':
      return (
        <ShopFrame open miraVisible>
          <DialoguePanel speaker="Mira">
            <p>Morning. You do little original pieces, right?</p>
            <button
              className="game-primary"
              type="button"
              onClick={() => dispatch({ type: 'CONTINUE_MIRA_INTRO' })}
            >
              Continue
            </button>
          </DialoguePanel>
        </ShopFrame>
      );

    case 'mira-request':
      return (
        <ShopFrame open miraVisible>
          <DialoguePanel speaker="Mira">
            <p>
              I&apos;m binding a notebook for a friend. I want something small for the inside
              cover. Botanical, but not fussy.
            </p>
            <button
              className="game-primary"
              type="button"
              onClick={() => dispatch({ type: 'VIEW_COMMISSION' })}
            >
              Hear the request
            </button>
          </DialoguePanel>
        </ShopFrame>
      );

    case 'commission-offer':
      return (
        <ShopFrame open miraVisible>
          <section className="commission-card">
            <p className="game-kicker">Commission request</p>
            <h2>A Little Plant for a Friend</h2>
            <p>
              Draw a small original potted plant for the inside cover of Mira&apos;s handmade
              notebook.
            </p>
            <ul>
              <li>Subject: a small potted plant.</li>
              <li>Purpose: a handmade gift.</li>
              <li>Use your own shapes and details.</li>
              <li>Perfection is not expected.</li>
            </ul>
            <button
              className="game-primary"
              type="button"
              onClick={() => dispatch({ type: 'ACCEPT_COMMISSION' })}
            >
              Accept Commission
            </button>
          </section>
        </ShopFrame>
      );

    case 'commission-accepted':
      return (
        <ShopFrame open miraVisible>
          <DialoguePanel speaker="Mira">
            <p>Perfect. I like handmade things that look handmade.</p>
            <button
              className="game-primary"
              type="button"
              onClick={() => dispatch({ type: 'GO_TO_STUDIO' })}
            >
              Go to Studio
            </button>
          </DialoguePanel>
        </ShopFrame>
      );

    case 'studio-lesson':
      return (
        <StudioLesson onContinue={() => dispatch({ type: 'START_DRAWING' })} />
      );

    case 'studio-drawing':
      return <CommissionStudio onSubmit={onSubmitArtwork} />;

    case 'return-shop':
      return (
        <ShopFrame open miraVisible artworkUrl={state.submittedArtworkUrl}>
          <DialoguePanel speaker="Mira">
            <p>You&apos;re back. Let me see.</p>
            <button
              className="game-primary"
              type="button"
              onClick={() => dispatch({ type: 'HAND_ARTWORK_TO_MIRA' })}
            >
              Give Mira the drawing
            </button>
          </DialoguePanel>
        </ShopFrame>
      );

    case 'customer-reaction':
      return (
        <ShopFrame open miraVisible artworkUrl={state.submittedArtworkUrl}>
          <DialoguePanel speaker="Mira">
            <p>This is perfect for it. It actually feels like something made for her.</p>
            <button
              className="game-primary"
              type="button"
              onClick={() => dispatch({ type: 'SHOW_NOTEBOOK' })}
            >
              See where it goes
            </button>
          </DialoguePanel>
        </ShopFrame>
      );

    case 'notebook-reveal':
      return (
        <NotebookReveal
          artworkUrl={state.submittedArtworkUrl}
          onContinue={() =>
            dispatch({ type: 'COMPLETE_SLICE', nowMs: performance.now() })
          }
        />
      );

    case 'complete':
      return (
        <EndCard
          artworkUrl={state.submittedArtworkUrl}
          onRestart={onRestart}
          onReturnToMenu={onReturnToMenu}
          onFeedback={() => dispatch({ type: 'OPEN_FEEDBACK' })}
        />
      );

    case 'feedback':
      return (
        <FeedbackScreen
          state={state}
          artworkUrl={state.submittedArtworkUrl}
          feedback={feedback}
          onFeedback={onFeedback}
          copyStatus={copyStatus}
          onCopyStatus={onCopyStatus}
          onRestart={onRestart}
          onReturnToMenu={onReturnToMenu}
        />
      );
  }
}

function GameTopBar({ onReturn }: { readonly onReturn: () => void }) {
  return (
    <header className="game-topbar">
      <div>
        <span className="game-wordmark">Palette &amp; Paper</span>
        <span className="game-subtitle">First Morning</span>
      </div>
      <button type="button" onClick={onReturn}>Development Menu</button>
    </header>
  );
}

function ShopFrame({
  open,
  miraVisible,
  artworkUrl,
  children,
}: {
  readonly open: boolean;
  readonly miraVisible: boolean;
  readonly artworkUrl?: string | null | undefined;
  readonly children: React.ReactNode;
}) {
  return (
    <section className={`shop-scene ${open ? 'shop-open' : 'shop-closed'}`}>
      <div className="shop-window">
        <div className="awning" />
        <div className="window-light" />
        <span className="shop-sign">{open ? 'OPEN' : 'CLOSED'}</span>
      </div>

      <div className="supply-shelf shelf-left">
        <span className="supply-box coral" />
        <span className="supply-box moss" />
        <span className="supply-jar" />
        <span className="paper-stack" />
      </div>

      <div className="supply-shelf shelf-right">
        <span className="paper-roll" />
        <span className="supply-box ochre" />
        <span className="supply-jar short" />
        <span className="paper-stack tall" />
      </div>

      <div className="studio-door">
        <span>STUDIO</span>
        <div className="door-window" />
      </div>

      <div className="shop-counter">
        <div className="counter-top" />
        <div className="counter-drawer" />
        {artworkUrl !== undefined && artworkUrl !== null && (
          <img className="counter-artwork" src={artworkUrl} alt="Submitted plant drawing" />
        )}
      </div>

      <div className="shop-plant">
        <span className="leaf leaf-a" />
        <span className="leaf leaf-b" />
        <span className="leaf leaf-c" />
        <span className="shop-pot" />
      </div>

      {miraVisible && <MiraFigure />}

      <div className="shop-copy">{children}</div>
    </section>
  );
}

function MiraFigure() {
  return (
    <div className="mira-figure" aria-label="Mira, a customer">
      <div className="mira-hair" />
      <div className="mira-face" />
      <div className="mira-body" />
      <div className="mira-notebook" />
    </div>
  );
}

function DialoguePanel({
  speaker,
  children,
}: {
  readonly speaker: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="dialogue-panel">
      <p className="dialogue-speaker">{speaker}</p>
      <div className="dialogue-copy">{children}</div>
    </section>
  );
}

function StudioLesson({ onContinue }: { readonly onContinue: () => void }) {
  return (
    <section className="lesson-scene">
      <div className="lesson-paper">
        <p className="game-kicker">A very short studio lesson</p>
        <h2>Simplify the subject into big shapes.</h2>
        <p className="lesson-principle">
          Before drawing details, identify the largest simple shapes that make up the subject.
        </p>

        <div className="lesson-grid">
          <div className="lesson-reference">
            <MiniPlantReference />
          </div>
          <ol>
            <li><strong>Pot:</strong> one large container shape.</li>
            <li><strong>Plant mass:</strong> one larger organic shape.</li>
            <li><strong>Leaves:</strong> smaller shapes afterward.</li>
          </ol>
        </div>

        <div className="marlow-card">
          <span className="marlow-icon">M</span>
          <div>
            <strong>Marlow</strong>
            <p>Big shapes first. Details are greedy.</p>
            <p>Find the pot. Find the plant mass. Everything smaller can wait.</p>
          </div>
        </div>

        <button className="game-primary" type="button" onClick={onContinue}>
          Start Drawing
        </button>
      </div>
    </section>
  );
}

function MiniPlantReference() {
  return (
    <svg viewBox="0 0 240 260" role="img" aria-label="Simple reference drawing of a potted plant">
      <rect x="1" y="1" width="238" height="258" rx="24" fill="#f8f1df" stroke="#baa98c" />
      <path d="M82 166 L158 166 L146 226 Q120 238 94 226 Z" fill="#c77b61" />
      <path d="M120 168 C102 145 92 124 96 95 C100 66 112 43 120 34 C129 49 143 71 145 99 C147 125 137 148 120 168 Z" fill="#718b6a" />
      <path d="M116 154 C90 149 68 133 61 112 C84 105 105 116 117 137 Z" fill="#88a47d" />
      <path d="M125 145 C143 123 166 112 186 116 C181 139 158 155 132 158 Z" fill="#668360" />
      <path d="M112 118 C91 105 82 86 85 67 C105 70 120 84 123 105 Z" fill="#9ab18f" />
      <path d="M129 108 C139 82 157 67 176 65 C177 88 160 108 136 120 Z" fill="#7b9871" />
      <path d="M120 165 L121 87" stroke="#4e684a" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function NotebookReveal({
  artworkUrl,
  onContinue,
}: {
  readonly artworkUrl: string | null;
  readonly onContinue: () => void;
}) {
  return (
    <section className="notebook-scene">
      <div className="notebook-copy">
        <p className="game-kicker">A small place in the world</p>
        <h2>Mira opens the handmade notebook.</h2>
        <p>“There. That&apos;s where it belongs.”</p>
      </div>

      <div className="notebook">
        <div className="notebook-binding" />
        <div className="notebook-page notebook-page-left">
          <p>for a good friend</p>
          <span className="notebook-line" />
          <span className="notebook-line short" />
        </div>
        <div className="notebook-page notebook-page-right">
          {artworkUrl !== null && (
            <img
              className="notebook-artwork"
              src={artworkUrl}
              alt="Your submitted potted plant drawing displayed inside Mira's notebook"
            />
          )}
        </div>
      </div>

      <div className="reward-chip">First Commission Complete</div>
      <p className="memory-line">Mira will remember this.</p>
      <button className="game-primary" type="button" onClick={onContinue}>
        Finish Morning
      </button>
    </section>
  );
}

function EndCard({
  artworkUrl,
  onRestart,
  onReturnToMenu,
  onFeedback,
}: {
  readonly artworkUrl: string | null;
  readonly onRestart: () => void;
  readonly onReturnToMenu: () => void;
  readonly onFeedback: () => void;
}) {
  return (
    <section className="end-card">
      <p className="game-kicker">First Commission Complete</p>
      <h1>First Morning Complete</h1>
      {artworkUrl !== null && (
        <img className="end-artwork" src={artworkUrl} alt="Thumbnail of your submitted artwork" />
      )}
      <p>
        One customer, one lesson, one drawing that now lives inside a handmade notebook.
      </p>
      <div className="end-actions">
        <button className="game-primary" type="button" onClick={onFeedback}>
          Give Playtest Feedback
        </button>
        <button type="button" onClick={onRestart}>Play Again</button>
        <button type="button" onClick={onReturnToMenu}>Return to Development Menu</button>
      </div>
    </section>
  );
}

function FeedbackScreen({
  state,
  artworkUrl,
  feedback,
  onFeedback,
  copyStatus,
  onCopyStatus,
  onRestart,
  onReturnToMenu,
}: {
  readonly state: FirstSliceState;
  readonly artworkUrl: string | null;
  readonly feedback: FirstSliceFeedback;
  readonly onFeedback: (feedback: FirstSliceFeedback) => void;
  readonly copyStatus: string;
  readonly onCopyStatus: (value: string) => void;
  readonly onRestart: () => void;
  readonly onReturnToMenu: () => void;
}) {
  const report = createFirstSlicePlaytestReport(state, feedback);

  const copyReport = async (): Promise<void> => {
    const copied = await copyText(report);
    onCopyStatus(copied ? 'Report copied.' : 'Copy failed. Select the report text below.');
  };

  const downloadReport = (): void => {
    downloadBlob(
      new Blob([report], { type: 'text/plain;charset=utf-8' }),
      'palette-paper-build-04-playtest.txt',
    );
  };

  return (
    <section className="playtest-screen">
      <div className="playtest-heading">
        <div>
          <p className="game-kicker">First game playtest</p>
          <h1>How did the first morning feel?</h1>
          <p>No score, no telemetry. These answers stay here unless you copy or download them.</p>
        </div>
        {artworkUrl !== null && (
          <img className="feedback-artwork" src={artworkUrl} alt="Your submitted artwork" />
        )}
      </div>

      <div className="playtest-questions">
        <ThreeChoiceQuestion
          label="Did the opening feel like you were running a little creative shop?"
          value={feedback.shopFeeling}
          onChange={(value) => onFeedback({ ...feedback, shopFeeling: value })}
        />
        <ThreeChoiceQuestion
          label="Did Mira feel like someone you wanted to help?"
          value={feedback.wantedToHelpMira}
          onChange={(value) => onFeedback({ ...feedback, wantedToHelpMira: value })}
        />
        <ThreeChoiceQuestion
          label={'Did the "big shapes first" idea make sense while drawing?'}
          value={feedback.lessonMadeSense}
          onChange={(value) => onFeedback({ ...feedback, lessonMadeSense: value })}
        />
        <ThreeChoiceQuestion
          label="Did drawing feel like part of the game rather than a separate tool?"
          value={feedback.drawingIntegrated}
          onChange={(value) => onFeedback({ ...feedback, drawingIntegrated: value })}
        />
        <ThreeChoiceQuestion
          label="Did seeing your drawing inside Mira's notebook make the commission feel worthwhile?"
          value={feedback.artworkMeaningful}
          onChange={(value) => onFeedback({ ...feedback, artworkMeaningful: value })}
        />
        <YesNoQuestion
          label="Did anything feel slow or unnecessary?"
          value={feedback.pacingProblems}
          onChange={(value) => onFeedback({ ...feedback, pacingProblems: value })}
        />
        <ContinueQuestion
          label="Would you want another customer after this one?"
          value={feedback.wantedAnotherCustomer}
          onChange={(value) => onFeedback({ ...feedback, wantedAnotherCustomer: value })}
        />
      </div>

      <details className="optional-playtest-notes">
        <summary>Optional notes</summary>
        <div className="optional-note-grid">
          <TextQuestion
            label="Favorite moment"
            value={feedback.favoriteMoment ?? ''}
            onChange={(value) => onFeedback({ ...feedback, favoriteMoment: value })}
          />
          <TextQuestion
            label="Most confusing moment"
            value={feedback.confusingMoment ?? ''}
            onChange={(value) => onFeedback({ ...feedback, confusingMoment: value })}
          />
          <TextQuestion
            label="Anything that felt boring"
            value={feedback.boringMoment ?? ''}
            onChange={(value) => onFeedback({ ...feedback, boringMoment: value })}
          />
          <TextQuestion
            label="Anything that felt unexpectedly good"
            value={feedback.unexpectedlyGood ?? ''}
            onChange={(value) => onFeedback({ ...feedback, unexpectedlyGood: value })}
          />
          <label className="wide-note">
            Anything else
            <textarea
              rows={3}
              value={feedback.notes ?? ''}
              onChange={(event) => onFeedback({ ...feedback, notes: event.currentTarget.value })}
            />
          </label>
        </div>
      </details>

      <div className="report-actions">
        <button className="game-primary" type="button" onClick={() => void copyReport()}>
          Copy Playtest Report
        </button>
        <button type="button" onClick={downloadReport}>Download .txt</button>
        {copyStatus.length > 0 && <span role="status">{copyStatus}</span>}
      </div>

      <pre className="game-report-preview">{report}</pre>

      <div className="end-actions">
        <button type="button" onClick={onRestart}>Play Again</button>
        <button type="button" onClick={onReturnToMenu}>Return to Development Menu</button>
      </div>
    </section>
  );
}

function ThreeChoiceQuestion({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: ThreeChoiceAnswer | undefined;
  readonly onChange: (value: ThreeChoiceAnswer) => void;
}) {
  return (
    <fieldset className="game-question">
      <legend>{label}</legend>
      {(['yes', 'sort-of', 'no'] as const).map((choice) => (
        <label key={choice}>
          <input type="radio" checked={value === choice} onChange={() => onChange(choice)} />
          {choice === 'sort-of' ? 'Sort of' : choice === 'yes' ? 'Yes' : 'No'}
        </label>
      ))}
    </fieldset>
  );
}

function YesNoQuestion({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: 'yes' | 'no' | undefined;
  readonly onChange: (value: 'yes' | 'no') => void;
}) {
  return (
    <fieldset className="game-question">
      <legend>{label}</legend>
      {(['yes', 'no'] as const).map((choice) => (
        <label key={choice}>
          <input type="radio" checked={value === choice} onChange={() => onChange(choice)} />
          {choice === 'yes' ? 'Yes' : 'No'}
        </label>
      ))}
    </fieldset>
  );
}

function ContinueQuestion({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: ContinueAnswer | undefined;
  readonly onChange: (value: ContinueAnswer) => void;
}) {
  return (
    <fieldset className="game-question">
      <legend>{label}</legend>
      {(['yes', 'maybe', 'no'] as const).map((choice) => (
        <label key={choice}>
          <input type="radio" checked={value === choice} onChange={() => onChange(choice)} />
          {choice === 'maybe' ? 'Maybe' : choice === 'yes' ? 'Yes' : 'No'}
        </label>
      ))}
    </fieldset>
  );
}

function TextQuestion({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input type="text" value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to a local document copy attempt.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
