import { actionLabels, defaultBindings } from "../typing";
import type { ControlAction, GamepadSnapshot } from "../typing";
import { Controller } from "./Controller";
import { GamepadButtonLabel } from "./GamepadButtonLabel";
import type { AxisMapping } from "./axisMapping";
import { getControllerInfo } from "./gamepadLabels";
import type { DialConfig } from "../typing";
import type { EditorAction, EditorState } from "./practiceEditor";
import "./pages.css";

type PracticePageProps = Readonly<{
  pad: GamepadSnapshot;
  leftConfig: DialConfig;
  rightConfig: DialConfig;
  activeLayerId: string;
  onActiveLayerChange: (layerId: string) => void;
  leftMapping: AxisMapping;
  rightMapping: AxisMapping;
  bindings: typeof defaultBindings;
  deadzone: number;
  editorState: EditorState;
  onEditorAction: (action: EditorAction) => void;
}>;

export function PracticePage({
  pad,
  leftConfig,
  rightConfig,
  activeLayerId,
  onActiveLayerChange,
  leftMapping,
  rightMapping,
  bindings,
  deadzone,
  editorState,
  onEditorAction,
}: PracticePageProps) {
  const { text, caret } = editorState;
  let wordStart = caret;
  let wordEnd = caret;
  while (wordStart > 0 && /[A-Za-z]/.test(text[wordStart - 1])) {
    wordStart -= 1;
  }
  while (wordEnd < text.length && /[A-Za-z]/.test(text[wordEnd])) {
    wordEnd += 1;
  }
  const currentWord = text.slice(wordStart, wordEnd);

  const handleActionInput = (action: ControlAction) => {
    switch (action) {
      case "space":
        onEditorAction({ kind: "insert", value: " " });
        break;
      case "enter":
        onEditorAction({ kind: "insert", value: "\n" });
        break;
      case "backspace":
        onEditorAction({ kind: "backspace" });
        break;
      case "cursorLeft":
        onEditorAction({ kind: "move", direction: "left" });
        break;
      case "cursorRight":
        onEditorAction({ kind: "move", direction: "right" });
        break;
      case "cursorUp":
        onEditorAction({ kind: "move", direction: "up" });
        break;
      case "cursorDown":
        onEditorAction({ kind: "move", direction: "down" });
        break;
      default:
        break;
    }
  };

  const replaceCurrentWord = (value: string) => {
    const replacement =
      value.endsWith(" ") && /\s/.test(text[wordEnd] ?? "")
        ? value.slice(0, -1)
        : value;
    onEditorAction({
      kind: "replace",
      start: wordStart,
      end: wordEnd,
      value: replacement,
    });
  };

  const preview = (
    <>
      {text.slice(0, caret)}
      <span className="practice-page__caret" aria-hidden="true" />
      {text.slice(caret)}
    </>
  );

  return (
    <main className="page-shell practice-page">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Practice</p>
          <h1>Write with your controller</h1>
          <p>
            Choose characters with either stick. Return the stick to center to
            enter the highlighted character.
          </p>
        </div>
        <span className="connection-badge">
          {getControllerInfo(pad.id).name}
        </span>
      </header>

      <div className="practice-page__layout">
        <section
          className="practice-page__editor-card"
          aria-label="Writing area"
        >
          <div className="practice-page__editor-heading">
            <h2>Your text</h2>
            <span>{text.length} characters</span>
          </div>
          <div
            className="practice-page__editor"
            role="textbox"
            aria-label="Controller writing area"
            aria-readonly="true"
            aria-multiline="true"
            tabIndex={0}
          >
            <span className="practice-page__text">
              {text.length === 0 ? (
                <>
                  <span className="practice-page__caret" aria-hidden="true" />
                  <span className="practice-page__placeholder">
                    Your controller-typed text will appear here.
                  </span>
                </>
              ) : (
                preview
              )}
            </span>
          </div>
          <p className="practice-page__note">
            Controller input only. Use the D-pad to move the caret; use the
            mapped Backspace, Space, and Enter buttons to edit.
          </p>
        </section>

        <aside
          className="practice-page__guide"
          aria-label="Controller controls"
        >
          <h2>Controls at a glance</h2>
          <ul>
            <li>Left and right sticks: choose and enter a character</li>
            <li>Triggers: change character layer</li>
            {Object.entries(bindings).map(([action, buttonIndex]) => (
              <li key={action}>
                {buttonIndex === null ? (
                  "Unassigned: "
                ) : (
                  <>
                    <GamepadButtonLabel
                      gamepadId={pad.id}
                      buttonIndex={buttonIndex}
                    />
                    {": "}
                  </>
                )}
                {actionLabels[action as keyof typeof actionLabels]}
              </li>
            ))}
          </ul>
          <p>
            Suggestions stay visible above the dials. Press the top face button
            to focus them, use the D-pad to choose one, then press the bottom
            face button to replace the word at the caret and return to typing.
            The right face button accepts the first suggestion directly.
          </p>
        </aside>
      </div>

      <Controller
        pad={pad}
        value={currentWord}
        onValueChange={replaceCurrentWord}
        onCharacterInput={(character) =>
          onEditorAction({ kind: "insert", value: character })
        }
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
