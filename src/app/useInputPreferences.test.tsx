// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInputPreferences } from "./useInputPreferences";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("controller input preferences", () => {
  let root: Root;
  let container: HTMLDivElement;
  let current: ReturnType<typeof useInputPreferences>;
  function Probe({ id }: { id: string }) {
    current = useInputPreferences(id);
    return <output>{current.deadzone}</output>;
  }
  const render = (id: string) => act(() => root.render(<Probe id={id} />));
  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.restoreAllMocks();
  });

  it("keeps each controller's settings separate and restores them after remount", () => {
    render("one");
    act(() => {
      current.setDeadzone(0.35);
      current.setSelectionMode("manual");
      current.setRightMapping({
        xAxis: 6,
        yAxis: 7,
        invertX: true,
        invertY: false,
      });
    });
    render("two");
    expect(current.deadzone).toBe(0.2);
    expect(current.rightMapping.xAxis).toBe(2);
    act(() => current.setDeadzone(0.4));
    render("one");
    expect(current.deadzone).toBe(0.35);
    expect(current.selectionMode).toBe("manual");
    act(() => root.unmount());
    root = createRoot(container);
    render("two");
    expect(current.deadzone).toBe(0.4);
    render("one");
    expect(current.rightMapping).toEqual({
      xAxis: 6,
      yAxis: 7,
      invertX: true,
      invertY: false,
    });
    expect(current.deadzone).toBe(0.35);
  });

  it("loads an existing controller on first render without overwriting it with the previous one", () => {
    localStorage.setItem(
      "stickshift.input.v1:two",
      JSON.stringify({
        leftMapping: { xAxis: 4, yAxis: 5, invertX: false, invertY: true },
        rightMapping: { xAxis: 6, yAxis: 7, invertX: false, invertY: false },
        deadzone: 0.45,
        selectionMode: "manual",
      }),
    );
    render("one");
    render("two");
    expect(container.textContent).toBe("0.45");
    expect(
      JSON.parse(localStorage.getItem("stickshift.input.v1:two") ?? "{}")
        .leftMapping.xAxis,
    ).toBe(4);
  });

  it.each([
    "{broken",
    JSON.stringify({ deadzone: -1 }),
    JSON.stringify({
      leftMapping: { xAxis: -1, yAxis: 0, invertX: false, invertY: false },
      rightMapping: { xAxis: 2, yAxis: 3, invertX: false, invertY: false },
      deadzone: 0.2,
      selectionMode: "auto",
    }),
  ])("rejects invalid saved settings", (raw) => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem("stickshift.input.v1:one", raw);
    render("one");
    expect(current.deadzone).toBe(0.2);
    expect(current.leftMapping.xAxis).toBe(0);
  });
});
