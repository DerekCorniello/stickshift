// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useGamepads } from "./useGamepads";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Probe() {
  const pads = useGamepads();
  return <span>{pads[2]?.id ?? "Disconnected"}</span>;
}

let container: HTMLDivElement;
let root: Root;
let pads: (Gamepad | null)[];

beforeEach(() => {
  pads = [];
  vi.stubGlobal(
    "navigator",
    Object.assign(Object.create(navigator), { getGamepads: () => pads }),
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("recognizes a newly connected controller from the browser event", () => {
  act(() => root.render(<Probe />));
  const pad = {
    id: "Unusual controller",
    index: 2,
    connected: true,
    mapping: "",
    axes: [0, 0],
    buttons: [{ pressed: false, value: 0 }],
  } as unknown as Gamepad;
  act(() => {
    const event = new Event("gamepadconnected") as GamepadEvent;
    Object.defineProperty(event, "gamepad", { value: pad });
    window.dispatchEvent(event);
  });
  expect(container.textContent).toBe("Unusual controller");
  pads[2] = pad;
  act(() => {
    pads[2] = null;
    const event = new Event("gamepaddisconnected") as GamepadEvent;
    Object.defineProperty(event, "gamepad", { value: pad });
    window.dispatchEvent(event);
  });
  expect(container.textContent).toBe("Disconnected");
});
