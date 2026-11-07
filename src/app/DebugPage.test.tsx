// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { defaultBindings, leftDialConfig, rightDialConfig } from "../typing";
import type { GamepadSnapshot } from "../typing";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import { DebugPage } from "./DebugPage";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("Debug page", () => {
  it("renders the shared controller with autocomplete and diagnostics", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("there,10\n")),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const pad: GamepadSnapshot = {
      id: "Pad",
      index: 0,
      connected: true,
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: [],
    };
    act(() =>
      root.render(
        <DebugPage
          pad={pad}
          gamepads={{ 0: pad }}
          leftConfig={leftDialConfig}
          rightConfig={rightDialConfig}
          activeLayerId="lowercase"
          onActiveLayerChange={() => undefined}
          leftMapping={defaultLeftMapping}
          rightMapping={defaultRightMapping}
          onLeftMappingChange={() => undefined}
          onRightMappingChange={() => undefined}
          bindings={defaultBindings}
          deadzone={0.2}
        />,
      ),
    );
    const controller = container.querySelector(
      '[aria-label="Controller input"]',
    );
    expect(
      controller?.querySelector('[aria-label="Word autocomplete"]'),
    ).not.toBeNull();
    expect(
      controller?.querySelector('[aria-label="Controller dials"]'),
    ).not.toBeNull();
    expect(container.querySelector('[aria-label="Typed text"]')).not.toBeNull();
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
});
