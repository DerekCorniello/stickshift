export type EditorState = Readonly<{ text: string; caret: number }>;
export type EditorAction =
  | Readonly<{ kind: "insert"; value: string }>
  | Readonly<{ kind: "backspace" }>
  | Readonly<{ kind: "move"; direction: "left" | "right" | "up" | "down" }>;

export const initialEditorState: EditorState = { text: "", caret: 0 };

function moveVertical(text: string, caret: number, direction: -1 | 1): number {
  const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
  const column = caret - lineStart;

  if (direction < 0) {
    if (lineStart === 0) {
      return caret;
    }
    const previousLineEnd = lineStart - 1;
    const previousLineStart = text.lastIndexOf("\n", previousLineEnd - 1) + 1;
    return Math.min(previousLineStart + column, previousLineEnd);
  }

  const nextLineStart = text.indexOf("\n", caret);
  if (nextLineStart === -1) {
    return caret;
  }
  const nextLineEnd = text.indexOf("\n", nextLineStart + 1);
  const nextLineLimit = nextLineEnd === -1 ? text.length : nextLineEnd;
  return Math.min(nextLineStart + 1 + column, nextLineLimit);
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  if (action.kind === "insert") {
    return {
      text:
        state.text.slice(0, state.caret) +
        action.value +
        state.text.slice(state.caret),
      caret: state.caret + action.value.length,
    };
  }
  if (action.kind === "backspace") {
    if (state.caret === 0) {
      return state;
    }
    return {
      text:
        state.text.slice(0, state.caret - 1) + state.text.slice(state.caret),
      caret: state.caret - 1,
    };
  }

  switch (action.direction) {
    case "left":
      return { ...state, caret: Math.max(0, state.caret - 1) };
    case "right":
      return { ...state, caret: Math.min(state.text.length, state.caret + 1) };
    case "up":
      return { ...state, caret: moveVertical(state.text, state.caret, -1) };
    case "down":
      return { ...state, caret: moveVertical(state.text, state.caret, 1) };
  }
}
