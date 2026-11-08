// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import {
  defaultBindings,
  leftDialConfig,
  rightDialConfig,
  type GamepadSnapshot,
} from "../typing";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import { ComparisonPage } from "./ComparisonPage";
import { typingTestPrompts } from "./typingTest";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("picks a new comparison sentence on reset", () => {
  const random = vi
    .spyOn(Math, "random")
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(0.8);
  const container = document.createElement("div");
  const root = createRoot(container);
  const pad: GamepadSnapshot = {
    id: "Pad",
    index: 0,
    connected: true,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: [],
  };
  try {
    act(() =>
      root.render(
        <ComparisonPage
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
    expect(
      container.querySelector(".typing-test-page__prompt")?.textContent,
    ).toBe(typingTestPrompts[0]);
    act(() =>
      container
        .querySelector<HTMLButtonElement>(".typing-test-page__reset")
        ?.click(),
    );
    expect(
      container.querySelector(".typing-test-page__prompt")?.textContent,
    ).toBe(typingTestPrompts[4]);
  } finally {
    act(() => root.unmount());
    container.remove();
    random.mockRestore();
  }
});
