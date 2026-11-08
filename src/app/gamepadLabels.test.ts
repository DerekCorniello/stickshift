// @vitest-environment jsdom
import { expect, it } from "vitest";
import {
  getControllerButtonIcon,
  getControllerButtonName,
} from "./gamepadLabels";

it("uses standard gamepad button positions with icons for unknown controllers", () => {
  expect(getControllerButtonName("No controller connected", 0)).toBe("A");
  expect(getControllerButtonIcon("No controller connected", 0)).toContain(
    "/xbox/",
  );
  expect(getControllerButtonIcon("No controller connected", 0)).toContain(
    "A.svg",
  );
  expect(getControllerButtonName("No controller connected", 4)).toBe("LB");
  expect(getControllerButtonIcon("No controller connected", 4)).toContain(
    "Left Bumper.svg",
  );
});

it("keeps recognized PlayStation button artwork", () => {
  const id =
    "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
  expect(getControllerButtonName(id, 0)).toBe("×");
  expect(getControllerButtonIcon(id, 0)).toContain("/playstation/");
});
