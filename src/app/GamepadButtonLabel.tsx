import { getControllerButtonName } from "./gamepadLabels";
import type { GamepadSnapshot } from "../typing";
import { inputName } from "./controllerSetup";
import { ControllerControlIcon } from "./ControllerControlIcon";
import "./gamepadButtonLabel.css";

type Props = Readonly<{
  gamepadId: string;
  buttonIndex: number;
  color?: "Black" | "White";
  pad?: GamepadSnapshot;
}>;

export function GamepadButtonLabel({ gamepadId, buttonIndex, pad }: Props) {
  const name =
    buttonIndex < 16
      ? getControllerButtonName(gamepadId, buttonIndex)
      : pad
        ? inputName(pad, buttonIndex)
        : `Button ${buttonIndex}`;
  return (
    <span className="gamepad-button-label" aria-label={name}>
      <ControllerControlIcon buttonIndex={buttonIndex} />
      <span>{name}</span>
    </span>
  );
}
