// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ControllerDials } from "./ControllerDials";
import { readStickPosition, defaultRightMapping } from "./axisMapping";
import type { GamepadSnapshot } from "./useGamepad";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("controller dial input", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("reads the standard axis pairs and a chosen raw axis pair", () => {
    expect(
      readStickPosition([0.3, -0.4, 0.5, -0.6], defaultRightMapping),
    ).toEqual({
      x: 0.5,
      y: -0.6,
    });
    expect(
      readStickPosition([0, 0, 0, 0, 0, 0, 0.5, -1], {
        xAxis: 6,
        yAxis: 7,
        invertX: true,
        invertY: false,
      }),
    ).toEqual({ x: -0.5, y: -1 });
  });

  it("highlights through axes 6 and 7 after remapping the right stick", () => {
    const pad: GamepadSnapshot = {
      id: "Raw controller",
      index: 0,
      connected: true,
      mapping: "",
      axes: [0, -1, 0, 0, 0, 0, 0, -1],
      buttons: [],
    };

    act(() => root.render(<ControllerDials pad={pad} />));
    expect(
      container
        .querySelector('[data-dial-id="left"] .dial-slice--highlighted')
        ?.getAttribute("data-character"),
    ).toBe("a");
    expect(
      container.querySelector(
        '[data-dial-id="right"] .dial-slice--highlighted',
      ),
    ).toBeNull();

    const chooseAxis = (id: string, axis: number) => {
      const select = container.querySelector<HTMLSelectElement>(`#${id}`);
      if (!select) {
        throw new Error(`Missing ${id} selector`);
      }
      act(() => {
        select.value = String(axis);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    };

    chooseAxis("right-x-axis", 6);
    chooseAxis("right-y-axis", 7);
    expect(
      container
        .querySelector('[data-dial-id="right"] .dial-slice--highlighted')
        ?.getAttribute("data-character"),
    ).toBe("n");

    const numberLayerButton = Array.from(
      container.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Numbers + symbols"));
    if (!numberLayerButton) {
      throw new Error("Missing numbers layer button");
    }
    act(() => numberLayerButton.click());
    expect(
      container
        .querySelector('[data-dial-id="left"] .dial-slice--highlighted')
        ?.getAttribute("data-character"),
    ).toBe("2");
    expect(
      container
        .querySelector('[data-dial-id="right"] .dial-slice--highlighted')
        ?.getAttribute("data-character"),
    ).toBe("7");
  });
});
