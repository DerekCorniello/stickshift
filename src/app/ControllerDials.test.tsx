// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ControllerDials } from "./ControllerDials";
import { readStickPosition, defaultRightMapping } from "./axisMapping";
import type { GamepadSnapshot } from "../typing";

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

  it("clicking a held stick cancels its character until it returns to center", () => {
    const characters: string[] = [];
    const base: GamepadSnapshot = {
      id: "Pad",
      index: 0,
      connected: true,
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    };
    const render = (axes: number[], clicked: 10 | 11 | null = null) =>
      act(() =>
        root.render(
          <ControllerDials
            pad={{
              ...base,
              axes,
              buttons: base.buttons.map((button, index) =>
                index === clicked ? { pressed: true, value: 1 } : button,
              ),
            }}
            onCharacterInput={(character) => characters.push(character)}
          />,
        ),
      );
    render([0, 0, 0, 0]);
    render([0, -1, 0, -1]);
    render([0, -1, 0, -1], 10);
    expect(characters).toEqual([]);
    expect(
      container.querySelector(
        '[data-dial-id="left"] .dial-slice--highlighted',
      ) === null,
    ).toBe(true);
    expect(
      container.querySelector('[aria-label="Left highlighted character"]')
        ?.textContent,
    ).toBe("-");
    expect(
      container
        .querySelector('[data-dial-id="right"] .dial-slice--highlighted')
        ?.getAttribute("data-character"),
    ).toBe("t");
    expect(
      container.querySelector('[data-dial-id="left"] .dial-layer__stick-dot'),
    ).not.toBeNull();
    render([1, 0, 0, -1]);
    expect(
      container.querySelector(
        '[data-dial-id="left"] .dial-slice--highlighted',
      ) === null,
    ).toBe(true);
    render([0, 0, 0, -1]);
    expect(characters).toEqual([]);
    render([0, -1, 0, -1]);
    expect(
      container
        .querySelector('[data-dial-id="left"] .dial-slice--highlighted')
        ?.getAttribute("data-character"),
    ).toBe("e");
    render([0, 0, 0, -1]);
    expect(characters).toEqual(["e"]);
    render([0, 0, 0, 0]);
    expect(characters).toEqual(["e", "t"]);
    render([0, -1, 0, 0]);
    render([0, 0, 0, 0]);
    expect(characters).toEqual(["e", "t", "e"]);
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
    ).toBe("e");
    expect(
      container.querySelector(".controller-dials__events")?.textContent,
    ).not.toContain("would type");
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
    ).toBe("t");
    expect(
      container.querySelector(".controller-dials__events")?.textContent,
    ).not.toContain("would type");

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
    act(() =>
      root.render(<ControllerDials pad={{ ...pad, axes: Array(8).fill(0) }} />),
    );
    expect(
      container.querySelector(".controller-dials__events")?.textContent,
    ).toContain('Left stick would type "2" (numbers-symbols)');
    expect(
      container.querySelector(".controller-dials__events")?.textContent,
    ).toContain('Right stick would type "7" (numbers-symbols)');
  });

  it("switches layers once per trigger press and identifies the new character", () => {
    const base: GamepadSnapshot = {
      id: "Standard controller",
      index: 0,
      connected: true,
      mapping: "standard",
      axes: [0, -1, 0, 0],
      buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
    };
    const renderPad = (pad: GamepadSnapshot) =>
      act(() => root.render(<ControllerDials pad={pad} />));
    const withButton = (index: number, pressed: boolean): GamepadSnapshot => ({
      ...base,
      buttons: base.buttons.map((button, buttonIndex) =>
        buttonIndex === index ? { pressed, value: pressed ? 1 : 0 } : button,
      ),
    });

    renderPad(base);
    renderPad(withButton(7, true));
    expect(
      container.querySelector(".dial-layer")?.getAttribute("data-layer-id"),
    ).toBe("uppercase");
    expect(
      container
        .querySelector('[data-dial-id="left"] .dial-slice--highlighted')
        ?.getAttribute("data-character"),
    ).toBe("E");

    renderPad(withButton(7, true));
    expect(
      container.querySelector(".dial-layer")?.getAttribute("data-layer-id"),
    ).toBe("uppercase");
    renderPad(base);
    renderPad(withButton(6, true));
    expect(
      container.querySelector(".dial-layer")?.getAttribute("data-layer-id"),
    ).toBe("lowercase");
    expect(
      container
        .querySelector('[data-dial-id="left"] .dial-slice--highlighted')
        ?.getAttribute("data-character"),
    ).toBe("e");
    expect(
      container.querySelector(".controller-dials__events")?.textContent,
    ).toContain("LT (6) press: Previous layer");
  });

  it("keeps the confirmed character through boundary wobble and return", () => {
    const base: GamepadSnapshot = {
      id: "Standard controller",
      index: 0,
      connected: true,
      mapping: "standard",
      axes: [0, -1, 0, 0],
      buttons: [],
    };
    const renderPad = (pad: GamepadSnapshot) =>
      act(() => root.render(<ControllerDials pad={pad} />));

    renderPad(base);
    const wobbleAngle = (2 * Math.PI * 0.58) / 13;
    renderPad({
      ...base,
      axes: [Math.sin(wobbleAngle), -Math.cos(wobbleAngle), 0, 0],
    });

    expect(
      container
        .querySelector('[data-dial-id="left"] .dial-slice--highlighted')
        ?.getAttribute("data-character"),
    ).toBe("e");

    renderPad({ ...base, axes: [0, 0, 0, 0] });
    expect(
      container.querySelector('[aria-label="Left highlighted character"]')
        ?.textContent,
    ).toBe("-");
    expect(
      container.querySelector(".controller-dials__events")?.textContent,
    ).toContain('Left stick would type "e" (lowercase)');
  });
});
