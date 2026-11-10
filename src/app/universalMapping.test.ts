import { expect, it } from "vitest";
import type { GamepadSnapshot } from "../typing";
import {
  beginCapture,
  sampleButton,
  sampleDirection,
  sampleMappedCircle,
} from "./controllerCapture";
import { withAxisButtons, withButtonAxes } from "./controllerSetup";
import {
  defaultRightMapping,
  readStickPosition,
  type AxisMapping,
  type StickDirection,
} from "./axisMapping";

const pad = (
  axis: number,
  value: number,
  pressed: boolean,
): GamepadSnapshot => ({
  id: "Any input",
  index: 0,
  connected: true,
  mapping: "",
  axes: [axis],
  buttons: [{ value, pressed }],
});

it.each([
  [pad(0, 0, false), pad(1, 0, false)],
  [pad(0, 0, false), pad(-1, 0, false)],
  [pad(1, 0, false), pad(-1, 0, false)],
  [pad(0, 0.5, false), pad(0, 1, false)],
  [pad(0, 0.5, false), pad(0, 0, false)],
  [pad(0, 1, true), pad(0, 0, true)],
  [pad(0, 0, false), pad(0, 0, true)],
  [pad(0, 0, true), pad(0, 0, false)],
])(
  "maps either sign of every input type to an action and a stick direction",
  (rest, moved) => {
    const neutral = withButtonAxes(rest);
    const motion = withButtonAxes(moved);
    const direction = beginCapture(neutral, 0);
    sampleDirection(direction, neutral, 500);
    let binding = null;
    for (const time of [600, 900, 1200, 1500])
      binding = sampleDirection(direction, motion, time);
    expect(binding).not.toBeNull();
    const mapping: AxisMapping = {
      ...defaultRightMapping,
      directions: { right: binding! },
    };
    expect(readStickPosition(neutral.axes, mapping).x).toBe(0);
    expect(readStickPosition(motion.axes, mapping).x).toBe(1);

    const idle = withAxisButtons(rest, neutral.axes);
    const active = withAxisButtons(moved, neutral.axes);
    const capture = beginCapture(idle, 0);
    sampleButton(capture, idle, 0);
    let action = null;
    for (const time of [500, 800, 1100, 1500])
      action = sampleButton(capture, active, time);
    expect(action).not.toBeNull();
    expect(idle.buttons[action!].pressed).toBe(false);
    expect(active.buttons[action!].pressed).toBe(true);
  },
);

it("learns four independent digital directions, persists them, and verifies movement without paired axes", () => {
  const raw: GamepadSnapshot = {
    ...pad(0, 0, false),
    buttons: Array.from({ length: 4 }, () => ({ value: 0, pressed: false })),
  };
  const rest = withButtonAxes(raw);
  const moves = Array.from({ length: 4 }, (_, selected) =>
    withButtonAxes({
      ...raw,
      buttons: raw.buttons.map((button, index) => ({
        ...button,
        pressed: index === selected,
      })),
    }),
  );
  const names: StickDirection[] = ["right", "left", "up", "down"];
  const mapping: AxisMapping = {
    ...defaultRightMapping,
    directions: Object.fromEntries(
      moves.map((motion, index) => {
        const capture = beginCapture(rest, 0);
        sampleDirection(capture, rest, 500);
        let result = null;
        for (const time of [600, 900, 1200, 1500])
          result = sampleDirection(capture, motion, time);
        expect(result).not.toBeNull();
        return [names[index], result];
      }),
    ),
  };
  const saved: AxisMapping = JSON.parse(JSON.stringify(mapping));
  expect(moves.map((motion) => readStickPosition(motion.axes, saved))).toEqual([
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
  ]);
  const circle = beginCapture(rest, 0);
  moves.forEach((motion, index) =>
    sampleMappedCircle(circle, motion, saved, 500 + index * 600),
  );
  expect(sampleMappedCircle(circle, rest, saved, 2500)).toBe(true);
});
