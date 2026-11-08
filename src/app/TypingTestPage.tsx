import { useState } from "react";
import { Controller } from "./Controller";
import type { AxisMapping } from "./axisMapping";
import type { ControlAction, DialConfig, GamepadSnapshot } from "../typing";
import { defaultBindings } from "../typing";
import { chooseTypingTestPrompt, scoreTypingTest } from "./typingTest";
import { useTimedRun, formatTime } from "./useTimedRun";
import "./pages.css";

type TypingTestPageProps = Readonly<{
  pad: GamepadSnapshot;
  leftConfig: DialConfig;
  rightConfig: DialConfig;
  activeLayerId: string;
  onActiveLayerChange: (layerId: string) => void;
  leftMapping: AxisMapping;
  rightMapping: AxisMapping;
  bindings: typeof defaultBindings;
  deadzone: number;
}>;

export function TypingTestPage({
  pad,
  leftConfig,
  rightConfig,
  activeLayerId,
  onActiveLayerChange,
  leftMapping,
  rightMapping,
  bindings,
  deadzone,
}: TypingTestPageProps) {
  const [prompt, setPrompt] = useState(chooseTypingTestPrompt);
  const { run, insert, backspace, finish, reset } = useTimedRun(prompt);
  const { text: typedText, result } = run;
  const resetRun = () => {
    const nextPrompt = chooseTypingTestPrompt();
    setPrompt(nextPrompt);
    reset(nextPrompt);
  };
  const handleActionInput = (action: ControlAction) => {
    if (action === "backspace") backspace();
    else if (action === "space") insert(" ");
    else if (action === "submit") finish();
    else if (action === "close" || (action === "enter" && result)) resetRun();
  };
  const displayedResult =
    result ?? scoreTypingTest(typedText, run.elapsed, run.prompt);

  return (
    <main className="page-shell typing-test-page">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Typing test</p>
          <h1>How fast can you type?</h1>
          <p>
            Type the sentence below with your controller. The timer starts with
            your first character.
          </p>
        </div>
        <span className="connection-badge">{pad.id}</span>
      </header>

      <section className="typing-test-page__card" aria-label="Typing test">
        <p className="typing-test-page__prompt">{run.prompt}</p>
        <div className="typing-test-page__progress" aria-live="polite">
          {typedText.length} / {run.prompt.length} characters
        </div>
        <div className="typing-test-page__input" aria-label="Your answer">
          {typedText || (
            <span className="practice-page__placeholder">
              Your answer will appear here.
            </span>
          )}
        </div>
        <div className="typing-test-page__stats">
          <div>
            <span>Time / 2:00</span>
            <strong>{formatTime(run.elapsed)}</strong>
          </div>
          <div>
            <span>Words per minute</span>
            <strong>{displayedResult.wordsPerMinute.toFixed(1)}</strong>
          </div>
          <div>
            <span>Character accuracy</span>
            <strong>{displayedResult.characterAccuracy.toFixed(1)}%</strong>
          </div>
        </div>
        {result ? (
          <div className="typing-test-page__complete" role="status">
            Test complete.
          </div>
        ) : (
          <p className="practice-page__note">
            Aim with either stick and return it to center to enter a character.
            Use Backspace to correct mistakes. Submit ends the run early; the
            limit is two minutes. Autocomplete is off.
          </p>
        )}
        {!result && (
          <button
            className="typing-test-page__reset"
            type="button"
            onClick={finish}
          >
            Submit run
          </button>
        )}
        <button
          className="typing-test-page__reset"
          type="button"
          onClick={resetRun}
        >
          {result ? "Try again" : "Reset"}
        </button>
      </section>

      <Controller
        pad={pad}
        value={typedText}
        onValueChange={() => {}}
        autocompleteEnabled={false}
        onCharacterInput={insert}
        onActionInput={handleActionInput}
        leftConfig={leftConfig}
        rightConfig={rightConfig}
        activeLayerId={activeLayerId}
        onActiveLayerChange={onActiveLayerChange}
        leftMapping={leftMapping}
        rightMapping={rightMapping}
        bindings={bindings}
        deadzone={deadzone}
        showDiagnostics={false}
      />
    </main>
  );
}
