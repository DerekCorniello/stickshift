import { expect, it } from "vitest";
import recording from "./rightTriggerReplay.fixture.json";
import { beginCapture, sampleButton } from "./controllerCapture";
import { withAxisButtons, withButtonAxes } from "./controllerSetup";
import type { GamepadSnapshot } from "../typing";

it("captures the recorded right trigger despite an unrelated axis changing its resting value", () => {
  const rest: GamepadSnapshot = {
    id: "Recorded input",
    index: 0,
    connected: true,
    mapping: "",
    ...recording.rest,
  };
  const baseline = withButtonAxes(rest).axes;
  const state = beginCapture(withAxisButtons(rest, baseline), 0);
  let result = null;
  for (const sample of recording.samples) {
    result = sampleButton(
      state,
      withAxisButtons({ ...rest, ...sample }, baseline),
      sample.milliseconds,
    );
    if (result !== null) break;
  }
  expect(result).toBe(22);
  expect(
    withAxisButtons({ ...rest, ...recording.samples.at(-1)! }, baseline)
      .buttons[result!].pressed,
  ).toBe(false);
});
