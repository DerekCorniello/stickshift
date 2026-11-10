import { expect, it } from "vitest";
import recording from "./rightStickReplay.fixture.json";
import { beginCapture, sampleDirection } from "./controllerCapture";
import { withButtonAxes, withAxisButtons } from "./controllerSetup";
import { readStickPosition } from "./axisMapping";
import type { GamepadSnapshot } from "../typing";

it("captures the rightward movement recorded by the browser", () => {
  const rest: GamepadSnapshot = {
    id: "Recorded input",
    index: 0,
    connected: true,
    mapping: "",
    axes: recording.rest.baselineAxes,
    buttons: recording.samples[0].buttons,
  };
  const state = beginCapture(withButtonAxes(rest), 0);
  let result = null;
  for (const sample of recording.samples) {
    result = sampleDirection(
      state,
      withButtonAxes({ ...rest, axes: sample.axes, buttons: sample.buttons }),
      sample.milliseconds,
      [0, 1],
    );
    if (result) break;
  }
  expect(result).toMatchObject({
    index: rest.axes.length + 6,
    center: 0,
    invert: false,
  });
  const mapping = {
    xAxis: result!.index,
    yAxis: rest.axes.length + 7,
    centerX: result!.center,
    rangeX: result!.range,
    centerY: 0,
    rangeY: 1,
    invertX: result!.invert,
    invertY: false,
  };
  const held = recording.samples.find(
    (sample) => sample.buttons[6].value === 1,
  )!;
  expect(
    readStickPosition(withAxisButtons({ ...rest, ...held }).axes, mapping).x,
  ).toBeCloseTo(1);
  expect(readStickPosition(withAxisButtons(rest).axes, mapping)).toEqual({
    x: 0,
    y: 0,
  });
});
