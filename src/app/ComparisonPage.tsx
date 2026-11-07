import { useCallback, useEffect, useState } from "react";
import { useControllerEvents } from "../typing";
import type {
  ButtonBindings,
  ControlAction,
  ControllerEvent,
  DialConfig,
  GamepadSnapshot,
} from "../typing";
import { ControllerDials } from "./ControllerDials";
import { readStickPosition } from "./axisMapping";
import type { AxisMapping } from "./axisMapping";
import { scoreTypingTest, typingTestPrompt } from "./typingTest";
import type { TypingTestResult } from "./typingTest";
import "./pages.css";

const runLimit = 120_000;
const keyboardDirectionThreshold = 0.55;
const keyboardRepeatDelay = 450;
const keyboardRepeatInterval = 200;
type Direction = "left" | "right" | "up" | "down";
type Key = Readonly<{
  label: string;
  value: string;
  kind: "character" | "shift" | "space" | "backspace";
}>;
type Run = Readonly<{
  text: string;
  startedAt: number | null;
  elapsed: number;
  result: ComparisonResult | null;
}>;
type ComparisonResult = TypingTestResult &
  Readonly<{
    elapsed: number;
  }>;
type Stage = "one-stick" | "two-stick";

const blankRun: Run = {
  text: "",
  startedAt: null,
  elapsed: 0,
  result: null,
};

function characterRow(
  pairs: readonly (readonly [string, string])[],
): readonly Key[] {
  return pairs.map(([label, value]) => ({ label, value, kind: "character" }));
}

const keyboardRows: readonly (readonly Key[])[] = [
  characterRow([
    ["1", "1"],
    ["2", "2"],
    ["3", "3"],
    ["4", "4"],
    ["5", "5"],
    ["6", "6"],
    ["7", "7"],
    ["8", "8"],
    ["9", "9"],
    ["0", "0"],
  ]),
  characterRow([
    ["q", "q"],
    ["w", "w"],
    ["e", "e"],
    ["r", "r"],
    ["t", "t"],
    ["y", "y"],
    ["u", "u"],
    ["i", "i"],
    ["o", "o"],
    ["p", "p"],
  ]),
  characterRow([
    ["a", "a"],
    ["s", "s"],
    ["d", "d"],
    ["f", "f"],
    ["g", "g"],
    ["h", "h"],
    ["j", "j"],
    ["k", "k"],
    ["l", "l"],
  ]),
  characterRow([
    ["z", "z"],
    ["x", "x"],
    ["c", "c"],
    ["v", "v"],
    ["b", "b"],
    ["n", "n"],
    ["m", "m"],
  ]),
  characterRow([
    [String.fromCharCode(96), String.fromCharCode(96)],
    ["-", "-"],
    ["=", "="],
    ["[", "["],
    ["]", "]"],
    ["\\", "\\"],
    [";", ";"],
    ["'", "'"],
    [",", ","],
    [".", "."],
    ["/", "/"],
  ]),
  characterRow([
    ["!", "!"],
    ["?", "?"],
    ["@", "@"],
    ["#", "#"],
    ["$", "$"],
    ["%", "%"],
    ["^", "^"],
    ["&", "&"],
    ["*", "*"],
    ["(", "("],
    [")", ")"],
  ]),
  characterRow([
    ["_", "_"],
    ["+", "+"],
    ["{", "{"],
    ["}", "}"],
    ["|", "|"],
    [":", ":"],
    ['"', '"'],
    ["<", "<"],
    [">", ">"],
    ["~", "~"],
  ]),
  [
    { label: "Shift", value: "", kind: "shift" },
    { label: "Space", value: " ", kind: "space" },
    { label: "Backspace", value: "", kind: "backspace" },
  ],
];
const allKeys = keyboardRows.flat();

function directionForStick(
  position: Readonly<{ x: number; y: number }>,
  deadzone: number,
): Direction | null {
  const threshold = Math.max(deadzone, keyboardDirectionThreshold);
  const horizontal = Math.abs(position.x);
  const vertical = Math.abs(position.y);
  const dominant = Math.max(horizontal, vertical);
  if (dominant < threshold) return null;
  if (horizontal > vertical) return position.x < 0 ? "left" : "right";
  return position.y < 0 ? "up" : "down";
}

function moveKeyboardFocus(index: number, direction: Direction): number {
  let rowIndex = 0;
  let columnIndex = index;
  for (const [candidateRowIndex, row] of keyboardRows.entries()) {
    if (columnIndex < row.length) {
      rowIndex = candidateRowIndex;
      break;
    }
    columnIndex -= row.length;
  }

  if (direction === "left" || direction === "right") {
    const row = keyboardRows[rowIndex];
    const nextColumn =
      (columnIndex + (direction === "left" ? -1 : 1) + row.length) % row.length;
    return (
      keyboardRows
        .slice(0, rowIndex)
        .reduce((sum, previous) => sum + previous.length, 0) + nextColumn
    );
  }

  const nextRowIndex =
    (rowIndex + (direction === "up" ? -1 : 1) + keyboardRows.length) %
    keyboardRows.length;
  const nextRow = keyboardRows[nextRowIndex];
  const currentRow = keyboardRows[rowIndex];
  const relativeColumn =
    currentRow.length <= 1 ? 0 : columnIndex / (currentRow.length - 1);
  const nextColumn = Math.round(relativeColumn * (nextRow.length - 1));
  return (
    keyboardRows
      .slice(0, nextRowIndex)
      .reduce((sum, previous) => sum + previous.length, 0) + nextColumn
  );
}

function scoreRun(run: Run, elapsed: number): ComparisonResult {
  const score = scoreTypingTest(run.text, elapsed);
  return {
    ...score,
    elapsed,
  };
}

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

type Props = Readonly<{
  pad: GamepadSnapshot;
  leftConfig: DialConfig;
  rightConfig: DialConfig;
  activeLayerId: string;
  onActiveLayerChange: (layerId: string) => void;
  leftMapping: AxisMapping;
  rightMapping: AxisMapping;
  bindings: ButtonBindings;
  deadzone: number;
}>;

export function ComparisonPage({
  pad,
  leftConfig,
  rightConfig,
  activeLayerId,
  onActiveLayerChange,
  leftMapping,
  rightMapping,
  bindings,
  deadzone,
}: Props) {
  const [stage, setStage] = useState<Stage>("one-stick");
  const [oneRun, setOneRun] = useState(blankRun);
  const [twoRun, setTwoRun] = useState(blankRun);
  const [focusIndex, setFocusIndex] = useState(0);
  const [shifted, setShifted] = useState(false);
  const leftPosition = readStickPosition(pad.axes, leftMapping);
  const direction = directionForStick(leftPosition, deadzone);
  const selectedIndex = focusIndex;
  const visibleStage: Stage | "ready-two-stick" | "complete" =
    stage === "one-stick" && oneRun.result
      ? "ready-two-stick"
      : stage === "two-stick" && twoRun.result
        ? "complete"
        : stage;

  const insert = useCallback((mode: "one" | "two", character: string) => {
    const setRun = mode === "one" ? setOneRun : setTwoRun;
    setRun((current) => {
      if (current.result) return current;
      const now = performance.now();
      const startedAt = current.startedAt ?? now;
      const next: Run = {
        ...current,
        text: current.text + character,
        startedAt,
        elapsed: now - startedAt,
      };
      return next.text === typingTestPrompt
        ? { ...next, result: scoreRun(next, next.elapsed) }
        : next;
    });
  }, []);

  const edit = useCallback(
    (mode: "one" | "two", action: ControlAction) => {
      const setRun = mode === "one" ? setOneRun : setTwoRun;
      if (action === "backspace") {
        setRun((current) =>
          current.result
            ? current
            : { ...current, text: current.text.slice(0, -1) },
        );
      } else if (action === "space") {
        insert(mode, " ");
      }
    },
    [insert],
  );

  const finish = useCallback((mode: "one" | "two") => {
    const setRun = mode === "one" ? setOneRun : setTwoRun;
    setRun((current) => {
      if (current.result) return current;
      const elapsed =
        current.startedAt === null ? 0 : performance.now() - current.startedAt;
      return { ...current, elapsed, result: scoreRun(current, elapsed) };
    });
  }, []);

  const selectKey = useCallback(
    (key: Key) => {
      if (key.kind === "character")
        insert("one", shifted ? key.value.toUpperCase() : key.value);
      else if (key.kind === "shift") setShifted((value) => !value);
      else if (key.kind === "space") insert("one", " ");
      else edit("one", "backspace");
    },
    [edit, insert, shifted],
  );

  const reset = useCallback(() => {
    setOneRun(blankRun);
    setTwoRun(blankRun);
    setFocusIndex(0);
    setShifted(false);
    setStage("one-stick");
  }, []);

  useEffect(() => {
    if (visibleStage !== "one-stick" || direction === null) return;

    const move = () =>
      setFocusIndex((current) => moveKeyboardFocus(current, direction));
    const firstMove = window.setTimeout(move, 0);
    let repeatInterval: number | undefined;
    const repeatStart = window.setTimeout(() => {
      move();
      repeatInterval = window.setInterval(move, keyboardRepeatInterval);
    }, keyboardRepeatDelay);

    return () => {
      window.clearTimeout(firstMove);
      window.clearTimeout(repeatStart);
      if (repeatInterval !== undefined) window.clearInterval(repeatInterval);
    };
  }, [direction, visibleStage]);

  const handleKeyboardEvent = useCallback(
    (event: ControllerEvent) => {
      if (
        event.kind === "button" &&
        event.phase === "press" &&
        event.action === "close"
      ) {
        reset();
        return;
      }
      if (event.kind !== "button" || event.phase !== "press") return;
      if (visibleStage === "complete" && event.action === "enter") {
        reset();
        return;
      }
      if (visibleStage !== "one-stick") return;
      if (event.action === "enter") selectKey(allKeys[selectedIndex]);
      else if (event.action === "submit") finish("one");
      else if (event.action === "backspace" || event.action === "space")
        edit("one", event.action);
    },
    [edit, finish, reset, selectKey, selectedIndex, visibleStage],
  );

  useControllerEvents(
    pad,
    bindings,
    leftPosition,
    { x: 0, y: 0 },
    deadzone,
    handleKeyboardEvent,
  );

  const activeRun = stage === "two-stick" ? twoRun : oneRun;
  useEffect(() => {
    if (
      (stage !== "one-stick" && stage !== "two-stick") ||
      activeRun.startedAt === null ||
      activeRun.result
    )
      return;
    const interval = window.setInterval(() => {
      const elapsed =
        performance.now() - (activeRun.startedAt ?? performance.now());
      if (elapsed >= runLimit) finish(stage === "two-stick" ? "two" : "one");
      else {
        const setRun = stage === "two-stick" ? setTwoRun : setOneRun;
        setRun((current) => ({ ...current, elapsed }));
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [activeRun.result, activeRun.startedAt, finish, stage]);

  const handleDialAction = (action: ControlAction) => {
    if (visibleStage === "ready-two-stick" && action === "enter") {
      setTwoRun(blankRun);
      setStage("two-stick");
    } else if (visibleStage === "two-stick" && action === "submit")
      finish("two");
    else if (visibleStage === "two-stick") edit("two", action);
  };

  const oneResult = oneRun.result;
  const twoResult = twoRun.result;

  return (
    <main className="page-shell comparison-page">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Typing comparison</p>
          <h1>One stick or two?</h1>
          <p>
            Type the same passage with a controller keyboard, then with both
            dials.
          </p>
        </div>
        <span className="connection-badge">{pad.id}</span>
      </header>
      <section className="comparison-page__card" aria-label="Typing comparison">
        <p className="typing-test-page__prompt">{typingTestPrompt}</p>
        <div className="comparison-page__runs">
          <RunSummary
            label="One stick"
            run={oneRun}
            active={stage === "one-stick"}
          />
          <RunSummary
            label="Two sticks"
            run={twoRun}
            active={stage === "two-stick"}
          />
        </div>
        <p className="comparison-page__instructions" aria-live="polite">
          {visibleStage === "one-stick" &&
            "Tilt the left stick to move focus one key in that direction. Hold to repeat; focus wraps at row and keyboard edges. Press the mapped A / Enter button to select. Submit ends this run early."}
          {visibleStage === "ready-two-stick" &&
            "One-stick run complete. Press the mapped A / Enter button to start the two-stick run."}
          {visibleStage === "two-stick" &&
            "Aim with either stick and return it to center to type its highlighted character."}
          {visibleStage === "complete" &&
            "Both runs are complete. Press Enter to restart or Minus to reset."}
        </p>
        <p className="comparison-page__keyboard-hint">
          Press the mapped Minus / Close button at any time to restart the
          comparison.
        </p>
        {oneResult && twoResult ? (
          <ResultComparison one={oneResult} two={twoResult} />
        ) : null}
        <button
          className="typing-test-page__reset"
          type="button"
          onClick={reset}
        >
          Reset comparison
        </button>
      </section>
      {visibleStage === "one-stick" ? (
        <section
          className="comparison-page__keyboard"
          aria-label="On-screen keyboard"
        >
          {keyboardRows.map((row, rowIndex) => {
            const startIndex = keyboardRows
              .slice(0, rowIndex)
              .reduce((sum, previous) => sum + previous.length, 0);
            return (
              <div className="comparison-page__keyboard-row" key={rowIndex}>
                {row.map((key, columnIndex) => {
                  const index = startIndex + columnIndex;
                  const label =
                    key.kind === "character" && shifted
                      ? key.value.toUpperCase()
                      : key.label;
                  return (
                    <button
                      className={
                        "comparison-page__key" +
                        (key.kind === "character"
                          ? ""
                          : " comparison-page__key--wide") +
                        (selectedIndex === index ? " is-selected" : "")
                      }
                      key={index}
                      type="button"
                      aria-pressed={selectedIndex === index}
                      onClick={() => {
                        setFocusIndex(index);
                        selectKey(key);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <p className="comparison-page__keyboard-hint">
            Left stick aims; A selects. Bumpers also enter Space and Backspace.
          </p>
        </section>
      ) : visibleStage === "ready-two-stick" || visibleStage === "two-stick" ? (
        <ControllerDials
          pad={pad}
          leftConfig={leftConfig}
          rightConfig={rightConfig}
          activeLayerId={activeLayerId}
          onActiveLayerChange={onActiveLayerChange}
          leftMapping={leftMapping}
          rightMapping={rightMapping}
          bindings={bindings}
          deadzone={deadzone}
          showDiagnostics={false}
          onCharacterInput={(character) => {
            if (visibleStage === "two-stick") insert("two", character);
          }}
          onActionInput={handleDialAction}
        />
      ) : null}
    </main>
  );
}

function RunSummary({
  label,
  run,
  active,
}: Readonly<{ label: string; run: Run; active: boolean }>) {
  const liveScore = run.result ?? scoreRun(run, run.elapsed);
  return (
    <article className={"comparison-page__run" + (active ? " is-active" : "")}>
      <h2>
        {label}
        {active ? " - Active" : ""}
      </h2>
      <p className="comparison-page__progress">{run.text || "Ready"}</p>
      <dl>
        <div>
          <dt>Time</dt>
          <dd>{formatTime(run.result?.elapsed ?? run.elapsed)}</dd>
        </div>
        <div>
          <dt>WPM</dt>
          <dd>{liveScore.wordsPerMinute.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Character accuracy</dt>
          <dd>{liveScore.characterAccuracy.toFixed(1)}%</dd>
        </div>
      </dl>
    </article>
  );
}

function ResultComparison({
  one,
  two,
}: Readonly<{ one: ComparisonResult; two: ComparisonResult }>) {
  const timeDelta = two.elapsed - one.elapsed;
  const wpmDelta = two.wordsPerMinute - one.wordsPerMinute;
  const accuracyDelta = two.characterAccuracy - one.characterAccuracy;
  return (
    <div className="comparison-page__difference" role="status">
      <h2>Difference (two sticks minus one stick)</h2>
      <p>
        Time: {timeDelta >= 0 ? "+" : "-"}
        {formatTime(Math.abs(timeDelta))}
      </p>
      <p>
        WPM: {wpmDelta >= 0 ? "+" : ""}
        {wpmDelta.toFixed(1)}
      </p>
      <p>
        Character accuracy: {accuracyDelta >= 0 ? "+" : ""}
        {accuracyDelta.toFixed(1)} points
      </p>
    </div>
  );
}
