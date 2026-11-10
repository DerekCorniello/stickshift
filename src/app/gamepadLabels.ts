import "@lizardbyte/gamepad-helper/dist/gamepad-helper.js";

type ControllerType = "xbox" | "playstation" | "switch" | "standard";

type ControllerInfo = Readonly<{
  type: ControllerType;
  name: string;
}>;

type GamepadHelperApi = Readonly<{
  getGamepadInfo: (gamepadId: string | null) => ControllerInfo;
}>;

type GamepadHelperConstructor = new () => GamepadHelperApi;

declare global {
  interface Window {
    GamepadHelper: GamepadHelperConstructor;
  }
}

const helper = new window.GamepadHelper();

const buttonNames = [
  "Bottom face button",
  "Right face button",
  "Left face button",
  "Top face button",
  "Left shoulder button",
  "Right shoulder button",
  "Left trigger",
  "Right trigger",
  "Left center button",
  "Right center button",
  "Left stick click",
  "Right stick click",
  "D-pad up",
  "D-pad down",
  "D-pad left",
  "D-pad right",
] as const;

export function getControllerInfo(gamepadId: string): ControllerInfo {
  return helper.getGamepadInfo(gamepadId);
}

export function getControllerButtonName(
  _gamepadId: string,
  buttonIndex: number,
): string {
  return buttonNames[buttonIndex] ?? `Button ${buttonIndex}`;
}

export function getControllerAxisName(
  _gamepadId: string,
  axisIndex: number,
): string {
  return `Axis ${axisIndex}`;
}
