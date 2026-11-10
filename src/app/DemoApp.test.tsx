// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { DemoApp } from "./DemoApp";
import { defaultBindings, type GamepadSnapshot } from "../typing";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import { profileKey } from "./controllerSetup";

const gamepadState = vi.hoisted(() => ({
  pads: {} as Record<number, GamepadSnapshot>,
}));
vi.mock("../typing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../typing")>()),
  useGamepads: () => gamepadState.pads,
}));
const basePad: GamepadSnapshot = {
  id: "Test controller",
  index: 0,
  connected: true,
  mapping: "standard",
  axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
};

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("demo interface", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    localStorage.clear();
    gamepadState.pads = {};
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("every,20\neven,10\n")),
    );
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  const key = (type: "keydown" | "keyup", value: string) => {
    const event = new KeyboardEvent(type, {
      key: value,
      bubbles: true,
      cancelable: true,
    });
    act(() => window.dispatchEvent(event));
    return event;
  };
  const render = async () => {
    await act(async () => root.render(<DemoApp />));
  };
  it("renders the writing area and both dials without hardware", async () => {
    await render();
    expect(container.querySelector(".fieldnotes")).not.toBeNull();
    expect(container.querySelectorAll(".dial")).toHaveLength(2);
    expect(
      container.querySelector('[aria-label="Controller writing area"]'),
    ).not.toBeNull();
    expect(container.querySelector(".variant-switcher")).toBeNull();
    expect(container.querySelector(".sidebar-stats")).toBeNull();
    expect(container.querySelector(".controller-hud__caption")).toBeNull();
    expect(container.querySelector(".controller-hud__key")).toBeNull();
    expect(container.querySelector(".quick-control__action")?.textContent).toBe(
      "Space",
    );
  });
  it("selects a controller that connects after another one", async () => {
    gamepadState.pads = { 0: basePad };
    await render();
    gamepadState.pads = {
      0: basePad,
      2: { ...basePad, id: "New controller", index: 2 },
    };
    await render();
    expect(
      container.querySelector<HTMLSelectElement>(
        'select[aria-label="Controller"]',
      )?.value,
    ).toBe("2");
  });
  it("does not treat keyboard input as controller input", async () => {
    await render();
    const initialText = container.querySelector(
      '[aria-label="Controller writing area"]',
    )!.textContent;
    key("keydown", "w");
    key("keyup", "w");
    expect(
      container.querySelector('[aria-label="Controller writing area"]')!
        .textContent,
    ).toBe(initialText);
  });
  it("submits a timed run with the physical Start binding without changing pages", async () => {
    localStorage.setItem(
      profileKey(basePad.id),
      JSON.stringify({
        accepted: true,
        calibrationVersion: 2,
        bindings: defaultBindings,
        leftMapping: defaultLeftMapping,
        rightMapping: defaultRightMapping,
        deadzone: 0.2,
        discovered: [],
        axisRest: basePad.axes,
      }),
    );
    gamepadState.pads = { 0: basePad };
    await render();
    const speed = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".variant-nav button"),
    ).find((button) => button.textContent?.includes("Speed test"))!;
    await act(async () => speed.click());
    expect(container.querySelector(".typing-test-page")).not.toBeNull();
    expect(container.querySelector(".autocomplete")).toBeNull();
    gamepadState.pads = {
      0: {
        ...basePad,
        buttons: basePad.buttons.map((button, index) =>
          index === defaultBindings.submit
            ? { pressed: true, value: 1 }
            : button,
        ),
      },
    };
    await render();
    expect(container.querySelector(".typing-test-page")).not.toBeNull();
    expect(container.textContent).toContain("Test complete.");
    expect(location.hash).toBe("#test");
  });
  it("leaves normal Tab navigation to the browser", async () => {
    await render();
    const event = key("keydown", "Tab");
    expect(event.defaultPrevented).toBe(false);
    key("keyup", "Tab");
    expect(container.querySelector(".controller-component__mode")).toBeNull();
  });
});
