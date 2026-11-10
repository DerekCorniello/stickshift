// @vitest-environment jsdom
import { expect, it } from "vitest";
import {
  getControllerAxisName,
  getControllerButtonName,
} from "./gamepadLabels";

it("describes inputs by position regardless of controller brand", () => {
  for (const id of [
    "No controller connected",
    "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)",
  ]) {
    expect(getControllerButtonName(id, 0)).toBe("Bottom face button");
    expect(getControllerButtonName(id, 1)).toBe("Right face button");
    expect(getControllerButtonName(id, 4)).toBe("Left shoulder button");
    expect(getControllerButtonName(id, 20)).toBe("Button 20");
    expect(getControllerAxisName(id, 2)).toBe("Axis 2");
  }
});
