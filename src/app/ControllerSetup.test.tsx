// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { defaultBindings, type GamepadSnapshot } from "../typing";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import { ControllerSetup, guideSteps } from "./ControllerSetup";
import { isControllerProfile, type ControllerProfile } from "./controllerSetup";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pad: GamepadSnapshot = {
  id: "Unusual pad",
  index: 0,
  connected: true,
  mapping: "",
  axes: [0, 0, -1, -1, 0, 0, 0, 0],
  buttons: Array.from({ length: 18 }, (_, index) => ({
    pressed: false,
    value: index === 6 || index === 7 ? 0.5 : 0,
  })),
};
const initial: ControllerProfile = {
  accepted: false,
  bindings: defaultBindings,
  leftMapping: defaultLeftMapping,
  rightMapping: defaultRightMapping,
  deadzone: 0.2,
  discovered: [],
};

describe("guided controller setup", () => {
  it.each(["axes", "buttons", "digital"])(
    "animates each target and saves sticks reported through %s",
    (source) => {
      vi.useFakeTimers();
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      const saved: ControllerProfile[] = [];
      const render = (current: GamepadSnapshot) =>
        act(() =>
          root.render(
            <ControllerSetup
              pad={{ ...current }}
              initial={initial}
              newController
              onSave={(profile) => saved.push(profile)}
              onClose={() => undefined}
            />,
          ),
        );
      const click = (label: string) => {
        const button = Array.from(
          container.querySelectorAll<HTMLButtonElement>("button"),
        ).find((item) => item.textContent?.includes(label));
        expect(button).toBeDefined();
        act(() => button!.click());
      };
      const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
      const buttonPad = {
        ...pad,
        axes: pad.axes.map((value, index) => (index === 2 ? 1 : value)),
        buttons: pad.buttons.map((button, index) =>
          index === 17 ? { pressed: true, value: 1 } : button,
        ),
      };
      const holdButton = () => {
        wait(500);
        render(pad);
        for (let i = 0; i < 6; i++) {
          wait(200);
          render(buttonPad);
        }
        expect(container.textContent).toContain("Control captured.");
        expect(
          container.querySelector(".controller-hud__target.is-complete"),
        ).not.toBeNull();
        wait(860);
        render(pad);
      };
      const direction = (axis: number, value: number) => {
        wait(500);
        render(pad);
        for (let i = 0; i < 6; i++) {
          wait(200);
          render({
            ...pad,
            axes: pad.axes.map((entry, index) =>
              index === axis && !(source !== "axes" && axis >= 4)
                ? value
                : entry,
            ),
            buttons: pad.buttons.map((button, index) =>
              source === "digital" && axis >= 4
                ? {
                    ...button,
                    pressed:
                      index ===
                      10 +
                        (axis === 4 ? (value > 0 ? 0 : 1) : value < 0 ? 2 : 3),
                  }
                : source === "buttons" && axis >= 4 && index === axis + 2
                  ? { value: (value + 1) / 2, pressed: value > 0 }
                  : button,
            ),
          });
        }
        expect(container.textContent).toContain("Control captured.");
        wait(860);
        render(pad);
      };
      const circle = (xAxis: number, yAxis: number) => {
        wait(500);
        render(pad);
        const positions = [
          [1, 0],
          [1, 1],
          [0, 1],
          [-1, 1],
          [-1, 0],
          [-1, -1],
          [0, -1],
          [1, -1],
          [0, 0],
        ];
        for (const [x, y] of positions) {
          wait(230);
          render({
            ...pad,
            axes: pad.axes.map((value, index) =>
              source !== "axes" && xAxis >= 4
                ? value
                : index === xAxis
                  ? x
                  : index === yAxis
                    ? y
                    : value,
            ),
            buttons: pad.buttons.map((button, index) =>
              source === "digital" && xAxis >= 4
                ? {
                    ...button,
                    pressed:
                      (x > 0 && index === 10) ||
                      (x < 0 && index === 11) ||
                      (y < 0 && index === 12) ||
                      (y > 0 && index === 13),
                  }
                : source === "buttons" &&
                    xAxis >= 4 &&
                    (index === xAxis + 2 || index === yAxis + 2)
                  ? {
                      value: ((index === xAxis + 2 ? x : y) + 1) / 2,
                      pressed: false,
                    }
                  : button,
            ),
          });
        }
        expect(container.textContent).toContain("Control captured.");
        wait(860);
        render(pad);
      };
      const completeGuide = () => {
        expect(container.textContent).toContain("Let the controller rest");
        // An arbitrary opening frame cannot start or finish calibration.
        wait(3000);
        render(pad);
        expect(container.textContent).toContain("Let the controller rest");
        click("Everything is released");
        for (let i = 0; i < 22; i++) {
          wait(100);
          render(pad);
        }

        expect(container.textContent).toContain(
          "Press the rightmost button on the right side.",
        );
        expect(
          container.querySelector(".controller-hud__target"),
        ).not.toBeNull();
        render(buttonPad);
        expect(container.textContent).not.toContain("Control captured.");
        expect(
          container.querySelector(".controller-setup__raw-inputs"),
        ).toBeNull();
        render(pad);
        holdButton();
        for (let index = 0; index < 3; index++) click("Skip this control");

        expect(container.textContent).toContain("Push the left stick right");
        direction(0, 1);
        direction(1, -1);
        direction(0, -1);
        direction(1, 1);
        expect(container.textContent).toContain(
          "Make one slow circle with the left stick",
        );
        circle(0, 1);
        direction(4, 1);
        direction(5, -1);
        direction(4, -1);
        direction(5, 1);
        circle(4, 5);
        for (let index = 14; index < guideSteps.length; index++)
          click("Skip this control");
      };
      try {
        // Setup may open while a trigger is held; this is not neutral.
        render(buttonPad);
        expect(
          container.querySelector('[aria-label="Close controller setup"]'),
        ).toBeNull();
        click("Set up");
        expect(
          container
            .querySelector(".controller-hud image")
            ?.getAttribute("href"),
        ).toBe("/assets/img/gamepads/controller-wireframe.svg");
        completeGuide();
        expect(container.textContent).toContain(
          "Do the controls look right now?",
        );
        expect(container.textContent).not.toContain(
          "These inputs changed during setup but have no position",
        );
        expect(container.querySelector(".controller-hud__target")).toBeNull();
        click("Redo setup");
        expect(saved).toHaveLength(0);
        completeGuide();
        click("Good, save controller");
        expect(saved).toHaveLength(1);
        expect(saved[0].bindings.acceptFirstSuggestion).toBe(17);
        expect(saved[0].visualButtons?.[1]).toBe(17);
        expect(saved[0].visualSignals?.[1]).toEqual([
          "Button 17",
          "Axis 2 +",
          "Axis 25 +",
          "Axis 43 +",
        ]);
        expect(isControllerProfile(saved[0])).toBe(true);
        expect(saved[0].leftMapping.xAxis).toBe(0);
        expect(saved[0].rightMapping.xAxis).toBe(
          source === "digital" ? 36 : source === "buttons" ? 14 : 4,
        );
        expect(saved[0].rightMapping.yAxis).toBe(
          source === "digital" ? 38 : source === "buttons" ? 15 : 5,
        );
        expect(saved[0].axisRest?.slice(0, pad.axes.length)).toEqual(pad.axes);
        expect(saved[0].rightMapping.centerX).toBe(
          source === "digital" ? -1 : 0,
        );
        expect(saved[0].rightMapping.rangeX).toBe(source === "digital" ? 2 : 1);
        expect(saved[0].bindings.space).toBeNull();
      } finally {
        act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
      }
    },
  );
});
