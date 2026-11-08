import {
  getControllerButtonIcon,
  getControllerButtonName,
} from "./gamepadLabels";
import "./gamepadButtonLabel.css";

type Props = Readonly<{
  gamepadId: string;
  buttonIndex: number;
  color?: "Black" | "White";
}>;

export function GamepadButtonLabel({ gamepadId, buttonIndex, color }: Props) {
  const name = getControllerButtonName(gamepadId, buttonIndex);
  const icon = getControllerButtonIcon(gamepadId, buttonIndex, color);

  return (
    <span className="gamepad-button-label" aria-label={name}>
      {icon && <img src={icon} alt="" aria-hidden="true" />}
      <span>{name}</span>
    </span>
  );
}
