// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Controller } from "./Controller";
import type { GamepadSnapshot } from "../typing";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("combined controller", () => {
  let container: HTMLDivElement;
  let root: Root;
  const base: GamepadSnapshot = {
    id: "Pad",
    index: 0,
    connected: true,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
  };
  const pressed = (index: number): GamepadSnapshot => ({
    ...base,
    buttons: base.buttons.map((button, i) =>
      i === index ? { pressed: true, value: 1 } : button,
    ),
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("there,10\nthen,9\n")),
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("disables suggestions and their focus shortcut during timed input", () => {
    const onActionInput = vi.fn();
    const render = (pad: GamepadSnapshot) =>
      act(() =>
        root.render(
          <Controller
            pad={pad}
            value="th"
            autocompleteEnabled={false}
            onValueChange={() => undefined}
            onCharacterInput={() => undefined}
            onActionInput={onActionInput}
          />,
        ),
      );
    render(base);
    render(pressed(3));
    render(base);
    render(pressed(0));
    expect(container.querySelector(".autocomplete")).toBeNull();
    expect(onActionInput).toHaveBeenCalledWith("enter");
  });

  it("navigates visible suggestions with X, D-pad, and B", async () => {
    const onValueChange = vi.fn();
    const onActionInput = vi.fn();
    const render = (pad: GamepadSnapshot) =>
      act(() =>
        root.render(
          <Controller
            pad={pad}
            value="th"
            onValueChange={onValueChange}
            onCharacterInput={() => undefined}
            onActionInput={onActionInput}
          />,
        ),
      );
    render(base);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const input =
      container.querySelector<HTMLInputElement>("#word-autocomplete");
    expect(input?.readOnly).toBe(true);
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(2);
    expect(container.textContent).not.toContain("Show autocomplete");
    render(pressed(3));
    expect(document.activeElement).toBe(input);
    render(base);
    render(pressed(13));
    expect(container.querySelector('[aria-selected="true"]')?.textContent).toBe(
      "then",
    );
    expect(onActionInput).not.toHaveBeenCalledWith("cursorDown");
    render(base);
    render(pressed(0));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("then ");
    act(() => {
      container.querySelector<HTMLButtonElement>("#word-suggestion-0")?.click();
    });
    expect(onValueChange.mock.calls).toEqual([["then "], ["there "]]);
    expect(onActionInput).not.toHaveBeenCalledWith("enter");
    expect(document.activeElement).toBe(
      container.querySelector(".controller-component__dials"),
    );
  });

  it("accepts the first suggestion with the right face button without entering selection mode", async () => {
    const onValueChange = vi.fn();
    const onActionInput = vi.fn();
    const render = (pad: GamepadSnapshot) =>
      act(() =>
        root.render(
          <Controller
            pad={pad}
            value="th"
            onValueChange={onValueChange}
            onCharacterInput={() => undefined}
            onActionInput={onActionInput}
          />,
        ),
      );
    render(base);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    render(pressed(1));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("there ");
    expect(container.querySelector('[aria-selected="true"]')).toBeNull();
    expect(document.activeElement).not.toBe(
      container.querySelector<HTMLInputElement>("#word-autocomplete"),
    );
    expect(onActionInput).not.toHaveBeenCalled();
  });

  it("types stick characters while autocomplete selection stays active", async () => {
    const characters: string[] = [];
    const actions: string[] = [];
    const render = (pad: GamepadSnapshot) =>
      act(() =>
        root.render(
          <Controller
            pad={pad}
            value="th"
            onValueChange={() => undefined}
            onCharacterInput={(character) => characters.push(character)}
            onActionInput={(action) => actions.push(action)}
          />,
        ),
      );

    render(base);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    render(pressed(3));
    expect(container.querySelector('[aria-selected="true"]')).not.toBeNull();
    render(base);
    render({ ...base, axes: [0, -1, 0, 0] });
    render(base);

    expect(characters).toEqual(["e"]);
    expect(container.querySelector('[aria-selected="true"]')).not.toBeNull();
    render(pressed(4));
    render(base);
    render(pressed(5));
    expect(actions).toContain("backspace");
    expect(actions).toContain("space");
  });

  it("repeats editing actions until their buttons are released", () => {
    vi.useFakeTimers();
    const onActionInput = vi.fn();
    const render = (pad: GamepadSnapshot) =>
      act(() =>
        root.render(
          <Controller
            pad={pad}
            value=""
            onValueChange={() => undefined}
            onCharacterInput={() => undefined}
            onActionInput={onActionInput}
          />,
        ),
      );
    render(base);
    for (const [index, action] of [
      [4, "backspace"],
      [0, "enter"],
      [5, "space"],
    ] as const) {
      onActionInput.mockClear();
      render(pressed(index));
      expect(onActionInput).toHaveBeenCalledWith(action);
      act(() => vi.advanceTimersByTime(600));
      expect(onActionInput.mock.calls.length).toBeGreaterThan(2);
      render(base);
      const count = onActionInput.mock.calls.length;
      act(() => vi.advanceTimersByTime(600));
      expect(onActionInput.mock.calls).toHaveLength(count);
    }
  });
});
