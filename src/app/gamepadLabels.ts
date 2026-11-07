import "@lizardbyte/gamepad-helper/dist/gamepad-helper.js";

type ControllerType = "xbox" | "playstation" | "switch" | "standard";

type ControllerInfo = Readonly<{
  type: ControllerType;
  name: string;
}>;

type GamepadHelperApi = Readonly<{
  getGamepadInfo: (gamepadId: string | null) => ControllerInfo;
  getButtonName: (
    controllerType: ControllerType,
    buttonIndex: number,
  ) => string;
  getAxisName: (controllerType: ControllerType, axisIndex: number) => string;
  getButtonImagePath: (
    controllerType: ControllerType,
    buttonIndex: number,
    basePath?: string,
    color?: string,
    style?: string,
  ) => string | null;
}>;

type GamepadHelperConstructor = new () => GamepadHelperApi;

declare global {
  interface Window {
    GamepadHelper: GamepadHelperConstructor;
  }
}

const helper = new window.GamepadHelper();
const imageBasePath = "/assets/img/gamepads/";

export function getControllerInfo(gamepadId: string): ControllerInfo {
  return helper.getGamepadInfo(gamepadId);
}

export function getControllerButtonName(
  gamepadId: string,
  buttonIndex: number,
): string {
  const { type } = helper.getGamepadInfo(gamepadId);
  if (buttonIndex === 10 || buttonIndex === 11) {
    const side = buttonIndex === 10 ? "Left" : "Right";
    return `${side} stick click`;
  }
  return helper.getButtonName(type, getVisualButtonIndex(type, buttonIndex));
}

export function getControllerAxisName(
  gamepadId: string,
  axisIndex: number,
): string {
  const { type } = helper.getGamepadInfo(gamepadId);
  return helper.getAxisName(type, axisIndex);
}

export function getControllerButtonIcon(
  gamepadId: string,
  buttonIndex: number,
  color: "Black" | "White" = "White",
): string | null {
  const { type } = helper.getGamepadInfo(gamepadId);
  const icon = helper.getButtonImagePath(
    type,
    getVisualButtonIndex(type, buttonIndex),
    imageBasePath,
    color,
    "Outline",
  );
  if (icon === null) return null;
  if (buttonIndex === 10)
    return icon.replace("Left Stick.svg", "Left Stick Click.svg");
  if (buttonIndex === 11)
    return icon.replace("Right Stick.svg", "Right Stick Click.svg");
  return icon;
}

function getVisualButtonIndex(
  type: ControllerType,
  buttonIndex: number,
): number {
  if (type !== "xbox") return buttonIndex;
  if (buttonIndex === 2) return 3;
  if (buttonIndex === 3) return 2;
  return buttonIndex;
}
