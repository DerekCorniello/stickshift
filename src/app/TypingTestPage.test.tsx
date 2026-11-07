// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { TypingTestPage } from "./TypingTestPage";
import {
  defaultBindings,
  leftDialConfig,
  rightDialConfig,
  type GamepadSnapshot,
} from "../typing";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("shows no autocomplete, starts on input, times out, and supports early submission", () => {
  vi.useFakeTimers();
  const now = vi.spyOn(performance, "now").mockReturnValue(10);
  const container = document.createElement("div");
  const root = createRoot(container);
  const base: GamepadSnapshot = {
    id: "Pad",
    index: 0,
    connected: true,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
  };
  const render = (pad: GamepadSnapshot) =>
    act(() =>
      root.render(
        <TypingTestPage
          pad={pad}
          leftConfig={leftDialConfig}
          rightConfig={rightDialConfig}
          activeLayerId="lowercase"
          onActiveLayerChange={() => undefined}
          leftMapping={defaultLeftMapping}
          rightMapping={defaultRightMapping}
          bindings={defaultBindings}
          deadzone={0.2}
        />,
      ),
    );
  try {
    render(base);
    expect(container.querySelector(".autocomplete")).toBeNull();
    render({
      ...base,
      buttons: base.buttons.map((button, index) =>
        index === defaultBindings.space ? { pressed: true, value: 1 } : button,
      ),
    });
    render(base);
    now.mockReturnValue(120010);
    act(() => vi.advanceTimersByTime(100));
    expect(container.textContent).toContain("Test complete.");
    expect(container.textContent).toContain("2:00");
    const retry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Try again",
    )!;
    act(() => retry.click());
    const submit = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Submit run",
    )!;
    act(() => submit.click());
    expect(container.textContent).toContain("Test complete.");
  } finally {
    act(() => root.unmount());
    now.mockRestore();
    vi.useRealTimers();
  }
});
