import { describe, expect, it } from "vitest";
import { defaultBindings, type GamepadSnapshot } from "../typing";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import {
  activeInputs,
  changedInputs,
  inputName,
  isControllerProfile,
  withAxisButtons,
} from "./controllerSetup";

const pad: GamepadSnapshot = {
  id: "Odd pad",
  index: 0,
  connected: true,
  mapping: "",
  axes: [0, -0.8, 0.9, 0, 0.7],
  buttons: Array.from({ length: 18 }, (_, index) => ({
    pressed: index === 17,
    value: index === 17 ? 1 : 0,
  })),
};

describe("controller setup inputs", () => {
  it("requires directional calibration for accepted saved profiles", () => {
    const profile = {
      accepted: true,
      bindings: defaultBindings,
      leftMapping: defaultLeftMapping,
      rightMapping: defaultRightMapping,
      deadzone: 0.2,
      discovered: [],
    };
    expect(isControllerProfile(profile)).toBe(false);
    expect(isControllerProfile({ ...profile, calibrationVersion: 2 })).toBe(
      true,
    );
  });
  it("keeps extra buttons and exposes both directions of every axis", () => {
    const expanded = withAxisButtons(pad);
    expect(expanded.buttons).toHaveLength(100);
    expect(expanded.buttons[17].pressed).toBe(true);
    expect(expanded.buttons[20].pressed).toBe(true);
    expect(expanded.buttons[23].pressed).toBe(true);
    expect(inputName(pad, 26)).toBe("Axis 4 -");
  });

  it("lists all currently active raw inputs for discovery", () => {
    expect(activeInputs(pad)).toEqual([
      "Button 17",
      "Axis 1 -",
      "Axis 2 +",
      "Axis 4 +",
    ]);
  });

  it("compares every exposed input with its opening snapshot", () => {
    const baseline = {
      ...pad,
      axes: [0, -1, 0, 0, 0],
      buttons: pad.buttons.map(() => ({ pressed: false, value: 0 })),
    };
    expect(changedInputs(pad, baseline)).toEqual([
      "Button 17",
      "Axis 2 +",
      "Axis 4 +",
    ]);
  });
});

it("uses learned rest values for either direction on every platform", () => {
  const rest = [-1, 0, 1];
  const idle = withAxisButtons({ ...pad, axes: rest }, rest);
  expect(idle.buttons.slice(18, 24).every((button) => !button.pressed)).toBe(
    true,
  );
  const moved = withAxisButtons({ ...pad, axes: [1, 1, -1] }, rest);
  expect(moved.buttons[19].pressed).toBe(true);
  expect(moved.buttons[21].pressed).toBe(true);
  expect(moved.buttons[22].pressed).toBe(true);
  expect(moved.buttons[18].pressed).toBe(false);
});
