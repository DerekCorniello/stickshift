import { useEffect, useState } from "react";

export type GamepadSnapshot = Readonly<{
  id: string;
  index: number;
  connected: boolean;
  mapping: Gamepad["mapping"];
  axes: readonly number[];
  buttons: readonly Readonly<{ pressed: boolean; value: number }>[];
  physicalButtonCount?: number;
  physicalAxisCount?: number;
  availableAxes?: readonly number[];
}>;

export function useGamepads(): Readonly<Record<number, GamepadSnapshot>> {
  const [gamepads, setGamepads] = useState<Record<number, GamepadSnapshot>>({});

  useEffect(() => {
    let frameId = 0;

    const updateGamepads = (connectedPad?: Gamepad) => {
      const nextState: Record<number, GamepadSnapshot> = {};

      const available = [...(navigator.getGamepads?.() ?? [])];
      if (connectedPad) available[connectedPad.index] = connectedPad;
      for (const pad of available) {
        if (pad?.connected) {
          nextState[pad.index] = {
            id: pad.id,
            index: pad.index,
            connected: pad.connected,
            mapping: pad.mapping,
            axes: [...pad.axes],
            buttons: pad.buttons.map((button) => ({
              pressed: button.pressed,
              value: button.value,
            })),
          };
        }
      }

      setGamepads(nextState);
    };

    const poll = () => {
      updateGamepads();
      frameId = requestAnimationFrame(poll);
    };
    const onConnected = (event: GamepadEvent) => updateGamepads(event.gamepad);
    const onDisconnected = () => updateGamepads();
    window.addEventListener("gamepadconnected", onConnected);
    window.addEventListener("gamepaddisconnected", onDisconnected);
    updateGamepads();
    frameId = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("gamepadconnected", onConnected);
      window.removeEventListener("gamepaddisconnected", onDisconnected);
    };
  }, []);

  return gamepads;
}
