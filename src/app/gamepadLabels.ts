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
  return helper.getButtonName(type, buttonIndex);
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
  color: "Black" | "White" = "Black",
): string | null {
  const { type } = helper.getGamepadInfo(gamepadId);
  return helper.getButtonImagePath(
    type,
    buttonIndex,
    imageBasePath,
    color,
    "Outline",
  );
}
