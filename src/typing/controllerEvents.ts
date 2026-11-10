import type { StickPosition } from "./types";
import type { GamepadSnapshot } from "./useGamepads";

export const actionLabels = {
  previousLayer: "Previous layer",
  nextLayer: "Next layer",
  backspace: "Backspace",
  space: "Space",
  enter: "Enter",
  submit: "Submit",
  close: "Close typing",
  autocomplete: "Autocomplete",
  acceptFirstSuggestion: "Accept first suggestion",
  cursorUp: "D-pad up",
  cursorDown: "D-pad down",
  cursorLeft: "D-pad left",
  cursorRight: "D-pad right",
  commitLeft: "Left stick click",
  commitRight: "Right stick click",
} as const;

export type ControlAction = keyof typeof actionLabels;
export type ButtonBindings = Readonly<Record<ControlAction, number | null>>;

export const defaultBindings: ButtonBindings = {
  previousLayer: 6,
  nextLayer: 7,
  backspace: 4,
  space: 5,
  enter: 0,
  submit: 9,
  close: 8,
  autocomplete: 3,
  acceptFirstSuggestion: 0,
  cursorUp: 12,
  cursorDown: 13,
  cursorLeft: 14,
  cursorRight: 15,
  commitLeft: 10,
  commitRight: 11,
};

export const controlActions = Object.keys(actionLabels) as ControlAction[];

export type ControllerEvent =
  | Readonly<{
      kind: "button";
      buttonIndex: number;
      phase: "press" | "release";
      action: ControlAction | null;
    }>
  | Readonly<{
      kind: "stick";
      side: "left" | "right";
      phase: "enter" | "center";
      position: StickPosition;
    }>
  | Readonly<{
      kind: "character";
      side: "left" | "right";
      character: string;
      layerId: string;
    }>;

export type CharacterSelection = Readonly<{
  character: string;
  layerId: string;
}>;

export type CharacterResolver = (
  side: "left" | "right",
  position: StickPosition,
) => CharacterSelection | null;

export type ControllerEventState = Readonly<{
  pressedButtons: readonly boolean[];
  leftOutside: boolean;
  rightOutside: boolean;
  leftNeedsRearm: boolean;
  rightNeedsRearm: boolean;
  leftCandidate: CharacterSelection | null;
  rightCandidate: CharacterSelection | null;
}>;

export const initialControllerEventState: ControllerEventState = {
  pressedButtons: [],
  leftOutside: false,
  rightOutside: false,
  leftNeedsRearm: false,
  rightNeedsRearm: false,
  leftCandidate: null,
  rightCandidate: null,
};

const rearmMargin = 0.2;

function isOutside(
  position: StickPosition,
  deadzone: number,
  wasOutside: boolean,
  needsRearm: boolean,
): boolean {
  const magnitude = Math.hypot(position.x, position.y);
  return (
    magnitude > deadzone &&
    (wasOutside ||
      !needsRearm ||
      magnitude >= Math.min(1, deadzone + rearmMargin))
  );
}

function actionForButton(
  bindings: ButtonBindings,
  buttonIndex: number,
): ControlAction | null {
  return (
    controlActions.find((action) => bindings[action] === buttonIndex) ?? null
  );
}

export function readControllerEvents(
  previous: ControllerEventState,
  pad: GamepadSnapshot,
  bindings: ButtonBindings,
  leftPosition: StickPosition,
  rightPosition: StickPosition,
  deadzone: number,
  resolveCharacter?: CharacterResolver,
): Readonly<{
  state: ControllerEventState;
  events: readonly ControllerEvent[];
}> {
  const events: ControllerEvent[] = [];
  const pressedButtons = pad.buttons.map(
    (button) => button.pressed || button.value >= 0.5,
  );
  const buttonCount = Math.max(
    previous.pressedButtons.length,
    pressedButtons.length,
  );

  for (let index = 0; index < buttonCount; index++) {
    const wasPressed = previous.pressedButtons[index] ?? false;
    const isPressed = pressedButtons[index] ?? false;
    if (wasPressed !== isPressed) {
      events.push({
        kind: "button",
        buttonIndex: index,
        phase: isPressed ? "press" : "release",
        action: actionForButton(bindings, index),
      });
    }
  }

  const leftOutside = isOutside(
    leftPosition,
    deadzone,
    previous.leftOutside,
    previous.leftNeedsRearm,
  );
  const rightOutside = isOutside(
    rightPosition,
    deadzone,
    previous.rightOutside,
    previous.rightNeedsRearm,
  );
  const leftCandidate = leftOutside
    ? resolveCharacter
      ? resolveCharacter("left", leftPosition)
      : previous.leftCandidate
    : null;
  const rightCandidate = rightOutside
    ? resolveCharacter
      ? resolveCharacter("right", rightPosition)
      : previous.rightCandidate
    : null;
  if (leftOutside !== previous.leftOutside) {
    events.push({
      kind: "stick",
      side: "left",
      phase: leftOutside ? "enter" : "center",
      position: leftPosition,
    });
    if (!leftOutside && previous.leftCandidate) {
      events.push({
        kind: "character",
        side: "left",
        ...previous.leftCandidate,
      });
    }
  }
  if (rightOutside !== previous.rightOutside) {
    events.push({
      kind: "stick",
      side: "right",
      phase: rightOutside ? "enter" : "center",
      position: rightPosition,
    });
    if (!rightOutside && previous.rightCandidate) {
      events.push({
        kind: "character",
        side: "right",
        ...previous.rightCandidate,
      });
    }
  }

  return {
    state: {
      pressedButtons,
      leftOutside,
      rightOutside,
      leftNeedsRearm: leftOutside
        ? false
        : previous.leftOutside || previous.leftNeedsRearm,
      rightNeedsRearm: rightOutside
        ? false
        : previous.rightOutside || previous.rightNeedsRearm,
      leftCandidate,
      rightCandidate,
    },
    events,
  };
}
