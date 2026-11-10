import { readStickPosition, type AxisMapping } from "./axisMapping";
import type { GamepadSnapshot } from "../typing";

const BASELINE_MS = 450;
export const REST_MS = 2000;
const HOLD_MS = 900;
const CIRCLE_MS = 1700;
const CHANGE = 0.55;
const STICK_CHANGE = 0.35;

export type CaptureWindow = {
  startedAt: number;
  ready: boolean;
  baselineButtons: number[];
  baselinePressed: boolean[];
  physicalButtonCount: number;
  baselineAxes: number[];
  candidate: number | null;
  candidateSince: number;
  candidateSamples: number;
  motionStartedAt: number | null;
  directionPeak: number;
  stableSince: number;
  lastAxes: number[];
  restSamples: number;
  restSums: number[];
  armed: boolean;
  armedButtons: Set<number>;
  armedAxes: Set<number>;
  visited: Set<string>;
};

export function beginCapture(pad: GamepadSnapshot, now: number): CaptureWindow {
  return {
    startedAt: now,
    ready: false,
    baselineButtons: pad.buttons.map((button) => button.value),
    baselinePressed: pad.buttons.map((button) => button.pressed),
    physicalButtonCount: pad.physicalButtonCount ?? pad.buttons.length,
    baselineAxes: [...pad.axes],
    candidate: null,
    candidateSince: now,
    candidateSamples: 0,
    motionStartedAt: null,
    directionPeak: 0,
    stableSince: now,
    lastAxes: [...pad.axes],
    restSamples: 0,
    restSums: pad.axes.map(() => 0),
    armed: false,
    armedButtons: new Set(),
    armedAxes: new Set(),
    visited: new Set(),
  };
}

function settle(state: CaptureWindow, now: number) {
  if (state.ready) return true;
  if (now - state.startedAt < BASELINE_MS) return false;
  state.ready = true;
  return true;
}

export function sampleButton(
  state: CaptureWindow,
  pad: GamepadSnapshot,
  now: number,
): number | null {
  const settled = settle(state, now);
  const active = pad.buttons.map((button, index) =>
    index >= state.physicalButtonCount
      ? button.value - (state.baselineButtons[index] ?? 0) >= CHANGE
      : button.value - (state.baselineButtons[index] ?? 0) >= CHANGE ||
        (button.pressed && !state.baselinePressed[index]),
  );
  active.forEach((changed, index) => {
    if (!changed) state.armedButtons.add(index);
  });
  state.armed = state.armedButtons.size > 0;
  const candidate = active.findIndex(
    (changed, index) => changed && state.armedButtons.has(index),
  );
  if (candidate < 0) {
    state.candidate = null;
    state.candidateSamples = 0;
    return null;
  }
  if (!settled || !state.armed) return null;
  if (candidate !== state.candidate) {
    state.candidate = candidate < 0 ? null : candidate;
    state.candidateSince = now;
    state.candidateSamples = candidate < 0 ? 0 : 1;
    return null;
  }
  if (candidate < 0) return null;
  state.candidateSamples += 1;
  return now - state.candidateSince >= HOLD_MS && state.candidateSamples >= 4
    ? candidate
    : null;
}

export function sampleDirection(
  state: CaptureWindow,
  pad: GamepadSnapshot,
  now: number,
  excluded: readonly number[] = [],
): { index: number; invert: boolean; center: number; range: number } | null {
  const settled = settle(state, now);
  const changes = pad.axes
    .map((value, index) => ({
      index,
      delta: value - (state.baselineAxes[index] ?? 0),
    }))
    .filter(({ index, delta }) => {
      if (excluded.includes(index)) return false;
      if (Math.abs(delta) < 0.12) state.armedAxes.add(index);
      return state.armedAxes.has(index);
    })
    .sort((a, b) => {
      const score = (change: typeof a) =>
        Math.abs(change.delta) /
        Math.max(
          0.01,
          change.delta > 0
            ? 1 - state.baselineAxes[change.index]
            : 1 + state.baselineAxes[change.index],
        );
      return score(b) - score(a);
    });
  state.armed = state.armedAxes.size > 0;
  const strongest = changes[0];
  if (!strongest || Math.abs(strongest.delta) < 0.12) {
    state.candidate = null;
    state.candidateSamples = 0;
    return null;
  }
  if (!settled || !state.armed) return null;
  if (Math.abs(strongest.delta) < STICK_CHANGE) {
    state.candidate = null;
    state.candidateSamples = 0;
    return null;
  }
  if (
    state.candidate !== strongest.index ||
    Math.sign(state.directionPeak) !== Math.sign(strongest.delta)
  ) {
    state.candidate = strongest.index;
    state.candidateSince = now;
    state.candidateSamples = 1;
    state.directionPeak = strongest.delta;
    return null;
  }
  state.candidateSamples++;
  if (Math.abs(strongest.delta) > Math.abs(state.directionPeak))
    state.directionPeak = strongest.delta;
  if (now - state.candidateSince < HOLD_MS || state.candidateSamples < 4)
    return null;
  return {
    index: strongest.index,
    invert: state.directionPeak < 0,
    center: state.baselineAxes[strongest.index] ?? 0,
    range: Math.abs(state.directionPeak),
  };
}

export function sampleRest(
  state: CaptureWindow,
  pad: GamepadSnapshot,
  now: number,
): readonly number[] | null {
  // Compare with the start of the stable interval, not just the previous
  // frame: slow motion must not masquerade as a resting controller.
  const moving = pad.axes.some(
    (value, index) => Math.abs(value - (state.lastAxes[index] ?? 0)) > 0.04,
  );
  const buttonsChanged = pad.buttons.some(
    (button, index) =>
      Math.abs(button.value - (state.baselineButtons[index] ?? 0)) > 0.04 ||
      button.pressed !== state.baselinePressed[index],
  );
  if (moving || buttonsChanged) {
    state.baselineButtons = pad.buttons.map((button) => button.value);
    state.baselinePressed = pad.buttons.map((button) => button.pressed);
    state.stableSince = now;
    state.lastAxes = [...pad.axes];
    state.restSamples = 0;
    state.restSums = pad.axes.map(() => 0);
  }
  state.restSamples++;
  pad.axes.forEach((value, index) => {
    state.restSums[index] += value;
  });
  return now - state.stableSince >= REST_MS && state.restSamples >= 20
    ? state.restSums.map((sum) => sum / state.restSamples)
    : null;
}

export function sampleMappedCircle(
  state: CaptureWindow,
  pad: GamepadSnapshot,
  mapping: AxisMapping,
  now: number,
): boolean {
  if (!settle(state, now)) return false;
  const { x, y } = readStickPosition(pad.axes, mapping);
  if (x > 0.6) state.visited.add("right");
  if (x < -0.6) state.visited.add("left");
  if (y > 0.6) state.visited.add("down");
  if (y < -0.6) state.visited.add("up");
  if (state.visited.size) state.motionStartedAt ??= now;
  return (
    state.visited.size === 4 &&
    state.motionStartedAt !== null &&
    now - state.motionStartedAt >= CIRCLE_MS
  );
}
