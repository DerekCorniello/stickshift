import { expect, it } from "vitest";
import type { GamepadSnapshot } from "../typing";
import {
  beginCapture,
  sampleButton,
  sampleCircle,
  sampleDirection,
  sampleRest,
} from "./controllerCapture";
import { withAxisButtons } from "./controllerSetup";

const pad = (buttons: number[] = [], axes = [0, 0, 0, 0]): GamepadSnapshot => ({
  id: "Odd controller",
  index: 0,
  connected: true,
  mapping: "",
  axes,
  buttons: Array.from({ length: 20 }, (_, index) => ({
    pressed: buttons.includes(index),
    value: buttons.includes(index) ? 1 : 0,
  })),
});

it("captures a sustained change from a stable baseline, not a stray pulse", () => {
  const state = beginCapture(pad(), 0);
  expect(sampleButton(state, pad(), 500)).toBeNull();
  expect(sampleButton(state, pad([3]), 600)).toBeNull();
  expect(sampleButton(state, pad(), 700)).toBeNull();
  for (const time of [800, 1000, 1200, 1400, 1600])
    expect(sampleButton(state, pad([17]), time)).toBeNull();
  expect(sampleButton(state, pad([17]), 1800)).toBe(17);
});

it("finds both stick axes after a full circle while ignoring other axes", () => {
  const state = beginCapture(pad(), 0);
  sampleCircle(state, pad(), 500);
  const positions = [
    [0, 0, 0, 0.9],
    [0, 0, 0.9, 0.9],
    [0, 0, 0.9, 0],
    [0, 0, 0.9, -0.9],
    [0, 0, 0, -0.9],
    [0, 0, -0.9, -0.9],
    [0, 0, -0.9, 0],
    [0, 0, -0.9, 0.9],
  ];
  positions.forEach((axes, index) =>
    sampleCircle(state, pad([], axes), 600 + index * 220),
  );
  expect(sampleCircle(state, pad([], [0, 0, 0, 0]), 2400)).toEqual({
    xAxis: 3,
    yAxis: 2,
    invertX: false,
    invertY: false,
  });
});

it("accepts a digital press without an analog value and a negative resting axis", () => {
  const digital = beginCapture(pad(), 0);
  sampleButton(digital, pad(), 0);
  const pressed = pad();
  const unusual = {
    ...pressed,
    buttons: pressed.buttons.map((button, index) =>
      index === 17 ? { pressed: true, value: 0 } : button,
    ),
  };
  expect(sampleButton(digital, unusual, 500)).toBeNull();
  sampleButton(digital, unusual, 800);
  sampleButton(digital, unusual, 1100);
  expect(sampleButton(digital, unusual, 1500)).toBe(17);

  const rest = {
    ...pad(),
    physicalButtonCount: 20,
    buttons: [...pad().buttons, { pressed: true, value: 1 }],
  };
  const moved = {
    ...rest,
    buttons: [...rest.buttons.slice(0, 20), { pressed: false, value: 0 }],
  };
  const axis = beginCapture(rest, 0);
  expect(sampleButton(axis, moved, 500)).toBeNull();
  sampleButton(axis, moved, 800);
  sampleButton(axis, moved, 1100);
  expect(sampleButton(axis, moved, 1500)).toBeNull();
});

it("maps a right stick on later axes even when its first movement is diagonal", () => {
  const resting = pad([], [0, 0, 0, 0, 0, 0, 0, 0]);
  const state = beginCapture(resting, 0);
  sampleCircle(state, resting, 500, [0, 1]);
  const positions = [
    [0.85, 0.7],
    [0.9, 0.9],
    [0, 0.9],
    [-0.9, 0.9],
    [-0.9, 0],
    [-0.9, -0.9],
    [0, -0.9],
    [0.9, -0.9],
  ];
  positions.forEach(([x, y], index) => {
    const axes = [0, 0, 0, 0, 0, 0, x, y];
    sampleCircle(state, pad([], axes), 600 + index * 250, [0, 1]);
  });
  expect(sampleCircle(state, resting, 2600, [0, 1])).toEqual({
    xAxis: 6,
    yAxis: 7,
    invertX: false,
    invertY: false,
  });
});

it("captures trigger axes as buttons even when the default right-stick axes point at them", () => {
  const rest = pad([], [0, 0, 0, 0, 0, 0, 0, 0]);
  const trigger = pad([], [0, 0, 1, 0, 0, 0, 0, 0]);
  const state = beginCapture(withAxisButtons(rest), 0);
  sampleButton(state, withAxisButtons(rest), 0);
  for (const time of [500, 800, 1100])
    expect(sampleButton(state, withAxisButtons(trigger), time)).toBeNull();
  expect(sampleButton(state, withAxisButtons(trigger), 1500)).toBe(25);
});

it("captures the pressed direction of a full-range trigger, not its resting direction", () => {
  const rest = withAxisButtons(pad([], [-1]));
  const moved = withAxisButtons(pad([], [1]));
  const state = beginCapture(rest, 0);
  sampleButton(state, rest, 0);
  for (const time of [500, 800, 1100]) sampleButton(state, moved, time);
  const index = sampleButton(state, moved, 1500);
  expect(index).toBe(21);
  expect(rest.buttons[index!].pressed).toBe(false);
  expect(moved.buttons[index!].pressed).toBe(true);
});

it("measures a settled center and identifies a reversed stick axis", () => {
  const centered = pad([], [0.2, -0.1, 0]);
  const rest = beginCapture(centered, 0);
  expect(sampleRest(rest, pad([], [0.8, -0.1, 0]), 300)).toBeNull();
  expect(sampleRest(rest, centered, 600)).toBeNull();
  for (let time = 700; time <= 2700; time += 100)
    sampleRest(rest, centered, time);
  sampleRest(rest, centered, 2800)!.forEach((value, index) =>
    expect(value).toBeCloseTo(centered.axes[index]),
  );
  const direction = beginCapture(centered, 0);
  sampleDirection(direction, centered, 100);
  const moved = pad([], [-0.6, -0.1, 0]);
  for (const time of [500, 800, 1100])
    expect(sampleDirection(direction, moved, time)).toBeNull();
  expect(sampleDirection(direction, moved, 1500)).toEqual({
    index: 0,
    invert: true,
    center: 0.2,
    range: 0.8,
  });
});

it("requires neutral before a direction and resets a hold on release or reversal", () => {
  const neutral = pad([], [0, 0, -1, -1, 0, 0]);
  const moved = pad([], [0, 0, -1, -1, 1, 0]);
  const state = beginCapture(neutral, 0);
  for (let time = 500; time < 3000; time += 100)
    expect(sampleDirection(state, moved, time)).toBeNull();
  sampleDirection(state, neutral, 3000);
  sampleDirection(state, moved, 3100);
  sampleDirection(state, moved, 3500);
  sampleDirection(state, neutral, 3600);
  expect(sampleDirection(state, moved, 4500)).toBeNull();
  const reversed = pad([], [0, 0, -1, -1, -1, 0]);
  expect(sampleDirection(state, reversed, 4600)).toBeNull();
  for (const time of [4800, 5000, 5200]) sampleDirection(state, reversed, time);
  expect(sampleDirection(state, reversed, 5500)).toEqual({
    index: 4,
    invert: true,
    center: 0,
    range: 1,
  });
});

it("does not measure slow cumulative movement as rest", () => {
  const state = beginCapture(pad(), 0);
  for (let sample = 1; sample <= 40; sample++)
    expect(
      sampleRest(state, pad([], [sample * 0.02, 0, 0, 0]), sample * 100),
    ).toBeNull();
});

it("arms each stick channel independently when another channel starts away from baseline", () => {
  const state = beginCapture(pad([], [0, 0]), 0);
  sampleDirection(state, pad([], [-1, 0]), 500);
  let result = null;
  for (const time of [600, 900, 1200, 1500])
    result = sampleDirection(state, pad([], [-1, 1]), time);
  expect(result).toEqual({ index: 1, invert: false, center: 0, range: 1 });
});

it("does not arm a held button just because unrelated buttons are released", () => {
  const state = beginCapture(pad(), 0);
  for (const time of [500, 800, 1100, 1500])
    expect(sampleButton(state, pad([17]), time)).toBeNull();
  sampleButton(state, pad(), 1600);
  let result = null;
  for (const time of [1700, 2000, 2300, 2600])
    result = sampleButton(state, pad([17]), time);
  expect(result).toBe(17);
});
