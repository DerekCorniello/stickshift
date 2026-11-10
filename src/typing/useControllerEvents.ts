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

const repeatActions = [
  "cursorUp",
  "cursorDown",
  "cursorLeft",
  "cursorRight",
] as const;

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
  const latestHandler = useRef(onEvent);
  useEffect(() => {
    latestHandler.current = onEvent;
  }, [onEvent]);

  const heldDirections = repeatActions.map((action) => {
    const index = bindings[action];
    const button = index === null ? undefined : pad.buttons[index];
    return button?.pressed || (button?.value ?? 0) >= 0.5 ? index : null;
  });
  const heldKey = heldDirections.join(",");

  useEffect(() => {
    const timers: Array<{
      timeout: ReturnType<typeof setTimeout>;
      interval?: ReturnType<typeof setInterval>;
    }> = [];
    heldKey.split(",").forEach((value, actionIndex) => {
      if (!value) return;
      const buttonIndex = Number(value);
      const action = repeatActions[actionIndex];
      const timer: (typeof timers)[number] = {
        timeout: setTimeout(() => {
          const emit = () =>
            latestHandler.current({
              kind: "button",
              buttonIndex,
              phase: "press",
              action,
            });
          emit();
          timer.interval = setInterval(emit, 90);
        }, 400),
      };
      timers.push(timer);
    });
    return () => {
      timers.forEach(({ timeout, interval }) => {
        clearTimeout(timeout);
        if (interval !== undefined) clearInterval(interval);
      });
    };
  }, [heldKey]);

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
