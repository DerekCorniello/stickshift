import { defaultBindings } from "../typing";
import type { ButtonBindings, GamepadSnapshot } from "../typing";
import type { AxisMapping } from "./axisMapping";

export type ControllerProfile = Readonly<{
  accepted: boolean;
  calibrationVersion?: number;
  axisRest?: readonly number[];
  bindings: ButtonBindings;
  leftMapping: AxisMapping;
  rightMapping: AxisMapping;
  deadzone: number;
  discovered: readonly string[];
  visualButtons?: readonly (number | null)[];
  visualSignals?: readonly (readonly string[])[];
}>;

export const axisButtonBase = (pad: GamepadSnapshot) =>
  Math.max(16, pad.physicalButtonCount ?? pad.buttons.length);

// Preserve native axis indices, then expose every physical button value as
// another continuous channel. A button resting at 0.5 can be a stick center.
export function withButtonAxes(pad: GamepadSnapshot): GamepadSnapshot {
  if (pad.physicalAxisCount !== undefined) return pad;
  const physicalAxisCount = pad.axes.length;
  const buttons = pad.buttons.slice(
    0,
    pad.physicalButtonCount ?? pad.buttons.length,
  );
  return {
    ...pad,
    physicalAxisCount,
    axes: [
      ...pad.axes,
      ...buttons.map((button) => button.value * 2 - 1),
      ...buttons.map((button) => (button.pressed ? 1 : -1)),
    ],
    availableAxes: [
      ...(pad.availableAxes ?? pad.axes.map((_, index) => index)),
      ...buttons.map((_, index) => physicalAxisCount + index),
      ...buttons.map((_, index) => physicalAxisCount + buttons.length + index),
    ],
  };
}

export function withAxisButtons(
  pad: GamepadSnapshot,
  axisRest: readonly number[] = [],
): GamepadSnapshot {
  pad = withButtonAxes(pad);
  const buttons = [...pad.buttons];
  while (buttons.length < 16) buttons.push({ pressed: false, value: 0 });
  pad.axes.forEach((axis, index) => {
    const rest =
      axisRest[index] ??
      (index < (pad.physicalAxisCount ?? pad.axes.length) ? 0 : -1);
    const negative = Math.max(
      0,
      Math.min(1, (rest - axis) / Math.max(0.01, rest + 1)),
    );
    const positive = Math.max(
      0,
      Math.min(1, (axis - rest) / Math.max(0.01, 1 - rest)),
    );
    buttons.push({ pressed: negative > 0.55, value: negative });
    buttons.push({ pressed: positive > 0.55, value: positive });
  });
  return withButtonAxes({
    ...pad,
    physicalButtonCount: pad.physicalButtonCount ?? pad.buttons.length,
    buttons,
  });
}

export function inputName(pad: GamepadSnapshot, index: number): string {
  const base = axisButtonBase(pad);
  if (index < base) return `Button ${index}`;
  const offset = index - base;
  return `Axis ${Math.floor(offset / 2)} ${offset % 2 ? "+" : "-"}`;
}

export function activeInputs(pad: GamepadSnapshot): string[] {
  const result: string[] = [];
  pad.buttons.forEach((button, index) => {
    if (button.pressed || button.value >= 0.55) result.push(`Button ${index}`);
  });
  pad.axes.forEach((value, index) => {
    if (Math.abs(value) >= 0.55)
      result.push(`Axis ${index} ${value > 0 ? "+" : "-"}`);
  });
  return result;
}

export function changedInputs(
  pad: GamepadSnapshot,
  baseline: GamepadSnapshot,
): string[] {
  const result: string[] = [];
  pad.buttons.forEach((button, index) => {
    const rest = baseline.buttons[index];
    if (
      button.value - (rest?.value ?? 0) >= 0.45 ||
      (button.pressed && !rest?.pressed)
    )
      result.push(`Button ${index}`);
  });
  pad.axes.forEach((value, index) => {
    const delta = value - (baseline.axes[index] ?? 0);
    if (Math.abs(delta) >= 0.45)
      result.push(`Axis ${index} ${delta > 0 ? "+" : "-"}`);
  });
  return result;
}

export function profileKey(id: string): string {
  return `stickshift.controller.v1:${id}`;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function axisMapping(value: unknown): value is AxisMapping {
  return (
    record(value) &&
    (value.directions === undefined ||
      (record(value.directions) &&
        ["right", "left", "up", "down"].every((direction) => {
          const binding = (value.directions as Record<string, unknown>)[
            direction
          ];
          return (
            record(binding) &&
            Number.isSafeInteger(binding.index) &&
            (binding.index as number) >= 0 &&
            typeof binding.center === "number" &&
            Number.isFinite(binding.center) &&
            typeof binding.range === "number" &&
            Number.isFinite(binding.range) &&
            binding.range > 0 &&
            typeof binding.invert === "boolean"
          );
        }))) &&
    Number.isSafeInteger(value.xAxis) &&
    (value.xAxis as number) >= 0 &&
    Number.isSafeInteger(value.yAxis) &&
    (value.yAxis as number) >= 0 &&
    typeof value.invertX === "boolean" &&
    typeof value.invertY === "boolean" &&
    ["centerX", "centerY"].every(
      (key) =>
        value[key] === undefined ||
        (typeof value[key] === "number" && Number.isFinite(value[key])),
    ) &&
    ["rangeX", "rangeY"].every(
      (key) =>
        value[key] === undefined ||
        (typeof value[key] === "number" &&
          Number.isFinite(value[key]) &&
          (value[key] as number) > 0),
    )
  );
}

export function isControllerProfile(
  value: unknown,
): value is ControllerProfile {
  if (!record(value) || !record(value.bindings)) return false;
  const bindings = value.bindings;
  return (
    typeof value.accepted === "boolean" &&
    (!value.accepted || value.calibrationVersion === 2) &&
    (value.axisRest === undefined ||
      (Array.isArray(value.axisRest) &&
        value.axisRest.every(
          (item: unknown) =>
            typeof item === "number" &&
            Number.isFinite(item) &&
            item >= -1 &&
            item <= 1,
        ))) &&
    axisMapping(value.leftMapping) &&
    axisMapping(value.rightMapping) &&
    typeof value.deadzone === "number" &&
    value.deadzone > 0 &&
    value.deadzone < 1 &&
    Array.isArray(value.discovered) &&
    value.discovered.every((item: unknown) => typeof item === "string") &&
    (value.visualButtons === undefined ||
      (Array.isArray(value.visualButtons) &&
        value.visualButtons.length === 16 &&
        value.visualButtons.every(
          (index: unknown) =>
            index === null ||
            (Number.isSafeInteger(index) && (index as number) >= 0),
        ))) &&
    (value.visualSignals === undefined ||
      (Array.isArray(value.visualSignals) &&
        value.visualSignals.length === 16 &&
        value.visualSignals.every(
          (signals: unknown) =>
            Array.isArray(signals) &&
            signals.every((signal: unknown) => typeof signal === "string"),
        ))) &&
    Object.keys(defaultBindings).every((key) => {
      const index = bindings[key];
      return (
        index === null ||
        (Number.isSafeInteger(index) && (index as number) >= 0)
      );
    })
  );
}

export function loadProfile(id: string): ControllerProfile | null {
  try {
    const raw = localStorage.getItem(profileKey(id));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isControllerProfile(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveProfile(id: string, profile: ControllerProfile): void {
  try {
    localStorage.setItem(profileKey(id), JSON.stringify(profile));
  } catch (error) {
    console.warn("Could not save controller profile", error);
  }
}
