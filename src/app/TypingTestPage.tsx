import { useEffect, useState } from "react";
import { Controller } from "./Controller";
import type { AxisMapping } from "./axisMapping";
import type { ControlAction, DialConfig, GamepadSnapshot } from "../typing";
import { defaultBindings } from "../typing";
import {
  scoreTypingTest,
  typingTestPrompt,
  type TypingTestResult,
} from "./typingTest";
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
  const [typedText, setTypedText] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [result, setResult] = useState<TypingTestResult | null>(null);

  const reset = () => {
    setTypedText("");
    setStartedAt(null);
    setElapsedMilliseconds(0);
    setResult(null);
  };

  useEffect(() => {
    if (startedAt === null || result) return;
    const timer = window.setInterval(() => {
      setElapsedMilliseconds(performance.now() - startedAt);
    }, 100);
    return () => window.clearInterval(timer);
  }, [result, startedAt]);

  const updateText = (nextText: string) => {
    if (result || nextText.length > typingTestPrompt.length) return;

    const now = performance.now();
    const nextStartedAt = startedAt ?? now;
    if (startedAt === null) {
      setStartedAt(nextStartedAt);
    }
    setElapsedMilliseconds(now - nextStartedAt);
    setTypedText(nextText);

    if (nextText.length === typingTestPrompt.length) {
      setResult(scoreTypingTest(nextText, now - nextStartedAt));
    }
  };

  const handleActionInput = (action: ControlAction) => {
    if (action === "backspace" && typedText.length > 0) {
      updateText(typedText.slice(0, -1));
    } else if (action === "space") {
      updateText(`${typedText} `);
    }
  };

  const handleSuggestionChange = (value: string) => {
    const wordStart = typedText.lastIndexOf(" ") + 1;
    updateText(`${typedText.slice(0, wordStart)}${value}`);
  };

  const currentWordStart = typedText.lastIndexOf(" ") + 1;
  const currentWord = typedText.slice(currentWordStart);

  const liveResult = startedAt
    ? scoreTypingTest(typedText, elapsedMilliseconds)
    : { wordsPerMinute: 0, characterAccuracy: 100 };
  const displayedResult = result ?? liveResult;

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
        <p className="typing-test-page__prompt">{typingTestPrompt}</p>
        <div className="typing-test-page__progress" aria-live="polite">
          {typedText.length} / {typingTestPrompt.length} characters
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
            Use the mapped Backspace button to correct mistakes.
          </p>
        )}
        <button
          className="typing-test-page__reset"
          type="button"
          onClick={reset}
        >
          {result ? "Try again" : "Reset"}
        </button>
      </section>

      <Controller
        pad={pad}
        value={currentWord}
        onValueChange={handleSuggestionChange}
        onCharacterInput={(character) => updateText(`${typedText}${character}`)}
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
