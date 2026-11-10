// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { defaultBindings, leftDialConfig, rightDialConfig } from "../typing";
import type { GamepadSnapshot } from "../typing";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import { ConfigPage } from "./ConfigPage";
import type { Layout } from "./configModel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

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
  buttons: base.buttons.map((button, buttonIndex) =>
    buttonIndex === index ? { pressed: true, value: 1 } : button,
  ),
});

describe("Config page controller navigation", () => {
  it("edits slices, confirms changes, and switches sections with the controller", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    function Harness({ pad }: { pad: GamepadSnapshot }) {
      const [layout, setLayout] = useState<Layout>({
        left: leftDialConfig,
        right: rightDialConfig,
      });
      const [activeLayerId, setActiveLayerId] = useState("lowercase");
      const [bindings, setBindings] = useState(defaultBindings);
      return (
        <>
          <ConfigPage
            pad={pad}
            layout={layout}
            onLayoutChange={setLayout}
            bindings={bindings}
            onBindingsChange={setBindings}
            activeLayerId={activeLayerId}
            onActiveLayerChange={setActiveLayerId}
            leftMapping={defaultLeftMapping}
            rightMapping={defaultRightMapping}
            onCaptureChange={() => undefined}
            onResetDefaults={() => undefined}
          />
          <output data-testid="saved-top-character">
            {layout.left.layers[0].slices[0].character}
          </output>
        </>
      );
    }
    const render = (pad: GamepadSnapshot) =>
      act(() => root.render(<Harness pad={pad} />));
    render(base);
    render(pressed(10)); // Left stick click adds a slice
    expect(
      container.querySelector(".config-page__dial--active h3")?.textContent,
    ).toContain("14 slices");
    render(base);
    render(pressed(11)); // Right stick click requests deletion
    expect(
      container.querySelector('[role="alertdialog"]')?.textContent,
    ).toContain("Are you sure?");
    expect(
      container.querySelector(".config-page__dial--active h3")?.textContent,
    ).toContain("14 slices");
    render(base);
    render(pressed(15)); // choose Delete
    render(base);
    render(pressed(0)); // B confirms
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(
      container.querySelector(".config-page__dial--active h3")?.textContent,
    ).toContain("13 slices");

    const stickTop = { ...base, axes: [0, -1, 0, 0] };
    const stickTopWithB = { ...pressed(0), axes: stickTop.axes };
    render(stickTop);
    render(stickTopWithB); // pick the top slice
    expect(
      container.querySelector('[aria-label="Slice action"]'),
    ).not.toBeNull();
    render(stickTop);
    render(stickTopWithB); // choose Remap
    expect(
      container.querySelector('[aria-label="QWERTY keyboard"]'),
    ).not.toBeNull();
    render(stickTop);
    render({ ...pressed(15), axes: stickTop.axes }); // choose W
    render(stickTop);
    render(stickTopWithB);
    expect(
      container.querySelector('[aria-label="Confirm remap"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain(
      'Character "w" is assigned 2 times.',
    );
    render(stickTop);
    render(stickTopWithB);
    expect(container.textContent).toContain(
      'Character "w" is assigned 2 times.',
    );

    render(stickTop);
    render(stickTopWithB); // pick the remapped slice again
    render(stickTop);
    render({ ...pressed(15), axes: stickTop.axes }); // choose Move
    render(stickTop);
    render(stickTopWithB); // enter move mode
    render(stickTop);
    render({ ...base, axes: [1, 0, 0, 0] }); // drag toward the right
    render(base); // return to center, preview only
    expect(container.querySelector('[aria-label="Move slice"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="saved-top-character"]')
        ?.textContent,
    ).toBe("w");
    render(pressed(0)); // confirm the new position
    expect(
      container.querySelector('[data-testid="saved-top-character"]')
        ?.textContent,
    ).toBe("h");
    expect(
      container
        .querySelector('[data-dial-id="left"] .dial-slice')
        ?.getAttribute("data-character"),
    ).toBe("h");

    render(pressed(3)); // generic mappings
    render(base);
    render(pressed(0)); // capture selected action
    expect(
      container.querySelector('[aria-label="Capture button"]'),
    ).not.toBeNull();
    render(base);
    render(pressed(2)); // assign button 2
    expect(
      container.querySelector("tbody tr:first-child td:last-child")
        ?.textContent,
    ).toBe("Left face button");
    act(() => root.unmount());
    container.remove();
  });
});
