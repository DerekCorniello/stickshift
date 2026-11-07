import { useEffect, useRef } from "react";
import type { StickPosition } from "./types";
import type {
  ButtonBindings,
  CharacterResolver,
  ControllerEvent,
} from "./controllerEvents";
import {
  initialControllerEventState,
  readControllerEvents,
} from "./controllerEvents";
import type { GamepadSnapshot } from "./useGamepads";

export function useControllerEvents(
  pad: GamepadSnapshot,
  bindings: ButtonBindings,
  leftPosition: StickPosition,
  rightPosition: StickPosition,
  deadzone: number,
  onEvent: (event: ControllerEvent) => void,
  resolveCharacter?: CharacterResolver,
): void {
  const state = useRef(initialControllerEventState);

  useEffect(() => {
    const result = readControllerEvents(
      state.current,
      pad,
      bindings,
      leftPosition,
      rightPosition,
      deadzone,
      resolveCharacter,
    );
    state.current = result.state;
    for (const event of result.events) {
      onEvent(event);
    }
  }, [
    pad,
    bindings,
    leftPosition,
    rightPosition,
    deadzone,
    onEvent,
    resolveCharacter,
  ]);
}
