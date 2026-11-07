import { describe, expect, it } from "vitest";
import {
  defaultBindings,
  initialControllerEventState,
  readControllerEvents,
} from "./controllerEvents";
import type { GamepadSnapshot } from "./useGamepads";

const center = { x: 0, y: 0 };

function padWithButtons(
  pressed: readonly number[] = [],
  analog: readonly number[] = [],
): GamepadSnapshot {
  return {
    id: "Test controller",
    index: 0,
    connected: true,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 18 }, (_, index) => ({
      pressed: pressed.includes(index),
      value: analog.includes(index) ? 0.7 : pressed.includes(index) ? 1 : 0,
    })),
  };
}

describe("controller events", () => {
  it("emits the last highlighted character when each stick returns to center", () => {
    const first = readControllerEvents(
      initialControllerEventState,
      padWithButtons(),
      defaultBindings,
      { x: 0, y: -1 },
      { x: 0, y: -1 },
      0.2,
      (side) => ({
        character: side === "left" ? "a" : "n",
        layerId: "lowercase",
      }),
    );
    expect(first.events).toEqual([
      {
        kind: "stick",
        side: "left",
        phase: "enter",
        position: { x: 0, y: -1 },
      },
      {
        kind: "stick",
        side: "right",
        phase: "enter",
        position: { x: 0, y: -1 },
      },
    ]);

    const held = readControllerEvents(
      first.state,
      padWithButtons(),
      defaultBindings,
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      0.2,
      (side) => ({
        character: side === "left" ? "s" : "r",
        layerId: "lowercase",
      }),
    );
    expect(held.events).toEqual([]);

    const centered = readControllerEvents(
      held.state,
      padWithButtons(),
      defaultBindings,
      center,
      center,
      0.2,
    );
    expect(centered.events).toEqual([
      { kind: "stick", side: "left", phase: "center", position: center },
      { kind: "character", side: "left", character: "s", layerId: "lowercase" },
      { kind: "stick", side: "right", phase: "center", position: center },
      {
        kind: "character",
        side: "right",
        character: "r",
        layerId: "lowercase",
      },
    ]);
    const next = readControllerEvents(
      centered.state,
      padWithButtons(),
      defaultBindings,
      { x: 0, y: -1 },
      center,
      0.2,
      () => ({ character: "2", layerId: "numbers-symbols" }),
    );
    expect(next.events).toEqual([
      {
        kind: "stick",
        side: "left",
        phase: "enter",
        position: { x: 0, y: -1 },
      },
    ]);
    const nextCenter = readControllerEvents(
      next.state,
      padWithButtons(),
      defaultBindings,
      center,
      center,
      0.2,
    );
    expect(nextCenter.events).toContainEqual({
      kind: "character",
      side: "left",
      character: "2",
      layerId: "numbers-symbols",
    });
  });

  it.each([
    [0, "enter"],
    [3, "autocomplete"],
    [4, "backspace"],
    [5, "space"],
    [6, "previousLayer"],
    [7, "nextLayer"],
    [8, "close"],
    [9, "submit"],
    [10, "commitLeft"],
    [11, "commitRight"],
    [12, "cursorUp"],
    [13, "cursorDown"],
    [14, "cursorLeft"],
    [15, "cursorRight"],
  ] as const)("maps button %i to %s", (buttonIndex, action) => {
    const result = readControllerEvents(
      initialControllerEventState,
      padWithButtons([buttonIndex]),
      defaultBindings,
      center,
      center,
      0.2,
    );
    expect(result.events).toEqual([
      { kind: "button", buttonIndex, phase: "press", action },
    ]);
  });

  it("emits one press and one release for an analog trigger", () => {
    const pressed = readControllerEvents(
      initialControllerEventState,
      padWithButtons([], [6]),
      defaultBindings,
      center,
      center,
      0.2,
    );
    expect(pressed.events).toEqual([
      {
        kind: "button",
        buttonIndex: 6,
        phase: "press",
        action: "previousLayer",
      },
    ]);

    const held = readControllerEvents(
      pressed.state,
      padWithButtons([], [6]),
      defaultBindings,
      center,
      center,
      0.2,
    );
    expect(held.events).toEqual([]);

    const released = readControllerEvents(
      held.state,
      padWithButtons(),
      defaultBindings,
      center,
      center,
      0.2,
    );
    expect(released.events).toEqual([
      {
        kind: "button",
        buttonIndex: 6,
        phase: "release",
        action: "previousLayer",
      },
    ]);
  });

  it("reports unassigned buttons and stick center crossings", () => {
    const first = readControllerEvents(
      initialControllerEventState,
      padWithButtons([1]),
      defaultBindings,
      { x: 0, y: -1 },
      center,
      0.2,
    );
    expect(first.events).toEqual([
      { kind: "button", buttonIndex: 1, phase: "press", action: null },
      {
        kind: "stick",
        side: "left",
        phase: "enter",
        position: { x: 0, y: -1 },
      },
    ]);

    const moved = readControllerEvents(
      first.state,
      padWithButtons([1]),
      defaultBindings,
      { x: 1, y: 0 },
      center,
      0.2,
    );
    expect(moved.events).toEqual([]);

    const centered = readControllerEvents(
      moved.state,
      padWithButtons(),
      defaultBindings,
      center,
      center,
      0.2,
    );
    expect(centered.events).toEqual([
      { kind: "button", buttonIndex: 1, phase: "release", action: null },
      { kind: "stick", side: "left", phase: "center", position: center },
    ]);
  });
});
