import { expect, it } from "vitest";
import { defaultBindings, type GamepadSnapshot } from "../typing";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import { beginCapture } from "./controllerCapture";
import { ControllerSetupTrace } from "./controllerSetupTrace";

it("preserves the raw input and capture decision together without mutable history", () => {
  const pad: GamepadSnapshot = {
    id: "Unusual controller",
    index: 0,
    connected: true,
    mapping: "",
    axes: [0, 0, -1, -1, 0.8, 0],
    buttons: [{ pressed: true, value: 0.4 }],
  };
  const capture = beginCapture(pad, 0);
  const trace = new ControllerSetupTrace();
  trace.record(100, "right", pad, capture, null);
  capture.candidate = 4;
  capture.travel[4].max = 0.8;
  trace.record(110, "right", pad, capture, null);
  trace.record(111, "up", pad, capture, "direction");
  const report = trace.report(
    pad,
    {
      accepted: false,
      bindings: defaultBindings,
      leftMapping: defaultLeftMapping,
      rightMapping: defaultRightMapping,
      deadzone: 0.2,
      discovered: [],
    },
    "test browser",
  );
  expect(report.samples).toHaveLength(2);
  expect(report.samples[0]).toMatchObject({
    milliseconds: 0,
    axes: pad.axes,
    buttons: pad.buttons,
    capture: {
      candidate: null,
      travel: capture.travel.map(() => ({ min: 0, max: 0 })),
    },
  });
  expect(report.samples[1]).toMatchObject({
    milliseconds: 11,
    step: "up",
    capture: { candidate: 4 },
  });
  expect(JSON.parse(JSON.stringify(report)).controller.mapping).toBe("");
});
