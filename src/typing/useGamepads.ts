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

    const updateGamepads = () => {
      const nextState: Record<number, GamepadSnapshot> = {};

      for (const pad of navigator.getGamepads?.() ?? []) {
        if (pad) {
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
      frameId = requestAnimationFrame(updateGamepads);
    };

    frameId = requestAnimationFrame(updateGamepads);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return gamepads;
}
